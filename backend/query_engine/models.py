import uuid
from django.db import models
from django.utils import timezone
from datetime import timedelta


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