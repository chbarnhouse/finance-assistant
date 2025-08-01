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
import LiabilityFormDialog from "../components/LiabilityFormDialog";
import LiabilityDetailsModal from "../components/LiabilityDetailsModal";
import ConfigModal from "../components/ConfigModal";
import LinkRecordDialog from "../components/LinkRecordDialog";
import PageHeader from "../components/PageHeader";
import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import LinkIcon from "@mui/icons-material/Link";
import LinkOffIcon from "@mui/icons-material/LinkOff";
import DeleteIcon from "@mui/icons-material/Delete";
import { LIABILITIES_URL, LINKS_URL } from "../constants";
import { useTheme } from "@mui/material/styles";
import { getPageStyles } from "../styles/theme";

export default function LiabilitiesPage() {
  const queryClient = useQueryClient();
  const theme = useTheme();
  const styles = getPageStyles(theme);
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [selectedLiability, setSelectedLiability] = useState<any>(null);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const [columns, setColumns] = useState<GridColDef[]>([
    { field: "name", headerName: "Name", flex: 1 },
    { field: "liability_type_name", headerName: "Type", flex: 1 },
    { field: "bank_name", headerName: "Bank", flex: 1 },
    {
      field: "amount",
      headerName: "Amount",
      flex: 1,
      type: "number",
      valueFormatter: (params: any) => {
        if (params && params.value != null && !isNaN(Number(params.value))) {
          return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
          }).format(Number(params.value));
        }
        return "";
      },
    },
    {
      field: "interest_rate",
      headerName: "Interest Rate",
      flex: 1,
      type: "number",
      valueFormatter: (params: any) => {
        if (params && params.value != null && !isNaN(Number(params.value))) {
          return `${Number(params.value).toFixed(2)}%`;
        }
        return "";
      },
    },
    {
      field: "due_date",
      headerName: "Due Date",
      flex: 1,
      type: "date",
      valueFormatter: (params: any) => {
        if (params && params.value) {
          return new Date(params.value).toLocaleDateString();
        }
        return "";
      },
    },
  ]);

  const unlinkMutation = useMutation({
    mutationFn: (linkId: number) => axios.delete(`${LINKS_URL}${linkId}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [LIABILITIES_URL] });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const deletePromises = ids.map((id) =>
        axios.delete(`${LIABILITIES_URL}${id}/`)
      );
      await Promise.all(deletePromises);
      return ids;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [LIABILITIES_URL] });
      setSelectedRows([]);
      setDeleteDialogOpen(false);
    },
  });

  const handleOpenLinkDialog = (liability: any) => {
    setSelectedLiability(liability);
    setLinkDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setSelectedLiability(null);
    setLinkDialogOpen(false);
  };

  const handleOpenDetailsModal = (liability: any) => {
    setSelectedLiability(liability);
    setDetailsModalOpen(true);
  };

  const handleCloseDetailsModal = () => {
    setSelectedLiability(null);
    setDetailsModalOpen(false);
  };

  const handleOpenFormDialog = (liability?: any) => {
    setSelectedLiability(liability || null);
    setFormDialogOpen(true);
    setDetailsModalOpen(false); // Close details modal when opening edit
  };

  const handleCloseFormDialog = () => {
    setSelectedLiability(null);
    setFormDialogOpen(false);
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

  const handleColumnsChange = (newColumns: GridColDef[]) => {
    setColumns(newColumns);
  };

  return (
    <Box sx={styles.pageContainer}>
      <PageHeader
        title="Liabilities"
        variant="core"
        recordType="liabilities"
        onSettingsClick={() => setConfigModalOpen(true)}
        onAddClick={() => handleOpenFormDialog()}
        showSettings={true}
        showAdd={true}
        addButtonText="Add Liability"
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
          endpoint={LIABILITIES_URL}
          columns={columns}
          readOnly={false}
          onRowClick={(params) => handleOpenDetailsModal(params.row)}
          hideAddButton={true}
          onRowSelectionChange={handleRowSelectionChange}
        />
      </Box>
      {selectedLiability && (
        <LinkRecordDialog
          open={dialogOpen}
          onClose={handleCloseDialog}
          coreRecordId={selectedLiability.id}
          coreRecordName={selectedLiability.name}
          coreModelName="liability"
          pluginName="ynab"
          pluginRecordType="accounts"
        />
      )}
      {selectedLiability && (
        <LiabilityDetailsModal
          open={detailsModalOpen}
          onClose={handleCloseDetailsModal}
          liability={selectedLiability}
          onEdit={() => handleOpenFormDialog(selectedLiability)}
          onDelete={() => {
            if (selectedLiability) {
              setSelectedRows([selectedLiability.id]);
              setDeleteDialogOpen(true);
              setDetailsModalOpen(false);
            }
          }}
        />
      )}
      <LiabilityFormDialog
        open={formDialogOpen}
        onClose={handleCloseFormDialog}
        liability={selectedLiability}
      />

      {/* Bulk Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleCancelDelete}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
      >
        <DialogTitle id="delete-dialog-title">
          Delete Selected Liabilities
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="delete-dialog-description">
            Are you sure you want to delete {selectedRows.length} selected
            liability{selectedRows.length !== 1 ? "ies" : ""}? This action
            cannot be undone.
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

      <ConfigModal
        open={configModalOpen}
        onClose={() => setConfigModalOpen(false)}
        recordType="liabilities"
        currentColumns={columns}
        onColumnsChange={handleColumnsChange}
        title="Liabilities Configuration"
      />
    </Box>
  );
}
