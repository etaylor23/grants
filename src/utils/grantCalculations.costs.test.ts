import {
  calculateCostsPeriodTotals,
  calculateCostTypeResults,
} from "./grantCalculations";
import { GrantCalculationInput, CostType } from "../models/grantDashboard";

describe("Grant Calculations - Costs", () => {
  const mockCosts = [
    {
      PK: "C-1",
      GrantID: "grant1",
      Type: "Materials",
      Amount: 10000, // £100.00 in pence
      InvoiceDate: "2024-01-15",
    },
    {
      PK: "C-2",
      GrantID: "grant1",
      Type: "Materials",
      Amount: 25000, // £250.00 in pence
      InvoiceDate: "2024-01-20",
    },
    {
      PK: "C-3",
      GrantID: "grant1",
      Type: "Travel",
      Amount: 50000, // £500.00 in pence
      InvoiceDate: "2024-02-10",
    },
    {
      PK: "C-4",
      GrantID: "grant2", // Different grant
      Type: "Materials",
      Amount: 15000, // £150.00 in pence
      InvoiceDate: "2024-01-25",
    },
    {
      PK: "C-5",
      GrantID: "grant1",
      Type: "Materials",
      Amount: 30000, // £300.00 in pence
      InvoiceDate: "2024-03-05", // Outside period
    },
  ];

  describe("calculateCostsPeriodTotals", () => {
    it("should calculate total value for materials costs in January 2024", () => {
      const periodStart = new Date("2024-01-01");
      const periodEnd = new Date("2024-01-31");

      const result = calculateCostsPeriodTotals(
        mockCosts,
        "grant1",
        "Materials",
        periodStart,
        periodEnd
      );

      // Should include C-1 (£100) and C-2 (£250) = £350
      expect(result.totalValue).toBe(350);
    });

    it("should calculate total value for travel costs in February 2024", () => {
      const periodStart = new Date("2024-02-01");
      const periodEnd = new Date("2024-02-29");

      const result = calculateCostsPeriodTotals(
        mockCosts,
        "grant1",
        "Travel",
        periodStart,
        periodEnd
      );

      // Should include C-3 (£500)
      expect(result.totalValue).toBe(500);
    });

    it("should return zero for periods with no matching costs", () => {
      const periodStart = new Date("2024-04-01");
      const periodEnd = new Date("2024-04-30");

      const result = calculateCostsPeriodTotals(
        mockCosts,
        "grant1",
        "Materials",
        periodStart,
        periodEnd
      );

      expect(result.totalValue).toBe(0);
    });

    it("should filter by grant ID correctly", () => {
      const periodStart = new Date("2024-01-01");
      const periodEnd = new Date("2024-01-31");

      const result = calculateCostsPeriodTotals(
        mockCosts,
        "grant2",
        "Materials",
        periodStart,
        periodEnd
      );

      // Should include only C-4 (£150) for grant2
      expect(result.totalValue).toBe(150);
    });

    it("should filter by cost type correctly", () => {
      const periodStart = new Date("2024-01-01");
      const periodEnd = new Date("2024-02-29");

      const materialsResult = calculateCostsPeriodTotals(
        mockCosts,
        "grant1",
        "Materials",
        periodStart,
        periodEnd
      );

      const travelResult = calculateCostsPeriodTotals(
        mockCosts,
        "grant1",
        "Travel",
        periodStart,
        periodEnd
      );

      // Materials: C-1 (£100) + C-2 (£250) = £350
      expect(materialsResult.totalValue).toBe(350);
      // Travel: C-3 (£500) = £500
      expect(travelResult.totalValue).toBe(500);
    });
  });

  describe("calculateCostTypeResults with costs", () => {
    const mockInput: GrantCalculationInput = {
      grantId: "grant1",
      timeSlots: [
        {
          userId: "user1",
          date: "2024-01-15",
          grantId: "grant1",
          hoursAllocated: 8,
        },
      ],
      individuals: [{ PK: "user1", AnnualGross: 52000 }],
      costs: mockCosts,
      periodType: "monthly",
      dateRange: {
        startDate: "2024-01-01",
        endDate: "2024-02-29",
      },
    };

    it("should calculate staff costs correctly", () => {
      const results = calculateCostTypeResults(mockInput);
      const staffResult = results.find((r) => r.costType === "Staff");

      expect(staffResult).toBeDefined();
      expect(staffResult!.totalHours).toBe(8);
      expect(staffResult!.totalValue).toBe(200); // 8 hours * £25/hour
      expect(staffResult!.periods).toHaveLength(2); // Jan and Feb
    });

    it("should calculate materials costs correctly", () => {
      const results = calculateCostTypeResults(mockInput);
      const materialsResult = results.find((r) => r.costType === "Materials");

      expect(materialsResult).toBeDefined();
      expect(materialsResult!.totalHours).toBe(0); // Non-staff costs don't have hours
      expect(materialsResult!.totalValue).toBe(350); // £100 + £250 from Jan
      expect(materialsResult!.periods).toHaveLength(2); // Jan and Feb

      // Check individual periods
      const janPeriod = materialsResult!.periods.find((p) =>
        p.periodLabel.includes("Jan")
      );
      const febPeriod = materialsResult!.periods.find((p) =>
        p.periodLabel.includes("Feb")
      );

      expect(janPeriod?.totalValue).toBe(350); // Both materials costs in Jan
      expect(febPeriod?.totalValue).toBe(0); // No materials costs in Feb
    });

    it("should calculate travel costs correctly", () => {
      const results = calculateCostTypeResults(mockInput);
      const travelResult = results.find((r) => r.costType === "Travel");

      expect(travelResult).toBeDefined();
      expect(travelResult!.totalHours).toBe(0); // Non-staff costs don't have hours
      expect(travelResult!.totalValue).toBe(500); // £500 from Feb
      expect(travelResult!.periods).toHaveLength(2); // Jan and Feb

      // Check individual periods
      const janPeriod = travelResult!.periods.find((p) =>
        p.periodLabel.includes("Jan")
      );
      const febPeriod = travelResult!.periods.find((p) =>
        p.periodLabel.includes("Feb")
      );

      expect(janPeriod?.totalValue).toBe(0); // No travel costs in Jan
      expect(febPeriod?.totalValue).toBe(500); // Travel cost in Feb
    });

    it("should return zero for cost types with no data", () => {
      const results = calculateCostTypeResults(mockInput);
      const overheadsResult = results.find((r) => r.costType === "Overheads");
      const capitalResult = results.find((r) => r.costType === "Capital");

      expect(overheadsResult).toBeDefined();
      expect(overheadsResult!.totalValue).toBe(0);
      expect(capitalResult).toBeDefined();
      expect(capitalResult!.totalValue).toBe(0);
    });

    it("should handle empty costs array", () => {
      const inputWithNoCosts = {
        ...mockInput,
        costs: [],
      };

      const results = calculateCostTypeResults(inputWithNoCosts);
      const materialsResult = results.find((r) => r.costType === "Materials");

      expect(materialsResult).toBeDefined();
      expect(materialsResult!.totalValue).toBe(0);
      expect(materialsResult!.periods.every((p) => p.totalValue === 0)).toBe(
        true
      );
    });

    it("should include all default cost types", () => {
      const results = calculateCostTypeResults(mockInput);
      const costTypes = results.map((r) => r.costType);

      expect(costTypes).toContain("Staff");
      expect(costTypes).toContain("Materials");
      expect(costTypes).toContain("Travel");
      expect(costTypes).toContain("Overheads");
      expect(costTypes).toContain("Capital");
      expect(costTypes).toContain("Other");
    });
  });
});
