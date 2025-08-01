import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
} from "@mui/material";
import { useState } from "react";
import AccountFormDialog from "./AccountFormDialog";
import SelectExistingAccountDialog from "./SelectExistingAccountDialog";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { API_BASE_URL } from "../../constants";

type LinkAccountDialogProps = {
  open: boolean;
  onClose: () => void;
  ynabAccountId?: string;
  ynabAccountName?: string;
};

export default function LinkAccountDialog({
  open,
  onClose,
  ynabAccountId,
  ynabAccountName,
}: LinkAccountDialogProps) {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSelectOpen, setIsSelectOpen] = useState(false);

  const linkAccountMutation = useMutation({
    mutationFn: (faAccountId: number) => {
      return axios.post(
        `${API_BASE_URL}/ynab/accounts/${ynabAccountId}/link/`,
        {
          fa_account_id: faAccountId,
        }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ynabAccounts"] });
      onClose();
    },
    // TODO: Add error handling
  });

  const handleCreateClick = () => {
    setIsCreateOpen(true);
    onClose(); // Close the link dialog
  };

  const handleCreateDialogClose = () => {
    setIsCreateOpen(false);
  };

  const handleSelectClick = () => {
    setIsSelectOpen(true);
    onClose(); // Close the link dialog
  };

  const handleSelectDialogClose = () => {
    setIsSelectOpen(false);
  };

  const handleAccountSelected = (accountId: number) => {
    linkAccountMutation.mutate(accountId);
    handleSelectDialogClose();
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
        <DialogTitle>Link "{ynabAccountName}"</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ marginTop: 2 }}>
            <Button variant="contained" onClick={handleCreateClick}>
              Create New Linked Account
            </Button>
            <Button variant="outlined" onClick={handleSelectClick}>
              Link to Existing Account
            </Button>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
        </DialogActions>
      </Dialog>
      <AccountFormDialog
        open={isCreateOpen}
        onClose={handleCreateDialogClose}
        defaultValues={{ name: ynabAccountName }}
      />
      <SelectExistingAccountDialog
        open={isSelectOpen}
        onClose={handleSelectDialogClose}
        onSelectAccount={handleAccountSelected}
      />
    </>
  );
}
