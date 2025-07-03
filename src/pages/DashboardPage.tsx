import React from "react";
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActionArea,
  Chip,
  Divider,
  Paper,
} from "@mui/material";
import {
  CalendarToday as CalendarIcon,
  Assignment as GrantIcon,
  Business as OrganizationIcon,
  TrendingUp as TrendingUpIcon,
  People as PeopleIcon,
  Schedule as ScheduleIcon,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "../components/Layout/AppLayout";
import { ContextIndicator } from "../components/ContextIndicator";
import { useOrganisations, useGrants, useIndividuals } from "../hooks/useLocalData";

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { data: organisations = [] } = useOrganisations();
  const { data: grants = [] } = useGrants();
  const { data: individuals = [] } = useIndividuals();

  // Calculate global metrics
  const activeGrants = grants.filter(grant => {
    const now = new Date();
    const startDate = new Date(grant.StartDate);
    const endDate = new Date(grant.EndDate);
    return startDate <= now && now <= endDate;
  });

  const totalClaimableAmount = grants.reduce((sum, grant) => sum + (grant.TotalClaimableAmount || 0), 0);

  const globalActions = [
    {
      title: "Global Calendar",
      description: "View all users across all organizations",
      icon: <CalendarIcon sx={{ fontSize: 40 }} />,
      path: "/calendar",
      color: "#1976d2",
      badge: `${individuals.length} users`,
    },
    {
      title: "Global Grants",
      description: "Manage grants across all organizations",
      icon: <GrantIcon sx={{ fontSize: 40 }} />,
      path: "/grants",
      color: "#2e7d32",
      badge: `${grants.length} grants`,
    },
    {
      title: "Organizations",
      description: "Manage organization settings and data",
      icon: <OrganizationIcon sx={{ fontSize: 40 }} />,
      path: "/organisations",
      color: "#ed6c02",
      badge: `${organisations.length} orgs`,
    },
  ];

  return (
    <AppLayout>
      <Box sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h3" sx={{ fontWeight: 600, mb: 1 }}>
            GrantGrid Dashboard
          </Typography>
          <Typography variant="h6" color="text.secondary">
            Manage grants, organizations, and time tracking across your portfolio
          </Typography>
        </Box>

        {/* Context Indicator */}
        <ContextIndicator variant="banner" showDescription sx={{ mb: 4 }} />

        {/* Global Metrics */}
        <Paper sx={{ p: 3, mb: 4, backgroundColor: "#f8f9fa" }}>
          <Typography variant="h5" sx={{ fontWeight: 600, mb: 3 }}>
            Global Overview
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ textAlign: "center" }}>
                <Typography variant="h4" sx={{ fontWeight: 600, color: "#1976d2" }}>
                  {organisations.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Organizations
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ textAlign: "center" }}>
                <Typography variant="h4" sx={{ fontWeight: 600, color: "#2e7d32" }}>
                  {grants.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Grants
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ textAlign: "center" }}>
                <Typography variant="h4" sx={{ fontWeight: 600, color: "#ed6c02" }}>
                  {activeGrants.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Active Grants
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ textAlign: "center" }}>
                <Typography variant="h4" sx={{ fontWeight: 600, color: "#9c27b0" }}>
                  {individuals.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Team Members
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Paper>

        {/* Global Actions */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" sx={{ fontWeight: 600, mb: 3 }}>
            Global Management
          </Typography>
          <Grid container spacing={3}>
            {globalActions.map((action) => (
              <Grid item xs={12} sm={6} md={4} key={action.title}>
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
                    onClick={() => navigate(action.path)}
                  >
                    <CardContent sx={{ textAlign: "center", p: 0 }}>
                      <Box sx={{ color: action.color, mb: 2 }}>
                        {action.icon}
                      </Box>
                      <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                        {action.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {action.description}
                      </Typography>
                      <Chip
                        label={action.badge}
                        size="small"
                        sx={{
                          backgroundColor: action.color,
                          color: "white",
                          fontWeight: 500,
                        }}
                      />
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>

        {/* Organizations Quick Access */}
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 600, mb: 3 }}>
            Organizations
          </Typography>
          {organisations.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: "center" }}>
              <OrganizationIcon sx={{ fontSize: 48, color: "text.secondary", mb: 2 }} />
              <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                No organizations found
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Create an organization to get started with grant management
              </Typography>
            </Paper>
          ) : (
            <Grid container spacing={3}>
              {organisations.map((org) => {
                const orgGrants = grants.filter(grant => grant.OrganisationID === org.PK);
                const orgActiveGrants = orgGrants.filter(grant => {
                  const now = new Date();
                  const startDate = new Date(grant.StartDate);
                  const endDate = new Date(grant.EndDate);
                  return startDate <= now && now <= endDate;
                });

                return (
                  <Grid item xs={12} sm={6} md={4} key={org.PK}>
                    <Card
                      sx={{
                        height: "100%",
                        transition: "all 0.2s ease-in-out",
                        "&:hover": {
                          transform: "translateY(-2px)",
                          boxShadow: 3,
                        },
                      }}
                    >
                      <CardActionArea
                        sx={{ height: "100%", p: 3 }}
                        onClick={() => navigate(`/organisation/${org.CompanyNumber}`)}
                      >
                        <CardContent sx={{ p: 0 }}>
                          <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                            {org.Name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            Company Number: {org.CompanyNumber}
                          </Typography>
                          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                            <Chip
                              label={`${orgGrants.length} grants`}
                              size="small"
                              variant="outlined"
                            />
                            <Chip
                              label={`${orgActiveGrants.length} active`}
                              size="small"
                              color={orgActiveGrants.length > 0 ? "success" : "default"}
                            />
                          </Box>
                        </CardContent>
                      </CardActionArea>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          )}
        </Box>
      </Box>
    </AppLayout>
  );
};
