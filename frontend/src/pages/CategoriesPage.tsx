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

interface Category {
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

interface CategoryNode extends Category {
  children: CategoryNode[];
}

// Function to build the tree
const buildTree = (items: Category[]): CategoryNode[] => {
  const itemMap = new Map<number, CategoryNode>();
  const roots: CategoryNode[] = [];

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

export default function CategoriesPage() {
  const theme = useTheme();
  const styles = getPageStyles(theme);
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] =
    useState<Partial<Category> | null>(null);
  const [categoryForLinking, setCategoryForLinking] = useState<Category | null>(
    null
  );
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
    data: categories = [],
    isPending,
    error,
  } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: () =>
      axios.get(`${API_BASE_URL}/categories/`).then((res) => {
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
    mutationFn: (newCategory: Partial<Category>) =>
      axios.post(`${API_BASE_URL}/categories/`, newCategory),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setDialogOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (updatedCategory: Partial<Category>) =>
      axios.put(
        `${API_BASE_URL}/categories/${updatedCategory.id}/`,
        updatedCategory
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setDialogOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      axios.delete(`${API_BASE_URL}/categories/${id}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });

  const unlinkMutation = useMutation({
    mutationFn: (linkId: number) => axios.delete(`${LINKS_URL}/${linkId}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });

  const tree = useMemo(() => buildTree(categories), [categories]);

  const renderTreeItem = (item: CategoryNode, level: number = 0) => {
    const hasChildren = item.children.length > 0;
    const isExpanded = expandedItems.has(item.id);

    return (
      <Box key={item.id}>
        <ListItem
          sx={{
            pl: level * 3 + 2,
            borderBottom: "1px solid",
            borderColor: "divider",
            "&:hover": {
              backgroundColor: "action.hover",
            },
            backgroundColor: "transparent",
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              width: "100%",
            }}
          >
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

  const handleOpenLinkDialog = (category: Category) => {
    setCategoryForLinking(category);
    setLinkDialogOpen(true);
  };

  const handleCloseLinkDialog = () => {
    setCategoryForLinking(null);
    setLinkDialogOpen(false);
  };

  const handleAddRoot = () => {
    setSelectedCategory({ name: "", parent: null });
    setDialogOpen(true);
  };

  const handleAddChild = (parentId: number) => {
    setSelectedCategory({ name: "", parent: parentId });
    setDialogOpen(true);
  };

  const handleEdit = (category: Category) => {
    setSelectedCategory(category);
    setDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (
      window.confirm(
        "Are you sure you want to delete this category and all its children?"
      )
    ) {
      deleteMutation.mutate(id);
    }
  };

  const handleSave = () => {
    if (selectedCategory) {
      if (selectedCategory.id) {
        updateMutation.mutate(selectedCategory);
      } else {
        createMutation.mutate(selectedCategory);
      }
    }
  };

  if (isPending) return <Typography>Loading...</Typography>;
  if (error)
    return <Typography>An error has occurred: {error.message}</Typography>;

  return (
    <Box sx={styles.pageContainer}>
      <PageHeader
        title="Categories"
        variant="core"
        recordType="categories"
        onAddClick={handleAddRoot}
        showAdd={true}
        addButtonText="Add Root Category"
      />
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
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
        <DialogTitle>
          {selectedCategory?.id ? "Edit Category" : "Add Category"}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Category Name"
            type="text"
            fullWidth
            value={selectedCategory?.name || ""}
            onChange={(e) =>
              setSelectedCategory((cat) =>
                cat ? { ...cat, name: e.target.value } : null
              )
            }
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSave}>Save</Button>
        </DialogActions>
      </Dialog>
      {categoryForLinking && (
        <LinkRecordDialog
          open={linkDialogOpen}
          onClose={handleCloseLinkDialog}
          coreRecordId={categoryForLinking.id}
          coreRecordName={categoryForLinking.name}
          coreModelName="category"
          pluginName="ynab"
          pluginRecordType="categories"
        />
      )}
    </Box>
  );
}
