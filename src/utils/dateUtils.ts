// Date utility functions with leave type support
import {
  getHoursFromDayEntry,
  getLeaveTypeFromDayEntry,
  isWorkDay,
  isLeaveDay,
  DayEntry,
  LeaveType,
} from "../db/schema";

export const calculateTotalHoursWorked = (
  timeSlots: Array<{ date: string; grantId: string; hoursAllocated: number }>,
  grantId: string,
  periodDates: string[]
): number => {
  return timeSlots
    .filter(
      (slot) => slot.grantId === grantId && periodDates.includes(slot.date)
    )
    .reduce((total, slot) => total + slot.hoursAllocated, 0);
};

// LEGACY: Backward compatible function
export const calculateTotalAvailableHours = (
  workdayHoursLookup: Record<string, number>,
  periodDates: string[]
): number => {
  return periodDates.reduce(
    (total, date) => total + (workdayHoursLookup[date] || 0),
    0
  );
};

// NEW: Enhanced function that accounts for leave types
export const calculateTotalAvailableWorkHours = (
  workdayHoursData: Record<string, number | DayEntry>,
  periodDates: string[]
): number => {
  return periodDates.reduce((total, date) => {
    const entry = workdayHoursData[date];
    if (!entry) return total;

    // Only count hours from work days, exclude leave days
    return isWorkDay(entry) ? total + getHoursFromDayEntry(entry) : total;
  }, 0);
};

// NEW: Calculate total calendar days (including leave days)
export const calculateTotalCalendarDays = (
  workdayHoursData: Record<string, number | DayEntry>,
  periodDates: string[]
): number => {
  return periodDates.filter((date) => workdayHoursData[date] !== undefined)
    .length;
};

// NEW: Calculate leave days by type
export const calculateLeaveDaysByType = (
  workdayHoursData: Record<string, number | DayEntry>,
  periodDates: string[]
): Record<LeaveType, number> => {
  const leaveCounts: Record<LeaveType, number> = {
    work: 0,
    "annual-leave": 0,
    "sick-leave": 0,
    "public-holiday": 0,
    other: 0,
  };

  periodDates.forEach((date) => {
    const entry = workdayHoursData[date];
    if (entry) {
      const leaveType = getLeaveTypeFromDayEntry(entry);
      leaveCounts[leaveType]++;
    }
  });

  return leaveCounts;
};

// LEGACY: Backward compatible function
export const calculateAveragePercentage = (
  totalHoursWorked: number,
  totalAvailableHours: number
): number => {
  return totalAvailableHours > 0
    ? (totalHoursWorked / totalAvailableHours) * 100
    : 0;
};

// NEW: Enhanced utilization calculation that excludes leave days
export const calculateWorkDayUtilization = (
  totalHoursWorked: number,
  totalAvailableWorkHours: number
): number => {
  return totalAvailableWorkHours > 0
    ? (totalHoursWorked / totalAvailableWorkHours) * 100
    : 0;
};

// NEW: Calculate capacity utilization (includes impact of leave)
export const calculateCapacityUtilization = (
  totalHoursWorked: number,
  workdayHoursData: Record<string, number | DayEntry>,
  periodDates: string[]
): {
  workDayUtilization: number;
  overallCapacityUtilization: number;
  leaveDays: Record<LeaveType, number>;
  workDays: number;
  totalDays: number;
} => {
  const totalAvailableWorkHours = calculateTotalAvailableWorkHours(
    workdayHoursData,
    periodDates
  );
  const leaveDays = calculateLeaveDaysByType(workdayHoursData, periodDates);
  const workDays = leaveDays.work;
  const totalDays = calculateTotalCalendarDays(workdayHoursData, periodDates);

  // Theoretical maximum hours if all days were work days (8 hours each)
  const theoreticalMaxHours = periodDates.length * 8;

  return {
    workDayUtilization: calculateWorkDayUtilization(
      totalHoursWorked,
      totalAvailableWorkHours
    ),
    overallCapacityUtilization:
      theoreticalMaxHours > 0
        ? (totalHoursWorked / theoreticalMaxHours) * 100
        : 0,
    leaveDays,
    workDays,
    totalDays,
  };
};

export const formatDateOrdinal = (date: Date): string => {
  const day = date.getDate();
  let suffix = "th";
  if (day % 10 === 1 && day % 100 !== 11) suffix = "st";
  else if (day % 10 === 2 && day % 100 !== 12) suffix = "nd";
  else if (day % 10 === 3 && day % 100 !== 13) suffix = "rd";
  return `${day}${suffix}`;
};
