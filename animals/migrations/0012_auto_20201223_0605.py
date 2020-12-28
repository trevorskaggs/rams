# Generated by Django 3.1 on 2020-12-23 14:05

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('people', '0010_person_alt_phone'),
        ('animals', '0011_auto_20201114_1439'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='animal',
            name='owner',
        ),
        migrations.AddField(
            model_name='animal',
            name='owner',
            field=models.ManyToManyField(blank=True, to='people.Person'),
        ),
    ]
