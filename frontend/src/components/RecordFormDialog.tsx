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
} from "@mui/material";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useState, useEffect } from "react";

interface RecordFormDialogProps {
  open: boolean;
  onClose: () => void;
  record?: any; // For editing existing records
  title: string;
  endpoint: string;
  fields: FormField[];
  onSuccess?: () => void;
}

interface FormField {
  name: string;
  label: string;
  type: "text" | "number" | "select" | "textarea";
  required?: boolean;
  options?: { value: any; label: string }[];
  optionsEndpoint?: string; // For dynamic options from API
  multiline?: boolean;
  rows?: number;
}

export default function RecordFormDialog({
  open,
  onClose,
  record,
  title,
  endpoint,
  fields,
  onSuccess,
}: RecordFormDialogProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset form when dialog opens/closes or record changes
  useEffect(() => {
    if (open) {
      if (record) {
        setFormData(record);
      } else {
        setFormData({});
      }
      setErrors({});
    }
  }, [open, record]);

  const createMutation = useMutation({
    mutationFn: (data: any) => axios.post(endpoint, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [endpoint] });
      onSuccess?.();
      onClose();
    },
    onError: (error: any) => {
      if (error.response?.data) {
        setErrors(error.response.data);
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => axios.put(`${endpoint}${record.id}/`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [endpoint] });
      onSuccess?.();
      onClose();
    },
    onError: (error: any) => {
      if (error.response?.data) {
        setErrors(error.response.data);
      }
    },
  });

  const handleSubmit = () => {
    if (record) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleChange = (fieldName: string, value: any) => {
    setFormData((prev) => ({ ...prev, [fieldName]: value }));
    // Clear error when user starts typing
    if (errors[fieldName]) {
      setErrors((prev) => ({ ...prev, [fieldName]: "" }));
    }
  };

  const renderField = (field: FormField) => {
    const value = formData[field.name] || "";
    const error = errors[field.name];

    if (field.type === "select") {
      return (
        <FormControl
          key={field.name}
          fullWidth
          error={!!error}
          required={field.required}
        >
          <InputLabel>{field.label}</InputLabel>
          <Select
            value={value}
            label={field.label}
            onChange={(e) => handleChange(field.name, e.target.value)}
          >
            {field.options?.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
          {error && (
            <Typography color="error" variant="caption">
              {error}
            </Typography>
          )}
        </FormControl>
      );
    }

    return (
      <TextField
        key={field.name}
        fullWidth
        label={field.label}
        type={field.type}
        value={value}
        onChange={(e) => handleChange(field.name, e.target.value)}
        required={field.required}
        error={!!error}
        helperText={error}
        multiline={field.multiline}
        rows={field.rows}
        margin="normal"
      />
    );
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 1 }}>{fields.map(renderField)}</Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isLoading}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={isLoading}
          startIcon={isLoading ? <CircularProgress size={16} /> : undefined}
        >
          {record ? "Update" : "Create"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
