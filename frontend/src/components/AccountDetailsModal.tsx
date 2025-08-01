import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Chip,
  IconButton,
  Tooltip,
} from "@mui/material";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useState, useEffect } from "react";
import { ACCOUNTS_URL, LINKS_URL } from "../constants";
import EditIcon from "@mui/icons-material/Edit";
import LinkIcon from "@mui/icons-material/Link";

interface AccountDetailsModalProps {
  open: boolean;
  onClose: () => void;
  account?: any;
  onEdit: () => void;
}

export default function AccountDetailsModal({
  open,
  onClose,
  account,
  onEdit,
}: AccountDetailsModalProps) {
  const queryClient = useQueryClient();
  // Auto-refresh account data when modal is open
  const { data: refreshedAccount } = useQuery({
    queryKey: ["account", account?.id],
    queryFn: () =>
      axios.get(`${ACCOUNTS_URL}${account.id}/`).then((res) => res.data),
    enabled: open && !!account?.id,
    refetchInterval: account?.link_data ? 10000 : false, // Refresh every 10 seconds if linked
    refetchOnWindowFocus: true, // Refresh when window gains focus
  });

  const currentAccount = refreshedAccount || account;

  // Auto-sync when modal opens for linked accounts
  useEffect(() => {
    if (open && currentAccount?.link_data?.id) {
      // Trigger sync to get latest YNAB data
      const syncData = async () => {
        try {
          await axios.post(`${LINKS_URL}${currentAccount.link_data.id}/sync/`);
          queryClient.invalidateQueries({ queryKey: ["account", account?.id] });
        } catch (error) {
          console.error("Auto-sync error:", error);
        }
      };
      syncData();
    }
  }, [open, currentAccount?.link_data?.id]);

  // Don't render anything if no account data is available
  if (!currentAccount || !open) {
    return null;
  }

  const formatCurrency = (value: number | null) => {
    if (value != null) {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(value);
    }
    return "---";
  };

  const formatDate = (dateString: string | null) => {
    if (dateString) {
      return new Date(dateString).toLocaleString();
    }
    return "---";
  };

  const getAllocationLabel = (allocation: string) => {
    const labels = {
      LI: "Liquid",
      FR: "Frozen",
      DF: "Deep Freeze",
    };
    return labels[allocation as keyof typeof labels] || allocation;
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Typography variant="h6">Account Details</Typography>
          {currentAccount.link_data && (
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
            {/* Account Name */}
            <Box>
              <Typography variant="caption" color="textSecondary">
                Account Name
              </Typography>
              <Typography variant="body1">{currentAccount.name}</Typography>
            </Box>

            {/* Bank */}
            <Box>
              <Typography variant="caption" color="textSecondary">
                Bank
              </Typography>
              <Typography variant="body1">
                {currentAccount.bank_name || "---"}
              </Typography>
            </Box>

            {/* Account Type */}
            <Box>
              <Typography variant="caption" color="textSecondary">
                Account Type
              </Typography>
              <Typography variant="body1">
                {currentAccount.account_type_name}
              </Typography>
            </Box>

            {/* Last 4 */}
            <Box>
              <Typography variant="caption" color="textSecondary">
                Last 4
              </Typography>
              <Typography variant="body1">
                {currentAccount.last_4 || "---"}
              </Typography>
            </Box>

            {/* Allocation */}
            <Box>
              <Typography variant="caption" color="textSecondary">
                Allocation
              </Typography>
              <Typography variant="body1">
                {getAllocationLabel(currentAccount.allocation)}
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
                  {currentAccount.link_data && (
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
                {formatCurrency(currentAccount.balance)}
              </Typography>
            </Box>

            {/* Cleared Balance */}
            <Box>
              <Typography variant="caption" color="textSecondary">
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  Cleared Balance
                  {currentAccount.link_data && (
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
                {formatCurrency(currentAccount.cleared_balance)}
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
                  {currentAccount.on_budget ? "Yes" : "No"}
                </Typography>
              </Box>

              {/* Closed */}
              <Box>
                <Typography variant="caption" color="textSecondary">
                  Closed
                </Typography>
                <Typography variant="body1">
                  {currentAccount.closed ? "Yes" : "No"}
                </Typography>
              </Box>
            </Box>

            {/* Last Reconciled */}
            <Box>
              <Typography variant="caption" color="textSecondary">
                Last Reconciled
              </Typography>
              <Typography variant="body1">
                {formatDate(currentAccount.last_reconciled_at)}
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Notes - Full Width */}
        {currentAccount.notes && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="caption" color="textSecondary">
              Notes
            </Typography>
            <Typography variant="body1">{currentAccount.notes}</Typography>
          </Box>
        )}

        {/* YNAB Link Information */}
        {currentAccount.link_data && (
          <Box sx={{ mt: 3, p: 2, bgcolor: "grey.50", borderRadius: 1 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              YNAB Integration
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Chip
                icon={<LinkIcon />}
                label={`Linked to ${currentAccount.link_data.plugin_record.name}`}
                color="primary"
                size="small"
              />
            </Box>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        <Button onClick={onEdit} variant="contained" startIcon={<EditIcon />}>
          Edit
        </Button>
      </DialogActions>
    </Dialog>
  );
}
