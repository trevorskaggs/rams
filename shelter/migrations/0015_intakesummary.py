# Generated by Django 3.2.14 on 2023-02-01 21:53

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('animals', '0024_auto_20221111_0831'),
        ('shelter', '0014_remove_shelter_test'),
    ]

    operations = [
        migrations.CreateModel(
            name='IntakeSummary',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('date', models.DateTimeField(auto_now_add=True)),
                ('animals', models.ManyToManyField(to='animals.Animal')),
                ('intake_type', models.CharField(max_length=20)),
                ('shelter', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='shelter.shelter')),
            ],
        ),
    ]
