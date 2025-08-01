import React, { useState } from "react";
import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Checkbox,
  IconButton,
  Button,
  Tooltip,
} from "@mui/material";
import {
  KeyboardArrowUp as UpIcon,
  KeyboardArrowDown as DownIcon,
  Settings as SettingsIcon,
} from "@mui/icons-material";

interface TransferListProps {
  available: string[];
  displayed: string[];
  onMoveToDisplayed: (fields: string[]) => void;
  onMoveToAvailable: (fields: string[]) => void;
  onReorderDisplayed: (newOrder: string[]) => void;
  recordType: string;
  onColumnConfigChange: (field: string, config: any) => void;
  columns: any[];
}

const TransferList: React.FC<TransferListProps> = ({
  available,
  displayed,
  onMoveToDisplayed,
  onMoveToAvailable,
  onReorderDisplayed,
  recordType,
  onColumnConfigChange,
  columns,
}) => {
  const [selectedAvailable, setSelectedAvailable] = useState<string[]>([]);
  const [selectedDisplayed, setSelectedDisplayed] = useState<string[]>([]);

  const moveItemUp = (index: number) => {
    if (index > 0) {
      const newOrder = [...displayed];
      [newOrder[index], newOrder[index - 1]] = [
        newOrder[index - 1],
        newOrder[index],
      ];
      onReorderDisplayed(newOrder);
    }
  };

  const moveItemDown = (index: number) => {
    if (index < displayed.length - 1) {
      const newOrder = [...displayed];
      [newOrder[index], newOrder[index + 1]] = [
        newOrder[index + 1],
        newOrder[index],
      ];
      onReorderDisplayed(newOrder);
    }
  };

  const handleAvailableToggle = (field: string) => {
    setSelectedAvailable((prev) =>
      prev.includes(field) ? prev.filter((f) => f !== field) : [...prev, field]
    );
  };

  const handleDisplayedToggle = (field: string) => {
    setSelectedDisplayed((prev) =>
      prev.includes(field) ? prev.filter((f) => f !== field) : [...prev, field]
    );
  };

  const handleMoveToDisplayed = () => {
    if (selectedAvailable.length > 0) {
      onMoveToDisplayed(selectedAvailable);
      setSelectedAvailable([]);
    }
  };

  const handleMoveToAvailable = () => {
    if (selectedDisplayed.length > 0) {
      onMoveToAvailable(selectedDisplayed);
      setSelectedDisplayed([]);
    }
  };

  const getColumnDisplayName = (field: string) => {
    const column = columns.find((col) => col.field === field);
    return column ? column.headerName : field;
  };

  return (
    <Box sx={{ display: "flex", gap: 2, height: 400 }}>
      {/* Available Columns */}
      <Paper sx={{ flex: 1, p: 2 }}>
        <Typography variant="h6" sx={{ mb: 2, color: "#2C3E50" }}>
          Available Columns ({available.length})
        </Typography>
        <List sx={{ maxHeight: 320, overflow: "auto" }}>
          {available.map((field) => (
            <ListItem
              key={field}
              dense
              sx={{
                border: "1px solid #E9ECEF",
                borderRadius: 1,
                mb: 1,
                "&:hover": {
                  backgroundColor: "#F8F9FA",
                },
              }}
            >
              <ListItemIcon>
                <Checkbox
                  checked={selectedAvailable.includes(field)}
                  onChange={() => handleAvailableToggle(field)}
                  size="small"
                />
              </ListItemIcon>
              <ListItemText
                primary={getColumnDisplayName(field)}
                secondary={`(${field})`}
                primaryTypographyProps={{
                  variant: "body2",
                  color: "#2C3E50",
                }}
                secondaryTypographyProps={{
                  variant: "caption",
                  color: "#6C757D",
                }}
              />
            </ListItem>
          ))}
        </List>
      </Paper>

      {/* Transfer Buttons */}
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 1,
        }}
      >
        <Button
          variant="outlined"
          onClick={handleMoveToDisplayed}
          disabled={selectedAvailable.length === 0}
          sx={{ minWidth: 40, p: 1 }}
        >
          &gt;&gt;
        </Button>
        <Button
          variant="outlined"
          onClick={handleMoveToAvailable}
          disabled={selectedDisplayed.length === 0}
          sx={{ minWidth: 40, p: 1 }}
        >
          &lt;&lt;
        </Button>
      </Box>

      {/* Displayed Columns */}
      <Paper sx={{ flex: 1, p: 2 }}>
        <Typography variant="h6" sx={{ mb: 2, color: "#2C3E50" }}>
          Displayed Columns ({displayed.length})
        </Typography>
        <Typography
          variant="caption"
          sx={{ color: "#6C757D", mb: 2, display: "block" }}
        >
          Use arrows to reorder • Check to select for transfer
        </Typography>
        <List sx={{ maxHeight: 320, overflow: "auto" }}>
          {displayed.map((field, index) => (
            <ListItem
              key={field}
              dense
              sx={{
                border: "1px solid #E9ECEF",
                borderRadius: 1,
                mb: 1,
                "&:hover": {
                  backgroundColor: "#F8F9FA",
                },
              }}
            >
              <ListItemIcon>
                <Checkbox
                  checked={selectedDisplayed.includes(field)}
                  onChange={() => handleDisplayedToggle(field)}
                  size="small"
                />
              </ListItemIcon>
              <ListItemText
                primary={getColumnDisplayName(field)}
                secondary={`(${field})`}
                primaryTypographyProps={{
                  variant: "body2",
                  color: "#2C3E50",
                }}
                secondaryTypographyProps={{
                  variant: "caption",
                  color: "#6C757D",
                }}
              />
              <Box sx={{ display: "flex", gap: 0.5 }}>
                <Tooltip title="Move up">
                  <IconButton
                    size="small"
                    onClick={() => moveItemUp(index)}
                    disabled={index === 0}
                  >
                    <UpIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Move down">
                  <IconButton
                    size="small"
                    onClick={() => moveItemDown(index)}
                    disabled={index === displayed.length - 1}
                  >
                    <DownIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Column settings">
                  <IconButton size="small" disabled>
                    <SettingsIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            </ListItem>
          ))}
        </List>
      </Paper>
    </Box>
  );
};

export default TransferList;
