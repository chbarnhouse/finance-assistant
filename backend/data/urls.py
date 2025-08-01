from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    BankViewSet,
    AccountTypeViewSet,
    AssetTypeViewSet,
    LiabilityTypeViewSet,
    AccountViewSet,
    TransactionViewSet,
)

router = DefaultRouter()
router.register(r'banks', BankViewSet)
router.register(r'account-types', AccountTypeViewSet)
router.register(r'asset-types', AssetTypeViewSet)
router.register(r'liability-types', LiabilityTypeViewSet)
router.register(r'accounts', AccountViewSet)
router.register(r'transactions', TransactionViewSet)

urlpatterns = [
    path('', include(router.urls)),
]