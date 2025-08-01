import React from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Box, Typography, CircularProgress } from "@mui/material";
import JsonView from "react18-json-view";
import "react18-json-view/src/style.css";
import PageSection from "../../../components/PageSection";

const fetchUser = async () => {
  const response = await axios.get("/api/ynab/user/");
  return response.data;
};

const GetUserSection: React.FC = () => {
  const {
    data: user,
    isLoading: isLoadingUser,
    error: userError,
  } = useQuery({
    queryKey: ["ynabUser"],
    queryFn: fetchUser,
  });

  return (
    <Box>
      {isLoadingUser && <CircularProgress />}
      {userError && (
        <Typography color="error">
          Error loading user: {userError.message}
        </Typography>
      )}
      {user && <JsonView src={user} theme="atom" />}
    </Box>
  );
};

export default function YnabUserPage() {
  return (
    <PageSection title="">
      <GetUserSection />
    </PageSection>
  );
}
