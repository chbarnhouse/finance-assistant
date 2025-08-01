import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Paper,
  Card,
  CardContent,
  Alert,
  CircularProgress,
  Divider,
  IconButton,
  Tooltip,
  Collapse,
} from "@mui/material";
import {
  ExpandMore as ExpandMoreIcon,
  PlayArrow as PlayArrowIcon,
  ContentCopy as ContentCopyIcon,
  Refresh as RefreshIcon,
  Code as CodeIcon,
  Settings as SettingsIcon,
  ExpandMore as ExpandMoreIcon2,
} from "@mui/icons-material";
import axios from "axios";
import { API_BASE_URL } from "../../../constants";
import PageHeader from "../../../components/PageHeader";
import { useTheme } from "@mui/material/styles";
import { getYNABPageStyles } from "../../../styles/theme";

interface Endpoint {
  method: string;
  path: string;
  description: string;
  parameters: string[];
  variables: string[];
}

interface EndpointGroup {
  title: string;
  endpoints: Endpoint[];
}

interface EndpointsData {
  [key: string]: EndpointGroup;
}

interface APIResponse {
  status: number;
  url: string;
  method: string;
  data: any;
}

const YNAB_COLORS = {
  primary: "#3B5EDA", // YNAB "Blurple"
  background: "#F8F9FA",
  surface: "#FFFFFF",
  text: "#2C3E50",
  border: "#E9ECEF",
};

const YNAB_APIEndpointsPage: React.FC = () => {
  const theme = useTheme();
  const styles = getYNABPageStyles(theme);
  const [endpoints, setEndpoints] = useState<EndpointsData>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedEndpoints, setExpandedEndpoints] = useState<{
    [key: string]: boolean;
  }>({});
  const [variables, setVariables] = useState<{
    [endpointKey: string]: { [key: string]: string };
  }>({});
  const [parameters, setParameters] = useState<{
    [endpointKey: string]: { [key: string]: string };
  }>({});
  const [body, setBody] = useState<{ [endpointKey: string]: string }>({});
  const [apiResponses, setApiResponses] = useState<{
    [endpointKey: string]: APIResponse | null;
  }>({});
  const [apiLoading, setApiLoading] = useState<{
    [endpointKey: string]: boolean;
  }>({});
  const [apiErrors, setApiErrors] = useState<{
    [endpointKey: string]: string | null;
  }>({});
  const [availableData, setAvailableData] = useState<{
    budgets: any[];
    accounts: any[];
    categories: any[];
    payees: any[];
    months: any[];
  }>({
    budgets: [],
    accounts: [],
    categories: [],
    payees: [],
    months: [],
  });

  // Fetch endpoints data
  useEffect(() => {
    fetchEndpoints();
    fetchAvailableData();
  }, []);

  const fetchEndpoints = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/ynab/api-endpoints/`);
      setEndpoints(response.data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to fetch endpoints");
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableData = async () => {
    try {
      // Fetch budgets
      const budgetsResponse = await axios.get(`${API_BASE_URL}/ynab/budgets/`);
      setAvailableData((prev) => ({
        ...prev,
        budgets: budgetsResponse.data.data.budgets || [],
      }));

      // Fetch other data if budget is configured
      const configResponse = await axios.get(`${API_BASE_URL}/ynab/config/`);
      if (configResponse.data.budget_id) {
        const budgetId = configResponse.data.budget_id;

        // Fetch accounts
        try {
          const accountsResponse = await axios.get(
            `${API_BASE_URL}/ynab/accounts/`
          );
          setAvailableData((prev) => ({
            ...prev,
            accounts: accountsResponse.data.data.accounts || [],
          }));
        } catch (err) {
          console.log("Could not fetch accounts");
        }

        // Fetch categories
        try {
          const categoriesResponse = await axios.get(
            `${API_BASE_URL}/ynab/categories/`
          );
          setAvailableData((prev) => ({
            ...prev,
            categories: categoriesResponse.data.data.categories || [],
          }));
        } catch (err) {
          console.log("Could not fetch categories");
        }

        // Fetch payees
        try {
          const payeesResponse = await axios.get(
            `${API_BASE_URL}/ynab/payees/`
          );
          setAvailableData((prev) => ({
            ...prev,
            payees: payeesResponse.data.data.payees || [],
          }));
        } catch (err) {
          console.log("Could not fetch payees");
        }

        // Fetch months
        try {
          const monthsResponse = await axios.get(
            `${API_BASE_URL}/ynab/months/`
          );
          setAvailableData((prev) => ({
            ...prev,
            months: monthsResponse.data.data.months || [],
          }));
        } catch (err) {
          console.log("Could not fetch months");
        }
      }
    } catch (err) {
      console.log("Could not fetch available data");
    }
  };

  const handleEndpointToggle = (endpointKey: string) => {
    setExpandedEndpoints((prev) => ({
      ...prev,
      [endpointKey]: !prev[endpointKey],
    }));
  };

  const getVariableOptions = (variableName: string) => {
    switch (variableName) {
      case "budget_id":
        return availableData.budgets.map((budget) => ({
          value: budget.id,
          label: budget.name,
        }));
      case "account_id":
        return availableData.accounts.map((account) => ({
          value: account.id,
          label: account.name,
        }));
      case "category_id":
        return availableData.categories.map((category) => ({
          value: category.id,
          label: category.name,
        }));
      case "payee_id":
        return availableData.payees.map((payee) => ({
          value: payee.id,
          label: payee.name,
        }));
      case "month":
        return availableData.months.map((month) => ({
          value: month.month,
          label: month.month,
        }));
      default:
        return [];
    }
  };

  const makeAPICall = async (endpoint: Endpoint, endpointKey: string) => {
    try {
      setApiLoading((prev) => ({ ...prev, [endpointKey]: true }));
      setApiErrors((prev) => ({ ...prev, [endpointKey]: null }));
      setApiResponses((prev) => ({ ...prev, [endpointKey]: null }));

      const requestData = {
        method: endpoint.method,
        endpoint: endpoint.path,
        variables: variables[endpointKey] || {},
        parameters: parameters[endpointKey] || {},
        body: body[endpointKey] ? JSON.parse(body[endpointKey]) : {},
      };

      const response = await axios.post(
        `${API_BASE_URL}/ynab/api-endpoints/`,
        requestData
      );
      setApiResponses((prev) => ({ ...prev, [endpointKey]: response.data }));
    } catch (err: any) {
      setApiErrors((prev) => ({
        ...prev,
        [endpointKey]: err.response?.data?.error || "API call failed",
      }));
    } finally {
      setApiLoading((prev) => ({ ...prev, [endpointKey]: false }));
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const getMethodColor = (method: string) => {
    switch (method.toUpperCase()) {
      case "GET":
        return "#61AFFE";
      case "POST":
        return "#49CC90";
      case "PUT":
        return "#FCA130";
      case "PATCH":
        return "#50E3C2";
      case "DELETE":
        return "#F93E3E";
      default:
        return "#6C757D";
    }
  };

  const getEndpointKey = (groupKey: string, endpointIndex: number) =>
    `${groupKey}_${endpointIndex}`;

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

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box sx={styles.pageContainer}>
      <PageHeader
        title="API Endpoints"
        variant="ynab"
        recordType="ynabAPIEndpoints"
        onSettingsClick={fetchEndpoints}
        showSettings={true}
        showSync={false}
        settingsTooltip="Refresh endpoints"
      />

      <Typography variant="body1" sx={{ color: YNAB_COLORS.text, mb: 3 }}>
        Explore and test all available YNAB API endpoints. Click on any endpoint
        to expand and test it directly.
      </Typography>

      <Paper
        sx={{
          p: 2,
          backgroundColor: YNAB_COLORS.surface,
          border: `1px solid ${YNAB_COLORS.border}`,
        }}
      >
        <Typography
          variant="h6"
          sx={{ color: YNAB_COLORS.text, mb: 2, fontWeight: 600 }}
        >
          Available Endpoints
        </Typography>

        {Object.entries(endpoints).map(([groupKey, group]) => (
          <Accordion
            key={groupKey}
            sx={{
              mb: 1,
              boxShadow: "none",
              border: `1px solid ${YNAB_COLORS.border}`,
            }}
          >
            <AccordionSummary
              expandIcon={
                <ExpandMoreIcon sx={{ color: YNAB_COLORS.primary }} />
              }
              sx={{
                backgroundColor: YNAB_COLORS.background,
                "&:hover": { backgroundColor: YNAB_COLORS.border },
              }}
            >
              <Typography sx={{ fontWeight: 600, color: YNAB_COLORS.text }}>
                {group.title}
              </Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ p: 0 }}>
              {group.endpoints.map((endpoint, endpointIndex) => {
                const endpointKey = getEndpointKey(groupKey, endpointIndex);
                const isExpanded = expandedEndpoints[endpointKey];
                const currentVariables = variables[endpointKey] || {};
                const currentParameters = parameters[endpointKey] || {};
                const currentBody = body[endpointKey] || "";
                const currentResponse = apiResponses[endpointKey];
                const currentError = apiErrors[endpointKey];
                const isLoading = apiLoading[endpointKey];

                return (
                  <Box key={endpointIndex}>
                    <Box
                      sx={{
                        p: 2,
                        borderBottom:
                          endpointIndex < group.endpoints.length - 1
                            ? `1px solid ${YNAB_COLORS.border}`
                            : "none",
                        cursor: "pointer",
                        "&:hover": { backgroundColor: YNAB_COLORS.background },
                        backgroundColor: isExpanded
                          ? YNAB_COLORS.background
                          : "transparent",
                      }}
                      onClick={() => handleEndpointToggle(endpointKey)}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                          mb: 1,
                        }}
                      >
                        <Chip
                          label={endpoint.method}
                          size="small"
                          sx={{
                            backgroundColor: getMethodColor(endpoint.method),
                            color: "white",
                            fontWeight: 600,
                            fontSize: "0.75rem",
                          }}
                        />
                        <Typography
                          variant="body2"
                          sx={{
                            color: YNAB_COLORS.text,
                            fontFamily: "monospace",
                            flex: 1,
                          }}
                        >
                          {endpoint.path}
                        </Typography>
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEndpointToggle(endpointKey);
                          }}
                        >
                          <ExpandMoreIcon2
                            sx={{
                              transform: isExpanded
                                ? "rotate(180deg)"
                                : "rotate(0deg)",
                              transition: "transform 0.2s",
                            }}
                          />
                        </IconButton>
                      </Box>
                      <Typography
                        variant="body2"
                        sx={{ color: YNAB_COLORS.text, opacity: 0.8 }}
                      >
                        {endpoint.description}
                      </Typography>
                    </Box>

                    <Collapse in={isExpanded}>
                      <Box
                        sx={{
                          p: 2,
                          backgroundColor: YNAB_COLORS.surface,
                          borderTop: `1px solid ${YNAB_COLORS.border}`,
                        }}
                      >
                        {/* Variables */}
                        {endpoint.variables.length > 0 && (
                          <Box sx={{ mb: 2 }}>
                            <Typography
                              variant="subtitle2"
                              sx={{
                                color: YNAB_COLORS.text,
                                mb: 1,
                                fontWeight: 600,
                              }}
                            >
                              Variables
                            </Typography>
                            {endpoint.variables.map((variable) => {
                              const options = getVariableOptions(variable);
                              return (
                                <FormControl
                                  key={variable}
                                  fullWidth
                                  sx={{ mb: 1 }}
                                >
                                  <InputLabel>{variable}</InputLabel>
                                  <Select
                                    value={currentVariables[variable] || ""}
                                    onChange={(e) =>
                                      setVariables((prev) => ({
                                        ...prev,
                                        [endpointKey]: {
                                          ...prev[endpointKey],
                                          [variable]: e.target.value,
                                        },
                                      }))
                                    }
                                    label={variable}
                                  >
                                    {options.map((option) => (
                                      <MenuItem
                                        key={option.value}
                                        value={option.value}
                                      >
                                        {option.label}
                                      </MenuItem>
                                    ))}
                                  </Select>
                                </FormControl>
                              );
                            })}
                          </Box>
                        )}

                        {/* Parameters */}
                        {endpoint.parameters.length > 0 && (
                          <Box sx={{ mb: 2 }}>
                            <Typography
                              variant="subtitle2"
                              sx={{
                                color: YNAB_COLORS.text,
                                mb: 1,
                                fontWeight: 600,
                              }}
                            >
                              Parameters
                            </Typography>
                            {endpoint.parameters.map((param) => (
                              <TextField
                                key={param}
                                label={param}
                                value={currentParameters[param] || ""}
                                onChange={(e) =>
                                  setParameters((prev) => ({
                                    ...prev,
                                    [endpointKey]: {
                                      ...prev[endpointKey],
                                      [param]: e.target.value,
                                    },
                                  }))
                                }
                                fullWidth
                                size="small"
                                sx={{ mb: 1 }}
                              />
                            ))}
                          </Box>
                        )}

                        {/* Request Body */}
                        {["POST", "PUT", "PATCH"].includes(
                          endpoint.method.toUpperCase()
                        ) && (
                          <Box sx={{ mb: 2 }}>
                            <Typography
                              variant="subtitle2"
                              sx={{
                                color: YNAB_COLORS.text,
                                mb: 1,
                                fontWeight: 600,
                              }}
                            >
                              Request Body (JSON)
                            </Typography>
                            <TextField
                              multiline
                              rows={4}
                              value={currentBody}
                              onChange={(e) =>
                                setBody((prev) => ({
                                  ...prev,
                                  [endpointKey]: e.target.value,
                                }))
                              }
                              placeholder="Enter JSON body..."
                              fullWidth
                              sx={{
                                "& .MuiInputBase-input": {
                                  fontFamily: "monospace",
                                  fontSize: "0.875rem",
                                },
                              }}
                            />
                          </Box>
                        )}

                        {/* Execute Button */}
                        <Button
                          variant="contained"
                          onClick={(e) => {
                            e.stopPropagation();
                            makeAPICall(endpoint, endpointKey);
                          }}
                          disabled={isLoading}
                          startIcon={
                            isLoading ? (
                              <CircularProgress size={20} />
                            ) : (
                              <PlayArrowIcon />
                            )
                          }
                          sx={{
                            backgroundColor: YNAB_COLORS.primary,
                            "&:hover": {
                              backgroundColor: YNAB_COLORS.primary,
                              opacity: 0.9,
                            },
                            mb: 2,
                          }}
                        >
                          {isLoading ? "Making Request..." : "Execute Request"}
                        </Button>

                        {/* Response */}
                        {currentError && (
                          <Alert severity="error" sx={{ mb: 2 }}>
                            {currentError}
                          </Alert>
                        )}

                        {currentResponse && (
                          <Box>
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                                mb: 1,
                              }}
                            >
                              <Typography
                                variant="subtitle2"
                                sx={{
                                  color: YNAB_COLORS.text,
                                  fontWeight: 600,
                                }}
                              >
                                Response
                              </Typography>
                              <Chip
                                label={`${currentResponse.status} ${currentResponse.method}`}
                                size="small"
                                sx={{
                                  backgroundColor:
                                    currentResponse.status < 400
                                      ? "#49CC90"
                                      : "#F93E3E",
                                  color: "white",
                                }}
                              />
                              <Tooltip title="Copy response">
                                <IconButton
                                  size="small"
                                  onClick={() =>
                                    copyToClipboard(
                                      JSON.stringify(
                                        currentResponse.data,
                                        null,
                                        2
                                      )
                                    )
                                  }
                                >
                                  <ContentCopyIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Box>
                            <Paper
                              sx={{
                                p: 2,
                                backgroundColor: "#1A1A1A",
                                color: "white",
                                fontFamily: "monospace",
                                fontSize: "0.875rem",
                                maxHeight: "400px",
                                overflow: "auto",
                              }}
                            >
                              <pre
                                style={{ margin: 0, whiteSpace: "pre-wrap" }}
                              >
                                {JSON.stringify(currentResponse.data, null, 2)}
                              </pre>
                            </Paper>
                          </Box>
                        )}
                      </Box>
                    </Collapse>
                  </Box>
                );
              })}
            </AccordionDetails>
          </Accordion>
        ))}
      </Paper>
    </Box>
  );
};

export default YNAB_APIEndpointsPage;
