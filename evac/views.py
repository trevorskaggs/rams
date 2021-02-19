from django.db.models import Count, Exists, OuterRef, Prefetch
from django.http import JsonResponse
from datetime import datetime
from rest_framework import filters, permissions, viewsets
from actstream import action

from animals.models import Animal
from evac.models import EvacAssignment, EvacTeamMember
from evac.serializers import EvacAssignmentSerializer, EvacTeamMemberSerializer
from hotline.models import ServiceRequest, VisitNote
from people.models import OwnerContact, Person

class EvacTeamMemberViewSet(viewsets.ModelViewSet):

    queryset = EvacTeamMember.objects.all()
    filter_backends = (filters.SearchFilter,)
    permission_classes = [permissions.IsAuthenticated, ]
    serializer_class = EvacTeamMemberSerializer

    def perform_create(self, serializer):
        if serializer.is_valid():
            # Clean phone fields.
            serializer.validated_data['phone'] = ''.join(char for char in serializer.validated_data.get('phone', '') if char.isdigit())
            team_member = serializer.save()

class EvacAssignmentViewSet(viewsets.ModelViewSet):

    queryset = EvacAssignment.objects.all()
    search_fields = ['team_members__first_name', 'team_members__last_name', 'service_requests__owners__first_name', 'service_requests__owners__last_name', 'service_requests__address', 'service_requests__reporter__first_name', 'service_requests__reporter__last_name', 'animals__name']
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
            .prefetch_related('owners')
            .prefetch_related('visitnote_set')
            .select_related('reporter')
            .prefetch_related('evacuation_assignments')
        ))
        # Exclude EAs without animals when fetching for a map.
        is_map = self.request.query_params.get('map', '')
        if is_map == 'true':
            queryset = queryset.exclude(service_requests=None)

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
            # Only add end_time on first update if all SRs are complete.
            if not serializer.instance.end_time and self.request.data.get('sr_updates') and not any(sr_update['incomplete'] == True for sr_update in self.request.data['sr_updates']):
                serializer.validated_data['end_time'] = datetime.now()
            evac_assignment = serializer.save()

            # Add Service Request to DA if included.
            if self.request.data.get('new_service_request'):
                # Update SR status to assigned.
                service_requests = ServiceRequest.objects.filter(pk=self.request.data.get('new_service_request'))
                service_requests.update(status="assigned")
                # Remove SR from any existing open DA if applicable.
                old_da = EvacAssignment.objects.filter(service_requests=service_requests[0], end_time=None).first()
                if old_da:
                    old_da.service_requests.remove(service_requests[0])
                    old_da.animals.remove(*Animal.objects.filter(request=service_requests[0]))
                # Add SR to selected DA.
                evac_assignment.service_requests.add(service_requests[0])
                evac_assignment.animals.add(*Animal.objects.filter(request=service_requests[0], status__in=['REPORTED', 'SHELTERED IN PLACE', 'UNABLE TO LOCATE']))
                action.send(self.request.user, verb='assigned service request', target=service_requests[0])

            # Add Team Members to DA if included.
            if self.request.data.get('new_team_members'):
                evac_assignment.team_members.add(*self.request.data.get('new_team_members'))

            # Remove Team Member from DA if included.
            if self.request.data.get('remove_team_member'):
                evac_assignment.team_members.remove(self.request.data.get('remove_team_member'))

            for service_request in self.request.data.get('sr_updates', []):
                sr_status = 'open' if service_request['unable_to_complete'] else 'assigned' if service_request['incomplete'] else 'closed'
                for animal_dict in service_request['animals']:
                    # Record status change if applicable.
                    animal = Animal.objects.get(pk=animal_dict['id'])
                    new_status = animal_dict.get('status')
                    if animal.status != new_status:
                        action.send(self.request.user, verb=f'changed animal status to {new_status}', target=animal)
                    new_shelter = animal_dict.get('shelter', None)
                    if animal.shelter != new_shelter:
                        action.send(self.request.user, verb='sheltered animal', target=animal)
                        action.send(self.request.user, verb='sheltered animal', target=animal.shelter, action_object=animal)
                    Animal.objects.filter(id=animal_dict['id']).update(status=new_status, shelter=new_shelter)
                    # Mark SR as open if any animal is SIP or UTL.
                    if new_status in ['SHELTERED IN PLACE', 'UNABLE TO LOCATE'] and sr_status != 'assigned':
                        sr_status = 'open'
                # Update the relevant SR fields.
                service_requests = ServiceRequest.objects.filter(id=service_request['id'])
                service_requests.update(status=sr_status, followup_date=service_request['followup_date'] or None)
                action.send(self.request.user, verb=sr_status.replace('ed','') + 'ed service request', target=service_requests[0])
                # Only create VisitNote on first update, otherwise update existing VisitNote.
                if service_request.get('date_completed'):
                    if not VisitNote.objects.filter(evac_assignment=evac_assignment, service_request=service_requests[0]).exists():
                        VisitNote.objects.create(evac_assignment=evac_assignment, service_request=service_requests[0], date_completed=service_request['date_completed'], notes=service_request['notes'], forced_entry=service_request['forced_entry'])
                    else:
                        VisitNote.objects.filter(evac_assignment=evac_assignment, service_request=service_requests[0]).update(date_completed=service_request['date_completed'], notes=service_request['notes'], forced_entry=service_request['forced_entry'])
                # Only create OwnerContact on first update, otherwise update existing OwnerContact.
                if service_request.get('owner_contact_id'):
                    if not OwnerContact.objects.filter(evac_assignment=evac_assignment, service_request=service_requests[0]).exists():
                        OwnerContact.objects.create(evac_assignment=evac_assignment, service_request=service_requests[0], owner=Person.objects.get(pk=service_request['owner_contact_id']), owner_contact_note=service_request['owner_contact_note'], owner_contact_time=service_request['owner_contact_time'])
                    else:
                        OwnerContact.objects.filter(evac_assignment=evac_assignment, service_request=service_requests[0]).update(owner=Person.objects.get(pk=service_request['owner_contact_id']), owner_contact_note=service_request['owner_contact_note'], owner_contact_time=service_request['owner_contact_time'])

                if service_request['unable_to_complete']:
                    evac_assignment.service_requests.remove(service_requests[0])

            action.send(self.request.user, verb='updated evacuation assignment', target=evac_assignment)
