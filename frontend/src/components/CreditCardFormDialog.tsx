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
  CREDIT_CARDS_URL,
  BANKS_URL,
  LOOKUP_BANKS_URL,
  CREDIT_CARD_TYPES_URL,
  YNAB_ACCOUNTS_URL,
  LINKS_URL,
} from "../constants";
import LinkIcon from "@mui/icons-material/Link";

interface CreditCardFormDialogProps {
  open: boolean;
  onClose: (createdCreditCard?: any) => void;
  onCancel?: () => void; // Optional callback for cancel action
  creditCard?: any; // For editing existing credit cards
  defaultData?: any; // For pre-populating fields when creating new credit cards
  linkedYnabAccount?: any; // For pre-linking a YNAB account
}

export default function CreditCardFormDialog({
  open,
  onClose,
  onCancel,
  creditCard,
  defaultData,
  linkedYnabAccount,
}: CreditCardFormDialogProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch banks and credit card types for dropdowns
  const { data: banks = [] } = useQuery({
    queryKey: [LOOKUP_BANKS_URL],
    queryFn: () => axios.get(LOOKUP_BANKS_URL).then((res) => res.data),
    enabled: open,
  });

  const { data: creditCardTypes = [] } = useQuery({
    queryKey: [CREDIT_CARD_TYPES_URL],
    queryFn: () => axios.get(CREDIT_CARD_TYPES_URL).then((res) => res.data),
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

  // Auto-refresh credit card data when dialog is open and credit card is linked
  const { data: refreshedCreditCard } = useQuery({
    queryKey: ["credit-card", creditCard?.id],
    queryFn: () =>
      axios.get(`${CREDIT_CARDS_URL}${creditCard.id}/`).then((res) => res.data),
    enabled: open && !!creditCard?.id,
    refetchInterval: creditCard?.link_data ? 10000 : false, // Refresh every 10 seconds if linked
    refetchOnWindowFocus: true, // Refresh when window gains focus
  });

  // Use refreshed data if available
  const currentCreditCard = refreshedCreditCard || creditCard;

  // State for YNAB linking
  const [linkedYnabAccountState, setLinkedYnabAccountState] =
    useState<any>(null);
  const [selectedYnabAccount, setSelectedYnabAccount] = useState<any>(null);

  // Populate form with YNAB data
  const populateFormWithYnabData = (ynabAccount: any) => {
    setFormData((prev) => ({
      ...prev,
      name: ynabAccount.name,
      notes: ynabAccount.note || "",
      // Don't auto-populate other fields as they might not be appropriate for credit cards
    }));
  };

  // Initialize form data when dialog opens
  useEffect(() => {
    if (open) {
      if (currentCreditCard) {
        // Editing existing credit card
        setFormData({
          name: currentCreditCard.name || "",
          bank: currentCreditCard.bank || "",
          credit_card_type: currentCreditCard.credit_card_type || "",
          last_4: currentCreditCard.last_4 || "",
          notes: currentCreditCard.notes || "",
          allocation: currentCreditCard.allocation || "LI",
          // YNAB synced fields
          balance: currentCreditCard.balance || "",
          cleared_balance: currentCreditCard.cleared_balance || "",
          on_budget: currentCreditCard.on_budget || false,
          closed: currentCreditCard.closed || false,
          last_reconciled_at: currentCreditCard.last_reconciled_at || "",
        });
        setLinkedYnabAccountState(
          currentCreditCard.link_data?.plugin_object || null
        );
        setSelectedYnabAccount(
          currentCreditCard.link_data?.plugin_object || null
        );
      } else {
        // Use defaultData for pre-populating fields when creating new credit cards
        setFormData({
          name: defaultData?.name || "",
          bank: defaultData?.bank || "",
          credit_card_type: defaultData?.credit_card_type || "",
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
  }, [open, currentCreditCard, defaultData, linkedYnabAccount]);

  const createMutation = useMutation({
    mutationFn: (data: any) => axios.post(CREDIT_CARDS_URL, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [CREDIT_CARDS_URL] });
      onClose(data); // Pass the created credit card data
    },
    onError: (error: any) => {
      if (error.response?.data) {
        setErrors(error.response.data);
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) =>
      axios.put(`${CREDIT_CARDS_URL}${creditCard.id}/`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CREDIT_CARDS_URL] });
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
      if (linkedYnabAccountState && creditCard?.link_data?.id) {
        // Unlink existing credit card - id is the link ID
        return axios.delete(`${LINKS_URL}${id}/`);
      } else {
        // Link new credit card - id is the YNAB account ID
        return axios.post(LINKS_URL, {
          plugin_model: "account",
          plugin_id: id,
          core_model: "creditcard",
          core_id: creditCard.id,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CREDIT_CARDS_URL] });
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
    }
  };

  const handleUnlinkYnabAccount = () => {
    if (linkedYnabAccountState && creditCard?.link_data?.id) {
      // Pass the link ID for deletion
      linkMutation.mutate(creditCard.link_data.id);
      setLinkedYnabAccountState(null);
    }
  };

  const handleSubmit = () => {
    // Clean up the form data before sending
    const cleanedData = { ...formData };

    // Convert empty strings to null for optional foreign key fields
    if (cleanedData.bank === "") {
      cleanedData.bank = null;
    }

    if (cleanedData.credit_card_type === "") {
      cleanedData.credit_card_type = null;
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

    if (creditCard) {
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

  const handleCreateCreditCardType = async (typeName: string) => {
    try {
      const response = await axios.post(CREDIT_CARD_TYPES_URL, {
        name: typeName,
      });
      const newType = response.data;
      queryClient.invalidateQueries({ queryKey: [CREDIT_CARD_TYPES_URL] });
      handleChange("credit_card_type", newType.id);
    } catch (error) {
      console.error("Error creating credit card type:", error);
      setErrors((prev) => ({
        ...prev,
        credit_card_type: "Failed to create credit card type",
      }));
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      onClose();
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onClose={handleCancel} maxWidth="md" fullWidth>
      <DialogTitle>
        {creditCard ? "Edit Credit Card" : "Create New Credit Card"}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 1 }}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {/* Basic Information Section */}
            <Box>
              <Typography
                variant="subtitle2"
                sx={{ mb: 2, color: "text.secondary" }}
              >
                Basic Information
              </Typography>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                  gap: 3,
                }}
              >
                {/* Credit Card Name */}
                <TextField
                  label="Credit Card Name"
                  value={formData.name || ""}
                  onChange={(e) => handleChange("name", e.target.value)}
                  error={!!errors.name}
                  helperText={errors.name}
                  fullWidth
                  required
                />

                {/* Bank */}
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
                      error={!!errors.bank}
                      helperText={errors.bank}
                      fullWidth
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

                {/* Credit Card Type */}
                <Autocomplete
                  freeSolo
                  selectOnFocus
                  clearOnBlur
                  handleHomeEndKeys
                  options={creditCardTypes}
                  getOptionLabel={(option) => {
                    if (typeof option === "string") return option;
                    return option.name || "";
                  }}
                  value={
                    creditCardTypes.find(
                      (type: any) => type.id === formData.credit_card_type
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
                        handleCreateCreditCardType(actualValue);
                      } else {
                        // User typed a new value, create it
                        handleCreateCreditCardType(newValue);
                      }
                    } else if (newValue) {
                      // User selected an existing option
                      handleChange("credit_card_type", newValue.id);
                    } else {
                      // User cleared the field
                      handleChange("credit_card_type", "");
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
                      label="Credit Card Type"
                      required
                      error={!!errors.credit_card_type}
                      helperText={errors.credit_card_type}
                      fullWidth
                    />
                  )}
                  renderOption={(props, option) => (
                    <li {...props}>
                      <Typography>{option.name}</Typography>
                    </li>
                  )}
                />

                {/* Last 4 Digits */}
                <TextField
                  label="Last 4 Digits"
                  value={formData.last_4 || ""}
                  onChange={(e) => handleChange("last_4", e.target.value)}
                  error={!!errors.last_4}
                  helperText={errors.last_4}
                  fullWidth
                  inputProps={{ maxLength: 4 }}
                />

                {/* Allocation */}
                <FormControl fullWidth>
                  <InputLabel>Allocation</InputLabel>
                  <Select
                    value={formData.allocation || "LI"}
                    onChange={(e) => handleChange("allocation", e.target.value)}
                    label="Allocation"
                  >
                    <MenuItem value="LI">Liquid</MenuItem>
                    <MenuItem value="FR">Frozen</MenuItem>
                    <MenuItem value="DF">Deep Freeze</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            </Box>

            {/* Notes Section */}
            <Box>
              <Typography
                variant="subtitle2"
                sx={{ mb: 2, color: "text.secondary" }}
              >
                Additional Information
              </Typography>
              <TextField
                label="Notes"
                value={formData.notes || ""}
                onChange={(e) => handleChange("notes", e.target.value)}
                error={!!errors.notes}
                helperText={errors.notes}
                fullWidth
                multiline
                rows={3}
              />
            </Box>

            {/* YNAB Linking Section */}
            <Box>
              <Typography
                variant="subtitle2"
                sx={{ mb: 2, color: "text.secondary" }}
              >
                YNAB Integration
              </Typography>
              {linkedYnabAccountState ? (
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <Chip
                    icon={<LinkIcon />}
                    label={`Linked to ${linkedYnabAccountState.name}`}
                    color="primary"
                  />
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={handleUnlinkYnabAccount}
                    disabled={linkMutation.isPending}
                  >
                    Unlink
                  </Button>
                </Box>
              ) : (
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <Autocomplete
                    options={ynabAccounts}
                    getOptionLabel={(option) => option.name}
                    value={selectedYnabAccount}
                    onChange={(_, newValue) => setSelectedYnabAccount(newValue)}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Link to YNAB Account"
                        placeholder="Search YNAB accounts..."
                      />
                    )}
                    sx={{ flexGrow: 1 }}
                  />
                  <Button
                    variant="outlined"
                    onClick={handleLinkYnabAccount}
                    disabled={!selectedYnabAccount || linkMutation.isPending}
                  >
                    Link
                  </Button>
                </Box>
              )}
            </Box>

            {/* YNAB Synced Data Display */}
            {linkedYnabAccountState && currentCreditCard && (
              <Box>
                <Typography
                  variant="subtitle2"
                  sx={{ mb: 2, color: "text.secondary" }}
                >
                  YNAB Data
                </Typography>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                    gap: 2,
                  }}
                >
                  <Box>
                    <Typography variant="caption" color="textSecondary">
                      Balance
                    </Typography>
                    <Typography variant="body2">
                      ${(currentCreditCard.balance || 0).toFixed(2)}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="textSecondary">
                      Cleared Balance
                    </Typography>
                    <Typography variant="body2">
                      ${(currentCreditCard.cleared_balance || 0).toFixed(2)}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="textSecondary">
                      On Budget
                    </Typography>
                    <Typography variant="body2">
                      {currentCreditCard.on_budget ? "Yes" : "No"}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="textSecondary">
                      Closed
                    </Typography>
                    <Typography variant="body2">
                      {currentCreditCard.closed ? "Yes" : "No"}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            )}
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={isLoading || !formData.name || !formData.credit_card_type}
        >
          {isLoading ? (
            <CircularProgress size={20} />
          ) : creditCard ? (
            "Update Credit Card"
          ) : (
            "Create Credit Card"
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
