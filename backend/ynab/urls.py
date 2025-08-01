from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CategoryGroupViewSet, CategoryViewSet, PayeeViewSet, YNABAccountViewSet,
    TransactionViewSet, YNABConfigurationView, SyncView, YNABUserView,
    YNABBudgetsView, YNABBudgetByIdView, YNABMonthsView, YNABAPIEndpointsView, CrossReferenceView, ColumnConfigurationView, AccountTypeMappingView
)

router = DefaultRouter()
router.register(r'category-groups', CategoryGroupViewSet)
router.register(r'categories', CategoryViewSet)
router.register(r'payees', PayeeViewSet)
# router.register(r'accounts', YNABAccountViewSet) # Replaced with manual routing for custom actions
router.register(r'transactions', TransactionViewSet)

account_list = YNABAccountViewSet.as_view({'get': 'list'})
account_detail = YNABAccountViewSet.as_view({'get': 'retrieve'})
account_link = YNABAccountViewSet.as_view({'post': 'link'})
account_unlink = YNABAccountViewSet.as_view({'post': 'unlink'})

urlpatterns = [
    path('', include(router.urls)),
    path('accounts/', account_list, name='ynabaccount-list'),
    path('accounts/<uuid:pk>/', account_detail, name='ynabaccount-detail'),
    path('accounts/<uuid:pk>/link/', account_link, name='ynabaccount-link'),
    path('accounts/<uuid:pk>/unlink/', account_unlink, name='ynabaccount-unlink'),
    path('config/', YNABConfigurationView.as_view(), name='ynab-config'),
    path('sync/', SyncView.as_view(), name='ynab-sync'),
    path('user/', YNABUserView.as_view(), name='ynab-user'),
    path('budgets/', YNABBudgetsView.as_view(), name='ynab-budgets'),
    path('budgets/<uuid:budget_id>/', YNABBudgetByIdView.as_view(), name='ynab-budget-by-id'),
    path('months/', YNABMonthsView.as_view(), name='ynab-months'),
    path('api-endpoints/', YNABAPIEndpointsView.as_view(), name='ynab-api-endpoints'),
    path('cross-references/<str:record_type>/', CrossReferenceView.as_view(), name='ynab-cross-references'),
    path('column-configurations/', ColumnConfigurationView.as_view(), name='ynab-column-configurations'),
    path('account-type-mappings/', AccountTypeMappingView.as_view(), name='ynab-account-type-mappings'),
]