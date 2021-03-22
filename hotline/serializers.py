from django.db.models import Q
from rest_framework import serializers
from rest_framework.decorators import action

from .models import ServiceRequest, VisitNote
from animals.models import Animal
from animals.serializers import SimpleAnimalSerializer
from evac.models import EvacAssignment
from location.utils import build_full_address, build_action_string
from people.serializers import OwnerContactSerializer

class VisitNoteSerializer(serializers.ModelSerializer):

    address = serializers.SerializerMethodField()
    team_name = serializers.SerializerMethodField()
    team_member_names = serializers.SerializerMethodField()

    def get_address(self, obj):
        # does this kick off another query?
        return obj.service_request.location_output

    def get_team_name(self, obj):
        # does this kick off another query?
        try:
            return obj.evac_assignment.team.name
        except AttributeError:
            return ''

    def get_team_member_names(self, obj):
        # does this kick off another query?
        try:
            return ", ".join([team_member['first_name'] + " " + team_member['last_name'] for team_member in obj.evac_assignment.team.team_members.all().values('first_name', 'last_name')])
        except AttributeError:
            return ''

    class Meta:
        model = VisitNote
        fields = '__all__'

class SimpleServiceRequestSerializer(serializers.ModelSerializer):
    from people.serializers import SimplePersonSerializer


    full_address = serializers.SerializerMethodField()
    animals = SimpleAnimalSerializer(many=True, required=False, read_only=True)
    # these method fields require animals queryset
    reported_animals = serializers.SerializerMethodField()
    sheltered_in_place = serializers.SerializerMethodField()
    unable_to_locate = serializers.SerializerMethodField()
    aco_required = serializers.SerializerMethodField(read_only=True)
    injured = serializers.BooleanField(read_only=True)
    animal_count = serializers.IntegerField(read_only=True)
    owner_objects = SimplePersonSerializer(source='owners', many=True, required=False, read_only=True)



    class Meta:
        model = ServiceRequest
        fields = ['id', 'latitude', 'longitude', 'full_address', 'followup_date', 'owners',
        'animal_count','injured', 'accessible', 'turn_around', 'animals', 'reported_animals', 'owner_objects', 'sheltered_in_place', 'unable_to_locate', 'aco_required']


    # Custom field for the full address.
    def get_full_address(self, obj):
        return build_full_address(obj)

    # Custom field for if any animal is ACO Required. If it is aggressive or "Other" species.
    def get_aco_required(self, obj):
        # Performs list comp. on prefetched queryset of animals for this SR to avoid hitting db again.
        try:
            return bool([animal for animal in obj.animals if animal.aggressive == 'yes' or animal.species == 'other'])
        except AttributeError:
            return obj.animal_set.filter(Q(aggressive='yes')|Q(species='other')).exists()

    # Custom field for determining if an SR contains REPORTED animals.
    def get_reported_animals(self, obj):
        # Performs list comp. on prefetched queryset of animals for this SR to avoid hitting db again.
        try:
            return len([animal for animal in obj.animals if animal.status == 'REPORTED'])
        except AttributeError:
            return obj.animal_set.filter(status='REPORTED').count()

    # Custom field for determining that count of SHELTERED IN PLACE animals.
    def get_sheltered_in_place(self, obj):
        # Performs list comp. on prefetched queryset of animals for this SR to avoid hitting db again.
        try:
            return len([animal for animal in obj.animals if animal.status == 'SHELTERED IN PLACE'])
        except AttributeError:
            return obj.animal_set.filter(status='SHELTERED IN PLACE').count()
    # Custom field for determining that count of UNABLE TO LOCATE animals.

    def get_unable_to_locate(self, obj):
        # Performs list comp. on prefetched queryset of animals for this SR to avoid hitting db again.
        try:
            return len([animal for animal in obj.animals if animal.status == 'UNABLE TO LOCATE'])
        except AttributeError:
            return obj.animal_set.filter(status='UNABLE TO LOCATE').count()

    def to_internal_value(self, data):
        # Updates datetime fields to null when receiving an empty string submission.
        for key in ['followup_date']:
            if data.get(key) == '':
                data[key] = None

        # Truncates latitude and longitude.
        if data.get('latitude'):
            data['latitude'] = float("%.6f" % float(data.get('latitude')))
        if data.get('longitude'):
            data['longitude'] = float("%.6f" % float(data.get('longitude')))
        return super().to_internal_value(data)


class SimpleEvacAssignmentSerializer(serializers.ModelSerializer):

    team_name = serializers.SerializerMethodField()
    team_member_names = serializers.SerializerMethodField()

    def get_team_name(self, obj):
        # does this kick off another query?
        try:
            return obj.team.name
        except AttributeError:
            return ''

    def get_team_member_names(self, obj):
        # does this kick off another query?
        try:
            return ", ".join([team_member['first_name'] + " " + team_member['last_name'] for team_member in obj.team.team_members.all().values('first_name', 'last_name')])
        except AttributeError:
            return ''

    class Meta:
        model = EvacAssignment
        fields = ['id', 'start_time', 'end_time', 'team_name', 'team_member_names']


class ServiceRequestSerializer(SimpleServiceRequestSerializer):
    from people.serializers import SimplePersonSerializer


    action_history = serializers.SerializerMethodField()
    latest_evac = serializers.SerializerMethodField()
    animal_count = serializers.IntegerField(read_only=True)
    injured = serializers.BooleanField(read_only=True)
    reporter_object = SimplePersonSerializer(source='reporter', required=False, read_only=True)
    evacuation_assignments = SimpleEvacAssignmentSerializer(many=True, required=False, read_only=True)
    visit_notes = VisitNoteSerializer(source='visitnote_set', many=True, required=False, read_only=True)

    class Meta:
        model = ServiceRequest
        fields = ['id', 'latitude', 'longitude', 'full_address', 'followup_date',
        'injured', 'accessible', 'turn_around', 'animals', 'reported_animals', 'sheltered_in_place', 'unable_to_locate', 'aco_required',
        'animal_count', 'action_history', 'owner_objects', 'reporter_object', 'evacuation_assignments', 'visit_notes', 'latest_evac']

    # def __init__(self, *args, **kwargs):
    #     super(ServiceRequestSerializer, self).__init__(*args, **kwargs)
    #     self.fields.pop('action_history')

    # Custom field for the action history list.
    def get_action_history(self, obj):
        return [build_action_string(action) for action in obj.target_actions.all()]

    def get_latest_evac(self, obj):
        from evac.models import EvacAssignment
        assigned_evac = EvacAssignment.objects.filter(service_requests=obj, end_time__isnull=True).values('id', 'start_time', 'end_time').first()
        if assigned_evac:
            return assigned_evac
        return EvacAssignment.objects.filter(service_requests=obj, end_time__isnull=False).values('id', 'start_time', 'end_time').first()