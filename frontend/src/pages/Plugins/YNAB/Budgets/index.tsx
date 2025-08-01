import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  CircularProgress,
  SelectChangeEvent,
} from "@mui/material";
import { Budget } from "./types";
import JsonView from "react18-json-view";
import "react18-json-view/src/style.css";
import PageSection from "../../../components/PageSection";
import YnabReadOnlyGrid from "../../../components/YnabReadOnlyGrid";
import type { GridColDef } from "@mui/x-data-grid";

// --- ListBudgets Component Logic ---
const listBudgetsColumns: GridColDef[] = [
  { field: "name", headerName: "Name", flex: 1 },
  {
    field: "last_modified_on",
    headerName: "Last Modified",
    flex: 1,
    type: "dateTime",
    valueGetter: (value) => (value ? new Date(value) : null),
  },
  { field: "first_month", headerName: "First Month", flex: 1 },
  { field: "last_month", headerName: "Last Month", flex: 1 },
];

const ListBudgetsSection: React.FC = () => {
  return (
    <YnabReadOnlyGrid
      endpoint="/api/ynab/budgets/"
      columns={listBudgetsColumns}
      title="GET /budgets"
    />
  );
};

// --- GetBudgetById Component Logic ---
const fetchBudgets = async (): Promise<Budget[]> => {
  const response = await axios.get<Budget[]>("/api/ynab/budgets/");
  return response.data;
};

const fetchBudgetById = async (budgetId: string | null) => {
  if (!budgetId) return null;
  const response = await axios.get(`/api/ynab/budgets/${budgetId}/`);
  return response.data;
};

const GetBudgetByIdSection: React.FC = () => {
  const [selectedBudgetId, setSelectedBudgetId] = useState<string | null>(null);

  const {
    data: budgets,
    isLoading: isLoadingBudgets,
    error: budgetsError,
  } = useQuery<Budget[]>({
    queryKey: ["budgets"],
    queryFn: fetchBudgets,
  });

  const {
    data: selectedBudget,
    isLoading: isLoadingSelectedBudget,
    error: selectedBudgetError,
  } = useQuery({
    queryKey: ["budget", selectedBudgetId],
    queryFn: () => fetchBudgetById(selectedBudgetId),
    enabled: !!selectedBudgetId,
  });

  const handleBudgetChange = (event: SelectChangeEvent<string>) => {
    setSelectedBudgetId(event.target.value as string);
  };

  return (
    <Box>
      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel id="budget-select-label">Select Budget</InputLabel>
        <Select
          labelId="budget-select-label"
          value={selectedBudgetId || ""}
          onChange={handleBudgetChange}
          disabled={isLoadingBudgets}
        >
          {budgets?.map((budget) => (
            <MenuItem key={budget.id} value={budget.id}>
              {budget.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {isLoadingBudgets && <CircularProgress />}
      {budgetsError && (
        <Typography color="error">
          Error loading budgets: {budgetsError.message}
        </Typography>
      )}

      {isLoadingSelectedBudget && <CircularProgress sx={{ mt: 2 }} />}
      {selectedBudgetError && (
        <Typography color="error" sx={{ mt: 2 }}>
          Error loading budget details: {selectedBudgetError.message}
        </Typography>
      )}

      {selectedBudget && <JsonView src={selectedBudget} theme="atom" />}
    </Box>
  );
};

// --- Main YNAB Budgets Page ---
export default function YnabBudgetsPage() {
  return (
    <>
      <PageSection title="">
        <ListBudgetsSection />
      </PageSection>
      <PageSection title="">
        <GetBudgetByIdSection />
      </PageSection>
    </>
  );
}
