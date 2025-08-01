# Generated manually for Finance Assistant v0.14.52

from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    initial = True

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='Query',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('name', models.CharField(max_length=200, unique=True)),
                ('description', models.TextField(blank=True, null=True)),
                ('query_type', models.CharField(choices=[('TRANSACTIONS', 'Transactions'), ('ACCOUNTS', 'Accounts'), ('CATEGORIES', 'Categories'), ('PAYEES', 'Payees'), ('CUSTOM', 'Custom SQL')], max_length=50)),
                ('parameters', models.JSONField(blank=True, default=dict)),
                ('sql_query', models.TextField(blank=True, null=True)),
                ('output_type', models.CharField(choices=[('SENSOR', 'Home Assistant Sensor'), ('CALENDAR', 'Home Assistant Calendar'), ('JSON', 'JSON Data'), ('CSV', 'CSV Export')], default='SENSOR', max_length=50)),
                ('ha_entity_id', models.CharField(blank=True, max_length=200, null=True)),
                ('ha_friendly_name', models.CharField(blank=True, max_length=200, null=True)),
                ('ha_unit_of_measurement', models.CharField(blank=True, max_length=50, null=True)),
                ('ha_device_class', models.CharField(blank=True, max_length=50, null=True)),
                ('is_active', models.BooleanField(default=True)),
                ('auto_refresh', models.BooleanField(default=False)),
                ('refresh_interval_minutes', models.IntegerField(default=60)),
                ('last_executed', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('created_by', models.CharField(blank=True, max_length=100, null=True)),
            ],
            options={
                'verbose_name_plural': 'Queries',
                'ordering': ['name'],
            },
        ),
        migrations.CreateModel(
            name='QueryResult',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('executed_at', models.DateTimeField(auto_now_add=True)),
                ('execution_time_ms', models.IntegerField(blank=True, null=True)),
                ('status', models.CharField(choices=[('SUCCESS', 'Success'), ('ERROR', 'Error'), ('TIMEOUT', 'Timeout')], default='SUCCESS', max_length=20)),
                ('result_count', models.IntegerField(default=0)),
                ('result_data', models.JSONField(blank=True, default=dict)),
                ('error_message', models.TextField(blank=True, null=True)),
                ('parameters_used', models.JSONField(blank=True, default=dict)),
                ('query', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='results', to='query_engine.query')),
            ],
            options={
                'ordering': ['-executed_at'],
                'indexes': [models.Index(fields=['query', '-executed_at'], name='query_engin_query_id_8b8c8c_idx'), models.Index(fields=['status', '-executed_at'], name='query_engin_status_8b8c8c_idx')],
            },
        ),
        migrations.CreateModel(
            name='QueryTemplate',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('name', models.CharField(max_length=200, unique=True)),
                ('description', models.TextField()),
                ('query_type', models.CharField(choices=[('TRANSACTIONS', 'Transactions'), ('ACCOUNTS', 'Accounts'), ('CATEGORIES', 'Categories'), ('PAYEES', 'Payees'), ('CUSTOM', 'Custom SQL')], max_length=50)),
                ('template_parameters', models.JSONField(blank=True, default=dict)),
                ('sql_template', models.TextField(blank=True, null=True)),
                ('category', models.CharField(choices=[('REPORTING', 'Reporting'), ('ANALYTICS', 'Analytics'), ('MONITORING', 'Monitoring'), ('EXPORT', 'Export'), ('CUSTOM', 'Custom')], default='REPORTING', max_length=100)),
                ('usage_count', models.IntegerField(default=0)),
                ('is_featured', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'ordering': ['category', 'name'],
            },
        ),
    ]