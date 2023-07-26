import re

from rest_framework import serializers
from actstream.models import target_stream

from animals.serializers import AnimalSerializer
from evac.models import DispatchTeam, EvacAssignment, EvacTeamMember, AssignedRequest
from hotline.models import ServiceRequest, VisitNote
from hotline.serializers import BarebonesServiceRequestSerializer, SimpleServiceRequestSerializer, VisitNoteSerializer
from people.serializers import OwnerContactSerializer, SimplePersonSerializer, PersonSerializer

from location.utils import build_action_string

class EvacTeamMemberSerializer(serializers.ModelSerializer):

    display_name = serializers.SerializerMethodField()
    display_phone = serializers.SerializerMethodField()
    is_assigned = serializers.BooleanField(read_only=True)

    # Custom field for Name Output
    def get_display_name(self, obj):
        agency = " (%s)" % (obj.agency_id) if obj.agency_id else ""
        return '%s %s%s' % (obj.first_name, obj.last_name, agency)

    # Custom field for Formated Phone Number
    def get_display_phone(self, obj):
        return re.sub(r'(\d{3})(\d{3})(\d{4})', r'(\1) \2-\3', obj.phone)

    class Meta:
        model = EvacTeamMember
        fields = '__all__'

class DispatchTeamSerializer(serializers.ModelSerializer):

    team_member_objects = EvacTeamMemberSerializer(source='team_members', required=False, read_only=True, many=True)
    display_name = serializers.SerializerMethodField()
    is_assigned = serializers.BooleanField(read_only=True)

    # Custome field for Name Output
    def get_display_name(self, obj):
        return ", ".join([team_member.first_name + " " + team_member.last_name for team_member in obj.team_members.all()])

    class Meta:
        model = DispatchTeam
        fields = '__all__'

class DispatchServiceRequestSerializer(SimpleServiceRequestSerializer):

    animals = AnimalSerializer(many=True, read_only=True)
    owner_contacts = OwnerContactSerializer(source='ownercontact_set', many=True, required=False, read_only=True)
    owner_objects = PersonSerializer(source='owners', many=True, required=False, read_only=True)
    reporter_object = SimplePersonSerializer(source='reporter', required=False, read_only=True)
    visit_notes = VisitNoteSerializer(source='visitnote_set', many=True, required=False, read_only=True)

    class Meta:
        model = ServiceRequest
        fields = ['id', 'directions', 'latitude', 'longitude', 'full_address', 'followup_date', 'status', 'injured', 'priority', 'key_provided',
        'accessible', 'turn_around', 'animals', 'reported_animals', 'reported_evac', 'reported_sheltered_in_place', 'sheltered_in_place', 'unable_to_locate', 'aco_required',
        'owner_contacts', 'owner_objects', 'owners', 'reporter_object', 'visit_notes']

class AssignedRequestDispatchSerializer(serializers.ModelSerializer):

    service_request_object = DispatchServiceRequestSerializer(source='service_request', required=False, read_only=True)
    visit_note = VisitNoteSerializer(required=False, read_only=True)
    owner_contact = OwnerContactSerializer(required=False, read_only=True)
    visit_notes = serializers.SerializerMethodField()

    def get_visit_notes(self, obj):
        #TODO: this triggers one request per SR
        if VisitNote.objects.filter(assigned_request__service_request=obj.service_request).exclude(assigned_request=obj).exists():
            return VisitNoteSerializer(VisitNote.objects.filter(assigned_request__service_request=obj.service_request).exclude(assigned_request=obj), many=True).data
        return []

    class Meta:
        model = AssignedRequest
        fields = '__all__'

class SimpleEvacAssignmentSerializer(serializers.ModelSerializer):

    team_name = serializers.StringRelatedField(source='team')
    team_member_names = serializers.SerializerMethodField()

    def get_team_member_names(self, obj):
        #TODO: use StringRelatedField and EvacTeamMember __str__ method
        # does this kick off another query?
        try:
            return ", ".join([team_member.first_name + " " + team_member.last_name + (" (" + team_member.agency_id + ")" if team_member.agency_id else "") for team_member in obj.team.team_members.all()])
        except AttributeError:
            return ''

    class Meta:
        model = EvacAssignment
        fields = ['id', 'start_time', 'end_time', 'team_name', 'team_member_names', 'closed']

class AssignedRequestServiceRequestSerializer(serializers.ModelSerializer):

    dispatch_assignment = SimpleEvacAssignmentSerializer(required=False, read_only=True)
    visit_note = VisitNoteSerializer(required=False, read_only=True)
    owner_contact = OwnerContactSerializer(required=False, read_only=True)

    class Meta:
        model = AssignedRequest
        fields = '__all__'

class EvacAssignmentSerializer(SimpleEvacAssignmentSerializer):

    team_object = DispatchTeamSerializer(source='team', required=False, read_only=True)
    assigned_requests = AssignedRequestDispatchSerializer(many=True, required=False, read_only=True)

    class Meta:
        model = EvacAssignment
        fields = '__all__'
