function getApiBaseUrl(): string {
  // Check if we're running in Home Assistant ingress mode
  // The X-Ingress-Path header is provided by Home Assistant's ingress proxy
  const ingressPath = document
    .querySelector('meta[name="ingress-path"]')
    ?.getAttribute("content");

  console.log("Ingress path:", ingressPath);
  console.log("Window location:", window.location.href);

  if (ingressPath) {
    // We're in ingress mode, use the ingress path
    const url = `${window.location.origin}${ingressPath}/api`;
    console.log("Using ingress API URL:", url);
    return url;
  } else {
    // Fallback to current origin (for direct access or development)
    const url = `${window.location.origin}/api`;
    console.log("Using fallback API URL:", url);
    return url;
  }
}

export const API_BASE_URL = getApiBaseUrl();

// Core Data Endpoints
export const ACCOUNTS_URL = `${API_BASE_URL}/accounts/`;
export const ACCOUNTS_DATA_URL = `${API_BASE_URL}/accounts/`; // Legacy accounts app endpoint
export const BANKS_URL = `${API_BASE_URL}/banks/`;
export const ASSETS_URL = `${API_BASE_URL}/assets/`;
export const LIABILITIES_URL = `${API_BASE_URL}/liabilities/`;
export const CREDIT_CARDS_URL = `${API_BASE_URL}/credit-cards/`;
export const CATEGORIES_URL = `${API_BASE_URL}/categories/`;
export const PAYEES_URL = `${API_BASE_URL}/payees/`;
export const TRANSACTIONS_URL = `${API_BASE_URL}/transactions/`;
export const QUERIES_URL = `${API_BASE_URL}/queries/`;
export const LINKS_URL = `${API_BASE_URL}/links/`;

// Lookup Table Endpoints
export const LOOKUPS_URL = `${API_BASE_URL}/lookups`;
export const ACCOUNT_TYPES_URL = `${LOOKUPS_URL}/account-types/`;
export const ASSET_TYPES_URL = `${LOOKUPS_URL}/asset-types/`;
export const LIABILITY_TYPES_URL = `${LOOKUPS_URL}/liability-types/`;
export const CREDIT_CARD_TYPES_URL = `${LOOKUPS_URL}/credit-card-types/`;
export const PAYMENT_METHODS_URL = `${LOOKUPS_URL}/payment-methods/`;
export const POINTS_PROGRAMS_URL = `${LOOKUPS_URL}/points-programs/`;
export const LOOKUP_BANKS_URL = `${LOOKUPS_URL}/banks/`;

// Data-specific endpoints for forms, etc.
export const DATA_URL = `${API_BASE_URL}/data`;
export const DATA_ACCOUNTS_URL = `${API_BASE_URL}/accounts/`; // Use api app accounts instead of data app
export const DATA_BANKS_URL = `${DATA_URL}/banks/`;
export const DATA_ACCOUNT_TYPES_URL = `${LOOKUPS_URL}/account-types/`; // Use lookups app account types instead of data app

// YNAB Plugin Endpoints
export const YNAB_URL = `${API_BASE_URL}/ynab`;
export const YNAB_USER_URL = `${YNAB_URL}/user/`;
export const YNAB_ACCOUNTS_URL = `${YNAB_URL}/accounts/`;
export const YNAB_CATEGORIES_URL = `${YNAB_URL}/categories/`;
export const YNAB_PAYEES_URL = `${YNAB_URL}/payees/`;
export const YNAB_TRANSACTIONS_URL = `${YNAB_URL}/transactions/`;
