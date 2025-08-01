from rest_framework import serializers
from .models import Bank, Category, Merchant, AccountType, AssetType, LiabilityType, CreditCardType, PaymentMethod, PointsProgram
from django.db.models import Count

class BankSerializer(serializers.ModelSerializer):
    associated_records_count = serializers.SerializerMethodField()

    class Meta:
        model = Bank
        fields = '__all__'

    def get_associated_records_count(self, obj):
        # Count accounts, credit cards, assets, and liabilities that use this bank
        from accounts.models import Account
        from api.models import CreditCard, Asset, Liability

        account_count = Account.objects.filter(bank=obj).count()
        credit_card_count = CreditCard.objects.filter(bank=obj).count()
        asset_count = Asset.objects.filter(bank=obj).count()
        liability_count = Liability.objects.filter(bank=obj).count()

        return account_count + credit_card_count + asset_count + liability_count

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = '__all__'

class MerchantSerializer(serializers.ModelSerializer):
    class Meta:
        model = Merchant
        fields = '__all__'

class AccountTypeSerializer(serializers.ModelSerializer):
    associated_records_count = serializers.SerializerMethodField()

    class Meta:
        model = AccountType
        fields = '__all__'

    def get_associated_records_count(self, obj):
        # Count accounts that use this account type
        from accounts.models import Account
        return Account.objects.filter(account_type=obj).count()

class AssetTypeSerializer(serializers.ModelSerializer):
    associated_records_count = serializers.SerializerMethodField()

    class Meta:
        model = AssetType
        fields = '__all__'

    def get_associated_records_count(self, obj):
        # Count assets that use this asset type
        from api.models import Asset
        return Asset.objects.filter(asset_type=obj).count()

class LiabilityTypeSerializer(serializers.ModelSerializer):
    associated_records_count = serializers.SerializerMethodField()

    class Meta:
        model = LiabilityType
        fields = '__all__'

    def get_associated_records_count(self, obj):
        # Count liabilities that use this liability type
        from api.models import Liability
        return Liability.objects.filter(liability_type=obj).count()

class CreditCardTypeSerializer(serializers.ModelSerializer):
    associated_records_count = serializers.SerializerMethodField()

    class Meta:
        model = CreditCardType
        fields = '__all__'

    def get_associated_records_count(self, obj):
        # Count credit cards that use this credit card type
        from api.models import CreditCard
        return CreditCard.objects.filter(credit_card_type=obj).count()

class PaymentMethodSerializer(serializers.ModelSerializer):
    associated_records_count = serializers.SerializerMethodField()

    class Meta:
        model = PaymentMethod
        fields = '__all__'

    def get_associated_records_count(self, obj):
        # Count credit cards that use this payment method
        try:
            from api.models import CreditCard
            # Use the correct ManyToManyField query
            return CreditCard.objects.filter(payment_methods__id=obj.id).count()
        except Exception as e:
            # Return 0 if there's any error
            return 0

class PointsProgramSerializer(serializers.ModelSerializer):
    associated_records_count = serializers.SerializerMethodField()

    class Meta:
        model = PointsProgram
        fields = '__all__'

    def get_associated_records_count(self, obj):
        # For now, return 0 as PointsProgram doesn't seem to have direct relationships yet
        # This can be updated when credit card rewards are implemented
        return 0