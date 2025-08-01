import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  IconButton,
  Tooltip,
  Checkbox,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  CircularProgress,
  DialogContentText,
  List,
  ListItem,
} from "@mui/material";
import LinkIcon from "@mui/icons-material/Link";
import LinkOffIcon from "@mui/icons-material/LinkOff";
import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import {
  DataGrid,
  GridToolbarContainer,
  GridToolbarFilterButton,
  GridToolbarExport,
  GridToolbarColumnsButton,
  GridToolbarDensitySelector,
} from "@mui/x-data-grid";
import type { GridColDef } from "@mui/x-data-grid";
import axios from "axios";
import { API_BASE_URL } from "../../../constants";
import YNABConfigModal from "../../../components/YNABConfigModal";
import PageHeader from "../../../components/PageHeader";
import AccountFormDialog from "../../../components/AccountFormDialog";
import CreditCardFormDialog from "../../../components/CreditCardFormDialog";
import AssetFormDialog from "../../../components/AssetFormDialog";
import LiabilityFormDialog from "../../../components/LiabilityFormDialog";
import { useTheme } from "@mui/material/styles";
import { getPageStyles } from "../../../styles/theme";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import CreditCardIcon from "@mui/icons-material/CreditCard";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import { SyncButton } from "../../../components/SyncButton";
import SettingsIcon from "@mui/icons-material/Settings";
import YNABAccountDetailsModal from "../../../components/YNABAccountDetailsModal";

// Import default constants from YNABConfigModal
const DEFAULT_CROSS_REFERENCES: Record<string, CrossReference[]> = {
  accounts: [
    {
      sourceValue: "checking",
      displayValue: "Checking Account",
      enabled: true,
      column: "type",
    },
    {
      sourceValue: "savings",
      displayValue: "Savings Account",
      enabled: true,
      column: "type",
    },
    {
      sourceValue: "cash",
      displayValue: "Cash",
      enabled: true,
      column: "type",
    },
    {
      sourceValue: "creditCard",
      displayValue: "Credit Card",
      enabled: true,
      column: "type",
    },
    {
      sourceValue: "lineOfCredit",
      displayValue: "Line of Credit",
      enabled: true,
      column: "type",
    },
    {
      sourceValue: "otherAsset",
      displayValue: "Other Asset",
      enabled: true,
      column: "type",
    },
    {
      sourceValue: "otherLiability",
      displayValue: "Other Liability",
      enabled: true,
      column: "type",
    },
    {
      sourceValue: "mortgage",
      displayValue: "Mortgage",
      enabled: true,
      column: "type",
    },
    {
      sourceValue: "autoLoan",
      displayValue: "Auto Loan",
      enabled: true,
      column: "type",
    },
    {
      sourceValue: "studentLoan",
      displayValue: "Student Loan",
      enabled: true,
      column: "type",
    },
    {
      sourceValue: "personalLoan",
      displayValue: "Personal Loan",
      enabled: true,
      column: "type",
    },
    {
      sourceValue: "medicalDebt",
      displayValue: "Medical Debt",
      enabled: true,
      column: "type",
    },
    {
      sourceValue: "otherDebt",
      displayValue: "Other Debt",
      enabled: true,
      column: "type",
    },
  ],
};

const DEFAULT_ACCOUNT_TYPE_MAPPINGS: AccountTypeMapping[] = [
  { ynabType: "checking", coreRecordType: "account", enabled: true },
  { ynabType: "savings", coreRecordType: "account", enabled: true },
  { ynabType: "cash", coreRecordType: "account", enabled: true },
  { ynabType: "creditCard", coreRecordType: "credit_card", enabled: true },
  { ynabType: "lineOfCredit", coreRecordType: "liability", enabled: true },
  { ynabType: "otherAsset", coreRecordType: "asset", enabled: true },
  { ynabType: "otherLiability", coreRecordType: "liability", enabled: true },
  { ynabType: "mortgage", coreRecordType: "liability", enabled: true },
  { ynabType: "autoLoan", coreRecordType: "liability", enabled: true },
  { ynabType: "studentLoan", coreRecordType: "liability", enabled: true },
  { ynabType: "personalLoan", coreRecordType: "liability", enabled: true },
  { ynabType: "medicalDebt", coreRecordType: "liability", enabled: true },
  { ynabType: "otherDebt", coreRecordType: "liability", enabled: true },
];

interface AccountTypeMapping {
  ynabType: string;
  coreRecordType: string;
  defaultSubtypeId?: string;
  enabled: boolean;
}

// Navigation function - we'll use a simple approach for now
const navigateToCoreRecord = (path: string, recordId: string) => {
  // Navigate to the core record page
  window.location.href = `/${path}`;
  // We'll need to pass the record ID to show the details modal
  // For now, we'll store it in sessionStorage
  sessionStorage.setItem("selectedRecordId", recordId);
  sessionStorage.setItem("showDetailsModal", "true");
};

interface ColumnConfig {
  field: string;
  headerName: string;
  visible: boolean;
  order: number;
  width?: number;
  useCheckbox?: boolean; // For boolean columns: true = checkbox, false = text
  useCurrency?: boolean; // For currency columns: true = formatted, false = raw
  invertNegativeSign?: boolean; // For currency columns: invert negative sign
  disableNegativeSign?: boolean; // For currency columns: disable negative sign
  useDatetime?: boolean; // For datetime columns: true = formatted, false = raw
  datetimeFormat?: string; // For datetime columns: custom format
  useThousandsSeparator?: boolean; // For currency columns: use thousands separator
  useLinkIcon?: boolean; // For linked columns: true = link icon, false = text
}

interface CrossReference {
  sourceValue: string;
  displayValue: string;
  enabled: boolean;
  column: string; // Added column property
}

const YNABAccountsPage: React.FC = () => {
  const theme = useTheme();
  const styles = getPageStyles(theme);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [crossReferences, setCrossReferences] = useState<CrossReference[]>([]);
  const [linkMenuAnchor, setLinkMenuAnchor] = useState<null | HTMLElement>(
    null
  );
  const [selectedAccount, setSelectedAccount] = useState<any>(null);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [existingAccounts, setExistingAccounts] = useState<any[]>([]);
  const [loadingExistingAccounts, setLoadingExistingAccounts] = useState(false);
  const [selectedExistingAccount, setSelectedExistingAccount] = useState("");
  const [accountFormOpen, setAccountFormOpen] = useState(false);
  const [accountToLink, setAccountToLink] = useState<any>(null);
  const [defaultAccountData, setDefaultAccountData] = useState<any>({});
  const [defaultCreditCardData, setDefaultCreditCardData] = useState<any>({});
  const [defaultAssetData, setDefaultAssetData] = useState<any>({});
  const [defaultLiabilityData, setDefaultLiabilityData] = useState<any>({});

  // New state for different record type creation
  const [creditCardFormOpen, setCreditCardFormOpen] = useState(false);
  const [assetFormOpen, setAssetFormOpen] = useState(false);
  const [liabilityFormOpen, setLiabilityFormOpen] = useState(false);
  const [recordTypeSelectionOpen, setRecordTypeSelectionOpen] = useState(false);
  const [selectedRecordType, setSelectedRecordType] = useState<string>("");
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedAccountForDetails, setSelectedAccountForDetails] =
    useState<any>(null);

  // State for account type mappings
  const [accountTypeMappings, setAccountTypeMappings] = useState<any[]>([]);
  const [forceRerender, setForceRerender] = useState(0);

  const queryClient = useQueryClient();

  // Sync handlers
  const handleSyncSuccess = (data: any) => {
    console.log("YNAB sync successful:", data);
    // The sync hook will automatically invalidate queries
  };

  const handleSyncError = (error: any) => {
    console.error("YNAB sync failed:", error);
  };

  // Mutation for linking records
  const linkMutation = useMutation({
    mutationFn: async (recordId: string) => {
      // Determine the core model based on which form is open
      let coreModel = "account";
      if (creditCardFormOpen) coreModel = "creditcard";
      else if (assetFormOpen) coreModel = "asset";
      else if (liabilityFormOpen) coreModel = "liability";

      const linkData = {
        core_model: coreModel,
        core_id: recordId,
        plugin_model: "account",
        plugin_id: accountToLink.id,
      };
      console.log("Creating link with data:", linkData);
      return axios.post(`${API_BASE_URL}/links/`, linkData);
    },
    onSuccess: (data) => {
      console.log("Link created successfully:", data);
      queryClient.invalidateQueries({ queryKey: ["ynab-accounts"] });
      // Refresh YNAB accounts data to update link icons
      fetchAccounts();
      setAccountFormOpen(false);
      setCreditCardFormOpen(false);
      setAssetFormOpen(false);
      setLiabilityFormOpen(false);
      setAccountToLink(null);
    },
    onError: (error: any) => {
      console.error("Linking error:", error);
      console.error("Error response:", error.response?.data);
    },
  });
  const [columns, setColumns] = useState<ColumnConfig[]>([
    { field: "id", headerName: "ID", visible: false, order: 0, width: 300 },
    { field: "name", headerName: "Name", visible: true, order: 1, width: 200 },
    { field: "type", headerName: "Type", visible: true, order: 2, width: 150 },
    {
      field: "balance",
      headerName: "Balance",
      visible: true,
      order: 3,
      width: 120,
      useCurrency: true,
      useThousandsSeparator: true,
    },
    { field: "note", headerName: "Note", visible: true, order: 4, width: 200 },
    {
      field: "linked",
      headerName: "Linked",
      visible: true,
      order: 5,
      width: 100,
      useLinkIcon: true,
    },
    {
      field: "on_budget",
      headerName: "On Budget",
      visible: false,
      order: 6,
      width: 120,
      useCheckbox: true,
    },
    {
      field: "closed",
      headerName: "Closed",
      visible: false,
      order: 7,
      width: 100,
      useCheckbox: true,
    },
    {
      field: "cleared_balance",
      headerName: "Cleared Balance",
      visible: false,
      order: 8,
      width: 150,
      useCurrency: true,
      useThousandsSeparator: true,
    },
    {
      field: "uncleared_balance",
      headerName: "Uncleared Balance",
      visible: false,
      order: 9,
      width: 170,
      useCurrency: true,
      useThousandsSeparator: true,
    },
    {
      field: "transfer_payee_id",
      headerName: "Transfer Payee ID",
      visible: false,
      order: 10,
      width: 300,
    },
    {
      field: "direct_import_linked",
      headerName: "Direct Import Linked",
      visible: false,
      order: 11,
      width: 150,
      useCheckbox: true,
    },
    {
      field: "direct_import_in_error",
      headerName: "Direct Import Error",
      visible: false,
      order: 12,
      width: 150,
      useCheckbox: true,
    },
    {
      field: "last_reconciled_at",
      headerName: "Last Reconciled",
      visible: false,
      order: 13,
      width: 150,
      useDatetime: true,
      datetimeFormat: "MM/DD/YYYY HH:mm:ss",
    },
    {
      field: "debt_original_balance",
      headerName: "Debt Original Balance",
      visible: false,
      order: 14,
      width: 180,
      useCurrency: true,
      useThousandsSeparator: true,
    },
    {
      field: "debt_interest_rates",
      headerName: "Debt Interest Rates",
      visible: false,
      order: 15,
      width: 150,
    },
    {
      field: "debt_minimum_payments",
      headerName: "Debt Minimum Payments",
      visible: false,
      order: 16,
      width: 180,
    },
    {
      field: "debt_escrow_amounts",
      headerName: "Debt Escrow Amounts",
      visible: false,
      order: 17,
      width: 180,
    },
    {
      field: "deleted",
      headerName: "Deleted",
      visible: false,
      order: 18,
      width: 100,
      useCheckbox: true,
    },
  ]);

  useEffect(() => {
    fetchAccounts();
    loadCrossReferences();
    loadAccountTypeMappings();
    loadColumnConfigurations();
  }, []);

  // Reload cross-references after config modal closes
  useEffect(() => {
    if (!configModalOpen) {
      loadCrossReferences();
    }
  }, [configModalOpen]);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/ynab/accounts/`);
      setAccounts(response.data.data.accounts || []);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to fetch accounts");
    } finally {
      setLoading(false);
    }
  };

  // Refresh YNAB accounts when core records are deleted
  useEffect(() => {
    // Listen for storage events to detect when core records are deleted
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "coreRecordDeleted") {
        // Refresh YNAB accounts when a core record is deleted
        fetchAccounts();
        // Clear the storage event
        sessionStorage.removeItem("coreRecordDeleted");
      }
    };

    // Listen for custom events to detect when core records are deleted
    const handleCustomEvent = () => {
      fetchAccounts();
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("coreRecordDeleted", handleCustomEvent);

    // Also check for the event on the same window
    const checkForDeletion = () => {
      if (sessionStorage.getItem("coreRecordDeleted")) {
        fetchAccounts();
        sessionStorage.removeItem("coreRecordDeleted");
      }
    };

    // Check every 5 seconds for deletion events
    const interval = setInterval(checkForDeletion, 5000);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("coreRecordDeleted", handleCustomEvent);
      clearInterval(interval);
    };
  }, []);

  // Transform accounts data to apply cross-references
  const getTransformedAccounts = () => {
    console.log("getTransformedAccounts called with:", {
      accountsCount: accounts.length,
      crossReferencesCount: crossReferences.length,
      accountTypeMappingsCount: accountTypeMappings.length,
    });

    return accounts
      .filter((account) => account && account.id) // Filter out null/undefined accounts
      .map((account) => {
        const transformedAccount = { ...account };
        console.log("Processing account:", account.name, "type:", account.type);

        // Apply cross-references for each field that has them
        Object.keys(transformedAccount).forEach((field) => {
          const fieldValue = String(transformedAccount[field]);
          const crossRef = crossReferences.find(
            (ref) =>
              ref.sourceValue === fieldValue &&
              ref.column === field &&
              ref.enabled
          );
          if (crossRef) {
            console.log(
              `Applying cross-reference for ${field}: ${fieldValue} -> ${crossRef.displayValue}`
            );
            transformedAccount[field] = crossRef.displayValue;
          }
        });

        return transformedAccount;
      });
  };

  // Force re-render when cross-references or account type mappings change
  useEffect(() => {
    console.log(
      "Cross-references or account type mappings changed, forcing re-render"
    );
    setForceRerender((prev) => prev + 1);
  }, [crossReferences, accountTypeMappings]);

  const loadCrossReferences = async () => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/ynab/cross-references/accounts/`
      );
      const newCrossReferences = response.data.cross_references || [];
      console.log("Loaded cross-references:", newCrossReferences);

      // If no cross-references exist in the database, use the hardcoded defaults
      if (newCrossReferences.length === 0) {
        console.log(
          "loadCrossReferences: No cross-references found in database, using defaults"
        );
        setCrossReferences(DEFAULT_CROSS_REFERENCES.accounts || []);
      } else {
        setCrossReferences(newCrossReferences);
      }
    } catch (err: any) {
      console.log("Could not load cross-references:", err);
      // On error, fall back to defaults
      console.log("loadCrossReferences: Error occurred, using defaults");
      setCrossReferences(DEFAULT_CROSS_REFERENCES.accounts || []);
    }
  };

  const loadColumnConfigurations = async () => {
    try {
      console.log(
        "loadColumnConfigurations: Starting to load saved configs..."
      );
      const response = await axios.get(
        `${API_BASE_URL}/ynab/column-configurations/`
      );
      const savedConfigs = response.data.data?.column_configurations || [];
      console.log(
        "loadColumnConfigurations: Loaded saved configs:",
        savedConfigs
      );

      // Log the order values specifically
      const accountsConfigs = savedConfigs.filter(
        (config: any) => config.record_type === "accounts"
      );
      console.log(
        "loadColumnConfigurations: Accounts configs with order values:",
        accountsConfigs.map(
          (config: any) =>
            `${config.field}: order=${config.order}, visible=${config.visible}`
        )
      );

      // Update columns with saved configurations
      setColumns((prevColumns) => {
        console.log(
          "loadColumnConfigurations: Updating columns from:",
          prevColumns
        );

        const updatedColumns = prevColumns.map((col) => {
          const savedConfig = savedConfigs.find(
            (config: any) =>
              config.record_type === "accounts" && config.field === col.field
          );
          console.log(`loadColumnConfigurations: Column ${col.field}:`, {
            savedConfig,
            originalUseCheckbox: col.useCheckbox,
            originalUseCurrency: col.useCurrency,
            originalUseDatetime: col.useDatetime,
          });

          if (savedConfig) {
            // For boolean columns, default useCheckbox to true if not set
            let useCheckbox = savedConfig.use_checkbox;
            if (
              useCheckbox === null &&
              (col.field === "on_budget" || col.field === "closed")
            ) {
              useCheckbox = true;
              console.log(
                `Setting ${col.field} useCheckbox to true (was null)`
              );
            }

            // For currency columns, default useCurrency to true if not set
            let useCurrency = savedConfig.use_currency;
            if (
              (useCurrency === null || useCurrency === undefined) &&
              col.field.includes("balance")
            ) {
              useCurrency = true;
              console.log(
                `Setting ${col.field} useCurrency to true (was null/undefined)`
              );
            }

            // For datetime columns, default useDatetime to true if not set
            let useDatetime = savedConfig.use_datetime;
            if (
              (useDatetime === null || useDatetime === undefined) &&
              col.field === "last_reconciled_at"
            ) {
              useDatetime = true;
              console.log(
                `Setting ${col.field} useDatetime to true (was null/undefined)`
              );
            }

            // In loadColumnConfigurations, set useThousandsSeparator default to true if not set
            const useThousandsSeparator =
              savedConfig.use_thousands_separator !== undefined
                ? savedConfig.use_thousands_separator
                : true;

            // Set useLinkIcon default to true for linked field if not set
            const useLinkIcon =
              savedConfig.use_link_icon !== undefined
                ? savedConfig.use_link_icon
                : col.field === "linked";

            const updatedCol = {
              ...col,
              headerName: savedConfig.header_name,
              visible: savedConfig.visible,
              order: savedConfig.order,
              width: savedConfig.width,
              useCheckbox: useCheckbox,
              useCurrency: useCurrency,
              invertNegativeSign: savedConfig.invert_negative_sign,
              disableNegativeSign: savedConfig.disable_negative_sign,
              useDatetime: useDatetime,
              datetimeFormat: savedConfig.datetime_format,
              useThousandsSeparator: useThousandsSeparator,
              useLinkIcon: useLinkIcon,
            };
            console.log(
              `loadColumnConfigurations: Updated column ${col.field}:`,
              updatedCol
            );
            return updatedCol;
          } else {
            // No saved config found, ensure defaults are set
            let useCurrency = col.useCurrency;
            let useDatetime = col.useDatetime;

            if (
              (useCurrency === undefined || useCurrency === null) &&
              col.field.includes("balance")
            ) {
              useCurrency = true;
              console.log(
                `Setting ${col.field} useCurrency to true (no saved config)`
              );
            }

            if (
              (useDatetime === undefined || useDatetime === null) &&
              col.field === "last_reconciled_at"
            ) {
              useDatetime = true;
              console.log(
                `Setting ${col.field} useDatetime to true (no saved config)`
              );
            }

            return {
              ...col,
              useCurrency: useCurrency,
              useDatetime: useDatetime,
            };
          }
        });

        console.log(
          "loadColumnConfigurations: Final updated columns:",
          updatedColumns
        );
        return updatedColumns;
      });
    } catch (err: any) {
      console.log("Could not load column configurations:", err);
    }
  };

  const handleColumnsChange = async (newColumns: ColumnConfig[]) => {
    console.log("handleColumnsChange called with:", newColumns);

    // Update local state immediately for responsive UI
    setColumns(newColumns);

    console.log("handleColumnsChange completed, columns state updated");
  };

  // Handle clicking on the link icon
  const handleLinkClick = (
    event: React.MouseEvent<HTMLElement>,
    account: any
  ) => {
    event.stopPropagation();
    setSelectedAccount(account);
    setLinkMenuAnchor(event.currentTarget);
  };

  // Handle menu close
  const handleLinkMenuClose = () => {
    setLinkMenuAnchor(null);
    // Don't clear selectedAccount here - it's needed for the dialog
  };

  // Handle dialog close
  const handleLinkDialogClose = () => {
    setLinkDialogOpen(false);
    setSelectedAccount(null); // Clear selectedAccount when dialog closes
    setSelectedExistingAccount(""); // Reset selected existing account
  };

  // Load account type mappings
  const loadAccountTypeMappings = async () => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/ynab/account-type-mappings/`
      );
      const mappings = response.data || [];

      // If no mappings exist in the database, use the hardcoded defaults
      if (mappings.length === 0) {
        console.log(
          "loadAccountTypeMappings: No mappings found in database, using defaults"
        );
        setAccountTypeMappings(DEFAULT_ACCOUNT_TYPE_MAPPINGS || []);
      } else {
        setAccountTypeMappings(mappings);
      }
    } catch (error) {
      console.error("Error loading account type mappings:", error);
      // On error, fall back to defaults
      console.log("loadAccountTypeMappings: Error occurred, using defaults");
      setAccountTypeMappings(DEFAULT_ACCOUNT_TYPE_MAPPINGS || []);
    }
  };

  // Map YNAB display names to internal type codes
  const mapYnabDisplayNameToTypeCode = (displayName: string) => {
    // First, try to find a cross-reference that matches this display name
    const crossRef = crossReferences.find(
      (ref) =>
        ref.displayValue === displayName && ref.column === "type" && ref.enabled
    );
    if (crossRef) {
      return crossRef.sourceValue;
    }

    // Fallback to hardcoded mappings for backward compatibility
    const displayToCode: { [key: string]: string } = {
      "Checking Account": "checking",
      "Savings Account": "savings",
      Cash: "cash",
      "Credit Card": "creditCard",
      "Line of Credit": "lineOfCredit",
      "Other Asset": "otherAsset",
      "Other Liability": "otherLiability",
      Mortgage: "mortgage",
      "Auto Loan": "autoLoan",
      "Student Loan": "studentLoan",
      "Personal Loan": "personalLoan",
      "Medical Debt": "medicalDebt",
      "Other Debt": "otherDebt",
      // Also handle the internal codes in case they're used
      checking: "checking",
      savings: "savings",
      cash: "cash",
      creditCard: "creditCard",
      lineOfCredit: "lineOfCredit",
      otherAsset: "otherAsset",
      otherLiability: "otherLiability",
      mortgage: "mortgage",
      autoLoan: "autoLoan",
      studentLoan: "studentLoan",
      personalLoan: "personalLoan",
      medicalDebt: "medicalDebt",
      otherDebt: "otherDebt",
    };
    return displayToCode[displayName] || displayName;
  };

  // Get the appropriate record type for a YNAB account
  const getRecordTypeForYnabAccount = (ynabAccount: any) => {
    const typeCode = mapYnabDisplayNameToTypeCode(ynabAccount.type);
    const mapping = accountTypeMappings.find(
      (m) => m.ynabType === typeCode && m.enabled
    );
    return mapping ? mapping.coreRecordType : null;
  };

  // Get the display name for a record type
  const getRecordTypeDisplayName = (recordType: string) => {
    const displayNames: { [key: string]: string } = {
      account: "Account",
      credit_card: "Credit Card",
      asset: "Asset",
      liability: "Liability",
    };
    return displayNames[recordType] || recordType;
  };

  // Load account type mappings on component mount
  useEffect(() => {
    loadAccountTypeMappings();
  }, []);

  // Handle menu item selection
  const handleLinkMenuSelect = (event: any, ynabAccount: any) => {
    const action = event.target.textContent;

    if (action.includes("Create & Link to New")) {
      const recordType = getRecordTypeForYnabAccount(ynabAccount);
      if (recordType) {
        openCreateModalForRecordType(recordType, ynabAccount);
      } else {
        // No mapping found, show record type selection
        setAccountToLink(ynabAccount);
        setRecordTypeSelectionOpen(true);
      }
    } else if (action.includes("Create & Link to Other Record Type")) {
      setAccountToLink(ynabAccount);
      setRecordTypeSelectionOpen(true);
    } else if (action.includes("Link to Existing")) {
      setSelectedYnabAccount(ynabAccount);
      setLinkDialogOpen(true);
      loadExistingAccounts();
    }

    // Close the menu after handling the selection
    setLinkMenuAnchor(null);
  };

  // Open the appropriate creation modal based on record type
  const openCreateModalForRecordType = (
    recordType: string,
    ynabAccount: any
  ) => {
    setAccountToLink(ynabAccount);

    switch (recordType) {
      case "account":
        getDefaultAccountData(ynabAccount).then((data) => {
          setDefaultAccountData(data);
          setAccountFormOpen(true);
        });
        break;
      case "credit_card":
        getDefaultCreditCardData(ynabAccount).then((data) => {
          setDefaultCreditCardData(data);
          setCreditCardFormOpen(true);
        });
        break;
      case "asset":
        getDefaultAssetData(ynabAccount).then((data) => {
          setDefaultAssetData(data);
          setAssetFormOpen(true);
        });
        break;
      case "liability":
        getDefaultLiabilityData(ynabAccount).then((data) => {
          setDefaultLiabilityData(data);
          setLiabilityFormOpen(true);
        });
        break;
      default:
        getDefaultAccountData(ynabAccount).then((data) => {
          setDefaultAccountData(data);
          setAccountFormOpen(true);
        });
    }
  };

  // Handle record type selection
  const handleRecordTypeSelection = (recordType: string) => {
    setSelectedRecordType(recordType);
    setRecordTypeSelectionOpen(false);

    if (accountToLink) {
      openCreateModalForRecordType(recordType, accountToLink);
    }
  };

  // Load existing core records for linking
  const loadExistingAccounts = async () => {
    try {
      setLoadingExistingAccounts(true);

      // Load all types of core records
      const [accountsRes, creditCardsRes, liabilitiesRes, assetsRes] =
        await Promise.all([
          axios.get(`${API_BASE_URL}/accounts/`),
          axios.get(`${API_BASE_URL}/credit-cards/`),
          axios.get(`${API_BASE_URL}/liabilities/`),
          axios.get(`${API_BASE_URL}/assets/`),
        ]);

      const accounts = accountsRes.data.results || accountsRes.data || [];
      const creditCards =
        creditCardsRes.data.results || creditCardsRes.data || [];
      const liabilities =
        liabilitiesRes.data.results || liabilitiesRes.data || [];
      const assets = assetsRes.data.results || assetsRes.data || [];

      // Combine all records with their type information
      const allRecords = [
        ...accounts.map((acc: any) => ({
          ...acc,
          recordType: "account",
          recordTypeLabel: "Account",
        })),
        ...creditCards.map((cc: any) => ({
          ...cc,
          recordType: "credit_card",
          recordTypeLabel: "Credit Card",
        })),
        ...liabilities.map((liab: any) => ({
          ...liab,
          recordType: "liability",
          recordTypeLabel: "Liability",
        })),
        ...assets.map((asset: any) => ({
          ...asset,
          recordType: "asset",
          recordTypeLabel: "Asset",
        })),
      ];

      setExistingAccounts(allRecords);
    } catch (err: any) {
      console.error("Failed to load existing records:", err);
      setExistingAccounts([]);
    } finally {
      setLoadingExistingAccounts(false);
    }
  };

  // Get account type mapping for a YNAB account type
  const getAccountTypeMapping = async (ynabType: string) => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/ynab/account-type-mappings/`
      );
      const mappings = response.data || [];
      return mappings.find(
        (mapping: any) => mapping.ynabType === ynabType && mapping.enabled
      );
    } catch (err: any) {
      console.error("Failed to get account type mapping:", err);
      return null;
    }
  };

  // Get appropriate account type ID based on YNAB account type
  const getAppropriateTypeId = async (
    types: any[],
    ynabAccountType: string,
    recordType: string
  ) => {
    const typeCode = mapYnabDisplayNameToTypeCode(ynabAccountType);

    // First, try to get the default sub-type from the account type mapping
    try {
      const mapping = accountTypeMappings.find(
        (m) => m.ynabType === typeCode && m.enabled
      );

      if (mapping && mapping.defaultSubtypeId) {
        // Find the type with this ID
        const defaultType = types.find(
          (type) => type.id === mapping.defaultSubtypeId
        );
        if (defaultType) {
          console.log(
            `Using default sub-type from mapping for ${ynabAccountType} (${typeCode}): ${defaultType.name} (ID: ${defaultType.id})`
          );
          return defaultType.id;
        }
      }
    } catch (error) {
      console.warn("Error getting default sub-type from mapping:", error);
    }

    // Fallback to the old logic if no default sub-type is configured
    const typeMapping: { [key: string]: string[] } = {
      checking: ["Checking"],
      savings: ["Savings"],
      creditCard: ["Credit Card"],
      cash: ["Cash"],
      investment: [
        "Investment",
        "Stocks",
        "Mutual Funds",
        "Exchange Traded Funds (ETF)",
      ],
      mortgage: ["Mortgage"],
      loan: ["Loan", "Line of Credit"],
      otherAsset: ["Other Asset"],
      otherLiability: ["Other Liability"],
    };

    const targetNames = typeMapping[typeCode.toLowerCase()] || ["Checking"];

    // Try to find an exact match first
    for (const targetName of targetNames) {
      const match = types.find(
        (type) => type.name.toLowerCase() === targetName.toLowerCase()
      );
      if (match) {
        console.log(
          `Found exact match for ${ynabAccountType} (${typeCode}): ${match.name} (ID: ${match.id})`
        );
        return match.id;
      }
    }

    // Fallback to first available type
    console.log(
      `No exact match found for ${ynabAccountType} (${typeCode}), using first available: ${types[0]?.name} (ID: ${types[0]?.id})`
    );
    return types[0]?.id;
  };

  // Keep the old function name for backward compatibility
  const getAppropriateAccountTypeId = async (
    accountTypes: any[],
    ynabAccountType: string
  ) => {
    return getAppropriateTypeId(accountTypes, ynabAccountType, "account");
  };

  // Handle linking to existing record
  const handleLinkToExisting = async () => {
    if (!selectedAccount || !selectedExistingAccount) return;

    try {
      // Find the selected record to get its type
      const selectedRecord = existingAccounts.find(
        (record) => record.id === selectedExistingAccount
      );

      if (!selectedRecord) {
        console.error("Selected record not found");
        return;
      }

      // Create link between YNAB account and existing core record
      await axios.post(`${API_BASE_URL}/links/`, {
        core_model: selectedRecord.recordType,
        core_id: selectedExistingAccount,
        plugin_model: "account",
        plugin_id: selectedAccount.id,
      });

      // Refresh accounts data
      await fetchAccounts();
      handleLinkDialogClose();
    } catch (err: any) {
      console.error("Failed to link to existing record:", err);
    }
  };

  // Handle account form dialog close with linking
  const handleAccountFormClose = (createdAccount?: any) => {
    // Use .data if present (Axios response), otherwise use the object directly
    const account = createdAccount?.data || createdAccount;
    console.log("handleAccountFormClose called with:", {
      account,
      accountToLink,
    });
    setAccountFormOpen(false);
    if (account && accountToLink) {
      console.log(
        "Attempting to link account:",
        account.id,
        "to YNAB account:",
        accountToLink.id
      );
      // Link the newly created account to the YNAB account
      linkMutation.mutate(account.id);
    } else {
      console.log("Not linking - missing account or accountToLink");
    }
    setAccountToLink(null);
    setDefaultAccountData({}); // Reset default data
  };

  // Handle credit card form dialog close with linking
  const handleCreditCardFormClose = (createdCreditCard?: any) => {
    const creditCard = createdCreditCard?.data || createdCreditCard;
    console.log("handleCreditCardFormClose called with:", {
      creditCard,
      accountToLink,
    });
    setCreditCardFormOpen(false);
    if (creditCard && accountToLink) {
      console.log(
        "Attempting to link credit card:",
        creditCard.id,
        "to YNAB account:",
        accountToLink.id
      );
      // Link the newly created credit card to the YNAB account
      linkMutation.mutate(creditCard.id);
    } else {
      console.log("Not linking - missing credit card or accountToLink");
    }
    setAccountToLink(null);
    setDefaultCreditCardData({}); // Reset default data
  };

  // Handle asset form dialog close with linking
  const handleAssetFormClose = (createdAsset?: any) => {
    const asset = createdAsset?.data || createdAsset;
    console.log("handleAssetFormClose called with:", {
      asset,
      accountToLink,
    });
    setAssetFormOpen(false);
    if (asset && accountToLink) {
      console.log(
        "Attempting to link asset:",
        asset.id,
        "to YNAB account:",
        accountToLink.id
      );
      // Link the newly created asset to the YNAB account
      linkMutation.mutate(asset.id);
    } else {
      console.log("Not linking - missing asset or accountToLink");
    }
    setAccountToLink(null);
    setDefaultAssetData({}); // Reset default data
  };

  // Handle liability form dialog close with linking
  const handleLiabilityFormClose = (createdLiability?: any) => {
    const liability = createdLiability?.data || createdLiability;
    console.log("handleLiabilityFormClose called with:", {
      liability,
      accountToLink,
    });
    setLiabilityFormOpen(false);
    if (liability && accountToLink) {
      console.log(
        "Attempting to link liability:",
        liability.id,
        "to YNAB account:",
        accountToLink.id
      );
      // Link the newly created liability to the YNAB account
      linkMutation.mutate(liability.id);
    } else {
      console.log("Not linking - missing liability or accountToLink");
    }
    setAccountToLink(null);
    setDefaultLiabilityData({}); // Reset default data
  };

  // Get default data for account creation based on YNAB account
  const getDefaultAccountData = async (ynabAccount: any) => {
    if (!ynabAccount) return {};

    try {
      // Get account types to find appropriate type based on YNAB account type
      const accountTypesResponse = await axios.get(
        `${API_BASE_URL}/lookups/account-types/`
      );
      const accountTypes = accountTypesResponse.data;
      const appropriateAccountTypeId = await getAppropriateAccountTypeId(
        accountTypes,
        ynabAccount.type
      );

      return {
        name: ynabAccount.name,
        account_type: appropriateAccountTypeId,
        notes: ynabAccount.note || "",
        // Convert YNAB balance from millicents to dollars for display
        balance: ynabAccount.balance
          ? (ynabAccount.balance / 1000).toFixed(2)
          : "",
        cleared_balance: ynabAccount.cleared_balance
          ? (ynabAccount.cleared_balance / 1000).toFixed(2)
          : "",
        on_budget: ynabAccount.on_budget || false,
        closed: ynabAccount.closed || false,
      };
    } catch (error) {
      console.error("Error getting default account data:", error);
      return {
        name: ynabAccount.name,
        notes: ynabAccount.note || "",
      };
    }
  };

  // Get default data for credit card creation based on YNAB account
  const getDefaultCreditCardData = async (ynabAccount: any) => {
    if (!ynabAccount) return {};

    try {
      // Get credit card types to find appropriate type based on YNAB account type
      const creditCardTypesResponse = await axios.get(
        `${API_BASE_URL}/lookups/credit-card-types/`
      );
      const creditCardTypes = creditCardTypesResponse.data;
      const appropriateCreditCardTypeId = await getAppropriateTypeId(
        creditCardTypes,
        ynabAccount.type,
        "credit_card"
      );

      return {
        name: ynabAccount.name,
        credit_card_type: appropriateCreditCardTypeId,
        notes: ynabAccount.note || "",
        // Convert YNAB balance from millicents to dollars for display
        balance: ynabAccount.balance
          ? (ynabAccount.balance / 1000).toFixed(2)
          : "",
        cleared_balance: ynabAccount.cleared_balance
          ? (ynabAccount.cleared_balance / 1000).toFixed(2)
          : "",
        on_budget: ynabAccount.on_budget || false,
        closed: ynabAccount.closed || false,
      };
    } catch (error) {
      console.error("Error getting default credit card data:", error);
      return {
        name: ynabAccount.name,
        notes: ynabAccount.note || "",
      };
    }
  };

  // Get default data for asset creation based on YNAB account
  const getDefaultAssetData = async (ynabAccount: any) => {
    if (!ynabAccount) return {};

    try {
      // Get asset types to find appropriate type based on YNAB account type
      const assetTypesResponse = await axios.get(
        `${API_BASE_URL}/lookups/asset-types/`
      );
      const assetTypes = assetTypesResponse.data;

      // Map YNAB account types to appropriate asset types
      const getAppropriateAssetTypeId = (ynabAccountType: string) => {
        const typeCode = mapYnabDisplayNameToTypeCode(ynabAccountType);
        const assetTypeMapping: { [key: string]: string[] } = {
          otherAsset: ["Other", "Stocks", "Bonds", "Real Estate"],
          checking: ["Other"],
          savings: ["Other"],
          cash: ["Other"],
          creditCard: ["Other"], // Credit cards shouldn't be assets
          lineOfCredit: ["Other"], // Lines of credit shouldn't be assets
          otherLiability: ["Other"], // Liabilities shouldn't be assets
          mortgage: ["Real Estate"],
          autoLoan: ["Vehicles"],
          studentLoan: ["Other"],
          personalLoan: ["Other"],
          medicalDebt: ["Other"],
          otherDebt: ["Other"],
        };

        const targetNames = assetTypeMapping[typeCode.toLowerCase()] || [
          "Other",
        ];

        // Try to find an exact match first
        for (const targetName of targetNames) {
          const match = assetTypes.find(
            (type: any) => type.name.toLowerCase() === targetName.toLowerCase()
          );
          if (match) {
            console.log(
              `Found asset type match for ${ynabAccountType} (${typeCode}): ${match.name} (ID: ${match.id})`
            );
            return match.id;
          }
        }

        // Fallback to "Other" asset type
        const otherAsset = assetTypes.find(
          (type: any) => type.name.toLowerCase() === "other"
        );
        if (otherAsset) {
          console.log(
            `No exact match found for ${ynabAccountType} (${typeCode}), using Other: ${otherAsset.name} (ID: ${otherAsset.id})`
          );
          return otherAsset.id;
        }

        // Final fallback to first available type
        console.log(
          `No Other asset type found, using first available: ${assetTypes[0]?.name} (ID: ${assetTypes[0]?.id})`
        );
        return assetTypes[0]?.id;
      };

      const appropriateAssetTypeId = getAppropriateAssetTypeId(
        ynabAccount.type
      );

      return {
        name: ynabAccount.name,
        asset_type: appropriateAssetTypeId,
        notes: ynabAccount.note || "",
        // Convert YNAB balance from millicents to dollars for display
        value: ynabAccount.balance
          ? (ynabAccount.balance / 1000).toFixed(2)
          : "",
        on_budget: ynabAccount.on_budget || false,
        closed: ynabAccount.closed || false,
      };
    } catch (error) {
      console.error("Error getting default asset data:", error);
      return {
        name: ynabAccount.name,
        notes: ynabAccount.note || "",
      };
    }
  };

  // Get default data for liability creation based on YNAB account
  const getDefaultLiabilityData = async (ynabAccount: any) => {
    if (!ynabAccount) return {};

    try {
      // Get liability types to find appropriate type based on YNAB account type
      const liabilityTypesResponse = await axios.get(
        `${API_BASE_URL}/lookups/liability-types/`
      );
      const liabilityTypes = liabilityTypesResponse.data;
      const appropriateLiabilityTypeId = await getAppropriateTypeId(
        liabilityTypes,
        ynabAccount.type,
        "liability"
      );

      return {
        name: ynabAccount.name,
        liability_type: appropriateLiabilityTypeId,
        notes: ynabAccount.note || "",
        // Convert YNAB balance from millicents to dollars for display
        balance: ynabAccount.balance
          ? (ynabAccount.balance / 1000).toFixed(2)
          : "",
        on_budget: ynabAccount.on_budget || false,
        closed: ynabAccount.closed || false,
      };
    } catch (error) {
      console.error("Error getting default liability data:", error);
      return {
        name: ynabAccount.name,
        notes: ynabAccount.note || "",
      };
    }
  };

  // Convert column config to DataGrid columns
  const getDataGridColumns = (): GridColDef[] => {
    console.log("getDataGridColumns called with columns:", columns);

    const filteredColumns = columns.filter((col) => col && col.visible);
    console.log("Filtered visible columns:", filteredColumns);

    const sortedColumns = filteredColumns.sort((a, b) => a.order - b.order);
    console.log(
      "Sorted columns with order values:",
      sortedColumns.map(
        (col) =>
          `${col.field}: order=${col.order}, headerName=${col.headerName}`
      )
    );

    return sortedColumns
      .filter((col) => col !== null && col !== undefined)
      .map((col) => {
        console.log("Processing column:", col);

        return {
          field: col.field,
          headerName: col.headerName,
          width: col.width || 150,
          flex: col.width ? undefined : 1,

          renderCell: (params: any) => {
            try {
              // Add null check for params object itself
              if (!params) {
                console.warn("renderCell: params is null/undefined", { col });
                return "";
              }

              // Add null check for col
              if (!col) {
                console.warn("renderCell: col is null/undefined", {
                  params,
                  col,
                });
                return params.value || "";
              }

              // Handle null/undefined values
              if (params.value === null || params.value === undefined) {
                return "";
              }

              // Render checkbox for boolean values if useCheckbox is explicitly true
              if (
                typeof params.value === "boolean" &&
                col.useCheckbox === true
              ) {
                return <Checkbox checked={params.value} disabled />;
              }

              // Format balance values directly in renderCell (convert from millicents to dollars)
              if (
                col.field.includes("balance") &&
                typeof params.value === "number"
              ) {
                console.log(
                  `renderCell: Formatting balance for ${col.field}:`,
                  {
                    value: params.value,
                    useCurrency: col.useCurrency,
                    invertNegativeSign: col.invertNegativeSign,
                    disableNegativeSign: col.disableNegativeSign,
                    field: col.field,
                  }
                );

                // Default to true if useCurrency is null/undefined
                const shouldFormatCurrency = col.useCurrency !== false;

                if (shouldFormatCurrency) {
                  const amount = params.value / 1000;

                  // Format the absolute value first
                  let absAmount = Math.abs(amount);
                  let formattedAmount = absAmount.toFixed(2);

                  // Handle thousands separator
                  if (col.useThousandsSeparator !== false) {
                    const parts = formattedAmount.split(".");
                    parts[0] = Number(parts[0]).toLocaleString();
                    formattedAmount = parts.join(".");
                  }

                  // Determine the sign based on settings
                  let sign = "";
                  if (amount < 0) {
                    if (col.disableNegativeSign) {
                      // Don't show negative sign
                      sign = "";
                    } else if (col.invertNegativeSign) {
                      // Show positive sign for negative values
                      sign = "+";
                    } else {
                      // Show negative sign (default)
                      sign = "-";
                    }
                  } else if (amount > 0 && col.invertNegativeSign) {
                    // Show negative sign for positive values when inverted
                    sign = "-";
                  }

                  // Combine sign, currency symbol, and amount
                  const formatted = `${sign}$${formattedAmount}`;

                  console.log(
                    `renderCell: Returning formatted balance: ${formatted}`
                  );
                  return formatted;
                } else {
                  console.log(
                    `renderCell: Returning raw balance: ${params.value}`
                  );
                  return params.value.toString();
                }
              }

              // Format datetime values directly in renderCell
              if (col.field === "last_reconciled_at" && params.value) {
                console.log(
                  `renderCell: Formatting datetime for ${col.field}:`,
                  {
                    value: params.value,
                    useDatetime: col.useDatetime,
                    datetimeFormat: col.datetimeFormat,
                    field: col.field,
                  }
                );

                // Default to true if useDatetime is null/undefined
                const shouldFormatDatetime = col.useDatetime !== false;

                if (shouldFormatDatetime) {
                  try {
                    const date = new Date(params.value);
                    let formatted;

                    if (col.datetimeFormat) {
                      // Use custom format if provided
                      formatted = col.datetimeFormat
                        .replace("YYYY", date.getFullYear().toString())
                        .replace(
                          "MM",
                          (date.getMonth() + 1).toString().padStart(2, "0")
                        )
                        .replace(
                          "DD",
                          date.getDate().toString().padStart(2, "0")
                        )
                        .replace(
                          "HH",
                          date.getHours().toString().padStart(2, "0")
                        )
                        .replace(
                          "mm",
                          date.getMinutes().toString().padStart(2, "0")
                        )
                        .replace(
                          "ss",
                          date.getSeconds().toString().padStart(2, "0")
                        );
                    } else {
                      // Use default format
                      formatted =
                        date.toLocaleDateString() +
                        " " +
                        date.toLocaleTimeString();
                    }

                    console.log(
                      `renderCell: Returning formatted datetime: ${formatted}`
                    );
                    return formatted;
                  } catch (e) {
                    console.warn("Error formatting date:", e);
                    return params.value;
                  }
                } else {
                  console.log(
                    `renderCell: Returning raw datetime: ${params.value}`
                  );
                  return params.value;
                }
              }

              // Handle linked column with icons (must come before boolean handling)
              if (col.field === "linked") {
                console.log(
                  `renderCell: Processing linked column with useLinkIcon=${col.useLinkIcon}, value=${params.value}`
                );

                // Default to true if useLinkIcon is null/undefined
                const shouldUseLinkIcon = col.useLinkIcon !== false;
                console.log(
                  `renderCell: shouldUseLinkIcon=${shouldUseLinkIcon}`
                );

                if (shouldUseLinkIcon) {
                  console.log(
                    `renderCell: Returning link icon for linked column`
                  );

                  // Check if there's link data for navigation
                  const linkData = params.row.link_data;
                  const hasLinkData = linkData && linkData.core_record;

                  if (params.value && hasLinkData) {
                    // Account is linked - make icon clickable to navigate to core record
                    return (
                      <IconButton
                        size="small"
                        onClick={() =>
                          navigateToCoreRecord(
                            linkData.core_record.path,
                            linkData.core_record.id
                          )
                        }
                        sx={{ p: 0 }}
                        title={`Click to view ${linkData.core_record.name}`}
                      >
                        <LinkIcon sx={{ color: "success.main" }} />
                      </IconButton>
                    );
                  } else if (params.value) {
                    // Account is linked but no link data available
                    return <LinkIcon sx={{ color: "success.main" }} />;
                  } else {
                    // Account is not linked - show link button
                    return (
                      <IconButton
                        size="small"
                        onClick={(event) => handleLinkClick(event, params.row)}
                        sx={{ p: 0 }}
                      >
                        <LinkOffIcon sx={{ color: "text.disabled" }} />
                      </IconButton>
                    );
                  }
                } else {
                  console.log(`renderCell: Returning text for linked column`);
                  // Display as text when useLinkIcon is false
                  return params.value ? "Linked" : "Not Linked";
                }
              }

              // For boolean values, show original string values when useCheckbox is explicitly false
              if (
                typeof params.value === "boolean" &&
                col.useCheckbox === false
              ) {
                return params.value ? "true" : "false";
              }

              // Default behavior: show as text for boolean values when useCheckbox is null/undefined
              if (typeof params.value === "boolean") {
                return params.value ? "true" : "false";
              }

              // Special handling for name field - make it clickable but not underlined
              if (col.field === "name") {
                return (
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "flex-start",
                      width: "100%",
                      height: "100%",
                    }}
                    onClick={() => {
                      setSelectedAccountForDetails(params.row);
                      setDetailsModalOpen(true);
                    }}
                  >
                    <Typography
                      variant="body2"
                      sx={{
                        cursor: "pointer",
                        "&:hover": { color: "primary.main" },
                      }}
                    >
                      {params.value}
                    </Typography>
                  </Box>
                );
              }

              // For all other cases, return the raw value
              console.log(
                `renderCell: Returning raw value for ${col.field}: ${params.value}`
              );
              return params.value;
            } catch (error) {
              console.error("Error in renderCell:", error, { params, col });
              return params?.value || "";
            }
          },
        };
      });
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Loading accounts...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="error">Error: {error}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={styles.pageContainer}>
      <PageHeader
        title="Accounts"
        variant="core"
        recordType="accounts"
        onSettingsClick={() => setConfigModalOpen(true)}
        showSettings={true}
        showAdd={false}
        syncButton={
          <SyncButton
            variant="contained"
            size="medium"
            showTimestamp={true}
            buttonText="Sync YNAB"
            onSuccess={handleSyncSuccess}
            onError={handleSyncError}
          />
        }
      />

      <Box sx={styles.dataGrid}>
        <DataGrid
          key={`accounts-grid-${crossReferences.length}-${columns
            .map(
              (col) =>
                `${col.field}-${col.visible}-${col.order}-${col.headerName}`
            )
            .join("-")}-${forceRerender}`}
          rows={getTransformedAccounts()}
          columns={getDataGridColumns()}
          pageSizeOptions={[10, 25, 50, 100]}
          initialState={{
            pagination: {
              paginationModel: { page: 0, pageSize: 25 },
            },
          }}
          disableRowSelectionOnClick
          getRowId={(row) => row.id || Math.random().toString()}
          sx={styles.dataGrid}
          slots={{
            toolbar: () => (
              <GridToolbarContainer>
                <GridToolbarFilterButton />
                <GridToolbarExport />
                <GridToolbarColumnsButton />
                <GridToolbarDensitySelector />
              </GridToolbarContainer>
            ),
          }}
          onRowClick={(params) => {
            setSelectedAccountForDetails(params.row);
            setDetailsModalOpen(true);
          }}
          loading={loading}
        />
      </Box>

      <YNABConfigModal
        open={configModalOpen}
        onClose={() => {
          setConfigModalOpen(false);
          loadCrossReferences(); // Reload cross-references when modal closes
          loadColumnConfigurations(); // Reload column configurations when modal closes
        }}
        recordType="accounts"
        currentColumns={columns}
        onColumnsChange={handleColumnsChange}
      />

      <YNABAccountDetailsModal
        open={detailsModalOpen}
        onClose={() => {
          setDetailsModalOpen(false);
          setSelectedAccountForDetails(null);
        }}
        account={selectedAccountForDetails}
      />

      {/* Link Menu */}
      <Menu
        anchorEl={linkMenuAnchor}
        open={Boolean(linkMenuAnchor)}
        onClose={handleLinkMenuClose}
      >
        {selectedAccount && (
          <>
            {(() => {
              const recordType = getRecordTypeForYnabAccount(selectedAccount);
              const recordTypeName = recordType
                ? getRecordTypeDisplayName(recordType)
                : "Record";

              return (
                <>
                  <MenuItem
                    onClick={(event) =>
                      handleLinkMenuSelect(event, selectedAccount)
                    }
                  >
                    <ListItemIcon>
                      <AddIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>
                      Create & Link to New {recordTypeName}
                    </ListItemText>
                  </MenuItem>

                  {recordType && (
                    <MenuItem
                      onClick={(event) =>
                        handleLinkMenuSelect(event, selectedAccount)
                      }
                    >
                      <ListItemIcon>
                        <AddIcon fontSize="small" />
                      </ListItemIcon>
                      <ListItemText>
                        Create & Link to Other Record Type
                      </ListItemText>
                    </MenuItem>
                  )}

                  <MenuItem
                    onClick={(event) =>
                      handleLinkMenuSelect(event, selectedAccount)
                    }
                  >
                    <ListItemIcon>
                      <SearchIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>Link to Existing Record</ListItemText>
                  </MenuItem>
                </>
              );
            })()}
          </>
        )}
      </Menu>

      {/* Link to Existing Dialog */}
      <Dialog
        open={linkDialogOpen}
        onClose={handleLinkDialogClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Link to Existing Core Record</DialogTitle>
        <DialogContent>
          <FormControl fullWidth margin="dense">
            <InputLabel>Select Existing Core Record</InputLabel>
            <Select
              value={selectedExistingAccount}
              onChange={(e) => setSelectedExistingAccount(e.target.value)}
              label="Select Existing Core Record"
            >
              {loadingExistingAccounts ? (
                <MenuItem disabled>
                  <CircularProgress size={20} sx={{ mr: 1 }} />
                  Loading records...
                </MenuItem>
              ) : (
                existingAccounts.map((record) => (
                  <MenuItem key={record.id} value={record.id}>
                    {record.name} ({record.recordTypeLabel})
                  </MenuItem>
                ))
              )}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleLinkDialogClose}>Cancel</Button>
          <Button
            onClick={handleLinkToExisting}
            variant="contained"
            disabled={!selectedExistingAccount}
          >
            Link
          </Button>
        </DialogActions>
      </Dialog>

      {/* Account Form Dialog for creating new accounts */}
      <AccountFormDialog
        open={accountFormOpen}
        onClose={handleAccountFormClose}
        account={null} // Always create new account
        defaultData={defaultAccountData}
        linkedYnabAccount={accountToLink}
      />

      {/* Record Type Selection Dialog */}
      <Dialog
        open={recordTypeSelectionOpen}
        onClose={() => setRecordTypeSelectionOpen(false)}
      >
        <DialogTitle>Select Record Type</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Choose what type of record you want to create for this YNAB account:
          </DialogContentText>
          <List>
            <ListItem
              button
              onClick={() => handleRecordTypeSelection("account")}
            >
              <ListItemIcon>
                <AccountBalanceIcon />
              </ListItemIcon>
              <ListItemText primary="Account" />
            </ListItem>
            <ListItem
              button
              onClick={() => handleRecordTypeSelection("credit_card")}
            >
              <ListItemIcon>
                <CreditCardIcon />
              </ListItemIcon>
              <ListItemText primary="Credit Card" />
            </ListItem>
            <ListItem button onClick={() => handleRecordTypeSelection("asset")}>
              <ListItemIcon>
                <TrendingUpIcon />
              </ListItemIcon>
              <ListItemText primary="Asset" />
            </ListItem>
            <ListItem
              button
              onClick={() => handleRecordTypeSelection("liability")}
            >
              <ListItemIcon>
                <TrendingDownIcon />
              </ListItemIcon>
              <ListItemText primary="Liability" />
            </ListItem>
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRecordTypeSelectionOpen(false)}>
            Cancel
          </Button>
        </DialogActions>
      </Dialog>

      {/* Credit Card Form Dialog for creating new credit cards */}
      <CreditCardFormDialog
        open={creditCardFormOpen}
        onClose={handleCreditCardFormClose}
        creditCard={null} // Always create new credit card
        defaultData={defaultCreditCardData}
        linkedYnabAccount={accountToLink}
      />

      {/* Asset Form Dialog for creating new assets */}
      <AssetFormDialog
        open={assetFormOpen}
        onClose={handleAssetFormClose}
        asset={null} // Always create new asset
        defaultData={defaultAssetData}
        linkedYnabAccount={accountToLink}
      />

      {/* Liability Form Dialog for creating new liabilities */}
      <LiabilityFormDialog
        open={liabilityFormOpen}
        onClose={handleLiabilityFormClose}
        liability={null} // Always create new liability
        defaultData={defaultLiabilityData}
        linkedYnabAccount={accountToLink}
      />
    </Box>
  );
};

export default YNABAccountsPage;
