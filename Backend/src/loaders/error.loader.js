// ============================================
// ERROR LOADER
// Registers not-found and error handlers
// ============================================

import { errorHandler, notFoundHandler } from '../middleware/error.middleware.js';

export const registerErrorHandlers = (app) => {
  app.use(notFoundHandler);
  app.use(errorHandler);
};
