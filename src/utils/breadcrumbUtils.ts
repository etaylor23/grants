import { useLocation } from "react-router-dom";
import { Grant, Individual, Organisation } from "../db/schema";

export interface BreadcrumbItem {
  label: string;
  path: string;
  icon?: React.ReactNode;
  scope?: "global" | "organization";
  scopeIndicator?: string;
}

export interface BreadcrumbContext {
  organisations?: Organisation[];
  grants?: Grant[];
  individuals?: Individual[];
  isLoading?: boolean;
}

export interface ScopeInfo {
  isGlobal: boolean;
  organizationId?: string;
  organizationName?: string;
  contextType: "global" | "organization" | "mixed";
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

  // Always start with Dashboard
  breadcrumbs.push({
    label: "Dashboard",
    path: "/",
    scope: "global",
  });

  // Parse the pathname to determine the current route structure
  const pathSegments = pathname.split("/").filter(Boolean);

  // Handle different route patterns
  if (pathSegments.length === 0) {
    // Root path - just Dashboard
    return breadcrumbs;
  }

  // Determine if we're in organization context
  const isOrganizationContext =
    pathSegments.length >= 2 && pathSegments[0] === "organisation";
  const currentOrgNumber = isOrganizationContext ? pathSegments[1] : null;
  const currentOrganisation = currentOrgNumber
    ? organisations.find((org) => org.CompanyNumber === currentOrgNumber)
    : null;

  // Check for organisations routes
  if (
    pathSegments[0] === "organisations" ||
    pathSegments[0] === "organisation"
  ) {
    breadcrumbs.push({
      label: "Organisations",
      path: "/organisations",
      scope: "global",
      scopeIndicator: "Global",
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
          scope: "organization",
          scopeIndicator: organisation?.Name || `Org ${orgNumber}`,
        });
      }

      // Check for grants routes within organisation
      if (pathSegments.length >= 3 && pathSegments[2] === "grants") {
        breadcrumbs.push({
          label: "Grants",
          path: `/organisation/${orgNumber}/grants`,
          scope: "organization",
          scopeIndicator: organisation?.Name || `Org ${orgNumber}`,
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
              scope: "organization",
              scopeIndicator: organisation?.Name || `Org ${orgNumber}`,
            });
          }
        }
      }

      // Check for other organisation sub-routes (timesheets, individuals, calendar, etc.)
      if (pathSegments.length >= 3 && pathSegments[2] === "timesheets") {
        breadcrumbs.push({
          label: "Timesheets",
          path: `/organisation/${orgNumber}/timesheets`,
          scope: "organization",
          scopeIndicator: organisation?.Name || `Org ${orgNumber}`,
        });
      }

      if (pathSegments.length >= 3 && pathSegments[2] === "individuals") {
        breadcrumbs.push({
          label: "Team Members",
          path: `/organisation/${orgNumber}/individuals`,
          scope: "organization",
          scopeIndicator: organisation?.Name || `Org ${orgNumber}`,
        });
      }

      if (pathSegments.length >= 3 && pathSegments[2] === "calendar") {
        breadcrumbs.push({
          label: "Calendar",
          path: `/organisation/${orgNumber}/calendar`,
          scope: "organization",
          scopeIndicator: organisation?.Name || `Org ${orgNumber}`,
        });
      }
    }
  }

  // Handle grants list route (if it exists at root level)
  if (pathSegments[0] === "grants") {
    if (pathSegments.length >= 2) {
      // Organization-specific grants: /grants/:orgNumber
      const orgNumber = pathSegments[1];
      const organisation = organisations.find(
        (org) => org.CompanyNumber === orgNumber
      );

      breadcrumbs.push({
        label: "Grants",
        path: `/grants/${orgNumber}`,
        scope: "organization",
        scopeIndicator: organisation?.Name || `Org ${orgNumber}`,
      });

      // Handle grant detail: /grants/:orgNumber/:grantId
      if (pathSegments.length >= 3) {
        const grantId = pathSegments[2];
        const grant = grants.find(
          (g) => g.PK === grantId && g.OrganisationID === organisation?.PK
        );

        if (grant || isLoading) {
          breadcrumbs.push({
            label: grant?.Title || (isLoading ? "Loading..." : "Grant Details"),
            path: `/grants/${orgNumber}/${grantId}`,
            scope: "organization",
            scopeIndicator: organisation?.Name || `Org ${orgNumber}`,
          });
        }
      }
    } else {
      // Global grants: /grants
      breadcrumbs.push({
        label: "Grants",
        path: "/grants",
        scope: "global",
        scopeIndicator: "Global",
      });
    }
  }

  // Handle main calendar route
  if (pathSegments[0] === "calendar") {
    if (pathSegments.length >= 2) {
      // Organization-specific calendar: /calendar/:orgNumber
      const orgNumber = pathSegments[1];
      const organisation = organisations.find(
        (org) => org.CompanyNumber === orgNumber
      );

      breadcrumbs.push({
        label: "Calendar",
        path: `/calendar/${orgNumber}`,
        scope: "organization",
        scopeIndicator: organisation?.Name || `Org ${orgNumber}`,
      });
    } else {
      // Global calendar: /calendar
      breadcrumbs.push({
        label: "Calendar",
        path: "/calendar",
        scope: "global",
        scopeIndicator: "Global",
      });
    }
  }

  // Handle timesheet routes
  if (pathSegments[0] === "timesheet") {
    breadcrumbs.push({
      label: "Timesheet",
      path: "/timesheet",
      scope: "global",
      scopeIndicator: "Global",
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
        scope: "global",
        scopeIndicator: "Global",
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
 * Determines the current scope information based on the URL
 */
export const getScopeInfo = (
  pathname: string,
  organisations: Organisation[] = []
): ScopeInfo => {
  const pathSegments = pathname.split("/").filter(Boolean);

  // Default to global scope
  const scopeInfo: ScopeInfo = {
    isGlobal: true,
    contextType: "global",
  };

  // Check if we're in an organization context
  if (pathSegments.length >= 2 && pathSegments[0] === "organisation") {
    const orgNumber = pathSegments[1];
    const organisation = organisations.find(
      (org) => org.CompanyNumber === orgNumber
    );

    scopeInfo.isGlobal = false;
    scopeInfo.organizationId = orgNumber;
    scopeInfo.organizationName = organisation?.Name;
    scopeInfo.contextType = "organization";
  }

  // Check for unified organization routes
  if (
    pathSegments.length >= 2 &&
    (pathSegments[0] === "calendar" || pathSegments[0] === "grants")
  ) {
    const orgNumber = pathSegments[1];
    const organisation = organisations.find(
      (org) => org.CompanyNumber === orgNumber
    );

    scopeInfo.isGlobal = false;
    scopeInfo.organizationId = orgNumber;
    scopeInfo.organizationName = organisation?.Name;
    scopeInfo.contextType = "organization";
  }

  return scopeInfo;
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

/**
 * Hook to get current scope information
 */
export const useScopeInfo = (organisations: Organisation[] = []): ScopeInfo => {
  const location = useLocation();
  return getScopeInfo(location.pathname, organisations);
};
