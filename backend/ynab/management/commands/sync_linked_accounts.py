from django.core.management.base import BaseCommand
from django.contrib.contenttypes.models import ContentType
from api.models import Link
from accounts.models import Account
from ynab.models import YNABAccount
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Sync all linked core accounts with their YNAB counterparts'

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force sync even if accounts are already up to date',
        )

    def handle(self, *args, **options):
        try:
            # Get all links where core object is an Account and plugin object is a YNABAccount
            account_content_type = ContentType.objects.get_for_model(Account)
            ynab_account_content_type = ContentType.objects.get_for_model(YNABAccount)

            links = Link.objects.filter(
                core_content_type=account_content_type,
                plugin_content_type=ynab_account_content_type
            )

            self.stdout.write(f"Found {links.count()} linked accounts to sync...")

            synced_count = 0
            failed_count = 0

            for link in links:
                try:
                    core_account = link.core_object
                    ynab_account = link.plugin_object

                    if core_account and ynab_account:
                        # Use the sync_from_ynab method to update the core account
                        success = core_account.sync_from_ynab(ynab_account)
                        if success:
                            synced_count += 1
                            self.stdout.write(
                                self.style.SUCCESS(
                                    f"✓ Synced core account '{core_account.name}' from YNAB account '{ynab_account.name}'"
                                )
                            )
                        else:
                            failed_count += 1
                            self.stdout.write(
                                self.style.WARNING(
                                    f"⚠ Failed to sync core account '{core_account.name}'"
                                )
                            )
                    else:
                        failed_count += 1
                        self.stdout.write(
                            self.style.ERROR(
                                f"✗ Link {link.id}: Missing core account or YNAB account"
                            )
                        )
                except Exception as e:
                    failed_count += 1
                    self.stdout.write(
                        self.style.ERROR(
                            f"✗ Error syncing account link {link.id}: {str(e)}"
                        )
                    )
                    continue

            self.stdout.write(
                self.style.SUCCESS(
                    f"\nSync completed: {synced_count} successful, {failed_count} failed"
                )
            )

        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f"Error in sync process: {str(e)}")
            )