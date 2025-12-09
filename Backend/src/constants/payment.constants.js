// ============================================
// PAYMENT CONSTANTS
// All payment-related constants Sprint-05 
// ============================================

export const TRANSACTION_TYPE = {
  PAYMENT: 'payment',
  PAYOUT: 'payout',
  REFUND: 'refund',
  PLATFORM_FEE: 'platform_fee',
};

export const TRANSACTION_STATUS = {
  INITIATED: 'initiated',
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  REFUNDED: 'refunded',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired',
};

// Sprint-05: Independent payment status for bookings
export const BOOKING_PAYMENT_STATUS = {
  UNPAID: 'unpaid',
  PAYMENT_PENDING: 'payment_pending',
  PARTIALLY_PAID: 'partially_paid',
  FULLY_PAID: 'fully_paid',
  REFUNDED: 'refunded',
  PARTIALLY_REFUNDED: 'partially_refunded',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired',
};

// Sprint-05: Valid payment status transitions (state machine)
export const PAYMENT_STATUS_TRANSITIONS = {
  unpaid: ['payment_pending', 'cancelled', 'expired'],
  payment_pending: ['partially_paid', 'fully_paid', 'unpaid', 'cancelled', 'expired'],
  partially_paid: ['payment_pending', 'fully_paid', 'partially_refunded', 'cancelled', 'expired'],
  fully_paid: ['refunded', 'partially_refunded'],
  refunded: [],
  partially_refunded: ['refunded'],
  cancelled: [],
  expired: [],
};

// Sprint-05: Payment deadline config
export const PAYMENT_DEADLINE_DAYS = 7; // Days after booking confirmation

// Sprint-05: Payment reminder config
export const PAYMENT_REMINDER_HOURS = 24; // Send reminder 24h after partial payment
export const PAYMENT_REMINDER_FINAL_HOURS = 48; // Send final reminder at 48h

// Sprint-05: Payment gateways
export const PAYMENT_GATEWAY = {
  STRIPE: 'stripe',
  KHALTI: 'khalti',
  ESEWA: 'esewa',
};

export const REVIEW_TYPE = {
  VERIFIED: 'verified',
  PUBLIC: 'public',
};

export const REVIEW_STATUS = {
  PUBLISHED: 'published',
  HIDDEN: 'hidden',
  REMOVED: 'removed',
  PENDING_REVIEW: 'pending_review',
};

export const REPORT_REASON = {
  SPAM: 'spam',
  INAPPROPRIATE: 'inappropriate',
  FAKE: 'fake',
  HARASSMENT: 'harassment',
  OTHER: 'other',
};

export const MODERATION_ACTION = {
  APPROVED: 'approved',
  HIDDEN: 'hidden',
  REMOVED: 'removed',
};

export default {
  TRANSACTION_TYPE,
  TRANSACTION_STATUS,
  BOOKING_PAYMENT_STATUS,
  PAYMENT_STATUS_TRANSITIONS,
  PAYMENT_DEADLINE_DAYS,
  REVIEW_TYPE,
  REVIEW_STATUS,
  REPORT_REASON,
  MODERATION_ACTION,
};
