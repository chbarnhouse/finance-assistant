import React from "react";
import {
  Button,
  Tooltip,
  Box,
  Typography,
  CircularProgress,
} from "@mui/material";
import SyncIcon from "@mui/icons-material/Sync";
import { useYnabSyncContext } from "../contexts/YnabSyncContext";

interface SyncButtonProps {
  variant?: "text" | "outlined" | "contained";
  size?: "small" | "medium" | "large";
  showTimestamp?: boolean;
  buttonText?: string;
  disabled?: boolean;
  sx?: any;
}

export const SyncButton: React.FC<SyncButtonProps> = ({
  variant = "outlined",
  size = "medium",
  showTimestamp = true,
  buttonText = "Sync YNAB",
  disabled = false,
  sx,
}) => {
  const { syncNow, syncStatus, formatLastSynced, isPending } =
    useYnabSyncContext();

  const lastSyncedText = formatLastSynced();

  return (
    <Box
      sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}
    >
      <Button
        variant={variant}
        size={size}
        onClick={syncNow}
        disabled={disabled || isPending}
        startIcon={
          isPending ? (
            <CircularProgress size={size === "small" ? 16 : 20} />
          ) : (
            <SyncIcon />
          )
        }
        sx={sx}
      >
        {isPending ? "Syncing..." : buttonText}
      </Button>

      {showTimestamp && lastSyncedText && (
        <Tooltip
          title={
            syncStatus.lastSynced
              ? new Date(syncStatus.lastSynced).toLocaleString()
              : ""
          }
        >
          <Typography
            variant="caption"
            color="textSecondary"
            sx={{ mt: 0.5, textAlign: "center" }}
          >
            Last synced: {lastSyncedText}
          </Typography>
        </Tooltip>
      )}

      {showTimestamp && !lastSyncedText && (
        <Typography
          variant="caption"
          color="warning.main"
          sx={{ mt: 0.5, textAlign: "center" }}
        >
          Never synced
        </Typography>
      )}
    </Box>
  );
};
