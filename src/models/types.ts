// Basic types for legacy compatibility
export interface User {
  id: string;
  name: string;
  email: string;
}

export type ViewMode = "calendar" | "grid";

export interface ApiError {
  message: string;
  code?: string;
}

// TimeSlot interfaces for TimesheetGrid
export interface TimeSlot {
  userId: string;
  date: string;
  grantId: string;
  allocationPercent: number;
  hoursAllocated: number;
}

export interface TimeSlotBatch {
  create?: TimeSlot[];
  update?: TimeSlot[];
  delete?: Array<{ userId: string; date: string; grantId: string }>;
}

export interface WorkdayHours {
  userId: string;
  date: string;
  availableHours: number;
}

export interface WorkdayHoursBatch {
  create?: WorkdayHours[];
  update?: WorkdayHours[];
  delete?: Array<{ userId: string; date: string }>;
}
