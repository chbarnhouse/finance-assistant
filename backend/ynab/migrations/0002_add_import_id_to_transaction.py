# Generated manually for Finance Assistant v0.14.60

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('ynab', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='transaction',
            name='import_id',
            field=models.CharField(blank=True, max_length=255, null=True),
        ),
    ]