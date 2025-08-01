import {
  DataGrid,
  type GridColDef,
  GridToolbarContainer,
  GridToolbarFilterButton,
  GridToolbarExport,
  GridToolbarColumnsButton,
  GridToolbarDensitySelector,
  GridToolbar,
  type GridRowParams,
  type GridValidRowModel,
} from "@mui/x-data-grid";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Box, Typography, Button, IconButton } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/DeleteOutlined";
import EditIcon from "@mui/icons-material/Edit";
import * as React from "react";

interface CrudGridProps {
  endpoint: string;
  columns: GridColDef[];
  idField?: string;
  readOnly?: boolean;
  onRowClick?: (params: GridRowParams) => void;
  hideAddButton?: boolean;
  onRowSelectionChange?: (selection: string[]) => void;
}

function EditToolbar() {
  return (
    <GridToolbarContainer>
      <GridToolbarFilterButton />
      <GridToolbarExport />
      <GridToolbarColumnsButton />
      <GridToolbarDensitySelector />
    </GridToolbarContainer>
  );
}

export default function CrudGrid({
  endpoint,
  columns: initialColumns,
  idField = "id",
  readOnly = false,
  onRowClick,
  hideAddButton = false,
  onRowSelectionChange,
}: CrudGridProps) {
  const queryClient = useQueryClient();
  const storageKey = `gridState-${endpoint}`;

  const [rows, setRows] = React.useState<GridValidRowModel[]>([]);

  // Ensure rows is always an array
  const safeRows = Array.isArray(rows) ? rows : [];
  const [paginationModel, setPaginationModel] = React.useState({
    pageSize: 10,
    page: 0,
  });

  const getInitialState = () => {
    try {
      const savedState = localStorage.getItem(storageKey);
      return savedState ? JSON.parse(savedState) : {};
    } catch (e) {
      console.error("Failed to parse saved grid state:", e);
      return {};
    }
  };

  const [columnVisibilityModel, setColumnVisibilityModel] = React.useState(
    getInitialState().columnVisibilityModel || {}
  );
  const [columnOrder, setColumnOrder] = React.useState(
    getInitialState().columnOrder || []
  );
  const [filterModel, setFilterModel] = React.useState(
    getInitialState().filterModel || { items: [] }
  );
  const [sortModel, setSortModel] = React.useState(
    getInitialState().sortModel || []
  );

  React.useEffect(() => {
    const stateToSave = {
      columnVisibilityModel,
      columnOrder,
      filterModel,
      sortModel,
    };
    localStorage.setItem(storageKey, JSON.stringify(stateToSave));
  }, [columnVisibilityModel, columnOrder, filterModel, sortModel, storageKey]);

  const { isPending, error, data, isFetching } = useQuery<GridValidRowModel[]>({
    queryKey: [endpoint],
    queryFn: () =>
      axios
        .get(endpoint)
        .then((res) => {
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
        })
        .catch((error) => {
          console.error(`Error fetching data from ${endpoint}:`, error);
          // Return empty array on error to prevent crashes
          return [];
        }),
  });

  React.useEffect(() => {
    if (data && Array.isArray(data)) {
      setRows(data);
    } else {
      // Ensure rows is always an array
      setRows([]);
    }
  }, [data]);

  const deleteMutation = useMutation({
    mutationFn: (id: string | number) => axios.delete(`${endpoint}${id}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [endpoint] });
      // Trigger event to notify YNAB pages that a core record was deleted
      sessionStorage.setItem("coreRecordDeleted", "true");
      // Dispatch a custom event for immediate notification
      window.dispatchEvent(new CustomEvent("coreRecordDeleted"));
    },
  });

  const handleDeleteClick = (id: string | number) => () => {
    deleteMutation.mutate(id);
  };

  const columns: GridColDef[] = readOnly
    ? initialColumns
    : [
        ...initialColumns,
        {
          field: "actions",
          type: "actions",
          headerName: "Actions",
          width: 100,
          cellClassName: "actions",
          getActions: ({ id, row }) => {
            return [
              <IconButton
                key="edit"
                onClick={() => {
                  // This will be handled by the parent component's onRowClick
                  if (onRowClick) {
                    onRowClick({ id, row } as any);
                  }
                }}
                color="primary"
                size="small"
              >
                <EditIcon />
              </IconButton>,
              <IconButton
                key="delete"
                onClick={handleDeleteClick(id)}
                color="error"
                size="small"
              >
                <DeleteIcon />
              </IconButton>,
            ];
          },
        },
      ];

  if (isPending) return <Typography>Loading...</Typography>;
  if (error)
    return <Typography>An error has occurred: {error.message}</Typography>;

  return (
    <Box sx={{ height: "100%", width: "100%" }}>
      {!readOnly && !hideAddButton && (
        <Box sx={{ mb: 2 }}>
          <Button
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => {
              // This will be handled by the parent component's onRowClick
              // or through a separate add button in the page header
            }}
          >
            Add record
          </Button>
        </Box>
      )}
      <DataGrid
        rows={safeRows}
        columns={columns}
        disableColumnResize={false}
        loading={isFetching || deleteMutation.isPending}
        slots={{
          toolbar: readOnly ? GridToolbar : EditToolbar,
        }}
        pageSizeOptions={[5, 10, 25, 50, 100]}
        paginationModel={paginationModel}
        onPaginationModelChange={setPaginationModel}
        columnVisibilityModel={columnVisibilityModel}
        onColumnVisibilityModelChange={setColumnVisibilityModel}
        columnOrder={columnOrder}
        onColumnOrderChange={setColumnOrder}
        filterModel={filterModel}
        onFilterModelChange={setFilterModel}
        sortModel={sortModel}
        onSortModelChange={setSortModel}
        checkboxSelection={!readOnly}
        getRowId={(row) => row[idField]}
        onRowClick={(params, event) => {
          // Only trigger onRowClick if we're not clicking on the checkbox or action buttons
          if (
            event.target &&
            !(event.target as HTMLElement).closest(
              ".MuiDataGrid-checkboxInput"
            ) &&
            !(event.target as HTMLElement).closest(".MuiDataGrid-actionsCell")
          ) {
            if (onRowClick) {
              onRowClick(params);
            }
          }
        }}
        disableRowSelectionOnClick={!!onRowClick}
        onRowSelectionModelChange={(newSelection) => {
          if (onRowSelectionChange) {
            onRowSelectionChange(newSelection as string[]);
          }
        }}
      />
    </Box>
  );
}
