import React from "react";
import { Typography, Box } from "@mui/material";
import {
  NavigateNext as NavigateNextIcon,
  Home as HomeIcon,
  Business as OrganizationIcon,
  Assignment as GrantIcon,
  CalendarToday as CalendarIcon,
} from "@mui/icons-material";
import { useNavigate, useLocation } from "react-router-dom";
import { useBreadcrumbs, useScopeInfo } from "../../utils/breadcrumbUtils";
import { useGrants, useOrganisations } from "../../hooks/useLocalData";
import classes from "./EnhancedBreadcrumbs.module.css";

interface HeaderBreadcrumbsProps {
  /**
   * Optional custom styling for the breadcrumb container
   */
  sx?: object;
  /**
   * Whether to show the breadcrumbs (useful for conditional rendering)
   */
  show?: boolean;
  /**
   * Whether to use flat design instead of circular breadcrumbs
   */
  flat?: boolean;
  /**
   * Whether to use compact mode for smaller screens
   */
  compact?: boolean;
}

export const HeaderBreadcrumbs: React.FC<HeaderBreadcrumbsProps> = ({
  sx = {},
  show = true,
  flat = false,
  compact = false,
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Fetch data for breadcrumb generation
  const { data: organisations = [], isLoading: orgsLoading } =
    useOrganisations();
  const { data: grants = [], isLoading: grantsLoading } = useGrants();

  // Generate breadcrumbs for current route
  const breadcrumbs = useBreadcrumbs({
    organisations,
    grants,
    isLoading: orgsLoading || grantsLoading,
  });

  // Get scope information
  const scopeInfo = useScopeInfo(organisations);

  const handleClick = (path: string) => (event: React.MouseEvent) => {
    event.preventDefault();
    navigate(path);
  };

  // Helper function to get icon for breadcrumb item
  const getBreadcrumbIcon = (item: any) => {
    if (item.path === "/")
      return <HomeIcon className={classes.breadcrumbIcon} />;
    if (item.path.includes("/calendar"))
      return <CalendarIcon className={classes.breadcrumbIcon} />;
    if (item.path.includes("/grants"))
      return <GrantIcon className={classes.breadcrumbIcon} />;
    if (item.path.includes("/organisation"))
      return <OrganizationIcon className={classes.breadcrumbIcon} />;
    return null;
  };

  // Don't render if show is false or if we're on the home page
  if (!show || location.pathname === "/" || breadcrumbs.length <= 1) {
    return null;
  }

  return (
    <Box
      className={`${classes.breadcrumbContainer} ${flat ? classes.flat : ""} ${
        scopeInfo.isGlobal ? classes.global : classes.organization
      }`}
      sx={sx}
    >
      {breadcrumbs.map((item, index) => {
        const isLast = index === breadcrumbs.length - 1;
        const isLoading = orgsLoading || grantsLoading;

        if (isLast) {
          return (
            <Box
              key={item.path}
              className={`${classes.breadcrumbItem} ${classes.active} ${
                isLoading ? classes.breadcrumbLoading : ""
              }`}
            >
              {getBreadcrumbIcon(item)}
              <Typography
                className={`${classes.breadcrumbText} ${
                  compact ? classes.compact : ""
                }`}
              >
                {isLoading ? "Loading..." : item.label}
              </Typography>
            </Box>
          );
        }

        return (
          <React.Fragment key={item.path}>
            <Box
              className={`${classes.breadcrumbItem} ${classes.breadcrumbTransition}`}
              onClick={handleClick(item.path)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  handleClick(item.path)(e as any);
                }
              }}
            >
              {getBreadcrumbIcon(item)}
              <Typography
                className={`${classes.breadcrumbText} ${
                  compact ? classes.compact : ""
                }`}
              >
                {item.label}
              </Typography>
            </Box>
            {!flat && (
              <NavigateNextIcon className={classes.breadcrumbSeparator} />
            )}
          </React.Fragment>
        );
      })}
    </Box>
  );
};
