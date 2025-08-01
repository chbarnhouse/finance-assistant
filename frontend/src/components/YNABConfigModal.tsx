import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  TextField,
  IconButton,
  Chip,
  Paper,
  Alert,
  CircularProgress,
  Switch,
  FormControlLabel,
  Autocomplete,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Checkbox,
} from "@mui/material";
import {
  Close as CloseIcon,
  Add as AddIcon,
  Save as SaveIcon,
  Edit as EditIcon,
  Clear as ClearIcon,
  KeyboardArrowUp as UpIcon,
  KeyboardArrowDown as DownIcon,
  Settings as SettingsIcon,
  RestartAlt as RestartAltIcon,
} from "@mui/icons-material";
import { useTheme } from "@mui/material/styles";
import axios from "axios";
import { API_BASE_URL } from "../constants";

// Available fields for each record type
const availableFields: Record<
  string,
  { field: string; headerName: string; type?: string }[]
> = {
  accounts: [
    { field: "id", headerName: "ID" },
    { field: "name", headerName: "Name" },
    { field: "type", headerName: "Type" },
    { field: "on_budget", headerName: "On Budget" },
    { field: "closed", headerName: "Closed" },
    { field: "balance", headerName: "Balance" },
    { field: "cleared_balance", headerName: "Cleared Balance" },
    { field: "uncleared_balance", headerName: "Uncleared Balance" },
    { field: "note", headerName: "Note" },
    { field: "transfer_payee_id", headerName: "Transfer Payee ID" },
    { field: "direct_import_linked", headerName: "Direct Import Linked" },
    { field: "linked", headerName: "Linked" },
    { field: "deleted", headerName: "Deleted" },
  ],
  categories: [
    { field: "id", headerName: "ID" },
    { field: "category_group_name", headerName: "Group" },
    { field: "name", headerName: "Name" },
    { field: "hidden", headerName: "Hidden" },
    { field: "original_category_group_id", headerName: "Original Group ID" },
    { field: "note", headerName: "Note" },
    { field: "budgeted", headerName: "Budgeted" },
    { field: "activity", headerName: "Activity" },
    { field: "balance", headerName: "Balance" },
    { field: "goal_type", headerName: "Goal Type" },
    { field: "goal_day", headerName: "Goal Day" },
    { field: "goal_cadence", headerName: "Goal Cadence" },
    { field: "goal_cadence_frequency", headerName: "Goal Cadence Frequency" },
    { field: "goal_creation_month", headerName: "Goal Creation Month" },
    { field: "goal_target", headerName: "Goal Target" },
    { field: "goal_target_month", headerName: "Goal Target Month" },
    {
      field: "goal_percentage_complete",
      headerName: "Goal Percentage Complete",
    },
    { field: "deleted", headerName: "Deleted" },
  ],
  payees: [
    { field: "id", headerName: "ID" },
    { field: "name", headerName: "Name" },
    { field: "transfer_account_id", headerName: "Transfer Account ID" },
    { field: "deleted", headerName: "Deleted" },
  ],
  budgets: [
    { field: "id", headerName: "ID" },
    { field: "name", headerName: "Name" },
    { field: "last_modified_on", headerName: "Last Modified" },
    { field: "first_month", headerName: "First Month" },
    { field: "last_month", headerName: "Last Month" },
    { field: "date_format", headerName: "Date Format" },
    { field: "currency_format", headerName: "Currency Format" },
  ],
  months: [
    { field: "month", headerName: "Month" },
    { field: "note", headerName: "Note" },
    { field: "income", headerName: "Income" },
    { field: "budgeted", headerName: "Budgeted" },
    { field: "activity", headerName: "Activity" },
    { field: "to_be_budgeted", headerName: "To Be Budgeted" },
    { field: "age_of_money", headerName: "Age of Money" },
    { field: "deleted", headerName: "Deleted" },
  ],
  transactions: [
    { field: "id", headerName: "ID" },
    { field: "date", headerName: "Date" },
    { field: "amount", headerName: "Amount" },
    { field: "memo", headerName: "Memo" },
    { field: "cleared", headerName: "Cleared" },
    { field: "approved", headerName: "Approved" },
    { field: "flag_color", headerName: "Flag Color" },
    { field: "account_id", headerName: "Account ID" },
    { field: "account_name", headerName: "Account Name" },
    { field: "payee_id", headerName: "Payee ID" },
    { field: "payee_name", headerName: "Payee Name" },
    { field: "category_id", headerName: "Category ID" },
    { field: "category_name", headerName: "Category Name" },
    { field: "transfer_account_id", headerName: "Transfer Account ID" },
    { field: "transfer_transaction_id", headerName: "Transfer Transaction ID" },
    { field: "matched_transaction_id", headerName: "Matched Transaction ID" },
    { field: "import_id", headerName: "Import ID" },
    { field: "deleted", headerName: "Deleted" },
    { field: "subtransactions", headerName: "Subtransactions" },
  ],
};

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
  useLinkIcon?: boolean;
}

interface CrossReference {
  sourceValue: string;
  displayValue: string;
  enabled: boolean;
  column: string;
}

interface AccountTypeMapping {
  ynabType: string;
  coreRecordType: string;
  defaultSubtypeId?: string;
  enabled: boolean;
}

interface YNABConfigModalProps {
  open: boolean;
  onClose: () => void;
  recordType:
    | "accounts"
    | "categories"
    | "payees"
    | "budgets"
    | "months"
    | "transactions";
  currentColumns: ColumnConfig[];
  onColumnsChange: (columns: ColumnConfig[]) => void;
  useGroupedView?: boolean;
  onUseGroupedViewChange?: (useGrouped: boolean) => void;
}

// TransferList component - moved outside to prevent recreation
interface TransferListProps {
  available: string[];
  displayed: string[];
  onMoveToDisplayed: (fields: string[]) => void;
  onMoveToAvailable: (fields: string[]) => void;
  onReorderDisplayed: (newOrder: string[]) => void;
  recordType: string;
  onColumnConfigChange: (field: string, config: Partial<ColumnConfig>) => void;
  columns: ColumnConfig[];
}

// Column Configuration Dialog Component
const ColumnConfigDialog: React.FC<{
  open: boolean;
  onClose: () => void;
  column: ColumnConfig | null;
  onSave: (config: Partial<ColumnConfig>) => void;
}> = ({ open, onClose, column, onSave }) => {
  const [config, setConfig] = useState<Partial<ColumnConfig>>({});
  const theme = useTheme();

  const YNAB_COLORS = {
    primary: "#3B5EDA",
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

  useEffect(() => {
    if (column) {
      setConfig({
        headerName: column.headerName,
        useCurrency: column.useCurrency,
        invertNegativeSign: column.invertNegativeSign,
        disableNegativeSign: column.disableNegativeSign,
        useThousandsSeparator: column.useThousandsSeparator,
        useDatetime: column.useDatetime,
        datetimeFormat: column.datetimeFormat,
        useCheckbox: column.useCheckbox,
        useLinkIcon: column.useLinkIcon,
      });
    }
  }, [column]);

  const handleSave = () => {
    if (column) {
      onSave(config);
      onClose();
    }
  };

  if (!column) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          boxShadow:
            theme.palette.mode === "dark"
              ? "0 8px 32px rgba(0, 0, 0, 0.4)"
              : "0 8px 32px rgba(0, 0, 0, 0.15)",
        },
      }}
    >
      <DialogTitle
        sx={{
          backgroundColor: YNAB_COLORS.primary,
          color: "white",
          borderBottom: `1px solid ${YNAB_COLORS.border}`,
          "& .MuiTypography-root": {
            fontWeight: 600,
          },
        }}
      >
        Configure Column: {column.field}
      </DialogTitle>
      <DialogContent sx={{ p: 3 }}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {/* Header Name */}
          <Box>
            <Typography
              variant="subtitle2"
              sx={{ mb: 1, color: YNAB_COLORS.text, fontWeight: 600 }}
            >
              Column Header
            </Typography>
            <TextField
              label="Display Name"
              value={config.headerName || ""}
              onChange={(e) =>
                setConfig({ ...config, headerName: e.target.value })
              }
              fullWidth
              variant="outlined"
              sx={{
                "& .MuiOutlinedInput-root": {
                  "&:hover fieldset": {
                    borderColor: YNAB_COLORS.primary,
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: YNAB_COLORS.primary,
                  },
                },
              }}
            />
          </Box>

          {/* Currency Formatting Options */}
          {column.field.includes("balance") && (
            <Box
              sx={{
                p: 2,
                backgroundColor: YNAB_COLORS.background,
                borderRadius: 1,
                border: `1px solid ${YNAB_COLORS.border}`,
              }}
            >
              <Typography
                variant="subtitle2"
                sx={{ mb: 2, color: YNAB_COLORS.text, fontWeight: 600 }}
              >
                Currency Formatting
              </Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={config.useCurrency !== false}
                    onChange={(e) =>
                      setConfig({ ...config, useCurrency: e.target.checked })
                    }
                  />
                }
                label="Display as Currency"
              />
              {config.useCurrency !== false && (
                <Box
                  sx={{
                    ml: 1,
                    mt: 2,
                    display: "flex",
                    flexDirection: "column",
                    gap: 1,
                  }}
                >
                  <FormControlLabel
                    control={
                      <Switch
                        checked={config.invertNegativeSign || false}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            invertNegativeSign: e.target.checked,
                          })
                        }
                      />
                    }
                    label="Invert Negative Sign"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={config.disableNegativeSign || false}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            disableNegativeSign: e.target.checked,
                          })
                        }
                      />
                    }
                    label="Hide Negative Sign"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={config.useThousandsSeparator !== false}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            useThousandsSeparator: e.target.checked,
                          })
                        }
                      />
                    }
                    label="Show Thousands Separator"
                  />
                </Box>
              )}
            </Box>
          )}

          {/* Date/Time Formatting Options */}
          {column.field === "last_reconciled_at" && (
            <Box
              sx={{
                p: 2,
                backgroundColor: YNAB_COLORS.background,
                borderRadius: 1,
                border: `1px solid ${YNAB_COLORS.border}`,
              }}
            >
              <Typography
                variant="subtitle2"
                sx={{ mb: 2, color: YNAB_COLORS.text, fontWeight: 600 }}
              >
                Date/Time Formatting
              </Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={config.useDatetime !== false}
                    onChange={(e) =>
                      setConfig({ ...config, useDatetime: e.target.checked })
                    }
                  />
                }
                label="Display as Date/Time"
              />
              {config.useDatetime !== false && (
                <TextField
                  label="Date/Time Format"
                  value={config.datetimeFormat || "MM/DD/YYYY HH:mm:ss"}
                  onChange={(e) =>
                    setConfig({ ...config, datetimeFormat: e.target.value })
                  }
                  fullWidth
                  variant="outlined"
                  sx={{
                    mt: 2,
                    "& .MuiOutlinedInput-root": {
                      "&:hover fieldset": {
                        borderColor: YNAB_COLORS.primary,
                      },
                      "&.Mui-focused fieldset": {
                        borderColor: YNAB_COLORS.primary,
                      },
                    },
                  }}
                  helperText="Use: YYYY, MM, DD, HH, mm, ss"
                />
              )}
            </Box>
          )}

          {/* Boolean Formatting Options */}
          {(column.field === "on_budget" ||
            column.field === "closed" ||
            column.field === "direct_import_linked" ||
            column.field === "direct_import_in_error" ||
            column.field === "deleted") && (
            <Box
              sx={{
                p: 2,
                backgroundColor: YNAB_COLORS.background,
                borderRadius: 1,
                border: `1px solid ${YNAB_COLORS.border}`,
              }}
            >
              <Typography
                variant="subtitle2"
                sx={{ mb: 2, color: YNAB_COLORS.text, fontWeight: 600 }}
              >
                Boolean Display
              </Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={config.useCheckbox !== false}
                    onChange={(e) =>
                      setConfig({ ...config, useCheckbox: e.target.checked })
                    }
                  />
                }
                label="Display as Checkbox"
              />
            </Box>
          )}

          {/* Link Icon Display Options */}
          {column.field === "linked" && (
            <Box
              sx={{
                p: 2,
                backgroundColor: YNAB_COLORS.background,
                borderRadius: 1,
                border: `1px solid ${YNAB_COLORS.border}`,
              }}
            >
              <Typography
                variant="subtitle2"
                sx={{ mb: 2, color: YNAB_COLORS.text, fontWeight: 600 }}
              >
                Link Display
              </Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={config.useLinkIcon !== false}
                    onChange={(e) =>
                      setConfig({ ...config, useLinkIcon: e.target.checked })
                    }
                  />
                }
                label="Display as Link Icon"
              />
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 3, pt: 0 }}>
        <Button
          onClick={onClose}
          sx={{
            color: YNAB_COLORS.text,
            borderColor: YNAB_COLORS.border,
            "&:hover": {
              borderColor: YNAB_COLORS.primary,
              color: YNAB_COLORS.primary,
            },
          }}
          variant="outlined"
        >
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          sx={{
            backgroundColor: YNAB_COLORS.primary,
            "&:hover": {
              backgroundColor: YNAB_COLORS.primary,
              opacity: 0.9,
            },
          }}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const TransferList: React.FC<TransferListProps> = ({
  available,
  displayed,
  onMoveToDisplayed,
  onMoveToAvailable,
  onReorderDisplayed,
  recordType,
  onColumnConfigChange,
  columns,
}) => {
  const [availableChecked, setAvailableChecked] = useState<string[]>([]);
  const [displayedChecked, setDisplayedChecked] = useState<string[]>([]);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [selectedColumn, setSelectedColumn] = useState<ColumnConfig | null>(
    null
  );

  const [internalDisplayed, setInternalDisplayed] =
    useState<string[]>(displayed);
  const theme = useTheme();

  const YNAB_COLORS = {
    primary: "#3B5EDA",
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

  // Only initialize internal state once when component mounts
  useEffect(() => {
    console.log("TransferList: Initializing with displayed prop:", displayed);
    setInternalDisplayed(displayed);
  }, []); // Empty dependency array - only run once

  // Move item up in the list
  const moveItemUp = (index: number) => {
    if (index === 0) return; // Can't move first item up

    const newDisplayedColumns = [...internalDisplayed];
    const item = newDisplayedColumns[index];
    newDisplayedColumns.splice(index, 1);
    newDisplayedColumns.splice(index - 1, 0, item);

    console.log(
      "Move up: updating internal state and parent with:",
      newDisplayedColumns
    );
    setInternalDisplayed(newDisplayedColumns);
    onReorderDisplayed(newDisplayedColumns);
  };

  // Move item down in the list
  const moveItemDown = (index: number) => {
    if (index === internalDisplayed.length - 1) return; // Can't move last item down

    const newDisplayedColumns = [...internalDisplayed];
    const item = newDisplayedColumns[index];
    newDisplayedColumns.splice(index, 1);
    newDisplayedColumns.splice(index + 1, 0, item);

    console.log(
      "Move down: updating internal state and parent with:",
      newDisplayedColumns
    );
    setInternalDisplayed(newDisplayedColumns);
    onReorderDisplayed(newDisplayedColumns);
  };

  const handleAvailableToggle = (field: string) => {
    setAvailableChecked((prev) =>
      prev.includes(field) ? prev.filter((f) => f !== field) : [...prev, field]
    );
  };

  const handleDisplayedToggle = (field: string) => {
    setDisplayedChecked((prev) =>
      prev.includes(field) ? prev.filter((f) => f !== field) : [...prev, field]
    );
  };

  const handleMoveToDisplayed = () => {
    onMoveToDisplayed(availableChecked);
    setInternalDisplayed((prev) => [...prev, ...availableChecked]);
    setAvailableChecked([]);
  };

  const handleMoveToAvailable = () => {
    onMoveToAvailable(displayedChecked);
    setInternalDisplayed((prev) =>
      prev.filter((field) => !displayedChecked.includes(field))
    );
    setDisplayedChecked([]);
  };

  const availableCheckedCount = availableChecked.length;
  const displayedCheckedCount = displayedChecked.length;

  return (
    <Box
      sx={{
        display: "flex",
        gap: 3,
        alignItems: "flex-start",
        minHeight: "400px",
      }}
    >
      {/* Available Columns */}
      <Paper sx={{ flex: "0 0 30%", p: 2, minWidth: "250px" }}>
        <Typography variant="h6" sx={{ p: 1, color: YNAB_COLORS.text }}>
          Available Columns ({available.length})
        </Typography>
        <List dense sx={{ height: 320, overflow: "auto" }}>
          {available.map((field) => {
            const fieldInfo = availableFields[recordType]?.find(
              (f) => f.field === field
            );
            const savedColumn = columns.find((col) => col.field === field);
            const displayName =
              savedColumn?.headerName || fieldInfo?.headerName || field;
            return (
              <ListItem key={field} dense>
                <Checkbox
                  checked={availableChecked.includes(field)}
                  onChange={() => handleAvailableToggle(field)}
                  size="small"
                />
                <ListItemText
                  primary={displayName}
                  secondary={field}
                  primaryTypographyProps={{ fontSize: "0.875rem" }}
                  secondaryTypographyProps={{ fontSize: "0.75rem" }}
                />
              </ListItem>
            );
          })}
        </List>
      </Paper>

      {/* Transfer Buttons */}
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 1,
        }}
      >
        <Button
          variant="outlined"
          size="small"
          onClick={handleMoveToDisplayed}
          disabled={availableCheckedCount === 0}
          sx={{ minWidth: 40 }}
        >
          &gt;&gt;
        </Button>
        <Button
          variant="outlined"
          size="small"
          onClick={handleMoveToAvailable}
          disabled={displayedCheckedCount === 0}
          sx={{ minWidth: 40 }}
        >
          &lt;&lt;
        </Button>
      </Box>

      {/* Displayed Columns */}
      <Paper sx={{ flex: "0 0 60%", p: 2, minWidth: "350px" }}>
        <Typography variant="h6" sx={{ p: 1, color: YNAB_COLORS.text }}>
          Displayed Columns ({internalDisplayed.length})
        </Typography>
        <Typography
          variant="caption"
          sx={{ px: 1, color: YNAB_COLORS.text, opacity: 0.7 }}
        >
          Use arrows to reorder • Check to select for transfer
        </Typography>
        <List
          dense
          sx={{
            height: 320,
            overflow: "auto",
          }}
        >
          {internalDisplayed.map((field, index) => {
            const fieldInfo = availableFields[recordType]?.find(
              (f) => f.field === field
            );
            const savedColumn = columns.find((col) => col.field === field);
            const displayName =
              savedColumn?.headerName || fieldInfo?.headerName || field;
            return (
              <ListItem
                key={field}
                dense
                sx={{
                  transition: "all 0.2s ease",
                  "&:hover": {
                    backgroundColor: theme.palette.action.hover,
                  },
                }}
              >
                <Checkbox
                  checked={displayedChecked.includes(field)}
                  onChange={() => handleDisplayedToggle(field)}
                  size="small"
                  onClick={(e) => e.stopPropagation()}
                />
                <ListItemText
                  primary={displayName}
                  secondary={field}
                  primaryTypographyProps={{ fontSize: "0.875rem" }}
                  secondaryTypographyProps={{ fontSize: "0.75rem" }}
                />
                <Box sx={{ display: "flex", gap: 0.5, ml: 1 }}>
                  <IconButton
                    size="medium"
                    onClick={() => moveItemUp(index)}
                    disabled={index === 0}
                    sx={{
                      color: YNAB_COLORS.primary,
                      backgroundColor:
                        theme.palette.mode === "dark"
                          ? "rgba(59, 94, 218, 0.1)"
                          : "rgba(59, 94, 218, 0.05)",
                      border: `1px solid ${YNAB_COLORS.border}`,
                      "&:hover": {
                        color: YNAB_COLORS.primary,
                        backgroundColor:
                          theme.palette.mode === "dark"
                            ? "rgba(59, 94, 218, 0.2)"
                            : "rgba(59, 94, 218, 0.1)",
                        border: `1px solid ${YNAB_COLORS.primary}`,
                      },
                      "&:disabled": {
                        color: YNAB_COLORS.border,
                        backgroundColor: "transparent",
                        opacity: 0.3,
                        border: `1px solid ${YNAB_COLORS.border}`,
                      },
                      minWidth: "32px",
                      minHeight: "32px",
                      width: "32px",
                      height: "32px",
                      padding: "4px",
                    }}
                  >
                    <UpIcon fontSize="medium" />
                  </IconButton>
                  <IconButton
                    size="medium"
                    onClick={() => moveItemDown(index)}
                    disabled={index === internalDisplayed.length - 1}
                    sx={{
                      color: YNAB_COLORS.primary,
                      backgroundColor:
                        theme.palette.mode === "dark"
                          ? "rgba(59, 94, 218, 0.1)"
                          : "rgba(59, 94, 218, 0.05)",
                      border: `1px solid ${YNAB_COLORS.border}`,
                      "&:hover": {
                        color: YNAB_COLORS.primary,
                        backgroundColor:
                          theme.palette.mode === "dark"
                            ? "rgba(59, 94, 218, 0.2)"
                            : "rgba(59, 94, 218, 0.1)",
                        border: `1px solid ${YNAB_COLORS.primary}`,
                      },
                      "&:disabled": {
                        color: YNAB_COLORS.border,
                        backgroundColor: "transparent",
                        opacity: 0.3,
                        border: `1px solid ${YNAB_COLORS.border}`,
                      },
                      minWidth: "32px",
                      minHeight: "32px",
                      width: "32px",
                      height: "32px",
                      padding: "4px",
                    }}
                  >
                    <DownIcon fontSize="medium" />
                  </IconButton>
                  <IconButton
                    size="medium"
                    onClick={() => {
                      const columnConfig = columns.find(
                        (col) => col.field === field
                      );
                      if (columnConfig) {
                        setSelectedColumn(columnConfig);
                        setConfigDialogOpen(true);
                      }
                    }}
                    sx={{
                      color: YNAB_COLORS.primary,
                      backgroundColor:
                        theme.palette.mode === "dark"
                          ? "rgba(59, 94, 218, 0.1)"
                          : "rgba(59, 94, 218, 0.05)",
                      border: `1px solid ${YNAB_COLORS.border}`,
                      "&:hover": {
                        color: YNAB_COLORS.primary,
                        backgroundColor:
                          theme.palette.mode === "dark"
                            ? "rgba(59, 94, 218, 0.2)"
                            : "rgba(59, 94, 218, 0.1)",
                        border: `1px solid ${YNAB_COLORS.primary}`,
                      },
                      minWidth: "32px",
                      minHeight: "32px",
                      width: "32px",
                      height: "32px",
                      padding: "4px",
                    }}
                  >
                    <SettingsIcon fontSize="medium" />
                  </IconButton>
                </Box>
              </ListItem>
            );
          })}
        </List>
      </Paper>

      {/* Column Configuration Dialog */}
      <ColumnConfigDialog
        open={configDialogOpen}
        onClose={() => setConfigDialogOpen(false)}
        column={selectedColumn}
        onSave={(config) => {
          if (selectedColumn) {
            onColumnConfigChange(selectedColumn.field, config);
          }
        }}
      />
    </Box>
  );
};

const YNABConfigModal: React.FC<YNABConfigModalProps> = ({
  open,
  onClose,
  recordType,
  currentColumns,
  onColumnsChange,
  useGroupedView = false,
  onUseGroupedViewChange,
}) => {
  const [columns, setColumns] = useState<ColumnConfig[]>(currentColumns);
  const [crossReferences, setCrossReferences] = useState<CrossReference[]>([]);
  const [accountTypeMappings, setAccountTypeMappings] = useState<
    AccountTypeMapping[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [newCrossRef, setNewCrossRef] = useState({
    sourceValue: "",
    displayValue: "",
    columns: [] as string[],
  });
  const [editingCrossRef, setEditingCrossRef] = useState<{
    index: number;
    sourceValue: string;
    displayValue: string;
    columns: string[];
  } | null>(null);
  const [newAccountTypeMapping, setNewAccountTypeMapping] = useState({
    ynabType: "",
    coreRecordType: "",
    defaultSubtypeId: "",
  });
  const [activeTab, setActiveTab] = useState(0);
  const [availableColumns, setAvailableColumns] = useState<string[]>([]);
  const [displayedColumns, setDisplayedColumns] = useState<string[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // State for lookup data (sub-types)
  const [accountTypes, setAccountTypes] = useState<any[]>([]);
  const [liabilityTypes, setLiabilityTypes] = useState<any[]>([]);
  const [creditCardTypes, setCreditCardTypes] = useState<any[]>([]);
  const [assetTypes, setAssetTypes] = useState<any[]>([]);

  const theme = useTheme();

  // YNAB Account Types
  const YNAB_ACCOUNT_TYPES = [
    "checking",
    "savings",
    "cash",
    "creditCard",
    "lineOfCredit",
    "otherAsset",
    "otherLiability",
    "mortgage",
    "autoLoan",
    "studentLoan",
    "personalLoan",
    "medicalDebt",
    "otherDebt",
  ];

  // Core Record Types for mapping
  const CORE_RECORD_TYPES = [
    { value: "account", label: "Account" },
    { value: "credit_card", label: "Credit Card" },
    { value: "liability", label: "Liability" },
    { value: "asset", label: "Asset" },
  ];

  // Default cross-references for common YNAB values
  const DEFAULT_CROSS_REFERENCES: Record<string, CrossReference[]> = {
    accounts: [
      {
        sourceValue: "checking",
        displayValue: "Checking Account",
        enabled: true,
        column: "type",
      },
      {
        sourceValue: "savings",
        displayValue: "Savings Account",
        enabled: true,
        column: "type",
      },
      {
        sourceValue: "cash",
        displayValue: "Cash",
        enabled: true,
        column: "type",
      },
      {
        sourceValue: "creditCard",
        displayValue: "Credit Card",
        enabled: true,
        column: "type",
      },
      {
        sourceValue: "lineOfCredit",
        displayValue: "Line of Credit",
        enabled: true,
        column: "type",
      },
      {
        sourceValue: "otherAsset",
        displayValue: "Other Asset",
        enabled: true,
        column: "type",
      },
      {
        sourceValue: "otherLiability",
        displayValue: "Other Liability",
        enabled: true,
        column: "type",
      },
      {
        sourceValue: "mortgage",
        displayValue: "Mortgage",
        enabled: true,
        column: "type",
      },
      {
        sourceValue: "autoLoan",
        displayValue: "Auto Loan",
        enabled: true,
        column: "type",
      },
      {
        sourceValue: "studentLoan",
        displayValue: "Student Loan",
        enabled: true,
        column: "type",
      },
      {
        sourceValue: "personalLoan",
        displayValue: "Personal Loan",
        enabled: true,
        column: "type",
      },
      {
        sourceValue: "medicalDebt",
        displayValue: "Medical Debt",
        enabled: true,
        column: "type",
      },
      {
        sourceValue: "otherDebt",
        displayValue: "Other Debt",
        enabled: true,
        column: "type",
      },
    ],
    categories: [
      {
        sourceValue: "Monthly Bills",
        displayValue: "Monthly Bills",
        enabled: true,
        column: "category_group_name",
      },
      {
        sourceValue: "True Expenses",
        displayValue: "True Expenses",
        enabled: true,
        column: "category_group_name",
      },
      {
        sourceValue: "Debt Payments",
        displayValue: "Debt Payments",
        enabled: true,
        column: "category_group_name",
      },
      {
        sourceValue: "Quality of Life Goals",
        displayValue: "Quality of Life Goals",
        enabled: true,
        column: "category_group_name",
      },
      {
        sourceValue: "Just for Fun",
        displayValue: "Just for Fun",
        enabled: true,
        column: "category_group_name",
      },
    ],
    payees: [],
    budgets: [],
    months: [],
    transactions: [
      {
        sourceValue: "cleared",
        displayValue: "Cleared",
        enabled: true,
        column: "cleared",
      },
      {
        sourceValue: "uncleared",
        displayValue: "Uncleared",
        enabled: true,
        column: "cleared",
      },
      {
        sourceValue: "reconciled",
        displayValue: "Reconciled",
        enabled: true,
        column: "cleared",
      },
    ],
  };

  // Default account type mappings for all YNAB account types
  const DEFAULT_ACCOUNT_TYPE_MAPPINGS: AccountTypeMapping[] = [
    { ynabType: "checking", coreRecordType: "account", enabled: true },
    { ynabType: "savings", coreRecordType: "account", enabled: true },
    { ynabType: "cash", coreRecordType: "account", enabled: true },
    { ynabType: "creditCard", coreRecordType: "credit_card", enabled: true },
    { ynabType: "lineOfCredit", coreRecordType: "liability", enabled: true },
    { ynabType: "otherAsset", coreRecordType: "asset", enabled: true },
    { ynabType: "otherLiability", coreRecordType: "liability", enabled: true },
    { ynabType: "mortgage", coreRecordType: "liability", enabled: true },
    { ynabType: "autoLoan", coreRecordType: "liability", enabled: true },
    { ynabType: "studentLoan", coreRecordType: "liability", enabled: true },
    { ynabType: "personalLoan", coreRecordType: "liability", enabled: true },
    { ynabType: "medicalDebt", coreRecordType: "liability", enabled: true },
    { ynabType: "otherDebt", coreRecordType: "liability", enabled: true },
  ];

  const YNAB_COLORS = {
    primary: "#3B5EDA",
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

  // Load data when modal opens
  useEffect(() => {
    if (open) {
      loadCrossReferences();
      loadAccountTypeMappings();
      loadLookupData();
      if (!isInitialized) {
        initializeColumnLists();
        setIsInitialized(true);
      }
      setError(null);
      setSuccess(null);
    } else {
      // Reset initialization flag when modal closes
      setIsInitialized(false);
    }
  }, [open, recordType]);

  // Update columns when currentColumns prop changes
  useEffect(() => {
    setColumns(currentColumns);
  }, [currentColumns]);

  const loadCrossReferences = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${API_BASE_URL}/ynab/cross-references/${recordType}/`
      );

      // If no cross-references exist in the database, use the hardcoded defaults
      if (
        !response.data.cross_references ||
        response.data.cross_references.length === 0
      ) {
        console.log(
          "loadCrossReferences: No cross-references found in database, using defaults"
        );
        setCrossReferences([...(DEFAULT_CROSS_REFERENCES[recordType] || [])]);
      } else {
        setCrossReferences(response.data.cross_references);
      }
    } catch (err: any) {
      console.error("Error loading cross-references:", err);
      // On error, fall back to defaults
      console.log("loadCrossReferences: Error occurred, using defaults");
      setCrossReferences([...(DEFAULT_CROSS_REFERENCES[recordType] || [])]);
    } finally {
      setLoading(false);
    }
  };

  const loadAccountTypeMappings = async () => {
    if (recordType !== "accounts") {
      console.log(
        "loadAccountTypeMappings: Skipping - recordType is not 'accounts'"
      );
      return;
    }

    console.log("loadAccountTypeMappings: Loading account type mappings...");
    try {
      const response = await axios.get(
        `${API_BASE_URL}/ynab/account-type-mappings/`
      );
      console.log("loadAccountTypeMappings: API response:", response.data);

      // If no mappings exist in the database, use the hardcoded defaults
      if (!response.data || response.data.length === 0) {
        console.log(
          "loadAccountTypeMappings: No mappings found in database, using defaults"
        );
        setAccountTypeMappings([...DEFAULT_ACCOUNT_TYPE_MAPPINGS]);
      } else {
        setAccountTypeMappings(response.data);
      }
    } catch (err: any) {
      console.error("Failed to load account type mappings:", err);
      // On error, fall back to defaults
      console.log("loadAccountTypeMappings: Error occurred, using defaults");
      setAccountTypeMappings([...DEFAULT_ACCOUNT_TYPE_MAPPINGS]);
    }
  };

  const loadLookupData = async () => {
    if (recordType !== "accounts") {
      return;
    }

    try {
      // Load all lookup data in parallel
      const [
        accountTypesRes,
        liabilityTypesRes,
        creditCardTypesRes,
        assetTypesRes,
      ] = await Promise.all([
        axios.get(`${API_BASE_URL}/lookups/account-types/`),
        axios.get(`${API_BASE_URL}/lookups/liability-types/`),
        axios.get(`${API_BASE_URL}/lookups/credit-card-types/`),
        axios.get(`${API_BASE_URL}/lookups/asset-types/`),
      ]);

      setAccountTypes(accountTypesRes.data || []);
      setLiabilityTypes(liabilityTypesRes.data || []);
      setCreditCardTypes(creditCardTypesRes.data || []);
      setAssetTypes(assetTypesRes.data || []);
    } catch (err: any) {
      console.error("Failed to load lookup data:", err);
    }
  };

  const initializeColumnLists = () => {
    const allFields = availableFields[recordType] || [];
    const available = allFields
      .filter(
        (field) =>
          !columns.find((col) => col.field === field.field && col.visible)
      )
      .map((field) => field.field);
    const displayed = columns
      .filter((col) => col.visible)
      .map((col) => col.field);
    setAvailableColumns(available);
    setDisplayedColumns(displayed);
  };

  const moveToDisplayed = (selectedFields: string[]) => {
    setAvailableColumns((prev) =>
      prev.filter((field) => !selectedFields.includes(field))
    );
    setDisplayedColumns((prev) => [...prev, ...selectedFields]);
  };

  const moveToAvailable = (selectedFields: string[]) => {
    setDisplayedColumns((prev) =>
      prev.filter((field) => !selectedFields.includes(field))
    );
    setAvailableColumns((prev) => [...prev, ...selectedFields]);
  };

  const reorderDisplayedColumns = (newOrder: string[]) => {
    console.log("Parent: Reordering displayed columns:", newOrder);
    console.log("Parent: Previous displayedColumns:", displayedColumns);
    setDisplayedColumns(newOrder);
    // Immediately update columns with the new order
    updateColumnsFromDisplayed(newOrder);
  };

  const updateColumnsFromDisplayed = (newDisplayedColumns?: string[]) => {
    const columnsToUse = newDisplayedColumns || displayedColumns;
    console.log("updateColumnsFromDisplayed: Using columns:", columnsToUse);

    const allFields = availableFields[recordType] || [];

    // Update displayed columns to be visible
    const displayedColumnsConfig = columnsToUse.map((field, index) => {
      const existingColumn = columns.find((col) => col.field === field);
      const fieldInfo = allFields.find((f) => f.field === field);

      const result = existingColumn
        ? {
            ...existingColumn,
            visible: true,
            order: index, // Always update the order based on the new position
          }
        : {
            field,
            headerName: fieldInfo?.headerName || field,
            visible: true,
            order: index,
            width: undefined,
          };

      console.log(
        `Creating displayed column config for ${field}: index=${index}, existingOrder=${existingColumn?.order}, newOrder=${result.order}`
      );
      return result;
    });

    // Update available columns to be hidden
    const availableColumnsConfig = availableColumns.map((field) => {
      const existingColumn = columns.find((col) => col.field === field);
      const fieldInfo = allFields.find((f) => f.field === field);
      return (
        existingColumn || {
          field,
          headerName: fieldInfo?.headerName || field,
          visible: false,
          order: 999, // High order to put at the end
          width: undefined,
        }
      );
    });

    // Combine and preserve existing column configurations
    const allColumns = [...displayedColumnsConfig, ...availableColumnsConfig];

    // Merge with existing columns to preserve other properties
    const mergedColumns = allColumns.map((newCol) => {
      const existingCol = columns.find((col) => col.field === newCol.field);
      const result = existingCol
        ? {
            ...existingCol,
            visible: newCol.visible,
            order: newCol.order,
            headerName: existingCol.headerName, // Preserve custom header names
          }
        : newCol;

      console.log(
        `Merging column ${newCol.field}: newOrder=${newCol.order}, existingOrder=${existingCol?.order}, finalOrder=${result.order}`
      );
      return result;
    });

    console.log(
      "Final merged columns with orders:",
      mergedColumns.map((col) => `${col.field}: order=${col.order}`)
    );
    setColumns(mergedColumns);
  };

  const addCrossReference = () => {
    if (newCrossRef.sourceValue && newCrossRef.displayValue) {
      setCrossReferences((prev) => [
        ...prev,
        {
          sourceValue: newCrossRef.sourceValue,
          displayValue: newCrossRef.displayValue,
          enabled: true,
          column:
            newCrossRef.columns.length > 0
              ? newCrossRef.columns.join(",")
              : "type",
        },
      ]);
      setNewCrossRef({ sourceValue: "", displayValue: "", columns: [] });
    }
  };

  const removeCrossReference = (index: number) => {
    setCrossReferences((prev) => prev.filter((_, i) => i !== index));
  };

  const editCrossReference = (index: number) => {
    const crossRef = crossReferences[index];
    const columns = crossRef.column
      ? crossRef.column.split(",").map((col) => col.trim())
      : [];
    setEditingCrossRef({
      index,
      sourceValue: crossRef.sourceValue,
      displayValue: crossRef.displayValue,
      columns: columns,
    });
  };

  const saveCrossReference = () => {
    if (editingCrossRef) {
      setCrossReferences((prev) =>
        prev.map((ref, i) =>
          i === editingCrossRef.index
            ? {
                ...ref,
                sourceValue: editingCrossRef.sourceValue,
                displayValue: editingCrossRef.displayValue,
                column:
                  editingCrossRef.columns.length > 0
                    ? editingCrossRef.columns.join(",")
                    : "type",
              }
            : ref
        )
      );
      setEditingCrossRef(null);
    }
  };

  const cancelEdit = () => {
    setEditingCrossRef(null);
  };

  const toggleCrossReference = (index: number) => {
    setCrossReferences((prev) =>
      prev.map((ref, i) =>
        i === index ? { ...ref, enabled: !ref.enabled } : ref
      )
    );
  };

  const updateAccountTypeMapping = (
    ynabType: string,
    coreRecordType: string
  ) => {
    setAccountTypeMappings((prev) =>
      prev.map((mapping) =>
        mapping.ynabType === ynabType
          ? { ...mapping, coreRecordType, defaultSubtypeId: undefined }
          : mapping
      )
    );
  };

  const updateAccountTypeMappingSubtype = (
    ynabType: string,
    defaultSubtypeId: string
  ) => {
    setAccountTypeMappings((prev) =>
      prev.map((mapping) =>
        mapping.ynabType === ynabType
          ? { ...mapping, defaultSubtypeId: defaultSubtypeId || undefined }
          : mapping
      )
    );
  };

  const addAccountTypeMapping = () => {
    if (
      !newAccountTypeMapping.ynabType ||
      !newAccountTypeMapping.coreRecordType
    ) {
      return;
    }

    const newMapping = {
      ynabType: newAccountTypeMapping.ynabType,
      coreRecordType: newAccountTypeMapping.coreRecordType,
      defaultSubtypeId: newAccountTypeMapping.defaultSubtypeId || undefined,
      enabled: true,
    };

    setAccountTypeMappings((prev) => [...prev, newMapping]);
    setNewAccountTypeMapping({
      ynabType: "",
      coreRecordType: "",
      defaultSubtypeId: "",
    });
  };

  const removeAccountTypeMapping = (ynabType: string) => {
    setAccountTypeMappings((prev) =>
      prev.filter((mapping) => mapping.ynabType !== ynabType)
    );
  };

  const toggleAccountTypeMapping = (ynabType: string) => {
    setAccountTypeMappings((prev) =>
      prev.map((mapping) =>
        mapping.ynabType === ynabType
          ? { ...mapping, enabled: !mapping.enabled }
          : mapping
      )
    );
  };

  // Cross-reference management functions
  const eraseAllCrossReferences = () => {
    setCrossReferences([]);
  };

  const resetCrossReferencesToDefaults = () => {
    const defaults = DEFAULT_CROSS_REFERENCES[recordType] || [];
    setCrossReferences([...defaults]);
  };

  // Account type mapping management functions
  const eraseAllAccountTypeMappings = () => {
    setAccountTypeMappings([]);
  };

  const resetAccountTypeMappingsToDefaults = () => {
    setAccountTypeMappings([...DEFAULT_ACCOUNT_TYPE_MAPPINGS]);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      // Use the current columns from the state (already updated during reordering)
      const mergedColumns = columns;
      console.log("Final merged columns:", mergedColumns);
      console.log(
        "Final merged columns with orders:",
        mergedColumns.map(
          (col) => `${col.field}: order=${col.order}, visible=${col.visible}`
        )
      );

      // Save cross-references
      await axios.post(`${API_BASE_URL}/ynab/cross-references/${recordType}/`, {
        cross_references: crossReferences,
      });

      // Save account type mappings (only for accounts)
      if (recordType === "accounts") {
        await axios.post(`${API_BASE_URL}/ynab/account-type-mappings/`, {
          mappings: accountTypeMappings,
        });
      }

      // Save column configurations to backend
      const configurationsToSave = mergedColumns.map((col) => ({
        record_type: recordType,
        field: col.field,
        header_name: col.headerName,
        visible: col.visible,
        order: col.order,
        width: col.width,
        use_checkbox: col.useCheckbox,
        use_currency: col.useCurrency,
        invert_negative_sign: col.invertNegativeSign,
        disable_negative_sign: col.disableNegativeSign,
        use_thousands_separator: col.useThousandsSeparator,
        use_datetime: col.useDatetime,
        datetime_format: col.datetimeFormat,
        use_link_icon: col.useLinkIcon,
      }));

      console.log(
        "Saving configurations with order values:",
        configurationsToSave.map(
          (config) =>
            `${config.field}: order=${config.order}, visible=${config.visible}`
        )
      );

      await axios.post(`${API_BASE_URL}/ynab/column-configurations/`, {
        configurations: configurationsToSave,
      });

      // Notify parent of column changes with the updated columns
      onColumnsChange(mergedColumns);

      setSuccess("Configuration saved successfully!");
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error("Error saving configuration:", err);
      setError(
        err.response?.data?.message ||
          "Failed to save configuration. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  const getRecordTypeDisplayName = () => {
    const names = {
      accounts: "Accounts",
      categories: "Categories",
      payees: "Payees",
      budgets: "Budgets",
      months: "Months",
      transactions: "Transactions",
    };
    return names[recordType] || recordType;
  };

  const getDefaultColumns = () => {
    const allFields = availableFields[recordType] || [];

    // Define default visible columns and their order for each record type
    const defaultConfigs = {
      accounts: ["name", "type", "balance", "note", "linked"],
      categories: ["name", "category_group_name", "hidden", "deleted"],
      payees: ["name", "deleted"],
      budgets: ["name", "last_modified_on", "first_month", "last_month"],
      months: [
        "month",
        "note",
        "income",
        "budgeted",
        "activity",
        "to_be_budgeted",
      ],
      transactions: ["date", "amount", "payee_name", "category_name", "memo"],
    };

    const defaultVisibleFields = defaultConfigs[recordType] || ["name"];

    // Create default column configurations
    const defaultColumns = allFields.map((field) => {
      const isVisible = defaultVisibleFields.includes(field.field);
      const order = isVisible ? defaultVisibleFields.indexOf(field.field) : 999;

      // Set sensible defaults for different field types
      let useCurrency = false;
      let useCheckbox = false;
      let useDatetime = false;
      let useThousandsSeparator = true;
      let useLinkIcon = false;

      if (field.field.includes("balance") || field.field.includes("amount")) {
        useCurrency = true;
      }
      if (
        field.field === "on_budget" ||
        field.field === "closed" ||
        field.field === "hidden" ||
        field.field === "deleted"
      ) {
        useCheckbox = true;
      }
      if (
        field.field === "date" ||
        field.field === "last_modified_on" ||
        field.field === "first_month" ||
        field.field === "last_month"
      ) {
        useDatetime = true;
      }

      if (field.field === "linked") {
        useLinkIcon = true;
      }

      return {
        field: field.field,
        headerName: field.headerName || field.field,
        visible: isVisible,
        order: order,
        width: undefined,
        useCheckbox: useCheckbox,
        useCurrency: useCurrency,
        invertNegativeSign: false,
        disableNegativeSign: false,
        useThousandsSeparator: useThousandsSeparator,
        useDatetime: useDatetime,
        datetimeFormat: "YYYY-MM-DD",
        useLinkIcon: useLinkIcon,
      };
    });

    return defaultColumns;
  };

  const handleResetToDefaults = () => {
    const defaultColumns = getDefaultColumns();
    setColumns(defaultColumns);

    // Update the displayed and available column lists
    const visibleFields = defaultColumns
      .filter((col) => col.visible)
      .map((col) => col.field);
    const hiddenFields = defaultColumns
      .filter((col) => !col.visible)
      .map((col) => col.field);

    setDisplayedColumns(visibleFields);
    setAvailableColumns(hiddenFields);

    console.log("Reset to default columns:", defaultColumns);
  };

  const availableFieldsForType = availableFields[recordType] || [];

  // Helper function to format YNAB account type names (add spaces before capital letters)
  const formatYNABAccountType = (type: string) => {
    return type
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (str) => str.toUpperCase());
  };

  // Helper function to get display name for YNAB account type using cross-references
  const getYnabAccountTypeDisplayName = (typeCode: string) => {
    // First try to find a cross-reference for this type
    const crossRef = crossReferences.find(
      (ref) => ref.sourceValue === typeCode && ref.column === "type"
    );
    if (crossRef && crossRef.enabled) {
      return crossRef.displayValue;
    }

    // Fallback to formatted type code
    return formatYNABAccountType(typeCode);
  };

  // Helper function to get available YNAB account types (excluding already mapped ones)
  const getAvailableYNABAccountTypes = () => {
    const mappedTypes = accountTypeMappings.map((mapping) => mapping.ynabType);
    return YNAB_ACCOUNT_TYPES.filter((type) => !mappedTypes.includes(type));
  };

  // Helper function to get sub-types for a given core record type
  const getSubTypesForCoreRecordType = (coreRecordType: string) => {
    switch (coreRecordType) {
      case "account":
        return accountTypes;
      case "liability":
        return liabilityTypes;
      case "credit_card":
        return creditCardTypes;
      case "asset":
        return assetTypes;
      default:
        return [];
    }
  };

  // Helper function to get sub-type name by ID
  const getSubTypeNameById = (id: string, coreRecordType: string) => {
    const subTypes = getSubTypesForCoreRecordType(coreRecordType);
    const subType = subTypes.find((st) => st.id === id);
    return subType ? subType.name : "Unknown";
  };

  // Function to create a new sub-type
  const createSubType = async (name: string, coreRecordType: string) => {
    try {
      let endpoint = "";
      switch (coreRecordType) {
        case "account":
          endpoint = `${API_BASE_URL}/lookups/account-types/`;
          break;
        case "liability":
          endpoint = `${API_BASE_URL}/lookups/liability-types/`;
          break;
        case "credit_card":
          endpoint = `${API_BASE_URL}/lookups/credit-card-types/`;
          break;
        case "asset":
          endpoint = `${API_BASE_URL}/lookups/asset-types/`;
          break;
        default:
          throw new Error(`Unknown core record type: ${coreRecordType}`);
      }

      const response = await axios.post(endpoint, {
        name: name,
        is_default: false,
        original_name: name,
      });

      // Reload the lookup data to include the new sub-type
      await loadLookupData();

      return response.data;
    } catch (error) {
      console.error("Failed to create sub-type:", error);
      throw error;
    }
  };

  // Debug logging for Account Type Mappings
  if (recordType === "accounts") {
    console.log("YNABConfigModal: recordType is 'accounts'");
    console.log("YNABConfigModal: accountTypeMappings:", accountTypeMappings);
    console.log(
      "YNABConfigModal: accountTypeMappings.length:",
      accountTypeMappings.length
    );
    console.log(
      "YNABConfigModal: Available YNAB types:",
      getAvailableYNABAccountTypes()
    );
  }

  if (loading) {
    return (
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            width: "95vw",
            maxWidth: "1400px",
          },
        }}
      >
        <DialogContent>
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              height: 200,
            }}
          >
            <CircularProgress />
          </Box>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          width: "95vw",
          maxWidth: "1400px",
        },
      }}
    >
      <DialogTitle
        sx={{
          backgroundColor: YNAB_COLORS.background,
          color: YNAB_COLORS.text,
          borderBottom: `1px solid ${YNAB_COLORS.border}`,
        }}
      >
        {getRecordTypeDisplayName()} Configuration
      </DialogTitle>

      <DialogContent sx={{ backgroundColor: YNAB_COLORS.background }}>
        <Tabs
          value={activeTab}
          onChange={(e, newValue) => setActiveTab(newValue)}
          sx={{
            mb: 3,
            "& .MuiTab-root": {
              color: YNAB_COLORS.text,
              "&.Mui-selected": {
                color: YNAB_COLORS.primary,
              },
            },
            "& .MuiTabs-indicator": {
              backgroundColor: YNAB_COLORS.primary,
            },
          }}
        >
          <Tab label="Column Management" />
          <Tab label="Cross References" />
        </Tabs>

        {activeTab === 0 && (
          <Box>
            <Typography
              variant="body2"
              sx={{ color: YNAB_COLORS.text, opacity: 0.8, mb: 3 }}
            >
              Use the transfer list below to move columns between available and
              displayed lists. The order in the displayed list determines the
              column order in the table.
            </Typography>

            {/* Grouped View Toggle - Only for categories */}
            {recordType === "categories" && onUseGroupedViewChange && (
              <Paper sx={{ p: 2, mb: 2, backgroundColor: YNAB_COLORS.surface }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={useGroupedView}
                      onChange={(e) => onUseGroupedViewChange(e.target.checked)}
                    />
                  }
                  label="Use Grouped View"
                  sx={{ color: YNAB_COLORS.text }}
                />
              </Paper>
            )}

            {/* Transfer List */}
            <Paper sx={{ p: 2, backgroundColor: YNAB_COLORS.background }}>
              <TransferList
                available={availableColumns}
                displayed={displayedColumns}
                onMoveToDisplayed={moveToDisplayed}
                onMoveToAvailable={moveToAvailable}
                onReorderDisplayed={reorderDisplayedColumns}
                recordType={recordType}
                onColumnConfigChange={(field, config) => {
                  setColumns((prev) =>
                    prev.map((col) =>
                      col.field === field ? { ...col, ...config } : col
                    )
                  );
                }}
                columns={columns}
              />

              <Box sx={{ mt: 2, display: "flex", justifyContent: "center" }}>
                <Button
                  variant="outlined"
                  color="warning"
                  onClick={handleResetToDefaults}
                  disabled={saving}
                  startIcon={<RestartAltIcon />}
                  sx={{
                    color: "#ed6c02",
                    borderColor: "#ed6c02",
                    "&:hover": {
                      borderColor: "#e65100",
                      backgroundColor: "rgba(237, 108, 2, 0.04)",
                    },
                  }}
                >
                  Reset Default Columns
                </Button>
              </Box>
            </Paper>
          </Box>
        )}

        {activeTab === 1 && (
          <Box>
            <Typography variant="h6" sx={{ color: YNAB_COLORS.text, mb: 2 }}>
              Cross References
            </Typography>
            <Typography
              variant="body2"
              sx={{ color: YNAB_COLORS.text, opacity: 0.8, mb: 3 }}
            >
              Map YNAB values to custom display values and configure account
              type mappings for intelligent linking.
            </Typography>

            <Paper sx={{ p: 2, backgroundColor: YNAB_COLORS.background }}>
              {/* Cross-References Section */}
              <Box sx={{ mb: 4 }}>
                <Typography
                  variant="h6"
                  sx={{ color: YNAB_COLORS.text, mb: 2 }}
                >
                  Value Mappings
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ color: YNAB_COLORS.text, opacity: 0.8, mb: 2 }}
                >
                  Map YNAB values to custom display values for better
                  readability.
                </Typography>

                {/* Add new cross-reference */}
                <Box sx={{ mb: 3 }}>
                  <Typography
                    variant="subtitle2"
                    sx={{ color: YNAB_COLORS.text, mb: 1 }}
                  >
                    Add New Cross-Reference
                  </Typography>
                  <Box
                    sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}
                  >
                    <TextField
                      size="small"
                      placeholder="Source Value"
                      value={newCrossRef.sourceValue}
                      onChange={(e) =>
                        setNewCrossRef((prev) => ({
                          ...prev,
                          sourceValue: e.target.value,
                        }))
                      }
                      sx={{ flex: 1 }}
                    />
                    <TextField
                      size="small"
                      placeholder="Display Value"
                      value={newCrossRef.displayValue}
                      onChange={(e) =>
                        setNewCrossRef((prev) => ({
                          ...prev,
                          displayValue: e.target.value,
                        }))
                      }
                      sx={{ flex: 1 }}
                    />
                    <Autocomplete
                      multiple
                      size="small"
                      options={availableFieldsForType.map(
                        (field) => field.field
                      )}
                      value={newCrossRef.columns}
                      onChange={(event, newValue) => {
                        setNewCrossRef((prev) => ({
                          ...prev,
                          columns: newValue,
                        }));
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          placeholder="Select columns"
                          sx={{ minWidth: 200 }}
                        />
                      )}
                      renderTags={(value, getTagProps) =>
                        value.map((option, index) => (
                          <Chip
                            {...getTagProps({ index })}
                            key={option}
                            label={option}
                            size="small"
                            sx={{
                              backgroundColor: YNAB_COLORS.primary,
                              color: "white",
                              "& .MuiChip-deleteIcon": {
                                color: "white",
                              },
                            }}
                          />
                        ))
                      }
                      sx={{
                        minWidth: 200,
                        "& .MuiAutocomplete-input": {
                          fontSize: "0.875rem",
                        },
                      }}
                    />
                    <IconButton
                      onClick={addCrossReference}
                      sx={{
                        backgroundColor: YNAB_COLORS.primary,
                        color: "white",
                        "&:hover": {
                          backgroundColor: YNAB_COLORS.primary,
                          opacity: 0.9,
                        },
                      }}
                    >
                      <AddIcon />
                    </IconButton>
                  </Box>
                </Box>

                {/* Cross-reference management buttons */}
                <Box sx={{ mb: 2, display: "flex", gap: 1 }}>
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={eraseAllCrossReferences}
                    disabled={crossReferences.length === 0}
                    size="small"
                    sx={{
                      color: "#d32f2f",
                      borderColor: "#d32f2f",
                      "&:hover": {
                        borderColor: "#c62828",
                        backgroundColor: "rgba(211, 47, 47, 0.04)",
                      },
                    }}
                  >
                    Erase All
                  </Button>
                  <Button
                    variant="outlined"
                    color="warning"
                    onClick={resetCrossReferencesToDefaults}
                    size="small"
                    sx={{
                      color: "#ed6c02",
                      borderColor: "#ed6c02",
                      "&:hover": {
                        borderColor: "#e65100",
                        backgroundColor: "rgba(237, 108, 2, 0.04)",
                      },
                    }}
                  >
                    Reset to Defaults
                  </Button>
                </Box>

                {/* Existing cross-references */}
                {crossReferences.map((crossRef, index) => (
                  <Paper
                    key={index}
                    sx={{
                      p: 2,
                      mb: 1,
                      backgroundColor: YNAB_COLORS.surface,
                      border: `1px solid ${YNAB_COLORS.border}`,
                    }}
                  >
                    {editingCrossRef?.index === index ? (
                      // Edit mode
                      <Box
                        sx={{
                          display: "flex",
                          gap: 1,
                          alignItems: "flex-start",
                        }}
                      >
                        <TextField
                          size="small"
                          value={editingCrossRef.sourceValue}
                          onChange={(e) =>
                            setEditingCrossRef((prev) =>
                              prev
                                ? { ...prev, sourceValue: e.target.value }
                                : null
                            )
                          }
                          sx={{ flex: 1 }}
                        />
                        <TextField
                          size="small"
                          value={editingCrossRef.displayValue}
                          onChange={(e) =>
                            setEditingCrossRef((prev) =>
                              prev
                                ? { ...prev, displayValue: e.target.value }
                                : null
                            )
                          }
                          sx={{ flex: 1 }}
                        />
                        <IconButton
                          size="small"
                          onClick={saveCrossReference}
                          sx={{ color: YNAB_COLORS.primary }}
                        >
                          <SaveIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={cancelEdit}
                          sx={{ color: YNAB_COLORS.text }}
                        >
                          <CloseIcon />
                        </IconButton>
                      </Box>
                    ) : (
                      // Display mode
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          gap: 2,
                        }}
                      >
                        <Box sx={{ flex: 1 }}>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                              mb: 1,
                            }}
                          >
                            <Typography
                              variant="subtitle1"
                              sx={{
                                color: YNAB_COLORS.text,
                                fontWeight: 600,
                              }}
                            >
                              {crossRef.sourceValue}
                            </Typography>
                            <Typography
                              variant="body2"
                              sx={{
                                color: YNAB_COLORS.text,
                                opacity: 0.7,
                              }}
                            >
                              →
                            </Typography>
                            <Typography
                              variant="subtitle1"
                              sx={{
                                color: YNAB_COLORS.primary,
                                fontWeight: 600,
                              }}
                            >
                              {crossRef.displayValue}
                            </Typography>
                          </Box>
                          <Typography
                            variant="caption"
                            sx={{ color: YNAB_COLORS.text, opacity: 0.7 }}
                          >
                            Columns: {crossRef.column || "default"}
                          </Typography>
                        </Box>
                        <Box
                          sx={{ display: "flex", alignItems: "center", gap: 1 }}
                        >
                          <FormControlLabel
                            control={
                              <Switch
                                checked={crossRef.enabled}
                                onChange={() => toggleCrossReference(index)}
                                size="small"
                                sx={{
                                  "& .MuiSwitch-switchBase.Mui-checked": {
                                    color: YNAB_COLORS.primary,
                                  },
                                  "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track":
                                    {
                                      backgroundColor: YNAB_COLORS.primary,
                                    },
                                }}
                              />
                            }
                            label={
                              <Typography
                                variant="caption"
                                sx={{
                                  color: YNAB_COLORS.text,
                                  opacity: 0.8,
                                }}
                              >
                                {crossRef.enabled ? "Enabled" : "Disabled"}
                              </Typography>
                            }
                            sx={{ margin: 0 }}
                          />
                          <IconButton
                            size="small"
                            onClick={() => editCrossReference(index)}
                            sx={{
                              color: YNAB_COLORS.text,
                              opacity: 0.7,
                              "&:hover": {
                                color: YNAB_COLORS.primary,
                                opacity: 1,
                              },
                            }}
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => removeCrossReference(index)}
                            sx={{
                              color: YNAB_COLORS.text,
                              opacity: 0.7,
                              "&:hover": {
                                color: "error.main",
                                opacity: 1,
                              },
                            }}
                          >
                            <ClearIcon />
                          </IconButton>
                        </Box>
                      </Box>
                    )}
                  </Paper>
                ))}
              </Box>

              {/* Account Type Mappings Section - Only for accounts record type */}
              {recordType === "accounts" && (
                <Box>
                  <Typography
                    variant="h6"
                    sx={{ color: YNAB_COLORS.text, mb: 2 }}
                  >
                    Account Type Mappings
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ color: YNAB_COLORS.text, opacity: 0.8, mb: 2 }}
                  >
                    Map YNAB account types to core Finance Assistant record
                    types for intelligent linking suggestions.
                  </Typography>

                  {/* Add new account type mapping */}
                  <Box sx={{ mb: 3 }}>
                    <Typography
                      variant="subtitle2"
                      sx={{ color: YNAB_COLORS.text, mb: 1 }}
                    >
                      Add New Account Type Mapping
                    </Typography>
                    <Box
                      sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}
                    >
                      <FormControl size="small" sx={{ minWidth: 200 }}>
                        <InputLabel>YNAB Account Type</InputLabel>
                        <Select
                          value={newAccountTypeMapping.ynabType}
                          onChange={(e) =>
                            setNewAccountTypeMapping((prev) => ({
                              ...prev,
                              ynabType: e.target.value,
                            }))
                          }
                          label="YNAB Account Type"
                        >
                          {getAvailableYNABAccountTypes().map((type) => (
                            <MenuItem key={type} value={type}>
                              {getYnabAccountTypeDisplayName(type)}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      <FormControl size="small" sx={{ minWidth: 200 }}>
                        <InputLabel>Core Record Type</InputLabel>
                        <Select
                          value={newAccountTypeMapping.coreRecordType}
                          onChange={(e) =>
                            setNewAccountTypeMapping((prev) => ({
                              ...prev,
                              coreRecordType: e.target.value,
                              defaultSubtypeId: "", // Reset sub-type when core record type changes
                            }))
                          }
                          label="Core Record Type"
                        >
                          {CORE_RECORD_TYPES.map((type) => (
                            <MenuItem key={type.value} value={type.value}>
                              {type.label}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      <Autocomplete
                        freeSolo
                        selectOnFocus
                        clearOnBlur
                        handleHomeEndKeys
                        size="small"
                        options={getSubTypesForCoreRecordType(
                          newAccountTypeMapping.coreRecordType
                        )}
                        getOptionLabel={(option) => {
                          if (typeof option === "string") return option;
                          return option.name || "";
                        }}
                        value={
                          getSubTypesForCoreRecordType(
                            newAccountTypeMapping.coreRecordType
                          ).find(
                            (subType) =>
                              subType.id ===
                              newAccountTypeMapping.defaultSubtypeId
                          ) || null
                        }
                        onChange={async (event, newValue) => {
                          if (typeof newValue === "string") {
                            // Check if this is an "Add 'X'" option
                            if (
                              newValue.startsWith('Add "') &&
                              newValue.endsWith('"')
                            ) {
                              // Extract the actual value from "Add 'X'"
                              const actualValue = newValue.slice(5, -1); // Remove 'Add "' and '"'
                              try {
                                const createdSubType = await createSubType(
                                  actualValue,
                                  newAccountTypeMapping.coreRecordType
                                );
                                setNewAccountTypeMapping((prev) => ({
                                  ...prev,
                                  defaultSubtypeId: createdSubType.id,
                                }));
                              } catch (error) {
                                console.error(
                                  "Failed to create sub-type:",
                                  error
                                );
                                // Fallback: just set the name as the value
                                setNewAccountTypeMapping((prev) => ({
                                  ...prev,
                                  defaultSubtypeId: actualValue,
                                }));
                              }
                            } else {
                              // User typed a new value, create it
                              try {
                                const createdSubType = await createSubType(
                                  newValue,
                                  newAccountTypeMapping.coreRecordType
                                );
                                setNewAccountTypeMapping((prev) => ({
                                  ...prev,
                                  defaultSubtypeId: createdSubType.id,
                                }));
                              } catch (error) {
                                console.error(
                                  "Failed to create sub-type:",
                                  error
                                );
                                // Fallback: just set the name as the value
                                setNewAccountTypeMapping((prev) => ({
                                  ...prev,
                                  defaultSubtypeId: newValue,
                                }));
                              }
                            }
                          } else if (newValue) {
                            // User selected an existing option
                            setNewAccountTypeMapping((prev) => ({
                              ...prev,
                              defaultSubtypeId: newValue.id,
                            }));
                          } else {
                            // User cleared the field
                            setNewAccountTypeMapping((prev) => ({
                              ...prev,
                              defaultSubtypeId: "",
                            }));
                          }
                        }}
                        filterOptions={(options, params) => {
                          const filtered = options.filter((option) =>
                            option.name
                              .toLowerCase()
                              .includes(params.inputValue.toLowerCase())
                          );

                          const { inputValue } = params;
                          const isExisting = options.some(
                            (option) => option.name === inputValue
                          );
                          if (inputValue !== "" && !isExisting) {
                            filtered.push(`Add "${inputValue}"`);
                          }

                          return filtered;
                        }}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="Default Sub-Type"
                            placeholder="Select or type a sub-type..."
                            disabled={!newAccountTypeMapping.coreRecordType}
                            sx={{ minWidth: 200 }}
                          />
                        )}
                        renderOption={(props, option) => (
                          <li {...props}>
                            <Typography>
                              {typeof option === "string"
                                ? option
                                : option.name}
                            </Typography>
                          </li>
                        )}
                        sx={{
                          minWidth: 200,
                          "& .MuiAutocomplete-input": {
                            fontSize: "0.875rem",
                          },
                        }}
                      />
                      <IconButton
                        onClick={addAccountTypeMapping}
                        disabled={
                          !newAccountTypeMapping.ynabType ||
                          !newAccountTypeMapping.coreRecordType
                        }
                        sx={{
                          backgroundColor: YNAB_COLORS.primary,
                          color: "white",
                          "&:hover": {
                            backgroundColor: YNAB_COLORS.primary,
                            opacity: 0.9,
                          },
                          "&.Mui-disabled": {
                            backgroundColor: "rgba(0, 0, 0, 0.12)",
                            color: "rgba(0, 0, 0, 0.26)",
                          },
                        }}
                      >
                        <AddIcon />
                      </IconButton>
                    </Box>
                  </Box>

                  {/* Account type mapping management buttons */}
                  <Box sx={{ mb: 2, display: "flex", gap: 1 }}>
                    <Button
                      variant="outlined"
                      color="error"
                      onClick={eraseAllAccountTypeMappings}
                      disabled={accountTypeMappings.length === 0}
                      size="small"
                      sx={{
                        color: "#d32f2f",
                        borderColor: "#d32f2f",
                        "&:hover": {
                          borderColor: "#c62828",
                          backgroundColor: "rgba(211, 47, 47, 0.04)",
                        },
                      }}
                    >
                      Erase All
                    </Button>
                    <Button
                      variant="outlined"
                      color="warning"
                      onClick={resetAccountTypeMappingsToDefaults}
                      size="small"
                      sx={{
                        color: "#ed6c02",
                        borderColor: "#ed6c02",
                        "&:hover": {
                          borderColor: "#e65100",
                          backgroundColor: "rgba(237, 108, 2, 0.04)",
                        },
                      }}
                    >
                      Reset to Defaults
                    </Button>
                  </Box>

                  {/* Existing account type mappings */}
                  {accountTypeMappings.length === 0 ? (
                    <Paper
                      sx={{
                        p: 3,
                        backgroundColor: YNAB_COLORS.surface,
                        border: `1px solid ${YNAB_COLORS.border}`,
                        textAlign: "center",
                      }}
                    >
                      <Typography
                        variant="body1"
                        sx={{ color: YNAB_COLORS.text, opacity: 0.7, mb: 1 }}
                      >
                        No account type mappings configured
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{ color: YNAB_COLORS.text, opacity: 0.5 }}
                      >
                        Add mappings above to enable intelligent linking
                        suggestions
                      </Typography>
                    </Paper>
                  ) : (
                    accountTypeMappings.map((mapping) => (
                      <Paper
                        key={mapping.ynabType}
                        sx={{
                          p: 2,
                          mb: 1,
                          backgroundColor: YNAB_COLORS.surface,
                          border: `1px solid ${YNAB_COLORS.border}`,
                        }}
                      >
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                            gap: 2,
                          }}
                        >
                          <Box sx={{ flex: 1 }}>
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                                mb: 2,
                              }}
                            >
                              <Typography
                                variant="subtitle1"
                                sx={{
                                  color: YNAB_COLORS.text,
                                  fontWeight: 600,
                                }}
                              >
                                {getYnabAccountTypeDisplayName(
                                  mapping.ynabType
                                )}
                              </Typography>
                              <Typography
                                variant="body2"
                                sx={{
                                  color: YNAB_COLORS.text,
                                  opacity: 0.7,
                                }}
                              >
                                →
                              </Typography>
                              <Typography
                                variant="subtitle1"
                                sx={{
                                  color: YNAB_COLORS.primary,
                                  fontWeight: 600,
                                }}
                              >
                                {
                                  CORE_RECORD_TYPES.find(
                                    (t) => t.value === mapping.coreRecordType
                                  )?.label
                                }
                              </Typography>
                            </Box>
                            <FormControl
                              size="small"
                              sx={{ minWidth: 200, mb: 1 }}
                            >
                              <InputLabel>Core Record Type</InputLabel>
                              <Select
                                value={mapping.coreRecordType}
                                onChange={(e) =>
                                  updateAccountTypeMapping(
                                    mapping.ynabType,
                                    e.target.value
                                  )
                                }
                                label="Core Record Type"
                                disabled={!mapping.enabled}
                              >
                                {CORE_RECORD_TYPES.map((type) => (
                                  <MenuItem key={type.value} value={type.value}>
                                    {type.label}
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                            <Autocomplete
                              freeSolo
                              selectOnFocus
                              clearOnBlur
                              handleHomeEndKeys
                              size="small"
                              options={getSubTypesForCoreRecordType(
                                mapping.coreRecordType
                              )}
                              getOptionLabel={(option) => {
                                if (typeof option === "string") return option;
                                return option.name || "";
                              }}
                              value={
                                getSubTypesForCoreRecordType(
                                  mapping.coreRecordType
                                ).find(
                                  (subType) =>
                                    subType.id === mapping.defaultSubtypeId
                                ) || null
                              }
                              onChange={async (event, newValue) => {
                                if (typeof newValue === "string") {
                                  // Check if this is an "Add 'X'" option
                                  if (
                                    newValue.startsWith('Add "') &&
                                    newValue.endsWith('"')
                                  ) {
                                    // Extract the actual value from "Add 'X'"
                                    const actualValue = newValue.slice(5, -1); // Remove 'Add "' and '"'
                                    try {
                                      const createdSubType =
                                        await createSubType(
                                          actualValue,
                                          mapping.coreRecordType
                                        );
                                      updateAccountTypeMappingSubtype(
                                        mapping.ynabType,
                                        createdSubType.id
                                      );
                                    } catch (error) {
                                      console.error(
                                        "Failed to create sub-type:",
                                        error
                                      );
                                      // Fallback: just set the name as the value
                                      updateAccountTypeMappingSubtype(
                                        mapping.ynabType,
                                        actualValue
                                      );
                                    }
                                  } else {
                                    // User typed a new value, create it
                                    try {
                                      const createdSubType =
                                        await createSubType(
                                          newValue,
                                          mapping.coreRecordType
                                        );
                                      updateAccountTypeMappingSubtype(
                                        mapping.ynabType,
                                        createdSubType.id
                                      );
                                    } catch (error) {
                                      console.error(
                                        "Failed to create sub-type:",
                                        error
                                      );
                                      // Fallback: just set the name as the value
                                      updateAccountTypeMappingSubtype(
                                        mapping.ynabType,
                                        newValue
                                      );
                                    }
                                  }
                                } else if (newValue) {
                                  // User selected an existing option
                                  updateAccountTypeMappingSubtype(
                                    mapping.ynabType,
                                    newValue.id
                                  );
                                } else {
                                  // User cleared the field
                                  updateAccountTypeMappingSubtype(
                                    mapping.ynabType,
                                    ""
                                  );
                                }
                              }}
                              filterOptions={(options, params) => {
                                const filtered = options.filter((option) =>
                                  option.name
                                    .toLowerCase()
                                    .includes(params.inputValue.toLowerCase())
                                );

                                const { inputValue } = params;
                                const isExisting = options.some(
                                  (option) => option.name === inputValue
                                );
                                if (inputValue !== "" && !isExisting) {
                                  filtered.push(`Add "${inputValue}"`);
                                }

                                return filtered;
                              }}
                              renderInput={(params) => (
                                <TextField
                                  {...params}
                                  label="Default Sub-Type"
                                  placeholder="Select or type a sub-type..."
                                  disabled={!mapping.enabled}
                                  sx={{ minWidth: 200 }}
                                />
                              )}
                              renderOption={(props, option) => (
                                <li {...props}>
                                  <Typography>
                                    {typeof option === "string"
                                      ? option
                                      : option.name}
                                  </Typography>
                                </li>
                              )}
                              sx={{
                                minWidth: 200,
                                "& .MuiAutocomplete-input": {
                                  fontSize: "0.875rem",
                                },
                              }}
                            />
                            {mapping.defaultSubtypeId && (
                              <Typography
                                variant="caption"
                                sx={{
                                  color: YNAB_COLORS.text,
                                  opacity: 0.7,
                                  mt: 0.5,
                                  display: "block",
                                }}
                              >
                                Default:{" "}
                                {getSubTypeNameById(
                                  mapping.defaultSubtypeId,
                                  mapping.coreRecordType
                                )}
                              </Typography>
                            )}
                          </Box>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                            }}
                          >
                            <FormControlLabel
                              control={
                                <Switch
                                  checked={mapping.enabled}
                                  onChange={() =>
                                    toggleAccountTypeMapping(mapping.ynabType)
                                  }
                                  size="small"
                                  sx={{
                                    "& .MuiSwitch-switchBase.Mui-checked": {
                                      color: YNAB_COLORS.primary,
                                    },
                                    "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track":
                                      {
                                        backgroundColor: YNAB_COLORS.primary,
                                      },
                                  }}
                                />
                              }
                              label={
                                <Typography
                                  variant="caption"
                                  sx={{
                                    color: YNAB_COLORS.text,
                                    opacity: 0.8,
                                  }}
                                >
                                  {mapping.enabled ? "Enabled" : "Disabled"}
                                </Typography>
                              }
                              sx={{ margin: 0 }}
                            />
                            <IconButton
                              size="small"
                              onClick={() =>
                                removeAccountTypeMapping(mapping.ynabType)
                              }
                              sx={{
                                color: YNAB_COLORS.text,
                                opacity: 0.7,
                                "&:hover": {
                                  color: "error.main",
                                  opacity: 1,
                                },
                              }}
                            >
                              <ClearIcon />
                            </IconButton>
                          </Box>
                        </Box>
                      </Paper>
                    ))
                  )}
                </Box>
              )}
            </Paper>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2, backgroundColor: YNAB_COLORS.background }}>
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

      {/* Error/Success Messages */}
      {error && (
        <Alert severity="error" sx={{ m: 2 }}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ m: 2 }}>
          {success}
        </Alert>
      )}
    </Dialog>
  );
};

export default YNABConfigModal;
