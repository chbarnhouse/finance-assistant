import React, { useState } from "react";
import CrudGrid from "./CrudGrid";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Typography,
  Box,
} from "@mui/material";
import type { GridColDef, GridRowParams } from "@mui/x-data-grid";

interface YnabReadOnlyGridProps {
  endpoint: string;
  columns: GridColDef[];
  title: string;
  idField?: string;
}

export default function YnabReadOnlyGrid({
  endpoint,
  columns,
  title,
  idField = "id",
}: YnabReadOnlyGridProps) {
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);

  const handleRowClick = (params: GridRowParams) => {
    setSelectedRecord(params.row);
  };

  const handleCloseDialog = () => {
    setSelectedRecord(null);
  };

  return (
    <>
      <CrudGrid
        endpoint={endpoint}
        columns={columns}
        idField={idField}
        readOnly
        onRowClick={handleRowClick}
      />
      <Dialog
        open={!!selectedRecord}
        onClose={handleCloseDialog}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>Raw {title} Record</DialogTitle>
        <DialogContent>
          {selectedRecord && (
            <Box
              component="pre"
              sx={{
                whiteSpace: "pre-wrap",
                wordBreak: "break-all",
                backgroundColor: "#f5f5f5",
                p: 2,
                borderRadius: 1,
              }}
            >
              {JSON.stringify(selectedRecord, null, 2)}
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
