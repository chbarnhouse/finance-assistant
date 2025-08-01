from rest_framework import viewsets
from .models import Account
from .serializers import AccountSerializer

class AccountViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows accounts to be viewed or edited.
    """
    serializer_class = AccountSerializer

    def get_queryset(self):
        """
        Optionally restricts the returned accounts to only unlinked ones,
        by passing a `unlinked=true` query parameter in the URL.
        """
        queryset = Account.objects.all()
        unlinked = self.request.query_params.get('unlinked')
        if unlinked:
            queryset = queryset.filter(ynab_account__isnull=True)
        return queryset