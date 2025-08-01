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
import BankDetailsModal from "../components/BankDetailsModal";
import ConfigModal from "../components/ConfigModal";
import PageHeader from "../components/PageHeader";
import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { BANKS_URL } from "../constants";
import { useTheme } from "@mui/material/styles";
import { getPageStyles } from "../styles/theme";
import DeleteIcon from "@mui/icons-material/Delete";

export default function BanksPage() {
  const queryClient = useQueryClient();
  const theme = useTheme();
  const styles = getPageStyles(theme);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [selectedBank, setSelectedBank] = useState<any>(null);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const [columns, setColumns] = useState<GridColDef[]>([
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
  ]);

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const deletePromises = ids.map((id) =>
        axios.delete(`${BANKS_URL}${id}/`)
      );
      await Promise.all(deletePromises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [BANKS_URL] });
      setSelectedRows([]);
      setDeleteDialogOpen(false);
    },
  });

  const handleOpenDetailsModal = (bank: any) => {
    setSelectedBank(bank);
    setDetailsModalOpen(true);
  };

  const handleCloseDetailsModal = () => {
    setDetailsModalOpen(false);
    setSelectedBank(null);
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
        title="Banks"
        variant="core"
        recordType="banks"
        onSettingsClick={() => setConfigModalOpen(true)}
        showSettings={true}
        showAdd={false}
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
          endpoint={BANKS_URL}
          columns={columns}
          readOnly={false}
          onRowClick={(params) => handleOpenDetailsModal(params.row)}
          hideAddButton={true}
          onRowSelectionChange={handleRowSelectionChange}
        />
      </Box>

      <BankDetailsModal
        open={detailsModalOpen}
        onClose={handleCloseDetailsModal}
        bank={selectedBank}
      />

      <ConfigModal
        open={configModalOpen}
        onClose={() => setConfigModalOpen(false)}
        recordType="banks"
        currentColumns={columns}
        onColumnsChange={handleColumnsChange}
        title="Banks Configuration"
      />

      {/* Bulk Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleCancelDelete}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
      >
        <DialogTitle id="delete-dialog-title">
          Delete Selected Banks
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="delete-dialog-description">
            Are you sure you want to delete {selectedRows.length} selected bank
            {selectedRows.length !== 1 ? "s" : ""}? This action cannot be
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
