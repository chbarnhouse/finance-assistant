from django.contrib import admin
from .models import (
    Bank, Category, Merchant, AccountType, AssetType,
    LiabilityType, CreditCardType, PaymentMethod, PointsProgram
)

@admin.register(Bank)
class BankAdmin(admin.ModelAdmin):
    list_display = ['name']
    search_fields = ['name']

@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'parent']
    search_fields = ['name']
    list_filter = ['parent']

@admin.register(Merchant)
class MerchantAdmin(admin.ModelAdmin):
    list_display = ['name', 'parent', 'default_category']
    search_fields = ['name']
    list_filter = ['parent', 'default_category']

@admin.register(AccountType)
class AccountTypeAdmin(admin.ModelAdmin):
    list_display = ['name']
    search_fields = ['name']

@admin.register(AssetType)
class AssetTypeAdmin(admin.ModelAdmin):
    list_display = ['name']
    search_fields = ['name']

@admin.register(LiabilityType)
class LiabilityTypeAdmin(admin.ModelAdmin):
    list_display = ['name']
    search_fields = ['name']

@admin.register(CreditCardType)
class CreditCardTypeAdmin(admin.ModelAdmin):
    list_display = ['name']
    search_fields = ['name']

@admin.register(PaymentMethod)
class PaymentMethodAdmin(admin.ModelAdmin):
    list_display = ['name']
    search_fields = ['name']

@admin.register(PointsProgram)
class PointsProgramAdmin(admin.ModelAdmin):
    list_display = ['name']
    search_fields = ['name']