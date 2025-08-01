from rest_framework import viewsets
from .models import BudgetCategory, BudgetPayee
from .serializers import BudgetCategorySerializer, BudgetPayeeSerializer

class BudgetCategoryViewSet(viewsets.ModelViewSet):
    queryset = BudgetCategory.objects.all()
    serializer_class = BudgetCategorySerializer

class BudgetPayeeViewSet(viewsets.ModelViewSet):
    queryset = BudgetPayee.objects.all()
    serializer_class = BudgetPayeeSerializer