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
import CurrencyTextField from "./CurrencyTextField";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useState, useEffect } from "react";
import {
  ASSETS_URL,
  BANKS_URL,
  LOOKUP_BANKS_URL,
  ASSET_TYPES_URL,
  YNAB_ACCOUNTS_URL,
  LINKS_URL,
} from "../constants";
import LinkIcon from "@mui/icons-material/Link";

interface AssetFormDialogProps {
  open: boolean;
  onClose: (createdAsset?: any) => void;
  onCancel?: () => void; // Optional callback for cancel action
  asset?: any; // For editing existing assets
  defaultData?: any; // For pre-populating fields when creating new assets
  linkedYnabAccount?: any; // For pre-linking a YNAB account
}

export default function AssetFormDialog({
  open,
  onClose,
  onCancel,
  asset,
  defaultData,
  linkedYnabAccount,
}: AssetFormDialogProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch banks and asset types for dropdowns
  const { data: banks = [] } = useQuery({
    queryKey: [LOOKUP_BANKS_URL],
    queryFn: () => axios.get(LOOKUP_BANKS_URL).then((res) => res.data),
    enabled: open,
  });

  const { data: assetTypes = [] } = useQuery({
    queryKey: [ASSET_TYPES_URL],
    queryFn: () => axios.get(ASSET_TYPES_URL).then((res) => res.data),
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

  // Auto-refresh asset data when dialog is open and asset is linked
  const { data: refreshedAsset } = useQuery({
    queryKey: ["asset", asset?.id],
    queryFn: () =>
      axios.get(`${ASSETS_URL}${asset.id}/`).then((res) => res.data),
    enabled: open && !!asset?.id,
    refetchInterval: asset?.link_data ? 10000 : false, // Refresh every 10 seconds if linked
    refetchOnWindowFocus: true, // Refresh when window gains focus
  });

  // Use refreshed data if available
  const currentAsset = refreshedAsset || asset;

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
      // Don't auto-populate other fields as they might not be appropriate for assets
    }));
  };

  // Initialize form data when dialog opens
  useEffect(() => {
    if (open) {
      if (currentAsset) {
        // Editing existing asset
        setFormData({
          name: currentAsset.name || "",
          asset_type: currentAsset.asset_type || "",
          bank: currentAsset.bank || "",
          value: currentAsset.value || "",
          notes: currentAsset.notes || "",
          allocation: currentAsset.allocation || "LI",
          // YNAB synced fields
          balance: currentAsset.balance || "",
          cleared_balance: currentAsset.cleared_balance || "",
          on_budget: currentAsset.on_budget || false,
          closed: currentAsset.closed || false,
          last_reconciled_at: currentAsset.last_reconciled_at || "",
        });
        setLinkedYnabAccountState(
          currentAsset.link_data?.plugin_object || null
        );
        setSelectedYnabAccount(currentAsset.link_data?.plugin_object || null);
      } else {
        // Use defaultData for pre-populating fields when creating new assets
        setFormData({
          name: defaultData?.name || "",
          asset_type: defaultData?.asset_type || "",
          bank: defaultData?.bank || "",
          value: defaultData?.value || "",
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
  }, [open, currentAsset, defaultData, linkedYnabAccount]);

  const createMutation = useMutation({
    mutationFn: (data: any) => axios.post(ASSETS_URL, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [ASSETS_URL] });
      onClose(data); // Pass the created asset data
    },
    onError: (error: any) => {
      if (error.response?.data) {
        setErrors(error.response.data);
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => axios.put(`${ASSETS_URL}${asset.id}/`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ASSETS_URL] });
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
      if (linkedYnabAccountState && asset?.link_data?.id) {
        // Unlink existing asset - id is the link ID
        return axios.delete(`${LINKS_URL}${id}/`);
      } else {
        // Link new asset - id is the YNAB account ID
        return axios.post(LINKS_URL, {
          plugin_model: "account",
          plugin_id: id,
          core_model: "asset",
          core_id: asset.id,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ASSETS_URL] });
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
    if (linkedYnabAccountState && asset?.link_data?.id) {
      // Pass the link ID for deletion
      linkMutation.mutate(asset.link_data.id);
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

    if (cleanedData.asset_type === "") {
      cleanedData.asset_type = null;
    }

    // Convert empty strings to null for other optional fields
    if (cleanedData.notes === "") {
      cleanedData.notes = null;
    }

    if (cleanedData.stock_symbol === "") {
      cleanedData.stock_symbol = null;
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

    if (asset) {
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

  const handleCreateAssetType = async (typeName: string) => {
    try {
      const response = await axios.post(ASSET_TYPES_URL, { name: typeName });
      const newType = response.data;
      queryClient.invalidateQueries({ queryKey: [ASSET_TYPES_URL] });
      handleChange("asset_type", newType.id);
    } catch (error) {
      console.error("Error creating asset type:", error);
      setErrors((prev) => ({
        ...prev,
        asset_type: "Failed to create asset type",
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
      <DialogTitle>{asset ? "Edit Asset" : "Create New Asset"}</DialogTitle>
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
                {/* Asset Name */}
                <TextField
                  label="Asset Name"
                  value={formData.name || ""}
                  onChange={(e) => handleChange("name", e.target.value)}
                  error={!!errors.name}
                  helperText={errors.name}
                  fullWidth
                  required
                />

                {/* Asset Type */}
                <Autocomplete
                  freeSolo
                  selectOnFocus
                  clearOnBlur
                  handleHomeEndKeys
                  options={assetTypes}
                  getOptionLabel={(option) => {
                    if (typeof option === "string") return option;
                    return option.name || "";
                  }}
                  value={
                    assetTypes.find(
                      (type: any) => type.id === formData.asset_type
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
                        handleCreateAssetType(actualValue);
                      } else {
                        // User typed a new value, create it
                        handleCreateAssetType(newValue);
                      }
                    } else if (newValue) {
                      // User selected an existing option
                      handleChange("asset_type", newValue.id);
                    } else {
                      // User cleared the field
                      handleChange("asset_type", "");
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
                      label="Asset Type"
                      required
                      error={!!errors.asset_type}
                      helperText={errors.asset_type}
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

                {/* Value */}
                <CurrencyTextField
                  label="Value"
                  value={formData.value || ""}
                  onChange={(value) => handleChange("value", value)}
                  error={!!errors.value}
                  helperText={errors.value}
                  fullWidth
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
            {linkedYnabAccountState && currentAsset && (
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
                      ${(currentAsset.balance || 0).toFixed(2)}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="textSecondary">
                      Cleared Balance
                    </Typography>
                    <Typography variant="body2">
                      ${(currentAsset.cleared_balance || 0).toFixed(2)}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="textSecondary">
                      On Budget
                    </Typography>
                    <Typography variant="body2">
                      {currentAsset.on_budget ? "Yes" : "No"}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="textSecondary">
                      Closed
                    </Typography>
                    <Typography variant="body2">
                      {currentAsset.closed ? "Yes" : "No"}
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
          disabled={isLoading || !formData.name || !formData.asset_type}
        >
          {isLoading ? (
            <CircularProgress size={20} />
          ) : asset ? (
            "Update Asset"
          ) : (
            "Create Asset"
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
