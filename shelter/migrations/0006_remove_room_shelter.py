# Generated by Django 3.0.8 on 2020-08-29 13:51

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('shelter', '0005_add_fk'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='room',
            name='shelter',
        ),
    ]
