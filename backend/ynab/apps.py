from django.apps import AppConfig


class YnabConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'ynab'

    def ready(self):
        """Import signals when the app is ready"""
        import ynab.signals
