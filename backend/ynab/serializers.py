from rest_framework import serializers
from .models import (
    CategoryGroup, Category, Payee, YNABAccount,
    Transaction, Subtransaction, YNABConfiguration, ColumnConfiguration
)

class YNABConfigurationSerializer(serializers.ModelSerializer):
    class Meta:
        model = YNABConfiguration
        fields = ["id", "api_key", "budget_id"]
        read_only_fields = ["id"]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['id'] = str(data['id'])
        return data


class ColumnConfigurationSerializer(serializers.ModelSerializer):
    class Meta:
        model = ColumnConfiguration
        fields = ["id", "record_type", "field", "header_name", "visible", "order", "width", "use_checkbox", "use_currency", "invert_negative_sign", "disable_negative_sign", "use_thousands_separator", "use_datetime", "datetime_format"]
        read_only_fields = ["id"]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['id'] = str(data['id'])
        return data

class SubtransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subtransaction
        fields = ["id", "transaction", "amount", "memo", "category", "payee"]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['id'] = str(data['id'])
        return data

class TransactionSerializer(serializers.ModelSerializer):
    subtransactions = SubtransactionSerializer(many=True, read_only=True)
    account_name = serializers.CharField(source='account.name', read_only=True)
    payee_name = serializers.CharField(source='payee.name', read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True)

    class Meta:
        model = Transaction
        fields = ["id", "date", "amount", "memo", "cleared", "approved", "flag_color", "account", "payee", "category", "account_name", "payee_name", "category_name", "transfer_account_id", "transfer_transaction_id", "import_id", "deleted", "subtransactions"]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['id'] = str(data['id'])
        return data

class YNABAccountSerializer(serializers.ModelSerializer):
    linked = serializers.SerializerMethodField()
    link_data = serializers.SerializerMethodField()

    def get_linked(self, obj):
        """Check if this YNAB account is linked to any core record"""
        from django.contrib.contenttypes.models import ContentType
        from api.models import Link

        content_type = ContentType.objects.get_for_model(YNABAccount)
        link = Link.objects.filter(
            plugin_content_type=content_type,
            plugin_object_id=obj.id
        ).first()

        return link is not None

    def get_link_data(self, obj):
        """Get detailed link information including core record data"""
        from django.contrib.contenttypes.models import ContentType
        from api.models import Link

        content_type = ContentType.objects.get_for_model(YNABAccount)
        link = Link.objects.filter(
            plugin_content_type=content_type,
            plugin_object_id=obj.id
        ).first()

        if link:
            # Check if core object still exists
            try:
                core_object = link.core_object
                if core_object is None:
                    # Core object was deleted but link wasn't cleaned up
                    link.delete()
                    return None
            except Exception as e:
                # Core object doesn't exist, clean up orphaned link
                link.delete()
                return None

            # Map model names to frontend paths
            model_to_path = {
                'account': 'accounts',
                'creditcard': 'credit-cards',
                'asset': 'assets',
                'liability': 'liabilities',
                'category': 'categories',
                'payee': 'payees',
            }

            core_model_name = link.core_content_type.model
            frontend_path = model_to_path.get(core_model_name, core_model_name)

            return {
                'id': str(link.id),
                'core_record': {
                    'id': str(core_object.id),
                    'name': core_object.name,
                    'model': core_model_name,
                    'path': frontend_path
                }
            }

        return None

    class Meta:
        model = YNABAccount
        fields = ["id", "name", "type", "on_budget", "closed", "balance", "cleared_balance", "uncleared_balance", "last_reconciled_at", "linked", "link_data"]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['id'] = str(data['id'])
        return data

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "name", "hidden", "budgeted", "activity", "balance", "goal_type", "note"]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['id'] = str(data['id'])
        return data

class CategoryGroupSerializer(serializers.ModelSerializer):
    categories = CategorySerializer(many=True, read_only=True)

    class Meta:
        model = CategoryGroup
        fields = ["id", "name", "categories", "hidden", "deleted"]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['id'] = str(data['id'])
        return data

class PayeeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payee
        fields = ["id", "name", "transfer_account_id", "deleted"]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['id'] = str(data['id'])
        return data

class YNABUserSerializer(serializers.Serializer):
    id = serializers.UUIDField()

class YNABDateFormatSerializer(serializers.Serializer):
    format = serializers.CharField()

class YNABCurrencyFormatSerializer(serializers.Serializer):
    iso_code = serializers.CharField()
    example_format = serializers.CharField()
    decimal_digits = serializers.IntegerField()
    decimal_separator = serializers.CharField()
    symbol_first = serializers.BooleanField()
    group_separator = serializers.CharField()
    currency_symbol = serializers.CharField()
    display_symbol = serializers.BooleanField()

class YNABBudgetSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    name = serializers.CharField()
    last_modified_on = serializers.DateTimeField()
    first_month = serializers.DateField()
    last_month = serializers.DateField()
    date_format = YNABDateFormatSerializer()
    currency_format = YNABCurrencyFormatSerializer()

