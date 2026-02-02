import { ApiError } from '../utils/apiResponse.js';
import { isConnected, getConnectionState } from '../config/database.js';

/**
 * Expose lightweight DB state for health/readiness endpoints.
 */
export const getDatabaseStatusPayload = () => ({
  connected: isConnected(),
  state: getConnectionState(),
});

/**
 * Short-circuit API requests when MongoDB is unavailable.
 * Prevents long server-selection timeouts from cascading across endpoints.
 */
export const requireDatabaseConnection = (req, res, next) => {
  if (isConnected()) {
    next();
    return;
  }

  const dbState = getConnectionState();
  const error = new ApiError(
    503,
    `Database is temporarily unavailable (${dbState}). Please try again shortly.`,
  ).withCode('DATABASE_UNAVAILABLE');

  next(error);
};

export default requireDatabaseConnection;
