import React, { useState } from "react";
import { useParams, Navigate } from "react-router-dom";
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActionArea,
  Avatar,
} from "@mui/material";
import { Schedule as TimesheetIcon } from "@mui/icons-material";
import { AppLayout } from "../components/Layout/AppLayout";
import { EnhancedTimesheetModal } from "../components/EnhancedTimesheetModal";
import { useOrganisations, useIndividuals } from "../hooks/useLocalData";

export const OrganisationTimesheetsPage: React.FC = () => {
  const { orgNumber } = useParams<{ orgNumber: string }>();
  const [timesheetModalOpen, setTimesheetModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);

  const { data: organisations = [], isLoading: orgsLoading } =
    useOrganisations();
  const { data: allIndividuals = [], isLoading: individualsLoading } =
    useIndividuals();

  // Find organisation by company number
  const organisation = organisations.find(
    (org) => org.CompanyNumber === orgNumber
  );

  const isLoading = orgsLoading || individualsLoading;

  // Only redirect if data has finished loading and organisation is still not found
  if (!orgsLoading && !organisation) {
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
          <Typography>Loading organisation timesheets...</Typography>
        </Box>
      </AppLayout>
    );
  }

  // Filter individuals by organisation
  const individuals = allIndividuals.filter(
    (individual) => individual.OrganisationID === organisation.PK
  );

  const getInitials = (firstName: string, lastName: string): string => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const getAvatarColor = (name: string): string => {
    const colors = [
      "#1976d2",
      "#388e3c",
      "#f57c00",
      "#7b1fa2",
      "#c2185b",
      "#00796b",
      "#5d4037",
      "#455a64",
    ];
    const hash = name
      .split("")
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  const handleOpenTimesheet = (individual: any) => {
    setSelectedUser(individual);
    setTimesheetModalOpen(true);
  };

  return (
    <AppLayout>
      <Box sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
            Timesheet Management - {organisation.Name}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage timesheets and time tracking for organisation members
          </Typography>
        </Box>

        {/* Team Members Grid */}
        <Grid container spacing={3}>
          {individuals.map((individual) => {
            const fullName = `${individual.FirstName} ${individual.LastName}`;

            return (
              <Grid item xs={12} sm={6} md={4} lg={3} key={individual.PK}>
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
                    onClick={() => handleOpenTimesheet(individual)}
                  >
                    <CardContent sx={{ textAlign: "center", p: 0 }}>
                      <Avatar
                        sx={{
                          bgcolor: getAvatarColor(fullName),
                          width: 60,
                          height: 60,
                          mx: "auto",
                          mb: 2,
                          fontSize: "1.5rem",
                        }}
                      >
                        {getInitials(individual.FirstName, individual.LastName)}
                      </Avatar>
                      <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                        {fullName}
                      </Typography>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mb: 2 }}
                      >
                        {individual.PK}
                      </Typography>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 1,
                          color: "#1976d2",
                        }}
                      >
                        <TimesheetIcon />
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          Open Timesheet
                        </Typography>
                      </Box>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            );
          })}
        </Grid>

        {individuals.length === 0 && (
          <Box
            sx={{
              textAlign: "center",
              py: 8,
              backgroundColor: "#f5f5f5",
              borderRadius: 2,
              border: "1px solid #e0e0e0",
            }}
          >
            <TimesheetIcon
              sx={{ fontSize: 64, color: "text.secondary", mb: 2 }}
            />
            <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
              No team members found
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Add team members to manage their timesheets
            </Typography>
          </Box>
        )}

        {/* Enhanced Timesheet Modal */}
        {selectedUser && (
          <EnhancedTimesheetModal
            open={timesheetModalOpen}
            onClose={() => {
              setTimesheetModalOpen(false);
              setSelectedUser(null);
            }}
            userId={selectedUser.PK}
            userName={`${selectedUser.FirstName} ${selectedUser.LastName}`}
            organisationId={organisation.PK}
          />
        )}
      </Box>
    </AppLayout>
  );
};
