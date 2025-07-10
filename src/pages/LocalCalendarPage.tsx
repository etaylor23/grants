import React, { useState } from "react";
import { Box, Typography } from "@mui/material";
import { AppLayout } from "../components/Layout/AppLayout";
import { SmartCalendar } from "../components/SmartCalendar";
import { ContextIndicator } from "../components/ContextIndicator";
import { Individual } from "../db/schema";

export const LocalCalendarPage: React.FC = () => {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<Individual | null>(null);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<Individual[]>([]);
  const [multiSelect] = useState(true);

  const handleUserChange = (userId: string, user: Individual) => {
    setSelectedUserId(userId);
    setSelectedUser(user);
  };

  const handleUsersChange = (userIds: string[], users: Individual[]) => {
    setSelectedUserIds(userIds);
    setSelectedUsers(users);
  };

  const handleDateSelect = (date: string) => {
    console.log("Date selected:", date);
  };

  return (
    <AppLayout
      selectedUserId={selectedUserId}
      selectedUserIds={selectedUserIds}
      onUserChange={handleUserChange}
      onUsersChange={handleUsersChange}
      multiSelect={multiSelect}
    >
      <Box sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
            Global Calendar
          </Typography>
        </Box>

        {/* Context Indicator */}
        <ContextIndicator variant="banner" showDescription sx={{ mb: 3 }} />

        {/* Smart Calendar */}
        <SmartCalendar
          selectedUserId={selectedUserId}
          selectedUser={selectedUser}
          selectedUserIds={selectedUserIds}
          selectedUsers={selectedUsers}
          onUserChange={handleUserChange}
          onUsersChange={handleUsersChange}
          onDateSelect={handleDateSelect}
          multiSelect={multiSelect}
        />
      </Box>
    </AppLayout>
  );
};
