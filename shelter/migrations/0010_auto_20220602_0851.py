# Generated by Django 3.1.2 on 2022-06-02 15:51

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('shelter', '0009_auto_20220510_1248'),
    ]

    operations = [
        migrations.AlterField(
            model_name='shelter',
            name='city',
            field=models.CharField(blank=True, max_length=50, null=True),
        ),
    ]
