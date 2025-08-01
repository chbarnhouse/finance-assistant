import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
} from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useState, useEffect } from "react";
import {
  ACCOUNTS_URL,
  ACCOUNT_TYPES_URL,
  LOOKUP_BANKS_URL,
} from "../../constants";

interface AddAccountDialogProps {
  open: boolean;
  onClose: () => void;
  initialData?: any;
}

export default function AddAccountDialog({
  open,
  onClose,
  initialData,
}: AddAccountDialogProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: "",
    bank: "",
    account_type: "",
    last_4: "",
    notes: "",
  });

  const { data: banks } = useQuery({
    queryKey: ["banks"],
    queryFn: () => axios.get(LOOKUP_BANKS_URL).then((res) => res.data),
    enabled: open,
  });

  const { data: accountTypes } = useQuery({
    queryKey: ["account-types"],
    queryFn: () => axios.get(ACCOUNT_TYPES_URL).then((res) => res.data),
    enabled: open,
  });

  const mutation = useMutation({
    mutationFn: (newAccount: any) => {
      return axios.post(ACCOUNTS_URL, newAccount);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ACCOUNTS_URL] });
      onClose();
    },
  });

  const handleChange = (e: any) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = () => {
    mutation.mutate(formData);
  };

  useEffect(() => {
    if (initialData) {
      setFormData((prev) => ({
        ...prev,
        name: initialData.name || "",
        notes: initialData.note || "",
      }));
    }
  }, [initialData]);

  useEffect(() => {
    if (open) {
      if (initialData) {
        setFormData((prev) => ({
          ...prev,
          name: initialData.name || "",
          notes: initialData.note || "",
          last_4: "", // Ensure last_4 is clear unless provided
        }));
      }
    } else {
      setFormData({
        name: "",
        bank: "",
        account_type: "",
        last_4: "",
        notes: "",
      });
    }
  }, [open, initialData]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Add New Account</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          name="name"
          label="Account Name"
          type="text"
          fullWidth
          variant="outlined"
          value={formData.name}
          onChange={handleChange}
        />
        <FormControl fullWidth margin="dense">
          <InputLabel>Bank</InputLabel>
          <Select
            name="bank"
            value={formData.bank}
            label="Bank"
            onChange={handleChange}
          >
            {banks?.map((bank: any) => (
              <MenuItem key={bank.id} value={bank.id}>
                {bank.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl fullWidth margin="dense">
          <InputLabel>Account Type</InputLabel>
          <Select
            name="account_type"
            value={formData.account_type}
            label="Account Type"
            onChange={handleChange}
          >
            {accountTypes?.map((type: any) => (
              <MenuItem key={type.id} value={type.id}>
                {type.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          margin="dense"
          name="last_4"
          label="Last 4 Digits"
          type="text"
          fullWidth
          variant="outlined"
          value={formData.last_4}
          onChange={handleChange}
        />
        <TextField
          margin="dense"
          name="notes"
          label="Notes"
          type="text"
          fullWidth
          multiline
          rows={4}
          variant="outlined"
          value={formData.notes}
          onChange={handleChange}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained">
          Add Account
        </Button>
      </DialogActions>
    </Dialog>
  );
}
