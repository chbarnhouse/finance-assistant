import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  FormControl,
  FormControlLabel,
  Switch,
  TextField,
  Box,
  Chip,
  IconButton,
  Tooltip,
  Paper,
  Alert,
  CircularProgress,
} from "@mui/material";
import {
  ExpandMore as ExpandMoreIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Settings as SettingsIcon,
  DragIndicator as DragIndicatorIcon,
  Close as CloseIcon,
  Save as SaveIcon,
  Edit as EditIcon,
} from "@mui/icons-material";
import { useTheme } from "@mui/material/styles";
import type { GridColDef } from "@mui/x-data-grid";

interface ConfigModalProps {
  open: boolean;
  onClose: () => void;
  recordType: string;
  currentColumns: GridColDef[];
  onColumnsChange: (columns: GridColDef[]) => void;
  title?: string;
}

export default function ConfigModal({
  open,
  onClose,
  recordType,
  currentColumns,
  onColumnsChange,
  title,
}: ConfigModalProps) {
  const [columns, setColumns] = useState<GridColDef[]>(currentColumns);
  const [expanded, setExpanded] = useState<string | false>("columns");
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editingColumn, setEditingColumn] = useState<{
    field: string;
    headerName: string;
  } | null>(null);

  const theme = useTheme();

  const YNAB_COLORS = {
    primary: "#3B5EDA", // YNAB "Blurple"
    background:
      theme.palette.mode === "dark"
        ? theme.palette.background.default
        : "#F8F9FA",
    surface:
      theme.palette.mode === "dark"
        ? theme.palette.background.paper
        : "#FFFFFF",
    text:
      theme.palette.mode === "dark" ? theme.palette.text.primary : "#2C3E50",
    border: theme.palette.mode === "dark" ? theme.palette.divider : "#E9ECEF",
  };

  // Available fields for each record type
  const availableFields: Record<
    string,
    { field: string; headerName: string; type?: string }[]
  > = {
    accounts: [
      { field: "name", headerName: "Name" },
      { field: "account_type_name", headerName: "Account Type" },
      { field: "bank_name", headerName: "Bank" },
      { field: "last_4", headerName: "Last 4" },
      { field: "allocation", headerName: "Allocation" },
      { field: "notes", headerName: "Notes" },
      { field: "link_data", headerName: "YNAB Link" },
    ],
    creditCards: [
      { field: "name", headerName: "Name" },
      { field: "bank_name", headerName: "Bank" },
      { field: "balance", headerName: "Balance", type: "number" },
      { field: "payment_methods", headerName: "Payment Methods" },
      { field: "link_data", headerName: "YNAB Link" },
    ],
    assets: [
      { field: "name", headerName: "Name" },
      { field: "asset_type_name", headerName: "Asset Type" },
      { field: "bank_name", headerName: "Bank" },
      { field: "balance", headerName: "Balance", type: "number" },
      { field: "stock_symbol", headerName: "Stock Symbol" },
      { field: "shares", headerName: "Shares", type: "number" },
      { field: "link_data", headerName: "YNAB Link" },
    ],
    liabilities: [
      { field: "name", headerName: "Name" },
      { field: "liability_type_name", headerName: "Liability Type" },
      { field: "bank_name", headerName: "Bank" },
      { field: "balance", headerName: "Balance", type: "number" },
      { field: "link_data", headerName: "YNAB Link" },
    ],
  };

  const handleColumnToggle = (field: string) => {
    const isVisible = columns.some((col) => col.field === field);
    if (isVisible) {
      setColumns(columns.filter((col) => col.field !== field));
    } else {
      const fieldConfig = availableFields[recordType]?.find(
        (f) => f.field === field
      );
      if (fieldConfig) {
        setColumns([
          ...columns,
          {
            field: fieldConfig.field,
            headerName: fieldConfig.headerName,
            type: fieldConfig.type as any,
            flex: 1,
          },
        ]);
      }
    }
  };

  const handleColumnRemove = (field: string) => {
    setColumns(columns.filter((col) => col.field !== field));
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) return;

    const newColumns = [...columns];
    const [draggedColumn] = newColumns.splice(draggedIndex, 1);
    newColumns.splice(dropIndex, 0, draggedColumn);

    setColumns(newColumns);
    setDraggedIndex(null);
  };

  const editColumn = (field: string) => {
    const column = columns.find((col) => col.field === field);
    if (column) {
      setEditingColumn({
        field: column.field,
        headerName: column.headerName || "",
      });
    }
  };

  const saveColumn = () => {
    if (editingColumn) {
      setColumns((prev) =>
        prev.map((col) =>
          col.field === editingColumn.field
            ? { ...col, headerName: editingColumn.headerName }
            : col
        )
      );
      setEditingColumn(null);
    }
  };

  const cancelColumnEdit = () => {
    setEditingColumn(null);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      onColumnsChange(columns);
      setSuccess("Configuration saved successfully!");

      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      setError(err.message || "Failed to save configuration");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    const defaultColumns =
      availableFields[recordType]?.map((field) => ({
        field: field.field,
        headerName: field.headerName,
        type: field.type as any,
        flex: 1,
      })) || [];
    setColumns(defaultColumns);
  };

  const visibleFields = columns.map((col) => col.field);
  const availableFieldsForType = availableFields[recordType] || [];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: YNAB_COLORS.surface,
          border: `1px solid ${YNAB_COLORS.border}`,
        },
      }}
    >
      <DialogTitle
        sx={{
          backgroundColor: YNAB_COLORS.primary,
          color: "white",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Typography variant="h6">
          {title ||
            `${recordType.charAt(0).toUpperCase() + recordType.slice(1)} Configuration`}
        </Typography>
        <IconButton onClick={onClose} sx={{ color: "white" }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ color: YNAB_COLORS.text, mb: 2 }}>
          Column Management
        </Typography>
        <Typography
          variant="body2"
          sx={{ color: YNAB_COLORS.text, opacity: 0.8, mb: 3 }}
        >
          Configure which columns are visible and their display order. Drag
          columns to reorder them.
        </Typography>

        <Paper sx={{ p: 2, backgroundColor: YNAB_COLORS.background }}>
          <Accordion
            expanded={expanded === "columns"}
            onChange={() =>
              setExpanded(expanded === "columns" ? false : "columns")
            }
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6" sx={{ color: YNAB_COLORS.text }}>
                Visible Columns
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box>
                {columns.map((column, index) => (
                  <Paper
                    key={column.field}
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, index)}
                    sx={{
                      p: 2,
                      mb: 1,
                      display: "flex",
                      alignItems: "center",
                      gap: 2,
                      cursor: "grab",
                      opacity: draggedIndex === index ? 0.5 : 1,
                      backgroundColor: YNAB_COLORS.surface,
                      border: `1px solid ${YNAB_COLORS.border}`,
                      "&:hover": {
                        backgroundColor: theme.palette.action.hover,
                      },
                    }}
                  >
                    <DragIndicatorIcon sx={{ color: YNAB_COLORS.border }} />

                    <Box sx={{ flex: 1 }}>
                      {editingColumn?.field === column.field ? (
                        // Edit mode for column header
                        <Box
                          sx={{ display: "flex", gap: 1, alignItems: "center" }}
                        >
                          <TextField
                            value={editingColumn.headerName}
                            onChange={(e) =>
                              setEditingColumn((prev) =>
                                prev
                                  ? { ...prev, headerName: e.target.value }
                                  : null
                              )
                            }
                            size="small"
                            sx={{ flex: 1 }}
                          />
                          <IconButton
                            size="small"
                            onClick={saveColumn}
                            sx={{ color: YNAB_COLORS.primary }}
                          >
                            <SaveIcon />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={cancelColumnEdit}
                            sx={{ color: YNAB_COLORS.text }}
                          >
                            <CloseIcon />
                          </IconButton>
                        </Box>
                      ) : (
                        // Normal display mode
                        <Box
                          sx={{ display: "flex", alignItems: "center", gap: 1 }}
                        >
                          <Typography
                            variant="body2"
                            sx={{ fontWeight: 600, color: YNAB_COLORS.text }}
                          >
                            {column.headerName}
                          </Typography>
                          <IconButton
                            size="small"
                            onClick={() => editColumn(column.field)}
                            sx={{ color: YNAB_COLORS.primary }}
                          >
                            <EditIcon />
                          </IconButton>
                        </Box>
                      )}
                      <Typography
                        variant="caption"
                        sx={{ color: YNAB_COLORS.text, opacity: 0.7 }}
                      >
                        {column.field}
                      </Typography>
                    </Box>

                    <IconButton
                      size="small"
                      onClick={() => handleColumnRemove(column.field)}
                      sx={{ color: "#F93E3E" }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Paper>
                ))}
              </Box>
            </AccordionDetails>
          </Accordion>

          <Accordion
            expanded={expanded === "available"}
            onChange={() =>
              setExpanded(expanded === "available" ? false : "available")
            }
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6" sx={{ color: YNAB_COLORS.text }}>
                Available Fields
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box display="flex" flexWrap="wrap" gap={1}>
                {availableFieldsForType.map((field) => (
                  <Chip
                    key={field.field}
                    label={field.headerName}
                    onClick={() => handleColumnToggle(field.field)}
                    variant={
                      visibleFields.includes(field.field)
                        ? "filled"
                        : "outlined"
                    }
                    color={
                      visibleFields.includes(field.field)
                        ? "primary"
                        : "default"
                    }
                    clickable
                    sx={{
                      backgroundColor: visibleFields.includes(field.field)
                        ? YNAB_COLORS.primary
                        : "transparent",
                      color: visibleFields.includes(field.field)
                        ? "white"
                        : YNAB_COLORS.text,
                      borderColor: YNAB_COLORS.border,
                      "&:hover": {
                        backgroundColor: visibleFields.includes(field.field)
                          ? YNAB_COLORS.primary
                          : YNAB_COLORS.background,
                        opacity: 0.8,
                      },
                    }}
                  />
                ))}
              </Box>
            </AccordionDetails>
          </Accordion>
        </Paper>

        {/* Error/Success Messages */}
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ mt: 2 }}>
            {success}
          </Alert>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2, backgroundColor: YNAB_COLORS.background }}>
        <Button onClick={handleReset} sx={{ color: YNAB_COLORS.text }}>
          Reset to Default
        </Button>
        <Button onClick={onClose} sx={{ color: YNAB_COLORS.text }}>
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={saving}
          startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
          sx={{
            backgroundColor: YNAB_COLORS.primary,
            "&:hover": { backgroundColor: YNAB_COLORS.primary, opacity: 0.9 },
          }}
        >
          {saving ? "Saving..." : "Save Configuration"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
