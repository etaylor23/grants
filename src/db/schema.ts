import { openDB, DBSchema, IDBPDatabase } from "idb";
import {
  DynamoWorkdayItem,
  DynamoTimeSlotItem,
  DynamoPersonnelItem,
  DynamoGrantItem,
} from "../models/types";

// IndexedDB Schema Definition
export interface GrantTrackerDB extends DBSchema {
  Workdays: {
    key: string; // PK|SK format
    value: DynamoWorkdayItem;
    indexes: {
      userWorkdays: string; // Index by user ID (PK)
    };
  };
  TimeSlots: {
    key: string; // PK|SK format
    value: DynamoTimeSlotItem;
    indexes: {
      userTimeSlots: string; // Index by user ID (PK)
      userDateTimeSlots: string; // PK + date prefix for range queries
    };
  };
  Personnel: {
    key: string; // PK|SK format
    value: DynamoPersonnelItem;
    indexes: {
      allPersonnel: string; // Index by PK for listing all personnel
    };
  };
  Grants: {
    key: string; // PK|SK format
    value: DynamoGrantItem;
    indexes: {
      allGrants: string; // Index by PK for listing all grants
    };
  };
}

// Database configuration
export const DB_NAME = "grantTracker";
export const DB_VERSION = 2; // Incremented to force schema update with new index names

// Helper function to create composite key
export const createCompositeKey = (PK: string, SK: string): string =>
  `${PK}|${SK}`;

// Helper function to parse composite key
export const parseCompositeKey = (key: string): { PK: string; SK: string } => {
  const [PK, SK] = key.split("|");
  return { PK, SK };
};

// Database initialization
let dbInstance: IDBPDatabase<GrantTrackerDB> | null = null;

export const initializeDB = async (): Promise<IDBPDatabase<GrantTrackerDB>> => {
  if (dbInstance) {
    return dbInstance;
  }

  dbInstance = await openDB<GrantTrackerDB>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion, newVersion, transaction) {
      console.log(
        `Upgrading database from version ${oldVersion} to ${newVersion}`
      );

      // Create Workdays object store
      if (!db.objectStoreNames.contains("Workdays")) {
        const workdaysStore = db.createObjectStore("Workdays", {
          keyPath: "compositeKey",
        });
        workdaysStore.createIndex("userWorkdays", "PK");
      } else if (oldVersion < 2) {
        // Upgrade existing store indexes
        const workdaysStore = transaction.objectStore("Workdays");
        // Delete old index if it exists
        if ((workdaysStore as any).indexNames.contains("byPK")) {
          (workdaysStore as any).deleteIndex("byPK");
        }
        // Create new index
        if (!workdaysStore.indexNames.contains("userWorkdays")) {
          workdaysStore.createIndex("userWorkdays", "PK");
        }
      }

      // Create TimeSlots object store
      if (!db.objectStoreNames.contains("TimeSlots")) {
        const timeSlotsStore = db.createObjectStore("TimeSlots", {
          keyPath: "compositeKey",
        });
        timeSlotsStore.createIndex("userTimeSlots", "PK");
        timeSlotsStore.createIndex("userDateTimeSlots", ["PK", "datePrefix"]);
      } else if (oldVersion < 2) {
        // Upgrade existing store indexes
        const timeSlotsStore = transaction.objectStore("TimeSlots");
        // Delete old indexes if they exist
        if ((timeSlotsStore as any).indexNames.contains("byPK")) {
          (timeSlotsStore as any).deleteIndex("byPK");
        }
        if ((timeSlotsStore as any).indexNames.contains("byPKDate")) {
          (timeSlotsStore as any).deleteIndex("byPKDate");
        }
        // Create new indexes
        if (!timeSlotsStore.indexNames.contains("userTimeSlots")) {
          timeSlotsStore.createIndex("userTimeSlots", "PK");
        }
        if (!timeSlotsStore.indexNames.contains("userDateTimeSlots")) {
          timeSlotsStore.createIndex("userDateTimeSlots", ["PK", "datePrefix"]);
        }
      }

      // Create Personnel object store
      if (!db.objectStoreNames.contains("Personnel")) {
        const personnelStore = db.createObjectStore("Personnel", {
          keyPath: "compositeKey",
        });
        personnelStore.createIndex("allPersonnel", "PK");
      } else if (oldVersion < 2) {
        // Upgrade existing store indexes
        const personnelStore = transaction.objectStore("Personnel");
        // Delete old index if it exists
        if ((personnelStore as any).indexNames.contains("byPK")) {
          (personnelStore as any).deleteIndex("byPK");
        }
        // Create new index
        if (!personnelStore.indexNames.contains("allPersonnel")) {
          personnelStore.createIndex("allPersonnel", "PK");
        }
      }

      // Create Grants object store
      if (!db.objectStoreNames.contains("Grants")) {
        const grantsStore = db.createObjectStore("Grants", {
          keyPath: "compositeKey",
        });
        grantsStore.createIndex("allGrants", "PK");
      } else if (oldVersion < 2) {
        // Upgrade existing store indexes
        const grantsStore = transaction.objectStore("Grants");
        // Delete old index if it exists
        if ((grantsStore as any).indexNames.contains("byPK")) {
          (grantsStore as any).deleteIndex("byPK");
        }
        // Create new index
        if (!grantsStore.indexNames.contains("allGrants")) {
          grantsStore.createIndex("allGrants", "PK");
        }
      }
    },
  });

  return dbInstance;
};

// Helper function to add composite key to items
export const addCompositeKey = <T extends { PK: string; SK: string }>(
  item: T
): T & { compositeKey: string; datePrefix?: string } => {
  const result = {
    ...item,
    compositeKey: createCompositeKey(item.PK, item.SK),
  } as T & { compositeKey: string; datePrefix?: string };

  // Add datePrefix for TimeSlots to enable range queries
  if (item.SK.includes("#")) {
    const datePart = item.SK.split("#")[0];
    result.datePrefix = datePart;
  }

  return result;
};

// Helper function to remove composite key from items
export const removeCompositeKey = <
  T extends { compositeKey: string; datePrefix?: string }
>(
  item: T
): Omit<T, "compositeKey" | "datePrefix"> => {
  const { compositeKey, datePrefix, ...rest } = item;
  return rest;
};

// Close database connection
export const closeDB = async (): Promise<void> => {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
};

// Reset database (delete and recreate) - useful for development
export const resetDB = async (): Promise<void> => {
  // Close existing connection
  await closeDB();

  // Delete the database
  await new Promise<void>((resolve, reject) => {
    const deleteRequest = indexedDB.deleteDatabase(DB_NAME);
    deleteRequest.onsuccess = () => {
      console.log("Database deleted successfully");
      resolve();
    };
    deleteRequest.onerror = () => {
      console.error("Failed to delete database");
      reject(new Error("Failed to delete database"));
    };
    deleteRequest.onblocked = () => {
      console.warn("Database deletion blocked - close all tabs and try again");
    };
  });

  // Clear migration flag
  localStorage.removeItem("grantTracker_migrated");

  console.log("Database reset complete. Triggering re-initialization...");

  // Trigger re-initialization
  try {
    const { InitializationService } = await import(
      "../services/initialization"
    );
    await InitializationService.forceReinitialize();
    console.log("Re-initialization completed successfully");
  } catch (error) {
    console.error("Re-initialization failed:", error);
    console.log("Please refresh the page to complete initialization");
  }
};

// Make reset function available in development
if (process.env.NODE_ENV === "development") {
  (window as any).resetGrantsDB = resetDB;
  console.log(
    "Development mode: Use window.resetGrantsDB() to reset the database"
  );
}
