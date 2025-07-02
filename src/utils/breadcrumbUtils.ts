import { useLocation } from "react-router-dom";
import { Grant, Individual, Organisation } from "../db/schema";

export interface BreadcrumbItem {
  label: string;
  path: string;
  icon?: React.ReactNode;
}

export interface BreadcrumbContext {
  organisations?: Organisation[];
  grants?: Grant[];
  individuals?: Individual[];
  isLoading?: boolean;
}

/**
 * Generates breadcrumb items based on the current route and available data
 */
export const generateBreadcrumbs = (
  pathname: string,
  context: BreadcrumbContext = {}
): BreadcrumbItem[] => {
  const { organisations = [], grants = [], isLoading = false } = context;
  const breadcrumbs: BreadcrumbItem[] = [];

  // Always start with Home
  breadcrumbs.push({
    label: "Home",
    path: "/",
  });

  // Parse the pathname to determine the current route structure
  const pathSegments = pathname.split("/").filter(Boolean);

  // Handle different route patterns
  if (pathSegments.length === 0) {
    // Root path - just Home
    return breadcrumbs;
  }

  // Check for organisations routes
  if (
    pathSegments[0] === "organisations" ||
    pathSegments[0] === "organisation"
  ) {
    breadcrumbs.push({
      label: "Organisations",
      path: "/organisations",
    });

    // If we have a specific organisation
    if (pathSegments.length >= 2 && pathSegments[0] === "organisation") {
      const orgNumber = pathSegments[1];
      const organisation = organisations.find(
        (org) => org.CompanyNumber === orgNumber
      );

      // Only add organisation breadcrumb if we have data or are loading
      if (organisation || isLoading) {
        breadcrumbs.push({
          label:
            organisation?.Name ||
            (isLoading ? "Loading..." : `Organisation ${orgNumber}`),
          path: `/organisation/${orgNumber}`,
        });
      }

      // Check for grants routes within organisation
      if (pathSegments.length >= 3 && pathSegments[2] === "grants") {
        breadcrumbs.push({
          label: "Grants",
          path: `/organisation/${orgNumber}/grants`,
        });

        // If we have a specific grant
        if (pathSegments.length >= 4) {
          const grantId = pathSegments[3];
          const grant = grants.find(
            (g) => g.PK === grantId && g.OrganisationID === organisation?.PK
          );

          // Only add grant breadcrumb if we have data or are loading
          if (grant || isLoading) {
            breadcrumbs.push({
              label:
                grant?.Title || (isLoading ? "Loading..." : "Grant Details"),
              path: `/organisation/${orgNumber}/grants/${grantId}`,
            });
          }
        }
      }

      // Check for other organisation sub-routes (timesheets, individuals, calendar, etc.)
      if (pathSegments.length >= 3 && pathSegments[2] === "timesheets") {
        breadcrumbs.push({
          label: "Timesheets",
          path: `/organisation/${orgNumber}/timesheets`,
        });
      }

      if (pathSegments.length >= 3 && pathSegments[2] === "individuals") {
        breadcrumbs.push({
          label: "Team Members",
          path: `/organisation/${orgNumber}/individuals`,
        });
      }

      if (pathSegments.length >= 3 && pathSegments[2] === "calendar") {
        breadcrumbs.push({
          label: "Calendar",
          path: `/organisation/${orgNumber}/calendar`,
        });
      }
    }
  }

  // Handle grants list route (if it exists at root level)
  if (pathSegments[0] === "grants") {
    breadcrumbs.push({
      label: "Grants",
      path: "/grants",
    });
  }

  // Handle main calendar route
  if (pathSegments[0] === "calendar") {
    breadcrumbs.push({
      label: "Calendar",
      path: "/calendar",
    });
  }

  // Handle timesheet routes
  if (pathSegments[0] === "timesheet") {
    breadcrumbs.push({
      label: "Timesheet",
      path: "/timesheet",
    });

    // If we have a specific user timesheet
    if (pathSegments.length >= 2) {
      const userSlug = pathSegments[1];
      // Convert slug back to readable name
      const userName = userSlug
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");

      breadcrumbs.push({
        label: userName,
        path: `/timesheet/${userSlug}`,
      });
    }
  }

  // Handle legacy local routes for backward compatibility
  if (pathSegments[0] === "local-calendar") {
    breadcrumbs.push({
      label: "Calendar",
      path: "/local-calendar",
    });
  }

  if (pathSegments[0] === "local-timesheet") {
    breadcrumbs.push({
      label: "Timesheet",
      path: "/local-timesheet",
    });

    // If we have a specific user timesheet
    if (pathSegments.length >= 2) {
      const userSlug = pathSegments[1];
      // Convert slug back to readable name
      const userName = userSlug
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");

      breadcrumbs.push({
        label: userName,
        path: `/local-timesheet/${userSlug}`,
      });
    }
  }

  return breadcrumbs;
};

/**
 * Hook to get breadcrumbs for the current route
 */
export const useBreadcrumbs = (
  context: BreadcrumbContext = {}
): BreadcrumbItem[] => {
  const location = useLocation();
  return generateBreadcrumbs(location.pathname, context);
};
