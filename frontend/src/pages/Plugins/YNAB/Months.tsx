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

const fetchYnabMonths = async () => {
  const { data } = await axios.get(`${API_BASE_URL}/ynab/months/`);
  return data;
};

export default function MonthsPage() {
  const theme = useTheme();
  const styles = getYNABPageStyles(theme);
  const [configModalOpen, setConfigModalOpen] = React.useState(false);
  const [crossReferences, setCrossReferences] = React.useState<
    CrossReference[]
  >([]);
  const [syncing, setSyncing] = React.useState(false);
  const [columns, setColumns] = React.useState<ColumnConfig[]>([
    {
      field: "month",
      headerName: "Month",
      visible: true,
      order: 0,
      width: 150,
      useDatetime: true,
    },
    { field: "note", headerName: "Note", visible: true, order: 1, width: 300 },
    {
      field: "income",
      headerName: "Income",
      visible: true,
      order: 2,
      width: 150,
      useCurrency: true,
      useThousandsSeparator: true,
    },
    {
      field: "budgeted",
      headerName: "Budgeted",
      visible: true,
      order: 3,
      width: 150,
      useCurrency: true,
      useThousandsSeparator: true,
    },
    {
      field: "activity",
      headerName: "Activity",
      visible: true,
      order: 4,
      width: 150,
      useCurrency: true,
      useThousandsSeparator: true,
    },
    {
      field: "to_be_budgeted",
      headerName: "To Be Budgeted",
      visible: true,
      order: 5,
      width: 180,
      useCurrency: true,
      useThousandsSeparator: true,
    },
    {
      field: "age_of_money",
      headerName: "Age of Money",
      visible: true,
      order: 6,
      width: 150,
    },
  ]);

  const { data, error, isLoading, refetch } = useQuery({
    queryKey: ["ynabMonths"],
    queryFn: fetchYnabMonths,
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
        `${API_BASE_URL}/ynab/cross-references/months/`
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
              config.record_type === "months" && config.field === col.field
          );

          if (savedConfig) {
            let useCurrency = savedConfig.use_currency;
            if (
              (useCurrency === null || useCurrency === undefined) &&
              (col.field.includes("income") ||
                col.field.includes("budgeted") ||
                col.field.includes("activity") ||
                col.field.includes("to_be_budgeted"))
            ) {
              useCurrency = true;
            }

            let useDatetime = savedConfig.use_datetime;
            if (
              (useDatetime === null || useDatetime === undefined) &&
              col.field === "month"
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
            let useDatetime = col.useDatetime;

            if (
              (useCurrency === undefined || useCurrency === null) &&
              (col.field.includes("income") ||
                col.field.includes("budgeted") ||
                col.field.includes("activity") ||
                col.field.includes("to_be_budgeted"))
            ) {
              useCurrency = true;
            }

            if (
              (useDatetime === undefined || useDatetime === null) &&
              col.field === "month"
            ) {
              useDatetime = true;
            }

            return {
              ...col,
              useCurrency: useCurrency,
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
        // Refetch months data after sync
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
      .map((col) => ({
        field: col.field,
        headerName: col.headerName,
        width: col.width,
        renderCell: (params: any) => {
          try {
            // Format currency values (income, budgeted, activity, to_be_budgeted)
            if (
              (col.field.includes("income") ||
                col.field.includes("budgeted") ||
                col.field.includes("activity") ||
                col.field.includes("to_be_budgeted")) &&
              typeof params.value === "number"
            ) {
              console.log(`renderCell: Formatting currency for ${col.field}:`, {
                value: params.value,
                useCurrency: col.useCurrency,
                invertNegativeSign: col.invertNegativeSign,
                disableNegativeSign: col.disableNegativeSign,
                field: col.field,
              });

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
            if (col.field === "month" && params.value) {
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
                      .replace("DD", date.getDate().toString().padStart(2, "0"))
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

            // For all other cases, return the raw value
            return params.value;
          } catch (error) {
            console.error("Error in renderCell:", error, { params, col });
            return params?.value || "";
          }
        },
      }));
  };

  if (isLoading) {
    return <CircularProgress />;
  }

  if (error) {
    return <Alert severity="error">Error fetching YNAB months.</Alert>;
  }

  const months = data?.data?.months || [];

  return (
    <Box sx={styles.pageContainer}>
      <Box sx={styles.header}>
        <Typography variant="h4" sx={styles.title}>
          Months
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
          rows={months}
          columns={getDataGridColumns()}
          getRowId={(row) => row.month || row.id}
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
        recordType="months"
        currentColumns={columns}
        onColumnsChange={handleColumnsChange}
      />
    </Box>
  );
}
