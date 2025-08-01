import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Alert,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  FormControlLabel,
  Checkbox,
  Radio,
  RadioGroup,
  Chip,
  IconButton,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Switch,
  TextField,
  Paper,
  Divider,
  Tabs,
  Tab,
} from "@mui/material";
import {
  Settings as SettingsIcon,
  Refresh as RefreshIcon,
  Link as LinkIcon,
  LinkOff as LinkOffIcon,
  ExpandMore as ExpandMoreIcon,
  DragIndicator as DragIndicatorIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Close as CloseIcon,
  Save as SaveIcon,
  RestartAlt as RestartAltIcon,
} from "@mui/icons-material";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import axios from "axios";
import { API_BASE_URL } from "../constants";
import PageHeader from "../components/PageHeader";
import { useTheme } from "@mui/material/styles";
import { getPageStyles } from "../styles/theme";
import TransferList from "../components/TransferList";

interface Transaction {
  id: string;
  date: string;
  payee: string;
  category: string;
  amount: number;
  memo: string;
  account: string;
  credit_card?: string;
  source: string;
  source_id: string;
  linked_account?: string;
  linked_category?: string;
  linked_payee?: string;
}

interface PluginConfig {
  id: string;
  name: string;
  enabled: boolean;
  has_transactions: boolean;
}

const TransactionsPage: React.FC = () => {
  const theme = useTheme();
  const styles = getPageStyles(theme);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [plugins, setPlugins] = useState<PluginConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [enabledSources, setEnabledSources] = useState<string[]>([]);

  // Configuration modal state
  const [configModalOpen, setConfigModalOpen] = React.useState(false);
  const [expandedAccordion, setExpandedAccordion] = React.useState<
    string | false
  >("columns");
  const [draggedIndex, setDraggedIndex] = React.useState<number | null>(null);

  // Source column display options
  const [showSourceColumn, setShowSourceColumn] = React.useState<
    "always" | "multiple" | "never"
  >("multiple");

  // Initialize visible columns after columns are defined
  const [visibleColumns, setVisibleColumns] = React.useState<GridColDef[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  // Initialize visible columns when columns are defined
  useEffect(() => {
    setVisibleColumns(columns);
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load available plugins
      const pluginsResponse = await axios.get(`${API_BASE_URL}/plugins/`);
      const pluginsData = Array.isArray(pluginsResponse.data)
        ? pluginsResponse.data
        : [];
      setPlugins(pluginsData);

      // Load enabled transaction sources from settings
      const settingsResponse = await axios.get(
        `${API_BASE_URL}/settings/transaction-sources/`
      );
      const enabledSourcesData = settingsResponse.data?.enabled_sources || [];
      setEnabledSources(enabledSourcesData);

      // Load transactions from enabled sources
      if (enabledSourcesData.length > 0) {
        const transactionsResponse = await axios.get(
          `${API_BASE_URL}/data/transactions/`,
          {
            params: { sources: enabledSourcesData.join(",") },
          }
        );
        const transactionsData = Array.isArray(transactionsResponse.data)
          ? transactionsResponse.data
          : [];
        setTransactions(transactionsData);
      } else {
        setTransactions([]);
      }
    } catch (err) {
      console.error("Error loading transactions data:", err);
      setError("Failed to load transactions data");
    } finally {
      setLoading(false);
    }
  };

  const handleConfigSave = async () => {
    try {
      await axios.post(`${API_BASE_URL}/settings/transaction-sources/`, {
        enabled_sources: enabledSources,
      });
      setConfigModalOpen(false);
      loadData(); // Reload data with new sources
    } catch (err) {
      console.error("Error saving transaction sources config:", err);
      setError("Failed to save configuration");
    }
  };

  const handleRefresh = () => {
    loadData();
  };

  const getLinkedStatus = (transaction: Transaction) => {
    const linkedCount = [
      transaction.linked_account,
      transaction.linked_category,
      transaction.linked_payee,
    ].filter(Boolean).length;

    if (linkedCount === 0) return { status: "unlinked", count: 0 };
    if (linkedCount === 3) return { status: "fully_linked", count: 3 };
    return { status: "partially_linked", count: linkedCount };
  };

  const columns: GridColDef[] = [
    {
      field: "id",
      headerName: "ID",
      width: 300,
      renderCell: (params) => (
        <Typography variant="body2" sx={{ fontFamily: "monospace" }}>
          {params.value}
        </Typography>
      ),
    },
    {
      field: "date",
      headerName: "Date",
      width: 150,
      renderCell: (params) => {
        const date = params.value
          ? new Date(params.value).toLocaleDateString()
          : "";
        return <Typography variant="body2">{date}</Typography>;
      },
    },
    {
      field: "account_name",
      headerName: "Account",
      width: 200,
      renderCell: (params) => (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography variant="body2">{params.value}</Typography>
          {params.row.linked_account && (
            <Tooltip title="Linked to core account">
              <LinkIcon fontSize="small" color="success" />
            </Tooltip>
          )}
        </Box>
      ),
    },
    {
      field: "payee_name",
      headerName: "Payee",
      width: 200,
      renderCell: (params) => (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography variant="body2">{params.value}</Typography>
          {params.row.linked_payee && (
            <Tooltip title="Linked to core payee">
              <LinkIcon fontSize="small" color="success" />
            </Tooltip>
          )}
        </Box>
      ),
    },
    {
      field: "category_name",
      headerName: "Category",
      width: 200,
      renderCell: (params) => (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography variant="body2">{params.value}</Typography>
          {params.row.linked_category && (
            <Tooltip title="Linked to core category">
              <LinkIcon fontSize="small" color="success" />
            </Tooltip>
          )}
        </Box>
      ),
    },
    {
      field: "memo",
      headerName: "Memo",
      width: 300,
      renderCell: (params) => (
        <Typography variant="body2" sx={{ fontStyle: "italic" }}>
          {params.value || "-"}
        </Typography>
      ),
    },
    {
      field: "amount",
      headerName: "Amount",
      width: 150,
      type: "number",
      renderCell: (params) => (
        <Typography
          variant="body2"
          sx={{
            color: params.value >= 0 ? "success.main" : "error.main",
            fontWeight: "medium",
          }}
        >
          {new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
          }).format(params.value)}
        </Typography>
      ),
    },
    {
      field: "cleared",
      headerName: "Cleared",
      width: 120,
      type: "boolean",
      renderCell: (params) => (
        <Chip
          label={params.value ? "Yes" : "No"}
          size="small"
          color={params.value ? "success" : "default"}
          variant="outlined"
        />
      ),
    },
    {
      field: "approved",
      headerName: "Approved",
      width: 120,
      type: "boolean",
      renderCell: (params) => (
        <Chip
          label={params.value ? "Yes" : "No"}
          size="small"
          color={params.value ? "success" : "default"}
          variant="outlined"
        />
      ),
    },
    {
      field: "flag_color",
      headerName: "Flag Color",
      width: 120,
      renderCell: (params) =>
        params.value ? (
          <Box
            sx={{
              width: 20,
              height: 20,
              backgroundColor: params.value,
              borderRadius: "50%",
              border: "1px solid #ccc",
            }}
          />
        ) : (
          <Typography variant="body2" color="text.secondary">
            -
          </Typography>
        ),
    },
    {
      field: "transfer_account_id",
      headerName: "Transfer Account ID",
      width: 300,
      renderCell: (params) => (
        <Typography
          variant="body2"
          sx={{ fontFamily: "monospace", fontSize: "0.75rem" }}
        >
          {params.value || "-"}
        </Typography>
      ),
    },
    {
      field: "transfer_transaction_id",
      headerName: "Transfer Transaction ID",
      width: 300,
      renderCell: (params) => (
        <Typography
          variant="body2"
          sx={{ fontFamily: "monospace", fontSize: "0.75rem" }}
        >
          {params.value || "-"}
        </Typography>
      ),
    },
    {
      field: "import_id",
      headerName: "Import ID",
      width: 300,
      renderCell: (params) => (
        <Typography
          variant="body2"
          sx={{ fontFamily: "monospace", fontSize: "0.75rem" }}
        >
          {params.value || "-"}
        </Typography>
      ),
    },
    {
      field: "deleted",
      headerName: "Deleted",
      width: 100,
      type: "boolean",
      renderCell: (params) => (
        <Chip
          label={params.value ? "Yes" : "No"}
          size="small"
          color={params.value ? "error" : "default"}
          variant="outlined"
        />
      ),
    },
    {
      field: "source",
      headerName: "Source",
      width: 120,
      renderCell: (params) => (
        <Chip
          label={params.value}
          size="small"
          variant="outlined"
          color="primary"
        />
      ),
    },
    {
      field: "linked_status",
      headerName: "Linked",
      width: 100,
      renderCell: (params) => {
        const { status, count } = getLinkedStatus(params.row);
        return (
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            {status === "fully_linked" && (
              <Tooltip title="Fully linked to core records">
                <LinkIcon fontSize="small" color="success" />
              </Tooltip>
            )}
            {status === "partially_linked" && (
              <Tooltip title={`${count}/3 records linked`}>
                <LinkIcon fontSize="small" color="warning" />
              </Tooltip>
            )}
            {status === "unlinked" && (
              <Tooltip title="No core records linked">
                <LinkOffIcon fontSize="small" color="disabled" />
              </Tooltip>
            )}
          </Box>
        );
      },
    },
  ];

  // Default column configurations for each source
  const getDefaultColumnsForSource = (sourceId: string): GridColDef[] => {
    switch (sourceId) {
      case "ynab":
        return [
          { field: "date", headerName: "Date", width: 150 },
          { field: "account_name", headerName: "Account", width: 200 },
          { field: "payee_name", headerName: "Payee", width: 200 },
          { field: "category_name", headerName: "Category", width: 200 },
          { field: "memo", headerName: "Memo", width: 300 },
          { field: "amount", headerName: "Amount", width: 150 },
          { field: "cleared", headerName: "Cleared", width: 120 },
        ];
      default:
        return columns; // Fallback to all columns
    }
  };

  const handleColumnToggle = (field: string) => {
    const isVisible = visibleColumns.some((col) => col.field === field);
    if (isVisible) {
      setVisibleColumns(visibleColumns.filter((col) => col.field !== field));
    } else {
      const column = columns.find((col) => col.field === field);
      if (column) {
        setVisibleColumns([...visibleColumns, column]);
      }
    }
  };

  const handleColumnReorder = (fromIndex: number, toIndex: number) => {
    const newColumns = [...visibleColumns];
    const [movedColumn] = newColumns.splice(fromIndex, 1);
    newColumns.splice(toIndex, 0, movedColumn);
    setVisibleColumns(newColumns);
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== dropIndex) {
      handleColumnReorder(draggedIndex, dropIndex);
    }
    setDraggedIndex(null);
  };

  const availableSources = plugins
    .filter((plugin) => plugin.has_transactions)
    .map((plugin) => ({ id: plugin.id, name: plugin.name }));

  return (
    <Box sx={styles.pageContainer}>
      <PageHeader
        title="Transactions"
        variant="core"
        recordType="transactions"
        onAddClick={undefined}
        showAdd={false}
        showSettings={true}
        onSettingsClick={() => setConfigModalOpen(true)}
      />

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
        <Button
          variant="contained"
          startIcon={<RefreshIcon />}
          onClick={handleRefresh}
          disabled={loading}
          sx={{
            backgroundColor: "#1976d2",
            color: "white",
            "&:hover": {
              backgroundColor: "#1565c0",
            },
            "&:disabled": {
              backgroundColor: "#e0e0e0",
              color: "#757575",
            },
          }}
        >
          REFRESH
        </Button>
      </Box>

      {enabledSources.length === 0 ? (
        <Alert severity="info">
          No transaction sources configured. Click the settings icon to enable
          transaction sources like YNAB.
        </Alert>
      ) : (
        <Box sx={{ height: 600, width: "100%" }}>
          <DataGrid
            rows={transactions}
            columns={visibleColumns}
            pageSize={25}
            rowsPerPageOptions={[10, 25, 50, 100]}
            disableSelectionOnClick
            loading={loading}
            getRowId={(row) => `${row.source}_${row.source_id}`}
            sx={{
              "& .MuiDataGrid-cell": {
                borderBottom: "1px solid #e0e0e0",
              },
              "& .MuiDataGrid-columnHeaders": {
                backgroundColor: "#f5f5f5",
                borderBottom: "2px solid #e0e0e0",
              },
            }}
          />
        </Box>
      )}

      {/* Configuration Modal */}
      <Dialog
        open={configModalOpen}
        onClose={() => setConfigModalOpen(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            width: "95vw",
            maxWidth: "1400px",
          },
        }}
      >
        <DialogTitle
          sx={{
            backgroundColor: "#F8F9FA",
            color: "#2C3E50",
            borderBottom: "1px solid #E9ECEF",
          }}
        >
          Transactions Configuration
        </DialogTitle>

        <DialogContent sx={{ backgroundColor: "#F8F9FA", p: 0 }}>
          <Tabs
            value={expandedAccordion}
            onChange={(e, newValue) => setExpandedAccordion(newValue)}
            sx={{
              px: 3,
              pt: 2,
              mb: 3,
              "& .MuiTab-root": {
                color: "#2C3E50",
                "&.Mui-selected": {
                  color: "#3B5EDA",
                },
              },
              "& .MuiTabs-indicator": {
                backgroundColor: "#3B5EDA",
              },
            }}
          >
            <Tab label="Column Management" value="columns" />
            <Tab label="Transaction Sources" value="sources" />
          </Tabs>

          {expandedAccordion === "columns" && (
            <Box sx={{ px: 3, pb: 3 }}>
              <Typography
                variant="body2"
                sx={{ color: "#2C3E50", opacity: 0.8, mb: 3 }}
              >
                Use the transfer list below to move columns between available
                and displayed lists. The order in the displayed list determines
                the column order in the table.
              </Typography>

              <Paper sx={{ p: 2, backgroundColor: "#FFFFFF" }}>
                <TransferList
                  available={columns
                    .filter(
                      (col) =>
                        !visibleColumns.some((vc) => vc.field === col.field)
                    )
                    .map((col) => col.field)}
                  displayed={visibleColumns.map((col) => col.field)}
                  onMoveToDisplayed={(fields) => {
                    const newColumns = fields
                      .map((field) =>
                        columns.find((col) => col.field === field)
                      )
                      .filter(Boolean);
                    setVisibleColumns((prev) => [...prev, ...newColumns]);
                  }}
                  onMoveToAvailable={(fields) => {
                    setVisibleColumns((prev) =>
                      prev.filter((col) => !fields.includes(col.field))
                    );
                  }}
                  onReorderDisplayed={(newOrder) => {
                    const newColumns = newOrder
                      .map((field) =>
                        columns.find((col) => col.field === field)
                      )
                      .filter(Boolean);
                    setVisibleColumns(newColumns);
                  }}
                  recordType="transactions"
                  onColumnConfigChange={() => {}}
                  columns={columns}
                />

                <Box sx={{ mt: 2, display: "flex", justifyContent: "center" }}>
                  <Button
                    variant="outlined"
                    color="warning"
                    onClick={() => setVisibleColumns(columns)}
                    startIcon={<RestartAltIcon />}
                    sx={{
                      color: "#ed6c02",
                      borderColor: "#ed6c02",
                      "&:hover": {
                        borderColor: "#e65100",
                        backgroundColor: "rgba(237, 108, 2, 0.04)",
                      },
                    }}
                  >
                    Reset Default Columns
                  </Button>
                </Box>
              </Paper>
            </Box>
          )}

          {expandedAccordion === "sources" && (
            <Box sx={{ px: 3, pb: 3 }}>
              <Typography variant="h6" sx={{ color: "#2C3E50", mb: 2 }}>
                Transaction Sources
              </Typography>
              <Typography
                variant="body2"
                sx={{ color: "#2C3E50", opacity: 0.8, mb: 3 }}
              >
                Enable transaction sources to display their data in the
                transactions grid.
              </Typography>

              <Paper sx={{ p: 2, backgroundColor: "#FFFFFF" }}>
                {availableSources.map((source) => (
                  <FormControlLabel
                    key={source.id}
                    control={
                      <Switch
                        checked={enabledSources.includes(source.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setEnabledSources([...enabledSources, source.id]);
                          } else {
                            setEnabledSources(
                              enabledSources.filter((s) => s !== source.id)
                            );
                          }
                        }}
                      />
                    }
                    label={source.name}
                    sx={{ display: "block", mb: 1 }}
                  />
                ))}

                <Divider sx={{ my: 2 }} />

                <Typography variant="h6" sx={{ color: "#2C3E50", mb: 2 }}>
                  Source Column Display
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ color: "#2C3E50", opacity: 0.8, mb: 2 }}
                >
                  Configure when to show the Source column:
                </Typography>
                <FormControl component="fieldset">
                  <RadioGroup
                    value={showSourceColumn}
                    onChange={(e) =>
                      setShowSourceColumn(
                        e.target.value as "always" | "multiple" | "never"
                      )
                    }
                  >
                    <FormControlLabel
                      value="always"
                      control={<Radio />}
                      label="Always show"
                    />
                    <FormControlLabel
                      value="multiple"
                      control={<Radio />}
                      label={`Show if multiple sources exist (${enabledSources.length} enabled)`}
                    />
                    <FormControlLabel
                      value="never"
                      control={<Radio />}
                      label="Never show"
                    />
                  </RadioGroup>
                </FormControl>
              </Paper>
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 3, gap: 2, backgroundColor: "#F8F9FA" }}>
          <Button onClick={() => setConfigModalOpen(false)}>Cancel</Button>
          <Button
            onClick={handleConfigSave}
            variant="contained"
            startIcon={<SaveIcon />}
          >
            Save Configuration
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TransactionsPage;
