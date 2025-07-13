import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GrantViewPage } from "./GrantViewPage";

// Mock the hooks
jest.mock("../hooks/useLocalData", () => ({
  useGrants: jest.fn(),
  useOrganisations: jest.fn(),
  useTimeSlots: jest.fn(),
  useIndividuals: jest.fn(),
}));

// Mock the components
jest.mock("../components/Layout/AppLayout", () => ({
  AppLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="app-layout">{children}</div>
  ),
}));

jest.mock("../components/BreadcrumbNavigation", () => ({
  BreadcrumbNavigation: ({ items }: { items: any[] }) => (
    <nav data-testid="breadcrumb-navigation">
      {items.map((item, index) => (
        <span key={index}>{item.label}</span>
      ))}
    </nav>
  ),
}));

jest.mock("../components/GrantDashboardTable", () => ({
  GrantDashboardTable: (props: any) => (
    <div data-testid="grant-dashboard-table">
      Grant: {props.grant?.Title}
      Period: {props.periodType}
    </div>
  ),
}));

// Mock react-router-dom params
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useParams: () => ({
    orgNumber: "ORG123",
    grantId: "GRANT456",
  }),
}));

const mockUseGrants = require("../hooks/useLocalData").useGrants;
const mockUseOrganisations = require("../hooks/useLocalData").useOrganisations;
const mockUseTimeSlots = require("../hooks/useLocalData").useTimeSlots;
const mockUseIndividuals = require("../hooks/useLocalData").useIndividuals;

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{children}</BrowserRouter>
    </QueryClientProvider>
  );
};

describe("GrantViewPage", () => {
  const mockGrant = {
    PK: "GRANT456",
    Title: "Test Grant",
    StartDate: "2024-01-01",
    EndDate: "2024-12-31",
    ManagerUserID: "USER123",
    OrganisationID: "ORG123",
    TotalClaimableAmount: 100000,
  };

  const mockOrganisation = {
    PK: "ORG123",
    Name: "Test Organisation",
    CompanyNumber: "ORG123",
    CreatedDate: "2024-01-01T00:00:00.000Z",
  };

  const mockTimeSlots = [
    {
      UserID: "USER123",
      Date: "2024-01-15",
      GrantID: "GRANT456",
      HoursAllocated: 8,
    },
  ];

  const mockIndividuals = [
    {
      PK: "USER123",
      FirstName: "John",
      LastName: "Doe",
      AnnualGross: 52000,
    },
  ];

  beforeEach(() => {
    mockUseGrants.mockReturnValue({
      data: [mockGrant],
      isLoading: false,
      error: null,
    });

    mockUseOrganisations.mockReturnValue({
      data: [mockOrganisation],
      isLoading: false,
    });

    mockUseTimeSlots.mockReturnValue({
      data: mockTimeSlots,
      isLoading: false,
    });

    mockUseIndividuals.mockReturnValue({
      data: mockIndividuals,
      isLoading: false,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("renders loading state correctly", () => {
    mockUseGrants.mockReturnValue({
      data: [],
      isLoading: true,
      error: null,
    });

    render(<GrantViewPage />, { wrapper: createWrapper() });

    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  it("renders error state when grants fail to load", () => {
    mockUseGrants.mockReturnValue({
      data: [],
      isLoading: false,
      error: { message: "Failed to load grants" },
    });

    render(<GrantViewPage />, { wrapper: createWrapper() });

    expect(screen.getByText(/Error loading grant data/)).toBeInTheDocument();
    expect(screen.getByText(/Failed to load grants/)).toBeInTheDocument();
  });

  it("renders grant not found when grant does not exist", () => {
    mockUseGrants.mockReturnValue({
      data: [], // No grants
      isLoading: false,
      error: null,
    });

    render(<GrantViewPage />, { wrapper: createWrapper() });

    expect(
      screen.getByText(/Grant not found or you don't have access to it/)
    ).toBeInTheDocument();
  });

  it("renders grant view page correctly with data", () => {
    render(<GrantViewPage />, { wrapper: createWrapper() });

    // Check header
    expect(screen.getByText("Test Grant")).toBeInTheDocument();
    expect(
      screen.getByText("Grant Dashboard - Test Organisation")
    ).toBeInTheDocument();
    expect(
      screen.getByText("📊 Detailed grant analysis and cost breakdown")
    ).toBeInTheDocument();

    // Check breadcrumb
    expect(screen.getByTestId("breadcrumb-navigation")).toBeInTheDocument();

    // Check period selector
    expect(screen.getByText("Time Period View:")).toBeInTheDocument();
    expect(
      screen.getByLabelText("View grant data by monthly periods")
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText("View grant data by quarterly periods")
    ).toBeInTheDocument();

    // Check dashboard table
    expect(screen.getByTestId("grant-dashboard-table")).toBeInTheDocument();
    expect(screen.getByText("Grant: Test Grant")).toBeInTheDocument();
    expect(screen.getByText("Period: monthly")).toBeInTheDocument();
  });

  it("handles period type change correctly", async () => {
    render(<GrantViewPage />, { wrapper: createWrapper() });

    const quarterlyButton = screen.getByLabelText(
      "View grant data by quarterly periods"
    );

    fireEvent.click(quarterlyButton);

    await waitFor(() => {
      expect(screen.getByText("Period: quarterly")).toBeInTheDocument();
    });
  });

  it("has proper accessibility attributes", () => {
    render(<GrantViewPage />, { wrapper: createWrapper() });

    // Check ARIA labels and roles
    expect(
      screen.getByRole("region", { name: /period selector/i })
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText("Select time period view for grant data analysis")
    ).toBeInTheDocument();

    // Check screen reader descriptions
    expect(
      screen.getByText("Display grant costs broken down by individual months")
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Display grant costs broken down by quarters (3-month periods)"
      )
    ).toBeInTheDocument();
  });

  it("navigates back to organisations when organisation not found", () => {
    mockUseOrganisations.mockReturnValue({
      data: [], // No organisations
      isLoading: false,
    });

    // This would normally trigger a navigation, but in tests we just check the component doesn't crash
    render(<GrantViewPage />, { wrapper: createWrapper() });

    // The Navigate component should be rendered (though we can't easily test the actual navigation in this setup)
    expect(screen.queryByText("Test Grant")).not.toBeInTheDocument();
  });
});
