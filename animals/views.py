from django.conf import settings
from django.core.exceptions import ObjectDoesNotExist
from django.shortcuts import render
from copy import deepcopy
from datetime import datetime
from rest_framework import filters, permissions, viewsets
from actstream import action

from hotline.models import ServiceRequest
from animals.models import Animal, AnimalImage
from animals.serializers import AnimalSerializer
from incident.models import Incident
from people.serializers import SimplePersonSerializer

class AnimalViewSet(viewsets.ModelViewSet):
    queryset = Animal.objects.with_images().exclude(status="CANCELED").order_by('order')
    search_fields = ['id', 'name', 'species', 'status', 'pcolor', 'scolor', 'request__address', 'request__city', 'owners__first_name', 'owners__last_name', 'owners__phone', 'owners__drivers_license', 'owners__address', 'owners__city', 'reporter__first_name', 'reporter__last_name']
    filter_backends = (filters.SearchFilter,)
    permission_classes = [permissions.IsAuthenticated, ]
    serializer_class = AnimalSerializer

    def perform_create(self, serializer):
        if serializer.is_valid():

            # Set status to SHELTERED if a shelter is added.
            if serializer.validated_data.get('shelter'):
                serializer.validated_data['status'] = 'SHELTERED'
                serializer.validated_data['intake_date'] = datetime.now()

            if self.request.data.get('incident_slug'):
                serializer.validated_data['incident'] = Incident.objects.get(slug=self.request.data.get('incident_slug'))

            animal = serializer.save()
            animals = [animal]
            action.send(self.request.user, verb='created animal', target=animal)

            # Create multiple copies of animal if specified.
            for i in range(int(self.request.data.get('number_of_animals', 1)) -1):
                new_animal = deepcopy(animal)
                new_animal.id = None
                new_animal.save()
                animals.append(new_animal)

            for animal in animals:
                # Add Owner to new animals if included.
                if self.request.data.get('new_owner'):
                    animal.owners.add(self.request.data['new_owner'])

                # Add ServiceRequest Owner to new animals being added to an SR.
                if serializer.validated_data.get('request'):
                    animal.owners.add(*animal.request.owners.all())

                if animal.shelter:
                    action.send(self.request.user, verb='sheltered animal in', target=animal, action_object=animal.shelter)
                    action.send(self.request.user, verb='sheltered animal', target=animal.shelter, action_object=animal)

                if animal.room:
                    action.send(self.request.user, verb='roomed animal in', target=animal, action_object=animal.room)
                    action.send(self.request.user, verb='roomed animal', target=animal.room, action_object=animal)
                    action.send(self.request.user, verb='roomed animal', target=animal.room.building, action_object=animal)

                images_data = self.request.FILES
                for key, image_data in images_data.items():
                    # Strip out extra numbers from the key (e.g. "extra1" -> "extra")
                    category = key.translate({ord(num): None for num in '0123456789'})
                    # Create image object.
                    AnimalImage.objects.create(image=image_data, animal=animal, category=category)

            # Check to see if animal SR status should be changed.
            if animal.request:
                animal.request.update_status()

    def perform_update(self, serializer):
        if serializer.is_valid():

            # Keep owner the same when editing an animal.
            serializer.validated_data['owners'] = serializer.instance.owners.values_list('id', flat=True)

            # Mark as SHELTERED if we receive shelter field and it's not already in a shelter.
            if serializer.validated_data.get('shelter') and not serializer.instance.shelter:
                serializer.validated_data['status'] = 'SHELTERED'
                serializer.validated_data['intake_date'] = datetime.now()
                action.send(self.request.user, verb='sheltered animal in', target=serializer.instance, action_object=serializer.validated_data.get('shelter'))
                action.send(self.request.user, verb='sheltered animal', target=serializer.validated_data.get('shelter'), action_object=serializer.instance)

            # If animal already had a shelter and now has a different shelter.
            if serializer.validated_data.get('shelter') and serializer.instance.shelter != serializer.validated_data.get('shelter'):
                action.send(self.request.user, verb='sheltered animal in', target=serializer.instance, action_object=serializer.validated_data.get('shelter'))
                action.send(self.request.user, verb='sheltered animal', target=serializer.validated_data.get('shelter'), action_object=serializer.instance)

            # If animal had a shelter and now doesn't or has a different shelter.
            if serializer.instance.shelter and (serializer.instance.shelter != serializer.validated_data.get('shelter', serializer.instance.shelter)):
                action.send(self.request.user, verb='removed animal', target=serializer.instance.shelter, action_object=serializer.instance)

            # If animal had a room and now doesn't or has a different room.
            if serializer.instance.room and (not serializer.validated_data.get('room') or serializer.instance.room != serializer.validated_data.get('room')):
                action.send(self.request.user, verb='removed animal', target=serializer.instance.room, action_object=serializer.instance)
                action.send(self.request.user, verb='removed animal', target=serializer.instance.room.building, action_object=serializer.instance)

            # If animal is added to a new room from no room or a different room.
            if serializer.validated_data.get('room') and (serializer.instance.room != serializer.validated_data.get('room')):
                action.send(self.request.user, verb='roomed animal in', target=serializer.instance, action_object=serializer.validated_data.get('room'))
                action.send(self.request.user, verb='roomed animal', target=serializer.validated_data.get('room'), action_object=serializer.instance)
                action.send(self.request.user, verb='roomed animal', target=serializer.validated_data.get('room').building, action_object=serializer.instance)

            # Record status change if appplicable.
            if serializer.instance.status != serializer.validated_data.get('status', serializer.instance.status):
                new_status = serializer.validated_data.get('status')
                action.send(self.request.user, verb=f'changed animal status to {new_status}', target=serializer.instance)

            # Identify if there were any animal changes that aren't status, shelter, room, or owner.
            changed_fields = []
            for field, value in serializer.validated_data.items():
                new_value = value
                old_value = getattr(serializer.instance, field)
                if field not in ['status', 'room', 'shelter', 'order', 'owners'] and new_value != old_value:
                    changed_fields.append(field)

            animal = serializer.save()

            # Remove animal.
            if self.request.data.get('remove_animal'):
                Animal.objects.filter(id=self.request.data.get('remove_animal')).update(status='CANCELED', shelter=None, room=None)

            # Set order if present, add 1 to avoid 0 index since order is a PositiveIntergerField.
            if type(self.request.data.get('set_order', '')) == int:
                animal.to(int(self.request.data.get('set_order'))+1)

            # Only record animal update if a field other than status, shelter, room, order, or owner has changed.
            if len(changed_fields) > 0:
                action.send(self.request.user, verb='updated animal', target=animal)

            # Remove Owner from animal.
            if self.request.data.get('remove_owner'):
                animal.owners.remove(self.request.data.get('remove_owner'))

            # Check if any original front/side images need to be removed.
            for key in ("front_image", "side_image"):
                if key in self.request.FILES.keys() or not self.request.data.get(key, ''):
                    AnimalImage.objects.filter(animal=animal, category=key).delete()

            def strip_s3(url):
                return url.split("?AWSAccessKeyId")[0]

            # Remove extra images that have been removed.
            remaining_extra_urls = [strip_s3(url) for url in self.request.data.get('extra_images', '').split(',')]
            for extra_image in AnimalImage.objects.filter(animal=animal, category="extra"):
                if strip_s3(extra_image.image.url) not in remaining_extra_urls:
                    extra_image.delete()

            #Create new files from uploads
            for key in self.request.FILES.keys():
                image_data = self.request.FILES[key]
                key = key if key in ("front_image", "side_image") else "extra"
                AnimalImage.objects.create(image=image_data, animal=animal, category=key)

            # Check to see if animal SR status should be changed.
            if animal.request:
                animal.request.update_status()

    def get_queryset(self):
        """
        Returns: Queryset of distinct animals, each annotated with:
            images (List of AnimalImages)
        """        
        queryset = (
            Animal.objects.with_images().with_history().exclude(status="CANCELED").distinct()
            .prefetch_related("owners")
            .select_related("reporter", "room", "request", "shelter")
            .order_by('order')
        )
        if self.request.GET.get('incident'):
            queryset = queryset.filter(incident__slug=self.request.GET.get('incident'))
        return queryset

def print_kennel_card(request, animal_id):
    animal = Animal.objects.get(id=animal_id)
    owners = SimplePersonSerializer(animal.owners.all(), many=True).data
    context={"animal":animal, "owners":owners, "care_schedule_rows": range(30)}
    return render(request, "ui/animals/print.html", context)    
