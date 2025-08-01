# Generated manually for Finance Assistant v0.14.52

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='CategoryGroup',
            fields=[
                ('id', models.CharField(max_length=255, primary_key=True, serialize=False)),
                ('name', models.CharField(max_length=255)),
                ('hidden', models.BooleanField()),
                ('deleted', models.BooleanField()),
            ],
        ),
        migrations.CreateModel(
            name='Category',
            fields=[
                ('id', models.CharField(max_length=255, primary_key=True, serialize=False)),
                ('category_group_name', models.CharField(max_length=255)),
                ('name', models.CharField(max_length=255)),
                ('hidden', models.BooleanField()),
                ('original_category_group_id', models.CharField(blank=True, max_length=255, null=True)),
                ('note', models.TextField(blank=True, null=True)),
                ('budgeted', models.IntegerField()),
                ('activity', models.IntegerField()),
                ('balance', models.IntegerField()),
                ('goal_type', models.CharField(blank=True, max_length=255, null=True)),
                ('goal_day', models.IntegerField(blank=True, null=True)),
                ('goal_cadence', models.CharField(blank=True, max_length=255, null=True)),
                ('goal_cadence_frequency', models.IntegerField(blank=True, null=True)),
                ('goal_creation_month', models.CharField(blank=True, max_length=255, null=True)),
                ('goal_target', models.IntegerField(blank=True, null=True)),
                ('goal_target_month', models.CharField(blank=True, max_length=255, null=True)),
                ('goal_percentage_complete', models.IntegerField(blank=True, null=True)),
                ('goal_months_to_budget', models.IntegerField(blank=True, null=True)),
                ('goal_under_funded', models.IntegerField(blank=True, null=True)),
                ('goal_overall_funded', models.IntegerField(blank=True, null=True)),
                ('goal_overall_left', models.IntegerField(blank=True, null=True)),
                ('deleted', models.BooleanField()),
                ('category_group', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='categories', to='ynab.categorygroup')),
            ],
        ),
        migrations.CreateModel(
            name='Payee',
            fields=[
                ('id', models.CharField(max_length=255, primary_key=True, serialize=False)),
                ('name', models.CharField(max_length=255)),
                ('transfer_account_id', models.CharField(blank=True, max_length=255, null=True)),
                ('deleted', models.BooleanField()),
            ],
        ),
        migrations.CreateModel(
            name='YNABAccount',
            fields=[
                ('id', models.CharField(max_length=255, primary_key=True, serialize=False)),
                ('name', models.CharField(max_length=255)),
                ('type', models.CharField(max_length=255)),
                ('on_budget', models.BooleanField()),
                ('closed', models.BooleanField()),
                ('note', models.TextField(blank=True, null=True)),
                ('balance', models.IntegerField()),
                ('cleared_balance', models.IntegerField()),
                ('uncleared_balance', models.IntegerField()),
                ('transfer_payee_id', models.CharField(max_length=255)),
                ('direct_import_linked', models.BooleanField(default=False)),
                ('direct_import_in_error', models.BooleanField(default=False)),
                ('last_reconciled_at', models.DateTimeField(blank=True, null=True)),
                ('debt_original_balance', models.IntegerField(blank=True, null=True)),
                ('debt_interest_rates', models.JSONField(blank=True, default=dict)),
                ('debt_minimum_payments', models.JSONField(blank=True, default=dict)),
                ('debt_escrow_amounts', models.JSONField(blank=True, default=dict)),
                ('deleted', models.BooleanField()),
            ],
        ),
        migrations.CreateModel(
            name='YNABSync',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('server_knowledge', models.IntegerField(default=0)),
                ('last_synced', models.DateTimeField(blank=True, null=True)),
            ],
        ),
        migrations.CreateModel(
            name='Transaction',
            fields=[
                ('id', models.CharField(max_length=255, primary_key=True, serialize=False)),
                ('date', models.DateField()),
                ('amount', models.IntegerField()),
                ('memo', models.TextField(blank=True, null=True)),
                ('cleared', models.CharField(max_length=255)),
                ('approved', models.BooleanField()),
                ('flag_color', models.CharField(blank=True, max_length=255, null=True)),
                ('transfer_account_id', models.CharField(blank=True, max_length=255, null=True)),
                ('transfer_transaction_id', models.CharField(blank=True, max_length=255, null=True)),
                ('import_id', models.CharField(blank=True, max_length=255, null=True)),
                ('deleted', models.BooleanField()),
                ('account', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='ynab.ynabaccount')),
                ('category', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='ynab.category')),
                ('payee', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='ynab.payee')),
            ],
        ),
        migrations.CreateModel(
            name='Subtransaction',
            fields=[
                ('id', models.CharField(max_length=255, primary_key=True, serialize=False)),
                ('amount', models.IntegerField()),
                ('memo', models.TextField(blank=True, null=True)),
                ('transfer_account_id', models.CharField(blank=True, max_length=255, null=True)),
                ('deleted', models.BooleanField()),
                ('category', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='ynab.category')),
                ('payee', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='ynab.payee')),
                ('transaction', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='subtransactions', to='ynab.transaction')),
            ],
        ),
        migrations.CreateModel(
            name='YNABConfiguration',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('api_key', models.CharField(blank=True, max_length=255, null=True)),
                ('budget_id', models.CharField(blank=True, max_length=255, null=True)),
            ],
        ),
        migrations.CreateModel(
            name='CrossReference',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('record_type', models.CharField(choices=[('accounts', 'Accounts'), ('categories', 'Categories'), ('payees', 'Payees'), ('budgets', 'Budgets'), ('months', 'Months'), ('transactions', 'Transactions')], max_length=20)),
                ('column', models.CharField(max_length=50)),
                ('source_value', models.CharField(max_length=255)),
                ('display_value', models.CharField(max_length=255)),
                ('enabled', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'unique_together': {('record_type', 'column', 'source_value')},
                'ordering': ['record_type', 'column', 'source_value'],
            },
        ),
        migrations.CreateModel(
            name='ColumnConfiguration',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('record_type', models.CharField(choices=[('accounts', 'Accounts'), ('categories', 'Categories'), ('payees', 'Payees'), ('budgets', 'Budgets'), ('months', 'Months'), ('transactions', 'Transactions')], max_length=20)),
                ('field', models.CharField(max_length=50)),
                ('header_name', models.CharField(max_length=100)),
                ('visible', models.BooleanField(default=True)),
                ('order', models.IntegerField(default=0)),
                ('width', models.IntegerField(blank=True, null=True)),
                ('use_checkbox', models.BooleanField(blank=True, null=True)),
                ('use_currency', models.BooleanField(blank=True, null=True)),
                ('invert_negative_sign', models.BooleanField(blank=True, null=True)),
                ('disable_negative_sign', models.BooleanField(blank=True, null=True)),
                ('use_thousands_separator', models.BooleanField(blank=True, null=True)),
                ('use_datetime', models.BooleanField(blank=True, null=True)),
                ('datetime_format', models.CharField(blank=True, max_length=50, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'unique_together': {('record_type', 'field')},
                'ordering': ['record_type', 'order'],
            },
        ),
        migrations.CreateModel(
            name='AccountTypeMapping',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('ynab_type', models.CharField(choices=[('checking', 'Checking'), ('savings', 'Savings'), ('cash', 'Cash'), ('creditCard', 'Credit Card'), ('lineOfCredit', 'Line of Credit'), ('otherAsset', 'Other Asset'), ('otherLiability', 'Other Liability'), ('mortgage', 'Mortgage'), ('autoLoan', 'Auto Loan'), ('studentLoan', 'Student Loan'), ('personalLoan', 'Personal Loan'), ('medicalDebt', 'Medical Debt'), ('otherDebt', 'Other Debt')], max_length=20, unique=True)),
                ('core_record_type', models.CharField(choices=[('account', 'Account'), ('credit_card', 'Credit Card'), ('liability', 'Liability'), ('asset', 'Asset')], max_length=20)),
                ('default_subtype_id', models.CharField(blank=True, help_text='ID of the default sub-type (e.g., AccountType, LiabilityType, etc.)', max_length=255, null=True)),
                ('enabled', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'ordering': ['ynab_type'],
            },
        ),
    ]