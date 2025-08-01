import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  Typography,
} from "@mui/material";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { ACCOUNTS_URL, YNAB_ACCOUNTS_URL } from "../constants";

interface LinkAccountDialogProps {
  open: boolean;
  onClose: () => void;
  ynabAccountId: string;
}

export default function LinkAccountDialog({
  open,
  onClose,
  ynabAccountId,
}: LinkAccountDialogProps) {
  const queryClient = useQueryClient();

  const { data: faAccounts, isLoading } = useQuery<any[]>({
    queryKey: ["fa-accounts-unlinked"],
    queryFn: () =>
      axios
        .get(`${ACCOUNTS_URL}?unlinked=true`)
        .then((res) => {
          // Ensure we always return an array
          const responseData = res.data;
          if (Array.isArray(responseData)) {
            return responseData;
          } else if (responseData && Array.isArray(responseData.results)) {
            return responseData.results;
          } else {
            console.warn("Unexpected accounts response format:", responseData);
            return [];
          }
        })
        .catch((error) => {
          console.error("Error fetching accounts:", error);
          return [];
        }),
    enabled: open,
  });

  const mutation = useMutation({
    mutationFn: (faAccountId: number) => {
      return axios.patch(`${ACCOUNTS_URL}${faAccountId}/`, {
        plugin_id: ynabAccountId,
        plugin_name: "ynab",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [YNAB_ACCOUNTS_URL] });
      onClose();
    },
  });

  const handleSubmit = (accountId: number) => {
    mutation.mutate(accountId);
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Link to Existing Account</DialogTitle>
      <DialogContent>
        {isLoading ? (
          <CircularProgress />
        ) : (
          <List>
            {Array.isArray(faAccounts) && faAccounts.length > 0 ? (
              faAccounts.map((account: any) => (
                <ListItem
                  key={account.id}
                  secondaryAction={
                    <Button
                      variant="contained"
                      onClick={() => mutation.mutate(account.id)}
                    >
                      Link
                    </Button>
                  }
                >
                  <ListItemText
                    primary={account.name}
                    secondary={account.bank_name}
                  />
                </ListItem>
              ))
            ) : (
              <Typography>No unlinked accounts found.</Typography>
            )}
          </List>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
      </DialogActions>
    </Dialog>
  );
}
