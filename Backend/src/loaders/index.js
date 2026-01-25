// ============================================
// LOADERS INDEX
// Exposes loader functions used by app and server
// ============================================

export { configureApp } from './app.loader.js';
export { registerCoreMiddleware } from './middleware.loader.js';
export { registerRoutes } from './routes.loader.js';
export { registerErrorHandlers } from './error.loader.js';
export { initializeRealtime } from './realtime.loader.js';
export { runStartupValidation } from './startup-check.loader.js';
export { startBackgroundJobs, stopBackgroundJobs } from './cron.loader.js';
export { startQueueWorkers, stopQueueWorkers } from './queue.loader.js';
export { registerShutdownHandlers, registerFatalHandlers } from './shutdown.loader.js';
