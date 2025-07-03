import React from "react";
import { useParams, Navigate, useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActionArea,
} from "@mui/material";
import {
  CalendarToday as CalendarIcon,
  Assignment as GrantIcon,
  People as PeopleIcon,
  Schedule as TimesheetIcon,
} from "@mui/icons-material";
import { AppLayout } from "../components/Layout/AppLayout";
import { ContextIndicator } from "../components/ContextIndicator";
import { BackToGlobalButton } from "../components/BackToGlobalButton";
import { useOrganisations } from "../hooks/useLocalData";

export const OrganisationDashboard: React.FC = () => {
  const { orgNumber } = useParams<{ orgNumber: string }>();
  const navigate = useNavigate();
  const { data: organisations = [], isLoading } = useOrganisations();

  // Find organisation by company number
  const organisation = organisations.find(
    (org) => org.CompanyNumber === orgNumber
  );

  console.log("OrganisationDashboard - orgNumber:", orgNumber);
  console.log("OrganisationDashboard - organisations:", organisations);
  console.log("OrganisationDashboard - found organisation:", organisation);
  console.log("OrganisationDashboard - isLoading:", isLoading);

  // Only redirect if data has finished loading and organisation is still not found
  if (!isLoading && !organisation) {
    console.log(
      "Organisation not found after loading completed, redirecting to /organisations"
    );
    return <Navigate to="/organisations" replace />;
  }

  // Show loading state while data is being fetched
  if (isLoading || !organisation) {
    return (
      <AppLayout>
        <Box
          sx={{
            p: 3,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: "200px",
          }}
        >
          <Typography>Loading organisation...</Typography>
        </Box>
      </AppLayout>
    );
  }

  const dashboardItems = [
    {
      title: "Calendar View",
      description: "View time allocations and workdays",
      icon: <CalendarIcon sx={{ fontSize: 40 }} />,
      path: `/organisation/${orgNumber}/calendar`,
      color: "#1976d2",
    },
    {
      title: "Grants Management",
      description: "Manage grants for this organisation",
      icon: <GrantIcon sx={{ fontSize: 40 }} />,
      path: `/organisation/${orgNumber}/grants`,
      color: "#2e7d32",
    },
    {
      title: "Team Members",
      description: "View and manage individuals",
      icon: <PeopleIcon sx={{ fontSize: 40 }} />,
      path: `/organisation/${orgNumber}/individuals`,
      color: "#ed6c02",
    },
    {
      title: "Timesheet Management",
      description: "Manage timesheets and time tracking",
      icon: <TimesheetIcon sx={{ fontSize: 40 }} />,
      path: `/organisation/${orgNumber}/timesheets`,
      color: "#9c27b0",
    },
  ];

  return (
    <AppLayout>
      <Box sx={{ p: 3 }}>
        {/* Header */}
        <Box
          sx={{
            mb: 4,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
              {organisation.Name}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Company Number: {organisation.CompanyNumber}
            </Typography>
          </Box>
          <BackToGlobalButton globalRoute="/" />
        </Box>

        {/* Context Indicator */}
        <ContextIndicator variant="banner" showDescription sx={{ mb: 3 }} />

        {/* Dashboard Grid */}
        <Grid container spacing={3}>
          {dashboardItems.map((item) => (
            <Grid item xs={12} sm={6} md={3} key={item.title}>
              <Card
                sx={{
                  height: "100%",
                  transition: "all 0.2s ease-in-out",
                  "&:hover": {
                    transform: "translateY(-4px)",
                    boxShadow: 4,
                  },
                }}
              >
                <CardActionArea
                  sx={{ height: "100%", p: 3 }}
                  onClick={() => navigate(item.path)}
                >
                  <CardContent sx={{ textAlign: "center", p: 0 }}>
                    <Box
                      sx={{
                        color: item.color,
                        mb: 2,
                        display: "flex",
                        justifyContent: "center",
                      }}
                    >
                      {item.icon}
                    </Box>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                      {item.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {item.description}
                    </Typography>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
    </AppLayout>
  );
};
