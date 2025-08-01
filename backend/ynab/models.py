from django.db import models

# Create your models here.

class CategoryGroup(models.Model):
    id = models.CharField(max_length=255, primary_key=True)
    name = models.CharField(max_length=255)
    hidden = models.BooleanField()
    deleted = models.BooleanField()

    def __str__(self):
        return self.name

class Category(models.Model):
    id = models.CharField(max_length=255, primary_key=True)
    category_group = models.ForeignKey(CategoryGroup, on_delete=models.CASCADE, related_name='categories')
    category_group_name = models.CharField(max_length=255)
    name = models.CharField(max_length=255)
    hidden = models.BooleanField()
    original_category_group_id = models.CharField(max_length=255, null=True, blank=True)
    note = models.TextField(null=True, blank=True)
    budgeted = models.IntegerField()
    activity = models.IntegerField()
    balance = models.IntegerField()
    goal_type = models.CharField(max_length=255, null=True, blank=True)
    goal_day = models.IntegerField(null=True, blank=True)
    goal_cadence = models.CharField(max_length=255, null=True, blank=True)
    goal_cadence_frequency = models.IntegerField(null=True, blank=True)
    goal_creation_month = models.CharField(max_length=255, null=True, blank=True)
    goal_target = models.IntegerField(null=True, blank=True)
    goal_target_month = models.CharField(max_length=255, null=True, blank=True)
    goal_percentage_complete = models.IntegerField(null=True, blank=True)
    goal_months_to_budget = models.IntegerField(null=True, blank=True)
    goal_under_funded = models.IntegerField(null=True, blank=True)
    goal_overall_funded = models.IntegerField(null=True, blank=True)
    goal_overall_left = models.IntegerField(null=True, blank=True)
    deleted = models.BooleanField()

    def __str__(self):
        return self.name

class Payee(models.Model):
    id = models.CharField(max_length=255, primary_key=True)
    name = models.CharField(max_length=255)
    transfer_account_id = models.CharField(max_length=255, null=True, blank=True)
    deleted = models.BooleanField()

    def __str__(self):
        return self.name

class YNABAccount(models.Model):
    id = models.CharField(max_length=255, primary_key=True)
    name = models.CharField(max_length=255)
    type = models.CharField(max_length=255)
    on_budget = models.BooleanField()
    closed = models.BooleanField()
    note = models.TextField(null=True, blank=True)
    balance = models.IntegerField()
    cleared_balance = models.IntegerField()
    uncleared_balance = models.IntegerField()
    transfer_payee_id = models.CharField(max_length=255)
    direct_import_linked = models.BooleanField(default=False)
    direct_import_in_error = models.BooleanField(default=False)
    last_reconciled_at = models.DateTimeField(null=True, blank=True)
    debt_original_balance = models.IntegerField(null=True, blank=True)
    debt_interest_rates = models.JSONField(default=dict, blank=True)
    debt_minimum_payments = models.JSONField(default=dict, blank=True)
    debt_escrow_amounts = models.JSONField(default=dict, blank=True)
    deleted = models.BooleanField()

    def __str__(self):
        return self.name

class YNABSync(models.Model):
    """
    Stores the server_knowledge value from YNAB to allow for incremental syncs.
    """
    server_knowledge = models.IntegerField(default=0)
    last_synced = models.DateTimeField(null=True, blank=True)

    def update_sync_timestamp(self):
        """Update the last_synced timestamp to now"""
        from django.utils import timezone
        self.last_synced = timezone.now()
        self.save(update_fields=['last_synced'])


class Transaction(models.Model):
    id = models.CharField(max_length=255, primary_key=True)
    date = models.DateField()
    amount = models.IntegerField()
    memo = models.TextField(null=True, blank=True)
    cleared = models.CharField(max_length=255)
    approved = models.BooleanField()
    flag_color = models.CharField(max_length=255, null=True, blank=True)
    account = models.ForeignKey(YNABAccount, on_delete=models.CASCADE)
    payee = models.ForeignKey(Payee, on_delete=models.SET_NULL, null=True, blank=True)
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True)
    transfer_account_id = models.CharField(max_length=255, null=True, blank=True)
    transfer_transaction_id = models.CharField(max_length=255, null=True, blank=True)
    import_id = models.CharField(max_length=255, null=True, blank=True)
    deleted = models.BooleanField()

    def __str__(self):
        return f'{self.date} - {self.amount}'


class Subtransaction(models.Model):
    id = models.CharField(max_length=255, primary_key=True)
    transaction = models.ForeignKey(Transaction, on_delete=models.CASCADE, related_name='subtransactions')
    amount = models.IntegerField()
    memo = models.TextField(null=True, blank=True)
    payee = models.ForeignKey(Payee, on_delete=models.SET_NULL, null=True, blank=True)
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True)
    transfer_account_id = models.CharField(max_length=255, null=True, blank=True)
    deleted = models.BooleanField()

    def __str__(self):
        return f'{self.id} - {self.amount}'


class YNABConfiguration(models.Model):
    """
    Stores the YNAB API Key and Budget ID for the addon.
    """
    api_key = models.CharField(max_length=255, null=True, blank=True)
    budget_id = models.CharField(max_length=255, null=True, blank=True)

    def __str__(self):
        return f"YNAB Configuration"

class CrossReference(models.Model):
    RECORD_TYPE_CHOICES = [
        ('accounts', 'Accounts'),
        ('categories', 'Categories'),
        ('payees', 'Payees'),
        ('budgets', 'Budgets'),
        ('months', 'Months'),
        ('transactions', 'Transactions'),
    ]

    record_type = models.CharField(max_length=20, choices=RECORD_TYPE_CHOICES)
    column = models.CharField(max_length=50)  # e.g., 'type', 'name', 'category_group_id'
    source_value = models.CharField(max_length=255)
    display_value = models.CharField(max_length=255)
    enabled = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['record_type', 'column', 'source_value']
        ordering = ['record_type', 'column', 'source_value']

    def __str__(self):
        return f"{self.record_type}.{self.column}: {self.source_value} → {self.display_value}"


class ColumnConfiguration(models.Model):
    RECORD_TYPE_CHOICES = [
        ('accounts', 'Accounts'),
        ('categories', 'Categories'),
        ('payees', 'Payees'),
        ('budgets', 'Budgets'),
        ('months', 'Months'),
        ('transactions', 'Transactions'),
    ]

    record_type = models.CharField(max_length=20, choices=RECORD_TYPE_CHOICES)
    field = models.CharField(max_length=50)  # e.g., 'type', 'name', 'on_budget'
    header_name = models.CharField(max_length=100)
    visible = models.BooleanField(default=True)
    order = models.IntegerField(default=0)
    width = models.IntegerField(null=True, blank=True)
    use_checkbox = models.BooleanField(null=True, blank=True)  # For boolean columns
    use_currency = models.BooleanField(null=True, blank=True)  # For currency columns
    invert_negative_sign = models.BooleanField(null=True, blank=True)  # For currency columns: invert negative sign
    disable_negative_sign = models.BooleanField(null=True, blank=True)  # For currency columns: disable negative sign
    use_thousands_separator = models.BooleanField(null=True, blank=True)  # For currency columns: thousands separator
    use_datetime = models.BooleanField(null=True, blank=True)  # For datetime columns
    datetime_format = models.CharField(max_length=50, null=True, blank=True)  # For datetime columns: custom format
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['record_type', 'field']
        ordering = ['record_type', 'order']

    def __str__(self):
        return f"{self.record_type}.{self.field}: {self.header_name}"


class AccountTypeMapping(models.Model):
    """
    Maps YNAB account types to core Finance Assistant record types.
    This allows the system to automatically determine what type of core record
    to create when linking a YNAB account.
    """
    YNAB_TYPE_CHOICES = [
        ('checking', 'Checking'),
        ('savings', 'Savings'),
        ('cash', 'Cash'),
        ('creditCard', 'Credit Card'),
        ('lineOfCredit', 'Line of Credit'),
        ('otherAsset', 'Other Asset'),
        ('otherLiability', 'Other Liability'),
        ('mortgage', 'Mortgage'),
        ('autoLoan', 'Auto Loan'),
        ('studentLoan', 'Student Loan'),
        ('personalLoan', 'Personal Loan'),
        ('medicalDebt', 'Medical Debt'),
        ('otherDebt', 'Other Debt'),
    ]

    CORE_RECORD_TYPE_CHOICES = [
        ('account', 'Account'),
        ('credit_card', 'Credit Card'),
        ('liability', 'Liability'),
        ('asset', 'Asset'),
    ]

    ynab_type = models.CharField(max_length=20, choices=YNAB_TYPE_CHOICES, unique=True)
    core_record_type = models.CharField(max_length=20, choices=CORE_RECORD_TYPE_CHOICES)
    default_subtype_id = models.CharField(max_length=255, null=True, blank=True, help_text="ID of the default sub-type (e.g., AccountType, LiabilityType, etc.)")
    enabled = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['ynab_type']

    def __str__(self):
        return f"{self.ynab_type} → {self.core_record_type}"
