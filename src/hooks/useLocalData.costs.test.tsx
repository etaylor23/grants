import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  useCosts,
  useCreateCost,
  useUpdateCost,
  useDeleteCost,
} from "./useLocalData";
import { Cost, CostType } from "../db/schema";

// Mock the database
jest.mock("../db/schema", () => ({
  ...jest.requireActual("../db/schema"),
  db: {
    costs: {
      toArray: jest.fn(),
      put: jest.fn(),
      get: jest.fn(),
      delete: jest.fn(),
    },
  },
  generateCostId: jest.fn(() => "C-12345"),
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

describe("Costs Data Hooks", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("useCosts", () => {
    it("should fetch all costs when no filters provided", async () => {
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
          GrantID: "G-2",
          Type: "Travel",
          Name: "Business Trip",
          Description: "Conference travel",
          Amount: 50000, // £500.00 in pence
          InvoiceDate: "2024-01-20",
          CreatedDate: "2024-01-20T10:00:00Z",
          OrganisationID: "ORG-1",
        },
      ];

      const { db } = await import("../db/schema");
      (db.costs.toArray as any).mockResolvedValue(mockCosts);

      const { result } = renderHook(() => useCosts(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(mockCosts);
      expect(db.costs.toArray).toHaveBeenCalledTimes(1);
    });

    it("should filter costs by grant ID", async () => {
      const mockCosts: Cost[] = [
        {
          PK: "C-1",
          GrantID: "G-1",
          Type: "Materials",
          Name: "Test Material",
          Description: "Test description",
          Amount: 10000,
          InvoiceDate: "2024-01-15",
          CreatedDate: "2024-01-15T10:00:00Z",
          OrganisationID: "ORG-1",
        },
        {
          PK: "C-2",
          GrantID: "G-2",
          Type: "Travel",
          Name: "Business Trip",
          Description: "Conference travel",
          Amount: 50000,
          InvoiceDate: "2024-01-20",
          CreatedDate: "2024-01-20T10:00:00Z",
          OrganisationID: "ORG-1",
        },
      ];

      const { db } = await import("../db/schema");
      (db.costs.toArray as any).mockResolvedValue(mockCosts);

      const { result } = renderHook(() => useCosts("G-1"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toHaveLength(1);
      expect(result.current.data?.[0].GrantID).toBe("G-1");
    });

    it("should filter costs by organisation ID", async () => {
      const mockCosts: Cost[] = [
        {
          PK: "C-1",
          GrantID: "G-1",
          Type: "Materials",
          Name: "Test Material",
          Description: "Test description",
          Amount: 10000,
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
          Amount: 50000,
          InvoiceDate: "2024-01-20",
          CreatedDate: "2024-01-20T10:00:00Z",
          OrganisationID: "ORG-2",
        },
      ];

      const { db } = await import("../db/schema");
      (db.costs.toArray as any).mockResolvedValue(mockCosts);

      const { result } = renderHook(() => useCosts(undefined, "ORG-1"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toHaveLength(1);
      expect(result.current.data?.[0].OrganisationID).toBe("ORG-1");
    });
  });

  describe("useCreateCost", () => {
    it("should create a new cost successfully", async () => {
      const { db, generateCostId } = await import("../db/schema");
      (db.costs.put as any).mockResolvedValue(undefined);
      (generateCostId as any).mockReturnValue("C-12345");

      const { result } = renderHook(() => useCreateCost(), {
        wrapper: createWrapper(),
      });

      const costData = {
        grantId: "G-1",
        type: "Materials" as CostType,
        name: "Test Material",
        description: "Test description",
        amount: 10000, // £100.00 in pence
        invoiceDate: "2024-01-15",
        organisationId: "ORG-1",
      };

      await waitFor(async () => {
        const costId = await result.current.mutateAsync(costData);
        expect(costId).toBe("C-12345");
      });

      expect(db.costs.put).toHaveBeenCalledWith({
        PK: "C-12345",
        GrantID: "G-1",
        Type: "Materials",
        Name: "Test Material",
        Description: "Test description",
        Amount: 10000,
        InvoiceDate: "2024-01-15",
        CreatedDate: expect.any(String),
        OrganisationID: "ORG-1",
      });
    });
  });

  describe("useUpdateCost", () => {
    it("should update an existing cost successfully", async () => {
      const existingCost: Cost = {
        PK: "C-1",
        GrantID: "G-1",
        Type: "Materials",
        Name: "Old Name",
        Description: "Old description",
        Amount: 5000,
        InvoiceDate: "2024-01-10",
        CreatedDate: "2024-01-10T10:00:00Z",
        OrganisationID: "ORG-1",
      };

      const { db } = await import("../db/schema");
      (db.costs.get as any).mockResolvedValue(existingCost);
      (db.costs.put as any).mockResolvedValue(undefined);

      const { result } = renderHook(() => useUpdateCost(), {
        wrapper: createWrapper(),
      });

      const updateData = {
        costId: "C-1",
        name: "Updated Name",
        amount: 15000,
      };

      await waitFor(async () => {
        const costId = await result.current.mutateAsync(updateData);
        expect(costId).toBe("C-1");
      });

      expect(db.costs.put).toHaveBeenCalledWith({
        ...existingCost,
        Name: "Updated Name",
        Amount: 15000,
      });
    });

    it("should throw error when cost not found", async () => {
      const { db } = await import("../db/schema");
      (db.costs.get as any).mockResolvedValue(undefined);

      const { result } = renderHook(() => useUpdateCost(), {
        wrapper: createWrapper(),
      });

      const updateData = {
        costId: "C-nonexistent",
        name: "Updated Name",
      };

      await waitFor(async () => {
        await expect(result.current.mutateAsync(updateData)).rejects.toThrow(
          "Cost with ID C-nonexistent not found"
        );
      });
    });
  });

  describe("useDeleteCost", () => {
    it("should delete a cost successfully", async () => {
      const { db } = await import("../db/schema");
      (db.costs.delete as any).mockResolvedValue(undefined);

      const { result } = renderHook(() => useDeleteCost(), {
        wrapper: createWrapper(),
      });

      await waitFor(async () => {
        const costId = await result.current.mutateAsync("C-1");
        expect(costId).toBe("C-1");
      });

      expect(db.costs.delete).toHaveBeenCalledWith("C-1");
    });
  });
});
