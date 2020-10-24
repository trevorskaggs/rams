from django.db.models import Q
from rest_framework import serializers
from actstream.models import target_stream
from .models import Person
# from animals.serializers import AnimalSerializer
from location.utils import build_full_address, build_action_string
from hotline.models import ServiceRequest

class PersonSerializer(serializers.ModelSerializer):
    full_address = serializers.SerializerMethodField()
    # animals = AnimalSerializer(source='animal_set', many=True, required=False, read_only=True)
    action_history = serializers.SerializerMethodField()
    request = serializers.SerializerMethodField()

    # Custom field for the full address.
    def get_full_address(self, obj):
        return build_full_address(obj)

    # Custom field for the action history.
    def get_action_history(self, obj):
        return [build_action_string(action).replace(f'Person object ({obj.id})', '') for action in target_stream(obj)]

    # Custom field for the ServiceRequest ID.
    def get_request(self, obj):
        service_request = ServiceRequest.objects.filter(Q(owner=obj.id) | Q(reporter=obj.id)).first()
        if service_request:
            return service_request.id
        return None

    # Truncates latitude and longitude.
    def to_internal_value(self, data):
        if data.get('latitude'):
            data['latitude'] = float("%.6f" % float(data.get('latitude')))
        if data.get('longitude'):
            data['longitude'] = float("%.6f" % float(data.get('longitude')))
        return super().to_internal_value(data)

    class Meta:
        model = Person
        fields = '__all__'
