import React, { useState } from "react";
import { AppLayout } from "../components/Layout/AppLayout";
import { LocalCalendarView } from "../components/LocalCalendarView";
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

  return (
    <AppLayout
      selectedUserId={selectedUserId}
      onUserChange={handleUserChange}
    >
      {selectedUser ? (
        <LocalCalendarView
          userId={selectedUser.PK}
          userName={`${selectedUser.FirstName} ${selectedUser.LastName}`}
          onDateSelect={handleDateSelect}
          dateRange={dateRange}
        />
      ) : (
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <p>Please select a user to view the calendar.</p>
        </div>
      )}
    </AppLayout>
  );
};
