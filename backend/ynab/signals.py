from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.contenttypes.models import ContentType
from .models import YNABAccount
from api.models import Link
from accounts.models import Account
import logging

logger = logging.getLogger(__name__)

@receiver(post_save, sender=YNABAccount)
def auto_sync_linked_accounts_on_ynab_update(sender, instance, created, **kwargs):
    """
    Automatically sync linked core accounts when a YNAB account is updated
    """
    try:
        # Get all links where this YNAB account is the plugin object
        ynab_account_content_type = ContentType.objects.get_for_model(YNABAccount)
        account_content_type = ContentType.objects.get_for_model(Account)

        links = Link.objects.filter(
            plugin_content_type=ynab_account_content_type,
            plugin_object_id=instance.id,
            core_content_type=account_content_type
        )

        for link in links:
            try:
                core_account = link.core_object
                if core_account:
                    # Use the sync_from_ynab method to update the core account
                    success = core_account.sync_from_ynab(instance)
                    if success:
                        logger.info(f"Signal-based auto-sync: Updated core account {core_account.name} from YNAB account {instance.name}")
                    else:
                        logger.warning(f"Signal-based auto-sync failed for core account {core_account.name}")
            except Exception as e:
                logger.error(f"Error in signal-based auto-sync for account link {link.id}: {str(e)}")
                continue

    except Exception as e:
        logger.error(f"Error in signal-based auto-sync process: {str(e)}")