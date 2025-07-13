import { NavigateFunction, useNavigate } from "react-router-dom";
import { Organisation } from "../db/schema";

export interface TransitionOptions {
  /**
   * Whether to preserve the current user selection when transitioning
   */
  preserveUser?: boolean;
  /**
   * Whether to preserve the current date/view when transitioning
   */
  preserveView?: boolean;
  /**
   * Custom parameters to include in the transition
   */
  params?: Record<string, string>;
}

export interface ContextTransitionManager {
  /**
   * Navigate to global view from organization context
   */
  toGlobal: (targetView?: string, options?: TransitionOptions) => void;
  /**
   * Navigate to organization context from global view
   */
  toOrganization: (
    orgNumber: string,
    targetView?: string,
    options?: TransitionOptions
  ) => void;
  /**
   * Switch between organizations
   */
  switchOrganization: (
    fromOrgNumber: string,
    toOrgNumber: string,
    options?: TransitionOptions
  ) => void;
  /**
   * Get the equivalent route in the opposite context
   */
  getEquivalentRoute: (
    currentPath: string,
    targetContext: "global" | "organization",
    orgNumber?: string
  ) => string;
}

/**
 * Creates a context transition manager for seamless navigation
 */
export const createContextTransitionManager = (
  navigate: NavigateFunction,
  organisations: Organisation[] = []
): ContextTransitionManager => {
  const getCurrentView = (pathname: string): string => {
    if (pathname.includes("/calendar")) return "calendar";
    if (pathname.includes("/grants")) return "grants";
    if (pathname.includes("/individuals")) return "individuals";
    if (pathname.includes("/timesheets")) return "timesheets";
    return "dashboard";
  };

  const buildRoute = (
    context: "global" | "organization",
    view: string,
    orgNumber?: string,
    options: TransitionOptions = {}
  ): string => {
    let route = "";

    if (context === "global") {
      switch (view) {
        case "calendar":
          route = "/calendar";
          break;
        case "grants":
          route = "/grants";
          break;
        case "dashboard":
        default:
          route = "/";
          break;
      }
    } else {
      // Organization context
      if (!orgNumber)
        throw new Error(
          "Organization number required for organization context"
        );

      switch (view) {
        case "calendar":
          route = `/calendar/${orgNumber}`;
          break;
        case "grants":
          route = `/grants/${orgNumber}`;
          break;
        case "individuals":
          route = `/organisation/${orgNumber}/individuals`;
          break;
        case "timesheets":
          route = `/organisation/${orgNumber}/timesheets`;
          break;
        case "dashboard":
        default:
          route = `/organisation/${orgNumber}`;
          break;
      }
    }

    // Add query parameters if specified
    if (options.params && Object.keys(options.params).length > 0) {
      const searchParams = new URLSearchParams(options.params);
      route += `?${searchParams.toString()}`;
    }

    return route;
  };

  const toGlobal = (targetView?: string, options: TransitionOptions = {}) => {
    const currentPath = window.location.pathname;
    const view = targetView || getCurrentView(currentPath);
    const route = buildRoute("global", view, undefined, options);

    navigate(route);
  };

  const toOrganization = (
    orgNumber: string,
    targetView?: string,
    options: TransitionOptions = {}
  ) => {
    const currentPath = window.location.pathname;
    const view = targetView || getCurrentView(currentPath);
    const route = buildRoute("organization", view, orgNumber, options);

    navigate(route);
  };

  const switchOrganization = (
    fromOrgNumber: string,
    toOrgNumber: string,
    options: TransitionOptions = {}
  ) => {
    const currentPath = window.location.pathname;
    const view = getCurrentView(currentPath);
    const route = buildRoute("organization", view, toOrgNumber, options);

    navigate(route);
  };

  const getEquivalentRoute = (
    currentPath: string,
    targetContext: "global" | "organization",
    orgNumber?: string
  ): string => {
    const view = getCurrentView(currentPath);
    return buildRoute(targetContext, view, orgNumber);
  };

  return {
    toGlobal,
    toOrganization,
    switchOrganization,
    getEquivalentRoute,
  };
};

/**
 * Hook for context transitions
 */
export const useContextTransitions = (organisations: Organisation[] = []) => {
  const navigate = useNavigate();

  return createContextTransitionManager(navigate, organisations);
};

/**
 * Utility to determine if a transition should preserve state
 */
export const shouldPreserveState = (
  fromPath: string,
  toPath: string
): boolean => {
  const fromView = fromPath.split("/")[1] || "dashboard";
  const toView = toPath.split("/")[1] || "dashboard";

  // Preserve state when switching between same views in different contexts
  return fromView === toView;
};

/**
 * Animation configuration for context transitions
 */
export const transitionConfig = {
  duration: 300,
  easing: "cubic-bezier(0.4, 0, 0.2, 1)",
  fadeOut: {
    opacity: 0,
    transform: "translateY(-10px)",
  },
  fadeIn: {
    opacity: 1,
    transform: "translateY(0)",
  },
};
