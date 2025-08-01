import uuid
from rest_framework import serializers
from django.contrib.contenttypes.models import ContentType
from .models import (
    CreditCard, Asset, Liability, Transaction,
    Link, QueryResult, QueryTemplate, Query
)
from lookups.models import Bank, AccountType, AssetType, LiabilityType, CreditCardType, PaymentMethod, PointsProgram
from accounts.models import Account
from fa_budget.models import BudgetCategory as Category, BudgetPayee as Payee
import logging
logger = logging.getLogger(__name__)

# A serializer that can dynamically choose the model for representation
class GenericRelatedField(serializers.Field):
    def to_representation(self, value):
        # This needs to be aware of all possible plugin models.
        # For now, this is hardcoded, but a more dynamic approach might be needed later.
        plugin_model_name = value.__class__.__name__.lower()
        if 'ynab' in plugin_model_name:
             return {'id': str(value.id), 'name': value.name, 'model': plugin_model_name}
        return None

class LinkSerializer(serializers.ModelSerializer):
    plugin_record = GenericRelatedField(read_only=True, source='plugin_object')
    core_model = serializers.CharField(write_only=True)
    core_id = serializers.CharField(write_only=True)  # Changed to string to handle UUIDs
    plugin_model = serializers.CharField(write_only=True)
    plugin_id = serializers.CharField(write_only=True) # YNAB uses strings for IDs

    class Meta:
        model = Link
        fields = ['id', 'plugin_record', 'core_model', 'core_id', 'plugin_model', 'plugin_id']

    def to_representation(self, instance):
        data = super().to_representation(instance)
        # Ensure id is a string for MUI DataGrid compatibility
        data['id'] = str(data['id'])
        return data

    def create(self, validated_data):
        core_model_name = validated_data.pop('core_model')
        core_id = validated_data.pop('core_id')
        plugin_model_name = validated_data.pop('plugin_model')
        plugin_id = validated_data.pop('plugin_id')

        print(f"LinkSerializer.create called with: core_model={core_model_name}, core_id={core_id}, plugin_model={plugin_model_name}, plugin_id={plugin_id}")

        # Map frontend model names to actual content type model names
        model_mapping = {
            'account': 'account',
            'creditcard': 'creditcard',
            'asset': 'asset',
            'liability': 'liability',
            'category': 'category',
            'payee': 'payee',
            'bank': 'bank',
        }

        # Map frontend model names to actual app names
        app_mapping = {
            'account': 'accounts',
            'creditcard': 'api',
            'asset': 'api',
            'liability': 'api',
            'category': 'api',
            'payee': 'api',
            'bank': 'lookups',
        }

        actual_core_model = model_mapping.get(core_model_name, core_model_name)
        actual_core_app = app_mapping.get(core_model_name, 'api')

        print(f"Mapped to: actual_core_model={actual_core_model}, actual_core_app={actual_core_app}")

        # Get content types directly using the actual model classes
        if core_model_name == 'account':
            from accounts.models import Account
            core_content_type = ContentType.objects.get_for_model(Account)
        else:
            core_content_type = ContentType.objects.get(app_label=actual_core_app, model=actual_core_model)

        if plugin_model_name == 'account':
            from ynab.models import YNABAccount
            plugin_content_type = ContentType.objects.get_for_model(YNABAccount)
        elif plugin_model_name == 'category':
            from ynab.models import Category
            plugin_content_type = ContentType.objects.get_for_model(Category)
        elif plugin_model_name == 'payee':
            from ynab.models import Payee
            plugin_content_type = ContentType.objects.get_for_model(Payee)
        else:
            plugin_content_type = ContentType.objects.get(app_label='ynab', model=plugin_model_name)

        print(f"Content types: core={core_content_type}, plugin={plugin_content_type}")

        # Convert core_id to UUID if it's a string
        try:
            core_object_id = uuid.UUID(core_id) if isinstance(core_id, str) else core_id
            print(f"Core object ID: {core_object_id} (type: {type(core_object_id)})")
        except (ValueError, TypeError):
            raise serializers.ValidationError(f"Invalid core_id format: {core_id}")

        # For plugin_object_id, keep it as a string since the Link model uses CharField
        # and some YNAB models (like YnabTransaction) use string IDs
        plugin_object_id = str(plugin_id)
        print(f"Plugin object ID: {plugin_object_id} (type: {type(plugin_object_id)})")

        link = Link.objects.create(
            core_content_type=core_content_type,
            core_object_id=core_object_id,
            plugin_content_type=plugin_content_type,
            plugin_object_id=plugin_object_id
        )
        print(f"Link created successfully: {link}")
        return link

# Base serializer for core models to include link information
class LinkedCoreModelSerializer(serializers.ModelSerializer):
    link_data = serializers.SerializerMethodField()

    def get_link_data(self, obj):
        """Get detailed link information including plugin record data"""
        from django.contrib.contenttypes.models import ContentType
        from .models import Link

        content_type = ContentType.objects.get_for_model(obj)
        link = Link.objects.filter(
            core_content_type=content_type,
            core_object_id=obj.pk
        ).first()

        if link:
            # Check if plugin object still exists
            try:
                plugin_object = link.plugin_object
                if plugin_object is None:
                    # Plugin object was deleted but link wasn't cleaned up
                    link.delete()
                    return None
            except Exception as e:
                # Plugin object doesn't exist, clean up orphaned link
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
                'bank': 'banks',
            }

            plugin_model_name = plugin_object.__class__.__name__.lower()
            core_model_name = obj.__class__.__name__.lower()

            return {
                'id': str(link.id),
                'core_record': {
                    'id': str(obj.pk),
                    'name': obj.name,
                    'model': core_model_name,
                    'path': model_to_path.get(core_model_name, core_model_name)
                },
                'plugin_record': {
                    'id': str(plugin_object.id),
                    'name': plugin_object.name,
                    'model': plugin_model_name
                }
            }
        return None

    def to_representation(self, instance):
        data = super().to_representation(instance)
        # Ensure id is a string for MUI DataGrid compatibility
        data['id'] = str(data['id'])
        return data

class AccountTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = AccountType
        fields = ['id', 'name']

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['id'] = str(data['id'])
        return data

class AssetTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = AssetType
        fields = ['id', 'name']

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['id'] = str(data['id'])
        return data

class LiabilityTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = LiabilityType
        fields = ['id', 'name']

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['id'] = str(data['id'])
        return data

class CreditCardTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = CreditCardType
        fields = ['id', 'name']

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['id'] = str(data['id'])
        return data

class PaymentMethodSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentMethod
        fields = ['id', 'name']

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['id'] = str(data['id'])
        return data

class PointsProgramSerializer(serializers.ModelSerializer):
    class Meta:
        model = PointsProgram
        fields = ['id', 'name']

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['id'] = str(data['id'])
        return data

class BankSerializer(LinkedCoreModelSerializer):
    class Meta:
        model = Bank
        fields = ['id', 'name', 'link_data']

class CategorySerializer(LinkedCoreModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'parent', 'link_data']

class PayeeSerializer(LinkedCoreModelSerializer):
    class Meta:
        model = Payee
        fields = ['id', 'name', 'parent', 'link_data']

class AccountSerializer(LinkedCoreModelSerializer):
    account_type_name = serializers.CharField(source='account_type.name', read_only=True)
    bank_name = serializers.CharField(source='bank.name', read_only=True)
    bank = serializers.PrimaryKeyRelatedField(queryset=Bank.objects.all(), required=False, allow_null=True)
    account_type = serializers.PrimaryKeyRelatedField(queryset=AccountType.objects.all(), required=True)
    balance = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)

    class Meta:
        model = Account
        fields = ['id', 'name', 'account_type', 'bank', 'account_type_name', 'bank_name', 'balance', 'notes', 'last_4', 'allocation', 'link_data']

    def validate_account_type(self, value):
        """Validate account_type field - handle both ID and name"""
        if isinstance(value, str):
            try:
                account_type = AccountType.objects.get(id=int(value))
                return account_type
            except (ValueError, AccountType.DoesNotExist):
                try:
                    account_type = AccountType.objects.get(name=value)
                    return account_type
                except AccountType.DoesNotExist:
                    raise serializers.ValidationError(f"Account type '{value}' does not exist")
        return value

    def validate_balance(self, value):
        """Validate balance field - handle empty string and null"""
        if value == '' or value is None:
            return 0
        return value

    def create(self, validated_data):
        logger.error(f"Account create called with data: {validated_data}")
        """Filter out invalid fields that don't belong to Account model"""
        valid_fields = ['name', 'bank', 'account_type', 'last_4', 'notes', 'balance', 'allocation']
        filtered_data = {k: v for k, v in validated_data.items() if k in valid_fields}

        logger.error(f"Account create filtered_data: {filtered_data}")

        # Ensure balance is never null (use 0 as default)
        if 'balance' in filtered_data and filtered_data['balance'] is None:
            filtered_data['balance'] = 0

        try:
            result = super().create(filtered_data)
            logger.error(f"Account create successful: {result}")
            return result
        except Exception as e:
            logger.error(f"Account create exception: {e}")
            logger.error(f"Account create exception type: {type(e)}")
            import traceback
            logger.error(f"Account create traceback: {traceback.format_exc()}")
            raise

class CreditCardSerializer(LinkedCoreModelSerializer):
    bank_name = serializers.CharField(source='bank.name', read_only=True)
    credit_card_type_name = serializers.CharField(source='credit_card_type.name', read_only=True)
    bank = serializers.PrimaryKeyRelatedField(queryset=Bank.objects.all(), required=False, allow_null=True)
    credit_card_type = serializers.PrimaryKeyRelatedField(queryset=CreditCardType.objects.all(), required=False, allow_null=True)
    notes = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    balance = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, allow_null=True)

    class Meta:
        model = CreditCard
        fields = ['id', 'name', 'bank', 'bank_name', 'credit_card_type', 'credit_card_type_name', 'last_4', 'notes', 'balance', 'allocation', 'link_data']

    def validate_credit_card_type(self, value):
        """Validate credit_card_type field - handle both ID and name"""
        if isinstance(value, str):
            # If a string is provided, try to find the credit card type by ID first, then by name
            try:
                credit_card_type = CreditCardType.objects.get(id=int(value))
                return credit_card_type
            except (ValueError, CreditCardType.DoesNotExist):
                try:
                    credit_card_type = CreditCardType.objects.get(name=value)
                    return credit_card_type
                except CreditCardType.DoesNotExist:
                    raise serializers.ValidationError(f"Credit card type '{value}' does not exist")
        return value

    def validate_balance(self, value):
        """Validate balance field - handle empty string and null"""
        if value == '' or value is None:
            return 0
        return value

    def create(self, validated_data):
        logger.error(f"CreditCard create called with data: {validated_data}")
        try:
            credit_card_type = validated_data.get('credit_card_type')
            logger.error(f"Credit card type in validated_data: {credit_card_type}")
        except Exception as e:
            logger.error(f"Credit card type lookup error: {e}")
        """Filter out invalid fields that don't belong to CreditCard model"""
        # Remove any fields that don't belong to the CreditCard model
        valid_fields = ['name', 'bank', 'credit_card_type', 'last_4', 'notes', 'balance', 'allocation']
        filtered_data = {k: v for k, v in validated_data.items() if k in valid_fields}

        # Ensure balance is never null (use 0 as default)
        if 'balance' in filtered_data and filtered_data['balance'] is None:
            filtered_data['balance'] = 0

        return super().create(filtered_data)

class AssetSerializer(LinkedCoreModelSerializer):
    asset_type_name = serializers.CharField(source='asset_type.name', read_only=True)
    bank_name = serializers.CharField(source='bank.name', read_only=True)
    bank = serializers.PrimaryKeyRelatedField(queryset=Bank.objects.all(), required=False, allow_null=True)
    asset_type = serializers.PrimaryKeyRelatedField(queryset=AssetType.objects.all())
    notes = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    balance = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, allow_null=True)
    value = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, allow_null=True)

    class Meta:
        model = Asset
        fields = ['id', 'name', 'asset_type', 'asset_type_name', 'bank', 'bank_name', 'balance', 'value', 'notes', 'allocation', 'stock_symbol', 'shares', 'link_data']

    def validate_asset_type(self, value):
        """Validate asset_type field - handle both ID and name"""
        if isinstance(value, str):
            # If a string is provided, try to find the asset type by ID first, then by name
            try:
                asset_type = AssetType.objects.get(id=int(value))
                return asset_type
            except (ValueError, AssetType.DoesNotExist):
                try:
                    asset_type = AssetType.objects.get(name=value)
                    return asset_type
                except AssetType.DoesNotExist:
                    raise serializers.ValidationError(f"Asset type '{value}' does not exist")
        return value

    def validate_balance(self, value):
        """Validate balance field - handle empty string and null"""
        if value == '' or value is None:
            return 0
        return value

    def create(self, validated_data):
        logger.error(f"Asset create called with data: {validated_data}")
        try:
            asset_type = validated_data.get('asset_type')
            logger.error(f"Asset type in validated_data: {asset_type}")
        except Exception as e:
            logger.error(f"Asset type lookup error: {e}")
        """Filter out invalid fields that don't belong to Asset model"""
        # Remove any fields that don't belong to the Asset model
        valid_fields = ['name', 'asset_type', 'bank', 'balance', 'value', 'notes', 'allocation', 'stock_symbol', 'shares']
        filtered_data = {k: v for k, v in validated_data.items() if k in valid_fields}

        logger.error(f"AssetSerializer.create filtered_data: {filtered_data}")

        # Ensure balance is never null (use 0 as default)
        if 'balance' in filtered_data and filtered_data['balance'] is None:
            filtered_data['balance'] = 0

        # Check if asset_type exists
        if 'asset_type' in filtered_data:
            try:
                asset_type = AssetType.objects.get(id=filtered_data['asset_type'].id)
                logger.error(f"AssetSerializer.create found asset_type: {asset_type}")
            except AssetType.DoesNotExist:
                logger.error(f"AssetSerializer.create asset_type with id {filtered_data['asset_type'].id} does not exist")
                raise serializers.ValidationError(f"Asset type with id {filtered_data['asset_type'].id} does not exist")

        return super().create(filtered_data)

class LiabilitySerializer(LinkedCoreModelSerializer):
    liability_type_name = serializers.CharField(source='liability_type.name', read_only=True)
    bank_name = serializers.CharField(source='bank.name', read_only=True)
    bank = serializers.PrimaryKeyRelatedField(queryset=Bank.objects.all(), required=False, allow_null=True)
    liability_type = serializers.PrimaryKeyRelatedField(queryset=LiabilityType.objects.all())
    notes = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    balance = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)

    class Meta:
        model = Liability
        fields = ['id', 'name', 'liability_type', 'liability_type_name', 'bank', 'bank_name', 'balance', 'notes', 'allocation', 'link_data']

    def validate_liability_type(self, value):
        """Validate liability_type field - handle both ID and name"""
        if isinstance(value, str):
            # If a string is provided, try to find the liability type by ID first, then by name
            try:
                liability_type = LiabilityType.objects.get(id=int(value))
                return liability_type
            except (ValueError, LiabilityType.DoesNotExist):
                try:
                    liability_type = LiabilityType.objects.get(name=value)
                    return liability_type
                except LiabilityType.DoesNotExist:
                    raise serializers.ValidationError(f"Liability type '{value}' does not exist")
        return value

    def validate_balance(self, value):
        """Validate balance field - handle empty string and null"""
        if value == '' or value is None:
            return 0
        return value

    def create(self, validated_data):
        logger.error(f"Liability create called with data: {validated_data}")
        try:
            liability_type = validated_data.get('liability_type')
            logger.error(f"Liability type in validated_data: {liability_type}")
        except Exception as e:
            logger.error(f"Liability type lookup error: {e}")
        """Filter out invalid fields that don't belong to Liability model"""
        # Remove any fields that don't belong to the Liability model
        valid_fields = ['name', 'liability_type', 'bank', 'balance', 'notes', 'allocation']
        filtered_data = {k: v for k, v in validated_data.items() if k in valid_fields}

        # Ensure balance is never null (use 0 as default)
        if 'balance' in filtered_data and filtered_data['balance'] is None:
            filtered_data['balance'] = 0

        return super().create(filtered_data)

class TransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Transaction
        fields = ['id', 'date', 'payee', 'category', 'amount', 'memo', 'account', 'credit_card']

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['id'] = str(data['id'])
        return data

# === Query Engine Serializers ===

class QueryResultSerializer(serializers.ModelSerializer):
    """Serializer for QueryResult model"""

    class Meta:
        model = QueryResult
        fields = [
            'id', 'query', 'executed_at', 'execution_time_ms', 'status',
            'result_count', 'result_data', 'error_message', 'parameters_used'
        ]
        read_only_fields = [
            'id', 'executed_at', 'execution_time_ms', 'status',
            'result_count', 'result_data', 'error_message', 'parameters_used'
        ]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['id'] = str(data['id'])
        data['query'] = str(data['query'])
        return data

class QueryTemplateSerializer(serializers.ModelSerializer):
    """Serializer for QueryTemplate model"""

    class Meta:
        model = QueryTemplate
        fields = [
            'id', 'name', 'description', 'query_type', 'template_parameters',
            'sql_template', 'category', 'usage_count', 'is_featured',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'usage_count', 'created_at', 'updated_at']

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['id'] = str(data['id'])
        return data

class QuerySerializer(serializers.ModelSerializer):
    """Serializer for Query model"""

    # Include related data
    results_count = serializers.SerializerMethodField()
    last_result = serializers.SerializerMethodField()
    template_name = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = Query
        fields = [
            'id', 'name', 'description', 'query_type', 'parameters',
            'sql_query', 'output_type', 'ha_entity_id', 'ha_friendly_name',
            'ha_unit_of_measurement', 'ha_device_class', 'is_active',
            'auto_refresh', 'refresh_interval_minutes', 'last_executed',
            'created_at', 'updated_at', 'created_by', 'results_count',
            'last_result', 'template_name'
        ]
        read_only_fields = ['id', 'last_executed', 'created_at', 'updated_at']

    def get_results_count(self, obj):
        """Get the number of results for this query"""
        return obj.results.count()

    def get_last_result(self, obj):
        """Get the most recent result for this query"""
        last_result = obj.results.first()
        if last_result:
            return {
                'id': str(last_result.id),
                'executed_at': last_result.executed_at,
                'status': last_result.status,
                'execution_time_ms': last_result.execution_time_ms,
                'result_count': last_result.result_count
            }
        return None

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['id'] = str(data['id'])
        return data

    def create(self, validated_data):
        """Create a query, optionally from a template"""
        template_name = validated_data.pop('template_name', None)

        if template_name:
            try:
                template = QueryTemplate.objects.get(name=template_name)
                query = template.create_query_from_template(
                    name=validated_data['name'],
                    parameters=validated_data.get('parameters', {})
                )
                # Update with any additional fields
                for field, value in validated_data.items():
                    if field != 'name' and field != 'parameters':
                        setattr(query, field, value)
                query.save()
                return query
            except QueryTemplate.DoesNotExist:
                raise serializers.ValidationError(f"Template '{template_name}' not found")

        return super().create(validated_data)

class QueryExecutionSerializer(serializers.Serializer):
    """Serializer for query execution requests"""

    query_id = serializers.UUIDField()
    parameters = serializers.JSONField(required=False, default=dict)

    def validate_query_id(self, value):
        """Validate that the query exists"""
        try:
            Query.objects.get(id=value)
        except Query.DoesNotExist:
            raise serializers.ValidationError("Query not found")
        return value

class QueryResultDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for QueryResult with query information"""

    query_name = serializers.CharField(source='query.name', read_only=True)
    query_type = serializers.CharField(source='query.query_type', read_only=True)

    class Meta:
        model = QueryResult
        fields = [
            'id', 'query', 'query_name', 'query_type', 'executed_at',
            'execution_time_ms', 'status', 'result_count', 'result_data',
            'error_message', 'parameters_used'
        ]
        read_only_fields = fields

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['id'] = str(data['id'])
        data['query'] = str(data['query'])
        return data