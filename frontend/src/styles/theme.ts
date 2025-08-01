import type { Theme } from "@mui/material/styles";

export const FINANCE_ASSISTANT_COLORS = {
  primary: "#1976d2", // Material-UI default primary
  secondary: "#dc004e", // Material-UI default secondary
  success: "#2e7d32",
  warning: "#ed6c02",
  error: "#d32f2f",
  info: "#0288d1",
  background: "#f8f9fa",
  surface: "#ffffff",
  text: "#2c3e50",
  border: "#e9ecef",
  divider: "#e0e0e0",
};

// Record type color coding
export const RECORD_TYPE_COLORS = {
  accounts: "#2196F3", // Blue - represents money/accounts
  creditCards: "#FF9800", // Orange - represents credit/debt
  assets: "#4CAF50", // Green - represents growth/positive value
  liabilities: "#F44336", // Red - represents debt/negative value
  banks: "#9C27B0", // Purple - represents institutions
  categories: "#00BCD4", // Cyan - represents organization
  payees: "#795548", // Brown - represents people/entities
  transactions: "#607D8B", // Blue-grey - represents activity
  queries: "#E91E63", // Pink - represents analysis/reports
  // YNAB plugin colors
  ynab: "#3B5EDA", // YNAB "Blurple"
  ynabAccounts: "#3B5EDA", // Same as YNAB primary
  ynabCategories: "#3B5EDA",
  ynabPayees: "#3B5EDA",
  ynabTransactions: "#3B5EDA",
  ynabMonths: "#3B5EDA",
  ynabBudgets: "#3B5EDA",
};

// Get record type specific styles
export const getRecordTypeStyles = (recordType: string, theme: Theme) => {
  const color =
    RECORD_TYPE_COLORS[recordType as keyof typeof RECORD_TYPE_COLORS] ||
    FINANCE_ASSISTANT_COLORS.primary;

  return {
    pageTitle: {
      color: theme.palette.mode === "dark" ? theme.palette.text.primary : color,
      fontWeight: 600,
      marginTop: 0, // Ensure consistent top alignment
      marginBottom: 0, // Remove bottom margin for tighter alignment
      lineHeight: 1.4, // Standard line height for h4 typography
    },
    actionButton: {
      backgroundColor: color,
      color: "white",
      "&:hover": {
        backgroundColor: color,
        opacity: 0.9,
      },
    },
    dataGridHeader: {
      backgroundColor:
        theme.palette.mode === "dark" ? theme.palette.background.paper : color,
      opacity: 0.1,
      borderBottom: `2px solid ${color}`,
    },
    chip: {
      backgroundColor: color,
      color: "white",
      "&:hover": {
        backgroundColor: color,
        opacity: 0.9,
      },
    },
  };
};

// Remove separate YNAB colors - use consistent colors across all pages
export const getPageStyles = (theme: Theme) => ({
  pageContainer: {
    p: 1, // Reduced padding for tighter layout
    width: "100%",
  },
  pageHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end", // Align items to bottom for better title/button alignment
    mb: 2, // Reduced margin bottom for tighter spacing
    gap: 2, // Add consistent gap between title and buttons
  },
  pageTitle: {
    color:
      theme.palette.mode === "dark"
        ? theme.palette.text.primary
        : FINANCE_ASSISTANT_COLORS.text,
    fontWeight: 600,
    marginTop: 0, // Ensure consistent top alignment
    marginBottom: 0, // Remove bottom margin for tighter alignment
    lineHeight: 1.4, // Standard line height for h4 typography
  },
  actionButtons: {
    display: "flex",
    gap: 1,
  },
  settingsButton: {
    backgroundColor: FINANCE_ASSISTANT_COLORS.primary,
    color: "white",
    "&:hover": {
      backgroundColor: FINANCE_ASSISTANT_COLORS.primary,
      opacity: 0.9,
    },
  },
  addButton: {
    backgroundColor: FINANCE_ASSISTANT_COLORS.primary,
    color: "white",
    "&:hover": {
      backgroundColor: FINANCE_ASSISTANT_COLORS.primary,
      opacity: 0.9,
    },
  },
  syncButton: {
    backgroundColor: FINANCE_ASSISTANT_COLORS.primary,
    color: "white",
    "&:hover": {
      backgroundColor: FINANCE_ASSISTANT_COLORS.primary,
      opacity: 0.9,
    },
  },
  dataGrid: {
    height: "calc(100vh - 200px)", // Fill available screen space
    width: "100%",
    "& .MuiDataGrid-cell": {
      borderBottom: `1px solid ${theme.palette.mode === "dark" ? theme.palette.divider : FINANCE_ASSISTANT_COLORS.border}`,
    },
    "& .MuiDataGrid-columnHeaders": {
      backgroundColor:
        theme.palette.mode === "dark"
          ? theme.palette.background.paper
          : FINANCE_ASSISTANT_COLORS.background,
      borderBottom: `2px solid ${theme.palette.mode === "dark" ? theme.palette.divider : FINANCE_ASSISTANT_COLORS.border}`,
    },
    "& .MuiDataGrid-row:hover": {
      backgroundColor: theme.palette.action.hover,
    },
  },
  chip: {
    variant: "outlined" as const,
    size: "small" as const,
  },
  linkedChip: {
    backgroundColor: FINANCE_ASSISTANT_COLORS.success,
    color: "white",
    "&:hover": {
      backgroundColor: FINANCE_ASSISTANT_COLORS.success,
      opacity: 0.9,
    },
  },
  unlinkedChip: {
    color: theme.palette.text.secondary,
    borderColor: theme.palette.text.secondary,
  },
});

// Update YNAB page styles to use the same colors as core pages
export const getYNABPageStyles = (theme: Theme) => ({
  pageContainer: {
    p: 1, // Reduced padding for tighter layout
    width: "100%",
  },
  pageHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end", // Align items to bottom for better title/button alignment
    mb: 1.5, // Keep consistent with YNAB spacing
    gap: 2, // Add consistent gap between title and buttons
  },
  pageTitle: {
    color:
      theme.palette.mode === "dark"
        ? theme.palette.text.primary
        : FINANCE_ASSISTANT_COLORS.text,
    fontWeight: 600,
    marginTop: 0, // Ensure consistent top alignment
    marginBottom: 0, // Remove bottom margin for tighter alignment
    lineHeight: 1.4, // Standard line height for h4 typography
  },
  actionButtons: {
    display: "flex",
    gap: 1,
  },
  settingsButton: {
    backgroundColor: FINANCE_ASSISTANT_COLORS.primary,
    color: "white",
    "&:hover": {
      backgroundColor: FINANCE_ASSISTANT_COLORS.primary,
      opacity: 0.9,
    },
  },
  syncButton: {
    backgroundColor: FINANCE_ASSISTANT_COLORS.primary,
    color: "white",
    "&:hover": {
      backgroundColor: FINANCE_ASSISTANT_COLORS.primary,
      opacity: 0.9,
    },
  },
  dataGrid: {
    height: "calc(100vh - 200px)", // Fill available screen space
    width: "100%",
    "& .MuiDataGrid-cell": {
      borderBottom: `1px solid ${theme.palette.mode === "dark" ? theme.palette.divider : FINANCE_ASSISTANT_COLORS.border}`,
    },
    "& .MuiDataGrid-columnHeaders": {
      backgroundColor:
        theme.palette.mode === "dark"
          ? theme.palette.background.paper
          : FINANCE_ASSISTANT_COLORS.background,
      borderBottom: `2px solid ${theme.palette.mode === "dark" ? theme.palette.divider : FINANCE_ASSISTANT_COLORS.border}`,
    },
    "& .MuiDataGrid-row:hover": {
      backgroundColor: theme.palette.action.hover,
    },
  },
  groupedView: {
    groupHeader: {
      mb: 2,
      color: FINANCE_ASSISTANT_COLORS.primary,
      borderBottom: `2px solid ${FINANCE_ASSISTANT_COLORS.primary}`,
      pb: 1,
      display: "flex",
      alignItems: "center",
      gap: 1,
    },
    groupChip: {
      backgroundColor: FINANCE_ASSISTANT_COLORS.primary,
      color: "white",
      fontSize: "0.75rem",
    },
  },
});
