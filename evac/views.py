from django.db.models import Count, Exists, OuterRef, Prefetch, Q
from django.http import JsonResponse
from datetime import datetime, timedelta
from rest_framework import filters, permissions, serializers, viewsets
from actstream import action

from animals.models import Animal
from evac.models import AssignedRequest, DispatchTeam, EvacAssignment, EvacTeamMember
from evac.serializers import DispatchTeamSerializer, EvacAssignmentSerializer, EvacTeamMemberSerializer
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

    def get_queryset(self):
        queryset = EvacTeamMember.objects.all().annotate(is_assigned=Exists(EvacAssignment.objects.filter(team__team_members__id=OuterRef("id"), end_time=None)))
        return queryset

class DispatchTeamViewSet(viewsets.ModelViewSet):

    queryset = DispatchTeam.objects.all()
    permission_classes = [permissions.IsAuthenticated, ]
    serializer_class = DispatchTeamSerializer

    def get_queryset(self):
        queryset = DispatchTeam.objects.all().annotate(is_assigned=Exists(EvacAssignment.objects.filter(team_id=OuterRef("id"), end_time=None)))
        is_map = self.request.query_params.get('map', '')
        if is_map == 'true':
            yesterday = datetime.today() - timedelta(days=1)
            y_mid = datetime.combine(yesterday,datetime.min.time())
            queryset = queryset.filter(Q(is_assigned=True) | Q(dispatch_date__gte=y_mid))
        return queryset

    def perform_update(self, serializer):

        if serializer.is_valid():
            team = serializer.save()

            # Add Team Members to DA.
            if self.request.data.get('new_team_members'):
                team.team_members.add(*self.request.data.get('new_team_members'))

            # Remove Team Member from DA.
            if self.request.data.get('remove_team_member'):
                team.team_members.remove(self.request.data.get('remove_team_member'))

class EvacAssignmentViewSet(viewsets.ModelViewSet):

    queryset = EvacAssignment.objects.all()
    search_fields = ['team__name', 'team__team_members__first_name', 'team__team_members__last_name', 'service_requests__owners__first_name', 'service_requests__owners__last_name', 'service_requests__owners__phone', 'service_requests__owners__drivers_license', 'service_requests__address', 'service_requests__reporter__first_name', 'service_requests__reporter__last_name']
    filter_backends = (filters.SearchFilter,)
    permission_classes = [permissions.IsAuthenticated, ]
    serializer_class = EvacAssignmentSerializer

    def get_queryset(self):
        queryset = EvacAssignment.objects.all().order_by('-start_time').prefetch_related(Prefetch('service_requests',
                    ServiceRequest.objects
            .annotate(animal_count=Count("animal"))
            .annotate(
                injured=Exists(Animal.objects.filter(request_id=OuterRef("id"), injured="yes"))
            ).prefetch_related(Prefetch(
                'animal_set', queryset=Animal.objects.exclude(status='CANCELED').prefetch_related(
                    Prefetch('animalimage_set', to_attr='images')), to_attr='animals'))
            .prefetch_related(
                Prefetch('owners', queryset=Person.objects.annotate(
                    is_sr_owner=Exists(ServiceRequest.objects.filter(owners__id=OuterRef('id')))).annotate(
                    is_animal_owner=Exists(Animal.objects.filter(owners__id=OuterRef('id'))))))
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
            if ServiceRequest.objects.filter(pk__in=self.request.data['service_requests'], status='assigned').exists():
                raise serializers.ValidationError(['Duplicate assigned service request error.', list(ServiceRequest.objects.filter(pk__in=self.request.data['service_requests'], status='assigned').values_list('id', flat=True))])
            if self.request.data.get('team_name'):
                team = DispatchTeam.objects.create(name=self.request.data.get('team_name'))
                team.team_members.set(self.request.data.get('team_members'))
                serializer.validated_data['team'] = team
            evac_assignment = serializer.save()
            service_requests = ServiceRequest.objects.filter(pk__in=self.request.data['service_requests'])
            service_requests.update(status="assigned")
            action.send(self.request.user, verb='created evacuation assignment', target=evac_assignment)
            for service_request in service_requests:
                action.send(self.request.user, verb='assigned service request', target=service_request)
                animals_dict = {}
                for animal in service_request.animal_set.filter(status__in=['REPORTED', 'SHELTERED IN PLACE', 'UNABLE TO LOCATE']):
                    animals_dict[animal.id] = {'status':animal.status, 'shelter':''}
                AssignedRequest.objects.create(dispatch_assignment=evac_assignment, service_request=service_request, animals=animals_dict)

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
                # Add SR to selected DA.
                animals_dict = {}
                for animal in service_requests[0].animal_set.filter(status__in=['REPORTED', 'SHELTERED IN PLACE', 'UNABLE TO LOCATE']):
                    animals_dict[animal.id] = {'status':animal.status, 'shelter':''}
                AssignedRequest.objects.create(dispatch_assignment=evac_assignment, service_request=service_requests[0], animals=animals_dict)
                action.send(self.request.user, verb='assigned service request', target=service_requests[0])

            for service_request in self.request.data.get('sr_updates', []):
                animals_dict = {}
                sr_status = 'open' if service_request['unable_to_complete'] else 'assigned' if service_request['incomplete'] else 'closed'
                for animal_dict in service_request['animals']:
                    animals_dict[animal_dict['id']] = {'status':animal_dict.get('status'), 'shelter':animal_dict.get('shelter')}
                    # Record status change if applicable.
                    animal = Animal.objects.get(pk=animal_dict['id'])
                    new_status = animal_dict.get('status')
                    if animal.status != new_status:
                        action.send(self.request.user, verb=f'changed animal status to {new_status}', target=animal)
                    new_shelter = animal_dict.get('shelter', None)
                    if animal.shelter != new_shelter:
                        action.send(self.request.user, verb='sheltered animal', target=animal)
                        action.send(self.request.user, verb='sheltered animal', target=animal.shelter, action_object=animal)
                    intake_date = animal.intake_date if animal.intake_date else datetime.now()
                    Animal.objects.filter(id=animal_dict['id']).update(status=new_status, shelter=new_shelter, intake_date=intake_date)
                    # Mark SR as open if any animal is SIP or UTL.
                    if new_status in ['SHELTERED IN PLACE', 'UNABLE TO LOCATE'] and sr_status != 'assigned':
                        sr_status = 'open'
                # Update the relevant SR fields.
                assigned_request = AssignedRequest.objects.get(service_request=service_request['id'], dispatch_assignment=evac_assignment.id)
                service_requests = ServiceRequest.objects.filter(id=service_request['id'])
                assigned_request.animals = animals_dict
                # Only update SR with followup_date while DA is open or if the old AssignedRequest followup_date matches the current SR followup_date.
                if not evac_assignment.end_time or (assigned_request.followup_date == service_requests[0].followup_date):
                    sr_followup_date = service_request['followup_date']
                else:
                    sr_followup_date = service_requests[0].followup_date or None
                assigned_request.followup_date = service_request['followup_date']
                service_requests.update(status=sr_status, followup_date=sr_followup_date)
                action.send(self.request.user, verb=sr_status.replace('ed','') + 'ed service request', target=service_requests[0])
                # Only create VisitNote on first update, otherwise update existing VisitNote.
                if service_request.get('date_completed'):
                    if not assigned_request.visit_note:
                        visit_note = VisitNote.objects.create(date_completed=service_request['date_completed'], notes=service_request['notes'], forced_entry=service_request['forced_entry'])
                        assigned_request.visit_note = visit_note
                    else:
                        VisitNote.objects.filter(assigned_request=assigned_request).update(date_completed=service_request['date_completed'], notes=service_request['notes'], forced_entry=service_request['forced_entry'])
                # Only create OwnerContact on first update, otherwise update existing OwnerContact.
                if service_request.get('owner_contact_id') and service_request.get('owner_contact_note') and service_request.get('owner_contact_time'):
                    if not assigned_request.owner_contact:
                        owner_contact = OwnerContact.objects.create(owner=Person.objects.get(pk=service_request['owner_contact_id']), owner_contact_note=service_request['owner_contact_note'], owner_contact_time=service_request['owner_contact_time'])
                        assigned_request.owner_contact = owner_contact
                    else:
                        OwnerContact.objects.filter(assigned_request=assigned_request).update(owner=Person.objects.get(pk=service_request['owner_contact_id']), owner_contact_note=service_request['owner_contact_note'], owner_contact_time=service_request['owner_contact_time'])
                assigned_request.save()
                if service_request['unable_to_complete']:
                    evac_assignment.service_requests.remove(service_requests[0])

            action.send(self.request.user, verb='updated evacuation assignment', target=evac_assignment)
