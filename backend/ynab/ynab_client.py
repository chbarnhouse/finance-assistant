import requests
import logging

logger = logging.getLogger(__name__)

class YNABClient:
    BASE_URL = "https://api.ynab.com/v1"

    def __init__(self, api_key):
        self.api_key = api_key
        self.headers = {"Authorization": f"Bearer {self.api_key}"}

    def _request(self, method, endpoint, **kwargs):
        url = f"{self.BASE_URL}/{endpoint}"
        try:
            response = requests.request(method, url, headers=self.headers, **kwargs)
            response.raise_for_status()
            return response.json().get('data', {})
        except requests.exceptions.HTTPError as e:
            logger.error(f"YNAB API Error: {e.response.status_code} {e.response.reason} for URL: {url}")
            logger.error(f"Response body: {e.response.text}")
            raise
        except Exception as e:
            logger.error(f"An unexpected error occurred: {e}")
            raise

    def get_user(self):
        data = self._request("GET", "user")
        return data.get('user')

    def get_budgets(self):
        data = self._request("GET", "budgets")
        return data.get('budgets', [])

    def get_budget_by_id(self, budget_id):
        data = self._request("GET", f"budgets/{budget_id}")
        return data.get('budget')

    def get_months(self, budget_id):
        data = self._request("GET", f"budgets/{budget_id}/months")
        return data.get('months', [])