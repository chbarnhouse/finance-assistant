import React, { useState, useEffect } from "react";
import {
  Typography,
  Grid,
  Card,
  CardContent,
  Box,
  Paper,
  Chip,
  Button,
  Divider,
  Alert,
  CircularProgress,
} from "@mui/material";
import {
  AccountBalance,
  CreditCard,
  TrendingUp,
  TrendingDown,
  AttachMoney,
  AccountBalanceWallet,
  Business,
  Category,
  People,
  Receipt,
} from "@mui/icons-material";
import { useQuery } from "@tanstack/react-query";
import { API_BASE_URL } from "../constants";

interface DashboardStats {
  accounts: {
    total: number;
    totalBalance: number;
  };
  creditCards: {
    total: number;
    totalLimit: number;
    totalBalance: number;
  };
  assets: {
    total: number;
    totalValue: number;
  };
  liabilities: {
    total: number;
    totalAmount: number;
  };
  categories: {
    total: number;
  };
  payees: {
    total: number;
  };
  transactions: {
    total: number;
    recentCount: number;
  };
  netWorth: number;
}

function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch dashboard statistics
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      try {
        // Fetch data from multiple endpoints
        const [
          accountsRes,
          creditCardsRes,
          assetsRes,
          liabilitiesRes,
          categoriesRes,
          payeesRes,
          transactionsRes,
        ] = await Promise.all([
          fetch(`${API_BASE_URL}/accounts/`),
          fetch(`${API_BASE_URL}/credit-cards/`),
          fetch(`${API_BASE_URL}/assets/`),
          fetch(`${API_BASE_URL}/liabilities/`),
          fetch(`${API_BASE_URL}/categories/`),
          fetch(`${API_BASE_URL}/payees/`),
          fetch(`${API_BASE_URL}/data/transactions/`),
        ]);

        const [
          accounts,
          creditCards,
          assets,
          liabilities,
          categories,
          payees,
          transactions,
        ] = await Promise.all([
          accountsRes.json(),
          creditCardsRes.json(),
          assetsRes.json(),
          liabilitiesRes.json(),
          categoriesRes.json(),
          payeesRes.json(),
          transactionsRes.json(),
        ]);

        // Handle different response formats - some endpoints return arrays, others return paginated objects
        const accountsData = Array.isArray(accounts) ? accounts : [];
        const creditCardsData = Array.isArray(creditCards) ? creditCards : [];
        const assetsData = Array.isArray(assets) ? assets : [];
        const liabilitiesData = Array.isArray(liabilities) ? liabilities : [];
        const categoriesData = Array.isArray(categories) ? categories : [];
        const payeesData = Array.isArray(payees) ? payees : [];
        const transactionsData =
          transactions?.results ||
          (Array.isArray(transactions) ? transactions : []);

        // Calculate statistics
        const totalAccountBalance = accountsData.reduce(
          (sum: number, account: any) => sum + (account.balance || 0),
          0
        );

        const totalCreditCardLimit = creditCardsData.reduce(
          (sum: number, card: any) => sum + (card.credit_limit || 0),
          0
        );

        const totalCreditCardBalance = creditCardsData.reduce(
          (sum: number, card: any) => sum + (card.current_balance || 0),
          0
        );

        const totalAssetValue = assetsData.reduce(
          (sum: number, asset: any) => sum + (asset.current_value || 0),
          0
        );

        const totalLiabilityAmount = liabilitiesData.reduce(
          (sum: number, liability: any) => sum + (liability.amount || 0),
          0
        );

        const netWorth =
          totalAccountBalance + totalAssetValue - totalLiabilityAmount;

        return {
          accounts: {
            total: accountsData.length,
            totalBalance: totalAccountBalance,
          },
          creditCards: {
            total: creditCardsData.length,
            totalLimit: totalCreditCardLimit,
            totalBalance: totalCreditCardBalance,
          },
          assets: {
            total: assetsData.length,
            totalValue: totalAssetValue,
          },
          liabilities: {
            total: liabilitiesData.length,
            totalAmount: totalLiabilityAmount,
          },
          categories: {
            total: categoriesData.length,
          },
          payees: {
            total: payeesData.length,
          },
          transactions: {
            total: transactionsData.length,
            recentCount: transactionsData.filter((t: any) => {
              const transactionDate = new Date(t.date);
              const thirtyDaysAgo = new Date();
              thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
              return transactionDate >= thirtyDaysAgo;
            }).length,
          },
          netWorth,
        };
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
        throw new Error("Failed to load dashboard data");
      }
    },
    retry: 2,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  useEffect(() => {
    if (dashboardData) {
      setStats(dashboardData);
      setLoading(false);
    }
  }, [dashboardData]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const StatCard = ({
    title,
    value,
    subtitle,
    icon,
    color = "primary",
    trend,
  }: {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: React.ReactNode;
    color?: "primary" | "success" | "warning" | "error";
    trend?: "up" | "down";
  }) => (
    <Card sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <CardContent sx={{ flexGrow: 1 }}>
        <Box
          display="flex"
          alignItems="center"
          justifyContent="space-between"
          mb={2}
        >
          <Box
            sx={{
              backgroundColor: `${color}.light`,
              borderRadius: "50%",
              p: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {icon}
          </Box>
          {trend && (
            <Chip
              icon={trend === "up" ? <TrendingUp /> : <TrendingDown />}
              label={trend === "up" ? "Up" : "Down"}
              size="small"
              color={trend === "up" ? "success" : "error"}
            />
          )}
        </Box>
        <Typography variant="h4" component="div" gutterBottom>
          {value}
        </Typography>
        <Typography variant="h6" color="text.secondary" gutterBottom>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="body2" color="text.secondary">
            {subtitle}
          </Typography>
        )}
      </CardContent>
    </Card>
  );

  if (loading || isLoading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="400px"
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Financial Dashboard
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Overview of your financial health and key metrics
      </Typography>

      {stats && (
        <>
          {/* Net Worth Section */}
          <Paper
            sx={{
              p: 3,
              mb: 4,
              backgroundColor: "primary.light",
              color: "white",
            }}
          >
            <Typography variant="h5" gutterBottom>
              Net Worth
            </Typography>
            <Typography variant="h3" sx={{ fontWeight: "bold" }}>
              {formatCurrency(stats.netWorth)}
            </Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              Total Assets:{" "}
              {formatCurrency(
                stats.accounts.totalBalance + stats.assets.totalValue
              )}{" "}
              | Total Liabilities:{" "}
              {formatCurrency(stats.liabilities.totalAmount)}
            </Typography>
          </Paper>

          {/* Key Metrics Grid */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Accounts"
                value={stats.accounts.total}
                subtitle={formatCurrency(stats.accounts.totalBalance)}
                icon={<AccountBalance />}
                color="primary"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Credit Cards"
                value={stats.creditCards.total}
                subtitle={`${formatCurrency(
                  stats.creditCards.totalBalance
                )} / ${formatCurrency(stats.creditCards.totalLimit)}`}
                icon={<CreditCard />}
                color="warning"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Assets"
                value={stats.assets.total}
                subtitle={formatCurrency(stats.assets.totalValue)}
                icon={<TrendingUp />}
                color="success"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Liabilities"
                value={stats.liabilities.total}
                subtitle={formatCurrency(stats.liabilities.totalAmount)}
                icon={<TrendingDown />}
                color="error"
              />
            </Grid>
          </Grid>

          {/* Secondary Metrics */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Categories"
                value={stats.categories.total}
                subtitle="Budget categories"
                icon={<Category />}
                color="primary"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Payees"
                value={stats.payees.total}
                subtitle="Merchants & vendors"
                icon={<People />}
                color="primary"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Transactions"
                value={stats.transactions.total}
                subtitle={`${stats.transactions.recentCount} in last 30 days`}
                icon={<Receipt />}
                color="primary"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Credit Utilization"
                value={`${(
                  (stats.creditCards.totalBalance /
                    stats.creditCards.totalLimit) *
                  100
                ).toFixed(1)}%`}
                subtitle="Of total credit limit"
                icon={<CreditCard />}
                color={
                  stats.creditCards.totalBalance /
                    stats.creditCards.totalLimit >
                  0.3
                    ? "error"
                    : "success"
                }
              />
            </Grid>
          </Grid>

          {/* Quick Actions */}
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Quick Actions
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Grid container spacing={2}>
              <Grid item>
                <Button variant="outlined" startIcon={<AccountBalance />}>
                  Add Account
                </Button>
              </Grid>
              <Grid item>
                <Button variant="outlined" startIcon={<CreditCard />}>
                  Add Credit Card
                </Button>
              </Grid>
              <Grid item>
                <Button variant="outlined" startIcon={<TrendingUp />}>
                  Add Asset
                </Button>
              </Grid>
              <Grid item>
                <Button variant="outlined" startIcon={<Receipt />}>
                  Add Transaction
                </Button>
              </Grid>
            </Grid>
          </Paper>
        </>
      )}
    </Box>
  );
}

export default DashboardPage;
