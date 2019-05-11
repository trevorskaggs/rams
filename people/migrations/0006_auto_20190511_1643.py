# Generated by Django 2.1.7 on 2019-05-11 16:43

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('people', '0005_auto_20190425_2314'),
    ]

    operations = [
        migrations.AlterModelOptions(
            name='owner',
            options={},
        ),
        migrations.AlterModelOptions(
            name='worker',
            options={},
        ),
        migrations.AddField(
            model_name='worker',
            name='agency_id',
            field=models.CharField(blank=True, max_length=50, null=True),
        ),
        migrations.AlterField(
            model_name='worker',
            name='cell_phone',
            field=models.CharField(default=None, max_length=50),
            preserve_default=False,
        ),
        migrations.AlterField(
            model_name='worker',
            name='first_name',
            field=models.CharField(default=None, max_length=50),
            preserve_default=False,
        ),
        migrations.AlterField(
            model_name='worker',
            name='last_name',
            field=models.CharField(default=None, max_length=50),
            preserve_default=False,
        ),
    ]
