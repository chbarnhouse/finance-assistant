from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import BudgetCategoryViewSet, BudgetPayeeViewSet

router = DefaultRouter()
router.register(r'categories', BudgetCategoryViewSet)
router.register(r'payees', BudgetPayeeViewSet)

urlpatterns = [
    path('', include(router.urls)),
]