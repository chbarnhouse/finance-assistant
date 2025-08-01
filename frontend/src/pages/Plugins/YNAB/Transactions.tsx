import * as React from "react";
import {
  Typography,
  Box,
  CircularProgress,
  Alert,
  IconButton,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { DataGrid } from "@mui/x-data-grid";
import type { GridColDef } from "@mui/x-data-grid";
import { Settings as SettingsIcon } from "@mui/icons-material";
import { API_BASE_URL } from "@/constants";
import YNABConfigModal from "../../../components/YNABConfigModal";
import PageHeader from "../../../components/PageHeader";
import { useTheme } from "@mui/material/styles";
import { getYNABPageStyles } from "../../../styles/theme";
import { SyncButton } from "../../../components/SyncButton";

interface ColumnConfig {
  field: string;
  headerName: string;
  visible: boolean;
  order: number;
  width?: number;
  useCheckbox?: boolean;
  useCurrency?: boolean;
  invertNegativeSign?: boolean;
  disableNegativeSign?: boolean;
  useThousandsSeparator?: boolean;
  useDatetime?: boolean;
  datetimeFormat?: string;
}

interface CrossReference {
  sourceValue: string;
  displayValue: string;
  enabled: boolean;
  column: string;
}

const fetchYnabTransactions = async () => {
  const { data } = await axios.get(`${API_BASE_URL}/ynab/transactions/`);
  return data;
};

export default function TransactionsPage() {
  const theme = useTheme();
  const styles = getYNABPageStyles(theme);
  const [configModalOpen, setConfigModalOpen] = React.useState(false);
  const [crossReferences, setCrossReferences] = React.useState<
    CrossReference[]
  >([]);
  const [syncing, setSyncing] = React.useState(false);
  const [columns, setColumns] = React.useState<ColumnConfig[]>([
    { field: "id", headerName: "ID", visible: false, order: 0, width: 300 },
    {
      field: "date",
      headerName: "Date",
      visible: true,
      order: 1,
      width: 150,
      useDatetime: true,
    },
    {
      field: "account_name",
      headerName: "Account",
      visible: true,
      order: 2,
      width: 200,
    },
    {
      field: "payee_name",
      headerName: "Payee",
      visible: true,
      order: 3,
      width: 200,
    },
    {
      field: "category_name",
      headerName: "Category",
      visible: true,
      order: 4,
      width: 200,
    },
    { field: "memo", headerName: "Memo", visible: true, order: 5, width: 300 },
    {
      field: "amount",
      headerName: "Amount",
      visible: true,
      order: 6,
      width: 150,
      useCurrency: true,
      useThousandsSeparator: true,
    },
    {
      field: "cleared",
      headerName: "Cleared",
      visible: true,
      order: 7,
      width: 120,
      useCheckbox: true,
    },
    {
      field: "approved",
      headerName: "Approved",
      visible: false,
      order: 8,
      width: 120,
      useCheckbox: true,
    },
    {
      field: "flag_color",
      headerName: "Flag Color",
      visible: false,
      order: 9,
      width: 120,
    },
    {
      field: "transfer_account_id",
      headerName: "Transfer Account ID",
      visible: false,
      order: 10,
      width: 300,
    },
    {
      field: "transfer_transaction_id",
      headerName: "Transfer Transaction ID",
      visible: false,
      order: 11,
      width: 300,
    },
    {
      field: "import_id",
      headerName: "Import ID",
      visible: false,
      order: 12,
      width: 300,
    },
    {
      field: "deleted",
      headerName: "Deleted",
      visible: false,
      order: 13,
      width: 100,
      useCheckbox: true,
    },
  ]);

  const { data, error, isLoading, refetch } = useQuery({
    queryKey: ["ynabTransactions"],
    queryFn: fetchYnabTransactions,
  });

  React.useEffect(() => {
    loadCrossReferences();
    loadColumnConfigurations();
  }, []);

  React.useEffect(() => {
    if (!configModalOpen) {
      loadCrossReferences();
    }
  }, [configModalOpen]);

  const loadCrossReferences = async () => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/ynab/cross-references/transactions/`
      );
      setCrossReferences(response.data.cross_references || []);
    } catch (err: any) {
      console.log("Could not load cross-references:", err);
      setCrossReferences([]);
    }
  };

  const loadColumnConfigurations = async () => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/ynab/column-configurations/`
      );
      const savedConfigs = response.data.data.column_configurations || [];

      setColumns((prevColumns) =>
        prevColumns.map((col) => {
          const savedConfig = savedConfigs.find(
            (config: any) =>
              config.record_type === "transactions" &&
              config.field === col.field
          );

          if (savedConfig) {
            let useCurrency = savedConfig.use_currency;
            if (
              (useCurrency === null || useCurrency === undefined) &&
              col.field.includes("amount")
            ) {
              useCurrency = true;
            }

            let useCheckbox = savedConfig.use_checkbox;
            if (useCheckbox === null && col.field === "cleared") {
              useCheckbox = true;
            }

            let useDatetime = savedConfig.use_datetime;
            if (
              (useDatetime === null || useDatetime === undefined) &&
              col.field === "date"
            ) {
              useDatetime = true;
            }

            const updatedCol = {
              ...col,
              headerName: savedConfig.header_name,
              visible: savedConfig.visible,
              order: savedConfig.order,
              width: savedConfig.width,
              useCurrency: useCurrency,
              useCheckbox: useCheckbox,
              useDatetime: useDatetime,
              invertNegativeSign: savedConfig.invert_negative_sign,
              disableNegativeSign: savedConfig.disable_negative_sign,
              useThousandsSeparator:
                savedConfig.use_thousands_separator !== undefined
                  ? savedConfig.use_thousands_separator
                  : true,
              datetimeFormat: savedConfig.datetime_format,
            };
            return updatedCol;
          } else {
            let useCurrency = col.useCurrency;
            let useCheckbox = col.useCheckbox;
            let useDatetime = col.useDatetime;

            if (
              (useCurrency === undefined || useCurrency === null) &&
              col.field.includes("amount")
            ) {
              useCurrency = true;
            }

            if (
              (useCheckbox === undefined || useCheckbox === null) &&
              col.field === "cleared"
            ) {
              useCheckbox = true;
            }

            if (
              (useDatetime === undefined || useDatetime === null) &&
              col.field === "date"
            ) {
              useDatetime = true;
            }

            return {
              ...col,
              useCurrency: useCurrency,
              useCheckbox: useCheckbox,
              useDatetime: useDatetime,
              useThousandsSeparator:
                col.useThousandsSeparator !== undefined
                  ? col.useThousandsSeparator
                  : true,
            };
          }
        })
      );
    } catch (err: any) {
      console.log("Could not load column configurations:", err);
    }
  };

  const handleColumnsChange = (newColumns: ColumnConfig[]) => {
    setColumns(newColumns);
  };

  const handleSyncYNAB = async () => {
    try {
      setSyncing(true);
      const response = await axios.post(`${API_BASE_URL}/ynab/sync/`);
      if (response.data.success) {
        // Refetch transactions data after sync
        await refetch();
      }
    } catch (err: any) {
      console.error("Sync failed:", err);
      alert(`Sync failed: ${err.response?.data?.message || err.message}`);
    } finally {
      setSyncing(false);
    }
  };

  const getDataGridColumns = (): GridColDef[] => {
    return columns
      .filter((col) => col.visible)
      .sort((a, b) => a.order - b.order)
      .map((col) => {
        return {
          field: col.field,
          headerName: col.headerName,
          width: col.width,
          renderCell: (params: any) => {
            try {
              // Format currency values (amount)
              if (
                col.field.includes("amount") &&
                typeof params.value === "number"
              ) {
                console.log(
                  `renderCell: Formatting currency for ${col.field}:`,
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
                    `renderCell: Returning formatted currency: ${formatted}`
                  );
                  return formatted;
                } else {
                  console.log(
                    `renderCell: Returning raw currency: ${params.value}`
                  );
                  return params.value.toString();
                }
              }

              // Format datetime values
              if (col.field === "date" && params.value) {
                const shouldFormatDatetime = col.useDatetime !== false;

                if (shouldFormatDatetime) {
                  try {
                    const date = new Date(params.value);
                    let formatted;

                    if (col.datetimeFormat) {
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
                      formatted = date.toLocaleDateString();
                    }

                    return formatted;
                  } catch (e) {
                    console.warn("Error formatting date:", e);
                    return params.value;
                  }
                } else {
                  return params.value;
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

              // For all other cases, return the raw value
              return params.value;
            } catch (error) {
              console.error("Error in renderCell:", error, { params, col });
              return params?.value || "";
            }
          },
        };
      });
  };

  if (isLoading) {
    return <CircularProgress />;
  }

  if (error) {
    return <Alert severity="error">Error fetching YNAB transactions.</Alert>;
  }

  const transactions = data?.data?.transactions || [];

  return (
    <Box sx={styles.pageContainer}>
      <Box sx={styles.header}>
        <Typography variant="h4" sx={styles.title}>
          Transactions
        </Typography>
        <Box sx={styles.headerActions}>
          <SyncButton
            variant="contained"
            size="medium"
            showTimestamp={true}
            buttonText="Sync YNAB"
            sx={{ mr: 1 }}
          />
          <IconButton
            onClick={() => setConfigModalOpen(true)}
            sx={styles.settingsButton}
          >
            <SettingsIcon />
          </IconButton>
        </Box>
      </Box>
      <Box sx={styles.dataGrid}>
        <DataGrid
          rows={transactions}
          columns={getDataGridColumns()}
          getRowId={(row) => row.id}
          pageSizeOptions={[10, 25, 50, 100]}
          initialState={{
            pagination: {
              paginationModel: { pageSize: 100, page: 0 },
            },
          }}
          sx={styles.dataGrid}
          slots={{
            toolbar: () => null,
          }}
        />
      </Box>
      <YNABConfigModal
        open={configModalOpen}
        onClose={() => setConfigModalOpen(false)}
        recordType="transactions"
        currentColumns={columns}
        onColumnsChange={handleColumnsChange}
      />
    </Box>
  );
}
