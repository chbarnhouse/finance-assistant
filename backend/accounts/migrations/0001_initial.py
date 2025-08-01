# Generated manually for Finance Assistant v0.14.52

from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('lookups', '0001_initial'),
        ('ynab', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='Account',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('name', models.CharField(max_length=255)),
                ('last_4', models.CharField(blank=True, max_length=4, null=True)),
                ('notes', models.TextField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('allocation', models.CharField(choices=[('LI', 'Liquid'), ('FR', 'Frozen'), ('DF', 'Deep Freeze')], default='LI', max_length=2)),
                ('balance', models.DecimalField(decimal_places=2, default=0, help_text='Current balance in dollars', max_digits=12)),
                ('cleared_balance', models.DecimalField(decimal_places=2, default=0, help_text='Cleared balance in dollars', max_digits=12)),
                ('uncleared_balance', models.DecimalField(decimal_places=2, default=0, help_text='Uncleared balance in dollars', max_digits=12)),
                ('on_budget', models.BooleanField(default=False, help_text='Whether this account is on budget')),
                ('closed', models.BooleanField(default=False, help_text='Whether this account is closed')),
                ('last_reconciled_at', models.DateTimeField(blank=True, help_text='Last time this account was reconciled', null=True)),
                ('debt_original_balance', models.DecimalField(blank=True, decimal_places=2, help_text='Original debt balance', max_digits=12, null=True)),
                ('debt_interest_rates', models.JSONField(blank=True, default=dict, help_text='Interest rates for debt accounts')),
                ('debt_minimum_payments', models.JSONField(blank=True, default=dict, help_text='Minimum payments for debt accounts')),
                ('debt_escrow_amounts', models.JSONField(blank=True, default=dict, help_text='Escrow amounts for debt accounts')),
                ('last_ynab_sync', models.DateTimeField(blank=True, help_text='Last time data was synced from YNAB', null=True)),
                ('account_type', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='accounts', to='lookups.accounttype')),
                ('bank', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name='accounts', to='lookups.bank')),
                ('ynab_account', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='ynab.ynabaccount', unique=True)),
            ],
            options={
                'verbose_name': 'Account',
                'verbose_name_plural': 'Accounts',
                'ordering': ['name'],
            },
        ),
    ]