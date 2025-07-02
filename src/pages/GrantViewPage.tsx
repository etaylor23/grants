import React, { useMemo, useState } from "react";
import { useParams, Navigate } from "react-router-dom";
import { CircularProgress, Alert, Box } from "@mui/material";
import styles from "./GrantView.module.css";
import { AppLayout } from "../components/Layout/AppLayout";

import { GrantDashboardTable } from "../components/GrantDashboardTable";
import {
  PeriodSelector,
  PeriodGroupingControls,
} from "../components/PeriodSelector";
import { usePeriodSelector } from "../hooks/usePeriodSelector";
import {
  useGrants,
  useOrganisations,
  useAllTimeSlots,
  useIndividuals,
} from "../hooks/useLocalData";
import { PeriodType } from "../models/grantDashboard";

interface GrantViewPageProps {}

export const GrantViewPage: React.FC<GrantViewPageProps> = () => {
  const { orgNumber, grantId } = useParams<{
    orgNumber: string;
    grantId: string;
  }>();

  // Use PeriodSelector for enhanced date range filtering
  const { selectedPeriod, selectedPeriodOption, handlePeriodChange } =
    usePeriodSelector("monthly");

  // Separate state for data grouping (Monthly vs Quarterly display)
  const [periodType, setPeriodType] = useState<PeriodType>("monthly");

  // Data hooks
  const {
    data: allGrants = [],
    isLoading: grantsLoading,
    error: grantsError,
  } = useGrants();
  const { data: organisations = [], isLoading: orgsLoading } =
    useOrganisations();
  const { data: timeSlots = [], isLoading: timeSlotsLoading } =
    useAllTimeSlots();
  const { data: individuals = [], isLoading: individualsLoading } =
    useIndividuals();

  // Find organisation by company number
  const organisation = organisations.find(
    (org) => org.CompanyNumber === orgNumber
  );

  // Find the specific grant
  const grant = useMemo(() => {
    if (!organisation || !grantId) return null;
    return allGrants.find(
      (g) => g.PK === grantId && g.OrganisationID === organisation.PK
    );
  }, [allGrants, organisation, grantId]);

  // Loading state
  const isLoading =
    grantsLoading || orgsLoading || timeSlotsLoading || individualsLoading;

  // Error handling
  if (grantsError) {
    return (
      <AppLayout>
        <Box sx={{ p: 3 }}>
          <Alert severity="error">
            Error loading grant data: {grantsError.message}
          </Alert>
        </Box>
      </AppLayout>
    );
  }

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
          <CircularProgress />
        </Box>
      </AppLayout>
    );
  }

  if (!grant) {
    return (
      <AppLayout>
        <Box sx={{ p: 3 }}>
          <Alert severity="error">
            Grant not found or you don't have access to it.
          </Alert>
        </Box>
      </AppLayout>
    );
  }

  // Handler for data grouping toggle (Monthly vs Quarterly)
  const handlePeriodTypeChange = (
    _event: React.MouseEvent<HTMLElement>,
    newPeriodType: PeriodType | null
  ) => {
    if (newPeriodType !== null) {
      setPeriodType(newPeriodType);
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className={styles.loadingContainer}>
          <CircularProgress />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className={styles.pageLayout}>
        {/* Header */}
        <div className={styles.headerSection}>
          <h1 className={styles.headerTitle}>
            {organisation.Name} - {grant?.Title}
          </h1>
        </div>

        {/* Period Selector with Inline Grouping Controls */}
        <div
          className={styles.periodSelector}
          role="region"
          aria-labelledby="period-selector-heading"
        >
          <PeriodSelector
            selectedPeriod={selectedPeriod}
            onPeriodChange={handlePeriodChange}
            currentGrouping={{
              periodType,
              label: periodType === "monthly" ? "Months" : "Quarters",
            }}
            groupingControls={
              <PeriodGroupingControls
                periodType={periodType}
                onPeriodTypeChange={handlePeriodTypeChange}
                showLabel={true}
                size="small"
              />
            }
          />
        </div>

        {/* Grant Dashboard Table */}
        {grant && (
          <GrantDashboardTable
            grant={grant}
            timeSlots={timeSlots}
            individuals={individuals}
            periodType={periodType}
            dateRangeFilter={
              selectedPeriodOption
                ? {
                    startDate: selectedPeriodOption.startDate,
                    endDate: selectedPeriodOption.endDate,
                  }
                : undefined
            }
          />
        )}
      </div>
    </AppLayout>
  );
};
