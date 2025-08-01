from django.db import models

class BudgetCategory(models.Model):
    name = models.CharField(max_length=100, unique=True)
    parent = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='children')
    # rewards_categories = models.ManyToManyField('fa_rewards.RewardsCategory', blank=True, related_name='budget_categories')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "Budget Categories"
        ordering = ['name']

    def __str__(self):
        return self.name

class BudgetPayee(models.Model):
    name = models.CharField(max_length=100, unique=True)
    parent = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='children')
    default_category = models.ForeignKey(BudgetCategory, on_delete=models.SET_NULL, null=True, blank=True)
    # rewards_payees = models.ManyToManyField('fa_rewards.RewardsPayee', blank=True, related_name='budget_payees')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "Budget Payees"
        ordering = ['name']

    def __str__(self):
        return self.name
