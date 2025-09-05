// **PRODUCTION-SAFE LOGGING UTILITY**
// Automatically disables console logs in production environment
// 
// Environment detection:
// - Development: NODE_ENV === 'development' or undefined
// - Production: NODE_ENV === 'production'
//
// Usage:
// import logger from '../utils/logger.js';
// logger.log('This only shows in development');
// logger.error('This always shows for debugging');

const isDevelopment = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === undefined;
const isProduction = process.env.NODE_ENV === 'production';

// Create a logger that only works in development
const logger = {
  log: (...args) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },
  
  warn: (...args) => {
    if (isDevelopment) {
      console.warn(...args);
    }
  },
  
  error: (...args) => {
    // Always show errors, even in production (for debugging)
    console.error(...args);
  },
  
  info: (...args) => {
    if (isDevelopment) {
      console.info(...args);
    }
  },
  
  debug: (...args) => {
    if (isDevelopment) {
      console.debug(...args);
    }
  },
  
  // Production-safe console methods
  devLog: (...args) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },
  
  prodLog: (...args) => {
    // Only for critical production logs (use sparingly)
    if (isProduction) {
      console.log(...args);
    }
  }
};

// Helper function to replace console.log calls
export const devLog = logger.devLog;
export const prodLog = logger.prodLog;

export default logger;
