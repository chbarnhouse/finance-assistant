import {
  Typography,
  Box,
  Button,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
} from "@mui/material";
import CrudGrid from "../components/CrudGrid";
import type { GridColDef } from "@mui/x-data-grid";
import AccountFormDialog from "../components/AccountFormDialog";
import AccountDetailsModal from "../components/AccountDetailsModal";
import ConfigModal from "../components/ConfigModal";
import PageHeader from "../components/PageHeader";
import { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import axios from "axios";
import { ACCOUNTS_URL, LINKS_URL } from "../constants";
import { useTheme } from "@mui/material/styles";
import { getPageStyles } from "../styles/theme";
import SyncIcon from "@mui/icons-material/Sync";
import DeleteIcon from "@mui/icons-material/Delete";

export default function AccountsPage() {
  const queryClient = useQueryClient();
  const theme = useTheme();
  const styles = getPageStyles(theme);
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<any>(null);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Get accounts data for navigation from link icon
  const { data: accounts = [] } = useQuery({
    queryKey: [ACCOUNTS_URL],
    queryFn: () => axios.get(ACCOUNTS_URL).then((res) => res.data),
  });

  // Check for navigation from link icon click
  useEffect(() => {
    const showDetailsModal = sessionStorage.getItem("showDetailsModal");
    const selectedRecordId = sessionStorage.getItem("selectedRecordId");

    if (showDetailsModal === "true" && selectedRecordId) {
      // Clear the sessionStorage
      sessionStorage.removeItem("showDetailsModal");
      sessionStorage.removeItem("selectedRecordId");

      // Find the account and show details modal
      const account = accounts.find((acc: any) => acc.id === selectedRecordId);
      if (account) {
        setSelectedAccount(account);
        setDetailsModalOpen(true);
      }
    }
  }, [accounts]);
  const [columns, setColumns] = useState<GridColDef[]>([
    { field: "name", headerName: "Name", flex: 1 },
    {
      field: "account_type_name",
      headerName: "Account Type",
      flex: 1,
    },
    { field: "bank_name", headerName: "Bank", flex: 1 },
    {
      field: "last_4",
      headerName: "Last 4",
      flex: 0.5,
    },
    {
      field: "balance",
      headerName: "Balance",
      flex: 1,
      type: "number",
      valueFormatter: (params: any) => {
        if (
          params &&
          typeof params === "object" &&
          params.value != null &&
          !isNaN(Number(params.value))
        ) {
          return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
          }).format(Number(params.value));
        }
        return "";
      },
    },
    {
      field: "cleared_balance",
      headerName: "Cleared Balance",
      flex: 1,
      type: "number",
      valueFormatter: (params: any) => {
        if (
          params &&
          typeof params === "object" &&
          params.value != null &&
          !isNaN(Number(params.value))
        ) {
          return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
          }).format(Number(params.value));
        }
        return "";
      },
    },
    {
      field: "on_budget",
      headerName: "On Budget",
      flex: 0.5,
      type: "boolean",
    },
    {
      field: "closed",
      headerName: "Closed",
      flex: 0.5,
      type: "boolean",
    },
    {
      field: "allocation",
      headerName: "Allocation",
      flex: 0.5,
    },
    {
      field: "link_data",
      headerName: "YNAB Link",
      flex: 1.5,
      renderCell: (params) => {
        if (
          params.value &&
          params.value.plugin_record &&
          params.value.plugin_record.name
        ) {
          return (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Chip
                label={params.value.plugin_record.name}
                variant="outlined"
                size="small"
                color="primary"
              />
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSyncAccount(params.row);
                }}
                sx={{ color: theme.palette.primary.main }}
              >
                <SyncIcon fontSize="small" />
              </IconButton>
            </Box>
          );
        }
        return (
          <Typography variant="body2" color="textSecondary">
            Not Linked
          </Typography>
        );
      },
    },
  ]);

  const syncMutation = useMutation({
    mutationFn: async (account: any) => {
      if (!account.link_data) {
        throw new Error("Account is not linked to YNAB");
      }
      const response = await axios.post(
        `${LINKS_URL}${account.link_data.id}/sync/`
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const deletePromises = ids.map((id) =>
        axios.delete(`${ACCOUNTS_URL}${id}/`)
      );
      await Promise.all(deletePromises);
      return ids;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      setSelectedRows([]);
      setDeleteDialogOpen(false);
    },
  });

  const handleSyncAccount = (account: any) => {
    if (account && account.link_data && account.link_data.id) {
      syncMutation.mutate(account);
    } else {
      console.warn("Cannot sync account: missing link_data or link_data.id");
    }
  };

  const handleOpenDetailsModal = (account: any) => {
    setSelectedAccount(account);
    setDetailsModalOpen(true);
  };

  const handleCloseDetailsModal = () => {
    setSelectedAccount(null);
    setDetailsModalOpen(false);
  };

  const handleOpenFormDialog = (account?: any) => {
    setSelectedAccount(account || null);
    setFormDialogOpen(true);
  };

  const handleCloseFormDialog = () => {
    setSelectedAccount(null);
    setFormDialogOpen(false);
  };

  const handleEditFromDetails = () => {
    setDetailsModalOpen(false);
    // Don't clear selectedAccount here - keep it for the form dialog
    setFormDialogOpen(true);
  };

  const handleCancelFromEdit = () => {
    setFormDialogOpen(false);
    // Return to details modal
    setDetailsModalOpen(true);
  };

  const handleColumnsChange = (newColumns: GridColDef[]) => {
    setColumns(newColumns);
  };

  const handleRowSelectionChange = (selection: string[]) => {
    setSelectedRows(selection);
  };

  const handleDeleteSelected = () => {
    if (selectedRows.length > 0) {
      setDeleteDialogOpen(true);
    }
  };

  const handleConfirmDelete = () => {
    bulkDeleteMutation.mutate(selectedRows);
  };

  const handleCancelDelete = () => {
    setDeleteDialogOpen(false);
  };

  return (
    <Box sx={styles.pageContainer}>
      <PageHeader
        title="Accounts"
        variant="core"
        recordType="accounts"
        onSettingsClick={() => setConfigModalOpen(true)}
        onAddClick={() => handleOpenFormDialog()}
        showSettings={true}
        showAdd={true}
        addButtonText="Add Account"
      />
      <Box sx={styles.dataGrid}>
        {selectedRows.length > 0 && (
          <Box sx={{ mb: 2, display: "flex", justifyContent: "flex-end" }}>
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={handleDeleteSelected}
              disabled={bulkDeleteMutation.isPending}
            >
              Delete Selected ({selectedRows.length})
            </Button>
          </Box>
        )}
        <CrudGrid
          endpoint={ACCOUNTS_URL}
          columns={columns}
          readOnly={false}
          onRowClick={(params) => handleOpenDetailsModal(params.row)}
          hideAddButton={true}
          onRowSelectionChange={handleRowSelectionChange}
        />
      </Box>
      <AccountDetailsModal
        open={detailsModalOpen}
        onClose={handleCloseDetailsModal}
        account={selectedAccount}
        onEdit={handleEditFromDetails}
      />
      <AccountFormDialog
        open={formDialogOpen}
        onClose={handleCloseFormDialog}
        onCancel={handleCancelFromEdit}
        account={selectedAccount}
      />
      <ConfigModal
        open={configModalOpen}
        onClose={() => setConfigModalOpen(false)}
        recordType="accounts"
        currentColumns={columns}
        onColumnsChange={handleColumnsChange}
        title="Accounts Configuration"
      />

      {/* Bulk Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleCancelDelete}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
      >
        <DialogTitle id="delete-dialog-title">
          Delete Selected Accounts
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="delete-dialog-description">
            Are you sure you want to delete {selectedRows.length} selected
            account{selectedRows.length !== 1 ? "s" : ""}? This action cannot be
            undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleCancelDelete}
            disabled={bulkDeleteMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirmDelete}
            color="error"
            variant="contained"
            disabled={bulkDeleteMutation.isPending}
          >
            {bulkDeleteMutation.isPending ? "Deleting..." : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
