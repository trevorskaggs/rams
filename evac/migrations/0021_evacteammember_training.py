# Generated by Django 3.2.14 on 2023-12-06 21:37

from django.db import migrations, models
import django.db.models.deletion
import evac.models


class Migration(migrations.Migration):

    dependencies = [
        ('evac', '0020_evacassignment_closed'),
    ]

    operations = [
        migrations.AddField(
            model_name='evacteammember',
            name='incident',
            field=models.ForeignKey(default=evac.models.test_incident, on_delete=django.db.models.deletion.CASCADE, to='incident.incident'),
        ),
    ]
