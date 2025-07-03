import React from "react";
import { Breadcrumbs, Link, Typography, Box, Chip } from "@mui/material";
import {
  NavigateNext as NavigateNextIcon,
  Public as GlobalIcon,
  Business as OrganizationIcon,
} from "@mui/icons-material";
import { useNavigate, useLocation } from "react-router-dom";
import { useBreadcrumbs, useScopeInfo } from "../../utils/breadcrumbUtils";
import { useGrants, useOrganisations } from "../../hooks/useLocalData";

interface HeaderBreadcrumbsProps {
  /**
   * Optional custom styling for the breadcrumb container
   */
  sx?: object;
  /**
   * Whether to show the breadcrumbs (useful for conditional rendering)
   */
  show?: boolean;
}

export const HeaderBreadcrumbs: React.FC<HeaderBreadcrumbsProps> = ({
  sx = {},
  show = true,
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

  // Don't render if show is false or if we're on the home page
  if (!show || location.pathname === "/" || breadcrumbs.length <= 1) {
    return null;
  }

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 2,
        minHeight: "32px", // Ensure consistent height
        ...sx,
      }}
    >
      {/* Scope Indicator */}
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
          fontSize: "0.75rem",
        }}
      />
      <Breadcrumbs
        separator={<NavigateNextIcon fontSize="small" />}
        aria-label="breadcrumb"
        sx={{
          "& .MuiBreadcrumbs-separator": {
            color: "rgba(255, 255, 255, 0.7)",
            mx: 1,
          },
          "& .MuiBreadcrumbs-ol": {
            flexWrap: "nowrap", // Prevent wrapping in header
          },
        }}
      >
        {breadcrumbs.map((item, index) => {
          const isLast = index === breadcrumbs.length - 1;

          if (isLast) {
            return (
              <Typography
                key={item.path}
                sx={{
                  fontWeight: 500,
                  color: "rgba(255, 255, 255, 0.9)",
                  fontSize: "0.875rem",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  maxWidth: "200px", // Prevent very long names from breaking layout
                }}
              >
                {item.label}
              </Typography>
            );
          }

          return (
            <Link
              key={item.path}
              href={item.path}
              onClick={handleClick(item.path)}
              sx={{
                color: "rgba(255, 255, 255, 0.7)",
                textDecoration: "none",
                fontSize: "0.875rem",
                whiteSpace: "nowrap",
                "&:hover": {
                  color: "rgba(255, 255, 255, 0.9)",
                  textDecoration: "underline",
                },
              }}
            >
              {item.label}
            </Link>
          );
        })}
      </Breadcrumbs>
    </Box>
  );
};
