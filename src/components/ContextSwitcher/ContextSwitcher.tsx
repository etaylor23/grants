import React, { useState } from "react";
import {
  Box,
  Button,
  Menu,
  MenuItem,
  Chip,
  Typography,
  Divider,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import {
  Public as GlobalIcon,
  Business as OrganizationIcon,
  ExpandMore as ExpandMoreIcon,
  Dashboard as DashboardIcon,
  CalendarToday as CalendarIcon,
  Assignment as GrantIcon,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useScopeInfo } from "../../utils/breadcrumbUtils";
import { createContextTransitionManager } from "../../utils/contextTransitions";
import { useOrganisations } from "../../hooks/useLocalData";

interface ContextSwitcherProps {
  /**
   * Custom styling
   */
  sx?: object;
}

export const ContextSwitcher: React.FC<ContextSwitcherProps> = ({
  sx = {},
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
      <Button
        onClick={handleClick}
        endIcon={<ExpandMoreIcon />}
        sx={{
          color: "rgba(255, 255, 255, 0.9)",
          textTransform: "none",
          "&:hover": {
            backgroundColor: "rgba(255, 255, 255, 0.1)",
          },
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Chip
            icon={scopeInfo.isGlobal ? <GlobalIcon /> : <OrganizationIcon />}
            label={
              scopeInfo.isGlobal
                ? "Global"
                : scopeInfo.organizationName || "Organization"
            }
            size="small"
            variant={scopeInfo.isGlobal ? "outlined" : "filled"}
            sx={{
              backgroundColor: scopeInfo.isGlobal
                ? "transparent"
                : "rgba(255, 255, 255, 0.2)",
              color: "rgba(255, 255, 255, 0.9)",
              borderColor: "rgba(255, 255, 255, 0.5)",
              "& .MuiChip-icon": {
                color: "rgba(255, 255, 255, 0.9)",
              },
            }}
          />
          <Typography
            variant="body2"
            sx={{ color: "rgba(255, 255, 255, 0.7)" }}
          >
            Switch Context
          </Typography>
        </Box>
      </Button>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        PaperProps={{
          sx: {
            minWidth: 280,
            maxHeight: 400,
            overflow: "auto",
          },
        }}
        transformOrigin={{ horizontal: "right", vertical: "top" }}
        anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
      >
        {/* Global Options */}
        <Box sx={{ px: 2, py: 1 }}>
          <Typography
            variant="overline"
            sx={{ fontWeight: 600, color: "#1976d2" }}
          >
            Global Views
          </Typography>
        </Box>
        {globalOptions.map((option) => (
          <MenuItem
            key={option.path}
            onClick={() => handleGlobalNavigation(option.path)}
            sx={{
              py: 1,
              "&:hover": {
                backgroundColor: "rgba(25, 118, 210, 0.04)",
              },
            }}
          >
            <ListItemIcon sx={{ color: "#1976d2" }}>{option.icon}</ListItemIcon>
            <ListItemText primary={option.label} />
          </MenuItem>
        ))}

        {/* Organizations */}
        {organisations.length > 0 && (
          <>
            <Divider sx={{ my: 1 }} />
            <Box sx={{ px: 2, py: 1 }}>
              <Typography
                variant="overline"
                sx={{ fontWeight: 600, color: "#2e7d32" }}
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
                  sx={{
                    py: 1,
                    backgroundColor:
                      scopeInfo.organizationId === org.CompanyNumber
                        ? "rgba(46, 125, 50, 0.08)"
                        : "transparent",
                    "&:hover": {
                      backgroundColor: "rgba(46, 125, 50, 0.04)",
                    },
                  }}
                >
                  <ListItemIcon sx={{ color: "#2e7d32" }}>
                    <OrganizationIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary={org.Name}
                    secondary={`Company: ${org.CompanyNumber}`}
                    primaryTypographyProps={{
                      fontWeight:
                        scopeInfo.organizationId === org.CompanyNumber
                          ? 600
                          : 400,
                    }}
                  />
                </MenuItem>

                {/* Quick organization actions */}
                {scopeInfo.organizationId === org.CompanyNumber && (
                  <Box sx={{ pl: 4, pb: 1 }}>
                    <MenuItem
                      onClick={() =>
                        handleOrganizationNavigation(
                          org.CompanyNumber,
                          "/calendar"
                        )
                      }
                      sx={{ py: 0.5, minHeight: "auto" }}
                    >
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        <CalendarIcon fontSize="small" />
                      </ListItemIcon>
                      <ListItemText
                        primary="Calendar"
                        primaryTypographyProps={{ fontSize: "0.875rem" }}
                      />
                    </MenuItem>
                    <MenuItem
                      onClick={() =>
                        handleOrganizationNavigation(
                          org.CompanyNumber,
                          "/grants"
                        )
                      }
                      sx={{ py: 0.5, minHeight: "auto" }}
                    >
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        <GrantIcon fontSize="small" />
                      </ListItemIcon>
                      <ListItemText
                        primary="Grants"
                        primaryTypographyProps={{ fontSize: "0.875rem" }}
                      />
                    </MenuItem>
                  </Box>
                )}
              </Box>
            ))}
          </>
        )}

        {/* No organizations message */}
        {organisations.length === 0 && (
          <>
            <Divider sx={{ my: 1 }} />
            <Box sx={{ px: 2, py: 2, textAlign: "center" }}>
              <Typography variant="body2" color="text.secondary">
                No organizations found
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Create an organization to access organization-specific views
              </Typography>
            </Box>
          </>
        )}
      </Menu>
    </Box>
  );
};
