# Generated by Django 3.2.14 on 2023-11-11 19:14

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('incident', '0005_organization'),
    ]

    operations = [
        migrations.AddField(
            model_name='incident',
            name='organization',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='incident.organization'),
        ),
    ]
