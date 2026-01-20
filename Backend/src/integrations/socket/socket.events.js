// ============================================
// SOCKET EVENT CONSTANTS
// Shared socket event names for module consumers
// ============================================

import { SOCKET_EVENTS } from '../../constants/chat.constants.js';

export const BookingSocketEvents = Object.freeze({
  JOIN_BOOKING_ROOM: 'join_booking_room',
  LEAVE_BOOKING_ROOM: 'leave_booking_room',
  BOOKING_RESERVED: 'booking_reserved',
  BOOKING_CONFIRMED: 'booking_confirmed',
  RESERVATION_EXPIRED: 'reservation_expired',
});

export const AvailabilitySocketEvents = Object.freeze({
  SUBSCRIBE: 'subscribe_caregiver_availability',
  UNSUBSCRIBE: 'unsubscribe_caregiver_availability',
  UPDATED: 'availability_updated',
});

export { SOCKET_EVENTS };
