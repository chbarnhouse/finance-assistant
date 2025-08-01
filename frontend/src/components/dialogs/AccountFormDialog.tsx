import React, { useState, useEffect } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  TextField,
  Select,
  FormControl,
  InputLabel,
  CircularProgress,
} from "@mui/material";
import CurrencyTextField from "../CurrencyTextField";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import {
  DATA_ACCOUNTS_URL,
  DATA_ACCOUNT_TYPES_URL,
  DATA_BANKS_URL,
} from "../../constants";

type AccountFormData = {
  name: string;
  bank: number;
  account_type: number;
  account_number: string;
  balance: number;
};

type AccountFormDialogProps = {
  open: boolean;
  onClose: () => void;
  defaultValues?: Partial<AccountFormData>;
};

export default function AccountFormDialog({
  open,
  onClose,
  defaultValues,
}: AccountFormDialogProps) {
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset, watch, setValue } =
    useForm<AccountFormData>({
      defaultValues,
    });

  const { data: banks, isLoading: isLoadingBanks } = useQuery({
    queryKey: ["data-banks"],
    queryFn: () => axios.get(DATA_BANKS_URL).then((res) => res.data),
    enabled: open,
  });

  const { data: accountTypes, isLoading: isLoadingAccountTypes } = useQuery({
    queryKey: ["data-account-types"],
    queryFn: () => axios.get(DATA_ACCOUNT_TYPES_URL).then((res) => res.data),
    enabled: open,
  });

  const mutation = useMutation({
    mutationFn: (newAccount: AccountFormData) => {
      if (account) {
        return axios.put(`${DATA_ACCOUNTS_URL}${account.id}/`, newAccount);
      } else {
        return axios.post(DATA_ACCOUNTS_URL, newAccount);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      onClose();
      reset();
    },
  });

  const onSubmit = (data: AccountFormData) => {
    mutation.mutate(data);
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Add New Account</DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent>
          <TextField
            autoFocus
            required
            margin="dense"
            label="Account Name"
            type="text"
            fullWidth
            variant="standard"
            {...register("name")}
          />
          <TextField
            select
            required
            margin="dense"
            label="Bank"
            fullWidth
            variant="standard"
            {...register("bank")}
            defaultValue=""
          >
            {banks?.map((bank: any) => (
              <MenuItem key={bank.id} value={bank.id}>
                {bank.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            required
            margin="dense"
            label="Account Type"
            fullWidth
            variant="standard"
            {...register("account_type")}
            defaultValue=""
          >
            {accountTypes?.map((accountType: any) => (
              <MenuItem key={accountType.id} value={accountType.id}>
                {accountType.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            margin="dense"
            label="Account Number"
            type="text"
            fullWidth
            variant="standard"
            {...register("account_number")}
          />
          <CurrencyTextField
            required
            margin="dense"
            label="Current Balance"
            fullWidth
            variant="standard"
            value={watch("balance") || 0.0}
            onChange={(value) => setValue("balance", parseFloat(value) || 0)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit">Save</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
