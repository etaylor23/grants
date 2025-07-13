import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ContextSwitcher } from "./ContextSwitcher";

// Mock the hooks
jest.mock("../../hooks/useLocalData", () => ({
  useOrganisations: jest.fn(),
}));

jest.mock("../../utils/breadcrumbUtils", () => ({
  useScopeInfo: jest.fn(),
}));

jest.mock("../../utils/contextTransitions", () => ({
  createContextTransitionManager: jest.fn(),
}));

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
  useLocation: () => ({ pathname: "/test" }),
}));

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {component}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe("Enhanced ContextSwitcher", () => {
  const mockOrganisations = [
    {
      PK: "org1",
      Name: "Test Organization 1",
      CompanyNumber: "12345",
    },
    {
      PK: "org2", 
      Name: "Test Organization 2",
      CompanyNumber: "67890",
    },
  ];

  const mockTransitionManager = {
    toGlobal: jest.fn(),
    toOrganization: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    const { useOrganisations } = require("../../hooks/useLocalData");
    const { useScopeInfo } = require("../../utils/breadcrumbUtils");
    const { createContextTransitionManager } = require("../../utils/contextTransitions");

    useOrganisations.mockReturnValue({
      data: mockOrganisations,
      isLoading: false,
    });

    createContextTransitionManager.mockReturnValue(mockTransitionManager);
  });

  describe("Global Context", () => {
    beforeEach(() => {
      const { useScopeInfo } = require("../../utils/breadcrumbUtils");
      useScopeInfo.mockReturnValue({
        isGlobal: true,
        organizationId: undefined,
        organizationName: undefined,
        contextType: "global",
      });
    });

    it("displays global context indicator", () => {
      renderWithProviders(<ContextSwitcher />);

      expect(screen.getByText("Global")).toBeInTheDocument();
      expect(screen.getByText("Global Context")).toBeInTheDocument();
      expect(screen.getByText("All Organizations")).toBeInTheDocument();
    });

    it("shows global badge styling", () => {
      renderWithProviders(<ContextSwitcher />);

      const contextBadge = screen.getByText("Global").closest("div");
      expect(contextBadge).toHaveClass("global");
    });

    it("opens context menu when clicked", async () => {
      renderWithProviders(<ContextSwitcher />);

      const contextIndicator = screen.getByRole("button", { name: "Switch context" });
      fireEvent.click(contextIndicator);

      await waitFor(() => {
        expect(screen.getByText("Global Views")).toBeInTheDocument();
        expect(screen.getByText("Organizations")).toBeInTheDocument();
      });
    });

    it("shows global navigation options", async () => {
      renderWithProviders(<ContextSwitcher />);

      const contextIndicator = screen.getByRole("button", { name: "Switch context" });
      fireEvent.click(contextIndicator);

      await waitFor(() => {
        expect(screen.getByText("Dashboard")).toBeInTheDocument();
        expect(screen.getByText("Global Calendar")).toBeInTheDocument();
        expect(screen.getByText("Global Grants")).toBeInTheDocument();
        expect(screen.getByText("Organizations")).toBeInTheDocument();
      });
    });
  });

  describe("Organization Context", () => {
    beforeEach(() => {
      const { useScopeInfo } = require("../../utils/breadcrumbUtils");
      useScopeInfo.mockReturnValue({
        isGlobal: false,
        organizationId: "12345",
        organizationName: "Test Organization 1",
        contextType: "organization",
      });
    });

    it("displays organization context indicator", () => {
      renderWithProviders(<ContextSwitcher />);

      expect(screen.getByText("Org")).toBeInTheDocument();
      expect(screen.getByText("Organization")).toBeInTheDocument();
      expect(screen.getByText("Test Organization 1")).toBeInTheDocument();
    });

    it("shows organization badge styling", () => {
      renderWithProviders(<ContextSwitcher />);

      const contextBadge = screen.getByText("Org").closest("div");
      expect(contextBadge).toHaveClass("organization");
    });

    it("shows current organization as active in menu", async () => {
      renderWithProviders(<ContextSwitcher />);

      const contextIndicator = screen.getByRole("button", { name: "Switch context" });
      fireEvent.click(contextIndicator);

      await waitFor(() => {
        const activeOrgItem = screen.getByText("Test Organization 1").closest("div");
        expect(activeOrgItem).toHaveClass("active");
        expect(activeOrgItem).toHaveClass("organization");
      });
    });
  });

  describe("Compact Mode", () => {
    it("hides context info in compact mode", () => {
      const { useScopeInfo } = require("../../utils/breadcrumbUtils");
      useScopeInfo.mockReturnValue({
        isGlobal: true,
        organizationId: undefined,
        organizationName: undefined,
        contextType: "global",
      });

      renderWithProviders(<ContextSwitcher compact={true} />);

      expect(screen.queryByText("Global Context")).not.toBeInTheDocument();
      expect(screen.queryByText("All Organizations")).not.toBeInTheDocument();
      expect(screen.getByText("Global")).toBeInTheDocument(); // Badge should still be visible
    });

    it("applies compact styling", () => {
      renderWithProviders(<ContextSwitcher compact={true} />);

      const contextIndicator = screen.getByRole("button", { name: "Switch context" });
      expect(contextIndicator).toHaveClass("compact");
    });
  });

  describe("Navigation Actions", () => {
    beforeEach(() => {
      const { useScopeInfo } = require("../../utils/breadcrumbUtils");
      useScopeInfo.mockReturnValue({
        isGlobal: true,
        organizationId: undefined,
        organizationName: undefined,
        contextType: "global",
      });
    });

    it("navigates to global views when clicked", async () => {
      renderWithProviders(<ContextSwitcher />);

      const contextIndicator = screen.getByRole("button", { name: "Switch context" });
      fireEvent.click(contextIndicator);

      await waitFor(() => {
        const dashboardOption = screen.getByText("Dashboard");
        fireEvent.click(dashboardOption);
      });

      expect(mockTransitionManager.toGlobal).toHaveBeenCalledWith("dashboard", { preserveUser: true });
    });

    it("navigates to organization views when clicked", async () => {
      renderWithProviders(<ContextSwitcher />);

      const contextIndicator = screen.getByRole("button", { name: "Switch context" });
      fireEvent.click(contextIndicator);

      await waitFor(() => {
        const orgOption = screen.getByText("Test Organization 1");
        fireEvent.click(orgOption);
      });

      expect(mockTransitionManager.toOrganization).toHaveBeenCalledWith("12345", "dashboard", { preserveUser: true });
    });

    it("closes menu after navigation", async () => {
      renderWithProviders(<ContextSwitcher />);

      const contextIndicator = screen.getByRole("button", { name: "Switch context" });
      fireEvent.click(contextIndicator);

      await waitFor(() => {
        const dashboardOption = screen.getByText("Dashboard");
        fireEvent.click(dashboardOption);
      });

      // Menu should close after navigation
      await waitFor(() => {
        expect(screen.queryByText("Global Views")).not.toBeInTheDocument();
      });
    });
  });

  describe("Keyboard Navigation", () => {
    it("opens menu with Enter key", () => {
      renderWithProviders(<ContextSwitcher />);

      const contextIndicator = screen.getByRole("button", { name: "Switch context" });
      fireEvent.keyDown(contextIndicator, { key: "Enter" });

      expect(screen.getByText("Global Views")).toBeInTheDocument();
    });

    it("opens menu with Space key", () => {
      renderWithProviders(<ContextSwitcher />);

      const contextIndicator = screen.getByRole("button", { name: "Switch context" });
      fireEvent.keyDown(contextIndicator, { key: " " });

      expect(screen.getByText("Global Views")).toBeInTheDocument();
    });
  });

  describe("Visual Feedback", () => {
    it("shows context transition animation for organization context", () => {
      const { useScopeInfo } = require("../../utils/breadcrumbUtils");
      useScopeInfo.mockReturnValue({
        isGlobal: false,
        organizationId: "12345",
        organizationName: "Test Organization 1",
        contextType: "organization",
      });

      renderWithProviders(<ContextSwitcher />);

      const contextIndicator = screen.getByRole("button", { name: "Switch context" });
      expect(contextIndicator).toHaveClass("contextTransition");
    });

    it("shows switch icon rotation on hover", () => {
      renderWithProviders(<ContextSwitcher />);

      const switchIcon = document.querySelector(".switchIcon");
      expect(switchIcon).toBeInTheDocument();
    });
  });
});
