import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Chip,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
  Tooltip,
} from "@mui/material";
import {
  ExpandMore as ExpandMoreIcon,
  Link as LinkIcon,
  LinkOff as LinkOffIcon,
  ContentCopy as CopyIcon,
  Check as CheckIcon,
} from "@mui/icons-material";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { API_BASE_URL } from "../constants";

interface YNABAccountDetailsModalProps {
  open: boolean;
  onClose: () => void;
  account: any;
}

export default function YNABAccountDetailsModal({
  open,
  onClose,
  account,
}: YNABAccountDetailsModalProps) {
  const [copied, setCopied] = useState(false);

  // Fetch linked core account data if this YNAB account is linked
  const { data: linkedAccount } = useQuery({
    queryKey: ["linked-account", account?.id],
    queryFn: async () => {
      if (!account?.link_data?.id) return null;
      const response = await axios.get(
        `${API_BASE_URL}/links/${account.link_data.id}/`
      );
      return response.data;
    },
    enabled: open && !!account?.link_data?.id,
  });

  const formatCurrency = (value: number | null) => {
    if (value != null) {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(value / 1000); // YNAB stores balance in milliunits
    }
    return "---";
  };

  const formatDate = (dateString: string | null) => {
    if (dateString) {
      return new Date(dateString).toLocaleString();
    }
    return "---";
  };

  const formatBoolean = (value: boolean | null) => {
    if (value === null || value === undefined) return "---";
    return value ? "Yes" : "No";
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
    }
  };

  const getAccountTypeIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case "checking":
        return "🏦";
      case "savings":
        return "💰";
      case "credit card":
        return "💳";
      case "cash":
        return "💵";
      case "investment":
        return "📈";
      case "mortgage":
        return "🏠";
      case "other asset":
        return "📊";
      case "other liability":
        return "📋";
      default:
        return "📄";
    }
  };

  if (!account) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Typography variant="h6">{account.name}</Typography>
          <Box sx={{ display: "flex", gap: 1 }}>
            {account.link_data && (
              <Chip
                icon={<LinkIcon />}
                label="Linked"
                color="primary"
                size="small"
              />
            )}
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ pt: 1 }}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {/* Account Information Section */}
            <Box>
              <Typography
                variant="subtitle2"
                sx={{ mb: 2, color: "text.secondary" }}
              >
                Account Information
              </Typography>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                  gap: 3,
                }}
              >
                {/* Left Column - Basic Info */}
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {/* Account Name */}
                  <Box>
                    <Typography variant="caption" color="textSecondary">
                      Account Name
                    </Typography>
                    <Typography variant="body1">{account.name}</Typography>
                  </Box>

                  {/* Account Type */}
                  <Box>
                    <Typography variant="caption" color="textSecondary">
                      Account Type
                    </Typography>
                    <Typography variant="body1">{account.type}</Typography>
                  </Box>

                  {/* Balance */}
                  <Box>
                    <Typography variant="caption" color="textSecondary">
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                      >
                        Balance
                        <Tooltip title="YNAB account balance" arrow>
                          <LinkIcon
                            fontSize="inherit"
                            color="inherit"
                            sx={{ cursor: "pointer" }}
                          />
                        </Tooltip>
                      </Box>
                    </Typography>
                    <Typography
                      variant="body1"
                      color={
                        account.balance < 0 ? "error.main" : "success.main"
                      }
                    >
                      {formatCurrency(account.balance)}
                    </Typography>
                  </Box>

                  {/* Cleared Balance */}
                  <Box>
                    <Typography variant="caption" color="textSecondary">
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                      >
                        Cleared Balance
                        <Tooltip title="YNAB cleared balance" arrow>
                          <LinkIcon
                            fontSize="inherit"
                            color="inherit"
                            sx={{ cursor: "pointer" }}
                          />
                        </Tooltip>
                      </Box>
                    </Typography>
                    <Typography
                      variant="body1"
                      color={
                        account.cleared_balance < 0
                          ? "error.main"
                          : "success.main"
                      }
                    >
                      {formatCurrency(account.cleared_balance)}
                    </Typography>
                  </Box>

                  {/* Uncleared Balance */}
                  <Box>
                    <Typography variant="caption" color="textSecondary">
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                      >
                        Uncleared Balance
                        <Tooltip title="YNAB uncleared balance" arrow>
                          <LinkIcon
                            fontSize="inherit"
                            color="inherit"
                            sx={{ cursor: "pointer" }}
                          />
                        </Tooltip>
                      </Box>
                    </Typography>
                    <Typography
                      variant="body1"
                      color={
                        account.uncleared_balance < 0
                          ? "error.main"
                          : "success.main"
                      }
                    >
                      {formatCurrency(account.uncleared_balance)}
                    </Typography>
                  </Box>
                </Box>

                {/* Right Column - Additional Info */}
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {/* On Budget */}
                  <Box>
                    <Typography variant="caption" color="textSecondary">
                      On Budget
                    </Typography>
                    <Typography variant="body1">
                      {formatBoolean(account.on_budget)}
                    </Typography>
                  </Box>

                  {/* Closed */}
                  <Box>
                    <Typography variant="caption" color="textSecondary">
                      Closed
                    </Typography>
                    <Typography variant="body1">
                      {formatBoolean(account.closed)}
                    </Typography>
                  </Box>

                  {/* Last Reconciled */}
                  <Box>
                    <Typography variant="caption" color="textSecondary">
                      Last Reconciled
                    </Typography>
                    <Typography variant="body1">
                      {formatDate(account.last_reconciled_at)}
                    </Typography>
                  </Box>

                  {/* Note */}
                  <Box>
                    <Typography variant="caption" color="textSecondary">
                      Note
                    </Typography>
                    <Typography variant="body1">
                      {account.note || "---"}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Box>

            {/* Linking Information Section */}
            {account.link_data && (
              <Box>
                <Typography
                  variant="subtitle2"
                  sx={{ mb: 2, color: "text.secondary" }}
                >
                  Linking Information
                </Typography>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                    gap: 3,
                  }}
                >
                  <Box
                    sx={{ display: "flex", flexDirection: "column", gap: 2 }}
                  >
                    {/* Link ID */}
                    <Box>
                      <Typography variant="caption" color="textSecondary">
                        Link ID
                      </Typography>
                      <Typography
                        variant="body1"
                        sx={{ fontFamily: "monospace" }}
                      >
                        {account.link_data.id}
                      </Typography>
                    </Box>

                    {/* Link Created */}
                    <Box>
                      <Typography variant="caption" color="textSecondary">
                        Link Created
                      </Typography>
                      <Typography variant="body1">
                        {formatDate(account.link_data.created_at)}
                      </Typography>
                    </Box>
                  </Box>

                  <Box
                    sx={{ display: "flex", flexDirection: "column", gap: 2 }}
                  >
                    {/* Last Synced */}
                    <Box>
                      <Typography variant="caption" color="textSecondary">
                        Last Synced
                      </Typography>
                      <Typography variant="body1">
                        {formatDate(account.link_data.last_synced_at)}
                      </Typography>
                    </Box>

                    {/* Sync Status */}
                    <Box>
                      <Typography variant="caption" color="textSecondary">
                        Sync Status
                      </Typography>
                      <Typography variant="body1" color="success.main">
                        ✓ Linked to Core Record
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </Box>
            )}

            {/* Linked Core Account Section */}
            {linkedAccount && (
              <Box>
                <Typography
                  variant="subtitle2"
                  sx={{ mb: 2, color: "text.secondary" }}
                >
                  Linked Core Account
                </Typography>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                    gap: 3,
                  }}
                >
                  <Box
                    sx={{ display: "flex", flexDirection: "column", gap: 2 }}
                  >
                    {/* Core Account Name */}
                    <Box>
                      <Typography variant="caption" color="textSecondary">
                        Core Account Name
                      </Typography>
                      <Typography variant="body1">
                        {linkedAccount.core_record?.name}
                      </Typography>
                    </Box>

                    {/* Core Account Type */}
                    <Box>
                      <Typography variant="caption" color="textSecondary">
                        Core Account Type
                      </Typography>
                      <Typography variant="body1">
                        {linkedAccount.core_record?.account_type_name}
                      </Typography>
                    </Box>
                  </Box>

                  <Box
                    sx={{ display: "flex", flexDirection: "column", gap: 2 }}
                  >
                    {/* Core Account Balance */}
                    <Box>
                      <Typography variant="caption" color="textSecondary">
                        Core Account Balance
                      </Typography>
                      <Typography
                        variant="body1"
                        color={
                          linkedAccount.core_record?.balance < 0
                            ? "error.main"
                            : "success.main"
                        }
                      >
                        {formatCurrency(
                          linkedAccount.core_record?.balance * 1000
                        )}
                      </Typography>
                    </Box>

                    {/* Bank */}
                    <Box>
                      <Typography variant="caption" color="textSecondary">
                        Bank
                      </Typography>
                      <Typography variant="body1">
                        {linkedAccount.core_record?.bank_name}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </Box>
            )}

            {/* Raw API Payload Section */}
            <Box>
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Typography variant="subtitle2">Raw API Payload</Typography>
                    <Tooltip title="Copy JSON to clipboard">
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          copyToClipboard(JSON.stringify(account, null, 2));
                        }}
                      >
                        {copied ? (
                          <CheckIcon fontSize="small" color="success" />
                        ) : (
                          <CopyIcon fontSize="small" />
                        )}
                      </IconButton>
                    </Tooltip>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Box
                    sx={{
                      backgroundColor: "grey.100",
                      p: 2,
                      borderRadius: 1,
                      fontFamily: "monospace",
                      fontSize: "0.875rem",
                      whiteSpace: "pre-wrap",
                      maxHeight: "400px",
                      overflow: "auto",
                    }}
                  >
                    {JSON.stringify(account, null, 2)}
                  </Box>
                </AccordionDetails>
              </Accordion>
            </Box>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
