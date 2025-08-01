import os
import requests
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from ynab.models import Category, CategoryGroup, Payee, YNABAccount

# Create your views here.

class SyncView(APIView):
    """
    A view to trigger the YNAB synchronization process.
    """
    def post(self, request, *args, **kwargs):
        api_key = os.getenv("YNAB_API_KEY")
        budget_id = os.getenv("YNAB_BUDGET_ID")

        if not api_key or not budget_id:
            return Response(
                {"error": "YNAB_API_KEY and YNAB_BUDGET_ID must be set in the addon configuration."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        headers = {"Authorization": f"Bearer {api_key}"}

        try:
            # Sync Categories
            categories_url = f"https://api.youneedabudget.com/v1/budgets/{budget_id}/categories"
            categories_response = requests.get(categories_url, headers=headers)
            categories_response.raise_for_status()

            category_groups_data = categories_response.json()["data"]["category_groups"]

            for group_data in category_groups_data:
                group, created = CategoryGroup.objects.update_or_create(
                    id=group_data['id'],
                    defaults={
                        'name': group_data['name'],
                        'hidden': group_data['hidden'],
                        'deleted': group_data['deleted'],
                    }
                )

                for category_data in group_data['categories']:
                    Category.objects.update_or_create(
                        id=category_data['id'],
                        defaults={
                            'category_group': group,
                            'category_group_name': category_data['category_group_name'],
                            'name': category_data['name'],
                            'hidden': category_data['hidden'],
                            'original_category_group_id': category_data.get('original_category_group_id'),
                            'note': category_data.get('note'),
                            'budgeted': category_data['budgeted'],
                            'activity': category_data['activity'],
                            'balance': category_data['balance'],
                            'goal_type': category_data.get('goal_type'),
                            'goal_day': category_data.get('goal_day'),
                            'goal_cadence': category_data.get('goal_cadence'),
                            'goal_cadence_frequency': category_data.get('goal_cadence_frequency'),
                            'goal_creation_month': category_data.get('goal_creation_month'),
                            'goal_target': category_data.get('goal_target'),
                            'goal_target_month': category_data.get('goal_target_month'),
                            'goal_percentage_complete': category_data.get('goal_percentage_complete'),
                            'goal_months_to_budget': category_data.get('goal_months_to_budget'),
                            'goal_under_funded': category_data.get('goal_under_funded'),
                            'goal_overall_funded': category_data.get('goal_overall_funded'),
                            'goal_overall_left': category_data.get('goal_overall_left'),
                            'deleted': category_data['deleted'],
                        }
                    )

            # Sync Payees
            payees_url = f"https://api.youneedabudget.com/v1/budgets/{budget_id}/payees"
            payees_response = requests.get(payees_url, headers=headers)
            payees_response.raise_for_status()

            payees_data = payees_response.json()["data"]["payees"]

            for payee_data in payees_data:
                Payee.objects.update_or_create(
                    id=payee_data['id'],
                    defaults={
                        'name': payee_data['name'],
                        'transfer_account_id': payee_data.get('transfer_account_id'),
                        'deleted': payee_data['deleted']
                    }
                )

            # Sync Accounts
            accounts_url = f"https://api.youneedabudget.com/v1/budgets/{budget_id}/accounts"
            accounts_response = requests.get(accounts_url, headers=headers)
            accounts_response.raise_for_status()

            accounts_data = accounts_response.json()["data"]["accounts"]

            for account_data in accounts_data:
                if not account_data['closed']:
                    YNABAccount.objects.update_or_create(
                        id=account_data['id'],
                        defaults={
                            'name': account_data['name'],
                            'type': account_data['type'],
                            'on_budget': account_data['on_budget'],
                            'closed': account_data['closed'],
                            'note': account_data.get('note'),
                            'balance': account_data['balance'],
                            'cleared_balance': account_data['cleared_balance'],
                            'uncleared_balance': account_data['uncleared_balance'],
                            'transfer_payee_id': account_data['transfer_payee_id'],
                            'direct_import_linked': account_data.get('direct_import_linked', False),
                            'direct_import_in_error': account_data.get('direct_import_in_error', False),
                            'last_reconciled_at': account_data.get('last_reconciled_at'),
                            'debt_original_balance': account_data.get('debt_original_balance'),
                            'debt_interest_rates': account_data.get('debt_interest_rates', {}),
                            'debt_minimum_payments': account_data.get('debt_minimum_payments', {}),
                            'debt_escrow_amounts': account_data.get('debt_escrow_amounts', {}),
                            'deleted': account_data['deleted']
                        }
                    )

            return Response(
                {"message": "YNAB data synchronized successfully."},
                status=status.HTTP_200_OK,
            )

        except requests.exceptions.RequestException as e:
            return Response(
                {"error": f"Failed to connect to YNAB API: {e}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
