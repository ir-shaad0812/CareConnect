// ============================================
// SOCKET INTEGRATION SERVICE
// Compatibility wrapper around existing socket implementation
// ============================================

export {
  initializeSocket,
  emitNotification,
  getOnlineUsers,
  isUserOnline,
  sendToUser,
  emitChatStatusChange,
  emitAvailabilityUpdated,
  emitBookingReserved,
  emitBookingConfirmed,
  emitBookingCancelled,
  emitReservationExpired,
} from '../../config/socket.js';

export { default } from '../../config/socket.js';
