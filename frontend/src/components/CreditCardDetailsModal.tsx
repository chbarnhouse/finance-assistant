import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Chip,
  Tooltip,
} from "@mui/material";
import LinkIcon from "@mui/icons-material/Link";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";

interface CreditCardDetailsModalProps {
  open: boolean;
  onClose: () => void;
  creditCard: any;
  onEdit: () => void;
  onDelete?: () => void;
}

const formatCurrency = (value: number | string | null): string => {
  if (value === null || value === undefined || value === "") return "$0.00";
  const numValue = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(numValue)) return "$0.00";

  const absValue = Math.abs(numValue);
  const formatted = absValue.toFixed(2);
  const isNegative = numValue < 0;

  return isNegative ? `-$${formatted}` : `$${formatted}`;
};

const getAllocationLabel = (allocation: string): string => {
  const labels: { [key: string]: string } = {
    LI: "Liquid",
    FR: "Frozen",
    DF: "Deep Freeze",
  };
  return labels[allocation] || allocation;
};

export default function CreditCardDetailsModal({
  open,
  onClose,
  creditCard,
  onEdit,
  onDelete,
}: CreditCardDetailsModalProps) {
  if (!creditCard) {
    return null;
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Typography variant="h6">Credit Card Details</Typography>
          {creditCard.link_data && (
            <Tooltip title="Linked to YNAB" arrow>
              <LinkIcon color="primary" />
            </Tooltip>
          )}
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 3 }}>
          {/* Left Column - Basic Information */}
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {/* Name */}
            <Box>
              <Typography variant="caption" color="textSecondary">
                Name
              </Typography>
              <Typography variant="body1">{creditCard.name}</Typography>
            </Box>

            {/* Credit Card Type */}
            <Box>
              <Typography variant="caption" color="textSecondary">
                Credit Card Type
              </Typography>
              <Typography variant="body1">
                {creditCard.credit_card_type_name || "Not specified"}
              </Typography>
            </Box>

            {/* Bank */}
            <Box>
              <Typography variant="caption" color="textSecondary">
                Bank
              </Typography>
              <Typography variant="body1">
                {creditCard.bank_name || "Not specified"}
              </Typography>
            </Box>

            {/* Last 4 Digits */}
            {creditCard.last_4 && (
              <Box>
                <Typography variant="caption" color="textSecondary">
                  Last 4 Digits
                </Typography>
                <Typography variant="body1">
                  •••• {creditCard.last_4}
                </Typography>
              </Box>
            )}

            {/* Allocation */}
            <Box>
              <Typography variant="caption" color="textSecondary">
                Allocation
              </Typography>
              <Typography variant="body1">
                {getAllocationLabel(creditCard.allocation)}
              </Typography>
            </Box>
          </Box>

          {/* Right Column - Financial Data */}
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {/* Balance */}
            <Box>
              <Typography variant="caption" color="textSecondary">
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  Balance
                  {creditCard.link_data && (
                    <Tooltip
                      title="YNAB-linked fields are read-only and automatically synced"
                      arrow
                    >
                      <LinkIcon
                        fontSize="inherit"
                        color="inherit"
                        sx={{ cursor: "pointer" }}
                      />
                    </Tooltip>
                  )}
                </Box>
              </Typography>
              <Typography variant="body1">
                {formatCurrency(creditCard.balance)}
              </Typography>
            </Box>

            {/* Cleared Balance */}
            <Box>
              <Typography variant="caption" color="textSecondary">
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  Cleared Balance
                  {creditCard.link_data && (
                    <Tooltip
                      title="YNAB-linked fields are read-only and automatically synced"
                      arrow
                    >
                      <LinkIcon
                        fontSize="inherit"
                        color="inherit"
                        sx={{ cursor: "pointer" }}
                      />
                    </Tooltip>
                  )}
                </Box>
              </Typography>
              <Typography variant="body1">
                {formatCurrency(creditCard.cleared_balance)}
              </Typography>
            </Box>

            {/* Status Fields - Side by side on larger screens */}
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 2,
              }}
            >
              {/* On Budget */}
              <Box>
                <Typography variant="caption" color="textSecondary">
                  On Budget
                </Typography>
                <Typography variant="body1">
                  {creditCard.on_budget ? "Yes" : "No"}
                </Typography>
              </Box>

              {/* Closed */}
              <Box>
                <Typography variant="caption" color="textSecondary">
                  Closed
                </Typography>
                <Typography variant="body1">
                  {creditCard.closed ? "Yes" : "No"}
                </Typography>
              </Box>
            </Box>

            {/* Notes */}
            <Box>
              <Typography variant="caption" color="textSecondary">
                Notes
              </Typography>
              <Typography variant="body1">
                {creditCard.notes || "No notes"}
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* YNAB Link Information */}
        {creditCard.link_data && (
          <Box sx={{ mt: 3, p: 2, bgcolor: "grey.50", borderRadius: 1 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              YNAB Integration
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Chip
                icon={<LinkIcon />}
                label={`Linked to ${
                  creditCard.link_data.plugin_object?.name || "YNAB Account"
                }`}
                color="primary"
                size="small"
              />
            </Box>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        {onDelete && (
          <Button onClick={onDelete} color="error" startIcon={<DeleteIcon />}>
            Delete
          </Button>
        )}
        <Button onClick={onClose}>Close</Button>
        <Button onClick={onEdit} variant="contained" startIcon={<EditIcon />}>
          Edit
        </Button>
      </DialogActions>
    </Dialog>
  );
}
