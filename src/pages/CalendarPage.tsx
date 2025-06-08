import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "../components/Layout/AppLayout";
import { CalendarView } from "../components/CalendarView/CalendarView";
import { mockUsers } from "../api/mockData";
import { User } from "../models/types";
import { DateRange } from "../components/DateRangeSelector";
import { startOfMonth, endOfMonth } from "date-fns";

// Helper function to create user slug from name
const createUserSlug = (user: User): string => {
  return user.name.toLowerCase().replace(/\s+/g, "-");
};

// Helper function to load selected users from localStorage
const loadSelectedUsers = (): User[] => {
  try {
    const saved = localStorage.getItem("selectedUsers");
    if (saved) {
      const userIds = JSON.parse(saved) as string[];
      const users = userIds
        .map((id) => mockUsers.find((u) => u.id === id))
        .filter(Boolean) as User[];
      return users.length > 0 ? users : [mockUsers[0]];
    }
  } catch (error) {
    console.error("Failed to load selected users from localStorage:", error);
  }
  return [mockUsers[0]];
};

// Helper function to save selected users to localStorage
const saveSelectedUsers = (users: User[]) => {
  try {
    const userIds = users.map((u) => u.id);
    localStorage.setItem("selectedUsers", JSON.stringify(userIds));
  } catch (error) {
    console.error("Failed to save selected users to localStorage:", error);
  }
};

export const CalendarPage: React.FC = () => {
  const [selectedUsers, setSelectedUsers] = useState<User[]>(loadSelectedUsers);
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: startOfMonth(new Date()),
    endDate: endOfMonth(new Date()),
    label: "Current Month",
  });
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Refresh data when returning to calendar view to ensure we have latest timesheet updates
  useEffect(() => {
    const currentYear = new Date().getFullYear();

    // Invalidate workdays and timeslots for all users to ensure fresh data
    selectedUsers.forEach((user) => {
      queryClient.invalidateQueries({
        queryKey: ["workdays", user.id, currentYear],
      });
      queryClient.invalidateQueries({
        queryKey: ["timeslots", user.id],
      });
    });
  }, [selectedUsers, queryClient]);

  const handleDateSelect = (date: string) => {
    console.log("Date selected:", date);
  };

  const handleUsersChange = (users: User[]) => {
    setSelectedUsers(users);
    saveSelectedUsers(users);
  };

  const handleSwitchToTimesheet = (userId?: string) => {
    // If userId is provided, navigate to that specific user's timesheet
    // Otherwise, navigate to the first selected user's timesheet
    const targetUserId = userId || selectedUsers[0]?.id;
    const targetUser =
      mockUsers.find((u) => u.id === targetUserId) || selectedUsers[0];

    if (targetUser) {
      const userSlug = createUserSlug(targetUser);
      navigate(`/timesheet/${userSlug}`);
    }
  };

  return (
    <AppLayout
      selectedUsers={selectedUsers}
      onUsersChange={handleUsersChange}
      viewMode="calendar"
      onViewModeChange={(mode) => {
        if (mode === "grid") {
          handleSwitchToTimesheet();
        }
      }}
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
