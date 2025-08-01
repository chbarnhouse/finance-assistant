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
import CreditCardFormDialog from "../components/CreditCardFormDialog";
import CreditCardDetailsModal from "../components/CreditCardDetailsModal";
import ConfigModal from "../components/ConfigModal";
import LinkRecordDialog from "../components/LinkRecordDialog";
import PageHeader from "../components/PageHeader";
import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { CREDIT_CARDS_URL, LINKS_URL } from "../constants";
import { useTheme } from "@mui/material/styles";
import { getPageStyles } from "../styles/theme";
import DeleteIcon from "@mui/icons-material/Delete";
import LinkIcon from "@mui/icons-material/Link";
import LinkOffIcon from "@mui/icons-material/LinkOff";

export default function CreditCardsPage() {
  const queryClient = useQueryClient();
  const theme = useTheme();
  const styles = getPageStyles(theme);
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [selectedCreditCard, setSelectedCreditCard] = useState<any>(null);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const [columns, setColumns] = useState<GridColDef[]>([
    { field: "name", headerName: "Name", flex: 1 },
    { field: "credit_card_type_name", headerName: "Type", flex: 1 },
    { field: "bank_name", headerName: "Bank", flex: 1 },
    { field: "last_4", headerName: "Last 4", flex: 0.5 },
    {
      field: "credit_limit",
      headerName: "Credit Limit",
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
      field: "current_balance",
      headerName: "Current Balance",
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
      field: "available_credit",
      headerName: "Available Credit",
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
      field: "utilization_percentage",
      headerName: "Utilization %",
      flex: 0.8,
      type: "number",
      valueFormatter: (params: any) => {
        if (params && params.value != null && !isNaN(Number(params.value))) {
          return `${Number(params.value).toFixed(1)}%`;
        }
        return "";
      },
    },
  ]);

  const unlinkMutation = useMutation({
    mutationFn: (linkId: number) => axios.delete(`${LINKS_URL}${linkId}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CREDIT_CARDS_URL] });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const deletePromises = ids.map((id) =>
        axios.delete(`${CREDIT_CARDS_URL}${id}/`)
      );
      await Promise.all(deletePromises);
      return ids;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CREDIT_CARDS_URL] });
      setSelectedRows([]);
      setDeleteDialogOpen(false);
    },
  });

  const handleOpenLinkDialog = (creditCard: any) => {
    setSelectedCreditCard(creditCard);
    setLinkDialogOpen(true);
  };

  const handleCloseLinkDialog = () => {
    setSelectedCreditCard(null);
    setLinkDialogOpen(false);
  };

  const handleOpenDetailsModal = (creditCard: any) => {
    setSelectedCreditCard(creditCard);
    setDetailsModalOpen(true);
  };

  const handleCloseDetailsModal = () => {
    setSelectedCreditCard(null);
    setDetailsModalOpen(false);
  };

  const handleOpenFormDialog = (creditCard?: any) => {
    setSelectedCreditCard(creditCard || null);
    setFormDialogOpen(true);
    setDetailsModalOpen(false); // Close details modal when opening edit form
  };

  const handleCloseFormDialog = () => {
    setSelectedCreditCard(null);
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
        title="Credit Cards"
        variant="core"
        recordType="creditCards"
        onSettingsClick={() => setConfigModalOpen(true)}
        onAddClick={() => handleOpenFormDialog()}
        showSettings={true}
        showAdd={true}
        addButtonText="Add Credit Card"
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
          endpoint={CREDIT_CARDS_URL}
          columns={columns}
          readOnly={false}
          onRowClick={(params) => handleOpenDetailsModal(params.row)}
          hideAddButton={true}
          onRowSelectionChange={handleRowSelectionChange}
        />
      </Box>
      {selectedCreditCard && (
        <LinkRecordDialog
          open={linkDialogOpen}
          onClose={handleCloseLinkDialog}
          coreRecordId={selectedCreditCard.id}
          coreRecordName={selectedCreditCard.name}
          coreModelName="creditcard"
          pluginName="ynab"
          pluginRecordType="accounts"
        />
      )}
      <CreditCardDetailsModal
        open={detailsModalOpen}
        onClose={handleCloseDetailsModal}
        creditCard={selectedCreditCard}
        onEdit={() => handleOpenFormDialog(selectedCreditCard)}
        onDelete={() => {
          // Handle delete logic here if needed
          setDetailsModalOpen(false);
        }}
      />

      <CreditCardFormDialog
        open={formDialogOpen}
        onClose={handleCloseFormDialog}
        creditCard={selectedCreditCard}
      />

      {/* Bulk Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleCancelDelete}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
      >
        <DialogTitle id="delete-dialog-title">
          Delete Selected Credit Cards
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="delete-dialog-description">
            Are you sure you want to delete {selectedRows.length} selected
            credit card{selectedRows.length !== 1 ? "s" : ""}? This action
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
        recordType="creditCards"
        currentColumns={columns}
        onColumnsChange={handleColumnsChange}
        title="Credit Cards Configuration"
      />
    </Box>
  );
}
