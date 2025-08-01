from rest_framework import serializers
from .models import (
    Account, AccountType, Asset, AssetType, Bank, Category, CreditCard,
    Liability, LiabilityType, Payee, PaymentMethod, PointsProgram, Query, Transaction,
    Link
)

# A serializer that can dynamically choose the model for representation
class DynamicModelSerializer(serializers.ModelSerializer):
    model = Transaction
    fields = '__all__'