from rest_framework import serializers
from .models import Bank, AccountType, AssetType, LiabilityType, Account, Transaction

class BankSerializer(serializers.ModelSerializer):
    class Meta:
        model = Bank
        fields = '__all__'

class AccountTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = AccountType
        fields = '__all__'

class AssetTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = AssetType
        fields = '__all__'

class LiabilityTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = LiabilityType
        fields = '__all__'

class AccountSerializer(serializers.ModelSerializer):
    bank = BankSerializer(read_only=True)
    account_type = AccountTypeSerializer(read_only=True)

    class Meta:
        model = Account
        fields = [
            'id',
            'name',
            'account_type',
            'bank',
            'account_number',
            'balance',
            'created_at',
            'updated_at'
        ]

    def create(self, validated_data):
        # Extract bank and account_type IDs from the request data
        bank_id = self.context['request'].data.get('bank')
        account_type_id = self.context['request'].data.get('account_type')

        # Get the actual objects
        bank = Bank.objects.get(id=bank_id)
        account_type = AccountType.objects.get(id=account_type_id)

        # Create the account with the actual objects
        validated_data['bank'] = bank
        validated_data['account_type'] = account_type

        return super().create(validated_data)

class TransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Transaction
        fields = '__all__'