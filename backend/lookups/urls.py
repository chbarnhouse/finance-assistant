from rest_framework.routers import DefaultRouter
from .views import (
    BankViewSet,
    CategoryViewSet,
    MerchantViewSet,
    AccountTypeViewSet,
    AssetTypeViewSet,
    LiabilityTypeViewSet,
    CreditCardTypeViewSet,
    PaymentMethodViewSet,
    PointsProgramViewSet,
)

router = DefaultRouter()
router.register(r'banks', BankViewSet, basename='bank')
router.register(r'categories', CategoryViewSet, basename='category')
router.register(r'merchants', MerchantViewSet, basename='merchant')
router.register(r'account-types', AccountTypeViewSet, basename='accounttype')
router.register(r'asset-types', AssetTypeViewSet, basename='assettype')
router.register(r'liability-types', LiabilityTypeViewSet, basename='liabilitytype')
router.register(r'credit-card-types', CreditCardTypeViewSet, basename='creditcardtype')
router.register(r'payment-methods', PaymentMethodViewSet, basename='paymentmethod')
router.register(r'points-programs', PointsProgramViewSet, basename='pointsprogram')

urlpatterns = router.urls