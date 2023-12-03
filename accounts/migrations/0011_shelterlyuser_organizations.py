# Generated by Django 3.2.14 on 2023-11-11 19:14

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('incident', '0006_incident_organization'),
        ('accounts', '0010_delete_organization'),
    ]

    operations = [
        migrations.AddField(
            model_name='shelterlyuser',
            name='organizations',
            field=models.ManyToManyField(blank=True, to='incident.Organization'),
        ),
    ]
