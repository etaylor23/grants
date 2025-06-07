import { v4 as uuidv4 } from "uuid";
import { putItem } from "./local-dynamo";
import {
  mockUsers,
  mockGrants,
  mockWorkdays,
  mockTimeSlots,
} from "../api/mockData";
import {
  DynamoWorkdayItem,
  DynamoTimeSlotItem,
  DynamoPersonnelItem,
  DynamoGrantItem,
  Personnel,
} from "../models/types";

// Migration flag to prevent duplicate migrations
const MIGRATION_KEY = "grantTracker_migrated";

// Check if migration has already been completed
export const isMigrationCompleted = (): boolean => {
  return localStorage.getItem(MIGRATION_KEY) === "true";
};

// Mark migration as completed
const markMigrationCompleted = (): void => {
  localStorage.setItem(MIGRATION_KEY, "true");
};

// Convert mock users to personnel records
const convertUsersToPersonnel = (): Personnel[] => {
  return mockUsers.map((user) => ({
    id: user.id,
    firstName: user.name.split(" ")[0] || user.name,
    lastName: user.name.split(" ").slice(1).join(" ") || "",
    annualGrossSalary: 50000 + Math.floor(Math.random() * 50000), // Random salary between 50k-100k
    pension: 5000 + Math.floor(Math.random() * 5000), // Random pension between 5k-10k
    nationalInsurance: 3000 + Math.floor(Math.random() * 2000), // Random NI between 3k-5k
  }));
};

// Migrate mock data to IndexedDB with DynamoDB structure
export const migrateMockDataToIndexedDB = async (): Promise<void> => {
  if (isMigrationCompleted()) {
    console.log("Migration already completed, skipping...");
    return;
  }

  console.log("Starting migration of mock data to IndexedDB...");

  try {
    // Migrate Personnel (converted from Users)
    const personnel = convertUsersToPersonnel();
    for (const person of personnel) {
      const personnelItem: DynamoPersonnelItem = {
        PK: "PERSONNEL",
        SK: person.id,
        FirstName: person.firstName,
        LastName: person.lastName,
        AnnualGrossSalary: person.annualGrossSalary,
        Pension: person.pension,
        NationalInsurance: person.nationalInsurance,
      };

      await putItem({ Item: personnelItem }, "Personnel");
    }
    console.log(`Migrated ${personnel.length} personnel records`);

    // Migrate Grants
    for (const grant of mockGrants) {
      const grantItem: DynamoGrantItem = {
        PK: "GRANTS",
        SK: grant.id,
        Name: grant.name,
        Color: grant.color,
        Description: grant.description || "",
      };

      await putItem({ Item: grantItem }, "Grants");
    }
    console.log(`Migrated ${mockGrants.length} grant records`);

    // Migrate Workdays
    for (const [key, workday] of Object.entries(mockWorkdays)) {
      const workdayItem: DynamoWorkdayItem = {
        PK: workday.userId,
        SK: `WORKDAYS#${workday.year}`,
        Workdays: workday.workdays,
      };

      await putItem({ Item: workdayItem }, "Workdays");
    }
    console.log(`Migrated ${Object.keys(mockWorkdays).length} workday records`);

    // Migrate TimeSlots
    for (const timeSlot of mockTimeSlots) {
      const timeSlotItem: DynamoTimeSlotItem = {
        PK: timeSlot.userId,
        SK: `${timeSlot.date}#${timeSlot.grantId}`,
        AllocationPercent: timeSlot.allocationPercent,
        TotalHours: timeSlot.totalHours,
      };

      await putItem({ Item: timeSlotItem }, "TimeSlots");
    }
    console.log(`Migrated ${mockTimeSlots.length} time slot records`);

    // Mark migration as completed
    markMigrationCompleted();
    console.log("Migration completed successfully!");
  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  }
};

// Reset migration (for development/testing)
export const resetMigration = (): void => {
  localStorage.removeItem(MIGRATION_KEY);
  console.log("Migration flag reset");
};

// Create sample personnel for testing
export const createSamplePersonnel = async (): Promise<Personnel[]> => {
  const samplePersonnel: Personnel[] = [
    {
      id: uuidv4(),
      firstName: "John",
      lastName: "Doe",
      annualGrossSalary: 75000,
      pension: 7500,
      nationalInsurance: 4200,
    },
    {
      id: uuidv4(),
      firstName: "Jane",
      lastName: "Smith",
      annualGrossSalary: 82000,
      pension: 8200,
      nationalInsurance: 4600,
    },
    {
      id: uuidv4(),
      firstName: "Mike",
      lastName: "Johnson",
      annualGrossSalary: 68000,
      pension: 6800,
      nationalInsurance: 3800,
    },
  ];

  // Save to IndexedDB
  for (const person of samplePersonnel) {
    const personnelItem: DynamoPersonnelItem = {
      PK: "PERSONNEL",
      SK: person.id,
      FirstName: person.firstName,
      LastName: person.lastName,
      AnnualGrossSalary: person.annualGrossSalary,
      Pension: person.pension,
      NationalInsurance: person.nationalInsurance,
    };

    await putItem({ Item: personnelItem }, "Personnel");
  }

  return samplePersonnel;
};

// Create sample grants for testing
export const createSampleGrants = async (): Promise<void> => {
  const sampleGrants = [
    {
      id: uuidv4(),
      name: "Innovation Research Grant",
      color: "#9c27b0",
      description: "Advanced research in AI and machine learning",
    },
    {
      id: uuidv4(),
      name: "Sustainability Initiative",
      color: "#4caf50",
      description: "Environmental sustainability projects",
    },
    {
      id: uuidv4(),
      name: "Digital Transformation",
      color: "#ff9800",
      description: "Modernizing digital infrastructure",
    },
  ];

  for (const grant of sampleGrants) {
    const grantItem: DynamoGrantItem = {
      PK: "GRANTS",
      SK: grant.id,
      Name: grant.name,
      Color: grant.color,
      Description: grant.description,
    };

    await putItem({ Item: grantItem }, "Grants");
  }

  console.log(`Created ${sampleGrants.length} sample grants`);
};
