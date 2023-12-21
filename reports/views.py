from django.db.models import Count, CharField, DateTimeField, Exists, OuterRef, Subquery, Prefetch, F, Q, IntegerField, Value
from django.db.models.functions import Cast, TruncDay
from rest_framework import viewsets
from operator import itemgetter
from rest_framework.response import Response
from animals.models import Animal
from hotline.models import ServiceRequest
from evac.models import DispatchTeam
from shelter.models import Shelter
import datetime
from actstream.models import Action
from django.utils import timezone

# Provides view for Person API calls.
class ReportViewSet(viewsets.ViewSet):

  def list(self, response):
    if ServiceRequest.objects.filter(incident__slug=self.request.GET.get('incident', '')).exists():
        start_date = ServiceRequest.objects.filter(incident__slug=self.request.GET.get('incident', '')).annotate(date=TruncDay('timestamp')).values('date').earliest('date')['date']
        end_date = timezone.now()

        daily_report = []
        sr_worked_report = []
        delta = datetime.timedelta(days=1)

        while end_date >= start_date:
          service_requests = ServiceRequest.objects.filter(incident__slug=self.request.GET.get('incident', ''), assignedrequest__timestamp__date=end_date).distinct()
          total_assigned = service_requests.count()
          sip_sr_worked = service_requests.filter(sip=True).count()
          utl_sr_worked = service_requests.filter(utl=True).count()
          teams = DispatchTeam.objects.filter(dispatch_date__date=end_date).distinct('name').count()

          daily_data = {
            'date': end_date.strftime('%m/%d/%Y'),
            'total': ServiceRequest.objects.filter(incident__slug=self.request.GET.get('incident', ''), timestamp__date__lte=end_date).count(),
            'assigned': total_assigned,
            'new': ServiceRequest.objects.filter(incident__slug=self.request.GET.get('incident', ''), timestamp__date=end_date).count()
          }
          daily_report.append(daily_data)
          sr_data = {
            'date': end_date.strftime('%m/%d/%Y'),
            'new_sr_worked': total_assigned - sip_sr_worked - utl_sr_worked,
            'sip_sr_worked': sip_sr_worked,
            'utl_sr_worked': utl_sr_worked,
            'total': total_assigned,
            'teams': teams,
            'sr_per_team': total_assigned / teams if teams > 0 else 0
          }
          sr_worked_report.append(sr_data)
          end_date -= delta
        shelters = Shelter.objects.filter(animal__incident__slug=self.request.GET.get('incident')).annotate(
          avians=Count("animal", filter=Q(animal__species__category__name="avian", animal__status='SHELTERED', animal__incident__slug=self.request.GET.get('incident', ''))),
          cats=Count("animal", filter=Q(animal__species__category__name="cat", animal__status='SHELTERED', animal__incident__slug=self.request.GET.get('incident', ''))),
          dogs=Count("animal", filter=Q(animal__species__category__name="dog", animal__status='SHELTERED', animal__incident__slug=self.request.GET.get('incident', ''))),
          equines=Count("animal", filter=Q(animal__species__category__name="equine", animal__status='SHELTERED', animal__incident__slug=self.request.GET.get('incident', ''))),
          reptiles=Count("animal", filter=Q(animal__species__category__name="reptile", animal__status='SHELTERED', animal__incident__slug=self.request.GET.get('incident', ''))),
          ruminants=Count("animal", filter=Q(animal__species__category__name="ruminant", animal__status='SHELTERED', animal__incident__slug=self.request.GET.get('incident', ''))),
          small_mammals=Count("animal", filter=Q(animal__species__category__name="small mammal", animal__status='SHELTERED', animal__incident__slug=self.request.GET.get('incident', ''))),
          others=Count("animal", filter=Q(animal__species__category__name="other", animal__status='SHELTERED', animal__incident__slug=self.request.GET.get('incident', ''))),
          total=Count("animal", filter=Q(animal__status='SHELTERED', animal__incident__slug=self.request.GET.get('incident', '')))).values('name', 'avians', 'cats', 'dogs', 'equines', 'reptiles', 'ruminants', 'small_mammals', 'others', 'total').order_by('name')
        animals_status = Animal.objects.filter(incident__slug=self.request.GET.get('incident', '')).exclude(status='CANCELED').values('species__name').annotate(reported=Count("id", filter=Q(status='REPORTED')), reported_evac=Count("id", filter=Q(status='REPORTED (EVAC REQUESTED)')), reported_sip=Count("id", filter=Q(status='REPORTED (SIP REQUESTED)')), utl=Count("id", filter=Q(status='UNABLE TO LOCATE')), nfa=Count("id", filter=Q(status='NO FURTHER ACTION')), sheltered=Count("id", filter=Q(status='SHELTERED')), sip=Count("id", filter=Q(status='SHELTERED IN PLACE')), reunited=Count("id", filter=Q(status='REUNITED')), deceased=Count("id", filter=Q(status='DECEASED')), total=Count("id")).order_by()
        animals_ownership = Animal.objects.filter(incident__slug=self.request.GET.get('incident', '')).exclude(status='CANCELED').values('species__name').annotate(owned=Count("id", filter=Q(owners__isnull=False)), stray=Count("id", filter=Q(owners__isnull=True)), total=Count("id")).order_by()
        animals_deceased = []
        for animal in list(Animal.objects.filter(incident__slug=self.request.GET.get('incident', ''), status='DECEASED').values('id', 'name', 'species__name', 'status', 'address', 'city', 'state', 'zip_code')):
            for action in Action.objects.filter(target_object_id=str(animal['id']), verb="changed animal status to DECEASED"):
                animal['date'] = action.timestamp
                animals_deceased.append(animal)
        data = {'daily_report':daily_report, 'sr_worked_report':sr_worked_report, 'shelter_report':shelters, 'animal_status_report':animals_status, 'animal_owner_report':animals_ownership, 'animal_deceased_report':sorted(animals_deceased, key=itemgetter('date'), reverse=True)}
        return Response(data)
    return Response({'daily_report':[], 'sr_worked_report':[], 'shelter_report':[], 'animal_status_report':[], 'animal_owner_report':[], 'animal_deceased_report':[]})
