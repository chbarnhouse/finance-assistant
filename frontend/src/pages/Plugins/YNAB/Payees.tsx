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

const fetchYnabPayees = async () => {
  const { data } = await axios.get(`${API_BASE_URL}/ynab/payees/`);
  return data;
};

export default function PayeesPage() {
  const theme = useTheme();
  const styles = getYNABPageStyles(theme);
  const [configModalOpen, setConfigModalOpen] = React.useState(false);
  const [crossReferences, setCrossReferences] = React.useState<
    CrossReference[]
  >([]);
  const [syncing, setSyncing] = React.useState(false);
  const [columns, setColumns] = React.useState<ColumnConfig[]>([
    { field: "id", headerName: "ID", visible: false, order: 0, width: 300 },
    { field: "name", headerName: "Name", visible: true, order: 1, width: 300 },
    {
      field: "transfer_account_id",
      headerName: "Transfer Account ID",
      visible: true,
      order: 2,
      width: 300,
    },
    {
      field: "deleted",
      headerName: "Deleted",
      visible: false,
      order: 3,
      width: 100,
      useCheckbox: true,
    },
  ]);

  const { data, error, isLoading, refetch } = useQuery({
    queryKey: ["ynabPayees"],
    queryFn: fetchYnabPayees,
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
        `${API_BASE_URL}/ynab/cross-references/payees/`
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
              config.record_type === "payees" && config.field === col.field
          );

          if (savedConfig) {
            const updatedCol = {
              ...col,
              headerName: savedConfig.header_name,
              visible: savedConfig.visible,
              order: savedConfig.order,
              width: savedConfig.width,
              useCurrency: savedConfig.use_currency,
              useCheckbox: savedConfig.use_checkbox,
              useDatetime: savedConfig.use_datetime,
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
            return {
              ...col,
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
        // Refetch payees data after sync
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
            // For all cases, return the raw value
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
    return <Alert severity="error">Error fetching YNAB payees.</Alert>;
  }

  const payees = data?.data?.payees || [];

  return (
    <Box sx={styles.pageContainer}>
      <Box sx={styles.header}>
        <Typography variant="h4" sx={styles.title}>
          Payees
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
          rows={payees}
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
        recordType="payees"
        currentColumns={columns}
        onColumnsChange={handleColumnsChange}
      />
    </Box>
  );
}
