import React, { useState, useMemo } from "react";
import { useParams, Navigate } from "react-router-dom";
import {
  ToggleButton,
  ToggleButtonGroup,
  CircularProgress,
  Alert,
  Box,
} from "@mui/material";
import styles from "./GrantView.module.css";
import {
  CalendarToday as CalendarIcon,
  Assessment as AssessmentIcon,
} from "@mui/icons-material";
import { AppLayout } from "../components/Layout/AppLayout";
import { BreadcrumbNavigation } from "../components/BreadcrumbNavigation";
import { GrantDashboardTable } from "../components/GrantDashboardTable";
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

  if (!organisation) {
    return <Navigate to="/organisations" replace />;
  }

  if (!isLoading && !grant) {
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

  const handlePeriodTypeChange = (
    _event: React.MouseEvent<HTMLElement>,
    newPeriodType: PeriodType | null
  ) => {
    if (newPeriodType !== null) {
      setPeriodType(newPeriodType);
    }
  };

  const breadcrumbItems = [
    { label: "Home", path: "/" },
    { label: "Organisations", path: "/organisations" },
    { label: organisation.Name, path: `/organisation/${orgNumber}` },
    { label: "Grants", path: `/organisation/${orgNumber}/grants` },
    {
      label: grant?.Title || "Grant Details",
      path: `/organisation/${orgNumber}/grants/${grantId}`,
    },
  ];

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
        <BreadcrumbNavigation items={breadcrumbItems} />

        {/* Header */}
        <div className={styles.headerSection}>
          <h1 className={styles.headerTitle}>{grant?.Title}</h1>
          <p className={styles.headerSubtitle}>
            Grant Dashboard - {organisation.Name}
          </p>
          <div className={styles.headerBadge}>
            📊 Detailed grant analysis and cost breakdown
          </div>
        </div>

        {/* Period Selector */}
        <div
          className={styles.periodSelector}
          role="region"
          aria-labelledby="period-selector-heading"
        >
          <div className={styles.periodSelectorContent}>
            <h3
              id="period-selector-heading"
              className={styles.periodSelectorLabel}
            >
              Time Period View:
            </h3>
            <ToggleButtonGroup
              value={periodType}
              exclusive
              onChange={handlePeriodTypeChange}
              aria-label="Select time period view for grant data analysis"
              size="small"
            >
              <ToggleButton
                value="monthly"
                aria-label="View grant data by monthly periods"
                aria-describedby="monthly-description"
              >
                <CalendarIcon sx={{ mr: 1 }} aria-hidden="true" />
                Monthly
                <span id="monthly-description" className={styles.srOnly}>
                  Display grant costs broken down by individual months
                </span>
              </ToggleButton>
              <ToggleButton
                value="quarterly"
                aria-label="View grant data by quarterly periods"
                aria-describedby="quarterly-description"
              >
                <AssessmentIcon sx={{ mr: 1 }} aria-hidden="true" />
                Quarterly
                <span id="quarterly-description" className={styles.srOnly}>
                  Display grant costs broken down by quarters (3-month periods)
                </span>
              </ToggleButton>
            </ToggleButtonGroup>
          </div>
        </div>

        {/* Grant Dashboard Table */}
        {grant && (
          <GrantDashboardTable
            grant={grant}
            timeSlots={timeSlots}
            individuals={individuals}
            periodType={periodType}
          />
        )}
      </div>
    </AppLayout>
  );
};
