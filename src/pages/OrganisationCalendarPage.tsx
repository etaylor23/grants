import React, { useState } from "react";
import { useParams, Navigate } from "react-router-dom";
import { Box, Typography } from "@mui/material";
import { AppLayout } from "../components/Layout/AppLayout";
import { SmartCalendar } from "../components/SmartCalendar";
import { ContextIndicator } from "../components/ContextIndicator";
import { BackToGlobalButton } from "../components/BackToGlobalButton";
import { useOrganisations, useIndividuals } from "../hooks/useLocalData";
import { Individual } from "../db/schema";

export const OrganisationCalendarPage: React.FC = () => {
  const { orgNumber } = useParams<{ orgNumber: string }>();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<Individual | null>(null);

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
          <Typography>Loading organisation calendar...</Typography>
        </Box>
      </AppLayout>
    );
  }

  // Filter individuals by organisation
  const individuals = allIndividuals.filter(
    (individual) => individual.OrganisationID === organisation.PK
  );

  const handleUserChange = (userId: string, user: Individual) => {
    setSelectedUserId(userId);
    setSelectedUser(user);
  };

  const handleDateSelect = (date: string) => {
    console.log("Date selected:", date);
  };

  return (
    <AppLayout selectedUserId={selectedUserId} onUserChange={handleUserChange}>
      <Box sx={{ p: 3 }}>
        {/* Header */}
        <Box
          sx={{
            mb: 3,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
              Calendar - {organisation.Name}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              View time allocations and workdays for organisation members
            </Typography>
          </Box>
          <BackToGlobalButton globalRoute="/calendar" />
        </Box>

        {/* Context Indicator */}
        <ContextIndicator variant="banner" showDescription sx={{ mb: 3 }} />

        {/* Smart Calendar */}
        <SmartCalendar
          organizationId={orgNumber}
          selectedUserId={selectedUserId}
          selectedUser={selectedUser}
          onUserChange={handleUserChange}
          onDateSelect={handleDateSelect}
        />
      </Box>
    </AppLayout>
  );
};
