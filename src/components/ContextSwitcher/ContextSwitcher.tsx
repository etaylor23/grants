import React, { useState } from "react";
import {
  Box,
  Menu,
  MenuItem,
  Typography,
  Divider,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import {
  Public as GlobalIcon,
  Business as OrganizationIcon,
  Dashboard as DashboardIcon,
  CalendarToday as CalendarIcon,
  Assignment as GrantIcon,
  SwapHoriz as SwitchIcon,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useScopeInfo } from "../../utils/breadcrumbUtils";
import { createContextTransitionManager } from "../../utils/contextTransitions";
import { useOrganisations } from "../../hooks/useLocalData";
import classes from "./EnhancedContextIndicator.module.css";

interface ContextSwitcherProps {
  /**
   * Custom styling
   */
  sx?: object;
  /**
   * Whether to show in compact mode (for mobile)
   */
  compact?: boolean;
}

export const ContextSwitcher: React.FC<ContextSwitcherProps> = ({
  sx = {},
  compact = false,
}) => {
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const { data: organisations = [] } = useOrganisations();
  const scopeInfo = useScopeInfo(organisations);
  const transitionManager = createContextTransitionManager(
    navigate,
    organisations
  );

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleGlobalNavigation = (path: string) => {
    const view = path === "/" ? "dashboard" : path.substring(1);
    transitionManager.toGlobal(view, { preserveUser: true });
    handleClose();
  };

  const handleOrganizationNavigation = (
    orgNumber: string,
    subPath: string = ""
  ) => {
    const view = subPath === "" ? "dashboard" : subPath.substring(1);
    transitionManager.toOrganization(orgNumber, view, { preserveUser: true });
    handleClose();
  };

  const globalOptions = [
    { label: "Dashboard", path: "/", icon: <DashboardIcon /> },
    { label: "Global Calendar", path: "/calendar", icon: <CalendarIcon /> },
    { label: "Global Grants", path: "/grants", icon: <GrantIcon /> },
    {
      label: "Organizations",
      path: "/organisations",
      icon: <OrganizationIcon />,
    },
  ];

  return (
    <Box sx={sx}>
      <Box
        className={`${classes.contextIndicator} ${
          compact ? classes.compact : ""
        } ${scopeInfo.isGlobal ? "" : classes.contextTransition}`}
        onClick={handleClick}
        role="button"
        aria-label="Switch context"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            handleClick(e as any);
          }
        }}
      >
        {/* Context Badge */}
        <Box
          className={`${classes.contextBadge} ${
            scopeInfo.isGlobal ? classes.global : classes.organization
          }`}
        >
          {scopeInfo.isGlobal ? (
            <GlobalIcon className={classes.icon} />
          ) : (
            <OrganizationIcon className={classes.icon} />
          )}
          {scopeInfo.isGlobal ? "Global" : "Org"}
        </Box>

        {/* Context Info */}
        {!compact && (
          <Box className={classes.contextInfo}>
            <Typography className={classes.contextLabel}>
              {scopeInfo.isGlobal ? "Global Context" : "Organization"}
            </Typography>
            <Typography
              className={`${classes.contextName} ${
                compact ? classes.compact : ""
              }`}
            >
              {scopeInfo.isGlobal
                ? "All Organizations"
                : scopeInfo.organizationName || "Unknown Organization"}
            </Typography>
          </Box>
        )}

        {/* Switch Indicator */}
        <Box className={classes.switchIndicator}>
          <SwitchIcon className={classes.switchIcon} />
        </Box>
      </Box>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        PaperProps={{
          className: classes.contextMenu,
        }}
        transformOrigin={{ horizontal: "right", vertical: "top" }}
        anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
      >
        {/* Global Options */}
        <Box className={classes.menuSection}>
          <Box className={classes.menuSectionHeader}>
            <Typography
              className={`${classes.menuSectionTitle} ${classes.global}`}
            >
              Global Views
            </Typography>
          </Box>
          {globalOptions.map((option) => (
            <MenuItem
              key={option.path}
              onClick={() => handleGlobalNavigation(option.path)}
              className={`${classes.menuItem} ${
                scopeInfo.isGlobal && window.location.pathname === option.path
                  ? classes.active
                  : ""
              }`}
            >
              <ListItemIcon className={classes.menuItemIcon}>
                {option.icon}
              </ListItemIcon>
              <ListItemText
                primary={option.label}
                className={classes.menuItemText}
              />
            </MenuItem>
          ))}
        </Box>

        {/* Organizations */}
        {organisations.length > 0 && (
          <Box className={classes.menuSection}>
            <Divider />
            <Box className={classes.menuSectionHeader}>
              <Typography
                className={`${classes.menuSectionTitle} ${classes.organization}`}
              >
                Organizations
              </Typography>
            </Box>
            {organisations.map((org) => (
              <Box key={org.PK}>
                <MenuItem
                  onClick={() =>
                    handleOrganizationNavigation(org.CompanyNumber)
                  }
                  className={`${classes.menuItem} ${
                    scopeInfo.organizationId === org.CompanyNumber
                      ? `${classes.active} ${classes.organization}`
                      : ""
                  }`}
                >
                  <ListItemIcon className={classes.menuItemIcon}>
                    <OrganizationIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary={org.Name}
                    secondary={`Company: ${org.CompanyNumber}`}
                    className={classes.menuItemText}
                  />
                </MenuItem>

                {/* Quick organization actions */}
                {scopeInfo.organizationId === org.CompanyNumber && (
                  <Box className={classes.organizationSubmenu}>
                    <MenuItem
                      onClick={() =>
                        handleOrganizationNavigation(
                          org.CompanyNumber,
                          "/calendar"
                        )
                      }
                      className={classes.submenuItem}
                    >
                      <ListItemIcon className={classes.submenuItemIcon}>
                        <CalendarIcon />
                      </ListItemIcon>
                      <ListItemText primary="Calendar" />
                    </MenuItem>
                    <MenuItem
                      onClick={() =>
                        handleOrganizationNavigation(
                          org.CompanyNumber,
                          "/grants"
                        )
                      }
                      className={classes.submenuItem}
                    >
                      <ListItemIcon className={classes.submenuItemIcon}>
                        <GrantIcon />
                      </ListItemIcon>
                      <ListItemText primary="Grants" />
                    </MenuItem>
                  </Box>
                )}
              </Box>
            ))}
          </Box>
        )}

        {/* No organizations message */}
        {organisations.length === 0 && (
          <Box className={classes.menuSection}>
            <Divider />
            <Box sx={{ px: 2, py: 2, textAlign: "center" }}>
              <Typography variant="body2" color="text.secondary">
                No organizations found
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Create an organization to access organization-specific views
              </Typography>
            </Box>
          </Box>
        )}
      </Menu>
    </Box>
  );
};
