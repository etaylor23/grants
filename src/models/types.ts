export interface User {
  id: string;
  name: string;
  email: string;
}

export interface Personnel {
  id: string;
  firstName: string;
  lastName: string;
  annualGrossSalary: number;
  pension: number;
  nationalInsurance: number;
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
  allocationPercent: number; // 0-100
  totalHours: number; // Total hours worked that day (e.g., 8.0)
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

export type ViewMode = "calendar" | "grid" | "grant";

export class ApiError extends Error {
  code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = "ApiError";
    this.code = code;
  }
}

// DynamoDB-compatible types
export interface DynamoKey {
  PK: string;
  SK: string;
}

export interface DynamoWorkdayItem extends DynamoKey {
  PK: string; // UserID (e.g., "U-12345")
  SK: string; // "WORKDAYS#YYYY" (e.g., "WORKDAYS#2025")
  Workdays: Record<string, boolean>; // Map<ISO-Date, true>
}

export interface DynamoTimeSlotItem extends DynamoKey {
  PK: string; // UserID
  SK: string; // "YYYY-MM-DD#GrantID" (e.g., "2025-01-05#GRANT-ABC")
  AllocationPercent: number; // 0-100
  TotalHours: number; // Total hours worked that day
}

export interface DynamoPersonnelItem extends DynamoKey {
  PK: string; // "PERSONNEL"
  SK: string; // PersonnelID (e.g., "PERSON-12345")
  FirstName: string;
  LastName: string;
  AnnualGrossSalary: number;
  Pension: number;
  NationalInsurance: number;
}

export interface DynamoGrantItem extends DynamoKey {
  PK: string; // "GRANTS"
  SK: string; // GrantID (e.g., "GRANT-ABC")
  Name: string;
  Color: string;
  Description?: string;
}

// Condition expressions
export type ConditionExpression = string;

// DynamoDB operation types
export interface PutItemInput {
  Item: Record<string, any>;
  ConditionExpression?: ConditionExpression;
  ExpressionAttributeNames?: Record<string, string>;
  ExpressionAttributeValues?: Record<string, any>;
}

export interface GetItemInput {
  Key: DynamoKey;
}

export interface DeleteItemInput {
  Key: DynamoKey;
  ConditionExpression?: ConditionExpression;
  ExpressionAttributeNames?: Record<string, string>;
  ExpressionAttributeValues?: Record<string, any>;
}

export interface UpdateItemInput {
  Key: DynamoKey;
  UpdateExpression: string;
  ConditionExpression?: ConditionExpression;
  ExpressionAttributeNames?: Record<string, string>;
  ExpressionAttributeValues?: Record<string, any>;
}

export interface QueryInput {
  KeyConditionExpression: string;
  FilterExpression?: string;
  ExpressionAttributeNames?: Record<string, string>;
  ExpressionAttributeValues?: Record<string, any>;
  IndexName?: string;
  ScanIndexForward?: boolean;
  Limit?: number;
  ExclusiveStartKey?: DynamoKey;
}

export interface TransactWriteItem {
  Put?: PutItemInput;
  Update?: UpdateItemInput;
  Delete?: DeleteItemInput;
}

export interface TransactWriteInput {
  TransactItems: TransactWriteItem[];
}

export interface BatchWriteItem {
  PutRequest?: { Item: Record<string, any> };
  DeleteRequest?: { Key: DynamoKey };
}

export interface BatchWriteInput {
  RequestItems: Record<string, BatchWriteItem[]>;
}
