import React, { useState } from "react";
import { Box } from "@mui/material";
import { CalendarView } from "../components/CalendarView/CalendarView";
import { TimesheetGrid } from "../components/TimesheetGrid/TimesheetGrid";
import { AppLayout } from "../components/Layout/AppLayout";
import { mockUsers } from "../api/mockData";
import { User, ViewMode } from "../models/types";

export const Dashboard: React.FC = () => {
  const [selectedUsers, setSelectedUsers] = useState<User[]>([mockUsers[0]]);
  const [viewMode, setViewMode] = useState<ViewMode>("calendar");

  const handleDateSelect = (date: string) => {
    // Could open a detail modal or switch to grid view focused on this date
    console.log("Date selected:", date);
  };

  const renderContent = () => {
    switch (viewMode) {
      case "calendar":
        return (
          <CalendarView
            selectedUsers={selectedUsers}
            onDateSelect={handleDateSelect}
          />
        );
      case "grid":
        return <TimesheetGrid userId={selectedUsers[0]?.id || ""} />;
      default:
        return null;
    }
  };

  return (
    <AppLayout
      selectedUsers={selectedUsers}
      onUsersChange={setSelectedUsers}
      viewMode={viewMode}
      onViewModeChange={setViewMode}
    >
      <Box sx={{ height: "100%" }}>{renderContent()}</Box>
    </AppLayout>
  );
};
