import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "../components/Layout/AppLayout";
import { TimesheetGrid } from "../components/TimesheetGrid/TimesheetGrid";
import { mockUsers } from "../api/mockData";
import { User } from "../models/types";
import { startOfMonth, endOfMonth } from "date-fns";
import { DateRange, DateRangeSelector } from "../components/DateRangeSelector";
import styles from "../components/Layout/ModernContainer.module.css";

// Helper function to find user by slug
const findUserBySlug = (slug: string): User | undefined => {
  return mockUsers.find(
    (user) => user.name.toLowerCase().replace(/\s+/g, "-") === slug
  );
};

// Helper function to load selected users from localStorage
const loadSelectedUsersForTimesheet = (currentUser: User): User[] => {
  try {
    const saved = localStorage.getItem("selectedUsers");
    if (saved) {
      const userIds = JSON.parse(saved) as string[];
      const users = userIds
        .map((id) => mockUsers.find((u) => u.id === id))
        .filter(Boolean) as User[];

      // Ensure current user is included in the selection
      if (users.length > 0 && !users.find((u) => u.id === currentUser.id)) {
        return [currentUser, ...users];
      }

      return users.length > 0 ? users : [currentUser];
    }
  } catch (error) {
    console.error("Failed to load selected users from localStorage:", error);
  }
  return [currentUser];
};

export const TimesheetPage: React.FC = () => {
  const { userSlug } = useParams<{ userSlug: string }>();
  const navigate = useNavigate();

  // Find the user based on the slug
  const currentUser = userSlug ? findUserBySlug(userSlug) : mockUsers[0];
  const [selectedUsers, setSelectedUsers] = useState<User[]>(() =>
    currentUser ? loadSelectedUsersForTimesheet(currentUser) : [mockUsers[0]]
  );
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: startOfMonth(new Date()),
    endDate: endOfMonth(new Date()),
    label: "Current Month",
  });

  // If user not found, redirect to calendar
  if (!currentUser) {
    navigate("/calendar");
    return null;
  }

  const handleUsersChange = (users: User[]) => {
    setSelectedUsers(users);

    // Save to localStorage for persistence
    try {
      const userIds = users.map((u) => u.id);
      localStorage.setItem("selectedUsers", JSON.stringify(userIds));
    } catch (error) {
      console.error("Failed to save selected users to localStorage:", error);
    }

    // If the current user is removed from selection, navigate to the first remaining user
    // or back to calendar if no users selected
    if (users.length === 0) {
      navigate("/calendar");
    } else if (!users.find((u) => u.id === currentUser.id)) {
      const newUserSlug = users[0].name.toLowerCase().replace(/\s+/g, "-");
      navigate(`/timesheet/${newUserSlug}`);
    }
  };

  return (
    <AppLayout
      selectedUsers={selectedUsers}
      onUsersChange={handleUsersChange}
      viewMode="grid"
      onViewModeChange={(mode) => {
        if (mode === "calendar") {
          navigate("/calendar");
        }
      }}
    >
      <div className={styles.container}>
        <div className={styles.content}>
          <div className={styles.header}>
            <h1 className={styles.title}>Timesheet - {currentUser.name}</h1>
            <p className={styles.subtitle}>
              Track time allocation across grants for the selected period
            </p>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Date Range Selection</h2>
              <p className={styles.sectionDescription}>
                Choose a custom date range to view and edit timesheet data
              </p>
            </div>
            <div className={styles.sectionContent}>
              <DateRangeSelector
                selectedRange={dateRange}
                onRangeChange={setDateRange}
              />
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Hours Allocation</h2>
              <p className={styles.sectionDescription}>
                Enter hours worked on each grant for each day in the selected period
              </p>
            </div>
            <div className={styles.sectionContent}>
              <TimesheetGrid
                userId={currentUser.id}
                startDate={dateRange.startDate}
                endDate={dateRange.endDate}
                showCard={false}
              />
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};
