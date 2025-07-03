import React, { useState } from "react";
import { Box, Typography } from "@mui/material";
import { AppLayout } from "../components/Layout/AppLayout";
import { SmartCalendar } from "../components/SmartCalendar";
import { ContextIndicator } from "../components/ContextIndicator";
import { Individual } from "../db/schema";

export const LocalCalendarPage: React.FC = () => {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<Individual | null>(null);

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
        <Box sx={{ mb: 3 }}>
          <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
            Global Calendar
          </Typography>
          <Typography variant="body1" color="text.secondary">
            View time allocations and workdays across all organizations
          </Typography>
        </Box>

        {/* Context Indicator */}
        <ContextIndicator variant="banner" showDescription sx={{ mb: 3 }} />

        {/* Smart Calendar */}
        <SmartCalendar
          selectedUserId={selectedUserId}
          selectedUser={selectedUser}
          onUserChange={handleUserChange}
          onDateSelect={handleDateSelect}
        />
      </Box>
    </AppLayout>
  );
};
