from django.contrib.auth import get_user_model
from django.contrib.sites.models import Site
from django.core.mail import send_mass_mail
from django.db import models, transaction
from django.db.models.signals import post_save
from django.template.loader import render_to_string

from hotline.models import ServiceRequest
from incident.models import Incident, IncidentNotification

User = get_user_model()

class EvacTeamMember(models.Model):

    first_name = models.CharField(max_length=50, blank=False)
    last_name = models.CharField(max_length=50, blank=False)
    phone = models.CharField(max_length=50, blank=False)
    agency_id = models.CharField(max_length=50, blank=True)
    show = models.BooleanField(default=True)
    incident = models.ForeignKey(Incident, on_delete=models.CASCADE)

    def __str__(self):
        agency = " (%s)" % (self.agency_id) if self.agency_id else ""
        return "%s, %s%s" % (self.last_name, self.first_name, agency)

    class Meta:
        ordering = ['last_name', 'first_name']

class DispatchTeam(models.Model):

    name = models.CharField(max_length=50)
    team_members = models.ManyToManyField(EvacTeamMember)
    dispatch_date = models.DateTimeField(auto_now_add=True)
    show = models.BooleanField(default=True)
    incident = models.ForeignKey(Incident, on_delete=models.CASCADE)

    def __str__(self):
        return self.name

class EvacAssignment(models.Model):

    id_for_incident = models.IntegerField(blank=True, null=True)

    team = models.ForeignKey(DispatchTeam, on_delete=models.SET_NULL, blank=True, null=True)
    service_requests = models.ManyToManyField(ServiceRequest, through='AssignedRequest', related_name='evacuation_assignments')
    start_time = models.DateTimeField(auto_now_add=True)
    end_time = models.DateTimeField(blank=True, null=True)
    incident = models.ForeignKey(Incident, on_delete=models.CASCADE)
    closed = models.BooleanField(default=False)

    def get_geojson(self):
        geojson = {'features':[]}
        for service_request in self.service_requests.all():
            geojson['features'].append(service_request.get_feature_json())
        return geojson

    def save(self, *args, **kwargs):
        if not self.pk:
            total_das = EvacAssignment.objects.select_for_update().filter(incident=self.incident).values_list('id', flat=True)
            with transaction.atomic():
                count = len(total_das)
                self.id_for_incident = count + 1
                super(EvacAssignment, self).save(*args, **kwargs)
        else:
            super(EvacAssignment, self).save(*args, **kwargs)

    class Meta:
        ordering = ['-start_time',]

# Send email to dispatch users on creation.
def email_on_creation(sender, instance, **kwargs):
    if kwargs["created"]:
        # Send email here.
        incident_notifications = IncidentNotification.objects.filter(incident=instance.incident)
        user_emails = incident_notifications.values_list('user__email', flat=True)
        if len(user_emails) > 0:
            sr_addresses = []
            for sr in instance.service_requests.all():
                sr_address.append('SR#%s: %s, %s, %s' % sr.id_for_incident, sr.address, sr.city, sr.state)
            email_data = {
                'site': Site.objects.get_current(),
                'user': sender.user.email,
                'id': instance.id_for_incident,
                'incident': instance.incident.slug,
                'organization': instance.incident.organization.slug,
                'team_name': instance.team.name,
                'team_members': ', '.join(str(m) for m in instance.team.team_members.all()),
                'sr_addresses': '\n'.join(sr_add for sr_add in sr_addresses),
                'da_creation_date': instance.start_time.strftime('%m/%d/%Y %H:%M:%S')
            }
            message = (
                "Dispatch Assignment #" + str(instance.id_for_incident) + " Created for Shelterly",
                render_to_string(
                    'dispatch_assignment_creation_email.txt',
                    email_data
                ).strip(),
                "DoNotReply@shelterly.org",
                user_emails,
            )
            send_mass_mail((message,))


post_save.connect(email_on_creation, sender=EvacAssignment)


class AssignedRequest(models.Model):

    service_request = models.ForeignKey(ServiceRequest, null=True, on_delete=models.SET_NULL)
    dispatch_assignment = models.ForeignKey(EvacAssignment, null=True, on_delete=models.SET_NULL, related_name='assigned_requests')
    animals = models.JSONField()
    followup_date = models.DateTimeField(auto_now=False, auto_now_add=False, blank=True, null=True)
    owner_contact = models.ForeignKey('people.OwnerContact', null=True, on_delete=models.CASCADE, related_name='assigned_request')
    visit_note = models.ForeignKey('hotline.VisitNote', null=True, on_delete=models.CASCADE, related_name='assigned_request')
    timestamp = models.DateTimeField(null=True, blank=True)
