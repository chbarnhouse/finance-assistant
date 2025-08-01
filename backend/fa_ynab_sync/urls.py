from django.urls import path
from .views import SyncView

urlpatterns = [
    path('trigger/', SyncView.as_view(), name='trigger-sync'),
]