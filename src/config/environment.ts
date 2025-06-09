// Environment configuration for backend switching
export type BackendType = 'dexie' | 'dynamo';

export const getBackendType = (): BackendType => {
  const backend = process.env.REACT_APP_BACKEND as BackendType;
  return backend || 'dexie'; // Default to dexie for development
};

export const isDexieBackend = (): boolean => {
  return getBackendType() === 'dexie';
};

export const isDynamoBackend = (): boolean => {
  return getBackendType() === 'dynamo';
};

// Feature flags
export const FEATURES = {
  autoSeedDatabase: process.env.REACT_APP_AUTO_SEED !== 'false',
  enableDebugLogging: process.env.NODE_ENV === 'development',
  enablePerformanceMonitoring: process.env.REACT_APP_ENABLE_PERF === 'true',
};
