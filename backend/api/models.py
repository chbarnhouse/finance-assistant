from django.db import models
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.db.models.signals import pre_delete
from django.dispatch import receiver
import uuid

# === Core Finance Assistant Models ===
# Note: Account, Bank, Category, Payee models are now in their respective apps
# and should be imported from there instead of defined here

class CreditCard(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    bank = models.ForeignKey('lookups.Bank', on_delete=models.CASCADE, null=True, blank=True)
    credit_card_type = models.ForeignKey('lookups.CreditCardType', on_delete=models.PROTECT, null=True, blank=True)
    last_4 = models.CharField(max_length=4, blank=True, null=True)  # Add last_4 field
    notes = models.TextField(blank=True, null=True)  # Add notes field
    balance = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    class Allocation(models.TextChoices):
        LIQUID = 'LI', 'Liquid'
        FROZEN = 'FR', 'Frozen'
        DEEP_FREEZE = 'DF', 'Deep Freeze'

    allocation = models.CharField(
        max_length=2,
        choices=Allocation.choices,
        default=Allocation.LIQUID,
    )

    payment_methods = models.ManyToManyField('lookups.PaymentMethod', blank=True)

    def __str__(self):
        return self.name

class Asset(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    asset_type = models.ForeignKey('lookups.AssetType', on_delete=models.PROTECT)
    bank = models.ForeignKey('lookups.Bank', on_delete=models.CASCADE, null=True, blank=True)
    balance = models.DecimalField(max_digits=12, decimal_places=2, default=0)  # Keep balance for now
    value = models.DecimalField(max_digits=12, decimal_places=2, default=0)  # Add value field
    notes = models.TextField(blank=True, null=True)  # Add notes field

    # For stocks
    stock_symbol = models.CharField(max_length=10, blank=True, null=True)
    shares = models.DecimalField(max_digits=12, decimal_places=4, blank=True, null=True)

    class Allocation(models.TextChoices):
        LIQUID = 'LI', 'Liquid'
        FROZEN = 'FR', 'Frozen'
        DEEP_FREEZE = 'DF', 'Deep Freeze'

    allocation = models.CharField(
        max_length=2,
        choices=Allocation.choices,
        default=Allocation.LIQUID,
    )

    def __str__(self):
        return self.name

class Liability(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    liability_type = models.ForeignKey('lookups.LiabilityType', on_delete=models.PROTECT)
    bank = models.ForeignKey('lookups.Bank', on_delete=models.CASCADE, null=True, blank=True)
    balance = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    notes = models.TextField(blank=True, null=True)  # Add notes field

    class Allocation(models.TextChoices):
        LIQUID = 'LI', 'Liquid'
        FROZEN = 'FR', 'Frozen'
        DEEP_FREEZE = 'DF', 'Deep Freeze'

    allocation = models.CharField(
        max_length=2,
        choices=Allocation.choices,
        default=Allocation.LIQUID,
    )

    def __str__(self):
        return self.name

class Transaction(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    date = models.DateField()
    payee = models.ForeignKey('fa_budget.BudgetPayee', on_delete=models.SET_NULL, null=True, blank=True, related_name='api_transactions')
    category = models.ForeignKey('fa_budget.BudgetCategory', on_delete=models.SET_NULL, null=True, blank=True, related_name='api_transactions')
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    memo = models.TextField(blank=True)
    account = models.ForeignKey('accounts.Account', on_delete=models.CASCADE, null=True, blank=True, related_name='api_transactions')
    credit_card = models.ForeignKey(CreditCard, on_delete=models.CASCADE, null=True, blank=True)

    def __str__(self):
        return f"{self.date} - {self.payee} - {self.amount}"

# === YNAB Plugin Models ===

class YnabAccount(models.Model):
    id = models.UUIDField(primary_key=True, editable=False) # From YNAB
    name = models.CharField(max_length=200)
    type = models.CharField(max_length=100)
    on_budget = models.BooleanField()
    closed = models.BooleanField()
    balance = models.IntegerField()
    cleared_balance = models.IntegerField()
    uncleared_balance = models.IntegerField()
    last_reconciled_at = models.DateTimeField(null=True, blank=True)
    raw_data = models.JSONField()

    def __str__(self):
        return self.name

class YnabCategory(models.Model):
    id = models.UUIDField(primary_key=True, editable=False) # From YNAB
    name = models.CharField(max_length=200)
    raw_data = models.JSONField()

    def __str__(self):
        return self.name

class YnabPayee(models.Model):
    id = models.UUIDField(primary_key=True, editable=False) # From YNAB
    name = models.CharField(max_length=200)
    raw_data = models.JSONField()

    def __str__(self):
        return self.name

class YnabTransaction(models.Model):
    id = models.CharField(max_length=36, primary_key=True, editable=False) # From YNAB
    date = models.DateField()
    amount = models.IntegerField()
    memo = models.TextField(blank=True, null=True)
    cleared = models.CharField(max_length=50)
    approved = models.BooleanField()
    raw_data = models.JSONField()

    def __str__(self):
        return f"{self.date} - {self.id}"


# === Linking Model ===

class Link(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Core Finance Assistant record
    core_content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE, related_name='core_link')
    core_object_id = models.UUIDField()
    core_object = GenericForeignKey('core_content_type', 'core_object_id')

    # Plugin record
    plugin_content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE, related_name='plugin_link')
    plugin_object_id = models.CharField(max_length=36) # YNAB IDs can be strings or UUIDs
    plugin_object = GenericForeignKey('plugin_content_type', 'plugin_object_id')

    class Meta:
        unique_together = [
            ('core_content_type', 'core_object_id'),
            ('plugin_content_type', 'plugin_object_id'),
        ]

    def __str__(self):
        return f"Link {self.core_object} to {self.plugin_object}"


# Signal to clean up Link records when core objects are deleted
@receiver(pre_delete, sender=CreditCard)
@receiver(pre_delete, sender=Asset)
@receiver(pre_delete, sender=Liability)
def cleanup_links_on_core_object_delete(sender, instance, **kwargs):
    """Delete Link records when core objects are deleted"""
    from django.contrib.contenttypes.models import ContentType

    content_type = ContentType.objects.get_for_model(instance)
    links_to_delete = Link.objects.filter(
        core_content_type=content_type,
        core_object_id=instance.id
    )

    links_to_delete.delete()

# Also clean up links when accounts.Account is deleted
@receiver(pre_delete, sender='accounts.Account')
def cleanup_links_on_accounts_account_delete(sender, instance, **kwargs):
    """Delete Link records when accounts.Account objects are deleted"""
    from django.contrib.contenttypes.models import ContentType

    content_type = ContentType.objects.get_for_model(instance)
    links_to_delete = Link.objects.filter(
        core_content_type=content_type,
        core_object_id=instance.id
    )

    links_to_delete.delete()

# === Plugin Settings ===

class YnabPluginSettings(models.Model):
    enabled = models.BooleanField(default=False)
    api_key = models.CharField(max_length=200, blank=True)
    budget_id = models.CharField(max_length=200, blank=True)

    def __str__(self):
        return "YNAB Plugin Settings"

    def save(self, *args, **kwargs):
        self.pk = 1
        super(YnabPluginSettings, self).save(*args, **kwargs)

    @classmethod
    def load(cls):
        obj, created = cls.objects.get_or_create(pk=1)
        return obj

# === Query Engine ===

class Query(models.Model):
    """Custom query for creating datasets that can be exposed to Home Assistant"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200, unique=True)
    description = models.TextField(blank=True, null=True)

    # Query definition
    query_type = models.CharField(max_length=50, choices=[
        ('TRANSACTIONS', 'Transactions'),
        ('ACCOUNTS', 'Accounts'),
        ('CATEGORIES', 'Categories'),
        ('PAYEES', 'Payees'),
        ('CUSTOM', 'Custom SQL'),
    ])

    # Query parameters (JSON field for flexible configuration)
    parameters = models.JSONField(default=dict, blank=True)

    # For custom SQL queries
    sql_query = models.TextField(blank=True, null=True)

    # Output configuration
    output_type = models.CharField(max_length=50, choices=[
        ('SENSOR', 'Home Assistant Sensor'),
        ('CALENDAR', 'Home Assistant Calendar'),
        ('JSON', 'JSON Data'),
        ('CSV', 'CSV Export'),
    ], default='SENSOR')

    # Home Assistant integration settings
    ha_entity_id = models.CharField(max_length=200, blank=True, null=True)
    ha_friendly_name = models.CharField(max_length=200, blank=True, null=True)
    ha_unit_of_measurement = models.CharField(max_length=50, blank=True, null=True)
    ha_device_class = models.CharField(max_length=50, blank=True, null=True)

    # Scheduling
    is_active = models.BooleanField(default=True)
    auto_refresh = models.BooleanField(default=False)
    refresh_interval_minutes = models.IntegerField(default=60)
    last_executed = models.DateTimeField(null=True, blank=True)

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.CharField(max_length=100, blank=True, null=True)

    class Meta:
        ordering = ['name']
        verbose_name_plural = "Queries"

    def __str__(self):
        return self.name

    def execute(self):
        """Execute the query and return results"""
        from .query_executor import QueryExecutor
        executor = QueryExecutor()
        return executor.execute_query(self)

    def get_ha_entity_id(self):
        """Generate Home Assistant entity ID if not set"""
        if not self.ha_entity_id:
            return f"sensor.finance_assistant_{self.name.lower().replace(' ', '_')}"
        return self.ha_entity_id

class QueryResult(models.Model):
    """Store results of query executions for caching and history"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    query = models.ForeignKey(Query, on_delete=models.CASCADE, related_name='results')

    # Execution details
    executed_at = models.DateTimeField(auto_now_add=True)
    execution_time_ms = models.IntegerField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=[
        ('SUCCESS', 'Success'),
        ('ERROR', 'Error'),
        ('TIMEOUT', 'Timeout'),
    ], default='SUCCESS')

    # Results
    result_count = models.IntegerField(default=0)
    result_data = models.JSONField(default=dict, blank=True)
    error_message = models.TextField(blank=True, null=True)

    # Metadata
    parameters_used = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ['-executed_at']
        indexes = [
            models.Index(fields=['query', '-executed_at']),
            models.Index(fields=['status', '-executed_at']),
        ]

    def __str__(self):
        return f"{self.query.name} - {self.executed_at} ({self.status})"

class QueryTemplate(models.Model):
    """Predefined query templates for common use cases"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200, unique=True)
    description = models.TextField()

    # Template definition
    query_type = models.CharField(max_length=50, choices=[
        ('TRANSACTIONS', 'Transactions'),
        ('ACCOUNTS', 'Accounts'),
        ('CATEGORIES', 'Categories'),
        ('PAYEES', 'Payees'),
        ('CUSTOM', 'Custom SQL'),
    ])

    # Template parameters
    template_parameters = models.JSONField(default=dict, blank=True)
    sql_template = models.TextField(blank=True, null=True)

    # Category for organization
    category = models.CharField(max_length=100, choices=[
        ('REPORTING', 'Reporting'),
        ('ANALYTICS', 'Analytics'),
        ('MONITORING', 'Monitoring'),
        ('EXPORT', 'Export'),
        ('CUSTOM', 'Custom'),
    ], default='REPORTING')

    # Usage tracking
    usage_count = models.IntegerField(default=0)
    is_featured = models.BooleanField(default=False)

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['category', 'name']

    def __str__(self):
        return f"{self.name} ({self.category})"

    def create_query_from_template(self, name, parameters=None):
        """Create a new Query instance from this template"""
        query = Query.objects.create(
            name=name,
            description=self.description,
            query_type=self.query_type,
            parameters=parameters or self.template_parameters,
            sql_query=self.sql_template,
            output_type='SENSOR'
        )
        self.usage_count += 1
        self.save()
        return query
