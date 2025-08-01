import time
from django.db import connection
from django.db.models import Q, Sum, Count, Avg, Min, Max
from django.utils import timezone
from datetime import datetime, timedelta
from decimal import Decimal
import json
from .models import Query, QueryResult, QueryTemplate, Transaction, CreditCard, Asset, Liability
from fa_budget.models import BudgetCategory as Category, BudgetPayee as Payee
from accounts.models import Account

class QueryExecutor:
    """Executes custom queries and returns results"""

    def execute_query(self, query):
        """Execute a query and return results"""
        start_time = time.time()

        try:
            if query.query_type == 'CUSTOM':
                result_data = self._execute_custom_sql(query)
            else:
                result_data = self._execute_orm_query(query)

            execution_time_ms = int((time.time() - start_time) * 1000)

            # Save result
            QueryResult.objects.create(
                query=query,
                execution_time_ms=execution_time_ms,
                status='SUCCESS',
                result_count=len(result_data) if isinstance(result_data, list) else 1,
                result_data=result_data,
                parameters_used=query.parameters
            )

            # Update query last_executed
            query.last_executed = timezone.now()
            query.save(update_fields=['last_executed'])

            return {
                'status': 'success',
                'data': result_data,
                'execution_time_ms': execution_time_ms,
                'result_count': len(result_data) if isinstance(result_data, list) else 1
            }

        except Exception as e:
            execution_time_ms = int((time.time() - start_time) * 1000)

            # Save error result
            QueryResult.objects.create(
                query=query,
                execution_time_ms=execution_time_ms,
                status='ERROR',
                result_count=0,
                error_message=str(e),
                parameters_used=query.parameters
            )

            return {
                'status': 'error',
                'error': str(e),
                'execution_time_ms': execution_time_ms
            }

    def _execute_orm_query(self, query):
        """Execute ORM-based queries"""
        query_type = query.query_type
        parameters = query.parameters

        if query_type == 'TRANSACTIONS':
            return self._query_transactions(parameters)
        elif query_type == 'ACCOUNTS':
            return self._query_accounts(parameters)
        elif query_type == 'CATEGORIES':
            return self._query_categories(parameters)
        elif query_type == 'PAYEES':
            return self._query_payees(parameters)
        else:
            raise ValueError(f"Unknown query type: {query_type}")

    def _execute_custom_sql(self, query):
        """Execute custom SQL queries"""
        if not query.sql_query:
            raise ValueError("No SQL query provided")

        with connection.cursor() as cursor:
            cursor.execute(query.sql_query)

            # Get column names
            columns = [col[0] for col in cursor.description]

            # Fetch results
            rows = cursor.fetchall()

            # Convert to list of dictionaries
            results = []
            for row in rows:
                row_dict = {}
                for i, value in enumerate(row):
                    # Handle Decimal types for JSON serialization
                    if isinstance(value, Decimal):
                        value = float(value)
                    elif isinstance(value, datetime):
                        value = value.isoformat()
                    row_dict[columns[i]] = value
                results.append(row_dict)

            return results

    def _query_transactions(self, parameters):
        """Query transactions with various filters"""
        queryset = Transaction.objects.all()

        # Apply filters
        if 'date_from' in parameters:
            queryset = queryset.filter(date__gte=parameters['date_from'])

        if 'date_to' in parameters:
            queryset = queryset.filter(date__lte=parameters['date_to'])

        if 'min_amount' in parameters:
            queryset = queryset.filter(amount__gte=parameters['min_amount'])

        if 'max_amount' in parameters:
            queryset = queryset.filter(amount__lte=parameters['max_amount'])

        if 'category_id' in parameters:
            queryset = queryset.filter(category_id=parameters['category_id'])

        if 'payee_id' in parameters:
            queryset = queryset.filter(payee_id=parameters['payee_id'])

        if 'account_id' in parameters:
            queryset = queryset.filter(account_id=parameters['account_id'])

        if 'credit_card_id' in parameters:
            queryset = queryset.filter(credit_card_id=parameters['credit_card_id'])

        # Apply aggregations if specified
        if 'aggregate' in parameters:
            aggregate_type = parameters['aggregate']
            if aggregate_type == 'sum':
                result = queryset.aggregate(total=Sum('amount'))
                return [{'total': float(result['total'] or 0)}]
            elif aggregate_type == 'count':
                result = queryset.aggregate(count=Count('id'))
                return [{'count': result['count']}]
            elif aggregate_type == 'avg':
                result = queryset.aggregate(average=Avg('amount'))
                return [{'average': float(result['average'] or 0)}]

        # Apply ordering
        if 'order_by' in parameters:
            queryset = queryset.order_by(parameters['order_by'])
        else:
            queryset = queryset.order_by('-date')

        # Apply limit
        if 'limit' in parameters:
            queryset = queryset[:parameters['limit']]

        # Serialize results
        results = []
        for transaction in queryset:
            results.append({
                'id': str(transaction.id),
                'date': transaction.date.isoformat(),
                'amount': float(transaction.amount),
                'memo': transaction.memo,
                'category': transaction.category.name if transaction.category else None,
                'payee': transaction.payee.name if transaction.payee else None,
                'account': transaction.account.name if transaction.account else None,
                'credit_card': transaction.credit_card.name if transaction.credit_card else None,
            })

        return results

    def _query_accounts(self, parameters):
        """Query accounts with various filters"""
        queryset = Account.objects.all()

        # Apply filters
        if 'account_type_id' in parameters:
            queryset = queryset.filter(account_type_id=parameters['account_type_id'])

        if 'bank_id' in parameters:
            queryset = queryset.filter(bank_id=parameters['bank_id'])

        if 'min_balance' in parameters:
            queryset = queryset.filter(balance__gte=parameters['min_balance'])

        if 'max_balance' in parameters:
            queryset = queryset.filter(balance__lte=parameters['max_balance'])

        if 'allocation' in parameters:
            queryset = queryset.filter(allocation=parameters['allocation'])

        # Apply aggregations if specified
        if 'aggregate' in parameters:
            aggregate_type = parameters['aggregate']
            if aggregate_type == 'sum':
                result = queryset.aggregate(total=Sum('balance'))
                return [{'total': float(result['total'] or 0)}]
            elif aggregate_type == 'count':
                result = queryset.aggregate(count=Count('id'))
                return [{'count': result['count']}]
            elif aggregate_type == 'avg':
                result = queryset.aggregate(average=Avg('balance'))
                return [{'average': float(result['average'] or 0)}]

        # Apply ordering
        if 'order_by' in parameters:
            queryset = queryset.order_by(parameters['order_by'])
        else:
            queryset = queryset.order_by('name')

        # Apply limit
        if 'limit' in parameters:
            queryset = queryset[:parameters['limit']]

        # Debug: Print queryset info
        print(f"DEBUG: Queryset count: {queryset.count()}")

        # Serialize results
        results = []
        for account in queryset:
            try:
                result = {
                    'id': str(account.id),
                    'name': account.name,
                    'account_type': account.account_type.name,
                    'bank': account.bank.name if account.bank else None,
                    'balance': float(account.balance),
                    'allocation': account.allocation,
                    'notes': account.notes,
                }
                print(f"DEBUG: Serialized account: {result}")
                results.append(result)
            except Exception as e:
                print(f"DEBUG: Error serializing account {account.id}: {e}")
                # Still add the account with basic info
                results.append({
                    'id': str(account.id),
                    'name': account.name,
                    'error': f'Serialization error: {str(e)}'
                })

        print(f"DEBUG: Final results count: {len(results)}")
        return results

    def _query_categories(self, parameters):
        """Query categories with various filters"""
        queryset = Category.objects.all()

        # Apply filters
        if 'parent_id' in parameters:
            if parameters['parent_id'] is None:
                queryset = queryset.filter(parent__isnull=True)
            else:
                queryset = queryset.filter(parent_id=parameters['parent_id'])

        # Apply ordering
        if 'order_by' in parameters:
            queryset = queryset.order_by(parameters['order_by'])
        else:
            queryset = queryset.order_by('name')

        # Apply limit
        if 'limit' in parameters:
            queryset = queryset[:parameters['limit']]

        # Serialize results
        results = []
        for category in queryset:
            results.append({
                'id': str(category.id),
                'name': category.name,
                'parent': category.parent.name if category.parent else None,
            })

        return results

    def _query_payees(self, parameters):
        """Query payees with various filters"""
        queryset = Payee.objects.all()

        # Apply filters
        if 'parent_id' in parameters:
            if parameters['parent_id'] is None:
                queryset = queryset.filter(parent__isnull=True)
            else:
                queryset = queryset.filter(parent_id=parameters['parent_id'])

        # Apply ordering
        if 'order_by' in parameters:
            queryset = queryset.order_by(parameters['order_by'])
        else:
            queryset = queryset.order_by('name')

        # Apply limit
        if 'limit' in parameters:
            queryset = queryset[:parameters['limit']]

        # Serialize results
        results = []
        for payee in queryset:
            results.append({
                'id': str(payee.id),
                'name': payee.name,
                'parent': payee.parent.name if payee.parent else None,
            })

        return results

class QueryTemplateManager:
    """Manages predefined query templates"""

    @classmethod
    def create_default_templates(cls):
        """Create default query templates"""
        from .models import QueryTemplate

        templates = [
            {
                'name': 'Recent Transactions',
                'description': 'Get transactions from the last 30 days',
                'query_type': 'TRANSACTIONS',
                'category': 'REPORTING',
                'template_parameters': {
                    'date_from': (timezone.now() - timedelta(days=30)).date().isoformat(),
                    'order_by': '-date',
                    'limit': 100
                }
            },
            {
                'name': 'Account Balances',
                'description': 'Get all account balances',
                'query_type': 'ACCOUNTS',
                'category': 'MONITORING',
                'template_parameters': {
                    'order_by': 'balance'
                }
            },
            {
                'name': 'High Value Transactions',
                'description': 'Get transactions over $1000',
                'query_type': 'TRANSACTIONS',
                'category': 'ANALYTICS',
                'template_parameters': {
                    'min_amount': 1000,
                    'order_by': '-amount',
                    'limit': 50
                }
            },
            {
                'name': 'Total Account Balance',
                'description': 'Sum of all account balances',
                'query_type': 'ACCOUNTS',
                'category': 'REPORTING',
                'template_parameters': {
                    'aggregate': 'sum'
                }
            },
            {
                'name': 'Transaction Count by Category',
                'description': 'Count transactions grouped by category',
                'query_type': 'CUSTOM',
                'category': 'ANALYTICS',
                'sql_template': '''
                    SELECT
                        c.name as category_name,
                        COUNT(t.id) as transaction_count,
                        SUM(t.amount) as total_amount
                    FROM api_transaction t
                    LEFT JOIN api_category c ON t.category_id = c.id
                    WHERE t.date >= %s
                    GROUP BY c.id, c.name
                    ORDER BY transaction_count DESC
                '''
            }
        ]

        for template_data in templates:
            QueryTemplate.objects.get_or_create(
                name=template_data['name'],
                defaults=template_data
            )