from django.contrib.auth import get_user_model, login
from django.contrib.sites.models import Site
from django.core.mail import send_mail
from django.apps import apps
from django.template.loader import render_to_string
from knox.views import LoginView as KnoxLoginView
from rest_framework import generics, permissions, viewsets
from rest_framework.authtoken.serializers import AuthTokenSerializer

from accounts.serializers import UserSerializer

User = get_user_model()


class LoginView(KnoxLoginView):
    permission_classes = (permissions.AllowAny,)

    def post(self, request, format=None):
        serializer = AuthTokenSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        login(request, user)
        return super(LoginView, self).post(request, format=None)


# Provides user auth view.
class UserAuth(generics.RetrieveAPIView):
    permission_classes = [permissions.IsAuthenticated, ]
    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user


# Provides view for User API calls.
class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    permission_classes = [permissions.IsAuthenticated, permissions.IsAdminUser]
    serializer_class = UserSerializer

    def perform_update(self, serializer):
        if serializer.is_valid():
            user = serializer.save()
            if self.request.data.get('reset_password'):
                ResetPasswordToken = apps.get_model('django_rest_passwordreset', 'ResetPasswordToken')
                token = ResetPasswordToken.objects.create(
                    user=user,
                )

                # Send email here.
                send_mail(
                    # title:
                    "Password Reset for Shelterly",
                    # message:
                    render_to_string(
                        'password_reset_email.txt',
                        {
                        'site': Site.objects.get_current(),
                        'token': token.key,
                        }
                    ).strip(),
                    # from:
                    "DoNotReply@shelterly.org",
                    # to:
                    [user.email],
                    fail_silently=False,
                    html_message = render_to_string(
                        'password_reset_email.html',
                        {
                        'site': Site.objects.get_current(),
                        'token': token.key,
                        }
                    ).strip()
                )
