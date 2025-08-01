# Generated manually for Finance Assistant v0.14.52

from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('contenttypes', '0002_remove_content_type_name'),
        ('lookups', '0001_initial'),
        ('fa_budget', '0001_initial'),
        ('accounts', '0001_initial'),
    ]

    operations = [

        migrations.CreateModel(
            name='CreditCard',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('name', models.CharField(max_length=200)),
                ('last_4', models.CharField(blank=True, max_length=4, null=True)),
                ('notes', models.TextField(blank=True, null=True)),
                ('balance', models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ('allocation', models.CharField(choices=[('LI', 'Liquid'), ('FR', 'Frozen'), ('DF', 'Deep Freeze')], default='LI', max_length=2)),
                ('bank', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, to='lookups.bank')),
                ('credit_card_type', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, to='lookups.creditcardtype')),
                ('payment_methods', models.ManyToManyField(blank=True, to='lookups.paymentmethod')),
            ],
        ),
        migrations.CreateModel(
            name='Asset',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('name', models.CharField(max_length=200)),
                ('balance', models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ('value', models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ('notes', models.TextField(blank=True, null=True)),
                ('stock_symbol', models.CharField(blank=True, max_length=10, null=True)),
                ('shares', models.DecimalField(blank=True, decimal_places=4, max_digits=12, null=True)),
                ('allocation', models.CharField(choices=[('LI', 'Liquid'), ('FR', 'Frozen'), ('DF', 'Deep Freeze')], default='LI', max_length=2)),
                ('asset_type', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, to='lookups.assettype')),
                ('bank', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, to='lookups.bank')),
            ],
        ),
        migrations.CreateModel(
            name='Liability',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('name', models.CharField(max_length=200)),
                ('balance', models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ('notes', models.TextField(blank=True, null=True)),
                ('allocation', models.CharField(choices=[('LI', 'Liquid'), ('FR', 'Frozen'), ('DF', 'Deep Freeze')], default='LI', max_length=2)),
                ('bank', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, to='lookups.bank')),
                ('liability_type', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, to='lookups.liabilitytype')),
            ],
        ),
        migrations.CreateModel(
            name='Transaction',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('date', models.DateField()),
                ('amount', models.DecimalField(decimal_places=2, max_digits=12)),
                ('memo', models.TextField(blank=True)),
                ('account', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='api_transactions', to='accounts.account')),
                ('category', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='api_transactions', to='fa_budget.budgetcategory')),
                ('credit_card', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, to='api.creditcard')),
                ('payee', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='api_transactions', to='fa_budget.budgetpayee')),
            ],
        ),
        migrations.CreateModel(
            name='YnabAccount',
            fields=[
                ('id', models.UUIDField(editable=False, primary_key=True, serialize=False)),
                ('name', models.CharField(max_length=200)),
                ('type', models.CharField(max_length=100)),
                ('on_budget', models.BooleanField()),
                ('closed', models.BooleanField()),
                ('balance', models.IntegerField()),
                ('cleared_balance', models.IntegerField()),
                ('uncleared_balance', models.IntegerField()),
                ('last_reconciled_at', models.DateTimeField(blank=True, null=True)),
                ('raw_data', models.JSONField()),
            ],
        ),
        migrations.CreateModel(
            name='YnabCategory',
            fields=[
                ('id', models.UUIDField(editable=False, primary_key=True, serialize=False)),
                ('name', models.CharField(max_length=200)),
                ('raw_data', models.JSONField()),
            ],
        ),
        migrations.CreateModel(
            name='YnabPayee',
            fields=[
                ('id', models.UUIDField(editable=False, primary_key=True, serialize=False)),
                ('name', models.CharField(max_length=200)),
                ('raw_data', models.JSONField()),
            ],
        ),
        migrations.CreateModel(
            name='YnabTransaction',
            fields=[
                ('id', models.CharField(editable=False, max_length=36, primary_key=True, serialize=False)),
                ('date', models.DateField()),
                ('amount', models.IntegerField()),
                ('memo', models.TextField(blank=True, null=True)),
                ('cleared', models.CharField(max_length=50)),
                ('approved', models.BooleanField()),
                ('raw_data', models.JSONField()),
            ],
        ),
        migrations.CreateModel(
            name='Link',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('core_object_id', models.UUIDField()),
                ('plugin_object_id', models.CharField(max_length=36)),
                ('core_content_type', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='core_link', to='contenttypes.contenttype')),
                ('plugin_content_type', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='plugin_link', to='contenttypes.contenttype')),
            ],
            options={
                'unique_together': {('core_content_type', 'core_object_id', 'plugin_content_type', 'plugin_object_id')},
            },
        ),
        migrations.CreateModel(
            name='YnabPluginSettings',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('enabled', models.BooleanField(default=False)),
                ('api_key', models.CharField(blank=True, max_length=200)),
                ('budget_id', models.CharField(blank=True, max_length=200)),
            ],
        ),
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
                ('query', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='results', to='api.query')),
            ],
            options={
                'ordering': ['-executed_at'],
                'indexes': [models.Index(fields=['-executed_at'], name='api_queryre_execute_8b8c8c_idx')],
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