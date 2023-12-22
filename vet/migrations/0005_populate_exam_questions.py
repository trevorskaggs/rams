# Generated by Django 3.2.14 on 2023-07-04 14:53

from django.db import migrations, models

data_dict = [
    {'name':'Attitude', 'options':['BAR', 'QAR', 'Dull', 'Obtunded', 'Comatose'], 'categories':['cat', 'dog', 'avian', 'small mammal', 'reptile/amphibian', 'camelid', 'ruminant', 'equine', 'swine'], 'allow_not_examined':False, 'open_notes':False},
    {'name':'Hydration Status', 'options':['Adequate', 'Mild dehydration', 'Moderate dehydration', 'Severe dehydration'], 'categories':['cat', 'dog', 'avian', 'small mammal', 'reptile/amphibian', 'camelid', 'ruminant', 'equine', 'swine'], 'allow_not_examined':True, 'open_notes':False},
    {'name':'MM Color', 'options':['Pink', 'Pale', 'Injected', 'Cyanotic', 'Icteric'], 'categories':['cat', 'dog', 'avian', 'small mammal', 'reptile/amphibian', 'camelid', 'ruminant', 'equine', 'swine'], 'allow_not_examined':True, 'open_notes':False},
    {'name':'MM Texture', 'options':['Moist', 'Tacky'], 'categories':['cat', 'dog', 'avian', 'small mammal', 'camelid', 'ruminant', 'equine', 'swine'], 'allow_not_examined':True, 'open_notes':False},
    {'name':'FAMACHA Score', 'options':['1', '2', '3', '4', '5', 'Other'], 'categories':['camelid', 'ruminant'], 'allow_not_examined':True, 'open_notes':True},
    {'name':'CRT', 'options':['< 2 sec', '> 3-4 sec'], 'categories':['cat', 'dog', 'avian', 'small mammal', 'camelid', 'ruminant', 'equine', 'swine'], 'allow_not_examined':True, 'open_notes':False},
    {'name':'Ears', 'options':['NSF', 'Discharge', 'Wounds', 'Burns', 'Other'], 'categories':['cat', 'dog', 'avian', 'small mammal', 'reptile/amphibian', 'camelid', 'ruminant', 'equine', 'swine'], 'allow_not_examined':True, 'open_notes':True},
    {'name':'Eyes', 'options':['NSF', 'Discharge', 'Blepharospasm', 'Nuclear sclerosis', 'Ulcer', 'Other'], 'categories':['cat', 'dog', 'avian', 'small mammal', 'reptile/amphibian', 'camelid', 'ruminant', 'equine', 'swine'], 'allow_not_examined':True, 'open_notes':True},
    {'name':'Nose', 'options':['NSF', 'Discharge', 'Epistaxis', 'Wounds', 'Burns', 'Other'], 'categories':['cat', 'dog', 'avian', 'small mammal', 'reptile/amphibian', 'camelid', 'ruminant', 'equine', 'swine'], 'allow_not_examined':True, 'open_notes':True},
    {'name':'Oral Cavity', 'options':['NSF', 'Dental disease', 'Wounds', 'Foreign material', 'Lesions', 'Other'], 'categories':['cat', 'dog', 'avian', 'small mammal', 'reptile/amphibian', 'swine'], 'allow_not_examined':True, 'open_notes':True},
    {'name':'Submandibular LN', 'options':['NSF', 'Abnormal'], 'categories':['camelid', 'ruminant', 'equine', 'swine'], 'allow_not_examined':True, 'open_notes':True},
    {'name':'Lymph Nodes', 'options':['NSF', 'Abnormal'], 'categories':['cat', 'dog'], 'allow_not_examined':True, 'open_notes':True},
    {'name':'Heart', 'options':['NSF', 'Tachycardia', 'Bradycardia', 'Arrythmia', 'Murmur', 'Other'], 'categories':['cat', 'dog', 'avian', 'small mammal', 'reptile/amphibian', 'camelid', 'ruminant', 'equine', 'swine'], 'allow_not_examined':True, 'open_notes':True},
    {'name':'Pulse Quality', 'options':['Normal', 'Weak', 'Bounding'], 'categories':['cat', 'dog'], 'allow_not_examined':True, 'open_notes':False},
    {'name':'Respiratory Effort', 'options':['Normal', 'Abnormal'], 'categories':['cat', 'dog', 'avian', 'small mammal', 'reptile/amphibian', 'camelid', 'ruminant', 'equine', 'swine'], 'allow_not_examined':True, 'open_notes':True},
    {'name':'Lungs', 'options':['NSF', 'Crackles', 'Decreased lung sounds', 'Dyspnea', 'Other'], 'categories':['cat', 'dog', 'small mammal', 'reptile/amphibian', 'camelid', 'ruminant', 'equine', 'swine'], 'allow_not_examined':True, 'open_notes':True},
    {'name':'Nostril Flare', 'options':['Normal', 'Mild', 'Moderate', 'Severe'], 'categories':['camelid', 'ruminant', 'equine'], 'allow_not_examined':True, 'open_notes':False},
    {'name':'Airsacs', 'options':['NSF', 'Crackles', 'Other'], 'categories':['avian'], 'allow_not_examined':True, 'open_notes':False},
    {'name':'GI Motility', 'options':['Normal', 'Quiet but present', 'Absent', 'Hypermotile'], 'categories':['camelid', 'ruminant', 'equine'], 'allow_not_examined':True, 'open_notes':False},
    {'name':'Abdomen', 'options':['NSF', 'Abnormal', 'Tense', 'Painful', 'Mass', 'Other'], 'categories':['cat', 'dog', 'small mammal', 'reptile/amphibian', 'camelid', 'ruminant', 'equine', 'swine'], 'allow_not_examined':True, 'open_notes':True},
    {'name':'GI/Vent/Cloaca', 'options':['NSF', 'Abnormal'], 'categories':['avian', 'reptile/amphibian'], 'allow_not_examined':True, 'open_notes':True},
    {'name':'Musculoskeletal', 'options':['NSF', 'Cachexia', 'Lameness', 'Other'], 'categories':['cat', 'dog', 'avian', 'small mammal', 'reptile/amphibian', 'camelid', 'ruminant', 'equine', 'swine'], 'allow_not_examined':True, 'open_notes':True},
    {'name':'Digital Pulses', 'options':['NSF', 'Abnormal'], 'categories':['equine'], 'allow_not_examined':True, 'open_notes':True},
    {'name':'Lameness', 'options':['Absent', 'Present'], 'categories':['camelid', 'ruminant', 'equine', 'swine'], 'allow_not_examined':True, 'open_notes':True},
    {'name':'Wings', 'options':['NSF', 'Wounds/trauma', 'Burns', 'Missing feathers', 'Contamination', 'Other'], 'categories':['avian'], 'allow_not_examined':True, 'open_notes':True},
    {'name':'Skin/Fur', 'options':['NSF', 'Ectoparasites', 'Alopecia', 'Wounds', 'Burns', 'Contamination', 'Other'], 'categories':['cat', 'dog', 'small mammal', 'reptile/amphibian', 'camelid', 'ruminant', 'equine', 'swine'], 'allow_not_examined':True, 'open_notes':True},
    {'name':'Feathers', 'options':['NSF', 'Abnormal', 'Other'], 'categories':['avian'], 'allow_not_examined':True, 'open_notes':True},
    {'name':'Feet/Hooves', 'options':['NSF', 'Abnormal'], 'categories':['avian', 'camelid', 'ruminant', 'equine', 'swine'], 'allow_not_examined':True, 'open_notes':True},
    {'name':'Urogenital', 'options':['NSF', 'Abnormal'], 'categories':['cat', 'dog', 'small mammal', 'reptile/amphibian', 'camelid', 'ruminant', 'equine', 'swine'], 'allow_not_examined':True, 'open_notes':True},
    {'name':'Reproductive', 'options':['NSF', 'Pregnant', 'Nursing', 'Lactating', 'Dystocia'], 'categories':['camelid', 'ruminant', 'equine', 'swine'], 'allow_not_examined':True, 'open_notes':True},
    {'name':'Neurologic', 'options':['NSF', 'Abnormal mentation', 'Peripheral neuropathy', 'Other'], 'categories':['cat', 'dog', 'avian', 'small mammal', 'reptile/amphibian', 'camelid', 'ruminant', 'equine', 'swine'], 'allow_not_examined':True, 'open_notes':True},
    {'name':'Rectum', 'options':['NSF', 'Abnormal'], 'categories':['cat', 'dog', 'small mammal', 'camelid', 'ruminant', 'equine', 'swine'], 'allow_not_examined':True, 'open_notes':True},
    {'name':'BCS', 'options':['1', '2', '3', '4', '5', '6', '7', '8', '9'], 'categories':['camelid', 'ruminant', 'equine', 'swine'], 'allow_not_examined':False, 'open_notes':False},
    {'name':'BCS', 'options':['1', '2', '3', '4', '5'], 'categories':['cat', 'dog', 'small mammal'], 'allow_not_examined':False, 'open_notes':False},
    {'name':'Pain Score', 'options':['0', '1', '2', '3', '4', 'Other'], 'categories':['cat', 'dog', 'avian', 'small mammal', 'reptile/amphibian', 'camelid', 'ruminant', 'equine', 'swine'], 'allow_not_examined':True, 'open_notes':True},
]

def exam_questions(apps, schema_editor):
    db_alias = schema_editor.connection.alias
    ExamQuestion = apps.get_model("vet", "ExamQuestion")
    for question in data_dict:
        q, _ = ExamQuestion.objects.using(db_alias).get_or_create(**question)
        q.save()

class Migration(migrations.Migration):

    dependencies = [
        ('vet', '0004_exam_examanswer_examquestion'),
    ]

    operations = [
        migrations.RunPython(exam_questions, migrations.RunPython.noop)
    ]
