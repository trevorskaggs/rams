# Generated by Django 3.2.14 on 2024-01-02 23:08

import django.contrib.postgres.fields
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('vet', '0006_auto_20231228_1213'),
    ]

    operations = [
        migrations.CreateModel(
            name='Diagnostic',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=200)),
            ],
            options={
                'ordering': ('name',),
            },
        ),
        migrations.CreateModel(
            name='Procedure',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=200)),
            ],
            options={
                'ordering': ('name',),
            },
        ),
        migrations.RemoveField(
            model_name='treatment',
            name='valid_routes',
        ),
        migrations.RemoveField(
            model_name='treatment',
            name='valid_units',
        ),
        migrations.AddField(
            model_name='treatment',
            name='controlled',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='treatment',
            name='routes',
            field=django.contrib.postgres.fields.ArrayField(base_field=models.CharField(max_length=8), default=[], size=None),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='treatment',
            name='unit',
            field=models.CharField(blank=True, max_length=20, null=True),
        ),
        migrations.AlterField(
            model_name='treatment',
            name='category',
            field=models.CharField(max_length=50),
        ),
        migrations.AlterField(
            model_name='vetrequest',
            name='diagnosis',
            field=models.ManyToManyField(blank=True, to='vet.Diagnosis'),
        ),
        migrations.CreateModel(
            name='DiagnosticResult',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('result', models.CharField(max_length=20)),
                ('notes', models.CharField(max_length=300)),
                ('diagnostic', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, to='vet.diagnostic')),
                ('vet_request', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, to='vet.vetrequest')),
            ],
        ),
        migrations.AddField(
            model_name='vetrequest',
            name='diagnostics',
            field=models.ManyToManyField(to='vet.Diagnostic'),
        ),
        migrations.AddField(
            model_name='vetrequest',
            name='procedures',
            field=models.ManyToManyField(to='vet.Procedure'),
        ),
    ]
