from django.shortcuts import render, get_object_or_404
from rest_framework import viewsets, views, status
from rest_framework.response import Response
from .models import Category, CategoryGroup, Payee, YNABAccount, YNABSync, Subtransaction, Transaction, YNABConfiguration, CrossReference, ColumnConfiguration, AccountTypeMapping
from .serializers import (
    CategoryGroupSerializer, CategorySerializer, PayeeSerializer,
    YNABAccountSerializer, TransactionSerializer, YNABConfigurationSerializer,
    YNABUserSerializer, YNABBudgetSerializer, ColumnConfigurationSerializer
)
import os
import requests
import logging
import json
from rest_framework.decorators import action
from .ynab_client import YNABClient
from accounts.models import Account

# Get an instance of a logger
logger = logging.getLogger(__name__)

class CategoryGroupViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint that allows YNAB category groups to be viewed or edited.
    """
    queryset = CategoryGroup.objects.filter(deleted=False).prefetch_related('categories').order_by('name')
    serializer_class = CategoryGroupSerializer
    pagination_class = None

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)
        return Response({'data': {'category_groups': serializer.data}})

class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint that allows YNAB categories to be viewed or edited.
    """
    queryset = Category.objects.filter(deleted=False).order_by('name')
    serializer_class = CategorySerializer
    pagination_class = None

    def get_queryset(self):
        queryset = super().get_queryset()
        linked = self.request.query_params.get('linked')

        if linked is not None:
            from api.models import Link
            from django.contrib.contenttypes.models import ContentType

            content_type = ContentType.objects.get_for_model(Category)
            linked_ids = Link.objects.filter(
                plugin_content_type=content_type
            ).values_list('plugin_object_id', flat=True)

            if linked.lower() == 'true':
                queryset = queryset.filter(id__in=linked_ids)
            else:
                queryset = queryset.exclude(id__in=linked_ids)

        return queryset

    def list(self, request, *args, **kwargs):
        """
        Override list method to return categories with their group names.
        """
        queryset = self.filter_queryset(self.get_queryset()).select_related('category_group')
        serializer = self.get_serializer(queryset, many=True)

        # Add category_group_name to each category
        categories_with_groups = []
        for category_data in serializer.data:
            category = queryset.get(id=category_data['id'])
            category_data['category_group_name'] = category.category_group.name if category.category_group else ''
            categories_with_groups.append(category_data)

        return Response({'data': {'categories': categories_with_groups}})

class PayeeViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint that allows YNAB payees to be viewed or edited.
    """
    queryset = Payee.objects.filter(deleted=False).order_by('name')
    serializer_class = PayeeSerializer
    pagination_class = None

    def get_queryset(self):
        queryset = super().get_queryset()
        linked = self.request.query_params.get('linked')

        if linked is not None:
            from api.models import Link
            from django.contrib.contenttypes.models import ContentType

            content_type = ContentType.objects.get_for_model(Payee)
            linked_ids = Link.objects.filter(
                plugin_content_type=content_type
            ).values_list('plugin_object_id', flat=True)

            if linked.lower() == 'true':
                queryset = queryset.filter(id__in=linked_ids)
            else:
                queryset = queryset.exclude(id__in=linked_ids)

        return queryset

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)
        return Response({'data': {'payees': serializer.data}})

class YNABAccountViewSet(viewsets.ReadOnlyModelViewSet):
    """
    A viewset for viewing and editing YNAB accounts.
    """
    queryset = YNABAccount.objects.filter(deleted=False, closed=False).order_by('name')
    serializer_class = YNABAccountSerializer
    pagination_class = None

    def get_queryset(self):
        queryset = super().get_queryset()
        linked = self.request.query_params.get('linked')

        if linked is not None:
            from api.models import Link
            from django.contrib.contenttypes.models import ContentType

            content_type = ContentType.objects.get_for_model(YNABAccount)
            linked_ids = Link.objects.filter(
                plugin_content_type=content_type
            ).values_list('plugin_object_id', flat=True)

            if linked.lower() == 'true':
                queryset = queryset.filter(id__in=linked_ids)
            else:
                queryset = queryset.exclude(id__in=linked_ids)

        return queryset

    def list(self, request, *args, **kwargs):
        """
        Override list method to return the expected data structure.
        """
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)
        return Response({
            'data': {
                'accounts': serializer.data
            }
        })

    @action(detail=True, methods=['post'])
    def link(self, request, pk=None):
        ynab_account = self.get_object()
        fa_account_id = request.data.get('fa_account_id')

        if not fa_account_id:
            return Response(
                {"error": "fa_account_id is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            from django.contrib.contenttypes.models import ContentType
            from api.models import Link
            from accounts.models import Account

            fa_account = Account.objects.get(pk=fa_account_id)

            # Create a link using the Link model
            core_content_type = ContentType.objects.get_for_model(Account)
            plugin_content_type = ContentType.objects.get_for_model(YNABAccount)

            # Remove any existing links for this YNAB account
            Link.objects.filter(
                plugin_content_type=plugin_content_type,
                plugin_object_id=ynab_account.id
            ).delete()

            # Create the new link
            Link.objects.create(
                core_content_type=core_content_type,
                core_object_id=fa_account.pk,
                plugin_content_type=plugin_content_type,
                plugin_object_id=ynab_account.id
            )

            return Response(self.get_serializer(ynab_account).data)
        except Account.DoesNotExist:
            return Response(
                {"error": "Finance Assistant Account not found."},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=True, methods=['post'])
    def unlink(self, request, pk=None):
        ynab_account = self.get_object()
        from django.contrib.contenttypes.models import ContentType
        from api.models import Link

        # Remove any links for this YNAB account
        plugin_content_type = ContentType.objects.get_for_model(YNABAccount)
        Link.objects.filter(
            plugin_content_type=plugin_content_type,
            plugin_object_id=ynab_account.id
        ).delete()

        return Response(self.get_serializer(ynab_account).data)

class TransactionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Transaction.objects.filter(deleted=False).order_by('-date')
    serializer_class = TransactionSerializer
    pagination_class = None

    def list(self, request, *args, **kwargs):
        """
        Override list method to return the expected data structure.
        """
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)
        return Response({
            'data': {
                'transactions': serializer.data
            }
        })

class YNABConfigurationView(views.APIView):
    """
    API endpoint for managing YNAB configuration.
    """

    def get(self, request, *args, **kwargs):
        config, created = YNABConfiguration.objects.get_or_create(pk=1)
        sync_knowledge, _ = YNABSync.objects.get_or_create(pk=1)

        data = YNABConfigurationSerializer(config).data
        # Only include last_synced if it actually exists (not null)
        if sync_knowledge.last_synced:
            data['last_synced'] = sync_knowledge.last_synced

        return Response(data)

    def post(self, request, *args, **kwargs):
        config, created = YNABConfiguration.objects.get_or_create(pk=1)
        serializer = YNABConfigurationSerializer(config, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def put(self, request, *args, **kwargs):
        config, _ = YNABConfiguration.objects.get_or_create(pk=1)
        serializer = YNABConfigurationSerializer(config, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def patch(self, request, *args, **kwargs):
        return self.put(request, *args, **kwargs)

class YNABBudgetsView(views.APIView):
    def get(self, request, *args, **kwargs):
        # First try to get API key from headers (for direct API calls)
        api_key = request.headers.get('X-YNAB-API-Key')

        # If not in headers, try to get from database
        if not api_key:
            try:
                config = YNABConfiguration.objects.first()
                if config and config.api_key:
                    api_key = config.api_key
            except YNABConfiguration.DoesNotExist:
                pass  # api_key remains None

        if not api_key:
            return Response({"error": "YNAB API key not configured."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            client = YNABClient(api_key)
            budgets_response = client.get_budgets()

            if budgets_response is not None:
                serializer = YNABBudgetSerializer(budgets_response, many=True)
                return Response({
                    'data': {
                        'budgets': serializer.data
                    }
                })
            else:
                # Assuming get_budgets returns None on failure before raising an exception
                return Response({"error": "Failed to fetch budgets from YNAB."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        except Exception as e:
            logger.error(f"Error fetching YNAB budgets: {e}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class YNABBudgetByIdView(views.APIView):
    def get(self, request, budget_id, *args, **kwargs):
        try:
            config = YNABConfiguration.objects.first()
            if not config or not config.api_key:
                return Response({"error": "YNAB API key not configured."}, status=status.HTTP_400_BAD_REQUEST)

            client = YNABClient(config.api_key)
            budget_response = client.get_budget_by_id(budget_id)

            if budget_response:
                return Response(budget_response)
            else:
                return Response({"error": "Failed to fetch budget from YNAB."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        except Exception as e:
            logger.error(f"Error fetching YNAB budget by ID: {e}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class YNABMonthsView(views.APIView):
    def get(self, request, *args, **kwargs):
        # First try to get API key from headers (for direct API calls)
        api_key = request.headers.get('X-YNAB-API-Key')

        # If not in headers, try to get from database
        if not api_key:
            try:
                config = YNABConfiguration.objects.first()
                if config and config.api_key:
                    api_key = config.api_key
            except YNABConfiguration.DoesNotExist:
                pass  # api_key remains None

        if not api_key:
            return Response({"error": "YNAB API key not configured."}, status=status.HTTP_400_BAD_REQUEST)

        # Get budget_id from database
        try:
            config = YNABConfiguration.objects.first()
            budget_id = config.budget_id if config else None
        except YNABConfiguration.DoesNotExist:
            budget_id = None

        if not budget_id:
            return Response({"error": "YNAB budget ID not configured."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            client = YNABClient(api_key)
            months_response = client.get_months(budget_id)

            if months_response is not None:
                return Response({
                    'data': {
                        'months': months_response
                    }
                })
            else:
                return Response({"error": "Failed to fetch months from YNAB."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        except Exception as e:
            logger.error(f"Error fetching YNAB months: {e}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class YNABUserView(views.APIView):
    def get(self, request, *args, **kwargs):
        # First try to get API key from headers (for direct API calls)
        api_key = request.headers.get('X-YNAB-API-Key')

        # If not in headers, try to get from database
        if not api_key:
            try:
                config = YNABConfiguration.objects.get(pk=1)
                api_key = config.api_key
            except YNABConfiguration.DoesNotExist:
                return Response({"message": "YNAB is not configured."}, status=status.HTTP_400_BAD_REQUEST)

        if not api_key:
            return Response({"message": "API key must be configured."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            client = YNABClient(api_key)
            user_data = client.get_user()
            logger.info(f"YNAB User data retrieved: {user_data}")
            return Response(user_data)

        except requests.exceptions.HTTPError as e:
            logger.error("YNAB API Error during User fetch", exc_info=True)
            return Response({"message": f"YNAB API Error: {e.response.reason}"}, status=e.response.status_code)
        except Exception as e:
            logger.error("An unexpected error occurred during YNAB User fetch", exc_info=True)
            return Response({"message": f"An unexpected error occurred: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class YNABAPIEndpointsView(views.APIView):
    """
    API endpoint for testing and exploring YNAB API endpoints.
    """

    def get(self, request, *args, **kwargs):
        """Get available endpoints and their metadata"""
        endpoints = {
            "user": {
                "title": "User",
                "endpoints": [
                    {
                        "method": "GET",
                        "path": "/user",
                        "description": "Returns authenticated user information",
                        "parameters": [],
                        "variables": []
                    }
                ]
            },
            "budgets": {
                "title": "Budgets",
                "endpoints": [
                    {
                        "method": "GET",
                        "path": "/budgets",
                        "description": "Returns budgets list with summary information",
                        "parameters": [],
                        "variables": []
                    },
                    {
                        "method": "GET",
                        "path": "/budgets/{budget_id}",
                        "description": "Returns a single budget with all related entities",
                        "parameters": ["last_knowledge_of_server"],
                        "variables": ["budget_id"]
                    },
                    {
                        "method": "GET",
                        "path": "/budgets/{budget_id}/settings",
                        "description": "Returns settings for a budget",
                        "parameters": [],
                        "variables": ["budget_id"]
                    }
                ]
            },
            "accounts": {
                "title": "Accounts",
                "endpoints": [
                    {
                        "method": "GET",
                        "path": "/budgets/{budget_id}/accounts",
                        "description": "Returns all accounts for the specified budget",
                        "parameters": [],
                        "variables": ["budget_id"]
                    },
                    {
                        "method": "POST",
                        "path": "/budgets/{budget_id}/accounts",
                        "description": "Creates a new account",
                        "parameters": ["account"],
                        "variables": ["budget_id"]
                    },
                    {
                        "method": "GET",
                        "path": "/budgets/{budget_id}/accounts/{account_id}",
                        "description": "Returns a single account",
                        "parameters": [],
                        "variables": ["budget_id", "account_id"]
                    }
                ]
            },
            "categories": {
                "title": "Categories",
                "endpoints": [
                    {
                        "method": "GET",
                        "path": "/budgets/{budget_id}/categories",
                        "description": "Returns all categories grouped by category group",
                        "parameters": [],
                        "variables": ["budget_id"]
                    },
                    {
                        "method": "GET",
                        "path": "/budgets/{budget_id}/categories/{category_id}",
                        "description": "Returns a single category",
                        "parameters": [],
                        "variables": ["budget_id", "category_id"]
                    },
                    {
                        "method": "PATCH",
                        "path": "/budgets/{budget_id}/categories/{category_id}",
                        "description": "Updates a category",
                        "parameters": ["category"],
                        "variables": ["budget_id", "category_id"]
                    },
                    {
                        "method": "GET",
                        "path": "/budgets/{budget_id}/months/{month}/categories/{category_id}",
                        "description": "Returns a specific category for a specific month",
                        "parameters": [],
                        "variables": ["budget_id", "month", "category_id"]
                    },
                    {
                        "method": "PATCH",
                        "path": "/budgets/{budget_id}/months/{month}/categories/{category_id}",
                        "description": "Updates a category for a specific month",
                        "parameters": ["category"],
                        "variables": ["budget_id", "month", "category_id"]
                    }
                ]
            },
            "payees": {
                "title": "Payees",
                "endpoints": [
                    {
                        "method": "GET",
                        "path": "/budgets/{budget_id}/payees",
                        "description": "Returns all payees",
                        "parameters": [],
                        "variables": ["budget_id"]
                    },
                    {
                        "method": "GET",
                        "path": "/budgets/{budget_id}/payees/{payee_id}",
                        "description": "Returns a single payee",
                        "parameters": [],
                        "variables": ["budget_id", "payee_id"]
                    },
                    {
                        "method": "PATCH",
                        "path": "/budgets/{budget_id}/payees/{payee_id}",
                        "description": "Updates a payee",
                        "parameters": ["payee"],
                        "variables": ["budget_id", "payee_id"]
                    }
                ]
            },
            "payee_locations": {
                "title": "Payee Locations",
                "endpoints": [
                    {
                        "method": "GET",
                        "path": "/budgets/{budget_id}/payee_locations",
                        "description": "Returns all payee locations",
                        "parameters": [],
                        "variables": ["budget_id"]
                    },
                    {
                        "method": "GET",
                        "path": "/budgets/{budget_id}/payee_locations/{payee_location_id}",
                        "description": "Returns a single payee location",
                        "parameters": [],
                        "variables": ["budget_id", "payee_location_id"]
                    },
                    {
                        "method": "GET",
                        "path": "/budgets/{budget_id}/payees/{payee_id}/payee_locations",
                        "description": "Returns all payee locations for a specific payee",
                        "parameters": [],
                        "variables": ["budget_id", "payee_id"]
                    }
                ]
            },
            "months": {
                "title": "Months",
                "endpoints": [
                    {
                        "method": "GET",
                        "path": "/budgets/{budget_id}/months",
                        "description": "Returns all budget months",
                        "parameters": [],
                        "variables": ["budget_id"]
                    },
                    {
                        "method": "GET",
                        "path": "/budgets/{budget_id}/months/{month}",
                        "description": "Returns a single budget month",
                        "parameters": [],
                        "variables": ["budget_id", "month"]
                    }
                ]
            },
            "transactions": {
                "title": "Transactions",
                "endpoints": [
                    {
                        "method": "GET",
                        "path": "/budgets/{budget_id}/transactions",
                        "description": "Returns budget transactions",
                        "parameters": ["since_date", "type", "last_knowledge_of_server"],
                        "variables": ["budget_id"]
                    },
                    {
                        "method": "POST",
                        "path": "/budgets/{budget_id}/transactions",
                        "description": "Creates a new transaction",
                        "parameters": ["transaction"],
                        "variables": ["budget_id"]
                    },
                    {
                        "method": "PATCH",
                        "path": "/budgets/{budget_id}/transactions",
                        "description": "Updates multiple transactions",
                        "parameters": ["transactions"],
                        "variables": ["budget_id"]
                    },
                    {
                        "method": "POST",
                        "path": "/budgets/{budget_id}/transactions/import",
                        "description": "Imports transactions from a file",
                        "parameters": ["import_id", "transactions"],
                        "variables": ["budget_id"]
                    },
                    {
                        "method": "GET",
                        "path": "/budgets/{budget_id}/transactions/{transaction_id}",
                        "description": "Returns a single transaction",
                        "parameters": [],
                        "variables": ["budget_id", "transaction_id"]
                    },
                    {
                        "method": "PUT",
                        "path": "/budgets/{budget_id}/transactions/{transaction_id}",
                        "description": "Updates a single transaction",
                        "parameters": ["transaction"],
                        "variables": ["budget_id", "transaction_id"]
                    },
                    {
                        "method": "DELETE",
                        "path": "/budgets/{budget_id}/transactions/{transaction_id}",
                        "description": "Deletes a transaction",
                        "parameters": [],
                        "variables": ["budget_id", "transaction_id"]
                    },
                    {
                        "method": "GET",
                        "path": "/budgets/{budget_id}/accounts/{account_id}/transactions",
                        "description": "Returns transactions for a specific account",
                        "parameters": ["since_date", "type", "last_knowledge_of_server"],
                        "variables": ["budget_id", "account_id"]
                    },
                    {
                        "method": "GET",
                        "path": "/budgets/{budget_id}/categories/{category_id}/transactions",
                        "description": "Returns transactions for a specific category",
                        "parameters": ["since_date", "type", "last_knowledge_of_server"],
                        "variables": ["budget_id", "category_id"]
                    },
                    {
                        "method": "GET",
                        "path": "/budgets/{budget_id}/payees/{payee_id}/transactions",
                        "description": "Returns transactions for a specific payee",
                        "parameters": ["since_date", "type", "last_knowledge_of_server"],
                        "variables": ["budget_id", "payee_id"]
                    },
                    {
                        "method": "GET",
                        "path": "/budgets/{budget_id}/months/{month}/transactions",
                        "description": "Returns transactions for a specific month",
                        "parameters": ["since_date", "type", "last_knowledge_of_server"],
                        "variables": ["budget_id", "month"]
                    }
                ]
            },
            "scheduled_transactions": {
                "title": "Scheduled Transactions",
                "endpoints": [
                    {
                        "method": "GET",
                        "path": "/budgets/{budget_id}/scheduled_transactions",
                        "description": "Returns all scheduled transactions",
                        "parameters": [],
                        "variables": ["budget_id"]
                    },
                    {
                        "method": "POST",
                        "path": "/budgets/{budget_id}/scheduled_transactions",
                        "description": "Creates a new scheduled transaction",
                        "parameters": ["scheduled_transaction"],
                        "variables": ["budget_id"]
                    },
                    {
                        "method": "GET",
                        "path": "/budgets/{budget_id}/scheduled_transactions/{scheduled_transaction_id}",
                        "description": "Returns a single scheduled transaction",
                        "parameters": [],
                        "variables": ["budget_id", "scheduled_transaction_id"]
                    },
                    {
                        "method": "PUT",
                        "path": "/budgets/{budget_id}/scheduled_transactions/{scheduled_transaction_id}",
                        "description": "Updates a scheduled transaction",
                        "parameters": ["scheduled_transaction"],
                        "variables": ["budget_id", "scheduled_transaction_id"]
                    },
                    {
                        "method": "DELETE",
                        "path": "/budgets/{budget_id}/scheduled_transactions/{scheduled_transaction_id}",
                        "description": "Deletes a scheduled transaction",
                        "parameters": [],
                        "variables": ["budget_id", "scheduled_transaction_id"]
                    }
                ]
            }
        }

        return Response(endpoints)

    def post(self, request, *args, **kwargs):
        """Make a YNAB API call"""
        try:
            config = YNABConfiguration.objects.get(pk=1)
            api_key = config.api_key
        except YNABConfiguration.DoesNotExist:
            return Response({"error": "YNAB is not configured."}, status=status.HTTP_400_BAD_REQUEST)

        if not api_key:
            return Response({"error": "API key must be configured."}, status=status.HTTP_400_BAD_REQUEST)

        # Get request data
        method = request.data.get('method', 'GET')
        endpoint = request.data.get('endpoint', '')
        variables = request.data.get('variables', {})
        parameters = request.data.get('parameters', {})
        body = request.data.get('body', {})

        # Build the URL
        url = f"https://api.ynab.com/v1{endpoint}"

        # Replace variables in the URL
        for var_name, var_value in variables.items():
            url = url.replace(f"{{{var_name}}}", str(var_value))

        # Add query parameters
        if parameters:
            query_params = []
            for key, value in parameters.items():
                if value is not None and value != '':
                    query_params.append(f"{key}={value}")
            if query_params:
                url += "?" + "&".join(query_params)

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }

        try:
            if method.upper() == 'GET':
                response = requests.get(url, headers=headers)
            elif method.upper() == 'POST':
                response = requests.post(url, headers=headers, json=body)
            elif method.upper() == 'PUT':
                response = requests.put(url, headers=headers, json=body)
            elif method.upper() == 'PATCH':
                response = requests.patch(url, headers=headers, json=body)
            elif method.upper() == 'DELETE':
                response = requests.delete(url, headers=headers)
            else:
                return Response({"error": f"Unsupported HTTP method: {method}"}, status=status.HTTP_400_BAD_REQUEST)

            response.raise_for_status()

            # Try to parse JSON response
            try:
                response_data = response.json()
            except:
                response_data = {"raw_text": response.text}

            return Response({
                "status": response.status_code,
                "url": url,
                "method": method.upper(),
                "data": response_data
            })

        except requests.exceptions.HTTPError as e:
            error_data = {"error": f"HTTP {e.response.status_code}: {e.response.reason}"}
            try:
                error_data["details"] = e.response.json()
            except:
                error_data["details"] = e.response.text

            return Response(error_data, status=e.response.status_code)
        except Exception as e:
            return Response({"error": f"Request failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class CrossReferenceView(views.APIView):
    """
    API endpoint for managing cross-references for YNAB data.
    """

    def get(self, request, record_type, *args, **kwargs):
        """Get cross-references for a specific record type"""
        try:
            cross_refs = CrossReference.objects.filter(record_type=record_type)
            data = []
            for ref in cross_refs:
                data.append({
                    'sourceValue': ref.source_value,
                    'displayValue': ref.display_value,
                    'enabled': ref.enabled,
                    'column': ref.column
                })
            return Response({'cross_references': data})
        except Exception as e:
            logger.error(f"Error fetching cross-references: {e}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def post(self, request, record_type, *args, **kwargs):
        """Create or update cross-references for a specific record type"""
        try:
            cross_references = request.data.get('cross_references', [])

            # Clear existing cross-references for this record type
            CrossReference.objects.filter(record_type=record_type).delete()

            # Create new cross-references
            for ref_data in cross_references:
                # Handle both camelCase and snake_case field names
                source_value = ref_data.get('source_value') or ref_data.get('sourceValue')
                display_value = ref_data.get('display_value') or ref_data.get('displayValue')
                enabled = ref_data.get('enabled', True)
                column = ref_data.get('column', 'type')  # Default to 'type' for backward compatibility

                if not source_value or not display_value:
                    logger.error(f"Missing required fields in cross-reference data: {ref_data}")
                    continue

                CrossReference.objects.create(
                    record_type=record_type,
                    column=column,
                    source_value=source_value,
                    display_value=display_value,
                    enabled=enabled
                )

            return Response({'message': 'Cross-references saved successfully'})
        except Exception as e:
            logger.error(f"Error saving cross-references: {e}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class ColumnConfigurationView(views.APIView):
    """
    API endpoint for managing column configurations for YNAB data.
    """

    def get(self, request, *args, **kwargs):
        """Get column configurations for all record types"""
        try:
            configs = ColumnConfiguration.objects.all()
            data = []
            for config in configs:
                data.append({
                    'record_type': config.record_type,
                    'field': config.field,
                    'header_name': config.header_name,
                    'visible': config.visible,
                    'order': config.order,
                    'width': config.width,
                    'use_checkbox': config.use_checkbox,
                    'use_currency': config.use_currency,
                    'invert_negative_sign': config.invert_negative_sign,
                    'disable_negative_sign': config.disable_negative_sign,
                    'use_thousands_separator': config.use_thousands_separator,
                    'use_datetime': config.use_datetime,
                    'datetime_format': config.datetime_format,
                })
            return Response({'data': {'column_configurations': data}})
        except Exception as e:
            logger.error(f"Error fetching column configurations: {e}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def post(self, request, *args, **kwargs):
        """Create or update column configurations"""
        try:
            configurations = request.data.get('configurations', [])

            # Clear existing configurations
            ColumnConfiguration.objects.all().delete()

            # Create new configurations
            for config_data in configurations:
                ColumnConfiguration.objects.create(
                    record_type=config_data['record_type'],
                    field=config_data['field'],
                    header_name=config_data['header_name'],
                    visible=config_data.get('visible', True),
                    order=config_data.get('order', 0),
                    width=config_data.get('width'),
                    use_checkbox=config_data.get('use_checkbox'),
                    use_currency=config_data.get('use_currency'),
                    invert_negative_sign=config_data.get('invert_negative_sign'),
                    disable_negative_sign=config_data.get('disable_negative_sign'),
                    use_thousands_separator=config_data.get('use_thousands_separator'),
                    use_datetime=config_data.get('use_datetime'),
                    datetime_format=config_data.get('datetime_format'),
                )

            return Response({'message': 'Column configurations saved successfully'})
        except Exception as e:
            logger.error(f"Error saving column configurations: {e}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AccountTypeMappingView(views.APIView):
    """
    API endpoint for managing YNAB account type to core record type mappings.
    """

    def get(self, request, *args, **kwargs):
        """Get account type mappings"""
        try:
            mappings = AccountTypeMapping.objects.all()
            data = []
            for mapping in mappings:
                data.append({
                    'ynabType': mapping.ynab_type,
                    'coreRecordType': mapping.core_record_type,
                    'defaultSubtypeId': mapping.default_subtype_id,
                    'enabled': mapping.enabled,
                })
            return Response(data)
        except Exception as e:
            logger.error(f"Error fetching account type mappings: {e}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def post(self, request, *args, **kwargs):
        """Create or update account type mappings"""
        try:
            mappings_data = request.data.get('mappings', [])

            # Clear existing mappings
            AccountTypeMapping.objects.all().delete()

            # Create new mappings
            for mapping_data in mappings_data:
                # Handle both camelCase and snake_case field names
                ynab_type = mapping_data.get('ynabType') or mapping_data.get('ynab_type')
                core_record_type = mapping_data.get('coreRecordType') or mapping_data.get('core_record_type')
                default_subtype_id = mapping_data.get('defaultSubtypeId') or mapping_data.get('default_subtype_id')
                enabled = mapping_data.get('enabled', True)

                if not ynab_type or not core_record_type:
                    logger.error(f"Missing required fields in mapping data: {mapping_data}")
                    continue

                AccountTypeMapping.objects.create(
                    ynab_type=ynab_type,
                    core_record_type=core_record_type,
                    default_subtype_id=default_subtype_id,
                    enabled=enabled
                )

            return Response({'message': 'Account type mappings saved successfully'})
        except Exception as e:
            logger.error(f"Error saving account type mappings: {e}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class SyncView(views.APIView):
    def post(self, request, *args, **kwargs):
        try:
            config = YNABConfiguration.objects.get(pk=1)
            api_key = config.api_key
            budget_id = config.budget_id
        except YNABConfiguration.DoesNotExist:
            return Response({"message": "YNAB is not configured. Please configure YNAB in Settings before syncing."}, status=status.HTTP_200_OK)

        logger.info(f"Attempting YNAB sync for budget_id: '{budget_id}' with api_key: '{api_key[:5] if api_key else 'None'}...'")

        if not api_key or not budget_id:
            logger.info("Sync skipped: API key or budget ID is missing.")
            return Response({"message": "YNAB is not configured. Please configure API key and budget ID in Settings before syncing."}, status=status.HTTP_200_OK)

        try:
            sync_knowledge, _ = YNABSync.objects.get_or_create(pk=1)
            last_server_knowledge = sync_knowledge.server_knowledge

            url = f"https://api.ynab.com/v1/budgets/{budget_id}"
            headers = {"Authorization": f"Bearer {api_key}"}
            params = {}
            if last_server_knowledge > 0:
                params['last_knowledge_of_server'] = last_server_knowledge

            response = requests.get(url, headers=headers, params=params)
            response.raise_for_status()

            data = response.json()['data']
            budget_data = data['budget']
            server_knowledge = data['server_knowledge']

            # Debug logging
            logger.info(f"Budget data keys: {list(budget_data.keys())}")
            logger.info(f"Category groups count: {len(budget_data.get('category_groups', []))}")
            logger.info(f"Accounts count: {len(budget_data.get('accounts', []))}")
            logger.info(f"Payees count: {len(budget_data.get('payees', []))}")
            logger.info(f"Transactions count: {len(budget_data.get('transactions', []))}")

            # Process Accounts
            accounts_synced = self.sync_accounts(budget_data.get('accounts', []))

            # Process Payees
            payees_synced = self.sync_payees(budget_data.get('payees', []))

            # Process Category Groups and Categories
            (groups_synced, cats_synced) = self.sync_categories(budget_data.get('category_groups', []), budget_data.get('categories', []))

            # Process Transactions and Subtransactions
            (trans_synced, subtrans_synced) = self.sync_transactions(budget_data.get('transactions', []))

            sync_knowledge.server_knowledge = server_knowledge
            sync_knowledge.update_sync_timestamp()

            message = (
                f"Sync successful! "
                f"Accounts: {accounts_synced}, "
                f"Payees: {payees_synced}, "
                f"Category Groups: {groups_synced}, "
                f"Categories: {cats_synced}, "
                f"Transactions: {trans_synced}, "
                f"Subtransactions: {subtrans_synced}."
            )
            return Response({"message": message})

        except requests.exceptions.HTTPError as e:
            logger.error("YNAB API Error during sync", exc_info=True)
            return Response({"message": f"YNAB API Error: {e.response.reason}"}, status=e.response.status_code)
        except Exception as e:
            logger.error("An unexpected error occurred during YNAB sync", exc_info=True)
            return Response({"message": f"An unexpected error occurred: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def _sync_model(self, model_class, data, id_field='id'):
        existing_ids = set(model_class.objects.values_list(id_field, flat=True))
        to_create = []
        to_update = []

        # Get the set of valid field names, including the raw `_id` fields for foreign keys
        model_fields = set()
        for f in model_class._meta.get_fields():
            model_fields.add(f.name)
            if hasattr(f, 'attname'):
                model_fields.add(f.attname)

        for item_data in data:
            # Filter the dictionary to only include keys that are actual model fields
            filtered_data = {k: v for k, v in item_data.items() if k in model_fields}

            item_id = filtered_data.get(id_field)
            if not item_id:
                continue

            instance = model_class(**filtered_data)

            if item_id in existing_ids:
                to_update.append(instance)
            else:
                to_create.append(instance)

        # Bulk operations
        if to_create:
            model_class.objects.bulk_create(to_create)

        if to_update:
            # Get only the concrete fields of the model to update them, excluding the primary key
            fields_to_update = [f.name for f in model_class._meta.get_fields() if f.concrete and not f.primary_key]
            model_class.objects.bulk_update(to_update, fields_to_update)

        return len(to_create), len(to_update)

    def sync_accounts(self, accounts_data):
        # ... (sync logic for transfer payees remains important)
        existing_payee_ids = set(Payee.objects.values_list('id', flat=True))
        for item in accounts_data:
            transfer_payee_id = item.get('transfer_payee_id')
            if transfer_payee_id and transfer_payee_id not in existing_payee_ids:
                Payee.objects.create(
                    id=transfer_payee_id,
                    name=f"Transfer : {item.get('name')}",
                    deleted=False
                )
                existing_payee_ids.add(transfer_payee_id)

        created, updated = self._sync_model(YNABAccount, accounts_data)

        # After syncing YNAB accounts, automatically sync linked core accounts
        self._auto_sync_linked_accounts()

        return f"{created} created, {updated} updated"

    def _auto_sync_linked_accounts(self):
        """Automatically sync all linked core accounts when YNAB accounts are updated"""
        from django.contrib.contenttypes.models import ContentType
        from api.models import Link
        from accounts.models import Account

        try:
            # Get all links where core object is an Account and plugin object is a YNABAccount
            account_content_type = ContentType.objects.get_for_model(Account)
            ynab_account_content_type = ContentType.objects.get_for_model(YNABAccount)

            links = Link.objects.filter(
                core_content_type=account_content_type,
                plugin_content_type=ynab_account_content_type
            )

            synced_count = 0
            for link in links:
                try:
                    core_account = link.core_object
                    ynab_account = link.plugin_object

                    if core_account and ynab_account:
                        # Use the sync_from_ynab method to update the core account
                        success = core_account.sync_from_ynab(ynab_account)
                        if success:
                            synced_count += 1
                            logger.info(f"Auto-synced core account {core_account.name} from YNAB account {ynab_account.name}")
                        else:
                            logger.warning(f"Failed to auto-sync core account {core_account.name}")
                except Exception as e:
                    logger.error(f"Error auto-syncing account link {link.id}: {str(e)}")
                    continue

            logger.info(f"Auto-sync completed: {synced_count} core accounts updated")

        except Exception as e:
            logger.error(f"Error in auto-sync process: {str(e)}")

    def sync_payees(self, payees_data):
        created, updated = self._sync_model(Payee, payees_data)
        return f"{created} created, {updated} updated"

    def sync_categories(self, category_groups_data, categories_data):
        logger.info(f"Starting sync_categories with {len(category_groups_data)} category groups and {len(categories_data)} categories")

        # Sync category groups first
        groups_to_sync = []
        for group_item in category_groups_data:
            logger.info(f"Processing group: {group_item.get('name', 'Unknown')} with ID: {group_item.get('id', 'Unknown')}")
            # Remove categories from group data since we'll handle them separately
            group_item.pop('categories', [])
            groups_to_sync.append(group_item)

        # Sync categories with their group relationships
        all_categories_data = []
        for cat_item in categories_data:
            logger.info(f"Processing category: {cat_item.get('name', 'Unknown')} with ID: {cat_item.get('id', 'Unknown')} in group: {cat_item.get('category_group_name', 'Unknown')}")
            all_categories_data.append(cat_item)

        logger.info(f"Total categories to sync: {len(all_categories_data)}")
        logger.info(f"Total groups to sync: {len(groups_to_sync)}")

        g_created, g_updated = self._sync_model(CategoryGroup, groups_to_sync)
        c_created, c_updated = self._sync_model(Category, all_categories_data)

        logger.info(f"Category sync results: Groups - {g_created} created, {g_updated} updated; Categories - {c_created} created, {c_updated} updated")
        return (f"G: {g_created}c/{g_updated}u", f"C: {c_created}c/{c_updated}u")

    def sync_transactions(self, transactions_data):
        # Pre-fetch for validation
        existing_account_ids = set(YNABAccount.objects.values_list('id', flat=True))
        existing_payee_ids = set(Payee.objects.values_list('id', flat=True))
        existing_category_ids = set(Category.objects.values_list('id', flat=True))

        valid_transactions = []
        all_subtransactions = []

        for trans_item in transactions_data:
            account_id = trans_item.get('account_id')
            if not account_id or account_id not in existing_account_ids:
                continue

            payee_id = trans_item.get('payee_id')
            if payee_id and payee_id not in existing_payee_ids:
                trans_item['payee_id'] = None

            category_id = trans_item.get('category_id')
            if category_id and category_id not in existing_category_ids:
                trans_item['category_id'] = None

            subtransactions = trans_item.pop('subtransactions', [])
            valid_transactions.append(trans_item)

            for sub_item in subtransactions:
                sub_item['transaction_id'] = trans_item.get('id')
                # Nullify missing FKs for subtransactions too
                sub_payee_id = sub_item.get('payee_id')
                if sub_payee_id and sub_payee_id not in existing_payee_ids:
                    sub_item['payee_id'] = None

                sub_category_id = sub_item.get('category_id')
                if sub_category_id and sub_category_id not in existing_category_ids:
                    sub_item['category_id'] = None
                all_subtransactions.append(sub_item)

        t_created, t_updated = self._sync_model(Transaction, valid_transactions)
        st_created, st_updated = self._sync_model(Subtransaction, all_subtransactions)

        return (f"T: {t_created}c/{t_updated}u", f"ST: {st_created}c/{st_updated}u")