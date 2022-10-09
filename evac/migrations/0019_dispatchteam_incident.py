# Generated by Django 3.2.14 on 2022-09-09 18:47

from django.db import migrations, models
import django.db.models.deletion
import evac.models


class Migration(migrations.Migration):

    dependencies = [
        ('incident', '0003_auto_20220808_1343'),
        ('evac', '0018_evacassignment_incident'),
    ]

    operations = [
        migrations.AddField(
            model_name='dispatchteam',
            name='incident',
            field=models.ForeignKey(default=evac.models.test_incident, on_delete=django.db.models.deletion.CASCADE, to='incident.incident'),
        ),
    ]
