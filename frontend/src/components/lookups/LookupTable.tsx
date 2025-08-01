import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  TextField,
} from "@mui/material";
import {
  ExpandMore as ExpandMoreIcon,
  Refresh as RefreshIcon,
  Delete as DeleteIcon,
} from "@mui/icons-material";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useState } from "react";
import CrudGrid from "../CrudGrid";
import type { GridColDef } from "@mui/x-data-grid";

interface LookupTableProps {
  title: string;
  endpoint: string;
  columns: GridColDef[];
  hideAccordion?: boolean;
  onRowClick?: (params: any) => void;
}

export default function LookupTable({
  title,
  endpoint,
  columns,
  hideAccordion = false,
  onRowClick,
}: LookupTableProps) {
  const queryClient = useQueryClient();
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [editName, setEditName] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Reset to defaults mutation
  const resetMutation = useMutation({
    mutationFn: () => axios.post(`${endpoint}reset_to_defaults/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [endpoint] });
      setResetDialogOpen(false);
      setError(null);
    },
    onError: (error: any) => {
      setError(error.response?.data?.error || "Failed to reset to defaults");
    },
  });

  // Bulk delete mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: string[]) =>
      axios.post(`${endpoint}bulk_delete/`, { ids }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [endpoint] });
      setDeleteDialogOpen(false);
      setSelectedRows([]);
      setError(null);
    },
    onError: (error: any) => {
      setError(
        error.response?.data?.error || "Failed to delete selected items"
      );
    },
  });

  const handleResetToDefaults = () => {
    resetMutation.mutate();
  };

  const handleBulkDelete = () => {
    if (selectedRows.length > 0) {
      bulkDeleteMutation.mutate(selectedRows);
    }
  };

  const handleRowSelectionChange = (newSelection: string[]) => {
    setSelectedRows(newSelection);
  };

  const handleEditClick = (params: any) => {
    setEditingRecord(params.row);
    setEditName(params.row.name);
    setEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (!editingRecord || !editName.trim()) return;

    // Update the record
    axios
      .put(`${endpoint}${editingRecord.id}/`, { name: editName.trim() })
      .then(() => {
        queryClient.invalidateQueries({ queryKey: [endpoint] });
        setEditDialogOpen(false);
        setEditingRecord(null);
        setEditName("");
        setError(null);
      })
      .catch((error: any) => {
        setError(error.response?.data?.error || "Failed to update record");
      });
  };

  const content = (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {/* Action Buttons */}
      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={() => setResetDialogOpen(true)}
          color="primary"
          size="small"
        >
          Reset to Defaults
        </Button>
        <Button
          variant="outlined"
          startIcon={<DeleteIcon />}
          onClick={() => setDeleteDialogOpen(true)}
          color="error"
          size="small"
          disabled={selectedRows.length === 0}
        >
          Delete Selected ({selectedRows.length})
        </Button>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Data Grid */}
      <CrudGrid
        endpoint={endpoint}
        columns={columns}
        onRowSelectionChange={handleRowSelectionChange}
        onRowClick={onRowClick || handleEditClick}
      />
    </Box>
  );

  return (
    <>
      {hideAccordion ? (
        content
      ) : (
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">{title}</Typography>
          </AccordionSummary>
          <AccordionDetails>{content}</AccordionDetails>
        </Accordion>
      )}

      {/* Reset to Defaults Confirmation Dialog */}
      <Dialog open={resetDialogOpen} onClose={() => setResetDialogOpen(false)}>
        <DialogTitle>Reset to Defaults</DialogTitle>
        <DialogContent>
          <Typography>
            This will restore all renamed default {title.toLowerCase()} to their
            original names, delete any custom {title.toLowerCase()} you've
            added, and add any missing default {title.toLowerCase()}. This
            action cannot be undone. Are you sure you want to continue?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResetDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleResetToDefaults}
            color="primary"
            variant="contained"
            disabled={resetMutation.isPending}
          >
            {resetMutation.isPending ? "Resetting..." : "Reset to Defaults"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bulk Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Delete Selected Items</DialogTitle>
        <DialogContent>
          <Typography>
            This will delete {selectedRows.length} selected{" "}
            {title.toLowerCase()}. This action cannot be undone. Are you sure
            you want to continue?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleBulkDelete}
            color="error"
            variant="contained"
            disabled={bulkDeleteMutation.isPending}
          >
            {bulkDeleteMutation.isPending ? "Deleting..." : "Delete Selected"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Record Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)}>
        <DialogTitle>Edit {title.slice(0, -1)}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Name"
            type="text"
            fullWidth
            variant="outlined"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === "Enter") {
                handleSaveEdit();
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleSaveEdit}
            color="primary"
            variant="contained"
            disabled={!editName.trim()}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
