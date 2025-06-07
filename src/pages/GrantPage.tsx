import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "../components/Layout/AppLayout";
import { GrantGrid } from "../components/GrantGrid/GrantGrid";
import { GrantSelector } from "../components/GrantSelector/GrantSelector";
import { GrantTimesheet } from "../components/GrantView/GrantTimesheet";
import { mockUsers } from "../api/mockData";
import { useGrants } from "../api/hooks";
import { User, Grant } from "../models/types";
import { Box, Typography, Tabs, Tab, Paper } from "@mui/material";

// Helper function to find grant by slug
const findGrantBySlug = (slug: string, grants: Grant[]): Grant | undefined => {
  return grants.find(
    (grant) => grant.name.toLowerCase().replace(/\s+/g, "-") === slug
  );
};

// Helper function to create grant slug from name
const createGrantSlug = (grant: Grant): string => {
  return grant.name.toLowerCase().replace(/\s+/g, "-");
};

// Helper function to load selected users from localStorage
const loadSelectedUsersForGrant = (): User[] => {
  try {
    const saved = localStorage.getItem("selectedUsers");
    if (saved) {
      const userIds = JSON.parse(saved) as string[];
      const users = userIds
        .map((id) => mockUsers.find((u) => u.id === id))
        .filter(Boolean) as User[];

      return users.length > 0 ? users : mockUsers;
    }
  } catch (error) {
    console.error("Failed to load selected users from localStorage:", error);
  }
  return mockUsers;
};

export const GrantPage: React.FC = () => {
  const { grantSlug } = useParams<{ grantSlug: string }>();
  const navigate = useNavigate();
  const { data: grants = [] } = useGrants();

  // Find the grant based on the slug
  const currentGrant = grantSlug ? findGrantBySlug(grantSlug, grants) : null;
  const [selectedGrant, setSelectedGrant] = useState<Grant | null>(
    currentGrant || null
  );
  const [selectedUsers, setSelectedUsers] = useState<User[]>(() =>
    loadSelectedUsersForGrant()
  );
  const [tabValue, setTabValue] = useState(0);

  const handleGrantChange = (grant: Grant | null) => {
    setSelectedGrant(grant);

    if (grant) {
      const grantSlug = createGrantSlug(grant);
      navigate(`/grants/${grantSlug}`);
    } else {
      navigate("/grants");
    }
  };

  const handleUsersChange = (users: User[]) => {
    setSelectedUsers(users);

    // Save to localStorage for persistence
    try {
      const userIds = users.map((u) => u.id);
      localStorage.setItem("selectedUsers", JSON.stringify(userIds));
    } catch (error) {
      console.error("Failed to save selected users to localStorage:", error);
    }
  };

  return (
    <AppLayout
      selectedUsers={selectedUsers}
      onUsersChange={handleUsersChange}
      viewMode="grant"
      onViewModeChange={(mode) => {
        if (mode === "calendar") {
          navigate("/calendar");
        } else if (mode === "grid") {
          // Navigate to the first selected user's timesheet
          if (selectedUsers.length > 0) {
            const userSlug = selectedUsers[0].name
              .toLowerCase()
              .replace(/\s+/g, "-");
            navigate(`/timesheet/${userSlug}`);
          }
        }
      }}
    >
      <Box>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
          Grant View
        </Typography>

        <GrantSelector
          selectedGrant={selectedGrant}
          onGrantChange={handleGrantChange}
        />

        {selectedGrant ? (
          <Box sx={{ mt: 3 }}>
            {/* Tabs for different views */}
            <Paper sx={{ mb: 3 }}>
              <Tabs
                value={tabValue}
                onChange={(_, newValue) => setTabValue(newValue)}
                sx={{ borderBottom: 1, borderColor: "divider" }}
              >
                <Tab label="User Allocations" />
                <Tab label="Hours Timesheet" />
              </Tabs>
            </Paper>

            {/* Tab Content */}
            {tabValue === 0 && <GrantGrid grant={selectedGrant} />}

            {tabValue === 1 && (
              <GrantTimesheet
                grantId={selectedGrant.id}
                grantName={selectedGrant.name}
                grantColor={selectedGrant.color}
              />
            )}
          </Box>
        ) : (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              height: 200,
              backgroundColor: "#f8f9fa",
              borderRadius: 2,
              border: "1px solid #e0e0e0",
            }}
          >
            <Typography variant="h6" color="text.secondary">
              Select a grant to view user allocations
            </Typography>
          </Box>
        )}
      </Box>
    </AppLayout>
  );
};
