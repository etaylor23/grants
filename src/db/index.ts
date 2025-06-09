// IndexedDB database initialization
import { FEATURES } from '../config/environment';

// Database initialization
export const initializeDatabase = async (): Promise<void> => {
  // Initialize IndexedDB with Dexie
  const { initializeDatabase: initDexie } = await import('./seedLocalDynamo');

  if (FEATURES.autoSeedDatabase) {
    await initDexie();
  }

  if (FEATURES.enableDebugLogging) {
    console.log('IndexedDB initialized successfully');
  }
};

// Export the IndexedDB API
export const getDataAPI = async () => {
  const { localDynamo } = await import('./localDynamo');
  return localDynamo;
};

// Export IndexedDB hooks
export const getDataHooks = async () => {
  return await import('../hooks/useLocalData');
};

// Re-export types and schemas
export * from './schema';
export type { BackendType } from '../config/environment';
