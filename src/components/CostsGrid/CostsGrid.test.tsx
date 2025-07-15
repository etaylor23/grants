import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CostsGrid } from "./CostsGrid";
import { Cost } from "../../db/schema";

// Mock the data hooks
jest.mock("../../hooks/useLocalData", () => ({
  useCosts: jest.fn(),
  useCreateCost: jest.fn(),
  useUpdateCost: jest.fn(),
  useDeleteCost: jest.fn(),
}));

// Mock ReactGrid
jest.mock("@silevis/reactgrid", () => ({
  ReactGrid: ({ rows, columns, onCellsChanged }: any) => (
    <div data-testid="react-grid">
      <div data-testid="grid-rows">{rows.length}</div>
      <div data-testid="grid-columns">{columns.length}</div>
      <button
        data-testid="simulate-cell-change"
        onClick={() =>
          onCellsChanged([
            {
              rowId: "C-1",
              columnId: "name",
              newCell: { value: "Updated Name" },
            },
          ])
        }
      >
        Simulate Cell Change
      </button>
    </div>
  ),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe("CostsGrid", () => {
  const mockCosts: Cost[] = [
    {
      PK: "C-1",
      GrantID: "G-1",
      Type: "Materials",
      Name: "Test Material",
      Description: "Test description",
      Amount: 10000, // £100.00 in pence
      InvoiceDate: "2024-01-15",
      CreatedDate: "2024-01-15T10:00:00Z",
      OrganisationID: "ORG-1",
    },
    {
      PK: "C-2",
      GrantID: "G-1",
      Type: "Travel",
      Name: "Business Trip",
      Description: "Conference travel",
      Amount: 50000, // £500.00 in pence
      InvoiceDate: "2024-01-20",
      CreatedDate: "2024-01-20T10:00:00Z",
      OrganisationID: "ORG-1",
    },
  ];

  const mockUseCosts = {
    data: mockCosts,
    isLoading: false,
    error: null,
    refetch: jest.fn(),
  };

  const mockCreateCost = {
    mutateAsync: jest.fn(),
    isPending: false,
  };

  const mockUpdateCost = {
    mutateAsync: jest.fn(),
    isPending: false,
  };

  const mockDeleteCost = {
    mutateAsync: jest.fn(),
    isPending: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    const {
      useCosts,
      useCreateCost,
      useUpdateCost,
      useDeleteCost,
    } = require("../../hooks/useLocalData");
    (useCosts as jest.Mock).mockReturnValue(mockUseCosts);
    (useCreateCost as jest.Mock).mockReturnValue(mockCreateCost);
    (useUpdateCost as jest.Mock).mockReturnValue(mockUpdateCost);
    (useDeleteCost as jest.Mock).mockReturnValue(mockDeleteCost);
  });

  it("should render the costs grid with title and add button", () => {
    render(
      <CostsGrid grantId="G-1" organisationId="ORG-1" title="Test Costs" />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText("Test Costs")).toBeInTheDocument();
    expect(screen.getByText("Add Cost")).toBeInTheDocument();
    expect(screen.getByTestId("react-grid")).toBeInTheDocument();
  });

  it("should display loading state", () => {
    const { useCosts } = require("../../hooks/useLocalData");
    useCosts.mockReturnValue({
      ...mockUseCosts,
      isLoading: true,
    });

    render(<CostsGrid grantId="G-1" organisationId="ORG-1" />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByText("Loading costs...")).toBeInTheDocument();
  });

  it("should create correct grid structure", () => {
    render(<CostsGrid grantId="G-1" organisationId="ORG-1" />, {
      wrapper: createWrapper(),
    });

    // Should have header row + 2 data rows = 3 total rows
    expect(screen.getByTestId("grid-rows")).toHaveTextContent("3");

    // Should have 6 columns: type, name, description, amount, invoiceDate, actions
    expect(screen.getByTestId("grid-columns")).toHaveTextContent("6");
  });

  it("should handle add cost button click", async () => {
    mockCreateCost.mutateAsync.mockResolvedValue("C-3");

    render(<CostsGrid grantId="G-1" organisationId="ORG-1" />, {
      wrapper: createWrapper(),
    });

    const addButton = screen.getByText("Add Cost");
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(mockCreateCost.mutateAsync).toHaveBeenCalledWith({
        grantId: "G-1",
        organisationId: "ORG-1",
        type: "Materials",
        name: "New Cost Item",
        description: "",
        amount: 0,
        invoiceDate: expect.any(String),
      });
    });

    expect(mockUseCosts.refetch).toHaveBeenCalled();
  });

  it("should handle cell changes with validation", async () => {
    mockUpdateCost.mutateAsync.mockResolvedValue("C-1");

    render(<CostsGrid grantId="G-1" organisationId="ORG-1" />, {
      wrapper: createWrapper(),
    });

    const simulateButton = screen.getByTestId("simulate-cell-change");
    fireEvent.click(simulateButton);

    // Wait for the auto-save timeout
    await waitFor(
      () => {
        expect(mockUpdateCost.mutateAsync).toHaveBeenCalledWith({
          costId: "C-1",
          name: "Updated Name",
        });
      },
      { timeout: 2000 }
    );

    expect(mockUseCosts.refetch).toHaveBeenCalled();
  });

  it("should display error messages", () => {
    const { useCosts } = require("../../hooks/useLocalData");
    useCosts.mockReturnValue({
      ...mockUseCosts,
      error: { message: "Failed to load costs" },
    });

    render(<CostsGrid grantId="G-1" organisationId="ORG-1" />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByText(/Failed to load costs/)).toBeInTheDocument();
  });

  it("should validate required fields", async () => {
    render(<CostsGrid grantId="G-1" organisationId="ORG-1" />, {
      wrapper: createWrapper(),
    });

    // Simulate changing name to empty string
    const simulateButton = screen.getByTestId("simulate-cell-change");

    // Mock the cell change to have empty name
    const { ReactGrid } = require("@silevis/reactgrid");
    const originalReactGrid = ReactGrid;

    (ReactGrid as jest.Mock).mockImplementation(({ onCellsChanged }: any) => (
      <div data-testid="react-grid">
        <button
          data-testid="simulate-empty-name"
          onClick={() =>
            onCellsChanged([
              {
                rowId: "C-1",
                columnId: "name",
                newCell: { value: "" },
              },
            ])
          }
        >
          Simulate Empty Name
        </button>
      </div>
    ));

    render(<CostsGrid grantId="G-1" organisationId="ORG-1" />, {
      wrapper: createWrapper(),
    });

    const emptyNameButton = screen.getByTestId("simulate-empty-name");
    fireEvent.click(emptyNameButton);

    await waitFor(() => {
      expect(screen.getByText("Cost name is required")).toBeInTheDocument();
    });

    // Should not call update mutation due to validation error
    expect(mockUpdateCost.mutateAsync).not.toHaveBeenCalled();
  });

  it("should validate amount field", async () => {
    const { ReactGrid } = require("@silevis/reactgrid");

    (ReactGrid as jest.Mock).mockImplementation(({ onCellsChanged }: any) => (
      <div data-testid="react-grid">
        <button
          data-testid="simulate-negative-amount"
          onClick={() =>
            onCellsChanged([
              {
                rowId: "C-1",
                columnId: "amount",
                newCell: { value: -100 },
              },
            ])
          }
        >
          Simulate Negative Amount
        </button>
      </div>
    ));

    render(<CostsGrid grantId="G-1" organisationId="ORG-1" />, {
      wrapper: createWrapper(),
    });

    const negativeAmountButton = screen.getByTestId("simulate-negative-amount");
    fireEvent.click(negativeAmountButton);

    await waitFor(() => {
      expect(screen.getByText("Amount cannot be negative")).toBeInTheDocument();
    });

    expect(mockUpdateCost.mutateAsync).not.toHaveBeenCalled();
  });

  it("should handle add cost validation error", async () => {
    render(
      <CostsGrid grantId="" organisationId="ORG-1" />, // Empty grantId
      { wrapper: createWrapper() }
    );

    const addButton = screen.getByText("Add Cost");
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(
        screen.getByText(
          "Grant ID and Organisation ID are required to add costs"
        )
      ).toBeInTheDocument();
    });

    expect(mockCreateCost.mutateAsync).not.toHaveBeenCalled();
  });

  it("should render without card wrapper when showCard is false", () => {
    const { container } = render(
      <CostsGrid grantId="G-1" organisationId="ORG-1" showCard={false} />,
      { wrapper: createWrapper() }
    );

    // Should not have the card wrapper styling
    expect(container.firstChild).not.toHaveStyle({
      border: "1px solid",
      borderRadius: "1px",
    });
  });

  it("should validate date formats correctly", async () => {
    const { ReactGrid } = require("@silevis/reactgrid");

    (ReactGrid as jest.Mock).mockImplementation(({ onCellsChanged }: any) => (
      <div data-testid="react-grid">
        <button
          data-testid="simulate-invalid-date"
          onClick={() =>
            onCellsChanged([
              {
                rowId: "C-1",
                columnId: "invoiceDate",
                newCell: { value: "invalid-date" },
              },
            ])
          }
        >
          Simulate Invalid Date
        </button>
        <button
          data-testid="simulate-valid-date"
          onClick={() =>
            onCellsChanged([
              {
                rowId: "C-1",
                columnId: "invoiceDate",
                newCell: { value: "2024-01-15" },
              },
            ])
          }
        >
          Simulate Valid Date
        </button>
      </div>
    ));

    render(<CostsGrid grantId="G-1" organisationId="ORG-1" />, {
      wrapper: createWrapper(),
    });

    // Test invalid date
    const invalidDateButton = screen.getByTestId("simulate-invalid-date");
    fireEvent.click(invalidDateButton);

    await waitFor(() => {
      expect(
        screen.getByText(/Invalid date format. Please use YYYY-MM-DD format/)
      ).toBeInTheDocument();
    });

    expect(mockUpdateCost.mutateAsync).not.toHaveBeenCalled();

    // Test valid date
    const validDateButton = screen.getByTestId("simulate-valid-date");
    fireEvent.click(validDateButton);

    await waitFor(
      () => {
        expect(mockUpdateCost.mutateAsync).toHaveBeenCalledWith({
          costId: "C-1",
          invoiceDate: "2024-01-15",
        });
      },
      { timeout: 2000 }
    );
  });

  it("should handle dropdown type changes", async () => {
    const { ReactGrid } = require("@silevis/reactgrid");

    (ReactGrid as jest.Mock).mockImplementation(({ onCellsChanged }: any) => (
      <div data-testid="react-grid">
        <button
          data-testid="simulate-type-change"
          onClick={() =>
            onCellsChanged([
              {
                rowId: "C-1",
                columnId: "type",
                newCell: { selectedValue: "Travel" },
              },
            ])
          }
        >
          Simulate Type Change
        </button>
      </div>
    ));

    render(<CostsGrid grantId="G-1" organisationId="ORG-1" />, {
      wrapper: createWrapper(),
    });

    const typeChangeButton = screen.getByTestId("simulate-type-change");
    fireEvent.click(typeChangeButton);

    await waitFor(
      () => {
        expect(mockUpdateCost.mutateAsync).toHaveBeenCalledWith({
          costId: "C-1",
          type: "Travel",
        });
      },
      { timeout: 2000 }
    );
  });

  it("should handle auto-save with debouncing", async () => {
    jest.useFakeTimers();
    mockUpdateCost.mutateAsync.mockResolvedValue("C-1");

    const { ReactGrid } = require("@silevis/reactgrid");

    (ReactGrid as jest.Mock).mockImplementation(({ onCellsChanged }: any) => (
      <div data-testid="react-grid">
        <button
          data-testid="simulate-multiple-changes"
          onClick={() => {
            // Simulate multiple rapid changes
            onCellsChanged([
              {
                rowId: "C-1",
                columnId: "name",
                newCell: { value: "First Change" },
              },
            ]);
            setTimeout(() => {
              onCellsChanged([
                {
                  rowId: "C-1",
                  columnId: "name",
                  newCell: { value: "Second Change" },
                },
              ]);
            }, 100);
          }}
        >
          Simulate Multiple Changes
        </button>
      </div>
    ));

    render(<CostsGrid grantId="G-1" organisationId="ORG-1" />, {
      wrapper: createWrapper(),
    });

    const multipleChangesButton = screen.getByTestId(
      "simulate-multiple-changes"
    );
    fireEvent.click(multipleChangesButton);

    // Fast-forward time to trigger auto-save
    jest.advanceTimersByTime(1100);

    await waitFor(() => {
      // Should only call update once due to debouncing
      expect(mockUpdateCost.mutateAsync).toHaveBeenCalledTimes(1);
    });

    jest.useRealTimers();
  });
});
