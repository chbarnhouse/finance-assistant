import uuid
from django.db import models
from lookups.models import Bank, AccountType
from ynab.models import YNABAccount

class Account(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    ynab_account = models.ForeignKey(YNABAccount, on_delete=models.SET_NULL, null=True, blank=True, unique=True)
    name = models.CharField(max_length=255)
    bank = models.ForeignKey(Bank, on_delete=models.PROTECT, related_name='accounts', null=True, blank=True)
    account_type = models.ForeignKey(AccountType, on_delete=models.PROTECT, related_name='accounts')
    last_4 = models.CharField(max_length=4, blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Allocation(models.TextChoices):
        LIQUID = 'LI', 'Liquid'
        FROZEN = 'FR', 'Frozen'
        DEEP_FREEZE = 'DF', 'Deep Freeze'

    allocation = models.CharField(
        max_length=2,
        choices=Allocation.choices,
        default=Allocation.LIQUID,
    )

    # YNAB synced fields
    balance = models.DecimalField(max_digits=12, decimal_places=2, default=0, help_text="Current balance in dollars")
    cleared_balance = models.DecimalField(max_digits=12, decimal_places=2, default=0, help_text="Cleared balance in dollars")
    uncleared_balance = models.DecimalField(max_digits=12, decimal_places=2, default=0, help_text="Uncleared balance in dollars")
    on_budget = models.BooleanField(default=False, help_text="Whether this account is on budget")
    closed = models.BooleanField(default=False, help_text="Whether this account is closed")
    last_reconciled_at = models.DateTimeField(null=True, blank=True, help_text="Last time this account was reconciled")
    debt_original_balance = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True, help_text="Original debt balance")
    debt_interest_rates = models.JSONField(default=dict, blank=True, help_text="Interest rates for debt accounts")
    debt_minimum_payments = models.JSONField(default=dict, blank=True, help_text="Minimum payments for debt accounts")
    debt_escrow_amounts = models.JSONField(default=dict, blank=True, help_text="Escrow amounts for debt accounts")
    last_ynab_sync = models.DateTimeField(null=True, blank=True, help_text="Last time data was synced from YNAB")

    def __str__(self):
        return self.name

    def sync_from_ynab(self, ynab_account=None):
        """Sync data from the linked YNAB account"""
        from django.utils import timezone
        from django.contrib.contenttypes.models import ContentType
        from api.models import Link

        # Get the YNAB account either from parameter or from Link model
        if ynab_account is None:
            # Try to get YNAB account through Link model
            content_type = ContentType.objects.get_for_model(self)
            link = Link.objects.filter(
                core_content_type=content_type,
                core_object_id=self.pk
            ).first()

            if not link or not link.plugin_object:
                return False

            ynab_account = link.plugin_object
        else:
            # Use the provided YNAB account
            ynab_account = ynab_account

        # Convert millicents to dollars (YNAB stores amounts in millicents)
        self.balance = ynab_account.balance / 1000
        self.cleared_balance = ynab_account.cleared_balance / 1000
        self.uncleared_balance = ynab_account.uncleared_balance / 1000

        # Copy boolean fields
        self.on_budget = ynab_account.on_budget
        self.closed = ynab_account.closed

        # Copy datetime fields
        self.last_reconciled_at = ynab_account.last_reconciled_at

        # Copy debt information
        if ynab_account.debt_original_balance is not None:
            self.debt_original_balance = ynab_account.debt_original_balance / 1000
        self.debt_interest_rates = ynab_account.debt_interest_rates
        self.debt_minimum_payments = ynab_account.debt_minimum_payments
        self.debt_escrow_amounts = ynab_account.debt_escrow_amounts

        # Update sync timestamp
        self.last_ynab_sync = timezone.now()

        # Update notes if YNAB has a note and we don't have one
        if ynab_account.note and not self.notes:
            self.notes = ynab_account.note

        self.save()
        return True

    class Meta:
        verbose_name = "Account"
        verbose_name_plural = "Accounts"
        ordering = ['name']