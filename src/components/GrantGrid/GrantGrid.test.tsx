import React from "react";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@mui/material/styles";
import { GrantGrid } from "./GrantGrid";
import { theme } from "../../theme";
import { mockGrants } from "../../api/mockData";

// Mock ReactGrid
jest.mock("@silevis/reactgrid", () => ({
  ReactGrid: ({ rows, columns }: any) => (
    <div data-testid="react-grid">
      <div data-testid="grid-rows">{rows.length}</div>
      <div data-testid="grid-columns">{columns.length}</div>
    </div>
  ),
  Column: {},
  Row: {},
  HeaderCell: {},
  TextCell: {},
  NumberCell: {},
}));

// Mock API hooks
const mockMutateAsync = jest.fn();
jest.mock("../../api/hooks", () => ({
  useGrantTimeSlots: () => ({
    data: [
      {
        userId: "user1",
        date: "2024-01-15",
        grantId: "grant1",
        allocationPercent: 50,
      },
    ],
    refetch: jest.fn(),
  }),
  useBatchUpdateTimeSlots: () => ({
    mutateAsync: mockMutateAsync,
  }),
}));

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        {component}
      </ThemeProvider>
    </QueryClientProvider>
  );
};

describe("GrantGrid", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders grant grid with correct title", () => {
    const grant = mockGrants[0];
    renderWithProviders(<GrantGrid grant={grant} />);

    expect(
      screen.getByText(`${grant.name} - User Allocations`)
    ).toBeInTheDocument();
    expect(screen.getByTestId("react-grid")).toBeInTheDocument();
  });

  it("renders custom title when provided", () => {
    const grant = mockGrants[0];
    const customTitle = "Custom Grant View";
    renderWithProviders(<GrantGrid grant={grant} title={customTitle} />);

    expect(screen.getByText(customTitle)).toBeInTheDocument();
  });

  it("renders without card when showCard is false", () => {
    const grant = mockGrants[0];
    renderWithProviders(<GrantGrid grant={grant} showCard={false} />);

    expect(screen.getByTestId("react-grid")).toBeInTheDocument();
    // Should not have the card title when showCard is false
    expect(
      screen.queryByText(`${grant.name} - User Allocations`)
    ).not.toBeInTheDocument();
  });

  it("displays grid with correct structure", () => {
    const grant = mockGrants[0];
    renderWithProviders(<GrantGrid grant={grant} />);

    const gridRows = screen.getByTestId("grid-rows");
    const gridColumns = screen.getByTestId("grid-columns");

    // Should have header row + user rows + total row
    expect(gridRows).toHaveTextContent("5"); // 1 header + 3 users + 1 total
    // Should have user column + date columns for current month
    expect(parseInt(gridColumns.textContent || "0")).toBeGreaterThan(1);
  });
});
