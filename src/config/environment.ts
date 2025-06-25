// Environment configuration - IndexedDB only
export type BackendType = 'dexie';

export const getBackendType = (): BackendType => {
  return 'dexie'; // Always use IndexedDB
};

export const isDexieBackend = (): boolean => {
  return true; // Always true
};

export const isDynamoBackend = (): boolean => {
  return false; // Always false
};

// Feature flags
export const FEATURES = {
  autoSeedDatabase: process.env.REACT_APP_AUTO_SEED !== 'false',
  enableDebugLogging: process.env.NODE_ENV === 'development',
  enablePerformanceMonitoring: process.env.REACT_APP_ENABLE_PERF === 'true',
};
