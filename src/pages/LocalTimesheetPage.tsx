import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "../components/Layout/AppLayout";
import { TimesheetGrid } from "../components/TimesheetGrid/TimesheetGrid";
import { DateRange, DateRangeSelector } from "../components/DateRangeSelector";
import { Individual } from "../db/schema";
import { useIndividuals } from "../hooks/useLocalData";
import { startOfMonth, endOfMonth } from "date-fns";
import styles from "../components/Layout/ModernContainer.module.css";

// Helper function to find user by slug
const findUserBySlug = (slug: string, individuals: Individual[]): Individual | undefined => {
  return individuals.find(
    (user) => `${user.FirstName}-${user.LastName}`.toLowerCase().replace(/\s+/g, "-") === slug
  );
};

// Helper function to create user slug from Individual
const createUserSlug = (user: Individual): string => {
  return `${user.FirstName}-${user.LastName}`.toLowerCase().replace(/\s+/g, "-");
};

export const LocalTimesheetPage: React.FC = () => {
  const { userSlug } = useParams<{ userSlug: string }>();
  const navigate = useNavigate();
  const { data: individuals = [] } = useIndividuals();
  
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<Individual | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: startOfMonth(new Date()),
    endDate: endOfMonth(new Date()),
    label: "Current Month",
  });

  // Find the user based on the slug
  useEffect(() => {
    if (userSlug && individuals.length > 0) {
      const user = findUserBySlug(userSlug, individuals);
      if (user) {
        setSelectedUserId(user.PK);
        setSelectedUser(user);
      } else {
        // User not found, redirect to calendar
        navigate("/local-calendar");
      }
    } else if (!userSlug && individuals.length > 0) {
      // No slug provided, redirect to first user
      const firstUser = individuals[0];
      const slug = createUserSlug(firstUser);
      navigate(`/local-timesheet/${slug}`);
    }
  }, [userSlug, individuals, navigate]);

  const handleUserChange = (userId: string, user: Individual) => {
    setSelectedUserId(userId);
    setSelectedUser(user);
    
    // Navigate to the new user's timesheet
    const newSlug = createUserSlug(user);
    navigate(`/local-timesheet/${newSlug}`);
  };

  // If user not found or no individuals loaded yet
  if (!selectedUser) {
    return (
      <AppLayout
        selectedUserId={selectedUserId}
        onUserChange={handleUserChange}
      >
        <div className={styles.container}>
          <div className={styles.content}>
            <div className={styles.header}>
              <h1 className={styles.title}>Loading...</h1>
              <p className={styles.subtitle}>Please wait while we load your timesheet data</p>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      selectedUserId={selectedUserId}
      onUserChange={handleUserChange}
    >
      <div className={styles.container}>
        <div className={styles.content}>
          <div className={styles.header}>
            <h1 className={styles.title}>
              Timesheet - {selectedUser.FirstName} {selectedUser.LastName}
            </h1>
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
                userId={selectedUser.PK}
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
