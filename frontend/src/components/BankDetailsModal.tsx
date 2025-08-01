import {
  Dialog,
  DialogTitle,
  DialogContent,
  Typography,
  Box,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
} from "@mui/material";
import { Close as CloseIcon } from "@mui/icons-material";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useState } from "react";
import {
  ACCOUNTS_URL,
  CREDIT_CARDS_URL,
  ASSETS_URL,
  LIABILITIES_URL,
} from "../constants";

interface BankDetailsModalProps {
  open: boolean;
  onClose: () => void;
  bank: any;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`bank-tabpanel-${index}`}
      aria-labelledby={`bank-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 1 }}>{children}</Box>}
    </div>
  );
}

export default function BankDetailsModal({
  open,
  onClose,
  bank,
}: BankDetailsModalProps) {
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Fetch associated records by bank name instead of ID
  const { data: accounts = [] } = useQuery({
    queryKey: ["accounts", bank?.name],
    queryFn: () =>
      axios
        .get(
          `${ACCOUNTS_URL}?bank_name=${encodeURIComponent(bank?.name || "")}`
        )
        .then((res) => res.data.results || res.data || [])
        .catch((error) => {
          console.error("Error fetching accounts:", error);
          return [];
        }),
    enabled: open && !!bank?.name,
  });

  const { data: creditCards = [] } = useQuery({
    queryKey: ["creditCards", bank?.name],
    queryFn: () =>
      axios
        .get(
          `${CREDIT_CARDS_URL}?bank_name=${encodeURIComponent(
            bank?.name || ""
          )}`
        )
        .then((res) => res.data.results || res.data || [])
        .catch((error) => {
          console.error("Error fetching credit cards:", error);
          return [];
        }),
    enabled: open && !!bank?.name,
  });

  const { data: assets = [] } = useQuery({
    queryKey: ["assets", bank?.name],
    queryFn: () =>
      axios
        .get(`${ASSETS_URL}?bank_name=${encodeURIComponent(bank?.name || "")}`)
        .then((res) => res.data.results || res.data || [])
        .catch((error) => {
          console.error("Error fetching assets:", error);
          return [];
        }),
    enabled: open && !!bank?.name,
  });

  const { data: liabilities = [] } = useQuery({
    queryKey: ["liabilities", bank?.name],
    queryFn: () =>
      axios
        .get(
          `${LIABILITIES_URL}?bank_name=${encodeURIComponent(bank?.name || "")}`
        )
        .then((res) => res.data.results || res.data || [])
        .catch((error) => {
          console.error("Error fetching liabilities:", error);
          return [];
        }),
    enabled: open && !!bank?.name,
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount || 0);
  };

  const getStatusChip = (record: any) => {
    if (record.closed) {
      return <Chip label="Closed" color="error" size="small" />;
    }
    return <Chip label="Active" color="success" size="small" />;
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: { height: "80vh" },
      }}
    >
      <DialogTitle sx={{ m: 0, p: 2, display: "flex", alignItems: "center" }}>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          {bank?.name} - Details
        </Typography>
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{
            color: (theme) => theme.palette.grey[500],
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab
              label={`Accounts (${accounts.length})`}
              id="bank-tab-0"
              aria-controls="bank-tabpanel-0"
            />
            <Tab
              label={`Credit Cards (${creditCards.length})`}
              id="bank-tab-1"
              aria-controls="bank-tabpanel-1"
            />
            <Tab
              label={`Assets (${assets.length})`}
              id="bank-tab-2"
              aria-controls="bank-tabpanel-2"
            />
            <Tab
              label={`Liabilities (${liabilities.length})`}
              id="bank-tab-3"
              aria-controls="bank-tabpanel-3"
            />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Last 4</TableCell>
                  <TableCell>Balance</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {accounts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      No accounts found
                    </TableCell>
                  </TableRow>
                ) : (
                  accounts.map((account: any) => (
                    <TableRow key={account.id}>
                      <TableCell>{account.name}</TableCell>
                      <TableCell>
                        {account.account_type?.name || "N/A"}
                      </TableCell>
                      <TableCell>{account.last_4 || "N/A"}</TableCell>
                      <TableCell>{formatCurrency(account.balance)}</TableCell>
                      <TableCell>{getStatusChip(account)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Last 4</TableCell>
                  <TableCell>Balance</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {creditCards.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      No credit cards found
                    </TableCell>
                  </TableRow>
                ) : (
                  creditCards.map((card: any) => (
                    <TableRow key={card.id}>
                      <TableCell>{card.name}</TableCell>
                      <TableCell>
                        {card.credit_card_type?.name || "N/A"}
                      </TableCell>
                      <TableCell>{card.last_4 || "N/A"}</TableCell>
                      <TableCell>{formatCurrency(card.balance)}</TableCell>
                      <TableCell>{getStatusChip(card)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Value</TableCell>
                  <TableCell>Balance</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {assets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      No assets found
                    </TableCell>
                  </TableRow>
                ) : (
                  assets.map((asset: any) => (
                    <TableRow key={asset.id}>
                      <TableCell>{asset.name}</TableCell>
                      <TableCell>{asset.asset_type?.name || "N/A"}</TableCell>
                      <TableCell>{formatCurrency(asset.value)}</TableCell>
                      <TableCell>{formatCurrency(asset.balance)}</TableCell>
                      <TableCell>{getStatusChip(asset)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        <TabPanel value={tabValue} index={3}>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Balance</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {liabilities.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} align="center">
                      No liabilities found
                    </TableCell>
                  </TableRow>
                ) : (
                  liabilities.map((liability: any) => (
                    <TableRow key={liability.id}>
                      <TableCell>{liability.name}</TableCell>
                      <TableCell>
                        {liability.liability_type?.name || "N/A"}
                      </TableCell>
                      <TableCell>{formatCurrency(liability.balance)}</TableCell>
                      <TableCell>{getStatusChip(liability)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>
      </DialogContent>
    </Dialog>
  );
}
