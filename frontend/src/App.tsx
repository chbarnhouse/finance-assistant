import * as React from "react";
import { createTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import { AppProvider } from "@toolpad/core/AppProvider";
import type { Navigation, Router } from "@toolpad/core/AppProvider";
import { DashboardLayout } from "@toolpad/core/DashboardLayout";
import CustomBreadcrumb from "./components/CustomBreadcrumb";
import {
  Typography,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  CircularProgress,
  Box,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";

import DashboardIcon from "@mui/icons-material/Dashboard";
import AccountBalanceRounded from "@mui/icons-material/AccountBalanceRounded";
import Brightness4Icon from "@mui/icons-material/Brightness4";
import Brightness7Icon from "@mui/icons-material/Brightness7";
import SettingsBrightnessIcon from "@mui/icons-material/SettingsBrightness";
import ExtensionIcon from "@mui/icons-material/Extension";
import { YnabIcon } from "./YnabIcon";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import CategoryIcon from "@mui/icons-material/Category";
import ReceiptIcon from "@mui/icons-material/Receipt";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import TableViewIcon from "@mui/icons-material/TableView";
import SettingsIcon from "@mui/icons-material/Settings";
import CreditCardIcon from "@mui/icons-material/CreditCard";
import ShowChartIcon from "@mui/icons-material/ShowChart";
import RequestQuoteIcon from "@mui/icons-material/RequestQuote";
import BusinessIcon from "@mui/icons-material/Business";
import HelpCenterIcon from "@mui/icons-material/HelpCenter";
import PeopleIcon from "@mui/icons-material/People";
import MonetizationOnIcon from "@mui/icons-material/MonetizationOn";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import EventRepeatIcon from "@mui/icons-material/EventRepeat";
import CodeIcon from "@mui/icons-material/Code";

import DashboardPage from "./pages/DashboardPage";
import AccountsPage from "./pages/AccountsPage";
import CreditCardsPage from "./pages/CreditCardsPage";
import AssetsPage from "./pages/AssetsPage";
import LiabilitiesPage from "./pages/LiabilitiesPage";
import BanksPage from "./pages/BanksPage";
import CategoriesPage from "./pages/CategoriesPage";
import PayeesPage from "./pages/PayeesPage";
import TransactionsPage from "./pages/TransactionsPage";
import QueriesPage from "./pages/QueriesPage";

import YnabUserPage from "./pages/Plugins/YNAB/User";
import YnabBudgetsPage from "./pages/Plugins/YNAB/Budgets";
import YNABAccountsPage from "./pages/Plugins/YNAB/Accounts";
import YnabCategoriesPage from "./pages/Plugins/YNAB/Categories";
import YnabPayeesPage from "./pages/Plugins/YNAB/Payees";
import YnabMonthsPage from "./pages/Plugins/YNAB/Months";
import YnabTransactionsPage from "./pages/Plugins/YNAB/Transactions";
import YnabAPIEndpointsPage from "./pages/Plugins/YNAB/APIEndpoints";
import SettingsPage from "./pages/SettingsPage";
import { API_BASE_URL } from "./constants";
import { RECORD_TYPE_COLORS } from "./styles/theme";
import { YnabSyncProvider } from "./contexts/YnabSyncContext";

function useDemoRouter(initialPath: string): Router {
  const [pathname, setPathname] = React.useState(initialPath);

  const router = React.useMemo(() => {
    return {
      pathname,
      searchParams: new URLSearchParams(),
      navigate: (path: string | URL) => setPathname(String(path)),
    };
  }, [pathname]);

  return router;
}

function ModeSelect({
  mode,
  onChange,
}: {
  mode: "light" | "dark" | "system";
  onChange: (mode: "light" | "dark" | "system") => void;
}) {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleMenuItemClick = (newMode: "light" | "dark" | "system") => {
    onChange(newMode);
    handleClose();
  };

  const selectedIcon = {
    light: <Brightness7Icon />,
    dark: <Brightness4Icon />,
    system: <SettingsBrightnessIcon />,
  }[mode];

  return (
    <div>
      <IconButton onClick={handleClick} color="inherit">
        {selectedIcon}
      </IconButton>
      <Menu anchorEl={anchorEl} open={open} onClose={handleClose}>
        <MenuItem onClick={() => handleMenuItemClick("light")}>
          <ListItemIcon>
            <Brightness7Icon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Light</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleMenuItemClick("dark")}>
          <ListItemIcon>
            <Brightness4Icon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Dark</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleMenuItemClick("system")}>
          <ListItemIcon>
            <SettingsBrightnessIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>System</ListItemText>
        </MenuItem>
      </Menu>
    </div>
  );
}

const App = (props: any) => {
  const { window } = props;

  const [mode, setMode] = React.useState<"light" | "dark" | "system">("system");

  const prefersDarkMode = useMediaQuery("(prefers-color-scheme: dark)");

  const router = useDemoRouter("/dashboard");

  const resolvedMode = React.useMemo(() => {
    if (mode === "system") {
      return prefersDarkMode ? "dark" : "light";
    }
    return mode;
  }, [mode, prefersDarkMode]);

  // Get the current page's record type for dynamic styling
  const getCurrentPageRecordType = (pathname: string): string => {
    const cleanPathname = pathname.startsWith("/")
      ? pathname.slice(1)
      : pathname;

    // Map path segments to record types
    const pathToRecordType: Record<string, string> = {
      dashboard: "dashboard",
      accounts: "accounts",
      "credit-cards": "creditCards",
      assets: "assets",
      liabilities: "liabilities",
      banks: "banks",
      categories: "categories",
      payees: "payees",
      transactions: "transactions",
      queries: "queries",
      settings: "settings",
      "plugins/ynab/user": "ynabUser",
      "plugins/ynab/budgets": "ynabBudgets",
      "plugins/ynab/accounts": "ynabAccounts",
      "plugins/ynab/categories": "ynabCategories",
      "plugins/ynab/payees": "ynabPayees",
      "plugins/ynab/months": "ynabMonths",
      "plugins/ynab/transactions": "ynabTransactions",
      "plugins/ynab/api-endpoints": "ynabAPIEndpoints",
    };

    return pathToRecordType[cleanPathname] || "dashboard";
  };

  const currentRecordType = getCurrentPageRecordType(router.pathname);
  const currentPageColor =
    RECORD_TYPE_COLORS[currentRecordType as keyof typeof RECORD_TYPE_COLORS] ||
    RECORD_TYPE_COLORS.accounts;

  const theme = React.useMemo(
    () =>
      createTheme({
        palette: {
          mode: resolvedMode,
        },

        components: {
          MuiIconButton: {
            styleOverrides: {
              root: ({ theme }) => ({
                color: theme.palette.primary.main,
              }),
            },
          },
          // Dynamic sidebar navigation styling based on current page
          MuiListItemButton: {
            styleOverrides: {
              root: {
                "&.Mui-selected": {
                  backgroundColor: `${currentPageColor}20`, // 20% opacity
                  "&:hover": {
                    backgroundColor: `${currentPageColor}30`, // 30% opacity on hover
                  },
                  "& .MuiListItemIcon-root": {
                    color: currentPageColor,
                  },
                  "& .MuiTypography-root": {
                    color: currentPageColor,
                    fontWeight: 600,
                  },
                },
              },
            },
          },
          // Dynamic DataGrid toolbar button styling based on current page
          MuiButton: {
            styleOverrides: {
              root: {
                // Target DataGrid toolbar buttons specifically
                "&.MuiDataGrid-toolbarButton": {
                  color: currentPageColor,
                  "&:hover": {
                    backgroundColor: `${currentPageColor}10`,
                  },
                },
              },
            },
          },

          // Hide the default DashboardLayout breadcrumbs but keep our custom ones
          MuiBreadcrumbs: {
            styleOverrides: {
              root: {
                // Only hide breadcrumbs that are not our custom ones
                "&:not(.custom-breadcrumb)": {
                  display: "none !important",
                },
              },
            },
          },
          // Hide Toolpad's automatically generated page titles
          MuiTypography: {
            styleOverrides: {
              h1: {
                // Hide Toolpad's page title (h1) to avoid duplication with our PageHeader
                "&[data-testid='page-title']": {
                  display: "none !important",
                },
                // Also hide any h1 that might be Toolpad's title
                "&:has([data-testid='page-title'])": {
                  display: "none !important",
                },
              },
            },
          },
          // Global override to hide all Toolpad titles
          MuiCssBaseline: {
            styleOverrides: {
              body: {
                // Set CSS custom property for dynamic color
                "--finance-assistant-page-color": currentPageColor,
                // Hide any element with page-title data attribute
                "& [data-testid='page-title']": {
                  display: "none !important",
                },
                // Hide any h1 that looks like a page title
                "& h1:not(.custom-title)": {
                  display: "none !important",
                },
                // Dynamic DataGrid toolbar button styling based on current page
                "& .MuiDataGrid-toolbarContainer .MuiButton-root": {
                  color: currentPageColor,
                  "&:hover": {
                    backgroundColor: `${currentPageColor}10`,
                  },
                },
                "& .MuiDataGrid-toolbarContainer .MuiIconButton-root": {
                  color: currentPageColor,
                  "&:hover": {
                    backgroundColor: `${currentPageColor}10`,
                  },
                },
                // Additional targeting for DashboardLayout navigation
                "& .MuiDrawer-root .MuiListItemButton-root.Mui-selected": {
                  backgroundColor: `${currentPageColor}20`,
                  "&:hover": {
                    backgroundColor: `${currentPageColor}30`,
                  },
                  "& .MuiListItemIcon-root": {
                    color: `${currentPageColor} !important`,
                  },
                  "& .MuiTypography-root": {
                    color: `${currentPageColor} !important`,
                    fontWeight: 600,
                  },
                },
                // More specific targeting for Toolpad DashboardLayout
                "& [data-testid='navigation'] .MuiListItemButton-root.Mui-selected":
                  {
                    backgroundColor: `${currentPageColor}20`,
                    "&:hover": {
                      backgroundColor: `${currentPageColor}30`,
                    },
                    "& .MuiListItemIcon-root": {
                      color: `${currentPageColor} !important`,
                    },
                    "& .MuiTypography-root": {
                      color: `${currentPageColor} !important`,
                      fontWeight: 600,
                    },
                  },
                // Even more specific targeting
                "& .MuiListItemButton-root.Mui-selected": {
                  backgroundColor: `${currentPageColor}20`,
                  "&:hover": {
                    backgroundColor: `${currentPageColor}30`,
                  },
                  "& .MuiListItemIcon-root": {
                    color: `${currentPageColor} !important`,
                  },
                  "& .MuiTypography-root": {
                    color: `${currentPageColor} !important`,
                    fontWeight: 600,
                  },
                },
                // Most aggressive targeting for all possible selectors
                "& *[class*='MuiListItemButton'][class*='Mui-selected']": {
                  backgroundColor: `${currentPageColor}20`,
                  "&:hover": {
                    backgroundColor: `${currentPageColor}30`,
                  },
                  "& *[class*='MuiListItemIcon']": {
                    color: `${currentPageColor} !important`,
                  },
                  "& *[class*='MuiTypography']": {
                    color: `${currentPageColor} !important`,
                    fontWeight: 600,
                  },
                },
                // Target any element with selected state
                "& [class*='selected'] [class*='MuiListItemIcon']": {
                  color: `${currentPageColor} !important`,
                },
                "& [class*='selected'] [class*='MuiTypography']": {
                  color: `${currentPageColor} !important`,
                  fontWeight: 600,
                },
                // Final fallback - target any selected navigation item
                "& .Mui-selected svg": {
                  color: `${currentPageColor} !important`,
                },
                "& .Mui-selected span": {
                  color: `${currentPageColor} !important`,
                },
              },
            },
          },
        },
        breakpoints: {
          values: {
            xs: 0,
            sm: 600,
            md: 600,
            lg: 1200,
            xl: 1536,
          },
        },
      }),
    [resolvedMode, currentPageColor]
  );

  const { data: ynabSettings, isLoading: ynabSettingsLoading } = useQuery({
    queryKey: ["ynabConfig"],
    queryFn: () =>
      axios.get(`${API_BASE_URL}/ynab/config/`).then((res) => res.data),
  });

  const navigation: Navigation = React.useMemo(() => {
    const baseNavigation: Navigation = [
      {
        segment: "dashboard",
        title: "Dashboard",
        icon: <DashboardIcon />,
      },
      {
        segment: "accounts",
        title: "Accounts",
        icon: <AccountBalanceWalletIcon />,
      },
      {
        segment: "credit-cards",
        title: "Credit Cards",
        icon: <CreditCardIcon />,
      },
      {
        segment: "assets",
        title: "Assets",
        icon: <ShowChartIcon />,
      },
      {
        segment: "liabilities",
        title: "Liabilities",
        icon: <RequestQuoteIcon />,
      },
      {
        segment: "banks",
        title: "Banks",
        icon: <BusinessIcon />,
      },
      {
        segment: "categories",
        title: "Categories",
        icon: <CategoryIcon />,
      },
      {
        segment: "payees",
        title: "Payees",
        icon: <ReceiptIcon />,
      },
      {
        segment: "transactions",
        title: "Transactions",
        icon: <TableViewIcon />,
      },
      {
        segment: "queries",
        title: "Queries",
        icon: <HelpCenterIcon />,
      },
    ];

    const pluginNav: Navigation = [];
    if (ynabSettings?.api_key && ynabSettings?.budget_id) {
      pluginNav.push({
        segment: "plugins",
        title: "Plugins",
        icon: <ExtensionIcon />,
        children: [
          {
            segment: "ynab",
            title: "YNAB",
            icon: <YnabIcon />,
            children: [
              {
                segment: "user",
                title: "User",
                icon: <PeopleIcon />,
              },
              {
                segment: "budgets",
                title: "Budgets",
                icon: <MonetizationOnIcon />,
              },
              {
                segment: "accounts",
                title: "Accounts",
                icon: <AccountBalanceWalletIcon />,
              },
              {
                segment: "categories",
                title: "Categories",
                icon: <CategoryIcon />,
              },
              {
                segment: "payees",
                title: "Payees",
                icon: <PeopleIcon />,
              },
              {
                segment: "months",
                title: "Months",
                icon: <CalendarMonthIcon />,
              },
              {
                segment: "transactions",
                title: "Transactions",
                icon: <ReceiptIcon />,
              },
              {
                segment: "api-endpoints",
                title: "API Endpoints",
                icon: <CodeIcon />,
              },
            ],
          },
        ],
      });
    }

    const settingsNav: Navigation = [
      {
        segment: "settings",
        title: "Settings",
        icon: <SettingsIcon />,
      },
    ];

    return [...baseNavigation, ...pluginNav, ...settingsNav];
  }, [ynabSettings]);

  const branding = {
    title: "Finance Assistant",
    logo: <AccountBalanceRounded sx={{ color: "primary.main" }} />,
  };

  const pageContent = React.useMemo(() => {
    // Normalize pathname by removing leading slash
    const cleanPathname = router.pathname.startsWith("/")
      ? router.pathname.slice(1)
      : router.pathname;

    switch (cleanPathname) {
      case "dashboard":
        return <DashboardPage />;
      case "accounts":
        return <AccountsPage />;
      case "credit-cards":
        return <CreditCardsPage />;
      case "assets":
        return <AssetsPage />;
      case "liabilities":
        return <LiabilitiesPage />;
      case "banks":
        return <BanksPage />;
      case "categories":
        return <CategoriesPage />;
      case "payees":
        return <PayeesPage />;
      case "transactions":
        return <TransactionsPage />;
      case "queries":
        return <QueriesPage />;
      case "plugins":
        return (
          <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom>
              Plugins
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Manage your financial data integrations and plugins.
            </Typography>
          </Box>
        );
      case "plugins/ynab":
        return (
          <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom>
              YNAB Integration
            </Typography>
            <Typography variant="body1" color="text.secondary">
              You Need A Budget (YNAB) integration for syncing financial data.
            </Typography>
          </Box>
        );
      case "plugins/ynab/user":
        return <YnabUserPage />;
      case "plugins/ynab/budgets":
        return <YnabBudgetsPage />;
      case "plugins/ynab/accounts":
        return <YNABAccountsPage />;
      case "plugins/ynab/categories":
        return <YnabCategoriesPage />;
      case "plugins/ynab/payees":
        return <YnabPayeesPage />;
      case "plugins/ynab/months":
        return <YnabMonthsPage />;
      case "plugins/ynab/transactions":
        return <YnabTransactionsPage />;
      case "plugins/ynab/api-endpoints":
        return <YnabAPIEndpointsPage />;
      case "settings":
        return <SettingsPage />;
      default:
        return (
          <Box sx={{ p: 1, width: "100%" }}>
            <Typography>Page not found</Typography>
          </Box>
        );
    }
  }, [router.pathname]);

  return (
    <AppProvider theme={theme} router={router} navigation={navigation}>
      <YnabSyncProvider autoSyncOnMount={true}>
        <DashboardLayout
          branding={branding}
          actions={<ModeSelect mode={mode} onChange={setMode} />}
        >
          {ynabSettingsLoading ? (
            <Box sx={{ p: 1, width: "100%" }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              <CustomBreadcrumb
                path={router.pathname}
                onNavigate={(path) => router.navigate(path)}
              />
              <Box sx={{ p: 1, width: "100%" }}>{pageContent}</Box>
            </>
          )}
        </DashboardLayout>
      </YnabSyncProvider>
    </AppProvider>
  );
};

export default App;
