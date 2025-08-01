from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import BankViewSet, AccountViewSet, CreditCardViewSet, AssetViewSet, LiabilityViewSet, CategoryViewSet, PayeeViewSet, LinkViewSet, AccountTypeViewSet, AssetTypeViewSet, LiabilityTypeViewSet, CreditCardTypeViewSet, lookup_ids_debug, QueryViewSet, QueryResultViewSet, QueryTemplateViewSet, PluginsViewSet, TransactionSourcesView

router = DefaultRouter()
router.register(r'banks', BankViewSet)
router.register(r'api-account-types', AccountTypeViewSet)
router.register(r'asset-types', AssetTypeViewSet)
router.register(r'liability-types', LiabilityTypeViewSet)
router.register(r'credit-card-types', CreditCardTypeViewSet)
router.register(r'accounts', AccountViewSet)
router.register(r'credit-cards', CreditCardViewSet)
router.register(r'assets', AssetViewSet)
router.register(r'liabilities', LiabilityViewSet)
router.register(r'categories', CategoryViewSet)
router.register(r'payees', PayeeViewSet)
router.register(r'links', LinkViewSet)
router.register(r'queries', QueryViewSet)
router.register(r'query-results', QueryResultViewSet)
router.register(r'query-templates', QueryTemplateViewSet)
router.register(r'plugins', PluginsViewSet, basename='plugin')

urlpatterns = [
    path('', include(router.urls)),
    path('lookup-ids-debug/', lookup_ids_debug),
    path('settings/transaction-sources/', TransactionSourcesView.as_view(), name='transaction-sources'),
]