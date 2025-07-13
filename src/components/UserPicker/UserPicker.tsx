import React, { useState, useEffect, useMemo } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  Menu,
  Button,
  TextField,
  Checkbox,
  InputAdornment,
  Divider,
} from "@mui/material";
import {
  Person as PersonIcon,
  Add as AddIcon,
  ExpandMore as ExpandMoreIcon,
  Business as OrganizationIcon,
  Public as GlobalIcon,
  Search as SearchIcon,
  SelectAll as SelectAllIcon,
  Clear as ClearIcon,
} from "@mui/icons-material";
import { useIndividuals, useOrganisations } from "../../hooks/useLocalData";
import { Individual } from "../../db/schema";
import { CreateUserModal } from "../CreateUserModal";
import { useScopeInfo } from "../../utils/breadcrumbUtils";
import classes from "./EnhancedUserPicker.module.css";

interface UserPickerProps {
  selectedUserIds?: string[];
  selectedUserId?: string | null; // Legacy support for single-select
  onUserChange?: (userId: string, user: Individual) => void; // Legacy support
  onUsersChange?: (userIds: string[], users: Individual[]) => void;
  className?: string;
  organisationId?: string;
  compact?: boolean;
  showContextIndicator?: boolean;
  multiSelect?: boolean;
  maxDisplayUsers?: number;
}

export const UserPicker: React.FC<UserPickerProps> = ({
  selectedUserIds = [],
  selectedUserId, // Legacy support
  onUserChange, // Legacy support
  onUsersChange,
  className,
  organisationId,
  compact = false,
  showContextIndicator = true,
  multiSelect = true,
  maxDisplayUsers = 3,
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
  const [searchQuery, setSearchQuery] = useState("");

  // Internal state for selected users (supports both single and multi-select)
  const [internalSelectedIds, setInternalSelectedIds] = useState<string[]>(
    () => {
      if (multiSelect) {
        return selectedUserIds;
      } else if (selectedUserId) {
        return [selectedUserId];
      }
      return [];
    }
  );

  // Create organisation lookup
  const organisationsMap = useMemo(() => {
    return organisations.reduce((acc, org) => {
      acc[org.PK] = org;
      return acc;
    }, {} as Record<string, any>);
  }, [organisations]);

  // Filter individuals based on search query
  const filteredIndividuals = useMemo(() => {
    if (!searchQuery.trim()) {
      return individuals;
    }

    const query = searchQuery.toLowerCase().trim();
    return individuals.filter((individual) => {
      const fullName =
        `${individual.FirstName} ${individual.LastName}`.toLowerCase();
      return (
        fullName.includes(query) ||
        individual.FirstName.toLowerCase().includes(query) ||
        individual.LastName.toLowerCase().includes(query)
      );
    });
  }, [individuals, searchQuery]);

  // Get selected users details
  const selectedUsers = useMemo(() => {
    return individuals.filter((user) => internalSelectedIds.includes(user.PK));
  }, [individuals, internalSelectedIds]);

  // Legacy: Get single selected user for backward compatibility
  const selectedUser = useMemo(() => {
    if (!multiSelect && internalSelectedIds.length > 0) {
      return individuals.find((user) => user.PK === internalSelectedIds[0]);
    }
    return individuals.find((user) => user.PK === selectedUserId);
  }, [individuals, selectedUserId, internalSelectedIds, multiSelect]);

  // Auto-select first user if none selected and users are available
  useEffect(() => {
    if (!selectedUserId && individuals.length > 0 && onUserChange) {
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
    if (!user) return;

    if (multiSelect) {
      // Multi-select mode: toggle user selection
      const newSelectedIds = internalSelectedIds.includes(userId)
        ? internalSelectedIds.filter((id) => id !== userId)
        : [...internalSelectedIds, userId];

      setInternalSelectedIds(newSelectedIds);

      const newSelectedUsers = individuals.filter((u) =>
        newSelectedIds.includes(u.PK)
      );
      onUsersChange?.(newSelectedIds, newSelectedUsers);

      // Persist multi-selection in localStorage
      try {
        localStorage.setItem("selectedUserIds", JSON.stringify(newSelectedIds));
      } catch (error) {
        console.warn("Failed to save user selections to localStorage:", error);
      }
    } else {
      // Single-select mode: replace selection
      setInternalSelectedIds([userId]);
      onUserChange?.(userId, user);

      // Persist single selection in localStorage
      try {
        localStorage.setItem("selectedUserId", userId);
      } catch (error) {
        console.warn("Failed to save user selection to localStorage:", error);
      }

      handleClose();
    }
  };

  const handleSelectAll = () => {
    if (!multiSelect) return;

    const allIds = filteredIndividuals.map((u) => u.PK);
    setInternalSelectedIds(allIds);
    onUsersChange?.(allIds, filteredIndividuals);

    try {
      localStorage.setItem("selectedUserIds", JSON.stringify(allIds));
    } catch (error) {
      console.warn("Failed to save user selections to localStorage:", error);
    }
  };

  const handleClearAll = () => {
    if (!multiSelect) return;

    setInternalSelectedIds([]);
    onUsersChange?.([], []);

    try {
      localStorage.setItem("selectedUserIds", JSON.stringify([]));
    } catch (error) {
      console.warn("Failed to save user selections to localStorage:", error);
    }
  };

  const handleUserCreated = () => {
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
    if (individuals.length === 0) return;

    if (multiSelect) {
      // Multi-select mode: load from selectedUserIds or localStorage
      if (selectedUserIds.length === 0) {
        try {
          const savedUserIds = localStorage.getItem("selectedUserIds");
          if (savedUserIds) {
            const parsedIds = JSON.parse(savedUserIds) as string[];
            const validIds = parsedIds.filter((id) =>
              individuals.some((u) => u.PK === id)
            );
            if (validIds.length > 0) {
              setInternalSelectedIds(validIds);
              const validUsers = individuals.filter((u) =>
                validIds.includes(u.PK)
              );
              onUsersChange?.(validIds, validUsers);
              return;
            }
          }
        } catch (error) {
          console.warn(
            "Failed to load user selections from localStorage:",
            error
          );
        }

        // Fallback: select first user in multi-select mode
        const firstUser = individuals[0];
        setInternalSelectedIds([firstUser.PK]);
        onUsersChange?.([firstUser.PK], [firstUser]);
      }
    } else {
      // Single-select mode: maintain backward compatibility
      if (!selectedUserId && internalSelectedIds.length === 0) {
        try {
          const savedUserId = localStorage.getItem("selectedUserId");
          if (savedUserId) {
            const savedUser = individuals.find((u) => u.PK === savedUserId);
            if (savedUser) {
              setInternalSelectedIds([savedUserId]);
              onUserChange?.(savedUserId, savedUser);
              return;
            }
          }
        } catch (error) {
          console.warn(
            "Failed to load user selection from localStorage:",
            error
          );
        }

        // Fallback to first user
        const firstUser = individuals[0];
        setInternalSelectedIds([firstUser.PK]);
        onUserChange?.(firstUser.PK, firstUser);
      }
    }
  }, [
    individuals,
    selectedUserId,
    selectedUserIds,
    multiSelect,
    onUserChange,
    onUsersChange,
    internalSelectedIds.length,
  ]);

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
        aria-label={
          multiSelect
            ? `Select team members. Currently ${internalSelectedIds.length} selected`
            : "Select team member"
        }
        aria-expanded={Boolean(anchorEl)}
        aria-haspopup="listbox"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleClick(e as any);
          } else if (e.key === "Escape" && anchorEl) {
            handleClose();
          }
        }}
      >
        {/* Multi-Select Display */}
        {multiSelect ? (
          <>
            {/* Multi-User Avatar Stack */}
            <Box className={classes.multiUserAvatars}>
              {selectedUsers.slice(0, maxDisplayUsers).map((user, index) => (
                <Box
                  key={user.PK}
                  className={`${classes.userAvatar} ${classes.stacked}`}
                  style={{ zIndex: maxDisplayUsers - index }}
                >
                  {getUserInitials(user)}
                </Box>
              ))}
              {selectedUsers.length > maxDisplayUsers && (
                <Box className={`${classes.userAvatar} ${classes.overflow}`}>
                  +{selectedUsers.length - maxDisplayUsers}
                </Box>
              )}
              {selectedUsers.length === 0 && (
                <Box className={`${classes.userAvatar} ${classes.placeholder}`}>
                  <PersonIcon />
                </Box>
              )}
            </Box>

            {/* Multi-User Info */}
            {!compact && (
              <Box className={classes.userInfo}>
                <Typography className={classes.userLabel}>
                  {multiSelect
                    ? "Team Members"
                    : scopeInfo.isGlobal
                    ? "Global User"
                    : "Team Member"}
                </Typography>
                <Typography
                  className={`${classes.userName} ${
                    selectedUsers.length === 0 ? classes.placeholder : ""
                  }`}
                >
                  {selectedUsers.length === 0
                    ? "Select Users"
                    : selectedUsers.length === 1
                    ? `${selectedUsers[0].FirstName} ${selectedUsers[0].LastName}`
                    : `${selectedUsers.length} users selected`}
                </Typography>
              </Box>
            )}
          </>
        ) : (
          <>
            {/* Single-User Avatar */}
            <Box
              className={`${classes.userAvatar} ${
                compact ? classes.compact : ""
              } ${!selectedUser ? classes.placeholder : ""}`}
            >
              {selectedUser ? getUserInitials(selectedUser) : <PersonIcon />}
            </Box>

            {/* Single-User Info */}
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
          </>
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
        slotProps={{
          paper: {
            className: classes.userMenu,
          },
        }}
        transformOrigin={{ horizontal: "right", vertical: "top" }}
        anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
      >
        {/* Menu Header */}
        <Box className={classes.menuHeader}>
          <Typography className={classes.menuTitle}>
            {multiSelect ? "Select Team Members" : "Select Team Member"}
          </Typography>
          <Typography className={classes.menuSubtitle}>
            {scopeInfo.isGlobal
              ? `${filteredIndividuals.length} of ${individuals.length} users across all organizations`
              : `${filteredIndividuals.length} of ${
                  individuals.length
                } users in ${
                  scopeInfo.organizationName || "this organization"
                }`}
          </Typography>
        </Box>

        {/* Search Field */}
        <Box className={classes.searchSection}>
          <TextField
            className={classes.searchField}
            placeholder="Search team members..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            size="small"
            fullWidth
            aria-label="Search team members"
            inputProps={{
              "aria-describedby": "search-help-text",
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon
                    className={classes.searchIcon}
                    aria-hidden="true"
                  />
                </InputAdornment>
              ),
              endAdornment: searchQuery && (
                <InputAdornment position="end">
                  <Button
                    size="small"
                    onClick={() => setSearchQuery("")}
                    sx={{ minWidth: "auto", p: 0.5 }}
                    aria-label="Clear search"
                  >
                    <ClearIcon fontSize="small" aria-hidden="true" />
                  </Button>
                </InputAdornment>
              ),
            }}
          />
          <Typography
            id="search-help-text"
            variant="caption"
            sx={{
              position: "absolute",
              left: "-9999px",
              fontSize: 0,
            }}
          >
            Type to filter team members by name
          </Typography>
        </Box>

        {/* Multi-Select Controls */}
        {multiSelect && (
          <Box
            className={classes.multiSelectControls}
            role="toolbar"
            aria-label="Selection controls"
          >
            <Button
              size="small"
              startIcon={<SelectAllIcon aria-hidden="true" />}
              onClick={handleSelectAll}
              disabled={filteredIndividuals.length === 0}
              className={classes.controlButton}
              aria-label={`Select all ${filteredIndividuals.length} team members`}
            >
              Select All ({filteredIndividuals.length})
            </Button>
            <Button
              size="small"
              startIcon={<ClearIcon aria-hidden="true" />}
              onClick={handleClearAll}
              disabled={internalSelectedIds.length === 0}
              className={classes.controlButton}
              aria-label={`Clear all ${internalSelectedIds.length} selected team members`}
            >
              Clear All
            </Button>
          </Box>
        )}

        {filteredIndividuals.length > 0 && <Divider />}

        {/* User List */}
        <Box
          className={classes.menuSection}
          role="listbox"
          aria-label="Team members"
          aria-multiselectable={multiSelect}
        >
          {filteredIndividuals.length === 0 ? (
            <Box className={classes.noResults} role="status" aria-live="polite">
              <Typography className={classes.noResultsText}>
                {searchQuery.trim()
                  ? `No users found matching "${searchQuery}"`
                  : "No users available"}
              </Typography>
            </Box>
          ) : (
            filteredIndividuals.map((individual) => {
              const isSelected = internalSelectedIds.includes(individual.PK);
              return (
                <Box
                  key={individual.PK}
                  className={`${classes.menuItem} ${
                    isSelected ? classes.active : ""
                  }`}
                  onClick={() => handleUserSelect(individual.PK)}
                  role="option"
                  aria-selected={isSelected}
                  aria-label={`${individual.FirstName} ${
                    individual.LastName
                  }, £${individual.AnnualGross.toLocaleString()} per year${
                    individual.OrganisationID &&
                    organisationsMap[individual.OrganisationID]
                      ? `, ${organisationsMap[individual.OrganisationID].Name}`
                      : ""
                  }`}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleUserSelect(individual.PK);
                    }
                  }}
                >
                  <Box className={classes.menuItemContent}>
                    {/* Checkbox for multi-select */}
                    {multiSelect && (
                      <Checkbox
                        checked={isSelected}
                        onChange={() => handleUserSelect(individual.PK)}
                        size="small"
                        className={classes.menuItemCheckbox}
                        onClick={(e) => e.stopPropagation()}
                        aria-label={`${isSelected ? "Deselect" : "Select"} ${
                          individual.FirstName
                        } ${individual.LastName}`}
                        tabIndex={-1}
                      />
                    )}

                    <Box className={classes.menuItemAvatar} aria-hidden="true">
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
                              •{" "}
                              {organisationsMap[individual.OrganisationID].Name}
                            </>
                          )}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              );
            })
          )}
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
