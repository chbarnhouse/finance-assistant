from rest_framework import serializers
from django.contrib.contenttypes.models import ContentType
from .models import Account
from lookups.models import Bank, AccountType
from api.models import Link

class LinkSerializer(serializers.ModelSerializer):
    plugin_record = serializers.SerializerMethodField()

    def get_plugin_record(self, obj):
        if obj.plugin_object:
            return {'id': str(obj.plugin_object.id), 'name': obj.plugin_object.name, 'model': obj.plugin_object.__class__.__name__.lower()}
        return None

    class Meta:
        model = Link
        fields = ['id', 'plugin_record']

class AccountSerializer(serializers.ModelSerializer):
    bank_name = serializers.CharField(source='bank.name', read_only=True)
    account_type_name = serializers.CharField(source='account_type.name', read_only=True)
    bank = serializers.PrimaryKeyRelatedField(queryset=Bank.objects.all(), required=False, allow_null=True)
    account_type = serializers.PrimaryKeyRelatedField(queryset=AccountType.objects.all())
    link_data = serializers.SerializerMethodField()

    def get_link_data(self, obj):
        content_type = ContentType.objects.get_for_model(obj)
        link = Link.objects.filter(core_content_type=content_type, core_object_id=obj.pk).first()
        if link:
            return LinkSerializer(link, context=self.context).data
        return None

    class Meta:
        model = Account
        fields = [
            'id', 'name', 'bank', 'bank_name', 'account_type', 'account_type_name',
            'last_4', 'notes', 'allocation', 'link_data',
            # YNAB synced fields
            'balance', 'cleared_balance', 'uncleared_balance', 'on_budget', 'closed',
            'last_reconciled_at', 'debt_original_balance', 'debt_interest_rates',
            'debt_minimum_payments', 'debt_escrow_amounts', 'last_ynab_sync'
        ]