// ============================================
// TRACKING MODULE SERVICE
// Delegates to existing booking service tracking methods
// ============================================

import bookingService from '../../services/booking.service.js';

export const checkInTracking = (bookingId, userId, payload) => {
  return bookingService.checkInTracking(bookingId, userId, payload);
};

export const checkOutTracking = (bookingId, userId, payload) => {
  return bookingService.checkOutTracking(bookingId, userId, payload);
};

export const submitTrackingLog = (bookingId, userId, payload) => {
  return bookingService.submitTrackingLog(bookingId, userId, payload);
};

export const getTrackingLogs = (bookingId, userId, role) => {
  return bookingService.getTrackingLogs(bookingId, userId, role);
};

export default {
  checkInTracking,
  checkOutTracking,
  submitTrackingLog,
  getTrackingLogs,
};
