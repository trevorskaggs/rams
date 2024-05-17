from datetime import datetime, date
from django.utils import timezone
from django.contrib.sites.models import Site
from django.core.mail import send_mail
from django.template.loader import render_to_string
from rest_framework import permissions, status, viewsets
from rest_framework.response import Response
from rest_framework.decorators import action

from accounts.models import ShelterlyUser
from incident.models import Incident, Organization, TemporaryAccess
from incident.serializers import IncidentSerializer, OrganizationSerializer, TemporaryAccessSerializer


# Provides view for User API calls.
class IncidentViewSet(viewsets.ModelViewSet):
    queryset = Incident.objects.all()
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = IncidentSerializer

    def get_queryset(self):
        queryset = Incident.objects.filter(hide=False)

        if self.request.GET.get('incident'):
            queryset = queryset.filter(slug=self.request.GET.get('incident'))

        if self.request.GET.get('organization_slug'):
            queryset = queryset.filter(organization__slug=self.request.GET.get('organization_slug'))

        return queryset

    def perform_create(self, serializer):
        if serializer.is_valid():

            # Only create incident if user is an Admin.
            if self.request.user.is_superuser or self.request.user.perms.filter(organization=self.request.data.get('organization'))[0].incident_perms:
                inc = serializer.save()
                #Check if Incident is a non-training incident, if so, email all admins a notification of creation.
                if not inc.training:
                    emails = [user.email for user in ShelterlyUser.objects.filter(is_superuser=True)]
                    message_data = {
                            'site': Site.objects.get_current(),
                            'user_email': self.request.user.email,
                            'organization_name': inc.organization.name,
                            'organization_slug': inc.organization.slug,
                            'incident_name': inc.name,
                            'incident_slug': inc.slug
                    }
                    send_mail(
                        # title:
                        "%s has started a New Incident: %s!" % (inc.organization.name, inc.name),
                        # message:
                        render_to_string(
                            'new_incident_email.txt',
                            message_data
                        ).strip(),
                        # from:
                        "DoNotReply@shelterly.org",
                        # to:
                        emails,
                        fail_silently=False,
                        html_message = render_to_string(
                            'new_incident_email.html',
                            message_data
                        ).strip()
                    )


    def perform_update(self, serializer):
        if serializer.is_valid():

            # Only create incident if user is an Admin.
            if self.request.user.is_superuser or self.request.user.perms.filter(organization=self.request.data.get('organization'))[0].incident_perms:
                incident = serializer.save()

                # Open/close incident.
                if self.request.data.get('change_lock'):
                    if incident.end_time:
                        incident.end_time = None
                    else:
                        incident.end_time = datetime.now()
                    incident.save()

    # New method to specifically handle updating the 'hide' property of an incident.
    @action(detail=True, methods=['patch'])
    def hide(self, request, pk=None):
        try:
            incident = self.get_object()
            if self.request.user.is_superuser or self.request.user.perms.filter(organization=incident.organization)[0].incident_perms:
                incident.hide = request.data.get('hide', False)
                incident.save()
                return Response({'status': 'hide status updated'}, status=status.HTTP_200_OK)
            else:
                return Response({'error': 'Invalid hide value'}, status=status.HTTP_400_BAD_REQUEST)
        except ValueError:
            return Response({'error': 'Invalid hide value'}, status=status.HTTP_400_BAD_REQUEST)
        

# Provides view for Organization calls.
class OrganizationViewSet(viewsets.ModelViewSet):
    queryset = Organization.objects.all()
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = OrganizationSerializer

    def get_queryset(self):
        queryset = Organization.objects.filter(id__in=self.request.user.organizations.all()).order_by('name')
        copy_queryset = queryset
        for organization in copy_queryset:
            if self.request.user.perms.filter(organization=organization)[0].access_expires_at and (date.today() > self.request.user.perms.filter(organization=organization)[0].access_expires_at.date()):
                queryset = queryset.exclude(id=organization.id)
        if self.request.GET.get('slug'):
            queryset = queryset.filter(slug=self.request.GET.get('slug'))
        return queryset

class TemporaryAccessViewSet(viewsets.ModelViewSet):
    queryset = TemporaryAccess.objects.all()
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = TemporaryAccessSerializer

    def get_queryset(self):
        queryset = TemporaryAccess.objects.filter(link_expires_at__gte=datetime.today())
        if self.request.GET.get('organization'):
            queryset = queryset.filter(organization__slug=self.request.GET.get('organization'))
        return queryset
