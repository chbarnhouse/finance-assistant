from django.shortcuts import render
from rest_framework import viewsets
from rest_framework.response import Response
from django.contrib.contenttypes.models import ContentType
from .models import Bank, AccountType, AssetType, LiabilityType, Account, Transaction
from .serializers import (
    BankSerializer,
    AccountTypeSerializer,
    AssetTypeSerializer,
    LiabilityTypeSerializer,
    AccountSerializer,
    TransactionSerializer,
)
from api.models import Link

# Create your views here.

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

class AccountViewSet(viewsets.ModelViewSet):
    queryset = Account.objects.all()
    serializer_class = AccountSerializer
    pagination_class = None

class TransactionViewSet(viewsets.ModelViewSet):
    queryset = Transaction.objects.all()
    serializer_class = TransactionSerializer
    pagination_class = None

    def list(self, request, *args, **kwargs):
        """Override list to support source filtering and include linked information"""
        queryset = self.filter_queryset(self.get_queryset())

        # Filter by sources if specified
        sources = request.query_params.get('sources')
        if sources:
            source_list = sources.split(',')
            # For now, we'll return YNAB transactions if 'ynab' is in sources
            if 'ynab' in source_list:
                # Import YNAB transactions
                from ynab.models import Transaction as YNABTransaction
                from ynab.serializers import TransactionSerializer as YNABTransactionSerializer

                # Get YNAB transactions with linked information
                ynab_transactions = YNABTransaction.objects.filter(deleted=False).order_by('-date')

                # Convert to the format expected by the frontend
                transactions_data = []
                for ynab_tx in ynab_transactions:
                    # Get linked information
                    linked_account = None
                    linked_category = None
                    linked_payee = None

                    # Check for linked account
                    try:
                        account_link = Link.objects.filter(
                            plugin_content_type=ContentType.objects.get_for_model(ynab_tx.account),
                            plugin_object_id=ynab_tx.account.id
                        ).first()
                        if account_link:
                            linked_account = account_link.core_object.name
                    except:
                        pass

                    # Check for linked category
                    try:
                        category_link = Link.objects.filter(
                            plugin_content_type=ContentType.objects.get_for_model(ynab_tx.category),
                            plugin_object_id=ynab_tx.category.id
                        ).first()
                        if category_link:
                            linked_category = category_link.core_object.name
                    except:
                        pass

                    # Check for linked payee
                    try:
                        payee_link = Link.objects.filter(
                            plugin_content_type=ContentType.objects.get_for_model(ynab_tx.payee),
                            plugin_object_id=ynab_tx.payee.id
                        ).first()
                        if payee_link:
                            linked_payee = payee_link.core_object.name
                    except:
                        pass

                    # Convert YNAB transaction to our format
                    transaction_data = {
                        'id': f"ynab_{ynab_tx.id}",
                        'date': ynab_tx.date.isoformat(),
                        'account_name': ynab_tx.account.name if ynab_tx.account else '',
                        'payee_name': ynab_tx.payee.name if ynab_tx.payee else '',
                        'category_name': ynab_tx.category.name if ynab_tx.category else '',
                        'amount': float(ynab_tx.amount) / 1000,  # YNAB stores in milliunits
                        'memo': ynab_tx.memo or '',
                        'cleared': ynab_tx.cleared,
                        'approved': ynab_tx.approved,
                        'flag_color': ynab_tx.flag_color,
                        'transfer_account_id': ynab_tx.transfer_account_id,
                        'transfer_transaction_id': ynab_tx.transfer_transaction_id,
                        'import_id': ynab_tx.import_id,
                        'deleted': ynab_tx.deleted,
                        'source': 'ynab',
                        'source_id': str(ynab_tx.id),
                        'linked_account': linked_account,
                        'linked_category': linked_category,
                        'linked_payee': linked_payee,
                    }
                    transactions_data.append(transaction_data)

                return Response(transactions_data)
            else:
                # No valid sources specified, return empty
                return Response([])

        # If no sources specified, return core transactions
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)