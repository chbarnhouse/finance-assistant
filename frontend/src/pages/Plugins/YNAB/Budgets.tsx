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

const fetchYnabBudgets = async () => {
  const { data } = await axios.get(`${API_BASE_URL}/ynab/budgets/`);
  return data;
};

export default function BudgetsPage() {
  const theme = useTheme();
  const styles = getYNABPageStyles(theme);
  const [configModalOpen, setConfigModalOpen] = React.useState(false);
  const [crossReferences, setCrossReferences] = React.useState<
    CrossReference[]
  >([]);
  const [syncing, setSyncing] = React.useState(false);
  const [columns, setColumns] = React.useState<ColumnConfig[]>([
    { field: "id", headerName: "ID", visible: false, order: 0, width: 300 },
    { field: "name", headerName: "Name", visible: true, order: 1, width: 250 },
    {
      field: "last_modified_on",
      headerName: "Last Modified",
      visible: true,
      order: 2,
      width: 200,
      useDatetime: true,
      datetimeFormat: "MM/DD/YYYY HH:mm:ss",
    },
    {
      field: "first_month",
      headerName: "First Month",
      visible: true,
      order: 3,
      width: 150,
      useDatetime: true,
      datetimeFormat: "MM/YYYY",
    },
    {
      field: "last_month",
      headerName: "Last Month",
      visible: true,
      order: 4,
      width: 150,
      useDatetime: true,
      datetimeFormat: "MM/YYYY",
    },
    {
      field: "date_format",
      headerName: "Date Format",
      visible: false,
      order: 5,
      width: 150,
    },
    {
      field: "currency_format",
      headerName: "Currency Format",
      visible: false,
      order: 6,
      width: 200,
    },
  ]);

  const { data, error, isLoading, refetch } = useQuery({
    queryKey: ["ynabBudgets"],
    queryFn: fetchYnabBudgets,
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
        `${API_BASE_URL}/ynab/cross-references/budgets/`
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
              config.record_type === "budgets" && config.field === col.field
          );

          if (savedConfig) {
            let useDatetime = savedConfig.use_datetime;
            if (
              (useDatetime === null || useDatetime === undefined) &&
              (col.field === "last_modified_on" ||
                col.field === "first_month" ||
                col.field === "last_month")
            ) {
              useDatetime = true;
            }

            const updatedCol = {
              ...col,
              headerName: savedConfig.header_name,
              visible: savedConfig.visible,
              order: savedConfig.order,
              width: savedConfig.width,
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
            let useDatetime = col.useDatetime;
            if (
              (useDatetime === undefined || useDatetime === null) &&
              (col.field === "last_modified_on" ||
                col.field === "first_month" ||
                col.field === "last_month")
            ) {
              useDatetime = true;
            }

            return {
              ...col,
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
        // Refetch budgets data after sync
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
              // Format datetime values
              if (
                col.useDatetime &&
                (col.field === "last_modified_on" ||
                  col.field === "first_month" ||
                  col.field === "last_month") &&
                params.value
              ) {
                const date = new Date(params.value);
                if (col.datetimeFormat === "MM/YYYY") {
                  return date.toLocaleDateString("en-US", {
                    month: "2-digit",
                    year: "numeric",
                  });
                } else {
                  return date.toLocaleDateString("en-US", {
                    month: "2-digit",
                    day: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  });
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

  if (isLoading) {
    return <CircularProgress />;
  }

  if (error) {
    return <Alert severity="error">Error fetching YNAB budgets.</Alert>;
  }

  const budgets = data?.data?.budgets || [];

  return (
    <Box sx={styles.pageContainer}>
      <Box sx={styles.header}>
        <Typography variant="h4" sx={styles.title}>
          Budgets
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
          rows={budgets}
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
        recordType="budgets"
        currentColumns={columns}
        onColumnsChange={handleColumnsChange}
      />
    </Box>
  );
}
