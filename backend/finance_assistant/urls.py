from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/ynab/', include('ynab.urls')),
    path('api/lookups/', include('lookups.urls')),
    path('api/data/', include('data.urls')),
    path('api/budget/', include('fa_budget.urls')),
    # path('api/rewards/', include('credit_card_rewards.urls')),  # Temporarily disabled
    path('api/sync/', include('fa_ynab_sync.urls')),
    path('api/', include('api.urls')),
]