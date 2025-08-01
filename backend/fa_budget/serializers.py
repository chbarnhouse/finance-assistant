from rest_framework import serializers
from .models import BudgetCategory, BudgetPayee

class BudgetCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = BudgetCategory
        fields = '__all__'

class BudgetPayeeSerializer(serializers.ModelSerializer):
    class Meta:
        model = BudgetPayee
        fields = '__all__'