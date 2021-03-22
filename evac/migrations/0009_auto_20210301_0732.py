# Generated by Django 3.1.2 on 2021-03-01 15:32

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('evac', '0008_auto_20210131_0945'),
    ]

    operations = [
        migrations.AlterModelOptions(
            name='evacassignment',
            options={'ordering': ['-start_time']},
        ),
        migrations.RemoveField(
            model_name='evacassignment',
            name='team_members',
        ),
        migrations.CreateModel(
            name='DispatchTeam',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('team_members', models.ManyToManyField(to='evac.EvacTeamMember')),
            ],
        ),
        migrations.AddField(
            model_name='evacassignment',
            name='team',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='evac.dispatchteam'),
        ),
    ]
