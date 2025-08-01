import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Box,
  TextField,
  Button,
  CircularProgress,
  Snackbar,
  Alert,
  Switch,
  FormControlLabel,
  MenuItem,
  Input,
  InputAdornment,
  InputLabel,
  FormControl,
  Select,
  IconButton,
} from "@mui/material";
import {
  ExpandMore as ExpandMoreIcon,
  Save as SaveIcon,
  Clear as ClearIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
} from "@mui/icons-material";
import CrudGrid from "../components/CrudGrid";
import type { GridColDef } from "@mui/x-data-grid";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useState, useEffect } from "react";
import {
  ACCOUNT_TYPES_URL,
  ASSET_TYPES_URL,
  LIABILITY_TYPES_URL,
  CREDIT_CARD_TYPES_URL,
  PAYMENT_METHODS_URL,
  POINTS_PROGRAMS_URL,
  API_BASE_URL,
} from "../constants";
import PageSection from "../components/PageSection";
import LookupTable from "../components/lookups/LookupTable";
import { SyncButton } from "../components/SyncButton";

interface SettingGridProps {
  title: string;
  endpoint: string;
  columns: GridColDef[];
}

function SettingGrid({ title, endpoint, columns }: SettingGridProps) {
  return (
    <Accordion>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography variant="h6">{title}</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <CrudGrid endpoint={endpoint} columns={columns} />
      </AccordionDetails>
    </Accordion>
  );
}

function YnabPluginSettings({
  ynabConfig,
  onSaveApiKey,
  onClearApiKey,
  onSaveBudget,
  onSync,
  saveApiKeyMutation,
  clearApiKeyMutation,
  saveBudgetMutation,
  syncMutation,
  onSyncSuccess,
}: {
  ynabConfig: any;
  onSaveApiKey: (apiKey: string) => void;
  onClearApiKey: () => void;
  onSaveBudget: (budgetId: string) => void;
  onSync: () => void;
  saveApiKeyMutation: any;
  clearApiKeyMutation: any;
  saveBudgetMutation: any;
  syncMutation: any;
  onSyncSuccess: () => void;
}) {
  const [apiKey, setApiKey] = useState("");
  const [budgetId, setBudgetId] = useState("");
  const [lastSynced, setLastSynced] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [hasSuccessfulSync, setHasSuccessfulSync] = useState(false);

  const isApiKeyLocked = ynabConfig?.api_key;

  useEffect(() => {
    setApiKey(ynabConfig?.api_key || "");
    setBudgetId(ynabConfig?.budget_id || "");
    setLastSynced(ynabConfig?.last_synced || null);
    // Only show timestamp if there's been a successful sync
    setHasSuccessfulSync(!!ynabConfig?.last_synced);
  }, [ynabConfig]);

  // Watch for sync success and update hasSuccessfulSync
  useEffect(() => {
    if (syncMutation.isSuccess && !hasSuccessfulSync) {
      setHasSuccessfulSync(true);
      onSyncSuccess();
    }
  }, [syncMutation.isSuccess, hasSuccessfulSync, onSyncSuccess]);

  const { data: budgets, isLoading: isLoadingBudgets } = useQuery({
    queryKey: ["ynabBudgets", ynabConfig?.api_key],
    queryFn: () =>
      axios
        .get(`${API_BASE_URL}/ynab/budgets/`, {
          headers: { "X-YNAB-API-Key": ynabConfig.api_key },
        })
        .then((res) => {
          // The backend returns: { data: { budgets: [...] } }
          const responseData = res.data;
          if (
            responseData &&
            responseData.data &&
            Array.isArray(responseData.data.budgets)
          ) {
            return responseData.data.budgets;
          } else if (Array.isArray(responseData)) {
            return responseData;
          } else if (responseData && Array.isArray(responseData.data)) {
            return responseData.data;
          } else if (responseData && Array.isArray(responseData.budgets)) {
            return responseData.budgets;
          } else {
            console.warn(
              "Unexpected YNAB budgets response format:",
              responseData
            );
            return [];
          }
        })
        .catch((error) => {
          console.error("Error fetching YNAB budgets:", error);
          return [];
        }),
    enabled: !!isApiKeyLocked,
  });

  const handleSaveApiKey = () => {
    if (apiKey) {
      onSaveApiKey(apiKey);
    }
  };

  const handleBudgetChange = (event: any) => {
    const newBudgetId = event.target.value;
    setBudgetId(newBudgetId);
    onSaveBudget(newBudgetId);
  };

  return (
    <Accordion defaultExpanded>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography variant="h6">YNAB Plugin</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Box
          component="form"
          noValidate
          autoComplete="off"
          sx={{ display: "flex", flexDirection: "column", gap: 2 }}
        >
          <FormControl fullWidth variant="standard">
            <InputLabel htmlFor="ynab-api-key">YNAB API Key</InputLabel>
            <Input
              id="ynab-api-key"
              type={showPassword ? "text" : "password"}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              disabled={isApiKeyLocked}
              endAdornment={
                <InputAdornment position="end">
                  <IconButton
                    aria-label="toggle password visibility"
                    onClick={() => setShowPassword(!showPassword)}
                    edge="end"
                  >
                    {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                  </IconButton>
                  {isApiKeyLocked ? (
                    <IconButton
                      aria-label="clear api key"
                      onClick={onClearApiKey}
                      disabled={clearApiKeyMutation.isPending}
                    >
                      {clearApiKeyMutation.isPending ? (
                        <CircularProgress size={24} />
                      ) : (
                        <ClearIcon />
                      )}
                    </IconButton>
                  ) : (
                    <IconButton
                      aria-label="save api key"
                      onClick={handleSaveApiKey}
                      disabled={saveApiKeyMutation.isPending}
                    >
                      {saveApiKeyMutation.isPending ? (
                        <CircularProgress size={24} />
                      ) : (
                        <SaveIcon />
                      )}
                    </IconButton>
                  )}
                </InputAdornment>
              }
            />
          </FormControl>

          {isApiKeyLocked && (
            <FormControl fullWidth>
              <InputLabel id="budget-select-label">Budget</InputLabel>
              <Select
                labelId="budget-select-label"
                id="budget-select"
                value={budgetId}
                label="Budget"
                onChange={handleBudgetChange}
                disabled={isLoadingBudgets || saveBudgetMutation.isPending}
              >
                {isLoadingBudgets && (
                  <MenuItem>
                    <em>Loading budgets...</em>
                  </MenuItem>
                )}
                {Array.isArray(budgets) &&
                  budgets.map((budget: any) => (
                    <MenuItem key={budget.id} value={budget.id}>
                      {budget.name}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
          )}

          {isApiKeyLocked && ynabConfig?.budget_id && (
            <SyncButton
              variant="contained"
              size="medium"
              showTimestamp={true}
              buttonText="Sync YNAB"
            />
          )}
        </Box>
      </AccordionDetails>
    </Accordion>
  );
}

const assetTypeColumns: GridColDef[] = [
  { field: "name", headerName: "Name", flex: 1 },
  {
    field: "associated_records_count",
    headerName: "Associated Records",
    flex: 0.5,
    type: "number",
    valueFormatter: (params: any) => {
      if (params.value != null && !isNaN(Number(params.value))) {
        return params.value.toString();
      }
      return "0";
    },
  },
];

const liabilityTypeColumns: GridColDef[] = [
  { field: "name", headerName: "Name", flex: 1 },
  {
    field: "associated_records_count",
    headerName: "Associated Records",
    flex: 0.5,
    type: "number",
    valueFormatter: (params: any) => {
      if (params.value != null && !isNaN(Number(params.value))) {
        return params.value.toString();
      }
      return "0";
    },
  },
];

const creditCardTypeColumns: GridColDef[] = [
  { field: "name", headerName: "Name", flex: 1 },
  {
    field: "associated_records_count",
    headerName: "Associated Records",
    flex: 0.5,
    type: "number",
    valueFormatter: (params: any) => {
      if (params.value != null && !isNaN(Number(params.value))) {
        return params.value.toString();
      }
      return "0";
    },
  },
];

const paymentMethodColumns: GridColDef[] = [
  { field: "name", headerName: "Name", flex: 1 },
  {
    field: "associated_records_count",
    headerName: "Associated Records",
    flex: 0.5,
    type: "number",
    valueFormatter: (params: any) => {
      if (params.value != null && !isNaN(Number(params.value))) {
        return params.value.toString();
      }
      return "0";
    },
  },
];

const pointsProgramColumns: GridColDef[] = [
  { field: "name", headerName: "Name", flex: 1 },
  {
    field: "associated_records_count",
    headerName: "Associated Records",
    flex: 0.5,
    type: "number",
    valueFormatter: (params: any) => {
      if (params.value != null && !isNaN(Number(params.value))) {
        return params.value.toString();
      }
      return "0";
    },
  },
];

const accountTypeColumns: GridColDef[] = [
  { field: "name", headerName: "Name", flex: 1 },
  {
    field: "associated_records_count",
    headerName: "Associated Records",
    flex: 0.5,
    type: "number",
    valueFormatter: (params: any) => {
      if (params.value != null && !isNaN(Number(params.value))) {
        return params.value.toString();
      }
      return "0";
    },
  },
];

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [snackbar, setSnackbar] = useState<{
    message: string;
    severity: "success" | "error";
  } | null>(null);

  const { data: ynabConfig, isLoading: isLoadingYnabConfig } = useQuery({
    queryKey: ["ynabConfig"],
    queryFn: () =>
      axios.get(`${API_BASE_URL}/ynab/config/`).then((res) => res.data),
  });

  const saveApiKeyMutation = useMutation({
    mutationFn: (newApiKey: string) =>
      axios
        .get(`${API_BASE_URL}/ynab/budgets/`, {
          headers: { "X-YNAB-API-Key": newApiKey },
        })
        .then(() => {
          return axios.put(`${API_BASE_URL}/ynab/config/`, {
            api_key: newApiKey,
            budget_id: "",
          });
        }),
    onSuccess: (savedData) => {
      queryClient.setQueryData(["ynabConfig"], savedData.data);
      queryClient.invalidateQueries({
        queryKey: ["ynabBudgets", savedData.data.api_key],
      });
      setSnackbar({
        message: "API Key is valid and has been saved successfully!",
        severity: "success",
      });
    },
    onError: (error: any) => {
      let errorMessage =
        "An unexpected error occurred while validating the API key.";

      if (error.response) {
        const { status, data } = error.response;

        switch (status) {
          case 401:
            errorMessage =
              "Invalid API Key. Please check your YNAB Personal Access Token and try again.";
            break;
          case 403:
            errorMessage =
              "API Key is valid but doesn't have the required permissions. Please check your YNAB account settings.";
            break;
          case 429:
            errorMessage =
              "Too many requests. Please wait a moment and try again.";
            break;
          case 500:
            errorMessage =
              "YNAB service is unavailable. Please check that your API key is valid, or try again later.";
            break;
          case 502:
          case 503:
          case 504:
            errorMessage =
              "Unable to connect to YNAB. Please check your internet connection and try again.";
            break;
          default:
            if (data?.error) {
              errorMessage = `YNAB API Error: ${data.error}`;
            } else if (data?.message) {
              errorMessage = `YNAB API Error: ${data.message}`;
            } else {
              errorMessage = `API Error (${status}): Unable to validate the API key.`;
            }
        }
      } else if (error.request) {
        errorMessage =
          "Unable to connect to YNAB. Please check your internet connection and try again.";
      } else if (error.message) {
        errorMessage = `Network Error: ${error.message}`;
      }

      setSnackbar({
        message: errorMessage,
        severity: "error",
      });
    },
  });

  const clearApiKeyMutation = useMutation({
    mutationFn: () =>
      axios.put(`${API_BASE_URL}/ynab/config/`, {
        api_key: "",
        budget_id: "",
      }),
    onSuccess: (savedData) => {
      queryClient.setQueryData(["ynabConfig"], savedData.data);
      setSnackbar({
        message: "API Key has been cleared successfully.",
        severity: "success",
      });
    },
    onError: (error: any) => {
      let errorMessage = "Failed to clear API Key.";

      if (error.response?.data?.error) {
        errorMessage = `Error: ${error.response.data.error}`;
      } else if (error.response?.data?.message) {
        errorMessage = `Error: ${error.response.data.message}`;
      }

      setSnackbar({
        message: errorMessage,
        severity: "error",
      });
    },
  });

  const saveBudgetMutation = useMutation({
    mutationFn: (newBudgetId: string) =>
      axios.put(`${API_BASE_URL}/ynab/config/`, {
        budget_id: newBudgetId,
      }),
    onSuccess: (savedData) => {
      queryClient.setQueryData(["ynabConfig"], savedData.data);
      setSnackbar({
        message: "Budget has been saved successfully.",
        severity: "success",
      });
    },
    onError: (error: any) => {
      let errorMessage = "Failed to save budget.";

      if (error.response?.data?.error) {
        errorMessage = `Error: ${error.response.data.error}`;
      } else if (error.response?.data?.message) {
        errorMessage = `Error: ${error.response.data.message}`;
      }

      setSnackbar({
        message: errorMessage,
        severity: "error",
      });
    },
  });

  const syncMutation = useMutation({
    mutationFn: () => axios.post(`${API_BASE_URL}/ynab/sync/`),
    onSuccess: () => {
      queryClient.invalidateQueries(); // Invalidate all queries after sync
      setSnackbar({
        message: "YNAB data has been synced successfully!",
        severity: "success",
      });
    },
    onError: (error: any) => {
      let errorMessage = "Sync failed.";

      if (error.response?.data?.message) {
        errorMessage = `Sync Error: ${error.response.data.message}`;
      } else if (error.response?.data?.error) {
        errorMessage = `Sync Error: ${error.response.data.error}`;
      } else if (error.response?.status === 400) {
        errorMessage =
          "Sync failed: Please configure your YNAB API key and budget ID first.";
      } else if (error.response?.status === 401) {
        errorMessage =
          "Sync failed: Invalid API key. Please check your YNAB settings.";
      } else if (error.response?.status === 500) {
        errorMessage =
          "Sync failed: YNAB service is temporarily unavailable. Please try again later.";
      }

      setSnackbar({
        message: errorMessage,
        severity: "error",
      });
    },
  });

  const handleCloseSnackbar = () => {
    setSnackbar(null);
  };

  const handleSyncSuccess = () => {
    // This will be called by the YnabPluginSettings component when sync is successful
    // The component will handle setting hasSuccessfulSync internally
  };

  if (isLoadingYnabConfig) {
    return <CircularProgress />;
  }

  return (
    <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 2 }}>
      <Typography variant="h4" gutterBottom>
        Settings
      </Typography>

      <PageSection title="Plugins">
        <YnabPluginSettings
          ynabConfig={ynabConfig}
          onSaveApiKey={saveApiKeyMutation.mutate}
          onClearApiKey={clearApiKeyMutation.mutate}
          onSaveBudget={saveBudgetMutation.mutate}
          onSync={syncMutation.mutate}
          saveApiKeyMutation={saveApiKeyMutation}
          clearApiKeyMutation={clearApiKeyMutation}
          saveBudgetMutation={saveBudgetMutation}
          syncMutation={syncMutation}
          onSyncSuccess={handleSyncSuccess}
        />
      </PageSection>

      <PageSection title="Lookup Tables">
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <LookupTable
            title="Account Types"
            endpoint={ACCOUNT_TYPES_URL}
            columns={accountTypeColumns}
          />
          <LookupTable
            title="Asset Types"
            endpoint={ASSET_TYPES_URL}
            columns={assetTypeColumns}
          />
          <LookupTable
            title="Liability Types"
            endpoint={LIABILITY_TYPES_URL}
            columns={liabilityTypeColumns}
          />
          <LookupTable
            title="Credit Card Types"
            endpoint={CREDIT_CARD_TYPES_URL}
            columns={creditCardTypeColumns}
          />
          <LookupTable
            title="Payment Methods"
            endpoint={PAYMENT_METHODS_URL}
            columns={paymentMethodColumns}
          />
          <LookupTable
            title="Points Programs"
            endpoint={POINTS_PROGRAMS_URL}
            columns={pointsProgramColumns}
          />
        </Box>
      </PageSection>

      <Snackbar
        open={!!snackbar}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar?.severity}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {snackbar?.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
