import {
  migrateMockDataToIndexedDB,
  isMigrationCompleted,
} from "../db/migration";
import { initializeDB } from "../db/schema";
import {
  isLocalDynamoEnabled,
  isMigrationEnabled,
  debugLog,
} from "../config/environment";

// Application initialization service
export class InitializationService {
  private static initialized = false;
  private static initializationPromise: Promise<void> | null = null;

  // Initialize the application
  static async initialize(): Promise<void> {
    if (this.initialized) {
      debugLog("Application already initialized");
      return;
    }

    if (this.initializationPromise) {
      debugLog("Initialization already in progress, waiting...");
      return this.initializationPromise;
    }

    this.initializationPromise = this.performInitialization();
    await this.initializationPromise;
  }

  private static async performInitialization(): Promise<void> {
    try {
      debugLog("Starting application initialization...");

      // Initialize IndexedDB if using local DynamoDB
      if (isLocalDynamoEnabled()) {
        debugLog("Initializing IndexedDB...");
        await initializeDB();
        debugLog("IndexedDB initialized successfully");

        // Perform migration if enabled and not already completed
        if (isMigrationEnabled() && !isMigrationCompleted()) {
          debugLog("Starting data migration...");
          await migrateMockDataToIndexedDB();
          debugLog("Data migration completed successfully");
        } else if (isMigrationCompleted()) {
          debugLog("Migration already completed, skipping...");
        } else {
          debugLog("Migration disabled by configuration");
        }
      } else {
        debugLog(
          "Using mock data client, but checking if IndexedDB needs initialization..."
        );

        // Even when using mock client, we might need IndexedDB for personnel management
        // Check if IndexedDB exists and has data
        try {
          await initializeDB();
          debugLog("IndexedDB initialized for personnel/grant management");

          // If migration is enabled and not completed, run it to populate initial data
          if (isMigrationEnabled() && !isMigrationCompleted()) {
            debugLog("Populating IndexedDB with initial data...");
            await migrateMockDataToIndexedDB();
            debugLog("Initial data population completed");
          }
        } catch (error) {
          debugLog(
            "IndexedDB initialization failed, continuing with mock data only",
            error
          );
        }
      }

      this.initialized = true;
      debugLog("Application initialization completed successfully");
    } catch (error) {
      console.error("Application initialization failed:", error);
      this.initializationPromise = null; // Allow retry
      throw error;
    }
  }

  // Check if the application is initialized
  static isInitialized(): boolean {
    return this.initialized;
  }

  // Reset initialization state (for testing)
  static reset(): void {
    this.initialized = false;
    this.initializationPromise = null;
    debugLog("Initialization state reset");
  }

  // Force re-initialization (useful after database reset)
  static async forceReinitialize(): Promise<void> {
    debugLog("Forcing re-initialization...");
    this.reset();
    await this.initialize();
  }

  // Get initialization status
  static getStatus(): {
    initialized: boolean;
    inProgress: boolean;
    usingLocalDynamo: boolean;
    migrationCompleted: boolean;
  } {
    return {
      initialized: this.initialized,
      inProgress: this.initializationPromise !== null && !this.initialized,
      usingLocalDynamo: isLocalDynamoEnabled(),
      migrationCompleted: isMigrationCompleted(),
    };
  }
}

// Auto-initialize on module load in development
if (process.env.NODE_ENV === "development") {
  InitializationService.initialize().catch((error) => {
    console.error("Auto-initialization failed:", error);
  });
}

// Export convenience function
export const initializeApp = () => InitializationService.initialize();
