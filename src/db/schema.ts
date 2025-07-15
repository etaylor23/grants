import Dexie, { Table } from "dexie";

// DynamoDB-compatible entity interfaces
export interface Organisation {
  PK: string; // OrganisationID - e.g., "ORG-001"
  Name: string;
  CompanyNumber: string; // UK Companies House number or equivalent
  CreatedDate: string; // ISO date format
}

export interface Individual {
  PK: string; // UserID - e.g., "U-12345"
  FirstName: string;
  LastName: string;
  AnnualGross: number; // Annual salary in £
  Pension: number; // Annual pension contribution in £
  NationalIns: number; // Annual National Insurance in £
  OrganisationID: string; // References Organisation.PK
}

export interface Grant {
  PK: string; // GrantID
  Title: string;
  StartDate: string; // ISO date format
  EndDate: string; // ISO date format
  ManagerUserID: string; // References Individuals.PK
  OrganisationID: string; // References Organisation.PK
  TotalClaimableAmount?: number; // Total budget allocated by awarding body
}

export interface Workday {
  PK: string; // UserID
  SK: string; // "WORKDAYS#YYYY" - e.g., "WORKDAYS#2025"
  Workdays: Record<string, boolean>; // Object with date keys: { "2025-01-04": true, ... }
}

// Leave types supported by the system
export type LeaveType =
  | "work"
  | "annual-leave"
  | "sick-leave"
  | "public-holiday"
  | "other";

export interface DayEntry {
  hours: number; // Available hours for the day
  type: LeaveType; // Type of day (work, leave, etc.)
  note?: string; // Optional note for leave days
}

export interface WorkdayHours {
  PK: string; // UserID
  SK: string; // "WORKDAY_HOURS#YYYY" - e.g., "WORKDAY_HOURS#2025"
  Hours: Record<string, number | DayEntry>; // Object with date keys: { "2025-01-04": 8, "2025-01-05": { hours: 0, type: "annual-leave", note: "Vacation" } }
}

export interface TimeSlot {
  PK: string; // UserID
  SK: string; // "YYYY-MM-DD#GrantID" - e.g., "2025-01-15#G-001"
  AllocationPercent: number; // 0-100 range
  HoursAllocated: number; // Raw hours for hours-based system
  Date: string; // ISO date for indexing
  GrantID: string; // Grant ID for indexing
  UserID: string; // User ID for indexing
}

/**
 * Cost types supported by the grants system for non-staff expenses
 */
export type CostType =
  | "Materials"
  | "Subcontractors"
  | "Travel"
  | "Overheads"
  | "Capital";

/**
 * Cost interface for tracking non-staff expenses in grants
 * Designed for DynamoDB compatibility with proper indexing
 */
export interface Cost {
  /** Primary key - Cost ID (e.g., "C-12345") */
  PK: string;
  /** Grant ID this cost is associated with - References Grant.PK */
  GrantID: string;
  /** Type of cost from the supported cost types */
  Type: CostType;
  /** Human-readable name for the cost item */
  Name: string;
  /** Detailed description of the cost */
  Description: string;
  /** Cost amount in pence for precision (e.g., 10000 = £100.00) */
  Amount: number;
  /** Invoice date in ISO format (YYYY-MM-DD) */
  InvoiceDate: string;
  /** Creation timestamp in ISO format */
  CreatedDate: string;
  /** Organisation ID this cost belongs to - References Organisation.PK */
  OrganisationID: string;
}

// Dexie database class
export class GrantTrackerDB extends Dexie {
  // Declare tables
  organisations!: Table<Organisation>;
  individuals!: Table<Individual>;
  grants!: Table<Grant>;
  workdays!: Table<Workday>;
  workdayHours!: Table<WorkdayHours>;
  timeslots!: Table<TimeSlot>;
  costs!: Table<Cost>;

  constructor() {
    super("grantTracker");

    // Define schemas - Version 1 (original)
    this.version(1).stores({
      // Primary key only stores
      individuals: "PK",
      grants: "PK",

      // Compound key stores (PK + SK)
      workdays: "[PK+SK]",
      workdayHours: "[PK+SK]",

      // TimeSlots with multiple indexes for DynamoDB GSI emulation
      timeslots: "[PK+SK], PK, Date, [GrantID+Date], [Date+UserID]",
    });

    // Version 2 - Add organisations and organisational indexes
    this.version(2)
      .stores({
        // Add organisations table
        organisations: "PK",

        // Update existing tables with organisational indexes
        individuals: "PK, OrganisationID",
        grants: "PK, OrganisationID",

        // Keep existing compound key stores
        workdays: "[PK+SK]",
        workdayHours: "[PK+SK]",

        // TimeSlots with multiple indexes for DynamoDB GSI emulation
        timeslots: "[PK+SK], PK, Date, [GrantID+Date], [Date+UserID]",
      })
      .upgrade(async (trans) => {
        // Migration logic for existing data
        console.log("Migrating database to version 2...");

        // Add default organisation
        const defaultOrg: Organisation = {
          PK: "ORG-DEFAULT",
          Name: "Default Organisation",
          CompanyNumber: "00000000",
          CreatedDate: new Date().toISOString(),
        };
        await trans.table("organisations").put(defaultOrg);

        // Update all individuals to have OrganisationID
        const individuals = await trans.table("individuals").toArray();
        for (const individual of individuals) {
          if (!individual.OrganisationID) {
            individual.OrganisationID = "ORG-DEFAULT";
            await trans.table("individuals").put(individual);
          }
        }

        // Update all grants to have OrganisationID
        const grants = await trans.table("grants").toArray();
        for (const grant of grants) {
          if (!grant.OrganisationID) {
            grant.OrganisationID = "ORG-DEFAULT";
            await trans.table("grants").put(grant);
          }
        }

        console.log("Database migration to version 2 completed");
      });

    // Version 3: Add costs table
    this.version(3).stores({
      // Primary key only stores
      individuals: "PK",
      grants: "PK",
      organisations: "PK",

      // Compound key stores (PK + SK)
      workdays: "[PK+SK]",
      workdayHours: "[PK+SK]",

      // TimeSlots with multiple indexes for DynamoDB GSI emulation
      timeslots: "[PK+SK], PK, Date, [GrantID+Date], [Date+UserID]",

      // Costs with indexes for efficient querying
      costs:
        "PK, GrantID, [GrantID+InvoiceDate], [OrganisationID+GrantID], Type",
    });
  }
}

// Create database instance
export const db = new GrantTrackerDB();

// Helper functions for key generation
export const generateWorkdayKey = (userId: string, year: number): string => {
  return `WORKDAYS#${year}`;
};

export const generateWorkdayHoursKey = (
  userId: string,
  year: number
): string => {
  return `WORKDAY_HOURS#${year}`;
};

export const generateTimeSlotKey = (date: string, grantId: string): string => {
  return `${date}#${grantId}`;
};

/**
 * Generates a unique cost ID using timestamp
 * @returns A unique cost ID in format "C-{timestamp}"
 */
export const generateCostId = (): string => {
  const timestamp = Date.now();
  return `C-${timestamp}`;
};

// Helper functions for parsing keys
export const parseTimeSlotKey = (
  sk: string
): { date: string; grantId: string } => {
  const [date, grantId] = sk.split("#");
  return { date, grantId };
};

export const parseWorkdayKey = (sk: string): { type: string; year: number } => {
  const [type, yearStr] = sk.split("#");
  return { type, year: parseInt(yearStr, 10) };
};

// Type definitions for DynamoDB-compatible operations
export interface DynamoDBKey {
  PK: string;
  SK?: string;
}

export interface DynamoDBItem {
  [key: string]: any;
}

export interface QueryParams {
  TableName?: string;
  KeyConditionExpression?: string;
  ExpressionAttributeNames?: Record<string, string>;
  ExpressionAttributeValues?: Record<string, any>;
  IndexName?: string;
  ScanIndexForward?: boolean;
  Limit?: number;
}

export interface PutParams {
  TableName?: string;
  Item: DynamoDBItem;
}

export interface GetParams {
  TableName?: string;
  Key: DynamoDBKey;
}

export interface DeleteParams {
  TableName?: string;
  Key: DynamoDBKey;
}

export interface UpdateParams {
  TableName?: string;
  Key: DynamoDBKey;
  UpdateExpression?: string;
  ExpressionAttributeNames?: Record<string, string>;
  ExpressionAttributeValues?: Record<string, any>;
}

export interface BatchWriteParams {
  RequestItems: {
    [tableName: string]: Array<{
      PutRequest?: { Item: DynamoDBItem };
      DeleteRequest?: { Key: DynamoDBKey };
    }>;
  };
}

export interface TransactWriteParams {
  TransactItems: Array<{
    Put?: { TableName?: string; Item: DynamoDBItem };
    Delete?: { TableName?: string; Key: DynamoDBKey };
    Update?: UpdateParams;
  }>;
}

// Business rule validation functions
export const validateAllocationPercent = (
  allocations: Array<{ AllocationPercent: number }>
): boolean => {
  const total = allocations.reduce(
    (sum, slot) => sum + slot.AllocationPercent,
    0
  );
  return total <= 100;
};

export const validateHoursAllocated = (
  allocations: Array<{ HoursAllocated: number }>,
  availableHours: number
): boolean => {
  const total = allocations.reduce((sum, slot) => sum + slot.HoursAllocated, 0);
  return total <= availableHours;
};

// Default available hours per workday
export const DEFAULT_WORKDAY_HOURS = 8;

// Helper functions for leave type system
export const createWorkDayEntry = (
  hours: number = DEFAULT_WORKDAY_HOURS
): DayEntry => ({
  hours,
  type: "work",
});

export const createLeaveEntry = (type: LeaveType, note?: string): DayEntry => ({
  hours: 0,
  type,
  note,
});

// Helper to get hours from a day entry (backward compatibility)
export const getHoursFromDayEntry = (entry: number | DayEntry): number => {
  if (typeof entry === "number") {
    return entry; // Backward compatibility with old numeric format
  }
  return entry.hours;
};

// Helper to get leave type from a day entry
export const getLeaveTypeFromDayEntry = (
  entry: number | DayEntry
): LeaveType => {
  if (typeof entry === "number") {
    return entry > 0 ? "work" : "work"; // Assume work day for backward compatibility
  }
  return entry.type;
};

// Helper to check if a day is a work day (has available hours for allocation)
export const isWorkDay = (entry: number | DayEntry): boolean => {
  return (
    getHoursFromDayEntry(entry) > 0 &&
    getLeaveTypeFromDayEntry(entry) === "work"
  );
};

// Helper to check if a day is a leave day
export const isLeaveDay = (entry: number | DayEntry): boolean => {
  const type = getLeaveTypeFromDayEntry(entry);
  return type !== "work";
};
