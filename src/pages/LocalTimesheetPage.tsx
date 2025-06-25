import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "../components/Layout/AppLayout";
import { TimesheetGrid } from "../components/TimesheetGrid/TimesheetGrid";
import { TimesheetSynopsis } from "../components/TimesheetSynopsis";
import { PeriodSelector } from "../components/PeriodSelector";
import { usePeriodSelector } from "../hooks/usePeriodSelector";
import { Individual } from "../db/schema";
import { useIndividuals, useTimeSlots, useGrants, useWorkdayHours } from "../hooks/useLocalData";
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

  // Use PeriodSelector for date range management
  const { selectedPeriod, selectedPeriodOption, handlePeriodChange } = usePeriodSelector('monthly');

  // Default to current month if no period selected yet
  const dateRange = selectedPeriodOption || {
    startDate: new Date('2025-01-01'),
    endDate: new Date('2025-02-28'),
    label: "January-February 2025",
  };

  // Fetch data for synopsis (only when user is selected)
  const { data: timeSlots = [] } = useTimeSlots(
    selectedUserId || '',
    dateRange.startDate.toISOString().split('T')[0],
    dateRange.endDate.toISOString().split('T')[0]
  );
  const { data: grants = [] } = useGrants();
  const { data: workdayHours = {} } = useWorkdayHours(selectedUserId || '', 2025);

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
          {/* Period Selector */}
          <PeriodSelector
            selectedPeriod={selectedPeriod}
            onPeriodChange={handlePeriodChange}
          />

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

          {/* Quick Summary */}
          <div style={{
            marginTop: '2rem',
            padding: '1.5rem',
            backgroundColor: '#f8f9fa',
            borderRadius: '12px',
            border: '1px solid #e0e0e0'
          }}>
            <h3 style={{
              margin: '0 0 1rem 0',
              color: '#1976d2',
              fontSize: '1.25rem',
              fontWeight: 600
            }}>
              📊 Quick Summary - {selectedUser.FirstName} {selectedUser.LastName}
            </h3>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem',
              marginBottom: '1rem'
            }}>
              <div style={{
                padding: '1rem',
                backgroundColor: 'white',
                borderRadius: '8px',
                border: '1px solid #e0e0e0'
              }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1976d2' }}>
                  {timeSlots.reduce((sum, slot: any) => sum + (slot.HoursAllocated || 0), 0).toFixed(1)}h
                </div>
                <div style={{ fontSize: '0.875rem', color: '#666' }}>Total Hours Allocated</div>
              </div>

              <div style={{
                padding: '1rem',
                backgroundColor: 'white',
                borderRadius: '8px',
                border: '1px solid #e0e0e0'
              }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#2e7d32' }}>
                  {Object.values(workdayHours).reduce((sum: number, hours: any) => sum + (hours || 0), 0).toFixed(1)}h
                </div>
                <div style={{ fontSize: '0.875rem', color: '#666' }}>Total Hours Available</div>
              </div>

              <div style={{
                padding: '1rem',
                backgroundColor: 'white',
                borderRadius: '8px',
                border: '1px solid #e0e0e0'
              }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#ed6c02' }}>
                  {(() => {
                    const totalAllocated = timeSlots.reduce((sum, slot: any) => sum + (slot.HoursAllocated || 0), 0);
                    const totalAvailable = Object.values(workdayHours).reduce((sum: number, hours: any) => sum + (hours || 0), 0);
                    return totalAvailable > 0 ? ((totalAllocated / totalAvailable) * 100).toFixed(1) : '0.0';
                  })()}%
                </div>
                <div style={{ fontSize: '0.875rem', color: '#666' }}>Utilization Rate</div>
              </div>

              <div style={{
                padding: '1rem',
                backgroundColor: 'white',
                borderRadius: '8px',
                border: '1px solid #e0e0e0'
              }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#9c27b0' }}>
                  {grants.filter((grant: any) =>
                    timeSlots.some((slot: any) => slot.GrantID === grant.PK)
                  ).length}
                </div>
                <div style={{ fontSize: '0.875rem', color: '#666' }}>Active Grants</div>
              </div>
            </div>

            <div style={{
              fontSize: '0.875rem',
              color: '#666',
              borderTop: '1px solid #e0e0e0',
              paddingTop: '1rem'
            }}>
              <strong>Period:</strong> {dateRange.startDate.toLocaleDateString()} - {dateRange.endDate.toLocaleDateString()} •
              <strong> Data:</strong> {timeSlots.length} time slots across {Object.keys(workdayHours).length} workdays
            </div>
          </div>

          {/* Detailed Timesheet Synopsis */}
          <TimesheetSynopsis
            userId={selectedUser.PK}
            userName={`${selectedUser.FirstName} ${selectedUser.LastName}`}
            startDate={dateRange.startDate}
            endDate={dateRange.endDate}
            timeSlots={timeSlots}
            grants={grants}
            workdayHours={workdayHours}
          />
        </div>
      </div>
    </AppLayout>
  );
};
