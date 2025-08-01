from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.contrib.contenttypes.models import ContentType
from django_filters import rest_framework as filters
from .models import CreditCard, Asset, Liability, Link
from lookups.models import Bank, AccountType
from accounts.models import Account
from fa_budget.models import BudgetCategory as Category, BudgetPayee as Payee
from lookups.models import AssetType, LiabilityType, CreditCardType
from .serializers import BankSerializer, AccountSerializer, CreditCardSerializer, AssetSerializer, LiabilitySerializer, CategorySerializer, PayeeSerializer, LinkSerializer, AccountTypeSerializer, AssetTypeSerializer, LiabilityTypeSerializer, CreditCardTypeSerializer
from .filters import LinkedFilter
from accounts.models import Account
import logging
logger = logging.getLogger(__name__)
from rest_framework.decorators import api_view
from django.db import models


class BankViewSet(viewsets.ModelViewSet):
    queryset = Bank.objects.all()
    serializer_class = BankSerializer
    pagination_class = None

class AccountTypeViewSet(viewsets.ModelViewSet):
    queryset = AccountType.objects.all()
    serializer_class = AccountTypeSerializer
    pagination_class = None

class AssetTypeViewSet(viewsets.ModelViewSet):
    queryset = AssetType.objects.all()
    serializer_class = AssetTypeSerializer
    pagination_class = None

class LiabilityTypeViewSet(viewsets.ModelViewSet):
    queryset = LiabilityType.objects.all()
    serializer_class = LiabilityTypeSerializer
    pagination_class = None

class CreditCardTypeViewSet(viewsets.ModelViewSet):
    queryset = CreditCardType.objects.all()
    serializer_class = CreditCardTypeSerializer
    pagination_class = None

class AccountViewSet(viewsets.ModelViewSet):
    queryset = Account.objects.all()
    serializer_class = AccountSerializer
    pagination_class = None
    filterset_class = LinkedFilter

    def destroy(self, request, *args, **kwargs):
        """Override destroy method to add logging"""
        try:
            logger.info(f"Attempting to delete Account with ID: {kwargs.get('pk')}")
            response = super().destroy(request, *args, **kwargs)
            logger.info(f"Successfully deleted Account with ID: {kwargs.get('pk')}")
            return response
        except Exception as e:
            logger.error(f"Error deleting Account with ID {kwargs.get('pk')}: {str(e)}")
            logger.error(f"Error type: {type(e)}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            raise

class LinkViewSet(viewsets.ModelViewSet):
    queryset = Link.objects.all()
    serializer_class = LinkSerializer
    pagination_class = None

    @action(detail=True, methods=['post'])
    def sync(self, request, pk=None):
        """Sync data from the linked plugin record to the core record"""
        try:
            link = self.get_object()
            core_object = link.core_object
            plugin_object = link.plugin_object

            print(f"Sync request - Core object type: {type(core_object)}, Plugin object type: {type(plugin_object)}")
            print(f"Core object: {core_object}")
            print(f"Plugin object: {plugin_object}")

            # Check if this is an Account linked to a YNAB Account
            if isinstance(core_object, Account) and hasattr(plugin_object, 'balance'):
                print(f"Syncing Account {core_object.name} with YNAB account {plugin_object.name}")
                # This is a YNAB Account, sync the data
                success = core_object.sync_from_ynab(plugin_object)
                print(f"Sync result: {success}")
                if success:
                    return Response({
                        'success': True,
                        'message': f'Successfully synced data from {plugin_object.name} to {core_object.name}',
                        'synced_at': core_object.last_ynab_sync
                    })
                else:
                    return Response({
                        'success': False,
                        'message': 'Failed to sync data - no YNAB account linked'
                    }, status=status.HTTP_400_BAD_REQUEST)
            else:
                return Response({
                    'success': False,
                    'message': f'Sync not implemented for this record type. Core: {type(core_object)}, Plugin: {type(plugin_object)}'
                }, status=status.HTTP_400_BAD_REQUEST)

        except Exception as e:
            print(f"Sync error: {str(e)}")
            return Response({
                'success': False,
                'message': f'Error during sync: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class CreditCardViewSet(viewsets.ModelViewSet):
    queryset = CreditCard.objects.all()
    serializer_class = CreditCardSerializer
    pagination_class = None
    filterset_class = LinkedFilter

    def destroy(self, request, *args, **kwargs):
        """Override destroy method to add logging"""
        try:
            logger.info(f"Attempting to delete CreditCard with ID: {kwargs.get('pk')}")
            response = super().destroy(request, *args, **kwargs)
            logger.info(f"Successfully deleted CreditCard with ID: {kwargs.get('pk')}")
            return response
        except Exception as e:
            logger.error(f"Error deleting CreditCard with ID {kwargs.get('pk')}: {str(e)}")
            logger.error(f"Error type: {type(e)}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            raise

    def create(self, request, *args, **kwargs):
        logger.error(f"CreditCard create called with data: {request.data}")
        try:
            response = super().create(request, *args, **kwargs)
            if response.status_code >= 400:
                logger.error(f"CreditCard create error: {response.data}")
            return response
        except Exception as e:
            logger.error(f"CreditCard create exception: {str(e)}")
            logger.error(f"CreditCard create exception type: {type(e)}")
            import traceback
            logger.error(f"CreditCard create traceback: {traceback.format_exc()}")
            raise

class AssetViewSet(viewsets.ModelViewSet):
    queryset = Asset.objects.all()
    serializer_class = AssetSerializer
    pagination_class = None
    filterset_class = LinkedFilter

    def destroy(self, request, *args, **kwargs):
        """Override destroy method to add logging"""
        try:
            logger.info(f"Attempting to delete Asset with ID: {kwargs.get('pk')}")
            response = super().destroy(request, *args, **kwargs)
            logger.info(f"Successfully deleted Asset with ID: {kwargs.get('pk')}")
            return response
        except Exception as e:
            logger.error(f"Error deleting Asset with ID {kwargs.get('pk')}: {str(e)}")
            logger.error(f"Error type: {type(e)}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            raise

    def create(self, request, *args, **kwargs):
        logger.error(f"Asset create called with data: {request.data}")
        try:
            response = super().create(request, *args, **kwargs)
            if response.status_code >= 400:
                logger.error(f"Asset create error: {response.data}")
            return response
        except Exception as e:
            logger.error(f"Asset create exception: {str(e)}")
            logger.error(f"Asset create exception type: {type(e)}")
            import traceback
            logger.error(f"Asset create traceback: {traceback.format_exc()}")
            raise

    def create(self, request, *args, **kwargs):
        logger.error(f"Asset create called with data: {request.data}")
        try:
            response = super().create(request, *args, **kwargs)
            if response.status_code >= 400:
                logger.error(f"Asset create error: {response.data}")
            return response
        except Exception as e:
            logger.error(f"Asset create exception: {str(e)}")
            logger.error(f"Asset create exception type: {type(e)}")
            import traceback
            logger.error(f"Asset create traceback: {traceback.format_exc()}")
            raise

class LiabilityViewSet(viewsets.ModelViewSet):
    queryset = Liability.objects.all()
    serializer_class = LiabilitySerializer
    pagination_class = None
    filterset_class = LinkedFilter

    def destroy(self, request, *args, **kwargs):
        """Override destroy method to add logging"""
        try:
            logger.info(f"Attempting to delete Liability with ID: {kwargs.get('pk')}")
            response = super().destroy(request, *args, **kwargs)
            logger.info(f"Successfully deleted Liability with ID: {kwargs.get('pk')}")
            return response
        except Exception as e:
            logger.error(f"Error deleting Liability with ID {kwargs.get('pk')}: {str(e)}")
            logger.error(f"Error type: {type(e)}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            raise

    def create(self, request, *args, **kwargs):
        logger.error(f"Liability create called with data: {request.data}")
        try:
            response = super().create(request, *args, **kwargs)
            if response.status_code >= 400:
                logger.error(f"Liability create error: {response.data}")
            return response
        except Exception as e:
            logger.error(f"Liability create exception: {str(e)}")
            logger.error(f"Liability create exception type: {type(e)}")
            import traceback
            logger.error(f"Liability create traceback: {traceback.format_exc()}")
            raise

    def create(self, request, *args, **kwargs):
        logger.error(f"Liability create called with data: {request.data}")
        try:
            response = super().create(request, *args, **kwargs)
            if response.status_code >= 400:
                logger.error(f"Liability create error: {response.data}")
            return response
        except Exception as e:
            logger.error(f"Liability create exception: {str(e)}")
            logger.error(f"Liability create exception type: {type(e)}")
            import traceback
            logger.error(f"Liability create traceback: {traceback.format_exc()}")
            raise

class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    pagination_class = None
    filterset_class = LinkedFilter

class PayeeViewSet(viewsets.ModelViewSet):
    queryset = Payee.objects.all()
    serializer_class = PayeeSerializer
    pagination_class = None
    filterset_class = LinkedFilter

@api_view(['GET'])
def lookup_ids_debug(request):
    """Debug endpoint to see all lookup IDs"""
    from lookups.models import AssetType, LiabilityType, CreditCardType

    data = {
        'account_types': list(AccountType.objects.values('id', 'name')),
        'asset_types': list(AssetType.objects.values('id', 'name')),
        'liability_types': list(LiabilityType.objects.values('id', 'name')),
        'credit_card_types': list(CreditCardType.objects.values('id', 'name')),
        'banks': list(Bank.objects.values('id', 'name')),
    }

    return Response(data)

# === Query Engine Views ===

from .models import Query, QueryResult, QueryTemplate
from .serializers import (
    QuerySerializer, QueryResultSerializer, QueryTemplateSerializer,
    QueryExecutionSerializer, QueryResultDetailSerializer
)
from .query_executor import QueryExecutor, QueryTemplateManager

class QueryViewSet(viewsets.ModelViewSet):
    """ViewSet for managing custom queries"""
    queryset = Query.objects.all()
    serializer_class = QuerySerializer
    pagination_class = None

    @action(detail=True, methods=['post'])
    def execute(self, request, pk=None):
        """Execute a query and return results"""
        query = self.get_object()

        # Get parameters from request data
        parameters = request.data.get('parameters', {})

        # Override parameters if provided
        if parameters:
            query.parameters.update(parameters)

        # Execute the query
        executor = QueryExecutor()
        result = executor.execute_query(query)

        return Response(result)

    @action(detail=False, methods=['post'])
    def execute_by_id(self, request):
        """Execute a query by ID"""
        serializer = QueryExecutionSerializer(data=request.data)

        if serializer.is_valid():
            try:
                query = Query.objects.get(id=serializer.validated_data['query_id'])

                # Override parameters if provided
                if 'parameters' in serializer.validated_data:
                    query.parameters.update(serializer.validated_data['parameters'])

                # Execute the query
                executor = QueryExecutor()
                result = executor.execute_query(query)

                return Response(result)
            except Query.DoesNotExist:
                return Response(
                    {'error': 'Query not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
        else:
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'])
    def templates(self, request):
        """Get available query templates"""
        templates = QueryTemplate.objects.all()
        serializer = QueryTemplateSerializer(templates, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def create_from_template(self, request):
        """Create a new query from a template"""
        template_name = request.data.get('template_name')
        query_name = request.data.get('name')
        parameters = request.data.get('parameters', {})

        if not template_name or not query_name:
            return Response(
                {'error': 'template_name and name are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            template = QueryTemplate.objects.get(name=template_name)
            query = template.create_query_from_template(query_name, parameters)

            # Update with any additional fields
            for field, value in request.data.items():
                if field not in ['template_name', 'name', 'parameters']:
                    setattr(query, field, value)
            query.save()

            serializer = QuerySerializer(query)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        except QueryTemplate.DoesNotExist:
            return Response(
                {'error': f'Template "{template_name}" not found'},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=False, methods=['post'])
    def initialize_templates(self, request):
        """Initialize default query templates"""
        try:
            QueryTemplateManager.create_default_templates()
            return Response({'message': 'Default templates created successfully'})
        except Exception as e:
            return Response(
                {'error': f'Failed to create templates: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class QueryResultViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for viewing query results"""
    queryset = QueryResult.objects.all()
    serializer_class = QueryResultSerializer
    pagination_class = None

    def get_queryset(self):
        """Filter results by query if query_id is provided"""
        queryset = super().get_queryset()
        query_id = self.request.query_params.get('query_id')
        if query_id:
            queryset = queryset.filter(query_id=query_id)
        return queryset

    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Get summary statistics for query results"""
        query_id = request.query_params.get('query_id')

        if query_id:
            queryset = QueryResult.objects.filter(query_id=query_id)
        else:
            queryset = QueryResult.objects.all()

        summary = {
            'total_executions': queryset.count(),
            'successful_executions': queryset.filter(status='SUCCESS').count(),
            'failed_executions': queryset.filter(status='ERROR').count(),
            'average_execution_time': queryset.filter(
                execution_time_ms__isnull=False
            ).aggregate(avg_time=models.Avg('execution_time_ms'))['avg_time'] or 0,
            'last_execution': queryset.order_by('-executed_at').first().executed_at if queryset.exists() else None,
        }

        return Response(summary)

class QueryTemplateViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for viewing query templates"""
    queryset = QueryTemplate.objects.all()
    serializer_class = QueryTemplateSerializer
    pagination_class = None

    def get_queryset(self):
        """Filter templates by category if provided"""
        queryset = super().get_queryset()
        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(category=category)
        return queryset

    @action(detail=True, methods=['post'])
    def create_query(self, request, pk=None):
        """Create a new query from this template"""
        template = self.get_object()
        query_name = request.data.get('name')
        parameters = request.data.get('parameters', {})

        if not query_name:
            return Response(
                {'error': 'name is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            query = template.create_query_from_template(query_name, parameters)

            # Update with any additional fields
            for field, value in request.data.items():
                if field not in ['name', 'parameters']:
                    setattr(query, field, value)
            query.save()

            serializer = QuerySerializer(query)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response(
                {'error': f'Failed to create query: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

# === Plugin Management Views ===

class PluginsViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for managing available plugins"""
    pagination_class = None

    def list(self, request, *args, **kwargs):
        """Return list of available plugins with their capabilities"""
        plugins = [
            {
                'id': 'ynab',
                'name': 'YNAB (You Need A Budget)',
                'enabled': True,  # TODO: Check from settings
                'has_transactions': True,
                'has_accounts': True,
                'has_categories': True,
                'has_payees': True,
                'description': 'Import and sync data from YNAB',
                'icon': 'account_balance'
            }
        ]
        return Response(plugins)

# === Transaction Sources Settings ===

from rest_framework.views import APIView

class TransactionSourcesView(APIView):
    """API endpoint for managing transaction sources configuration"""

    def get(self, request):
        """Get current transaction sources configuration"""
        try:
            # TODO: Store this in a proper settings model
            # For now, return default configuration
            return Response({
                'enabled_sources': ['ynab']  # Default to YNAB enabled
            })
        except Exception as e:
            logger.error(f"Error fetching transaction sources config: {e}")
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def post(self, request):
        """Update transaction sources configuration"""
        try:
            enabled_sources = request.data.get('enabled_sources', [])

            # TODO: Store this in a proper settings model
            # For now, just validate the input
            valid_sources = ['ynab']
            for source in enabled_sources:
                if source not in valid_sources:
                    return Response(
                        {"error": f"Invalid source: {source}"},
                        status=status.HTTP_400_BAD_REQUEST
                    )

            # TODO: Save to database
            logger.info(f"Transaction sources updated: {enabled_sources}")

            return Response({
                'enabled_sources': enabled_sources,
                'message': 'Configuration updated successfully'
            })
        except Exception as e:
            logger.error(f"Error updating transaction sources config: {e}")
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )