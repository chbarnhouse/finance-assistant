import * as React from "react";
import { Typography, Box, CircularProgress, Alert, Paper } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import JsonView from "react18-json-view";
import "react18-json-view/src/style.css";
import { API_BASE_URL } from "@/constants";
import PageHeader from "../../../components/PageHeader";
import { useTheme } from "@mui/material/styles";
import { getYNABPageStyles } from "../../../styles/theme";

const fetchYnabUser = async () => {
  const { data } = await axios.get(`${API_BASE_URL}/ynab/user/`);
  return data;
};

export default function UserPage() {
  const theme = useTheme();
  const styles = getYNABPageStyles(theme);
  const { data, error, isLoading } = useQuery({
    queryKey: ["ynabUser"],
    queryFn: fetchYnabUser,
  });

  if (isLoading) {
    return <CircularProgress />;
  }

  if (error) {
    return <Alert severity="error">Error fetching YNAB user data.</Alert>;
  }

  console.log("User page data:", data);

  return (
    <Box sx={styles.pageContainer}>
      <PageHeader
        title="User Details"
        variant="ynab"
        recordType="ynabUser"
        showSettings={false}
        showSync={false}
      />
      <Paper elevation={3} sx={{ p: 2, mt: 2 }}>
        {data && Object.keys(data).length === 1 && data.id ? (
          <Typography>User ID: {data.id}</Typography>
        ) : data ? (
          <JsonView src={data} theme="atom" />
        ) : (
          <Typography>No data available.</Typography>
        )}
      </Paper>
    </Box>
  );
}
