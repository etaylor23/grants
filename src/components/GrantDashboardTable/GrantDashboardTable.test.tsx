import React from "react";
import { render, screen } from "@testing-library/react";
import { GrantDashboardTable } from "./GrantDashboardTable";
import { Grant, Organisation, Individual, TimeSlot } from "../../db/schema";
import { PeriodType } from "../../models/grantDashboard";

// Mock the calculation utilities
jest.mock("../../utils/grantCalculations", () => ({
  calculateCostTypeResults: jest.fn(),
  formatCurrency: jest.fn((value: number) => `£${value.toLocaleString()}`),
  formatHours: jest.fn((hours: number) => `${hours.toFixed(1)}h`),
}));

const mockCalculateCostTypeResults =
  require("../../utils/grantCalculations").calculateCostTypeResults;

describe("GrantDashboardTable", () => {
  const mockGrant: Grant = {
    PK: "GRANT123",
    Title: "Test Grant",
    StartDate: "2024-01-01",
    EndDate: "2024-12-31",
    ManagerUserID: "USER123",
    OrganisationID: "ORG123",
    TotalClaimableAmount: 100000,
  };

  const mockOrganisation: Organisation = {
    PK: "ORG123",
    Name: "Test Organisation",
    CompanyNumber: "ORG123",
    CreatedDate: "2024-01-01T00:00:00.000Z",
  };

  const mockTimeSlots: TimeSlot[] = [
    {
      PK: "USER123",
      SK: "2024-01-15#GRANT123",
      AllocationPercent: 100,
      HoursAllocated: 8,
      Date: "2024-01-15",
      GrantID: "GRANT123",
      UserID: "USER123",
    },
  ];

  const mockIndividuals: Individual[] = [
    {
      PK: "USER123",
      FirstName: "John",
      LastName: "Doe",
      AnnualGross: 52000,
      Pension: 2600,
      NationalIns: 4000,
      OrganisationID: "ORG123",
    },
  ];

  const mockCostTypeResults = [
    {
      costType: "Staff" as const,
      periods: [
        {
          periodId: "2024-01",
          periodLabel: "Jan 2024",
          startDate: "2024-01-01",
          endDate: "2024-01-31",
          totalHours: 8,
          totalValue: 200,
        },
        {
          periodId: "2024-02",
          periodLabel: "Feb 2024",
          startDate: "2024-02-01",
          endDate: "2024-02-29",
          totalHours: 0,
          totalValue: 0,
        },
      ],
      totalHours: 8,
      totalValue: 200,
    },
    {
      costType: "Overheads" as const,
      periods: [
        {
          periodId: "2024-01",
          periodLabel: "Jan 2024",
          startDate: "2024-01-01",
          endDate: "2024-01-31",
          totalHours: 0,
          totalValue: 0,
        },
        {
          periodId: "2024-02",
          periodLabel: "Feb 2024",
          startDate: "2024-02-01",
          endDate: "2024-02-29",
          totalHours: 0,
          totalValue: 0,
        },
      ],
      totalHours: 0,
      totalValue: 0,
    },
  ];

  beforeEach(() => {
    mockCalculateCostTypeResults.mockReturnValue(mockCostTypeResults);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const defaultProps = {
    grant: mockGrant,
    organisation: mockOrganisation,
    timeSlots: mockTimeSlots,
    individuals: mockIndividuals,
    costs: [], // Add empty costs array
    periodType: "monthly" as PeriodType,
  };

  it("renders table header correctly", () => {
    render(<GrantDashboardTable {...defaultProps} />);

    expect(screen.getByText("Grant Cost Breakdown")).toBeInTheDocument();
    expect(
      screen.getByText("Detailed analysis of costs by category and time period")
    ).toBeInTheDocument();
  });

  it("renders table columns correctly", () => {
    render(<GrantDashboardTable {...defaultProps} />);

    // Check static columns
    expect(screen.getByText("Cost Type")).toBeInTheDocument();
    expect(screen.getByText("Total Claimable Amount")).toBeInTheDocument();
    expect(screen.getByText("Total for Time Period")).toBeInTheDocument();
    expect(screen.getByText("Total Claimed")).toBeInTheDocument();

    // Check dynamic period columns
    expect(screen.getByText("Jan 2024")).toBeInTheDocument();
    expect(screen.getByText("Feb 2024")).toBeInTheDocument();
  });

  it("renders cost type rows correctly", () => {
    render(<GrantDashboardTable {...defaultProps} />);

    // Check that cost types are displayed
    expect(screen.getByText("Staff")).toBeInTheDocument();
    expect(screen.getByText("Overheads")).toBeInTheDocument();
  });

  it("displays formatted currency values", () => {
    render(<GrantDashboardTable {...defaultProps} />);

    // The formatCurrency mock should be called and display formatted values
    expect(screen.getByText("£100,000")).toBeInTheDocument(); // Total Claimable Amount
    expect(screen.getByText("£200")).toBeInTheDocument(); // Staff total value
    expect(screen.getByText("£0")).toBeInTheDocument(); // Overheads values
  });

  it("has proper accessibility attributes", () => {
    render(<GrantDashboardTable {...defaultProps} />);

    // Check ARIA labels and roles
    expect(
      screen.getByRole("region", { name: /grant cost breakdown/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("table", {
        name: /grant cost breakdown by category and time period/i,
      })
    ).toBeInTheDocument();

    // Check table structure
    const table = screen.getByRole("table");
    expect(table).toBeInTheDocument();

    // Check column headers
    const columnHeaders = screen.getAllByRole("columnheader");
    expect(columnHeaders.length).toBeGreaterThan(0);

    // Check row headers (first cell in each row should be a row header)
    const rowHeaders = screen.getAllByRole("rowheader");
    expect(rowHeaders.length).toBeGreaterThan(0);
  });

  it("handles quarterly period type", () => {
    const quarterlyProps = {
      ...defaultProps,
      periodType: "quarterly" as PeriodType,
    };

    render(<GrantDashboardTable {...quarterlyProps} />);

    // Verify that the calculation function was called with quarterly period type
    expect(mockCalculateCostTypeResults).toHaveBeenCalledWith(
      expect.objectContaining({
        periodType: "quarterly",
      })
    );
  });

  it("handles empty data gracefully", () => {
    const emptyProps = {
      ...defaultProps,
      timeSlots: [],
      individuals: [],
    };

    mockCalculateCostTypeResults.mockReturnValue([]);

    render(<GrantDashboardTable {...emptyProps} />);

    // Should still render the table structure
    expect(screen.getByText("Grant Cost Breakdown")).toBeInTheDocument();
    expect(screen.getByRole("table")).toBeInTheDocument();
  });

  it("passes correct calculation input to utility function", () => {
    render(<GrantDashboardTable {...defaultProps} />);

    expect(mockCalculateCostTypeResults).toHaveBeenCalledWith({
      grantId: "GRANT123",
      timeSlots: [
        {
          userId: "USER123",
          date: "2024-01-15",
          grantId: "GRANT123",
          hoursAllocated: 8,
        },
      ],
      individuals: [
        {
          PK: "USER123",
          AnnualGross: 52000,
        },
      ],
      periodType: "monthly",
      dateRange: {
        startDate: "2024-01-01",
        endDate: "2024-12-31",
      },
    });
  });
});
