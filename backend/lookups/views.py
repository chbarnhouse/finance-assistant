from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction
from .models import Bank, Category, Merchant, AccountType, AssetType, LiabilityType, CreditCardType, PaymentMethod, PointsProgram
from .serializers import (
    BankSerializer,
    CategorySerializer,
    MerchantSerializer,
    AccountTypeSerializer,
    AssetTypeSerializer,
    LiabilityTypeSerializer,
    CreditCardTypeSerializer,
    PaymentMethodSerializer,
    PointsProgramSerializer,
)


class LookupTableMixin:
    """Mixin to add reset and bulk delete functionality to lookup tables"""

    @action(detail=False, methods=['post'])
    def reset_to_defaults(self, request):
        """Reset the lookup table to its default values"""
        try:
            with transaction.atomic():
                # Get the model class
                model = self.get_queryset().model

                # Define default values for each model
                defaults = self.get_default_values()

                # Get all existing records
                existing_records = model.objects.all()

                # Track what we're doing
                restored_count = 0
                deleted_count = 0
                added_count = 0

                # 1. Restore renamed default records to their original names
                for record in existing_records.filter(is_default=True):
                    if record.name != record.original_name and record.original_name:
                        record.name = record.original_name
                        record.save()
                        restored_count += 1

                # 2. Delete custom records (non-defaults)
                custom_records = existing_records.filter(is_default=False)
                deleted_count = custom_records.count()
                custom_records.delete()

                # 3. Add any missing default records
                existing_default_names = set(existing_records.filter(is_default=True).values_list('name', flat=True))
                for item_name in defaults:
                    if item_name not in existing_default_names:
                        model.objects.create(
                            name=item_name,
                            is_default=True,
                            original_name=item_name
                        )
                        added_count += 1

                return Response({
                    'message': f'Successfully reset {model.__name__}: {restored_count} restored, {deleted_count} deleted, {added_count} added',
                    'restored_count': restored_count,
                    'deleted_count': deleted_count,
                    'added_count': added_count,
                    'total_defaults': len(defaults)
                }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({
                'error': f'Failed to reset {self.get_queryset().model.__name__}: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'])
    def bulk_delete(self, request):
        """Delete multiple records by their IDs"""
        try:
            ids = request.data.get('ids', [])
            if not ids:
                return Response({
                    'error': 'No IDs provided for deletion'
                }, status=status.HTTP_400_BAD_REQUEST)

            with transaction.atomic():
                model = self.get_queryset().model
                deleted_count = model.objects.filter(id__in=ids).delete()[0]

                return Response({
                    'message': f'Successfully deleted {deleted_count} records',
                    'deleted_count': deleted_count
                }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({
                'error': f'Failed to delete records: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def get_default_values(self):
        """Get default values for the specific model - to be overridden by subclasses"""
        return []

class BankViewSet(LookupTableMixin, viewsets.ModelViewSet):
    queryset = Bank.objects.all()
    serializer_class = BankSerializer
    pagination_class = None

    def get_default_values(self):
        return [
            'Bank of America',
            'Chase Bank',
            'Wells Fargo',
            'Citibank',
            'Capital One',
            'American Express',
            'US Bank',
            'PNC Bank',
            'TD Bank',
        ]

class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    pagination_class = None

class MerchantViewSet(viewsets.ModelViewSet):
    queryset = Merchant.objects.all()
    serializer_class = MerchantSerializer
    pagination_class = None

class AccountTypeViewSet(LookupTableMixin, viewsets.ModelViewSet):
    queryset = AccountType.objects.all()
    serializer_class = AccountTypeSerializer
    pagination_class = None

    def get_default_values(self):
        return [
            'Checking',
            'Savings',
            'Money Market',
            'Certificate of Deposit (CD)',
            'Individual Retirement Account (IRA)',
            '401(k)',
            'Roth IRA',
            'Traditional IRA',
            'Health Savings Account (HSA)',
            'Flexible Spending Account (FSA)',
        ]

class AssetTypeViewSet(LookupTableMixin, viewsets.ModelViewSet):
    queryset = AssetType.objects.all()
    serializer_class = AssetTypeSerializer
    pagination_class = None

    def get_default_values(self):
        return [
            'Stocks',
            'Bonds',
            'Mutual Funds',
            'Exchange Traded Funds (ETF)',
            'Real Estate',
            'Precious Metals',
            'Cryptocurrency',
            'Collectibles',
            'Business Ownership',
            'Vehicles',
        ]

class LiabilityTypeViewSet(LookupTableMixin, viewsets.ModelViewSet):
    queryset = LiabilityType.objects.all()
    serializer_class = LiabilityTypeSerializer
    pagination_class = None

    def get_default_values(self):
        return [
            'Credit Card',
            'Personal Loan',
            'Student Loan',
            'Car Loan',
            'Mortgage',
            'Home Equity Loan',
            'Business Loan',
            'Medical Debt',
            'Tax Debt',
        ]

class CreditCardTypeViewSet(LookupTableMixin, viewsets.ModelViewSet):
    queryset = CreditCardType.objects.all()
    serializer_class = CreditCardTypeSerializer
    pagination_class = None

    def get_default_values(self):
        return [
            'Visa',
            'Mastercard',
            'American Express',
            'Discover',
        ]

class PaymentMethodViewSet(LookupTableMixin, viewsets.ModelViewSet):
    queryset = PaymentMethod.objects.all()
    serializer_class = PaymentMethodSerializer
    pagination_class = None

    def get_default_values(self):
        return [
            'Cash',
            'Check',
            'Debit Card',
            'Credit Card',
            'Bank Transfer',
            'PayPal',
            'Venmo',
            'Zelle',
            'Apple Pay',
            'Google Pay',
            'Cash App',
        ]

class PointsProgramViewSet(LookupTableMixin, viewsets.ModelViewSet):
    queryset = PointsProgram.objects.all()
    serializer_class = PointsProgramSerializer
    pagination_class = None

    def get_default_values(self):
        return [
            'Chase Ultimate Rewards',
            'American Express Membership Rewards',
            'Citi ThankYou Points',
            'Capital One Miles',
            'Discover Cashback',
            'Bank of America Preferred Rewards',
            'Wells Fargo Rewards',
            'US Bank FlexPerks',
        ]