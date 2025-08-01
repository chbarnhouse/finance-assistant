import React, { useState } from "react";
import type { GridColDef } from "@mui/x-data-grid";
import { GridActionsCellItem } from "@mui/x-data-grid";
import YnabReadOnlyGrid from "../../../../components/YnabReadOnlyGrid";
import LinkIcon from "@mui/icons-material/Link";
import LinkOffIcon from "@mui/icons-material/LinkOff";
import LinkAccountDialog from "../../../../components/dialogs/LinkAccountDialog";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Stack, Typography } from "@mui/material";

const ListAccounts: React.FC = () => {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<any>(null);

  const unlinkAccountMutation = useMutation({
    mutationFn: (ynabAccountId: string) => {
      return axios.post(`/api/ynab/accounts/${ynabAccountId}/unlink/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ynabAccounts"] });
    },
    // TODO: Add error handling
  });

  const handleLinkClick = (account: any) => {
    setSelectedAccount(account);
    setDialogOpen(true);
  };

  const handleUnlinkClick = (ynabAccountId: string) => {
    unlinkAccountMutation.mutate(ynabAccountId);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedAccount(null);
  };

  const columns: GridColDef[] = [
    {
      field: "actions",
      type: "actions",
      width: 80,
      getActions: (params) => [
        <GridActionsCellItem
          icon={params.row.fa_account_id ? <LinkOffIcon /> : <LinkIcon />}
          label={params.row.fa_account_id ? "Unlink" : "Link"}
          onClick={() =>
            params.row.fa_account_id
              ? handleUnlinkClick(params.row.id)
              : handleLinkClick(params.row)
          }
          showInMenu
        />,
      ],
    },
    { field: "name", headerName: "Name", flex: 1 },
    { field: "type", headerName: "Type", flex: 1 },
    {
      field: "balance",
      headerName: "Balance",
      flex: 1,
      valueFormatter: (value) => {
        if (value == null) {
          return "";
        }
        // YNAB sends balance in milliunits
        return (value / 1000).toLocaleString(undefined, {
          style: "currency",
          currency: "USD", // TODO: Make this dynamic from budget settings
        });
      },
    },
    {
      field: "fa_account_name",
      headerName: "Linked Account",
      flex: 1,
      renderCell: (params) =>
        params.value ? (
          <Typography variant="body2">{params.value}</Typography>
        ) : (
          <Typography variant="body2" color="textSecondary">
            Not Linked
          </Typography>
        ),
    },
  ];

  return (
    <>
      <YnabReadOnlyGrid
        endpoint="/api/ynab/accounts/"
        columns={columns}
        title="YNAB Accounts"
        queryKey="ynabAccounts"
      />
      {selectedAccount && (
        <LinkAccountDialog
          open={dialogOpen}
          onClose={handleCloseDialog}
          ynabAccountId={selectedAccount.id}
          ynabAccountName={selectedAccount.name}
        />
      )}
    </>
  );
};

export default ListAccounts;
