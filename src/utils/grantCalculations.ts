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
  const start = parseISO(startDate);
  const end = parseISO(endDate);

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
 * Calculate total hours and value for a specific grant and period
 */
export const calculatePeriodTotals = (
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
  const relevantSlots = timeSlots.filter(
    (slot) =>
      slot.grantId === grantId &&
      isWithinInterval(parseISO(slot.date), {
        start: periodStart,
        end: periodEnd,
      })
  );

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

  console.log("Period totals calculated:", { totalHours, totalValue });
  return { totalHours, totalValue };
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
    const { totalHours, totalValue } = calculatePeriodTotals(
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
 * Calculate cost type results for a grant (currently only Staff has data)
 */
export const calculateCostTypeResults = (
  input: GrantCalculationInput
): CostTypeCalculationResult[] => {
  const periodResults = calculateGrantPeriodResults(input);

  return DEFAULT_COST_TYPES.map((costType) => {
    if (costType === "Staff") {
      // Staff cost type has actual data from time slots
      const totalHours = periodResults.reduce(
        (sum, period) => sum + period.totalHours,
        0
      );
      const totalValue = periodResults.reduce(
        (sum, period) => sum + period.totalValue,
        0
      );

      return {
        costType,
        periods: periodResults,
        totalHours,
        totalValue,
      };
    } else {
      // Other cost types are placeholders with zero values
      const emptyPeriods = periodResults.map((period) => ({
        ...period,
        totalHours: 0,
        totalValue: 0,
      }));

      return {
        costType,
        periods: emptyPeriods,
        totalHours: 0,
        totalValue: 0,
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
