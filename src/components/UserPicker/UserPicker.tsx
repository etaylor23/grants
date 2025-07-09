import React, { useState, useEffect, useMemo } from "react";
import { Box, Typography, CircularProgress, Menu, Button } from "@mui/material";
import {
  Person as PersonIcon,
  Add as AddIcon,
  ExpandMore as ExpandMoreIcon,
  Business as OrganizationIcon,
  Public as GlobalIcon,
} from "@mui/icons-material";
import { useIndividuals, useOrganisations } from "../../hooks/useLocalData";
import { Individual } from "../../db/schema";
import { CreateUserModal } from "../CreateUserModal";
import { useScopeInfo } from "../../utils/breadcrumbUtils";
import classes from "./EnhancedUserPicker.module.css";

interface UserPickerProps {
  selectedUserId: string | null;
  onUserChange: (userId: string, user: Individual) => void;
  className?: string;
  organisationId?: string;
  compact?: boolean;
  showContextIndicator?: boolean;
}

export const UserPicker: React.FC<UserPickerProps> = ({
  selectedUserId,
  onUserChange,
  className,
  organisationId,
  compact = false,
  showContextIndicator = true,
}) => {
  const {
    data: individuals = [],
    isLoading,
    error,
  } = useIndividuals(organisationId);
  const { data: organisations = [] } = useOrganisations();
  const scopeInfo = useScopeInfo(organisations);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [createUserModalOpen, setCreateUserModalOpen] = useState(false);

  // Create organisation lookup
  const organisationsMap = useMemo(() => {
    return organisations.reduce((acc, org) => {
      acc[org.PK] = org;
      return acc;
    }, {} as Record<string, any>);
  }, [organisations]);

  // Get selected user details
  const selectedUser = useMemo(() => {
    return individuals.find((user) => user.PK === selectedUserId);
  }, [individuals, selectedUserId]);

  // Auto-select first user if none selected and users are available
  useEffect(() => {
    if (!selectedUserId && individuals.length > 0) {
      const firstUser = individuals[0];
      onUserChange(firstUser.PK, firstUser);
    }
  }, [selectedUserId, individuals, onUserChange]);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleUserSelect = (userId: string) => {
    if (userId === "CREATE_NEW") {
      setCreateUserModalOpen(true);
      return;
    }

    const user = individuals.find((u) => u.PK === userId);

    if (user) {
      onUserChange(userId, user);

      // Persist selection in localStorage
      try {
        localStorage.setItem("selectedUserId", userId);
      } catch (error) {
        console.warn("Failed to save user selection to localStorage:", error);
      }
    }

    handleClose();
  };

  const handleUserCreated = (userId: string) => {
    // The user will be automatically selected when the individuals query refetches
    setCreateUserModalOpen(false);
  };

  // Helper function to get user initials
  const getUserInitials = (user: Individual) => {
    return `${user.FirstName?.[0] || ""}${
      user.LastName?.[0] || ""
    }`.toUpperCase();
  };

  // Load persisted selection on mount
  useEffect(() => {
    if (!selectedUserId && individuals.length > 0) {
      try {
        const savedUserId = localStorage.getItem("selectedUserId");
        if (savedUserId) {
          const savedUser = individuals.find((u) => u.PK === savedUserId);
          if (savedUser) {
            onUserChange(savedUserId, savedUser);
            return;
          }
        }
      } catch (error) {
        console.warn("Failed to load user selection from localStorage:", error);
      }

      // Fallback to first user
      const firstUser = individuals[0];
      onUserChange(firstUser.PK, firstUser);
    }
  }, [individuals, selectedUserId, onUserChange]);

  if (isLoading) {
    return (
      <Box
        className={`${classes.userPicker} ${compact ? classes.compact : ""} ${
          classes.disabled
        }`}
      >
        <Box className={classes.userAvatar}>
          <CircularProgress size={16} sx={{ color: "white" }} />
        </Box>
        {!compact && (
          <Box className={classes.userInfo}>
            <Typography className={classes.userLabel}>Loading</Typography>
            <Typography className={classes.userName}>Please wait...</Typography>
          </Box>
        )}
      </Box>
    );
  }

  if (error) {
    return (
      <Box
        className={`${classes.userPicker} ${compact ? classes.compact : ""} ${
          classes.disabled
        }`}
      >
        <Box className={`${classes.userAvatar} ${classes.placeholder}`}>
          <PersonIcon />
        </Box>
        {!compact && (
          <Box className={classes.userInfo}>
            <Typography className={classes.userLabel}>Error</Typography>
            <Typography className={classes.userName}>Failed to load</Typography>
          </Box>
        )}
      </Box>
    );
  }

  return (
    <>
      <Box
        className={`${classes.userPicker} ${compact ? classes.compact : ""} ${
          className || ""
        }`}
        onClick={handleClick}
        role="button"
        aria-label="Select user"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            handleClick(e as any);
          }
        }}
      >
        {/* User Avatar */}
        <Box
          className={`${classes.userAvatar} ${compact ? classes.compact : ""} ${
            !selectedUser ? classes.placeholder : ""
          }`}
        >
          {selectedUser ? getUserInitials(selectedUser) : <PersonIcon />}
        </Box>

        {/* User Info */}
        {!compact && (
          <Box className={classes.userInfo}>
            <Typography className={classes.userLabel}>
              {scopeInfo.isGlobal ? "Global User" : "Team Member"}
            </Typography>
            <Typography
              className={`${classes.userName} ${
                !selectedUser ? classes.placeholder : ""
              }`}
            >
              {selectedUser
                ? `${selectedUser.FirstName} ${selectedUser.LastName}`
                : "Select User"}
            </Typography>
            {selectedUser && (
              <Typography className={classes.userRole}>
                £{selectedUser.AnnualGross.toLocaleString()}/year
              </Typography>
            )}
          </Box>
        )}

        {/* Context Indicator */}
        {showContextIndicator && !compact && (
          <Box className={classes.contextIndicator}>
            {scopeInfo.isGlobal ? (
              <GlobalIcon className={classes.contextIcon} />
            ) : (
              <OrganizationIcon className={classes.contextIcon} />
            )}
            {scopeInfo.isGlobal ? "Global" : "Org"}
          </Box>
        )}

        {/* Dropdown Indicator */}
        <Box className={classes.dropdownIndicator}>
          <ExpandMoreIcon className={classes.dropdownIcon} />
        </Box>
      </Box>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        PaperProps={{
          className: classes.userMenu,
        }}
        transformOrigin={{ horizontal: "right", vertical: "top" }}
        anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
      >
        {/* Menu Header */}
        <Box className={classes.menuHeader}>
          <Typography className={classes.menuTitle}>
            Select Team Member
          </Typography>
          <Typography className={classes.menuSubtitle}>
            {scopeInfo.isGlobal
              ? `${individuals.length} users across all organizations`
              : `${individuals.length} users in ${
                  scopeInfo.organizationName || "this organization"
                }`}
          </Typography>
        </Box>

        {/* User List */}
        <Box className={classes.menuSection}>
          {individuals.map((individual) => (
            <Box
              key={individual.PK}
              className={`${classes.menuItem} ${
                selectedUserId === individual.PK ? classes.active : ""
              }`}
              onClick={() => handleUserSelect(individual.PK)}
            >
              <Box className={classes.menuItemContent}>
                <Box className={classes.menuItemAvatar}>
                  {getUserInitials(individual)}
                </Box>
                <Box className={classes.menuItemInfo}>
                  <Typography className={classes.menuItemName}>
                    {individual.FirstName} {individual.LastName}
                  </Typography>
                  <Typography className={classes.menuItemDetails}>
                    £{individual.AnnualGross.toLocaleString()}/year
                    {individual.OrganisationID &&
                      organisationsMap[individual.OrganisationID] && (
                        <>
                          {" "}
                          • {organisationsMap[individual.OrganisationID].Name}
                        </>
                      )}
                  </Typography>
                </Box>
              </Box>
            </Box>
          ))}
        </Box>

        {/* Create User Action */}
        <Box className={classes.createUserAction}>
          <Button
            className={classes.createUserButton}
            onClick={() => handleUserSelect("CREATE_NEW")}
            fullWidth
          >
            <AddIcon className={classes.createUserIcon} />
            Create New User
          </Button>
        </Box>
      </Menu>

      <CreateUserModal
        open={createUserModalOpen}
        onClose={() => setCreateUserModalOpen(false)}
        onUserCreated={handleUserCreated}
      />
    </>
  );
};
