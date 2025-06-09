import { format } from "date-fns";

/**
 * Get the ordinal suffix for a number (1st, 2nd, 3rd, etc.)
 */
export const getOrdinalSuffix = (day: number): string => {
  if (day >= 11 && day <= 13) {
    return "th";
  }
  
  const lastDigit = day % 10;
  switch (lastDigit) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
};

/**
 * Format a date as ordinal day with month name (e.g., "1st June", "23rd December")
 */
export const formatDateOrdinal = (date: Date): string => {
  const day = date.getDate();
  const monthName = format(date, "MMMM");
  const ordinalSuffix = getOrdinalSuffix(day);
  
  return `${day}${ordinalSuffix} ${monthName}`;
};

/**
 * Calculate total available hours for a period based on workday hours
 */
export const calculateTotalAvailableHours = (
  workdayHours: Record<string, number>,
  dates: string[]
): number => {
  return dates.reduce((total, date) => {
    return total + (workdayHours[date] || 0);
  }, 0);
};

/**
 * Calculate total hours worked for a grant across all dates
 */
export const calculateTotalHoursWorked = (
  timeSlots: Array<{ date: string; grantId: string; hoursAllocated?: number }>,
  grantId: string,
  dates: string[]
): number => {
  return timeSlots
    .filter(slot => slot.grantId === grantId && dates.includes(slot.date))
    .reduce((total, slot) => total + (slot.hoursAllocated || 0), 0);
};

/**
 * Calculate average percentage for a grant across a period
 */
export const calculateAveragePercentage = (
  totalHoursWorked: number,
  totalAvailableHours: number
): number => {
  if (totalAvailableHours === 0) return 0;
  return (totalHoursWorked / totalAvailableHours) * 100;
};

/**
 * Default hours per workday
 */
export const DEFAULT_WORKDAY_HOURS = 8;
