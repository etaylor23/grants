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

export interface WorkdayHours {
  PK: string; // UserID
  SK: string; // "WORKDAY_HOURS#YYYY" - e.g., "WORKDAY_HOURS#2025"
  Hours: Record<string, number>; // Object with date keys: { "2025-01-04": 8, ... }
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

// Dexie database class
export class GrantTrackerDB extends Dexie {
  // Declare tables
  organisations!: Table<Organisation>;
  individuals!: Table<Individual>;
  grants!: Table<Grant>;
  workdays!: Table<Workday>;
  workdayHours!: Table<WorkdayHours>;
  timeslots!: Table<TimeSlot>;

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
