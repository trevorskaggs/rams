# Generated by Django 3.0.4 on 2020-04-16 17:06

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('animals', '0005_auto_20191208_1940'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='animal',
            name='collared',
        ),
        migrations.RemoveField(
            model_name='animal',
            name='diet_needs',
        ),
        migrations.RemoveField(
            model_name='animal',
            name='med_needs',
        ),
        migrations.AlterField(
            model_name='animal',
            name='breed',
            field=models.CharField(blank=True, choices=[('Unknown', 'Unknown'), ('Sporting Group', 'Sporting Group'), ('Working Group', 'Working Group'), ('Toy Group', 'Toy Group'), ('Herding Group', 'Hearding Group'), ('Hound Group', 'Hound Group'), ('Terrier Group', 'Terrier Group'), ('Unknown', 'Unknown'), ('British Shorthair', 'British Shorthair'), ('Burmese', 'Burmese'), ('Foreign Shorthair', 'Foreign Shorthair'), ('Oriental', 'Oriental'), ('Persian', 'Persian'), ('Semi-longhair', 'Semi-longhair'), ('Siamese', 'Siamese')], default='Unknown', max_length=50, null=True),
        ),
        migrations.AlterField(
            model_name='animal',
            name='markings',
            field=models.CharField(blank=True, choices=[('none', 'None'), ('brindle', 'Brindle'), ('hairless', 'Hairless'), ('harlequin', 'Harlequin'), ('merle', 'Merle'), ('sable', 'Sable'), ('saddle', 'Saddle'), ('speckled', 'Speckled'), ('spotted', 'Spotted'), ('tuxedo', 'Tuxedo'), ('none', 'None'), ('bengal', 'Bengal'), ('bicolor', 'Bicolor'), ('calico', 'Calico'), ('colorpoint', 'Colorpoint'), ('hairless', 'Hairless'), ('solid', 'Solid'), ('tabby', 'Tabby'), ('tortoiseshell', 'Tortoiseshell')], max_length=50, null=True),
        ),
        migrations.AlterField(
            model_name='animal',
            name='med_notes',
            field=models.TextField(blank=True, null=True, verbose_name='Medical Notes'),
        ),
    ]
