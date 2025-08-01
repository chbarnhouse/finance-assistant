from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from decimal import Decimal
import uuid

class RewardsCategory(models.Model):
    """Categories for organizing reward rules and transactions"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True)
    parent = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='children')
    description = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "Rewards Categories"
        ordering = ['name']

    def __str__(self):
        return self.name

class RewardsPayee(models.Model):
    """Payees for organizing reward rules and transactions"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True)
    parent = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='children')
    default_category = models.ForeignKey(RewardsCategory, on_delete=models.SET_NULL, null=True, blank=True)
    description = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "Rewards Payees"
        ordering = ['name']

    def __str__(self):
        return self.name

class PaymentMethod(models.Model):
    """Payment methods for credit cards"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name

class PointsProgram(models.Model):
    """Points programs (e.g., Chase Ultimate Rewards, Amex Membership Rewards)"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, null=True)
    base_points_per_dollar = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal('1.00'),
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name

class RewardRule(models.Model):
    """Base model for all reward rules"""
    RULE_TYPES = [
        ('STATIC', 'Static'),
        ('ROTATING', 'Rotating'),
        ('DYNAMIC', 'Dynamic'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True, null=True)
    rule_type = models.CharField(max_length=10, choices=RULE_TYPES)
    is_active = models.BooleanField(default=True)
    priority = models.IntegerField(default=0, help_text="Higher priority rules are evaluated first")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-priority', 'name']

    def __str__(self):
        return f"{self.name} ({self.get_rule_type_display()})"

class StaticRewardRule(models.Model):
    """Fixed percentage/cashback reward rules"""
    reward_rule = models.OneToOneField(RewardRule, on_delete=models.CASCADE, related_name='static_rule')
    percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00')), MaxValueValidator(Decimal('100.00'))],
        help_text="Reward percentage (e.g., 2.00 for 2%)"
    )
    points_program = models.ForeignKey(PointsProgram, on_delete=models.CASCADE, null=True, blank=True)
    points_multiplier = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal('1.00'),
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text="Points multiplier (e.g., 3.00 for 3x points)"
    )
    categories = models.ManyToManyField(RewardsCategory, blank=True)
    payees = models.ManyToManyField(RewardsPayee, blank=True)
    min_spend = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    max_reward = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal('0.00'))]
    )

    def __str__(self):
        return f"{self.reward_rule.name} - {self.percentage}%"

class RotatingRewardRule(models.Model):
    """Quarterly rotating category reward rules"""
    reward_rule = models.OneToOneField(RewardRule, on_delete=models.CASCADE, related_name='rotating_rule')
    percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00')), MaxValueValidator(Decimal('100.00'))]
    )
    points_program = models.ForeignKey(PointsProgram, on_delete=models.CASCADE, null=True, blank=True)
    points_multiplier = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal('1.00'),
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    categories = models.ManyToManyField(RewardsCategory, blank=True)
    payees = models.ManyToManyField(RewardsPayee, blank=True)
    min_spend = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    max_reward = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    start_date = models.DateField()
    end_date = models.DateField()
    is_current_quarter = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.reward_rule.name} - {self.percentage}% ({self.start_date} to {self.end_date})"

class DynamicRewardRule(models.Model):
    """Complex tiered reward rules"""
    reward_rule = models.OneToOneField(RewardRule, on_delete=models.CASCADE, related_name='dynamic_rule')
    base_percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00')), MaxValueValidator(Decimal('100.00'))],
        default=Decimal('1.00')
    )
    points_program = models.ForeignKey(PointsProgram, on_delete=models.CASCADE, null=True, blank=True)
    base_points_multiplier = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal('1.00'),
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    categories = models.ManyToManyField(RewardsCategory, blank=True)
    payees = models.ManyToManyField(RewardsPayee, blank=True)
    min_spend = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    max_reward = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal('0.00'))]
    )

    def __str__(self):
        return f"{self.reward_rule.name} - Dynamic (Base: {self.base_percentage}%)"

class DynamicRewardTier(models.Model):
    """Tiers for dynamic reward rules"""
    dynamic_rule = models.ForeignKey(DynamicRewardRule, on_delete=models.CASCADE, related_name='tiers')
    name = models.CharField(max_length=100)
    min_spend = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    max_spend = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00')), MaxValueValidator(Decimal('100.00'))]
    )
    points_multiplier = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal('1.00'),
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    order = models.IntegerField(default=0)

    class Meta:
        ordering = ['order', 'min_spend']

    def __str__(self):
        return f"{self.dynamic_rule.reward_rule.name} - {self.name} ({self.percentage}%)"

class ActivationRequirement(models.Model):
    """Requirements that must be met to activate a reward rule"""
    REQUIREMENT_TYPES = [
        ('MIN_SPEND', 'Minimum Spend'),
        ('MIN_TRANSACTIONS', 'Minimum Transactions'),
        ('ENROLLMENT', 'Enrollment Required'),
        ('CATEGORY_SPEND', 'Category Spend'),
        ('PAYEE_SPEND', 'Payee Spend'),
        ('TIME_PERIOD', 'Time Period'),
        ('CUSTOM', 'Custom'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    reward_rule = models.ForeignKey(RewardRule, on_delete=models.CASCADE, related_name='activation_requirements')
    requirement_type = models.CharField(max_length=20, choices=REQUIREMENT_TYPES)
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True, null=True)
    is_required = models.BooleanField(default=True)
    is_active = models.BooleanField(default=True)

    # For spend-based requirements
    min_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    max_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal('0.00'))]
    )

    # For transaction-based requirements
    min_transactions = models.IntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(1)]
    )
    max_transactions = models.IntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(1)]
    )

    # For time-based requirements
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)

    # For category/payee-specific requirements
    categories = models.ManyToManyField(RewardsCategory, blank=True)
    payees = models.ManyToManyField(RewardsPayee, blank=True)

    # Custom requirement logic
    custom_logic = models.TextField(blank=True, null=True, help_text="Custom logic for complex requirements")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['reward_rule', 'requirement_type', 'name']

    def __str__(self):
        return f"{self.reward_rule.name} - {self.name}"

class RewardRuleAssignment(models.Model):
    """Assigns reward rules to credit cards"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    reward_rule = models.ForeignKey(RewardRule, on_delete=models.CASCADE, related_name='assignments')
    credit_card_id = models.UUIDField(help_text="UUID of the credit card this rule applies to")
    is_active = models.BooleanField(default=True)
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['reward_rule', 'credit_card_id']
        ordering = ['reward_rule', 'credit_card_id']

    def __str__(self):
        return f"{self.reward_rule.name} -> Card {self.credit_card_id}"

class RewardCalculation(models.Model):
    """Stores calculated rewards for transactions"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    transaction_id = models.UUIDField(help_text="UUID of the transaction this reward applies to")
    reward_rule = models.ForeignKey(RewardRule, on_delete=models.CASCADE, related_name='calculations')
    credit_card_id = models.UUIDField(help_text="UUID of the credit card used for the transaction")

    # Calculation details
    transaction_amount = models.DecimalField(max_digits=10, decimal_places=2)
    reward_percentage = models.DecimalField(max_digits=5, decimal_places=2)
    reward_amount = models.DecimalField(max_digits=10, decimal_places=2)
    points_earned = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    points_program = models.ForeignKey(PointsProgram, on_delete=models.CASCADE, null=True, blank=True)

    # Metadata
    calculation_date = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-calculation_date']
        indexes = [
            models.Index(fields=['transaction_id']),
            models.Index(fields=['credit_card_id']),
            models.Index(fields=['calculation_date']),
        ]

    def __str__(self):
        return f"{self.reward_rule.name} - ${self.reward_amount} on ${self.transaction_amount}"
