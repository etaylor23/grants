// Main database initialization and export module
import { isDexieBackend, FEATURES } from '../config/environment';

// Database initialization
export const initializeDatabase = async (): Promise<void> => {
  if (isDexieBackend()) {
    // Initialize IndexedDB with Dexie
    const { initializeDatabase: initDexie } = await import('./seedLocalDynamo');

    if (FEATURES.autoSeedDatabase) {
      await initDexie();
    }

    if (FEATURES.enableDebugLogging) {
      console.log('IndexedDB initialized with Dexie backend');
    }
  } else {
    // Future: Initialize AWS DynamoDB
    console.log('DynamoDB backend not yet implemented');
  }
};

// Export the appropriate API based on environment
export const getDataAPI = async () => {
  if (isDexieBackend()) {
    const { localDynamo } = await import('./localDynamo');
    return localDynamo;
  } else {
    // Future: Return AWS DynamoDB client
    throw new Error('DynamoDB backend not yet implemented');
  }
};

// Export hooks based on environment
export const getDataHooks = async () => {
  if (isDexieBackend()) {
    return await import('../hooks/useLocalData');
  } else {
    // Future: Return AWS DynamoDB hooks
    throw new Error('DynamoDB backend not yet implemented');
  }
};

// Re-export types and schemas
export * from './schema';
export type { BackendType } from '../config/environment';
