import {
  Typography,
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  DialogActions,
  IconButton,
  Chip,
  List,
  ListItem,
  ListItemText,
  Collapse,
  Paper,
} from "@mui/material";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import * as React from "react";
import { useMemo, useState } from "react";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/DeleteOutlined";
import LinkIcon from "@mui/icons-material/Link";
import LinkOffIcon from "@mui/icons-material/LinkOff";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import LinkRecordDialog from "../components/LinkRecordDialog";
import { API_BASE_URL, LINKS_URL } from "../constants";
import PageHeader from "../components/PageHeader";
import { useTheme } from "@mui/material/styles";
import { getPageStyles } from "../styles/theme";

interface Payee {
  id: number;
  name: string;
  parent: number | null;
  link_data: {
    id: number;
    plugin_record: {
      name: string;
    };
  } | null;
}

interface PayeeNode extends Payee {
  children: PayeeNode[];
}

// Function to build the tree
const buildTree = (items: Payee[]): PayeeNode[] => {
  const itemMap = new Map<number, PayeeNode>();
  const roots: PayeeNode[] = [];

  items.forEach((item) => {
    itemMap.set(item.id, { ...item, children: [] });
  });

  items.forEach((item) => {
    const node = itemMap.get(item.id);
    if (node) {
      if (item.parent) {
        const parentNode = itemMap.get(item.parent);
        if (parentNode) {
          parentNode.children.push(node);
        }
      } else {
        roots.push(node);
      }
    }
  });

  return roots;
};

export default function PayeesPage() {
  const theme = useTheme();
  const styles = getPageStyles(theme);
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [selectedPayee, setSelectedPayee] = useState<Partial<Payee> | null>(
    null
  );
  const [payeeForLinking, setPayeeForLinking] = useState<Payee | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());

  const toggleExpanded = (itemId: number) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  const {
    data: payees = [],
    isPending,
    error,
  } = useQuery<Payee[]>({
    queryKey: ["payees"],
    queryFn: () =>
      axios.get(`${API_BASE_URL}/payees/`).then((res) => {
        // Handle both paginated and non-paginated responses
        const responseData = res.data;
        if (Array.isArray(responseData)) {
          return responseData;
        } else if (responseData && Array.isArray(responseData.results)) {
          // Paginated response
          return responseData.results;
        } else {
          // Fallback to empty array
          return [];
        }
      }),
  });

  const createMutation = useMutation({
    mutationFn: (newPayee: Partial<Payee>) =>
      axios.post(`${API_BASE_URL}/payees/`, newPayee),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payees"] });
      setDialogOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (updatedPayee: Partial<Payee>) =>
      axios.put(`${API_BASE_URL}/payees/${updatedPayee.id}/`, updatedPayee),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payees"] });
      setDialogOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => axios.delete(`${API_BASE_URL}/payees/${id}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payees"] });
    },
  });

  const unlinkMutation = useMutation({
    mutationFn: (linkId: number) => axios.delete(`${LINKS_URL}/${linkId}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payees"] });
    },
  });

  const tree = useMemo(() => buildTree(payees), [payees]);

  const renderTreeItem = (item: PayeeNode, level: number = 0) => {
    const hasChildren = item.children.length > 0;
    const isExpanded = expandedItems.has(item.id);

    return (
      <Box key={item.id}>
        {/* Removed Droppable and Draggable */}
        <ListItem
          sx={{
            pl: level * 3 + 2,
            borderBottom: "1px solid",
            borderColor: "divider",
            "&:hover": {
              backgroundColor: "action.hover",
            },
            backgroundColor: "transparent", // Removed drag/drop background
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              width: "100%",
            }}
          >
            {/* Removed DragIndicatorIcon */}

            {hasChildren && (
              <IconButton
                size="small"
                onClick={() => toggleExpanded(item.id)}
                sx={{ mr: 1 }}
              >
                {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </IconButton>
            )}
            {!hasChildren && <Box sx={{ width: 32, mr: 1 }} />}

            <ListItemText primary={item.name} sx={{ flexGrow: 1 }} />

            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              {item.link_data && item.link_data.id ? (
                <Chip
                  label={item.link_data.plugin_record.name}
                  onDelete={() => unlinkMutation.mutate(item.link_data.id)}
                  deleteIcon={<LinkOffIcon />}
                  variant="outlined"
                  size="small"
                />
              ) : (
                <IconButton
                  size="small"
                  onClick={() => handleOpenLinkDialog(item)}
                >
                  <LinkIcon />
                </IconButton>
              )}
              <IconButton size="small" onClick={() => handleAddChild(item.id)}>
                <AddIcon />
              </IconButton>
              <IconButton size="small" onClick={() => handleEdit(item)}>
                <EditIcon />
              </IconButton>
              <IconButton size="small" onClick={() => handleDelete(item.id)}>
                <DeleteIcon />
              </IconButton>
            </Box>
          </Box>
        </ListItem>

        {hasChildren && (
          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {item.children.map((child) => renderTreeItem(child, level + 1))}
            </List>
          </Collapse>
        )}
      </Box>
    );
  };

  const handleOpenLinkDialog = (payee: Payee) => {
    setPayeeForLinking(payee);
    setLinkDialogOpen(true);
  };

  const handleCloseLinkDialog = () => {
    setPayeeForLinking(null);
    setLinkDialogOpen(false);
  };

  const handleAddRoot = () => {
    setSelectedPayee({ name: "", parent: null });
    setDialogOpen(true);
  };

  const handleAddChild = (parentId: number) => {
    setSelectedPayee({ name: "", parent: parentId });
    setDialogOpen(true);
  };

  const handleEdit = (payee: Payee) => {
    setSelectedPayee(payee);
    setDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (
      window.confirm(
        "Are you sure you want to delete this payee and all its children?"
      )
    ) {
      deleteMutation.mutate(id);
    }
  };

  const handleSave = () => {
    if (selectedPayee) {
      if (selectedPayee.id) {
        updateMutation.mutate(selectedPayee);
      } else {
        createMutation.mutate(selectedPayee);
      }
    }
  };

  if (isPending) return <Typography>Loading...</Typography>;
  if (error)
    return <Typography>An error has occurred: {error.message}</Typography>;

  return (
    <Box sx={styles.pageContainer}>
      <PageHeader
        title="Payees"
        variant="core"
        recordType="payees"
        onAddClick={handleAddRoot}
        showAdd={true}
        addButtonText="Add Root Payee"
      />
      {/* Removed DragDropContext */}
      <List
        component="nav"
        sx={{
          width: "100%",
          maxWidth: 360,
          bgcolor: "background.paper",
        }}
      >
        {tree.map((item) => renderTreeItem(item))}
      </List>
      {/* Removed provided.placeholder */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
        <DialogTitle>
          {selectedPayee?.id ? "Edit Payee" : "Add Payee"}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Payee Name"
            type="text"
            fullWidth
            value={selectedPayee?.name || ""}
            onChange={(e) =>
              setSelectedPayee((payee) =>
                payee ? { ...payee, name: e.target.value } : null
              )
            }
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSave}>Save</Button>
        </DialogActions>
      </Dialog>
      {payeeForLinking && (
        <LinkRecordDialog
          open={linkDialogOpen}
          onClose={handleCloseLinkDialog}
          coreRecordId={payeeForLinking.id}
          coreRecordName={payeeForLinking.name}
          coreModelName="payee"
          pluginName="ynab"
          pluginRecordType="payees"
        />
      )}
    </Box>
  );
}
