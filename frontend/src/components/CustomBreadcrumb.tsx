import React from "react";
import { Breadcrumbs, Link, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";

interface CustomBreadcrumbProps {
  path: string;
  onNavigate: (path: string) => void;
}

export default function CustomBreadcrumb({
  path,
  onNavigate,
}: CustomBreadcrumbProps) {
  const theme = useTheme();

  // Parse the path to create breadcrumb items
  const pathSegments = path.split("/").filter(Boolean);

  const breadcrumbItems = pathSegments
    .map((segment, index) => {
      const isLast = index === pathSegments.length - 1;
      const fullPath = "/" + pathSegments.slice(0, index + 1).join("/");

      // Map segment names to display names
      const getDisplayName = (seg: string) => {
        const displayNames: Record<string, string> = {
          plugins: "Plugins",
          ynab: "YNAB",
          accounts: "Accounts",
          categories: "Categories",
          payees: "Payees",
          months: "Months",
          transactions: "Transactions",
          budgets: "Budgets",
          user: "User",
          "api-endpoints": "API Endpoints",
          dashboard: "Dashboard",
          "credit-cards": "Credit Cards",
          assets: "Assets",
          liabilities: "Liabilities",
          banks: "Banks",
          queries: "Queries",
          settings: "Settings",
        };
        return displayNames[seg] || seg;
      };

      if (isLast) {
        // Don't render the last item (current page) to avoid duplication with page header
        return null;
      }

      return (
        <Link
          key={index}
          color="inherit"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            onNavigate(fullPath);
          }}
          sx={{
            textDecoration: "none",
            color: theme.palette.text.secondary,
            "&:hover": {
              color: theme.palette.primary.main,
              textDecoration: "underline",
            },
          }}
        >
          {getDisplayName(segment)}
        </Link>
      );
    })
    .filter(Boolean);

  if (breadcrumbItems.length === 0) {
    return null;
  }

  return (
    <Breadcrumbs
      className="custom-breadcrumb"
      separator="/"
      aria-label="breadcrumb"
      sx={{
        mb: 0, // Removed bottom margin completely for minimal spacing
        pt: 1.5, // Restored original top padding for better visual separation
        pl: 2, // Increased left padding to breadcrumbs for better spacing
        "& .MuiBreadcrumbs-separator": {
          color: theme.palette.text.secondary,
          marginLeft: "8px", // Add left margin to separators
          marginRight: "8px", // Add right margin to separators
        },
        "& .MuiBreadcrumbs-ol": {
          alignItems: "center", // Ensure proper vertical alignment
        },
      }}
    >
      {breadcrumbItems}
      <Typography
        variant="body2"
        sx={{
          color: "transparent",
          userSelect: "none",
        }}
      >
        &nbsp;
      </Typography>
    </Breadcrumbs>
  );
}
