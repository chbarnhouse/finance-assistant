from django.core.management.base import BaseCommand
from lookups.models import AssetType, LiabilityType, CreditCardType

class Command(BaseCommand):
    help = 'Print all IDs and names for AssetType, LiabilityType, and CreditCardType in the lookups app.'

    def handle(self, *args, **options):
        self.stdout.write('AssetTypes:')
        for at in AssetType.objects.all():
            self.stdout.write(f'  {at.id}: {at.name}')
        self.stdout.write('LiabilityTypes:')
        for lt in LiabilityType.objects.all():
            self.stdout.write(f'  {lt.id}: {lt.name}')
        self.stdout.write('CreditCardTypes:')
        for cct in CreditCardType.objects.all():
            self.stdout.write(f'  {cct.id}: {cct.name}')