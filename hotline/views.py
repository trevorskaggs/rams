import io
import json

from evac.models import EvacAssignment
from django.db.models import Case, Count, Exists, OuterRef, Prefetch, Q, When, Value, BooleanField
from django.http import HttpResponse
from actstream import action
from datetime import datetime
from .serializers import ServiceRequestSerializer, SimpleServiceRequestSerializer, VisitNoteSerializer
from .ordering import MyCustomOrdering
from wsgiref.util import FileWrapper
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

from animals.models import Animal
from animals.views import MultipleFieldLookupMixin
from hotline.models import ServiceRequest, ServiceRequestImage, VisitNote
from incident.models import Incident

from rest_framework import filters, permissions, serializers, viewsets
from rest_framework.decorators import action as drf_action

class ServiceRequestViewSet(MultipleFieldLookupMixin, viewsets.ModelViewSet):
    queryset = ServiceRequest.objects.all()
    lookup_fields = ['pk', 'incident', 'id_for_incident']
    search_fields = ['id_for_incident', 'address', 'city', 'animal__name', 'owners__first_name', 'owners__last_name', 'owners__phone', 'owners__drivers_license', 'owners__address', 'owners__city', 'reporter__first_name', 'reporter__last_name']
    filter_backends = (filters.SearchFilter, MyCustomOrdering)
    permission_classes = [permissions.IsAuthenticated, ]
    serializer_class = SimpleServiceRequestSerializer
    detail_serializer_class = ServiceRequestSerializer

    def get_serializer_class(self):
        if self.action == 'retrieve':
            if hasattr(self, 'detail_serializer_class'):
                return self.detail_serializer_class

        return super(ServiceRequestViewSet, self).get_serializer_class()


    def perform_create(self, serializer):
        if serializer.is_valid():
            if self.request.data.get('incident_slug'):
                serializer.validated_data['incident'] = Incident.objects.get(slug=self.request.data.get('incident_slug'))

            service_request = serializer.save()
            action.send(self.request.user, verb='created service request', target=service_request)

            # Notify maps that there is new data.
            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)("map", {"type":"new_data"})

    def perform_update(self, serializer):
        from evac.models import AssignedRequest

        if serializer.is_valid():

            service_request = serializer.save()

            if service_request.status == 'canceled':
                service_request.animal_set.update(status='CANCELED')
                action.send(self.request.user, verb='canceled service request', target=service_request)

                for assigned_request in AssignedRequest.objects.filter(service_request=service_request, dispatch_assignment__end_time=None):
                    for animal in service_request.animal_set.all():
                        if assigned_request.animals.get(str(animal.id)):
                            assigned_request.animals[str(animal.id)]['status'] = 'CANCELED'
                    assigned_request.save()

            elif self.request.FILES.keys():
              # Create new files from uploads
              for key in self.request.FILES.keys():
                  image_data = self.request.FILES[key]
                  ServiceRequestImage.objects.create(image=image_data, name=self.request.data.get('name'), service_request=service_request)
            elif self.request.data.get('edit_image'):
              ServiceRequestImage.objects.filter(id=self.request.data.get('id')).update(name=self.request.data.get('edit_image'))
            elif self.request.data.get('remove_image'):
              ServiceRequestImage.objects.filter(id=self.request.data.get('remove_image')).delete()

            elif self.request.data.get('reunite_animals'):
                service_request.animal_set.exclude(status__in=['DECEASED', 'NO FURTHER ACTION']).update(status='REUNITED', shelter=None, room=None)
                for animal in service_request.animal_set.exclude(status__in=['DECEASED', 'NO FURTHER ACTION']):
                    action.send(self.request.user, verb=f'changed animal status to reunited', target=animal)
                    for assigned_request in AssignedRequest.objects.filter(service_request=serializer.instance.request, dispatch_assignment__end_time=None):
                        assigned_request.animals[str(serializer.instance.id)]['status'] = 'REUNITED'
                        assigned_request.save()
                service_request.update_status(self.request.user)
            else:
                action.send(self.request.user, verb='updated service request', target=service_request)

    def get_queryset(self):
        queryset = (
            ServiceRequest.objects.all()
            .annotate(animal_count=Count("animal"))
            .annotate(
                injured=Exists(Animal.objects.filter(request_id=OuterRef("id"), injured="yes"))
            )
            .annotate(
                pending=Case(When(Q(followup_date__lte=datetime.today()) | Q(followup_date__isnull=True), then=Value(True)), default=Value(False), output_field=BooleanField())
            ).prefetch_related(Prefetch('animal_set', queryset=Animal.objects.with_images().exclude(status='CANCELED').prefetch_related('owners'), to_attr='animals'))
            .prefetch_related('owners')
            .select_related('reporter')
            .prefetch_related(Prefetch('evacuation_assignments', EvacAssignment.objects.select_related('team').prefetch_related('team__team_members')))
        )

        # Status filter.
        status = self.request.query_params.get('status', '')
        if status in ('open', 'assigned', 'closed', 'canceled'):
            queryset = queryset.filter(status=status).distinct()

        # Exclude SRs without a geolocation when fetching for a map.
        is_map = self.request.query_params.get('map', '')
        if is_map == 'true':
            queryset = queryset.exclude(Q(latitude=None) | Q(longitude=None) | Q(animal=None)).exclude(status='canceled')
        if self.request.GET.get('incident'):
            queryset = queryset.filter(incident__slug=self.request.GET.get('incident'))
        return queryset

    @drf_action(detail=True, methods=['GET'], name='Download GeoJSON')
    def download(self, request, pk=None):
        sr = ServiceRequest.objects.get(id=pk)
        data = {"features":[sr.get_feature_json()]}
        data_string = json.dumps(data)
        json_file = io.StringIO()
        json_file.write(data_string)
        json_file.seek(0)

        wrapper = FileWrapper(json_file)
        response = HttpResponse(wrapper, content_type='application/json')
        response['Content-Disposition'] = 'attachement; filename=SR-' + str(sr.id_for_incident) + '.geojson'
        return response

    @drf_action(detail=False, methods=['GET'], name='Download All GeoJSON')
    def download_all(self, request, pk=None):
        json_file = io.StringIO()
        features = []
        for id in self.request.GET.get('ids').replace('&','').split('id='):
            if id:
                sr = ServiceRequest.objects.get(id=id)
                features.append(sr.get_feature_json())

        data = {"features":features}
        data_string = json.dumps(data)
        json_file.write(data_string)
        json_file.seek(0)
        wrapper = FileWrapper(json_file)
        response = HttpResponse(wrapper, content_type='application/json')
        response['Content-Disposition'] = 'attachement; filename=SRs' + '.geojson'
        return response

class VisitNoteViewSet(viewsets.ModelViewSet):

    queryset = VisitNote.objects.all()
    permission_classes = [permissions.IsAuthenticated, ]
    serializer_class = VisitNoteSerializer
