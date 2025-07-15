import {
  eachMonthOfInterval,
  eachQuarterOfInterval,
  startOfMonth,
  endOfMonth,
  startOfQuarter,
  endOfQuarter,
  format,
  isWithinInterval,
  parseISO,
} from "date-fns";
import {
  PeriodType,
  PeriodCalculationResult,
  CostTypeCalculationResult,
  GrantCalculationInput,
  CostType,
  DEFAULT_COST_TYPES,
} from "../models/grantDashboard";

// Re-export existing utility functions for consistency
export {
  calculateTotalHoursWorked,
  calculateTotalAvailableHours,
  calculateAveragePercentage,
} from "./dateUtils";

/**
 * Calculate hourly rate for an individual based on annual gross salary
 */
export const calculateHourlyRate = (annualGross: number): number => {
  // Assuming 260 working days per year, 8 hours per day
  return annualGross / (260 * 8);
};

/**
 * Generate period intervals based on period type and date range
 */
export const generatePeriodIntervals = (
  startDate: string,
  endDate: string,
  periodType: PeriodType
): Array<{ start: Date; end: Date; label: string; id: string }> => {
  // Ensure dates are strings before parsing
  const startDateStr =
    typeof startDate === "string" ? startDate : String(startDate);
  const endDateStr = typeof endDate === "string" ? endDate : String(endDate);

  const start = parseISO(startDateStr);
  const end = parseISO(endDateStr);

  if (periodType === "monthly") {
    return eachMonthOfInterval({ start, end }).map((monthStart) => {
      const monthEnd = endOfMonth(monthStart);
      return {
        start: monthStart,
        end: monthEnd,
        label: format(monthStart, "MMM yyyy"),
        id: format(monthStart, "yyyy-MM"),
      };
    });
  } else {
    return eachQuarterOfInterval({ start, end }).map((quarterStart) => {
      const quarterEnd = endOfQuarter(quarterStart);
      return {
        start: quarterStart,
        end: quarterEnd,
        label: `Q${Math.ceil(
          (quarterStart.getMonth() + 1) / 3
        )} ${quarterStart.getFullYear()}`,
        id: `${quarterStart.getFullYear()}-Q${Math.ceil(
          (quarterStart.getMonth() + 1) / 3
        )}`,
      };
    });
  }
};

/**
 * Calculate total hours and value for staff costs for a specific grant and period
 */
export const calculateStaffPeriodTotals = (
  timeSlots: Array<{
    userId: string;
    date: string;
    grantId: string;
    hoursAllocated: number;
  }>,
  individuals: Array<{ PK: string; AnnualGross: number }>,
  grantId: string,
  periodStart: Date,
  periodEnd: Date
): { totalHours: number; totalValue: number } => {
  console.log("calculatePeriodTotals called with:", {
    timeSlotsCount: timeSlots.length,
    individualsCount: individuals.length,
    grantId,
    periodStart: format(periodStart, "yyyy-MM-dd"),
    periodEnd: format(periodEnd, "yyyy-MM-dd"),
    timeSlots: timeSlots.slice(0, 3), // Show first 3 for debugging
  });

  // Filter time slots for this grant and period
  const relevantSlots = timeSlots.filter((slot) => {
    // Ensure slot.date is a string before parsing
    const dateStr =
      typeof slot.date === "string" ? slot.date : String(slot.date);
    return (
      slot.grantId === grantId &&
      isWithinInterval(parseISO(dateStr), {
        start: periodStart,
        end: periodEnd,
      })
    );
  });

  console.log("Relevant slots found:", relevantSlots);

  // Calculate total hours
  const totalHours = relevantSlots.reduce(
    (sum, slot) => sum + slot.hoursAllocated,
    0
  );

  // Calculate total value based on individual hourly rates
  const totalValue = relevantSlots.reduce((sum, slot) => {
    const individual = individuals.find((ind) => ind.PK === slot.userId);
    if (!individual) {
      console.log("No individual found for userId:", slot.userId);
      return sum;
    }

    const hourlyRate = calculateHourlyRate(individual.AnnualGross);
    console.log("Calculating value for slot:", {
      userId: slot.userId,
      hours: slot.hoursAllocated,
      annualGross: individual.AnnualGross,
      hourlyRate,
      value: slot.hoursAllocated * hourlyRate,
    });
    return sum + slot.hoursAllocated * hourlyRate;
  }, 0);

  console.log("Staff period totals calculated:", { totalHours, totalValue });
  return { totalHours, totalValue };
};

/**
 * Calculate total value for non-staff costs for a specific grant and period
 * @param costs Array of cost records to analyze
 * @param grantId Grant ID to filter costs by
 * @param costType Cost type to filter by (Materials, Travel, etc.)
 * @param periodStart Start date of the period (inclusive)
 * @param periodEnd End date of the period (inclusive)
 * @returns Object containing the total value in pounds
 */
export const calculateCostsPeriodTotals = (
  costs: Array<{
    PK: string;
    GrantID: string;
    Type: string;
    Amount: number; // in pence
    InvoiceDate: string;
  }>,
  grantId: string,
  costType: CostType,
  periodStart: Date,
  periodEnd: Date
): { totalValue: number } => {
  console.log("calculateCostsPeriodTotals called with:", {
    costsCount: costs.length,
    grantId,
    costType,
    periodStart: format(periodStart, "yyyy-MM-dd"),
    periodEnd: format(periodEnd, "yyyy-MM-dd"),
  });

  // Filter costs for this grant, cost type, and period
  const relevantCosts = costs.filter((cost) => {
    // Ensure cost.InvoiceDate is a string before parsing
    const invoiceDateStr =
      typeof cost.InvoiceDate === "string"
        ? cost.InvoiceDate
        : String(cost.InvoiceDate);
    const costDate = parseISO(invoiceDateStr);
    return (
      cost.GrantID === grantId &&
      cost.Type === costType &&
      isWithinInterval(costDate, { start: periodStart, end: periodEnd })
    );
  });

  console.log("Relevant costs found:", relevantCosts.length);

  // Calculate total value (convert from pence to pounds)
  const totalValue = relevantCosts.reduce((sum, cost) => {
    const valueInPounds = cost.Amount / 100;
    console.log("Adding cost:", {
      costId: cost.PK,
      type: cost.Type,
      amountPence: cost.Amount,
      amountPounds: valueInPounds,
    });
    return sum + valueInPounds;
  }, 0);

  console.log("Costs period totals calculated:", { totalValue });
  return { totalValue };
};

/**
 * Calculate period results for a specific grant
 */
export const calculateGrantPeriodResults = (
  input: GrantCalculationInput
): PeriodCalculationResult[] => {
  const periods = generatePeriodIntervals(
    input.dateRange.startDate,
    input.dateRange.endDate,
    input.periodType
  );

  return periods.map((period) => {
    const { totalHours, totalValue } = calculateStaffPeriodTotals(
      input.timeSlots,
      input.individuals,
      input.grantId,
      period.start,
      period.end
    );

    return {
      periodId: period.id,
      periodLabel: period.label,
      startDate: format(period.start, "yyyy-MM-dd"),
      endDate: format(period.end, "yyyy-MM-dd"),
      totalHours,
      totalValue,
    };
  });
};

/**
 * Calculate cost type results for all cost types including non-staff costs
 * This function processes both staff costs (from time allocations) and non-staff costs
 * (from cost records) to provide a comprehensive view of grant expenses by cost type.
 *
 * @param input Grant calculation input containing time slots, individuals, costs, and period info
 * @returns Array of cost type calculation results with period breakdowns
 */
export const calculateCostTypeResults = (
  input: GrantCalculationInput
): CostTypeCalculationResult[] => {
  console.log("calculateCostTypeResults called with input:", {
    grantId: input.grantId,
    timeSlotsCount: input.timeSlots.length,
    individualsCount: input.individuals.length,
    costsCount: input.costs.length,
    periodType: input.periodType,
    dateRange: input.dateRange,
  });

  return DEFAULT_COST_TYPES.map((costType) => {
    console.log(`Processing cost type: ${costType}`);

    if (costType === "Staff") {
      // Calculate staff costs based on time slots and salaries
      const periods = generatePeriodIntervals(
        input.dateRange.startDate,
        input.dateRange.endDate,
        input.periodType
      );

      const periodResults = periods.map((period) => {
        const { totalHours, totalValue } = calculateStaffPeriodTotals(
          input.timeSlots,
          input.individuals,
          input.grantId,
          period.start,
          period.end
        );

        return {
          periodId: period.id,
          periodLabel: period.label,
          startDate: format(period.start, "yyyy-MM-dd"),
          endDate: format(period.end, "yyyy-MM-dd"),
          totalHours,
          totalValue,
        };
      });

      const totalHours = periodResults.reduce(
        (sum, period) => sum + period.totalHours,
        0
      );
      const totalValue = periodResults.reduce(
        (sum, period) => sum + period.totalValue,
        0
      );

      console.log(`Staff cost type result:`, {
        costType,
        totalHours,
        totalValue,
        periodsCount: periodResults.length,
      });

      return {
        costType,
        periods: periodResults,
        totalHours,
        totalValue,
      };
    } else {
      // Calculate non-staff costs based on cost records
      const periods = generatePeriodIntervals(
        input.dateRange.startDate,
        input.dateRange.endDate,
        input.periodType
      );

      const periodResults = periods.map((period) => {
        const { totalValue } = calculateCostsPeriodTotals(
          input.costs,
          input.grantId,
          costType,
          period.start,
          period.end
        );

        return {
          periodId: period.id,
          periodLabel: period.label,
          startDate: format(period.start, "yyyy-MM-dd"),
          endDate: format(period.end, "yyyy-MM-dd"),
          totalHours: 0, // Non-staff costs don't have hours
          totalValue,
        };
      });

      const totalValue = periodResults.reduce(
        (sum, period) => sum + period.totalValue,
        0
      );

      console.log(`${costType} cost type result:`, {
        costType,
        totalHours: 0,
        totalValue,
        periodsCount: periodResults.length,
      });

      return {
        costType,
        periods: periodResults,
        totalHours: 0,
        totalValue,
      };
    }
  });
};

/**
 * Format currency value for display
 */
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

/**
 * Format hours for display
 */
export const formatHours = (hours: number): string => {
  return `${hours.toFixed(1)}h`;
};
