export interface User {
  id: string;
  name: string;
  email: string;
}

export interface Grant {
  id: string;
  name: string;
  color: string;
  description?: string;
}

export interface Workday {
  userId: string;
  year: number;
  workdays: Record<string, boolean>; // ISO date string -> true
}

export interface TimeSlot {
  userId: string;
  date: string; // ISO date string (YYYY-MM-DD)
  grantId: string;
  allocationPercent: number; // 0-100 (kept for backward compatibility)
  hoursAllocated?: number; // New field for hours-based allocation
}

export interface TimeSlotBatch {
  create?: TimeSlot[];
  update?: TimeSlot[];
  delete?: { userId: string; date: string; grantId: string }[];
}

export interface DayAllocation {
  date: string;
  allocations: { grantId: string; percent: number }[];
  totalPercent: number;
  isWorkday: boolean;
}

export interface WorkdayHours {
  userId: string;
  date: string; // ISO date string (YYYY-MM-DD)
  availableHours: number; // Default 8 hours per day
}

export interface WorkdayHoursBatch {
  create?: WorkdayHours[];
  update?: WorkdayHours[];
  delete?: { userId: string; date: string }[];
}

export type ViewMode = "calendar" | "grid";

export interface ApiError {
  message: string;
  code?: string;
}
