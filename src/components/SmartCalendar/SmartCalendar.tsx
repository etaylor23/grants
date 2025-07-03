import React, { useState, useMemo } from "react";
import {
  Box,
  Typography,
  FormControl,
  Select,
  MenuItem,
  Chip,
  Button,
  Alert,
} from "@mui/material";
import {
  FilterList as FilterIcon,
  Business as OrganizationIcon,
  Person as PersonIcon,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { LocalCalendarView } from "../LocalCalendarView";
import { UnconstrainedCalendarView } from "../UnconstrainedCalendarView";
import { FadeTransition } from "../ContextTransition";
import { useScopeInfo } from "../../utils/breadcrumbUtils";
import { createContextTransitionManager } from "../../utils/contextTransitions";
import { useOrganisations, useIndividuals } from "../../hooks/useLocalData";
import { Individual, Organisation } from "../../db/schema";

interface SmartCalendarProps {
  /**
   * Current organization ID if in organization context
   */
  organizationId?: string;
  /**
   * Selected user ID
   */
  selectedUserId?: string | null;
  /**
   * Selected user object
   */
  selectedUser?: Individual | null;
  /**
   * User change handler
   */
  onUserChange?: (userId: string, user: Individual) => void;
  /**
   * Date select handler
   */
  onDateSelect?: (date: string) => void;
}

export const SmartCalendar: React.FC<SmartCalendarProps> = ({
  organizationId,
  selectedUserId,
  selectedUser,
  onUserChange,
  onDateSelect,
}) => {
  const navigate = useNavigate();
  const { data: organisations = [] } = useOrganisations();
  const { data: allIndividuals = [] } = useIndividuals();
  const scopeInfo = useScopeInfo(organisations);
  const transitionManager = createContextTransitionManager(
    navigate,
    organisations
  );

  const [organizationFilter, setOrganizationFilter] = useState<string>(
    organizationId || "all"
  );

  // Filter individuals based on current context
  const filteredIndividuals = useMemo(() => {
    if (scopeInfo.isGlobal) {
      if (organizationFilter === "all") {
        return allIndividuals;
      } else {
        const org = organisations.find(
          (o) => o.CompanyNumber === organizationFilter
        );
        return allIndividuals.filter((ind) => ind.OrganisationID === org?.PK);
      }
    } else {
      // Organization context - filter by current organization
      const org = organisations.find(
        (o) => o.CompanyNumber === scopeInfo.organizationId
      );
      return allIndividuals.filter((ind) => ind.OrganisationID === org?.PK);
    }
  }, [allIndividuals, organisations, scopeInfo, organizationFilter]);

  const handleOrganizationFilterChange = (orgNumber: string) => {
    setOrganizationFilter(orgNumber);

    if (orgNumber === "all") {
      // Switch to global calendar with smooth transition
      transitionManager.toGlobal("calendar", { preserveUser: true });
    } else {
      // Switch to organization-specific calendar with smooth transition
      transitionManager.toOrganization(orgNumber, "calendar", {
        preserveUser: true,
      });
    }
  };

  const handleContextSwitch = (targetOrgNumber: string) => {
    transitionManager.toOrganization(targetOrgNumber, "calendar", {
      preserveUser: true,
    });
  };

  const renderOrganizationFilter = () => {
    if (!scopeInfo.isGlobal) {
      // In organization context, show current organization and option to switch
      return (
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
          <Chip
            icon={<OrganizationIcon />}
            label={scopeInfo.organizationName || "Organization"}
            color="primary"
            variant="filled"
          />
          <Button
            size="small"
            startIcon={<FilterIcon />}
            onClick={() => navigate("/calendar")}
            sx={{ textTransform: "none" }}
          >
            View All Organizations
          </Button>
        </Box>
      );
    }

    // Global context - show organization filter
    return (
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
          Filter by Organization
        </Typography>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <Select
            value={organizationFilter}
            onChange={(e) => handleOrganizationFilterChange(e.target.value)}
            displayEmpty
          >
            <MenuItem value="all">
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <FilterIcon fontSize="small" />
                All Organizations
              </Box>
            </MenuItem>
            {organisations.map((org) => (
              <MenuItem key={org.PK} value={org.CompanyNumber}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <OrganizationIcon fontSize="small" />
                  {org.Name}
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {organizationFilter !== "all" && (
          <Box sx={{ mt: 1 }}>
            <Button
              size="small"
              onClick={() => handleContextSwitch(organizationFilter)}
              sx={{ textTransform: "none" }}
            >
              Switch to{" "}
              {
                organisations.find(
                  (o) => o.CompanyNumber === organizationFilter
                )?.Name
              }{" "}
              Context
            </Button>
          </Box>
        )}
      </Box>
    );
  };

  const renderCalendarContent = () => {
    if (!selectedUser) {
      return (
        <Box
          sx={{
            textAlign: "center",
            py: 8,
            backgroundColor: "#f5f5f5",
            borderRadius: 2,
            border: "1px solid #e0e0e0",
          }}
        >
          <PersonIcon sx={{ fontSize: 48, color: "text.secondary", mb: 2 }} />
          <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
            Select a team member to view their calendar
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Use the user picker in the top navigation to select a team member
          </Typography>
          {filteredIndividuals.length === 0 && (
            <Alert severity="info" sx={{ mt: 2, maxWidth: 400, mx: "auto" }}>
              {scopeInfo.isGlobal
                ? organizationFilter === "all"
                  ? "No team members found across all organizations"
                  : `No team members found in ${
                      organisations.find(
                        (o) => o.CompanyNumber === organizationFilter
                      )?.Name
                    }`
                : `No team members found in ${scopeInfo.organizationName}`}
            </Alert>
          )}
        </Box>
      );
    }

    // Determine which calendar component to use based on context
    if (scopeInfo.isGlobal) {
      return (
        <LocalCalendarView
          userId={selectedUser.PK}
          userName={`${selectedUser.FirstName} ${selectedUser.LastName}`}
          onDateSelect={onDateSelect}
        />
      );
    } else {
      const org = organisations.find(
        (o) => o.CompanyNumber === scopeInfo.organizationId
      );
      return (
        <UnconstrainedCalendarView
          userId={selectedUser.PK}
          userName={`${selectedUser.FirstName} ${selectedUser.LastName}`}
          organisationId={org?.PK || ""}
          onDateSelect={onDateSelect}
        />
      );
    }
  };

  return (
    <Box>
      {renderOrganizationFilter()}
      <FadeTransition trigger={scopeInfo.contextType}>
        {renderCalendarContent()}
      </FadeTransition>
    </Box>
  );
};
