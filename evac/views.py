from django.db.models import Count, Exists, OuterRef, Prefetch
from django.http import JsonResponse
from datetime import datetime
from rest_framework import filters, permissions, viewsets
from actstream import action

from animals.models import Animal
from evac.models import EvacAssignment, EvacTeamMember
from evac.serializers import EvacAssignmentSerializer, EvacTeamMemberSerializer
from hotline.models import ServiceRequest, VisitNote
from people.models import OwnerContact

class EvacTeamMemberViewSet(viewsets.ModelViewSet):

    queryset = EvacTeamMember.objects.all()
    filter_backends = (filters.SearchFilter,)
    permission_classes = [permissions.IsAuthenticated, ]
    serializer_class = EvacTeamMemberSerializer

class EvacAssignmentViewSet(viewsets.ModelViewSet):

    queryset = EvacAssignment.objects.all()
    search_fields = ['team_members__first_name', 'team_members__last_name', 'service_requests__owner__first_name', 'service_requests__owner__last_name', 'service_requests__address', 'service_requests__reporter__first_name', 'service_requests__reporter__last_name', 'animals__name']
    filter_backends = (filters.SearchFilter,)
    permission_classes = [permissions.IsAuthenticated, ]
    serializer_class = EvacAssignmentSerializer

    def get_queryset(self):
        queryset = EvacAssignment.objects.all().order_by('-start_time').prefetch_related(Prefetch('service_requests',
                    ServiceRequest.objects
            .annotate(animal_count=Count("animal"))
            .annotate(
                injured=Exists(Animal.objects.filter(request_id=OuterRef("id"), injured="yes"))
            ).prefetch_related(Prefetch('animal_set', queryset=Animal.objects.prefetch_related(Prefetch('animalimage_set', to_attr='images')), to_attr='animals'))
            .prefetch_related('owner')
            .prefetch_related('visitnote_set')
            .select_related('reporter')
            .prefetch_related('evacuation_assignments')
        ))
        status = self.request.query_params.get('status', '')
        if status == "open":
            return queryset.filter(end_time__isnull=True).distinct()
        elif status == "closed":
            return queryset.filter(end_time__isnull=False).distinct()
        return queryset

    # When creating, update all service requests to be assigned status.
    def perform_create(self, serializer):
        if serializer.is_valid():
            evac_assignment = serializer.save()
            service_requests = ServiceRequest.objects.filter(pk__in=serializer.data['service_requests'])
            service_requests.update(status="assigned")
            action.send(self.request.user, verb='created evacuation assignment', target=evac_assignment)
            for service_request in service_requests:
                action.send(self.request.user, verb='assigned service request', target=service_request)
                evac_assignment.animals.add(*Animal.objects.filter(request=service_request, status__in=['REPORTED', 'SHELTERED IN PLACE', 'UNABLE TO LOCATE']))

    def perform_update(self, serializer):
        if serializer.is_valid():
            # Only add end_time on first update.
            if not serializer.instance.end_time:
                serializer.validated_data['end_time'] = datetime.now()
            evac_assignment = serializer.save()
            for service_request in self.request.data['sr_updates']:
                sr_status = 'closed'
                for animal_dict in service_request['animals']:
                    # Record status change if applicable.
                    new_status = animal_dict['status']
                    animal = Animal.objects.get(pk=animal_dict['id'])
                    if animal.status != new_status:
                        action.send(self.request.user, verb=f'changed animal status to {new_status}', target=animal)
                        Animal.objects.filter(id=animal_dict['id']).update(status=new_status)
                    # Mark SR as open if any animal is SIP or UTL.
                    if new_status in ['SHELTERED IN PLACE', 'UNABLE TO LOCATE']:
                        sr_status = 'open'
                # Update the relevant SR fields.
                service_requests = ServiceRequest.objects.filter(id=service_request['id'])
                service_requests.update(status=sr_status, followup_date=service_request['followup_date'] or None)
                if sr_status == 'open':
                    action.send(self.request.user, verb='opened service request', target=service_requests[0])
                else:
                    action.send(self.request.user, verb='closed service request', target=service_requests[0])
                # Only create VisitNote on first update, otherwise update existing VisitNote.
                if not VisitNote.objects.filter(evac_assignment=evac_assignment, service_request=service_requests[0]).exists():
                    VisitNote.objects.create(evac_assignment=evac_assignment, service_request=service_requests[0], date_completed=service_request['date_completed'], notes=service_request['notes'], forced_entry=service_request['forced_entry'])
                else:
                    VisitNote.objects.filter(evac_assignment=evac_assignment, service_request=service_requests[0]).update(date_completed=service_request['date_completed'], notes=service_request['notes'], forced_entry=service_request['forced_entry'])
                for owner in service_requests[0].owner.all():
                    OwnerContact.objects.create(owner=owner, owner_contact_note=service_request['owner_contact_note'], owner_contact_time=service_request['owner_contact_time'])
            action.send(self.request.user, verb='updated evacuation assignment', target=evac_assignment)
