// Date utility functions
export const calculateTotalHoursWorked = (
  timeSlots: Array<{ date: string; grantId: string; hoursAllocated: number }>,
  grantId: string,
  periodDates: string[]
): number => {
  return timeSlots
    .filter(slot => slot.grantId === grantId && periodDates.includes(slot.date))
    .reduce((total, slot) => total + slot.hoursAllocated, 0);
};

export const calculateTotalAvailableHours = (
  workdayHoursLookup: Record<string, number>,
  periodDates: string[]
): number => {
  return periodDates.reduce((total, date) => total + (workdayHoursLookup[date] || 0), 0);
};

export const calculateAveragePercentage = (
  totalHoursWorked: number,
  totalAvailableHours: number
): number => {
  return totalAvailableHours > 0 ? (totalHoursWorked / totalAvailableHours) * 100 : 0;
};

export const formatDateOrdinal = (date: Date): string => {
  const day = date.getDate();
  let suffix = 'th';
  if (day % 10 === 1 && day % 100 !== 11) suffix = 'st';
  else if (day % 10 === 2 && day % 100 !== 12) suffix = 'nd';
  else if (day % 10 === 3 && day % 100 !== 13) suffix = 'rd';
  return `${day}${suffix}`;
};
