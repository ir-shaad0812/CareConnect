// ============================================
// SYSTEM CONSTANTS
// Cross-cutting constants for startup and events
// ============================================

export const SERVICE_STATUS = Object.freeze({
  UP: 'up',
  DOWN: 'down',
  DEGRADED: 'degraded',
});

export const STARTUP_CHECK_CODES = Object.freeze({
  PASSED: 'STARTUP_CHECK_PASSED',
  WARNING: 'STARTUP_CHECK_WARNING',
  FAILED: 'STARTUP_CHECK_FAILED',
});

export const REALTIME_CHANNELS = Object.freeze({
  USER: 'user',
  CHAT_STATUS: 'chat_status',
  BOOKING: 'booking',
  CAREGIVER_AVAILABILITY: 'caregiver_availability',
});
