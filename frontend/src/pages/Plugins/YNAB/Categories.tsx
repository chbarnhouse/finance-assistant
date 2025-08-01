import * as React from "react";
import {
  Typography,
  Box,
  CircularProgress,
  Alert,
  Button,
  IconButton,
  Chip,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { DataGrid } from "@mui/x-data-grid";
import type { GridColDef } from "@mui/x-data-grid";
import { Sync as SyncIcon } from "@mui/icons-material";
import { API_BASE_URL } from "@/constants";
import YNABConfigModal from "../../../components/YNABConfigModal";
import PageHeader from "../../../components/PageHeader";
import { useTheme } from "@mui/material/styles";
import { getYNABPageStyles } from "../../../styles/theme";
import { SyncButton } from "../../../components/SyncButton";
import SettingsIcon from "@mui/icons-material/Settings";

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

const fetchYnabCategories = async () => {
  const { data } = await axios.get(`${API_BASE_URL}/ynab/categories/`);
  return data;
};

export default function CategoriesPage() {
  const theme = useTheme();
  const styles = getYNABPageStyles(theme);
  const [configModalOpen, setConfigModalOpen] = React.useState(false);
  const [crossReferences, setCrossReferences] = React.useState<
    CrossReference[]
  >([]);
  const [syncing, setSyncing] = React.useState(false);
  const [useGroupedView, setUseGroupedView] = React.useState(false);
  const [columns, setColumns] = React.useState<ColumnConfig[]>([
    { field: "id", headerName: "ID", visible: false, order: 0, width: 300 },
    {
      field: "category_group_name",
      headerName: "Group",
      visible: true,
      order: 1,
      width: 200,
    },
    { field: "name", headerName: "Name", visible: true, order: 2, width: 250 },
    {
      field: "hidden",
      headerName: "Hidden",
      visible: false,
      order: 3,
      width: 100,
      useCheckbox: true,
    },
    {
      field: "original_category_group_id",
      headerName: "Original Group ID",
      visible: false,
      order: 4,
      width: 300,
    },
    { field: "note", headerName: "Note", visible: false, order: 5, width: 200 },
    {
      field: "budgeted",
      headerName: "Budgeted",
      visible: true,
      order: 6,
      width: 150,
      useCurrency: true,
      useThousandsSeparator: true,
    },
    {
      field: "activity",
      headerName: "Activity",
      visible: true,
      order: 7,
      width: 150,
      useCurrency: true,
      useThousandsSeparator: true,
    },
    {
      field: "balance",
      headerName: "Balance",
      visible: true,
      order: 8,
      width: 150,
      useCurrency: true,
      useThousandsSeparator: true,
    },
    {
      field: "goal_type",
      headerName: "Goal Type",
      visible: true,
      order: 9,
      width: 150,
    },
    {
      field: "goal_day",
      headerName: "Goal Day",
      visible: false,
      order: 10,
      width: 100,
    },
    {
      field: "goal_cadence",
      headerName: "Goal Cadence",
      visible: false,
      order: 11,
      width: 150,
    },
    {
      field: "goal_cadence_frequency",
      headerName: "Goal Cadence Frequency",
      visible: false,
      order: 12,
      width: 180,
    },
    {
      field: "goal_creation_month",
      headerName: "Goal Creation Month",
      visible: false,
      order: 13,
      width: 180,
    },
    {
      field: "goal_target",
      headerName: "Goal Target",
      visible: true,
      order: 14,
      width: 150,
      useCurrency: true,
      useThousandsSeparator: true,
    },
    {
      field: "goal_target_month",
      headerName: "Goal Target Month",
      visible: false,
      order: 15,
      width: 180,
    },
    {
      field: "goal_percentage_complete",
      headerName: "Goal %",
      visible: true,
      order: 16,
      width: 100,
    },
    {
      field: "goal_months_to_budget",
      headerName: "Goal Months to Budget",
      visible: false,
      order: 17,
      width: 180,
    },
    {
      field: "goal_under_funded",
      headerName: "Goal Under Funded",
      visible: false,
      order: 18,
      width: 180,
      useCurrency: true,
      useThousandsSeparator: true,
    },
    {
      field: "goal_overall_funded",
      headerName: "Goal Overall Funded",
      visible: false,
      order: 19,
      width: 180,
      useCurrency: true,
      useThousandsSeparator: true,
    },
    {
      field: "goal_overall_left",
      headerName: "Goal Overall Left",
      visible: false,
      order: 20,
      width: 180,
      useCurrency: true,
      useThousandsSeparator: true,
    },
    {
      field: "deleted",
      headerName: "Deleted",
      visible: false,
      order: 21,
      width: 100,
      useCheckbox: true,
    },
  ]);

  const { data, error, isLoading, refetch } = useQuery({
    queryKey: ["ynabCategories"],
    queryFn: fetchYnabCategories,
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

  // Add debugging for data
  React.useEffect(() => {
    console.log("Categories data received:", data);
    if (data?.data?.categories) {
      console.log("Categories count:", data.data.categories.length);
      console.log("First category:", data.data.categories[0]);
    }
  }, [data]);

  const loadCrossReferences = async () => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/ynab/cross-references/categories/`
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
              config.record_type === "categories" && config.field === col.field
          );

          if (savedConfig) {
            let useCurrency = savedConfig.use_currency;
            if (
              (useCurrency === null || useCurrency === undefined) &&
              (col.field.includes("budgeted") ||
                col.field.includes("activity") ||
                col.field.includes("balance") ||
                col.field.includes("goal_target"))
            ) {
              useCurrency = true;
            }

            const updatedCol = {
              ...col,
              headerName: savedConfig.header_name,
              visible: savedConfig.visible,
              order: savedConfig.order,
              width: savedConfig.width,
              useCurrency: useCurrency,
              invertNegativeSign: savedConfig.invert_negative_sign,
              disableNegativeSign: savedConfig.disable_negative_sign,
              useThousandsSeparator:
                savedConfig.use_thousands_separator !== undefined
                  ? savedConfig.use_thousands_separator
                  : true,
            };
            return updatedCol;
          } else {
            let useCurrency = col.useCurrency;
            if (
              (useCurrency === undefined || useCurrency === null) &&
              (col.field.includes("budgeted") ||
                col.field.includes("activity") ||
                col.field.includes("balance") ||
                col.field.includes("goal_target"))
            ) {
              useCurrency = true;
            }

            return {
              ...col,
              useCurrency: useCurrency,
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

  const handleSync = async () => {
    try {
      setSyncing(true);
      const response = await axios.post(`${API_BASE_URL}/ynab/sync/`);
      console.log("Sync response:", response.data);
      // Refetch categories after sync
      await refetch();
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
              // Format currency values (budgeted, activity, balance, goal_target)
              if (
                (col.field.includes("budgeted") ||
                  col.field.includes("activity") ||
                  col.field.includes("balance") ||
                  col.field.includes("goal_target")) &&
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

  // Group categories by category group
  const getGroupedCategories = () => {
    const grouped: { [key: string]: any[] } = {};
    categories.forEach((category: any) => {
      const groupName = category.category_group_name || "Unknown";
      if (!grouped[groupName]) {
        grouped[groupName] = [];
      }
      grouped[groupName].push(category);
    });
    return grouped;
  };

  if (isLoading) {
    return <CircularProgress />;
  }

  if (error) {
    return <Alert severity="error">Error fetching YNAB categories.</Alert>;
  }

  const categories = data?.data?.categories || [];

  return (
    <Box sx={styles.pageContainer}>
      <Box sx={styles.header}>
        <Typography variant="h4" sx={styles.title}>
          Categories
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
          rows={categories}
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
        recordType="categories"
        currentColumns={columns}
        onColumnsChange={handleColumnsChange}
      />
    </Box>
  );
}
