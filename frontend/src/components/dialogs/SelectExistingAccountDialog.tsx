import React, { useState } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  CircularProgress,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { DATA_ACCOUNTS_URL } from "../../constants";

type SelectExistingAccountDialogProps = {
  open: boolean;
  onClose: () => void;
  onSelectAccount: (accountId: number) => void;
};

export default function SelectExistingAccountDialog({
  open,
  onClose,
  onSelectAccount,
}: SelectExistingAccountDialogProps) {
  const { data: accounts, isLoading } = useQuery({
    queryKey: ["data-accounts"],
    queryFn: () => axios.get(DATA_ACCOUNTS_URL).then((res) => res.data),
    enabled: open,
  });

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Select an Existing Account</DialogTitle>
      <DialogContent>
        <List>
          {accounts?.map((account: any) => (
            <ListItem disablePadding key={account.id}>
              <ListItemButton onClick={() => onSelectAccount(account.id)}>
                <ListItemText
                  primary={account.name}
                  secondary={account.bank.name}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
      </DialogActions>
    </Dialog>
  );
}
