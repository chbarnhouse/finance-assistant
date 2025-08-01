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
  ListItemButton,
} from "@mui/material";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { API_BASE_URL, LINKS_URL } from "../constants";

interface LinkRecordDialogProps {
  open: boolean;
  onClose: () => void;
  coreRecordId: number | string;
  coreRecordName: string;
  coreModelName: string; // e.g., 'account', 'category'
  pluginName: "ynab";
  pluginRecordType: "accounts" | "categories" | "payees";
}

interface PluginRecord {
  id: number | string;
  name: string;
}

export default function LinkRecordDialog({
  open,
  onClose,
  coreRecordId,
  coreRecordName,
  coreModelName,
  pluginName,
  pluginRecordType,
}: LinkRecordDialogProps) {
  const queryClient = useQueryClient();

  const unlinkedRecordsUrl = `${API_BASE_URL}/${pluginName}/${pluginRecordType}/?linked=false`;

  const { data: records, isLoading: isLoadingRecords } = useQuery<
    PluginRecord[]
  >({
    queryKey: ["unlinked-records", pluginName, pluginRecordType],
    queryFn: () =>
      axios
        .get(unlinkedRecordsUrl)
        .then((res) => {
          // Ensure we always return an array
          const responseData = res.data;
          if (Array.isArray(responseData)) {
            return responseData;
          } else if (responseData && Array.isArray(responseData.results)) {
            return responseData.results;
          } else if (
            responseData &&
            responseData.data &&
            responseData.data[pluginRecordType]
          ) {
            // Handle YNAB API format: {'data': {'accounts': [...]}}
            return responseData.data[pluginRecordType];
          } else {
            console.warn("Unexpected records response format:", responseData);
            return [];
          }
        })
        .catch((error) => {
          console.error("Error fetching records:", error);
          return [];
        }),
    enabled: open,
  });

  const mutation = useMutation({
    mutationFn: (pluginRecordId: number | string) => {
      return axios.post(LINKS_URL, {
        plugin_model: pluginRecordType.slice(0, -1), // Remove 's' from end (accounts -> account)
        plugin_id: pluginRecordId,
        core_model: coreModelName,
        core_id: coreRecordId,
      });
    },
    onSuccess: () => {
      // Invalidate the query for the core model's data
      queryClient.invalidateQueries({ queryKey: [coreModelName] });
      // Invalidate the query for the unlinked records
      queryClient.invalidateQueries({
        queryKey: ["unlinked-records", pluginName, pluginRecordType],
      });
      onClose();
    },
  });

  const handleRecordClick = (record: PluginRecord) => {
    mutation.mutate(record.id);
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Link "{coreRecordName}" to a YNAB Record</DialogTitle>
      <DialogContent dividers>
        {isLoadingRecords ? (
          <CircularProgress />
        ) : !records || records.length === 0 ? (
          <Typography>No unlinked YNAB records found.</Typography>
        ) : (
          <>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
              Click on a YNAB record below to link it to "{coreRecordName}":
            </Typography>
            <List>
              {Array.isArray(records) &&
                records.map((record) => (
                  <ListItem key={record.id} disablePadding>
                    <ListItemButton
                      onClick={() => handleRecordClick(record)}
                      sx={{
                        "&:hover": {
                          backgroundColor: "action.hover",
                        },
                      }}
                    >
                      <ListItemText
                        primary={record.name}
                        primaryTypographyProps={{
                          sx: { fontWeight: 500 },
                        }}
                      />
                    </ListItemButton>
                  </ListItem>
                ))}
            </List>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
      </DialogActions>
    </Dialog>
  );
}
