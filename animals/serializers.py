from django.core.exceptions import ObjectDoesNotExist
from rest_framework import serializers
from actstream.models import target_stream

from .models import Animal, AnimalImage
from location.utils import build_full_address, build_action_string

class SimpleAnimalSerializer(serializers.ModelSerializer):
    aco_required = serializers.SerializerMethodField()

    # An Animal is ACO Required if it is aggressive or "Other" species.
    def get_aco_required(self, obj):
        return (obj.aggressive or obj.species.other)
    class Meta:
        model = Animal
        fields = ['id', 'species', 'aggressive', 'status', 'aco_required', 'name', 'sex', 'size', 'age', 'pcolor', 'scolor']

class ModestAnimalSerializer(SimpleAnimalSerializer):
    evacuation_assignments = serializers.SerializerMethodField()

    def get_evacuation_assignments(self, obj):
        return [ea.id for ea in obj.evacuation_assignments.all()]

    class Meta:
        model = Animal
        fields = ['id', 'species', 'aggressive', 'request', 'status', 'aco_required', 'evacuation_assignments']

class AnimalSerializer(SimpleAnimalSerializer):
    front_image = serializers.SerializerMethodField()
    side_image = serializers.SerializerMethodField()
    extra_images = serializers.SerializerMethodField()
    found_location = serializers.SerializerMethodField()
    owner_names = serializers.SerializerMethodField()
    owner_objects = serializers.SerializerMethodField()
    full_address = serializers.SerializerMethodField()
    shelter_name = serializers.SerializerMethodField()
    reporter_object = serializers.SerializerMethodField(read_only=True)
    request_address = serializers.SerializerMethodField()
    action_history = serializers.SerializerMethodField()
    evacuation_assignments = serializers.SerializerMethodField()
    room_name = serializers.SerializerMethodField()

    class Meta:
        model = Animal
        fields = ['id', 'species', 'aggressive', 'status', 'aco_required', 'front_image', 'side_image', 'extra_images', 'last_seen', 'intake_date',
        'found_location', 'owner_names', 'owner_objects', 'full_address', 'shelter', 'shelter_name', 'reporter_object', 'request', 'request_address',
        'action_history', 'evacuation_assignments', 'room', 'room_name', 'name', 'sex', 'size', 'age', 'pcolor', 'scolor']
    
    def get_owner_names(self, obj):
        #TODO: optimize
        if obj.owners.exists():
            return [person.first_name + ' ' + person.last_name for person in obj.owners.all()]
        return []
    # Custom Owner object field that excludes animals to avoid a circular reference.
    def get_owner_objects(self, obj):
        from people.serializers import SimplePersonSerializer
        if obj.owners.exists():
            return SimplePersonSerializer(obj.owners, many=True).data
        return []
    def get_found_location(self, obj):
        return build_full_address(obj)

    # Custom field for the full address.
    def get_full_address(self, obj):
        # Use the Room address first if it exists.
        if obj.shelter:
            return build_full_address(obj.shelter)
        # Otherwise return an empty string.
        return ''

    # Custom field for request address.
    def get_request_address(self, obj):
        return build_full_address(obj.request)

    # Custom field to return the shelter name.
    def get_shelter_name(self, obj):
        if obj.shelter:
            return obj.shelter.name

    # Custom field to return the shelter name.
    def get_room_name(self, obj):
        if obj.room:
            return obj.room.name
        return ''

    # Custom Reporter object field that excludes animals to avoid a circular reference.
    def get_reporter_object(self, obj):
        from people.serializers import SimplePersonSerializer
        if obj.reporter:
            return SimplePersonSerializer(obj.reporter).data
        return None

    # Custom Evac Assignment field to avoid a circular reference.
    def get_evacuation_assignments(self, obj):
        return obj.evacuation_assignments.all().values_list('id', flat=True)

    def get_action_history(self, obj):
        return [build_action_string(action) for action in obj.target_actions.all()]

    def get_front_image(self, obj):
        try:
            return [animal_image.image.url for animal_image in obj.images if animal_image.category == 'front_image'][0]
            # change this exception
        except IndexError:
            return ''
        except AttributeError:
            # Should only hit this when returning a single object after create.
            try:
                return obj.animalimage_set.filter(category='front_image').first().url
            except AttributeError:
                return ''

    def get_side_image(self, obj):
        try:
            return [animal_image.image.url for animal_image in obj.images if animal_image.category == 'side_image'][0]
        except IndexError:
            return ''
        except AttributeError:
            try:
                return obj.animalimage_set.filter(category='side_image').first().url
            except AttributeError:
                return ''

    def get_extra_images(self, obj):
        try:
            return [animal_image.image.url for animal_image in obj.images if animal_image.category == 'extra']
        except IndexError:
            return ''
        except AttributeError:
            # Should only hit this when returning a single object after create.
            try:
                return obj.animalimage_set.filter(category='extra').first().url
            except AttributeError:
                return ''
