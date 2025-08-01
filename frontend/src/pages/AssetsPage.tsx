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
import AssetFormDialog from "../components/AssetFormDialog";
import AssetDetailsModal from "../components/AssetDetailsModal";
import ConfigModal from "../components/ConfigModal";
import LinkRecordDialog from "../components/LinkRecordDialog";
import PageHeader from "../components/PageHeader";
import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import LinkIcon from "@mui/icons-material/Link";
import LinkOffIcon from "@mui/icons-material/LinkOff";
import DeleteIcon from "@mui/icons-material/Delete";
import { ASSETS_URL, LINKS_URL } from "../constants";
import { useTheme } from "@mui/material/styles";
import { getPageStyles } from "../styles/theme";

export default function AssetsPage() {
  const queryClient = useQueryClient();
  const theme = useTheme();
  const styles = getPageStyles(theme);
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const [columns, setColumns] = useState<GridColDef[]>([
    { field: "name", headerName: "Name", flex: 1 },
    { field: "asset_type_name", headerName: "Type", flex: 1 },
    { field: "bank_name", headerName: "Bank", flex: 1 },
    {
      field: "current_value",
      headerName: "Current Value",
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
      field: "purchase_value",
      headerName: "Purchase Value",
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
      field: "purchase_date",
      headerName: "Purchase Date",
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
      queryClient.invalidateQueries({ queryKey: [ASSETS_URL] });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const deletePromises = ids.map((id) =>
        axios.delete(`${ASSETS_URL}${id}/`)
      );
      await Promise.all(deletePromises);
      return ids;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ASSETS_URL] });
      setSelectedRows([]);
      setDeleteDialogOpen(false);
    },
  });

  const handleOpenLinkDialog = (asset: any) => {
    setSelectedAsset(asset);
    setLinkDialogOpen(true);
  };

  const handleCloseLinkDialog = () => {
    setSelectedAsset(null);
    setLinkDialogOpen(false);
  };

  const handleOpenDetailsModal = (asset: any) => {
    setSelectedAsset(asset);
    setDetailsModalOpen(true);
  };

  const handleCloseDetailsModal = () => {
    setSelectedAsset(null);
    setDetailsModalOpen(false);
  };

  const handleOpenFormDialog = (asset?: any) => {
    setSelectedAsset(asset || null);
    setFormDialogOpen(true);
    setDetailsModalOpen(false); // Close details modal when opening edit form
  };

  const handleCloseFormDialog = () => {
    setSelectedAsset(null);
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
        title="Assets"
        variant="core"
        recordType="assets"
        onSettingsClick={() => setConfigModalOpen(true)}
        onAddClick={() => handleOpenFormDialog()}
        showSettings={true}
        showAdd={true}
        addButtonText="Add Asset"
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
          endpoint={ASSETS_URL}
          columns={columns}
          readOnly={false}
          onRowClick={(params) => handleOpenDetailsModal(params.row)}
          hideAddButton={true}
          onRowSelectionChange={handleRowSelectionChange}
        />
      </Box>
      {selectedAsset && (
        <LinkRecordDialog
          open={linkDialogOpen}
          onClose={handleCloseLinkDialog}
          coreRecordId={selectedAsset.id}
          coreRecordName={selectedAsset.name}
          coreModelName="asset"
          pluginName="ynab"
          pluginRecordType="accounts"
        />
      )}
      <AssetDetailsModal
        open={detailsModalOpen}
        onClose={handleCloseDetailsModal}
        asset={selectedAsset}
        onEdit={() => handleOpenFormDialog(selectedAsset)}
        onDelete={() => {
          // Handle delete logic here if needed
          setDetailsModalOpen(false);
        }}
      />

      <AssetFormDialog
        open={formDialogOpen}
        onClose={handleCloseFormDialog}
        asset={selectedAsset}
      />

      <ConfigModal
        open={configModalOpen}
        onClose={() => setConfigModalOpen(false)}
        recordType="assets"
        currentColumns={columns}
        onColumnsChange={handleColumnsChange}
        title="Assets Configuration"
      />

      {/* Bulk Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleCancelDelete}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
      >
        <DialogTitle id="delete-dialog-title">
          Delete Selected Assets
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="delete-dialog-description">
            Are you sure you want to delete {selectedRows.length} selected asset
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
