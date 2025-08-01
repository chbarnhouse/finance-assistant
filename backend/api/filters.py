from django_filters import rest_framework as filters
from .models import Link
from ynab.models import YNABAccount, Category as YNABCategory, Payee as YNABPayee
from django.contrib.contenttypes.models import ContentType
from accounts.models import Account
from .models import CreditCard, Asset, Liability

class LinkedFilter(filters.FilterSet):
    linked = filters.BooleanFilter(method='filter_linked')
    bank = filters.NumberFilter(field_name='bank', lookup_expr='exact')
    bank_name = filters.CharFilter(method='filter_bank_name')

    def filter_linked(self, queryset, name, value):
        model = queryset.model
        content_type = ContentType.objects.get_for_model(model)

        linked_ids = Link.objects.filter(
            core_content_type=content_type
        ).values_list('core_object_id', flat=True)

        if value:
            return queryset.filter(pk__in=linked_ids)
        else:
            return queryset.exclude(pk__in=linked_ids)

    def filter_bank_name(self, queryset, name, value):
        """Filter by bank name instead of bank ID"""
        if value:
            return queryset.filter(bank__name__iexact=value)
        return queryset

class YnabAccountFilter(LinkedFilter):
    class Meta:
        model = YNABAccount
        fields = ['linked']

class YnabCategoryFilter(LinkedFilter):
    class Meta:
        model = YNABCategory
        fields = ['linked']

class YnabPayeeFilter(LinkedFilter):
    class Meta:
        model = YNABPayee
        fields = ['linked']