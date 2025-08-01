import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  CircularProgress,
  Autocomplete,
  Chip,
  Tooltip,
} from "@mui/material";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useState, useEffect } from "react";
import {
  ACCOUNTS_URL,
  BANKS_URL,
  LOOKUP_BANKS_URL,
  ACCOUNT_TYPES_URL,
  YNAB_ACCOUNTS_URL,
  LINKS_URL,
  API_BASE_URL,
} from "../constants";
import LinkIcon from "@mui/icons-material/Link";

interface CrossReference {
  sourceValue: string;
  displayValue: string;
  enabled: boolean;
  column: string;
}

// Default cross-references for YNAB account types
const DEFAULT_CROSS_REFERENCES: CrossReference[] = [
  {
    sourceValue: "checking",
    displayValue: "Checking Account",
    enabled: true,
    column: "type",
  },
  {
    sourceValue: "savings",
    displayValue: "Savings Account",
    enabled: true,
    column: "type",
  },
  {
    sourceValue: "cash",
    displayValue: "Cash",
    enabled: true,
    column: "type",
  },
  {
    sourceValue: "creditCard",
    displayValue: "Credit Card",
    enabled: true,
    column: "type",
  },
  {
    sourceValue: "lineOfCredit",
    displayValue: "Line of Credit",
    enabled: true,
    column: "type",
  },
  {
    sourceValue: "otherAsset",
    displayValue: "Other Asset",
    enabled: true,
    column: "type",
  },
  {
    sourceValue: "otherLiability",
    displayValue: "Other Liability",
    enabled: true,
    column: "type",
  },
  {
    sourceValue: "mortgage",
    displayValue: "Mortgage",
    enabled: true,
    column: "type",
  },
  {
    sourceValue: "autoLoan",
    displayValue: "Auto Loan",
    enabled: true,
    column: "type",
  },
  {
    sourceValue: "studentLoan",
    displayValue: "Student Loan",
    enabled: true,
    column: "type",
  },
  {
    sourceValue: "personalLoan",
    displayValue: "Personal Loan",
    enabled: true,
    column: "type",
  },
  {
    sourceValue: "medicalDebt",
    displayValue: "Medical Debt",
    enabled: true,
    column: "type",
  },
  {
    sourceValue: "otherDebt",
    displayValue: "Other Debt",
    enabled: true,
    column: "type",
  },
];

interface AccountFormDialogProps {
  open: boolean;
  onClose: (createdAccount?: any) => void;
  onCancel?: () => void; // Optional callback for cancel action
  account?: any; // For editing existing accounts
  defaultData?: any; // For pre-populating fields when creating new accounts
  linkedYnabAccount?: any; // For pre-linking a YNAB account
}

export default function AccountFormDialog({
  open,
  onClose,
  onCancel,
  account,
  defaultData,
  linkedYnabAccount,
}: AccountFormDialogProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch banks and account types for dropdowns
  const { data: banks = [] } = useQuery({
    queryKey: [LOOKUP_BANKS_URL],
    queryFn: () => axios.get(LOOKUP_BANKS_URL).then((res) => res.data),
    enabled: open,
  });

  const { data: accountTypes = [] } = useQuery({
    queryKey: [ACCOUNT_TYPES_URL],
    queryFn: () => axios.get(ACCOUNT_TYPES_URL).then((res) => res.data),
    enabled: open,
  });

  // Fetch YNAB accounts for linking
  const { data: ynabAccounts = [] } = useQuery({
    queryKey: ["ynab-accounts"],
    queryFn: () =>
      axios
        .get(YNAB_ACCOUNTS_URL)
        .then((res) => {
          const responseData = res.data;
          if (responseData && responseData.data && responseData.data.accounts) {
            return responseData.data.accounts;
          }
          return [];
        })
        .catch(() => []),
    enabled: open,
  });

  // Fetch cross-references for YNAB account types
  const { data: crossReferences = DEFAULT_CROSS_REFERENCES } = useQuery({
    queryKey: ["ynab-cross-references-accounts"],
    queryFn: async () => {
      try {
        const response = await axios.get(
          `${API_BASE_URL}/ynab/cross-references/accounts/`
        );
        const refs = response.data.cross_references || [];

        // If no cross-references exist in the database, use the hardcoded defaults
        if (refs.length === 0) {
          console.log("No cross-references found in database, using defaults");
          return DEFAULT_CROSS_REFERENCES;
        } else {
          return refs;
        }
      } catch (error) {
        console.error("Error loading cross-references:", error);
        // On error, fall back to defaults
        return DEFAULT_CROSS_REFERENCES;
      }
    },
    enabled: open,
  });

  // Function to get display value for YNAB account type
  const getYnabAccountTypeDisplayName = (typeCode: string) => {
    const crossRef = crossReferences.find(
      (ref) =>
        ref.sourceValue === typeCode && ref.column === "type" && ref.enabled
    );
    return crossRef ? crossRef.displayValue : typeCode;
  };

  // Auto-refresh account data when dialog is open and account is linked
  const { data: refreshedAccount } = useQuery({
    queryKey: ["account", account?.id],
    queryFn: () =>
      axios.get(`${ACCOUNTS_URL}${account.id}/`).then((res) => res.data),
    enabled: open && !!account?.id,
    refetchInterval: account?.link_data ? 10000 : false, // Refresh every 10 seconds if linked
    refetchOnWindowFocus: true, // Refresh when window gains focus
  });

  // Sync mutation for pulling latest YNAB data
  const syncMutation = useMutation({
    mutationFn: async () => {
      if (!currentAccount?.link_data?.id) {
        throw new Error("Account is not linked to YNAB");
      }
      const response = await axios.post(
        `${LINKS_URL}${currentAccount.link_data.id}/sync/`
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["account", account?.id] });
    },
    onError: (error: any) => {
      console.error("Sync error:", error);
    },
  });

  // Function to populate form with YNAB data
  const populateFormWithYnabData = (ynabAccount: any) => {
    if (ynabAccount) {
      setFormData((prev) => ({
        ...prev,
        name: ynabAccount.name || prev.name,
        balance: ynabAccount.balance
          ? ynabAccount.balance / 1000
          : prev.balance, // YNAB stores balance in milliunits
        cleared_balance: ynabAccount.cleared_balance
          ? ynabAccount.cleared_balance / 1000
          : prev.cleared_balance,
        on_budget: ynabAccount.on_budget || prev.on_budget,
        closed: ynabAccount.closed || prev.closed,
        last_reconciled_at:
          ynabAccount.last_reconciled_at || prev.last_reconciled_at,
      }));
    }
  };

  // State for YNAB linking
  const [selectedYnabAccount, setSelectedYnabAccount] = useState<any>(null);
  const [linkedYnabAccountState, setLinkedYnabAccountState] =
    useState<any>(null);

  // Use refreshed account data if available, otherwise use original account
  const currentAccount = refreshedAccount || account;

  // Reset form when dialog opens/closes or account changes
  useEffect(() => {
    if (open) {
      if (currentAccount) {
        setFormData({
          name: currentAccount.name || "",
          bank: currentAccount.bank || "",
          account_type: currentAccount.account_type || "",
          last_4: currentAccount.last_4 || "",
          notes: currentAccount.notes || "",
          allocation: currentAccount.allocation || "LI",
          // Include YNAB synced fields
          balance: currentAccount.balance || "",
          cleared_balance: currentAccount.cleared_balance || "",
          on_budget: currentAccount.on_budget || false,
          closed: currentAccount.closed || false,
          last_reconciled_at: currentAccount.last_reconciled_at || "",
        });
        // Set linked YNAB account if it exists
        setLinkedYnabAccountState(
          currentAccount.link_data?.plugin_record || null
        );
        setSelectedYnabAccount(currentAccount.link_data?.plugin_record || null);

        // Auto-sync if account is linked to YNAB
        if (currentAccount.link_data?.id) {
          syncMutation.mutate();
        }
      } else {
        // Use defaultData for pre-populating fields when creating new accounts
        setFormData({
          name: defaultData?.name || "",
          bank: defaultData?.bank || "",
          account_type: defaultData?.account_type || "",
          last_4: defaultData?.last_4 || "",
          notes: defaultData?.notes || "",
          allocation: defaultData?.allocation || "LI",
          // Initialize YNAB fields as empty
          balance: "",
          cleared_balance: "",
          on_budget: false,
          closed: false,
          last_reconciled_at: "",
        });
        setLinkedYnabAccountState(linkedYnabAccount || null);
        setSelectedYnabAccount(linkedYnabAccount || null);

        // If there's a pre-linked YNAB account, populate the form with its data
        if (linkedYnabAccount) {
          populateFormWithYnabData(linkedYnabAccount);
        }
      }
      setErrors({});
    }
  }, [open, currentAccount, defaultData, linkedYnabAccount]);

  const createMutation = useMutation({
    mutationFn: (data: any) => axios.post(ACCOUNTS_URL, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [ACCOUNTS_URL] });
      onClose(data); // Pass the created account data
    },
    onError: (error: any) => {
      if (error.response?.data) {
        setErrors(error.response.data);
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => axios.put(`${ACCOUNTS_URL}${account.id}/`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ACCOUNTS_URL] });
      onClose();
    },
    onError: (error: any) => {
      if (error.response?.data) {
        setErrors(error.response.data);
      }
    },
  });

  // Link/unlink YNAB account mutation
  const linkMutation = useMutation({
    mutationFn: (id: string) => {
      if (linkedYnabAccountState && account?.link_data?.id) {
        // Unlink existing account - id is the link ID
        return axios.delete(`${LINKS_URL}${id}/`);
      } else {
        // Link new account - id is the YNAB account ID
        return axios.post(LINKS_URL, {
          plugin_model: "account",
          plugin_id: id,
          core_model: "account",
          core_id: account.id,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ACCOUNTS_URL] });
      queryClient.invalidateQueries({ queryKey: ["ynab-accounts"] });
      setSelectedYnabAccount(null);
    },
    onError: (error: any) => {
      console.error("Linking error:", error);
    },
  });

  const handleLinkYnabAccount = () => {
    if (selectedYnabAccount) {
      linkMutation.mutate(selectedYnabAccount.id);
      setLinkedYnabAccountState(selectedYnabAccount);

      // Populate form with YNAB data immediately
      populateFormWithYnabData(selectedYnabAccount);

      // Trigger sync after linking to get latest YNAB data
      setTimeout(() => {
        if (account?.id) {
          syncMutation.mutate();
        }
      }, 1000); // Small delay to ensure link is created
    }
  };

  const handleUnlinkYnabAccount = () => {
    if (linkedYnabAccountState && account?.link_data?.id) {
      // Pass the link ID for deletion
      linkMutation.mutate(account.link_data.id);
      setLinkedYnabAccountState(null);
    }
  };

  const handleSubmit = () => {
    // Clean up the form data before sending
    const cleanedData = { ...formData };

    console.log("AccountFormDialog - Original formData:", formData);
    console.log(
      "AccountFormDialog - Bank value:",
      formData.bank,
      "Type:",
      typeof formData.bank
    );
    console.log(
      "AccountFormDialog - Account type value:",
      formData.account_type,
      "Type:",
      typeof formData.account_type
    );

    // Convert empty strings to null for optional foreign key fields
    if (cleanedData.bank === "") {
      cleanedData.bank = null;
    }

    if (cleanedData.account_type === "") {
      cleanedData.account_type = null;
    }

    // Convert empty strings to null for other optional fields
    if (cleanedData.last_4 === "") {
      cleanedData.last_4 = null;
    }

    if (cleanedData.notes === "") {
      cleanedData.notes = null;
    }

    if (cleanedData.balance === "") {
      cleanedData.balance = null;
    }

    if (cleanedData.cleared_balance === "") {
      cleanedData.cleared_balance = null;
    }

    if (cleanedData.last_reconciled_at === "") {
      cleanedData.last_reconciled_at = null;
    }

    console.log("AccountFormDialog - Cleaned data:", cleanedData);

    if (account) {
      updateMutation.mutate(cleanedData);
    } else {
      createMutation.mutate(cleanedData);
    }
  };

  const handleChange = (fieldName: string, value: any) => {
    setFormData((prev) => ({ ...prev, [fieldName]: value }));
    // Clear error when user starts typing
    if (errors[fieldName]) {
      setErrors((prev) => ({ ...prev, [fieldName]: "" }));
    }
  };

  const handleCreateBank = async (bankName: string) => {
    try {
      const response = await axios.post(LOOKUP_BANKS_URL, { name: bankName });
      const newBank = response.data;
      queryClient.invalidateQueries({ queryKey: [LOOKUP_BANKS_URL] });
      handleChange("bank", newBank.id);
    } catch (error) {
      console.error("Error creating bank:", error);
      setErrors((prev) => ({ ...prev, bank: "Failed to create bank" }));
    }
  };

  const handleCreateAccountType = async (typeName: string) => {
    try {
      const response = await axios.post(ACCOUNT_TYPES_URL, { name: typeName });
      const newType = response.data;
      queryClient.invalidateQueries({ queryKey: [ACCOUNT_TYPES_URL] });
      handleChange("account_type", newType.id);
    } catch (error) {
      console.error("Error creating account type:", error);
      setErrors((prev) => ({
        ...prev,
        account_type: "Failed to create account type",
      }));
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  // Don't render if dialog is not open
  if (!open) {
    return null;
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {account ? "Edit Account" : "Create New Account"}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 1 }}>
          {/* Account Information Section */}
          <Box sx={{ mb: 3 }}>
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
                <TextField
                  fullWidth
                  label="Account Name"
                  value={formData.name || ""}
                  onChange={(e) => handleChange("name", e.target.value)}
                  required
                  error={!!errors.name}
                  helperText={errors.name}
                  margin="normal"
                />

                <Autocomplete
                  freeSolo
                  selectOnFocus
                  clearOnBlur
                  handleHomeEndKeys
                  options={banks}
                  getOptionLabel={(option) => {
                    if (typeof option === "string") return option;
                    return option.name || "";
                  }}
                  value={
                    banks.find((bank: any) => bank.id === formData.bank) || null
                  }
                  onChange={(event, newValue) => {
                    if (typeof newValue === "string") {
                      // Check if this is an "Add 'X'" option
                      if (
                        newValue.startsWith('Add "') &&
                        newValue.endsWith('"')
                      ) {
                        // Extract the actual value from "Add 'X'"
                        const actualValue = newValue.slice(5, -1); // Remove 'Add "' and '"'
                        handleCreateBank(actualValue);
                      } else {
                        // User typed a new value, create it
                        handleCreateBank(newValue);
                      }
                    } else if (newValue) {
                      // User selected an existing option
                      handleChange("bank", newValue.id);
                    } else {
                      // User cleared the field
                      handleChange("bank", "");
                    }
                  }}
                  filterOptions={(options, params) => {
                    const filtered = options.filter((option) =>
                      option.name
                        .toLowerCase()
                        .includes(params.inputValue.toLowerCase())
                    );

                    const { inputValue } = params;
                    const isExisting = options.some(
                      (option) => option.name === inputValue
                    );
                    if (inputValue !== "" && !isExisting) {
                      filtered.push(`Add "${inputValue}"`);
                    }

                    return filtered;
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Bank"
                      required
                      error={!!errors.bank}
                      helperText={errors.bank}
                      margin="normal"
                    />
                  )}
                  renderOption={(props, option) => (
                    <li {...props}>
                      <Typography>
                        {typeof option === "string" ? option : option.name}
                      </Typography>
                    </li>
                  )}
                />

                <Autocomplete
                  freeSolo
                  selectOnFocus
                  clearOnBlur
                  handleHomeEndKeys
                  options={accountTypes}
                  getOptionLabel={(option) => {
                    if (typeof option === "string") return option;
                    return option.name || "";
                  }}
                  value={
                    accountTypes.find(
                      (type: any) => type.id === formData.account_type
                    ) || null
                  }
                  onChange={(event, newValue) => {
                    if (typeof newValue === "string") {
                      // Check if this is an "Add 'X'" option
                      if (
                        newValue.startsWith('Add "') &&
                        newValue.endsWith('"')
                      ) {
                        // Extract the actual value from "Add 'X'"
                        const actualValue = newValue.slice(5, -1); // Remove 'Add "' and '"'
                        handleCreateAccountType(actualValue);
                      } else {
                        // User typed a new value, create it
                        handleCreateAccountType(newValue);
                      }
                    } else if (newValue) {
                      // User selected an existing option
                      handleChange("account_type", newValue.id);
                    } else {
                      // User cleared the field
                      handleChange("account_type", "");
                    }
                  }}
                  filterOptions={(options, params) => {
                    const filtered = options.filter((option) =>
                      option.name
                        .toLowerCase()
                        .includes(params.inputValue.toLowerCase())
                    );

                    const { inputValue } = params;
                    const isExisting = options.some(
                      (option) => option.name === inputValue
                    );
                    if (inputValue !== "" && !isExisting) {
                      filtered.push(`Add "${inputValue}"`);
                    }

                    return filtered;
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Account Type"
                      required
                      error={!!errors.account_type}
                      helperText={errors.account_type}
                      margin="normal"
                    />
                  )}
                  renderOption={(props, option) => (
                    <li {...props}>
                      <Typography>{option.name}</Typography>
                    </li>
                  )}
                />

                <TextField
                  fullWidth
                  label="Last 4"
                  value={formData.last_4 || ""}
                  onChange={(e) => handleChange("last_4", e.target.value)}
                  error={!!errors.last_4}
                  helperText={errors.last_4}
                  margin="normal"
                />

                <FormControl
                  fullWidth
                  error={!!errors.allocation}
                  required
                  margin="normal"
                >
                  <InputLabel>Allocation</InputLabel>
                  <Select
                    value={formData.allocation || ""}
                    label="Allocation"
                    onChange={(e) => handleChange("allocation", e.target.value)}
                  >
                    <MenuItem value="LI">Liquid</MenuItem>
                    <MenuItem value="FR">Frozen</MenuItem>
                    <MenuItem value="DF">Deep Freeze</MenuItem>
                  </Select>
                  {errors.allocation && (
                    <Typography color="error" variant="caption">
                      {errors.allocation}
                    </Typography>
                  )}
                </FormControl>
              </Box>

              {/* Right Column - Financial Data */}
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <TextField
                  fullWidth
                  label={
                    <Box
                      sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                    >
                      Balance
                      {linkedYnabAccountState && (
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
                  }
                  type="number"
                  value={formData.balance || ""}
                  onChange={(e) =>
                    handleChange("balance", parseFloat(e.target.value) || "")
                  }
                  error={!!errors.balance}
                  helperText={errors.balance}
                  margin="normal"
                  disabled={!!linkedYnabAccountState}
                  InputProps={{
                    startAdornment: (
                      <Typography variant="body2" sx={{ mr: 1 }}>
                        $
                      </Typography>
                    ),
                  }}
                />

                <TextField
                  fullWidth
                  label={
                    <Box
                      sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                    >
                      Cleared Balance
                      {linkedYnabAccountState && (
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
                  }
                  type="number"
                  value={formData.cleared_balance || ""}
                  onChange={(e) =>
                    handleChange(
                      "cleared_balance",
                      parseFloat(e.target.value) || ""
                    )
                  }
                  error={!!errors.cleared_balance}
                  helperText={errors.cleared_balance}
                  margin="normal"
                  disabled={!!linkedYnabAccountState}
                  InputProps={{
                    startAdornment: (
                      <Typography variant="body2" sx={{ mr: 1 }}>
                        $
                      </Typography>
                    ),
                  }}
                />

                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                    gap: 2,
                  }}
                >
                  <FormControl
                    fullWidth
                    margin="normal"
                    disabled={!!linkedYnabAccountState}
                  >
                    <InputLabel>
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                      >
                        On Budget
                        {linkedYnabAccountState && (
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
                    </InputLabel>
                    <Select
                      value={formData.on_budget ? "true" : "false"}
                      label="On Budget"
                      onChange={(e) =>
                        handleChange("on_budget", e.target.value === "true")
                      }
                    >
                      <MenuItem value="true">Yes</MenuItem>
                      <MenuItem value="false">No</MenuItem>
                    </Select>
                  </FormControl>

                  <FormControl
                    fullWidth
                    margin="normal"
                    disabled={!!linkedYnabAccountState}
                  >
                    <InputLabel>
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                      >
                        Closed
                        {linkedYnabAccountState && (
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
                    </InputLabel>
                    <Select
                      value={formData.closed ? "true" : "false"}
                      label="Closed"
                      onChange={(e) =>
                        handleChange("closed", e.target.value === "true")
                      }
                    >
                      <MenuItem value="true">Yes</MenuItem>
                      <MenuItem value="false">No</MenuItem>
                    </Select>
                  </FormControl>
                </Box>

                <TextField
                  fullWidth
                  label={
                    <Box
                      sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                    >
                      Last Reconciled
                      {linkedYnabAccountState && (
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
                  }
                  type="datetime-local"
                  value={
                    formData.last_reconciled_at
                      ? new Date(formData.last_reconciled_at)
                          .toISOString()
                          .slice(0, 16)
                      : ""
                  }
                  onChange={(e) =>
                    handleChange(
                      "last_reconciled_at",
                      e.target.value
                        ? new Date(e.target.value).toISOString()
                        : ""
                    )
                  }
                  error={!!errors.last_reconciled_at}
                  helperText={errors.last_reconciled_at}
                  margin="normal"
                  disabled={!!linkedYnabAccountState}
                  InputLabelProps={{
                    shrink: true,
                  }}
                />
              </Box>
            </Box>
          </Box>

          {/* Notes - Full Width */}
          <TextField
            fullWidth
            label="Notes"
            value={formData.notes || ""}
            onChange={(e) => handleChange("notes", e.target.value)}
            error={!!errors.notes}
            helperText={errors.notes}
            margin="normal"
            multiline
            rows={3}
          />

          {/* YNAB Account Linking */}
          <Box sx={{ mt: 2, mb: 1 }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                mb: 1,
              }}
            >
              <Typography variant="subtitle2">YNAB Account Link</Typography>
            </Box>

            {linkedYnabAccountState ? (
              <Box
                sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}
              >
                <Chip
                  label={linkedYnabAccountState.name}
                  variant="outlined"
                  color="primary"
                />
                <Button
                  size="small"
                  onClick={handleUnlinkYnabAccount}
                  disabled={linkMutation.isPending}
                >
                  Unlink
                </Button>
              </Box>
            ) : (
              <Autocomplete
                options={ynabAccounts}
                getOptionLabel={(option) => option.name}
                value={selectedYnabAccount}
                onChange={(_, newValue) => {
                  setSelectedYnabAccount(newValue);
                  // Populate form with YNAB data when account is selected
                  if (newValue) {
                    populateFormWithYnabData(newValue);
                  }
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Link to YNAB Account"
                    placeholder="Search YNAB accounts..."
                    size="small"
                  />
                )}
                renderOption={(props, option) => (
                  <li {...props}>
                    <Box>
                      <Typography variant="body2">{option.name}</Typography>
                      <Typography variant="caption" color="textSecondary">
                        {getYnabAccountTypeDisplayName(option.type)}
                      </Typography>
                    </Box>
                  </li>
                )}
              />
            )}

            {selectedYnabAccount && !linkedYnabAccountState && (
              <Button
                variant="outlined"
                size="small"
                onClick={handleLinkYnabAccount}
                disabled={linkMutation.isPending}
                sx={{ mt: 1 }}
                startIcon={
                  linkMutation.isPending ? (
                    <CircularProgress size={16} />
                  ) : undefined
                }
              >
                Link Account
              </Button>
            )}

            {/* YNAB Account Info */}
            {linkedYnabAccountState && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="caption" color="textSecondary">
                  YNAB Account Data
                </Typography>
                <Typography variant="body2" color="success.main">
                  ✓ Data populated from YNAB
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel || onClose} disabled={isLoading}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={isLoading}
          startIcon={isLoading ? <CircularProgress size={16} /> : undefined}
        >
          {account ? "Update" : "Create"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
