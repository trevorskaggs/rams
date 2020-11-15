# Generated by Django 3.1.2 on 2020-11-14 14:39

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('evac', '0006_delete_visitnote'),
        ('hotline', '0007_auto_20201104_1730'),
    ]

    operations = [
        migrations.CreateModel(
            name='VisitNote',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('date_completed', models.DateTimeField()),
                ('owner_contacted', models.BooleanField(default=False)),
                ('notes', models.CharField(blank=True, max_length=500)),
                ('evac_assignment', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='evac.evacassignment')),
                ('service_request', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='hotline.servicerequest')),
            ],
        ),
    ]
