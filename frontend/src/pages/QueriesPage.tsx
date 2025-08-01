import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  CircularProgress,
  Tooltip,
  Divider,
} from "@mui/material";
import {
  Add as AddIcon,
  PlayArrow as ExecuteIcon,
  History as HistoryIcon,
  Settings as SettingsIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  ContentCopy as CopyIcon,
  Download as DownloadIcon,
} from "@mui/icons-material";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import axios from "axios";
import { API_BASE_URL } from "../constants";

interface Query {
  id: string;
  name: string;
  description: string;
  query_type: "TRANSACTIONS" | "ACCOUNTS" | "CATEGORIES" | "PAYEES" | "CUSTOM";
  parameters: any;
  sql_query?: string;
  output_type: "SENSOR" | "CALENDAR" | "JSON" | "CSV";
  is_active: boolean;
  auto_refresh: boolean;
  refresh_interval_minutes: number;
  last_executed?: string;
  ha_entity_id?: string;
  ha_friendly_name?: string;
  ha_unit_of_measurement?: string;
  ha_device_class?: string;
  created_at: string;
  updated_at: string;
}

interface QueryResult {
  id: string;
  query: string;
  executed_at: string;
  execution_time_ms: number;
  status: "SUCCESS" | "ERROR" | "TIMEOUT";
  result_count: number;
  result_data: any;
  error_message?: string;
  parameters_used: any;
}

interface QueryTemplate {
  id: string;
  name: string;
  description: string;
  query_type: "TRANSACTIONS" | "ACCOUNTS" | "CATEGORIES" | "PAYEES" | "CUSTOM";
  template_parameters: any;
  sql_template?: string;
  category: "REPORTING" | "ANALYTICS" | "MONITORING" | "EXPORT" | "CUSTOM";
  usage_count: number;
  is_featured: boolean;
}

function QueriesPage() {
  const [queries, setQueries] = useState<Query[]>([]);
  const [queryResults, setQueryResults] = useState<QueryResult[]>([]);
  const [queryTemplates, setQueryTemplates] = useState<QueryTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [selectedQuery, setSelectedQuery] = useState<Query | null>(null);
  const [selectedResult, setSelectedResult] = useState<QueryResult | null>(
    null
  );
  const [executeDialogOpen, setExecuteDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<any>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingQuery, setEditingQuery] = useState<Query | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: "",
    description: "",
    query_type: "TRANSACTIONS" as const,
    parameters: {},
    sql_query: "",
    output_type: "JSON" as const,
    is_active: true,
    auto_refresh: false,
    refresh_interval_minutes: 30,
    ha_entity_id: "",
    ha_friendly_name: "",
    ha_unit_of_measurement: "",
    ha_device_class: "",
  });

  // Form states
  const [newQuery, setNewQuery] = useState({
    name: "",
    description: "",
    query_type: "TRANSACTIONS" as const,
    parameters: {},
    sql_query: "",
    output_type: "SENSOR" as const,
    is_active: true,
    auto_refresh: false,
    refresh_interval_minutes: 60,
    ha_entity_id: "",
    ha_friendly_name: "",
    ha_unit_of_measurement: "",
    ha_device_class: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [queriesRes, resultsRes, templatesRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/queries/`),
        axios.get(`${API_BASE_URL}/query-results/`),
        axios.get(`${API_BASE_URL}/query-templates/`),
      ]);
      setQueries(queriesRes.data);
      setQueryResults(resultsRes.data);
      setQueryTemplates(templatesRes.data);
    } catch (err) {
      setError("Failed to load query data");
      console.error("Error loading queries:", err);
    } finally {
      setLoading(false);
    }
  };

  const executeQuery = async (query: Query, parameters?: any) => {
    try {
      setExecuting(true);
      setExecutionResult(null);

      const response = await axios.post(
        `${API_BASE_URL}/queries/${query.id}/execute/`,
        {
          parameters: parameters || query.parameters,
        }
      );

      setExecutionResult(response.data);
      await loadData(); // Refresh results
    } catch (err) {
      setError("Failed to execute query");
      console.error("Error executing query:", err);
    } finally {
      setExecuting(false);
    }
  };

  const createQuery = async () => {
    try {
      await axios.post(`${API_BASE_URL}/queries/`, newQuery);
      setCreateDialogOpen(false);
      setNewQuery({
        name: "",
        description: "",
        query_type: "TRANSACTIONS",
        parameters: {},
        sql_query: "",
        output_type: "SENSOR",
        is_active: true,
        auto_refresh: false,
        refresh_interval_minutes: 60,
        ha_entity_id: "",
        ha_friendly_name: "",
        ha_unit_of_measurement: "",
        ha_device_class: "",
      });
      await loadData();
    } catch (err) {
      setError("Failed to create query");
      console.error("Error creating query:", err);
    }
  };

  const deleteQuery = async (queryId: string) => {
    if (!confirm("Are you sure you want to delete this query?")) return;

    try {
      await axios.delete(`${API_BASE_URL}/queries/${queryId}/`);
      await loadData();
    } catch (err) {
      setError("Failed to delete query");
      console.error("Error deleting query:", err);
    }
  };

  const initializeTemplates = async () => {
    try {
      await axios.post(`${API_BASE_URL}/query-templates/initialize/`);
      await loadData();
    } catch (err) {
      setError("Failed to initialize templates");
      console.error("Error initializing templates:", err);
    }
  };

  const createFromTemplate = async (template: QueryTemplate) => {
    try {
      const newQuery = {
        name: `${template.name} - Copy`,
        description: template.description,
        query_type: template.query_type,
        output_type: "JSON" as const,
        parameters: template.template_parameters || {},
        sql_query: template.sql_template,
        is_active: true,
        auto_refresh: false,
        refresh_interval_minutes: 30,
      };

      const response = await axios.post(`${API_BASE_URL}/queries/`, newQuery);
      setQueries((prev) => [...prev, response.data]);
      setActiveTab(0); // Switch to queries tab
      setError(null);
    } catch (error) {
      console.error("Error creating query from template:", error);
      setError("Failed to create query from template");
    }
  };

  const editQuery = async () => {
    if (!editingQuery) return;

    try {
      const response = await axios.put(
        `${API_BASE_URL}/queries/${editingQuery.id}/`,
        editFormData
      );

      setQueries((prev) =>
        prev.map((q) => (q.id === editingQuery.id ? response.data : q))
      );
      setEditDialogOpen(false);
      setEditingQuery(null);
      setError(null);
    } catch (error) {
      console.error("Error updating query:", error);
      setError("Failed to update query");
    }
  };

  const handleEditClick = (query: Query) => {
    setEditingQuery(query);
    setEditFormData({
      name: query.name,
      description: query.description,
      query_type: query.query_type,
      parameters: query.parameters || {},
      sql_query: query.sql_query || "",
      output_type: query.output_type,
      is_active: query.is_active,
      auto_refresh: query.auto_refresh,
      refresh_interval_minutes: query.refresh_interval_minutes,
      ha_entity_id: query.ha_entity_id || "",
      ha_friendly_name: query.ha_friendly_name || "",
      ha_unit_of_measurement: query.ha_unit_of_measurement || "",
      ha_device_class: query.ha_device_class || "",
    });
    setEditDialogOpen(true);
  };

  const queryColumns: GridColDef[] = [
    { field: "name", headerName: "Name", width: 200 },
    { field: "description", headerName: "Description", width: 300 },
    { field: "query_type", headerName: "Type", width: 120 },
    { field: "output_type", headerName: "Output", width: 120 },
    {
      field: "is_active",
      headerName: "Status",
      width: 100,
      renderCell: (params) => (
        <Chip
          label={params.value ? "Active" : "Inactive"}
          color={params.value ? "success" : "default"}
          size="small"
        />
      ),
    },
    {
      field: "last_executed",
      headerName: "Last Executed",
      width: 150,
      renderCell: (params) => {
        if (!params.value) return "Never";
        try {
          return new Date(params.value).toLocaleString();
        } catch (error) {
          return "Invalid Date";
        }
      },
    },
    {
      field: "actions",
      headerName: "Actions",
      width: 200,
      sortable: false,
      renderCell: (params) => (
        <Box>
          <Tooltip title="Execute">
            <IconButton
              size="small"
              onClick={() => {
                setSelectedQuery(params.row);
                setExecuteDialogOpen(true);
              }}
            >
              <ExecuteIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Edit">
            <IconButton
              size="small"
              onClick={() => handleEditClick(params.row)}
            >
              <EditIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton size="small" onClick={() => deleteQuery(params.row.id)}>
              <DeleteIcon />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  const resultColumns: GridColDef[] = [
    { field: "query", headerName: "Query", width: 200 },
    {
      field: "executed_at",
      headerName: "Executed At",
      width: 150,
      renderCell: (params) => {
        if (!params.value) return "N/A";
        try {
          return new Date(params.value).toLocaleString();
        } catch (error) {
          return "Invalid Date";
        }
      },
    },
    { field: "execution_time_ms", headerName: "Duration (ms)", width: 120 },
    {
      field: "status",
      headerName: "Status",
      width: 100,
      renderCell: (params) => (
        <Chip
          label={params.value || "Unknown"}
          color={params.value === "SUCCESS" ? "success" : "error"}
          size="small"
        />
      ),
    },
    { field: "result_count", headerName: "Results", width: 100 },
    {
      field: "actions",
      headerName: "Actions",
      width: 100,
      sortable: false,
      renderCell: (params) => (
        <Tooltip title="View Details">
          <IconButton
            size="small"
            onClick={() => setSelectedResult(params.row)}
          >
            <HistoryIcon />
          </IconButton>
        </Tooltip>
      ),
    },
  ];

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="400px"
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        <Typography variant="h4" component="h1">
          Query Engine
        </Typography>
        <Box>
          <Button
            variant="outlined"
            startIcon={<SettingsIcon />}
            onClick={initializeTemplates}
            sx={{ mr: 2 }}
          >
            Initialize Templates
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
          >
            Create Query
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Paper sx={{ width: "100%" }}>
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
        >
          <Tab label={`Queries (${queries.length})`} />
          <Tab label={`Results (${queryResults.length})`} />
          <Tab label={`Templates (${queryTemplates.length})`} />
        </Tabs>

        <Box sx={{ p: 2 }}>
          {activeTab === 0 && (
            <Box>
              {(() => {
                try {
                  return (
                    <DataGrid
                      rows={queries || []}
                      columns={queryColumns}
                      getRowId={(row) => row.id || Math.random().toString()}
                      autoHeight
                      disableRowSelectionOnClick
                      sx={{ border: "none" }}
                      errorMode="cell"
                      onError={(error) => {
                        console.error("DataGrid error:", error);
                        setError("Error loading queries data");
                      }}
                      componentsProps={{
                        cell: {
                          onError: (error) => {
                            console.error("Cell error:", error);
                            return null;
                          },
                        },
                      }}
                    />
                  );
                } catch (error) {
                  console.error("DataGrid render error:", error);
                  return (
                    <Alert severity="error">
                      Error loading queries. Please refresh the page.
                    </Alert>
                  );
                }
              })()}
            </Box>
          )}

          {activeTab === 1 && (
            <Box>
              {(() => {
                try {
                  return (
                    <DataGrid
                      rows={queryResults || []}
                      columns={resultColumns}
                      getRowId={(row) => row.id || Math.random().toString()}
                      autoHeight
                      disableRowSelectionOnClick
                      sx={{ border: "none" }}
                      errorMode="cell"
                      onError={(error) => {
                        console.error("DataGrid error:", error);
                        setError("Error loading query results data");
                      }}
                      componentsProps={{
                        cell: {
                          onError: (error) => {
                            console.error("Cell error:", error);
                            return null;
                          },
                        },
                      }}
                    />
                  );
                } catch (error) {
                  console.error("DataGrid render error:", error);
                  return (
                    <Alert severity="error">
                      Error loading query results. Please refresh the page.
                    </Alert>
                  );
                }
              })()}
            </Box>
          )}

          {activeTab === 2 && (
            <Grid container spacing={2}>
              {queryTemplates.map((template) => (
                <Grid item xs={12} md={6} lg={4} key={template.id}>
                  <Card>
                    <CardContent>
                      <Box
                        display="flex"
                        justifyContent="space-between"
                        alignItems="flex-start"
                      >
                        <Typography variant="h6" component="h3">
                          {template.name}
                        </Typography>
                        <Chip label={template.category} size="small" />
                      </Box>
                      <Typography color="text.secondary" sx={{ mb: 2 }}>
                        {template.description}
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 2 }}>
                        Type: {template.query_type}
                      </Typography>
                      <Box
                        display="flex"
                        justifyContent="space-between"
                        alignItems="center"
                      >
                        <Typography variant="body2" color="text.secondary">
                          Used {template.usage_count} times
                        </Typography>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => createFromTemplate(template)}
                        >
                          Use Template
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      </Paper>

      {/* Execute Query Dialog */}
      <Dialog
        open={executeDialogOpen}
        onClose={() => setExecuteDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Execute Query: {selectedQuery?.name}</DialogTitle>
        <DialogContent>
          {executing ? (
            <Box
              display="flex"
              justifyContent="center"
              alignItems="center"
              minHeight="200px"
            >
              <CircularProgress />
            </Box>
          ) : executionResult ? (
            <Box>
              <Typography variant="h6" gutterBottom>
                Execution Results
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Status: {executionResult.status} | Duration:{" "}
                {executionResult.execution_time_ms}ms | Results:{" "}
                {executionResult.result_count}
              </Typography>
              <Divider sx={{ my: 2 }} />
              <Box sx={{ maxHeight: 400, overflow: "auto" }}>
                <pre style={{ fontSize: "12px", whiteSpace: "pre-wrap" }}>
                  {JSON.stringify(executionResult.data, null, 2)}
                </pre>
              </Box>
            </Box>
          ) : (
            <Typography>
              Click Execute to run this query with its current parameters.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExecuteDialogOpen(false)}>Close</Button>
          {!executing && !executionResult && selectedQuery && (
            <Button
              variant="contained"
              startIcon={<ExecuteIcon />}
              onClick={() => executeQuery(selectedQuery)}
            >
              Execute
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Create Query Dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Create New Query</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Query Name"
                value={newQuery.name}
                onChange={(e) =>
                  setNewQuery({ ...newQuery, name: e.target.value })
                }
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                multiline
                rows={2}
                value={newQuery.description}
                onChange={(e) =>
                  setNewQuery({ ...newQuery, description: e.target.value })
                }
              />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Query Type</InputLabel>
                <Select
                  value={newQuery.query_type}
                  onChange={(e) =>
                    setNewQuery({
                      ...newQuery,
                      query_type: e.target.value as any,
                    })
                  }
                >
                  <MenuItem value="TRANSACTIONS">Transactions</MenuItem>
                  <MenuItem value="ACCOUNTS">Accounts</MenuItem>
                  <MenuItem value="CATEGORIES">Categories</MenuItem>
                  <MenuItem value="PAYEES">Payees</MenuItem>
                  <MenuItem value="CUSTOM">Custom SQL</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Output Type</InputLabel>
                <Select
                  value={newQuery.output_type}
                  onChange={(e) =>
                    setNewQuery({
                      ...newQuery,
                      output_type: e.target.value as any,
                    })
                  }
                >
                  <MenuItem value="SENSOR">Home Assistant Sensor</MenuItem>
                  <MenuItem value="CALENDAR">Home Assistant Calendar</MenuItem>
                  <MenuItem value="JSON">JSON Data</MenuItem>
                  <MenuItem value="CSV">CSV Export</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            {newQuery.query_type === "CUSTOM" && (
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="SQL Query"
                  multiline
                  rows={4}
                  value={newQuery.sql_query}
                  onChange={(e) =>
                    setNewQuery({ ...newQuery, sql_query: e.target.value })
                  }
                />
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={createQuery}>
            Create Query
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Query Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Edit Query: {editingQuery?.name}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Query Name"
                value={editFormData.name}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, name: e.target.value })
                }
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                multiline
                rows={2}
                value={editFormData.description}
                onChange={(e) =>
                  setEditFormData({
                    ...editFormData,
                    description: e.target.value,
                  })
                }
              />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Query Type</InputLabel>
                <Select
                  value={editFormData.query_type}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      query_type: e.target.value as any,
                    })
                  }
                >
                  <MenuItem value="TRANSACTIONS">Transactions</MenuItem>
                  <MenuItem value="ACCOUNTS">Accounts</MenuItem>
                  <MenuItem value="CATEGORIES">Categories</MenuItem>
                  <MenuItem value="PAYEES">Payees</MenuItem>
                  <MenuItem value="CUSTOM">Custom SQL</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Output Type</InputLabel>
                <Select
                  value={editFormData.output_type}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      output_type: e.target.value as any,
                    })
                  }
                >
                  <MenuItem value="SENSOR">Home Assistant Sensor</MenuItem>
                  <MenuItem value="CALENDAR">Home Assistant Calendar</MenuItem>
                  <MenuItem value="JSON">JSON Data</MenuItem>
                  <MenuItem value="CSV">CSV Export</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            {editFormData.query_type === "CUSTOM" && (
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="SQL Query"
                  multiline
                  rows={4}
                  value={editFormData.sql_query}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      sql_query: e.target.value,
                    })
                  }
                />
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={editQuery}>
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Query Result Details Dialog */}
      <Dialog
        open={!!selectedResult}
        onClose={() => setSelectedResult(null)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>Query Result Details</DialogTitle>
        <DialogContent>
          {selectedResult && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Execution Details
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Executed:{" "}
                {new Date(selectedResult.executed_at).toLocaleString()} |
                Duration: {selectedResult.execution_time_ms}ms | Status:{" "}
                {selectedResult.status}
              </Typography>
              {selectedResult.error_message && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {selectedResult.error_message}
                </Alert>
              )}
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" gutterBottom>
                Results ({selectedResult.result_count})
              </Typography>
              <Box sx={{ maxHeight: 400, overflow: "auto" }}>
                <pre style={{ fontSize: "12px", whiteSpace: "pre-wrap" }}>
                  {JSON.stringify(selectedResult.result_data, null, 2)}
                </pre>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedResult(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default QueriesPage;
