import React, { useState, useEffect } from "react";
import { AppLayout } from "../components/Layout/AppLayout";
import { CalendarView } from "../components/CalendarView/CalendarView";
import { DateRange } from "../components/DateRangeSelector";
import { Individual } from "../db/schema";
import { startOfMonth, endOfMonth } from "date-fns";

export const LocalCalendarPage: React.FC = () => {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<Individual | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: startOfMonth(new Date()),
    endDate: endOfMonth(new Date()),
    label: "Current Month",
  });

  const handleUserChange = (userId: string, user: Individual) => {
    setSelectedUserId(userId);
    setSelectedUser(user);
  };

  const handleDateSelect = (date: string) => {
    console.log("Date selected:", date);
  };

  // Convert Individual to User format for legacy compatibility
  const selectedUsers = selectedUser ? [{
    id: selectedUser.PK,
    name: `${selectedUser.FirstName} ${selectedUser.LastName}`,
    email: `${selectedUser.FirstName.toLowerCase()}.${selectedUser.LastName.toLowerCase()}@company.com`
  }] : [];

  return (
    <AppLayout
      selectedUsers={selectedUsers}
      onUsersChange={() => {}} // Not used in IndexedDB mode
      viewMode="calendar"
      onViewModeChange={() => {}}
      selectedUserId={selectedUserId}
      onUserChange={handleUserChange}
    >
      <CalendarView
        selectedUsers={selectedUsers}
        onDateSelect={handleDateSelect}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
      />
    </AppLayout>
  );
};
