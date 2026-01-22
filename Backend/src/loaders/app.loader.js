// ============================================
// APP LOADER
// Composes middleware, routes, and error handlers
// ============================================

import { registerCoreMiddleware } from './middleware.loader.js';
import { registerRoutes } from './routes.loader.js';
import { registerErrorHandlers } from './error.loader.js';

export const configureApp = (app) => {
  registerCoreMiddleware(app);
  registerRoutes(app);
  registerErrorHandlers(app);

  return app;
};
