"""
Django settings for shelterly project.

Generated by 'django-admin startproject' using Django 2.1.7.

For more information on this file, see
https://docs.djangoproject.com/en/2.1/topics/settings/

For the full list of settings and their values, see
https://docs.djangoproject.com/en/2.1/ref/settings/
"""

import datetime
import os
import json
import boto3
from version import __version__

try:
    with open('config/secrets.json') as f:
        secrets = json.loads(f.read())
        for item in secrets.items():
            os.environ[item[0]] = item[1]
except FileNotFoundError:
    print("No secrets file found. Environmental variables must be set elsewhere.")

# Build paths inside the project like this: os.path.join(BASE_DIR, ...)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.environ.get('SECRET_KEY')
ORGANIZATION = os.environ.get('ORGANIZATION')
INCIDENT_NAME = os.environ.get('INCIDENT_NAME')
SHELTERLY_VERSION = __version__

# CALTOPO SETTINGS
CALTOPO_ID = os.environ.get('CALTOPO_ID')
CALTOPO_KEY = os.environ.get('CALTOPO_KEY')
CALTOPO_ACCOUNT_ID = os.environ.get('CALTOPO_ACCOUNT_ID')

DEBUG = False
USE_S3 = True
# SECURITY WARNING: don't run with debug turned on in production!
ALLOWED_HOSTS = ['*']
AUTH_USER_MODEL = 'accounts.ShelterlyUser'

DEFAULT_AUTO_FIELD = 'django.db.models.AutoField'

DATA_UPLOAD_MAX_MEMORY_SIZE = 10485760 #Bump allowed filesize to 10MB

# AWS Config
credentials = boto3.Session().get_credentials()
if credentials:
    AWS_ACCESS_KEY_ID = credentials.access_key
    AWS_SECRET_ACCESS_KEY = credentials.secret_key

# Use to output emails in console.
# EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
EMAIL_BACKEND = 'django_smtp_ssl.SSLEmailBackend'
EMAIL_HOST = 'email-smtp.us-west-2.amazonaws.com'
EMAIL_PORT = '465'
EMAIL_HOST_USER = os.environ.get('EMAIL_USER')
EMAIL_HOST_PASSWORD = os.environ.get('EMAIL_PASSWORD')
EMAIL_USE_SSL = True

# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django.contrib.sites',
    'django_filters',
    'corsheaders',
    'channels',
    'channels_postgres',
    'accounts',
    'animals',
    'evac',
    'hotline',
    'incident',
    'location',
    'people',
    'rest_framework',
    'knox',
    'django_rest_passwordreset',
    'shelter',
    'vet',
    'frontend',
    'ordered_model',
    'actstream'
]

ACTSTREAM_SETTINGS = {
    'FETCH_RELATIONS': True,
    'USE_PREFETCH': True,
}

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

CORS_ORIGIN_ALLOW_ALL = True

ROOT_URLCONF = 'urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': ['templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                # 'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
                'django.template.context_processors.media',
                'django.template.context_processors.static'
            ],
        },
    },
]

WSGI_APPLICATION = 'wsgi.application'
ASGI_APPLICATION = 'asgi.application' #asgi.py will handle the ASGI
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_postgres.core.PostgresChannelLayer',
        'CONFIG': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': os.environ.get('DATABASE_NAME'),
            'USER': os.environ.get('DATABASE_USER'),
            'PASSWORD': os.environ.get('DATABASE_PASSWORD'),
            'HOST': os.environ.get('DATABASE_HOST'),
            'PORT': '5432',
        },
    },
}
SITE_ID = 1

# Database
# https://docs.djangoproject.com/en/2.1/ref/settings/#databases

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.environ.get('DATABASE_NAME'),
        'USER': os.environ.get('DATABASE_USER'),
        'PASSWORD': os.environ.get('DATABASE_PASSWORD'),
        'HOST': os.environ.get('DATABASE_HOST'),
        'PORT': 5432,
    },
    'channels_postgres': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.environ.get('DATABASE_NAME'),
        'USER': os.environ.get('DATABASE_USER'),
        'PASSWORD': os.environ.get('DATABASE_PASSWORD'),
        'HOST': os.environ.get('DATABASE_HOST'),
        'PORT': '5432',
	}
}


# Internationalization
# https://docs.djangoproject.com/en/2.1/topics/i18n/

LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'America/Los_Angeles'

USE_I18N = True

USE_L10N = True

USE_TZ = True

SECURE_SSL_REDIRECT = False

# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/2.1/howto/static-files/

STATICFILES_DIRS = [
    os.path.join(BASE_DIR, "frontend/build/static"),
    os.path.join(BASE_DIR, "frontend/src/static")
]

if USE_S3:
    #Static File Settings
    STATIC_URL = 'https://shelterly-files.s3-us-west-2.amazonaws.com/static/%s/' % SHELTERLY_VERSION
    STATICFILES_STORAGE = 'custom_storage.StaticStorage'
    #Media File Settings
    DEFAULT_FILE_STORAGE = 'custom_storage.MediaStorage'
    #AWS Settings
    AWS_STORAGE_BUCKET_NAME = 'shelterly-files'
    AWS_S3_REGION_NAME = 'us-west-2'
else:
    STATIC_URL = '/static/'
    STATIC_ROOT=os.path.join(BASE_DIR, 'static')
    MEDIA_URL = '/media/'
    MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': ('knox.auth.TokenAuthentication',),
    'USER_SERIALIZER': 'accounts.serializers.UserSerializer',
}

REST_KNOX = {
  'TOKEN_TTL': datetime.timedelta(hours=8),
  'USER_SERIALIZER': 'accounts.serializers.UserSerializer',
  'AUTO_REFRESH': True
}

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler'
        },
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': 'INFO',
        },
        'django.db.backends': {
            'level': 'DEBUG',
            'handlers': [],
            'propagate': False
        }
    },
}
