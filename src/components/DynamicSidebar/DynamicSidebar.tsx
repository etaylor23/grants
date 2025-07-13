import React from "react";
import {
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Box,
  Typography,
  Chip,
} from "@mui/material";
import {
  Dashboard as DashboardIcon,
  CalendarToday as CalendarIcon,
  Assignment as GrantIcon,
  Business as OrganizationIcon,
  People as PeopleIcon,
  Schedule as ScheduleIcon,
  ArrowBack as ArrowBackIcon,
} from "@mui/icons-material";
import { useNavigate, useLocation } from "react-router-dom";
import { useScopeInfo } from "../../utils/breadcrumbUtils";
import { useOrganisations } from "../../hooks/useLocalData";

interface NavigationItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  badge?: string;
}

interface DynamicSidebarProps {
  /**
   * Current organization ID if in organization context
   */
  organizationId?: string;
}

export const DynamicSidebar: React.FC<DynamicSidebarProps> = ({
  organizationId,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { data: organisations = [] } = useOrganisations();
  const scopeInfo = useScopeInfo(organisations);

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  const isSelected = (path: string) => {
    if (path === "/" && location.pathname === "/") return true;
    if (path !== "/" && location.pathname.startsWith(path)) return true;
    return false;
  };

  // Global navigation items
  const globalNavItems: NavigationItem[] = [
    {
      label: "Dashboard",
      path: "/",
      icon: <DashboardIcon />,
    },
    {
      label: "Global Calendar",
      path: "/calendar",
      icon: <CalendarIcon />,
    },
    {
      label: "Global Grants",
      path: "/grants",
      icon: <GrantIcon />,
    },
    {
      label: "Organizations",
      path: "/organisations",
      icon: <OrganizationIcon />,
    },
  ];

  // Organization-specific navigation items
  const getOrganizationNavItems = (orgNumber: string): NavigationItem[] => [
    {
      label: "Organization Dashboard",
      path: `/organisation/${orgNumber}`,
      icon: <DashboardIcon />,
    },
    {
      label: "Calendar",
      path: `/calendar/${orgNumber}`,
      icon: <CalendarIcon />,
    },
    {
      label: "Grants",
      path: `/grants/${orgNumber}`,
      icon: <GrantIcon />,
    },
    {
      label: "Team Members",
      path: `/organisation/${orgNumber}/individuals`,
      icon: <PeopleIcon />,
    },
    {
      label: "Timesheets",
      path: `/organisation/${orgNumber}/timesheets`,
      icon: <ScheduleIcon />,
    },
  ];

  const renderNavigationItems = (items: NavigationItem[]) => (
    <>
      {items.map((item) => (
        <ListItem key={item.path} disablePadding>
          <ListItemButton
            selected={isSelected(item.path)}
            onClick={() => handleNavigation(item.path)}
            sx={{
              "&.Mui-selected": {
                backgroundColor: "rgba(25, 118, 210, 0.12)",
                borderRight: "3px solid #1976d2",
                "& .MuiListItemIcon-root": {
                  color: "#1976d2",
                },
                "& .MuiListItemText-primary": {
                  color: "#1976d2",
                  fontWeight: 600,
                },
              },
            }}
          >
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText
              primary={item.label}
              primaryTypographyProps={{
                fontSize: "0.875rem",
              }}
            />
            {item.badge && (
              <Chip
                label={item.badge}
                size="small"
                sx={{
                  height: 20,
                  fontSize: "0.75rem",
                }}
              />
            )}
          </ListItemButton>
        </ListItem>
      ))}
    </>
  );

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Context Header */}
      <Box
        sx={{
          p: 2,
          backgroundColor: scopeInfo.isGlobal ? "#f8f9fa" : "#e8f5e8",
        }}
      >
        <Typography
          variant="overline"
          sx={{
            fontWeight: 600,
            color: scopeInfo.isGlobal ? "#1976d2" : "#2e7d32",
            letterSpacing: 1,
          }}
        >
          {scopeInfo.isGlobal ? "Global View" : "Organization View"}
        </Typography>
        {!scopeInfo.isGlobal && scopeInfo.organizationName && (
          <Typography
            variant="body2"
            sx={{
              fontWeight: 500,
              color: "#2e7d32",
              mt: 0.5,
            }}
          >
            {scopeInfo.organizationName}
          </Typography>
        )}
      </Box>

      {/* Navigation Items */}
      <Box sx={{ flex: 1, overflow: "auto" }}>
        <List sx={{ py: 1 }}>
          {scopeInfo.isGlobal ? (
            renderNavigationItems(globalNavItems)
          ) : (
            <>
              {/* Back to Global */}
              <ListItem disablePadding>
                <ListItemButton
                  onClick={() => handleNavigation("/")}
                  sx={{
                    color: "#1976d2",
                    "&:hover": {
                      backgroundColor: "rgba(25, 118, 210, 0.04)",
                    },
                  }}
                >
                  <ListItemIcon>
                    <ArrowBackIcon sx={{ color: "#1976d2" }} />
                  </ListItemIcon>
                  <ListItemText
                    primary="Back to Global"
                    primaryTypographyProps={{
                      fontSize: "0.875rem",
                      fontWeight: 500,
                    }}
                  />
                </ListItemButton>
              </ListItem>

              <Divider sx={{ my: 1 }} />

              {/* Organization Navigation */}
              {scopeInfo.organizationId &&
                renderNavigationItems(
                  getOrganizationNavItems(scopeInfo.organizationId)
                )}
            </>
          )}
        </List>
      </Box>
    </Box>
  );
};
