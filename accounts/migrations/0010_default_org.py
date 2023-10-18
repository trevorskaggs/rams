# Generated by Django 3.2.14 on 2023-07-04 14:53

from django.db import migrations, models


def update_status_change(apps, schema_editor):
    db_alias = schema_editor.connection.alias
    Organization = apps.get_model("accounts", "Organization")
    Organization.objects.using(db_alias).create(name='Change Me', liability_name='Change Me', liability_short_name='CHANGEME')

class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0009_auto_20230812_1516'),
    ]

    operations = [
        migrations.RunPython(update_status_change)
    ]
