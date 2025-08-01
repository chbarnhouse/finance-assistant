import React from "react";
import { Box, Typography, IconButton, Button, Tooltip } from "@mui/material";
import SettingsIcon from "@mui/icons-material/Settings";
import { useTheme } from "@mui/material/styles";
import {
  getPageStyles,
  getYNABPageStyles,
  getRecordTypeStyles,
} from "../styles/theme";

interface PageHeaderProps {
  title?: string; // Made optional since we'll use breadcrumbs instead
  variant?: "core" | "plugin";
  recordType?: string; // New prop for record type color coding
  onSettingsClick?: () => void;
  onAddClick?: () => void;
  onSyncClick?: () => void;
  syncing?: boolean;
  showSettings?: boolean;
  showAdd?: boolean;
  showSync?: boolean;
  settingsTooltip?: string;
  addButtonText?: string;
  syncButtonText?: string;
  syncButton?: React.ReactNode; // Custom sync button component
}

export default function PageHeader({
  title,
  variant = "core",
  recordType,
  onSettingsClick,
  onAddClick,
  onSyncClick,
  syncing = false,
  showSettings = true,
  showAdd = false,
  showSync = false,
  settingsTooltip = "Configure columns",
  addButtonText = "Add",
  syncButtonText = "Sync",
  syncButton,
}: PageHeaderProps) {
  const theme = useTheme();
  const baseStyles =
    variant === "plugin" ? getYNABPageStyles(theme) : getPageStyles(theme);
  const recordTypeStyles = recordType
    ? getRecordTypeStyles(recordType, theme)
    : null;

  return (
    <Box
      sx={{
        ...baseStyles.pageHeader,
        // Always use consistent positioning since we're hiding Toolpad's titles
        marginTop: -1, // Negative margin to pull closer to breadcrumbs
        marginBottom: baseStyles.pageHeader.mb, // Use the theme's margin bottom
      }}
    >
      {/* Only show title if explicitly provided (for backward compatibility) */}
      {title && (
        <Typography
          variant="h4"
          className="custom-title"
          sx={{
            ...(recordTypeStyles?.pageTitle || baseStyles.pageTitle),
            marginTop: 0, // Ensure consistent top alignment
            marginBottom: 0, // Remove bottom margin for tighter alignment
            display: "flex",
            alignItems: "center", // Center the title vertically
          }}
        >
          {title}
        </Typography>
      )}
      <Box
        sx={{
          ...baseStyles.actionButtons,
          display: "flex",
          alignItems: "center", // Ensure buttons are centered vertically
        }}
      >
        {syncButton && syncButton}
        {showSync && onSyncClick && !syncButton && (
          <Button
            variant="outlined"
            onClick={onSyncClick}
            disabled={syncing}
            sx={recordTypeStyles?.actionButton || baseStyles.syncButton}
          >
            {syncing ? "Syncing..." : syncButtonText}
          </Button>
        )}
        {showSettings && onSettingsClick && (
          <Tooltip title={settingsTooltip}>
            <IconButton
              onClick={onSettingsClick}
              sx={recordTypeStyles?.actionButton || baseStyles.settingsButton}
            >
              <SettingsIcon />
            </IconButton>
          </Tooltip>
        )}
        {showAdd && onAddClick && (
          <Button
            variant="contained"
            onClick={onAddClick}
            sx={
              recordTypeStyles?.actionButton ||
              (baseStyles as any).addButton ||
              baseStyles.syncButton
            }
          >
            {addButtonText}
          </Button>
        )}
      </Box>
    </Box>
  );
}
