import { Box, Typography, Paper } from "@mui/material";

interface PageSectionProps {
  title: string;
  children: React.ReactNode;
}

export default function PageSection({ title, children }: PageSectionProps) {
  return (
    <Paper elevation={2} sx={{ p: 2, width: "100%" }}>
      <Typography variant="h5" component="h2" gutterBottom>
        {title}
      </Typography>
      <Box>{children}</Box>
    </Paper>
  );
}
