#!/usr/bin/env python3
"""
Data population script for Finance Assistant v0.14.52
Populates lookup tables with essential data for the addon to function properly.
"""

import os
import django

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'finance_assistant.settings')
django.setup()

from lookups.models import (
    AccountType, AssetType, LiabilityType, CreditCardType,
    PaymentMethod, PointsProgram, Bank
)
from api.models import YnabPluginSettings
from ynab.models import YNABConfiguration

def populate_lookup_tables():
    """Populate all lookup tables with essential data"""

    print("Populating lookup tables...")

    # Account Types
    account_types = [
        'Checking', 'Savings', 'Investment', 'Credit Card'
    ]
    for name in account_types:
        AccountType.objects.get_or_create(name=name)

    # Asset Types
    asset_types = [
        'Cash', 'Investment', 'Real Estate', 'Vehicle', 'Other'
    ]
    for name in asset_types:
        AssetType.objects.get_or_create(name=name)

    # Liability Types
    liability_types = [
        'Credit Card', 'Student Loan', 'Auto Loan', 'Mortgage', 'Personal Loan', 'Other'
    ]
    for name in liability_types:
        LiabilityType.objects.get_or_create(name=name)

    # Credit Card Types
    credit_card_types = [
        'Visa', 'Mastercard', 'American Express', 'Discover', 'Other'
    ]
    for name in credit_card_types:
        CreditCardType.objects.get_or_create(name=name)

    # Payment Methods
    payment_methods = [
        'Cash', 'Check', 'Credit Card', 'Debit Card', 'Bank Transfer', 'Other'
    ]
    for name in payment_methods:
        PaymentMethod.objects.get_or_create(name=name)

    # Points Programs
    points_programs = [
        'Chase Ultimate Rewards', 'American Express Membership Rewards',
        'Citi ThankYou Points', 'Capital One Miles', 'Other'
    ]
    for name in points_programs:
        PointsProgram.objects.get_or_create(name=name)

    # Banks
    banks = [
        'Chase', 'Bank of America', 'Wells Fargo', 'Citibank', 'Other'
    ]
    for name in banks:
        Bank.objects.get_or_create(name=name)

    print("Lookup tables populated successfully!")

def create_default_settings():
    """Create default settings objects"""

    print("Creating default settings...")

    # Create default YNAB plugin settings
    YnabPluginSettings.objects.get_or_create(
        id=1,
        defaults={
            'enabled': False,
            'api_key': '',
            'budget_id': ''
        }
    )

    # Create default YNAB configuration
    YNABConfiguration.objects.get_or_create(
        id=1,
        defaults={
            'api_key': '',
            'budget_id': ''
        }
    )

    print("Default settings created successfully!")

if __name__ == '__main__':
    try:
        populate_lookup_tables()
        create_default_settings()
        print("Data population completed successfully!")
    except Exception as e:
        print(f"Error populating data: {e}")
        import traceback
        traceback.print_exc()