// Environment configuration for the grants tracking application

export const config = {
  // Database configuration
  useLocalDynamo: process.env.REACT_APP_USE_LOCAL_DYNAMO === 'true',
  
  // Development flags
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  
  // Feature flags
  enableMigration: process.env.REACT_APP_ENABLE_MIGRATION !== 'false', // Default to true
  enableDebugLogging: process.env.REACT_APP_DEBUG_LOGGING === 'true',
  
  // API configuration
  apiDelay: {
    short: 200,
    medium: 300,
    long: 400,
  },
  
  // Cache configuration
  cacheTime: {
    workdays: 5 * 60 * 1000, // 5 minutes
    timeSlots: 2 * 60 * 1000, // 2 minutes
    personnel: 5 * 60 * 1000, // 5 minutes
    grants: 5 * 60 * 1000, // 5 minutes
  },
};

// Helper functions
export const isLocalDynamoEnabled = (): boolean => config.useLocalDynamo;
export const isMigrationEnabled = (): boolean => config.enableMigration;
export const isDebugLoggingEnabled = (): boolean => config.enableDebugLogging;

// Debug logging utility
export const debugLog = (message: string, data?: any): void => {
  if (isDebugLoggingEnabled()) {
    console.log(`[DEBUG] ${message}`, data || '');
  }
};

// Environment info for debugging
export const getEnvironmentInfo = () => ({
  nodeEnv: process.env.NODE_ENV,
  useLocalDynamo: config.useLocalDynamo,
  enableMigration: config.enableMigration,
  enableDebugLogging: config.enableDebugLogging,
  timestamp: new Date().toISOString(),
});

// Log environment configuration on startup
if (config.isDevelopment) {
  console.log('Environment Configuration:', getEnvironmentInfo());
}
