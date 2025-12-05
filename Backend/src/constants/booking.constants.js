// ============================================
// BOOKING CONSTANTS
// All booking-related constants and enums
// ============================================

export const BOOKING_STATUS = {
  RESERVED: "reserved", // Temporary hold during checkout
  PENDING: "pending", // Submitted, awaiting caregiver response
  ACCEPTED: "accepted", // Caregiver accepted; agreement not yet signed by both
  AGREEMENT_PENDING: "agreement_pending", // Agreement generated; both parties must accept
  PAYMENT_PENDING: "payment_pending", // Agreement accepted; awaiting payment
  CONFIRMED: "confirmed", // Payment received; booking locked in
  ACTIVE: "active", // Care period has started (replaces in_progress)
  IN_PROGRESS: "in_progress", // Legacy alias — kept for backward compatibility
  COMPLETED: "completed",
  CANCELLED: "cancelled",
  DISPUTED: "disputed",
  REJECTED: "rejected",
  EXPIRED: "expired", // Reservation expired without payment
};

// Agreement acceptance lifecycle (business-level state)
export const AGREEMENT_LIFECYCLE_STATUS = {
  PENDING: "PENDING",
  ACCEPTED_BY_SEEKER: "ACCEPTED_BY_SEEKER",
  ACCEPTED_BY_CAREGIVER: "ACCEPTED_BY_CAREGIVER",
  FULLY_ACCEPTED: "FULLY_ACCEPTED",
};

// API-level business statuses for transparent agreement/payment flow.
export const FLOW_API_STATUS = {
  AGREEMENT_GENERATED: "AGREEMENT_GENERATED",
  AGREEMENT_PENDING: "AGREEMENT_PENDING",
  AGREEMENT_ACCEPTED_PARTIAL: "AGREEMENT_ACCEPTED_PARTIAL",
  AGREEMENT_FULLY_ACCEPTED: "AGREEMENT_FULLY_ACCEPTED",
  BOOKING_CONFIRMED: "BOOKING_CONFIRMED",
  PAYMENT_ENABLED: "PAYMENT_ENABLED",
};

// Reservation system configuration
export const RESERVATION_CONFIG = {
  HOLD_DURATION_MINUTES: 10, // How long to hold a slot
  GRACE_PERIOD_MINUTES: 2, // Extra time before final expiry
  MAX_CONCURRENT_RESERVATIONS: 3, // Per user limit
  EXTENSION_MINUTES: 5, // Time added when extending reservation
  MAX_EXTENSIONS: 2, // Maximum times user can extend
};

// Valid state transitions for booking lifecycle
export const STATE_TRANSITIONS = {
  reserved: ["pending", "expired", "cancelled"],
  pending: ["accepted", "rejected", "cancelled"], // caregiver accepts → accepted
  accepted: ["agreement_pending", "cancelled"], // auto-moves after caregiver accepts
  agreement_pending: ["payment_pending", "cancelled"], // both accept agreement → payment_pending
  payment_pending: ["confirmed", "cancelled"], // payment done → confirmed
  confirmed: ["active", "in_progress", "cancelled"], // care starts → active
  active: ["completed", "disputed", "cancelled"], // in_progress replacement
  in_progress: ["active", "completed", "disputed"], // backward compat
  completed: ["disputed"],
  cancelled: [],
  rejected: [],
  expired: [],
  disputed: ["completed", "cancelled"],
};

// Booking statuses that block a time slot
export const SLOT_BLOCKING_STATUSES = [
  "reserved",
  "pending",
  "accepted",
  "agreement_pending",
  "payment_pending",
  "confirmed",
  "active",
  "in_progress",
];

export const CAREGIVER_RESPONSE_STATUS = {
  PENDING: "pending",
  ACCEPTED: "accepted",
  REJECTED: "rejected",
};

export const BOOKING_TYPE = {
  ONE_TIME: "one_time",
  RECURRING: "recurring",
};

export const DURATION_TYPE = {
  HOURLY: "hourly",
  HALF_DAY: "half_day",
  FULL_DAY: "full_day",
  WEEKLY: "weekly",
  MONTHLY: "monthly",
  LONG_TERM: "long_term",
};

export const SERVICE_TYPE = {
  ELDERLY_CARE: "elderly_care",
  CHILD_CARE: "child_care",
  SPECIAL_NEEDS: "special_needs",
  DISABILITY_CARE: "disability_care",
  POST_SURGERY: "post_surgery",
  COMPANIONSHIP: "companionship",
  RESPITE_CARE: "respite_care",
  PALLIATIVE_CARE: "palliative_care",
  ALZHEIMERS_CARE: "alzheimers_care",
  DEMENTIA_CARE: "dementia_care",
  PHYSICAL_THERAPY: "physical_therapy",
  MENTAL_HEALTH: "mental_health",
  LIVE_IN_CARE: "live_in_care",
  OVERNIGHT_CARE: "overnight_care",
};

// Human-readable labels for each service type
export const SERVICE_TYPE_LABELS = {
  elderly_care: "Elderly Care",
  child_care: "Child Care",
  special_needs: "Special Needs Care",
  disability_care: "Disability Support",
  post_surgery: "Post-Surgery Care",
  companionship: "Companionship",
  respite_care: "Respite Care",
  palliative_care: "Palliative Care",
  alzheimers_care: "Alzheimer's Care",
  dementia_care: "Dementia Care",
  physical_therapy: "Physical Therapy Support",
  mental_health: "Mental Health Support",
  live_in_care: "Live-In Care",
  overnight_care: "Overnight Care",
};

export const PAYMENT_STATUS = {
  PENDING: "pending",
  HELD: "held",
  RELEASED: "released",
  REFUNDED: "refunded",
  FAILED: "failed",
};

export const PAYMENT_METHOD = {
  KHALTI: "khalti",
  ESEWA: "esewa",
  BANK_TRANSFER: "bank_transfer",
  CASH: "cash",
  CARD: "card",
};

export const CANCELLATION_POLICY = {
  // Hours before start time and refund percentage
  FREE_CANCELLATION_HOURS: 24,
  PARTIAL_REFUND_HOURS: 12,
  PARTIAL_REFUND_PERCENTAGE: 50,
  NO_REFUND_HOURS: 6,
};

export const MODIFICATION_TYPE = {
  RESCHEDULE: "reschedule",
  EXTEND: "extend",
  REDUCE: "reduce",
  CANCEL: "cancel",
};

export const DISPUTE_STATUS = {
  OPEN: "open",
  UNDER_REVIEW: "under_review",
  RESOLVED: "resolved",
  ESCALATED: "escalated",
  CLOSED: "closed",
};

export const REMINDER_TYPE = {
  BOOKING_CONFIRMATION: "booking_confirmation",
  UPCOMING_SERVICE: "upcoming_service",
  CHECK_IN_REMINDER: "check_in_reminder",
  CHECK_OUT_REMINDER: "check_out_reminder",
  PAYMENT_REMINDER: "payment_reminder",
  REVIEW_REMINDER: "review_reminder",
};

export const CARE_REPORT_MOOD = {
  EXCELLENT: "excellent",
  GOOD: "good",
  NEUTRAL: "neutral",
  LOW: "low",
  POOR: "poor",
};

export const INCIDENT_SEVERITY = {
  MINOR: "minor",
  MODERATE: "moderate",
  SEVERE: "severe",
};

export const NOTIFICATION_TYPE = {
  // Booking Workflow
  BOOKING_REQUEST: "booking_request",
  BOOKING_ACCEPTED: "booking_accepted",
  BOOKING_CAREGIVER_ACCEPTED: "booking_caregiver_accepted",
  BOOKING_CAREGIVER_REJECTED: "booking_caregiver_rejected",
  BOOKING_CONFIRMED: "booking_confirmed",
  BOOKING_REJECTED: "booking_rejected",
  BOOKING_CANCELLED: "booking_cancelled",
  BOOKING_MODIFIED: "booking_modified",
  BOOKING_REMINDER: "booking_reminder",
  BOOKING_STARTED: "booking_started",
  BOOKING_COMPLETED: "booking_completed",

  // Check-in/out
  CHECK_IN: "check_in",
  CHECK_OUT: "check_out",
  CHECK_IN_REMINDER: "check_in_reminder",
  CHECK_OUT_REMINDER: "check_out_reminder",

  // Care reports
  CARE_REPORT_SUBMITTED: "care_report_submitted",
  CARE_REPORT_UPDATED: "care_report_updated",
  INCIDENT_REPORTED: "incident_reported",

  // Payment
  PAYMENT_RECEIVED: "payment_received",
  PAYMENT_RELEASED: "payment_released",
  PAYMENT_PENDING: "payment_pending",
  PAYMENT_FAILED: "payment_failed",
  REFUND_PROCESSED: "refund_processed",
  PAYOUT_SENT: "payout_sent",

  // Chat
  NEW_MESSAGE: "new_message",
  MESSAGE_READ: "message_read",

  // Document
  DOCUMENT_UPLOADED: "document_uploaded",
  DOCUMENT_VERIFIED: "document_verified",
  DOCUMENT_REJECTED: "document_rejected",
  DOCUMENT_EXPIRING: "document_expiring",

  // Profile
  PROFILE_VIEWED: "profile_viewed",
  PROFILE_APPROVED: "profile_approved",
  PROFILE_UPDATE_REQUIRED: "profile_update_required",

  // Review
  REVIEW_RECEIVED: "review_received",
  REVIEW_RESPONSE: "review_response",
  REVIEW_REMINDER: "review_reminder",

  // System
  ACCOUNT_SUSPENDED: "account_suspended",
  ACCOUNT_ACTIVATED: "account_activated",
  PASSWORD_CHANGED: "password_changed",
  NEW_MATCH: "new_match",
  PROMOTION: "promotion",
  SYSTEM_UPDATE: "system_update",
  WELCOME: "welcome",

  // Safety
  EMERGENCY_ALERT: "emergency_alert",
  SAFETY_CHECK: "safety_check",

  // Reservation
  RESERVATION_CREATED: "reservation_created",
  RESERVATION_EXPIRING: "reservation_expiring",
  RESERVATION_EXPIRED: "reservation_expired",
  RESERVATION_EXTENDED: "reservation_extended",

  // Notice board
  NEW_NOTICE: "new_notice",

  // Task center / deadlines
  PAYMENT_DUE: "payment_due",
  DEADLINE_REMINDER: "deadline_reminder",
  TASK_ASSIGNED: "task_assigned",

  // Agreement workflow
  BOOKING_AGREEMENT_GENERATED: "booking_agreement_generated",
  BOOKING_AGREEMENT_ACCEPTED: "booking_agreement_accepted",
  BOOKING_PAYMENT_PENDING: "booking_payment_pending",
  AGREEMENT_ACCEPTANCE_REQUIRED: "agreement_acceptance_required",
};

export const PLATFORM_FEE_PERCENTAGE = 10; // 10% platform fee

export default {
  BOOKING_STATUS,
  BOOKING_TYPE,
  DURATION_TYPE,
  SERVICE_TYPE,
  PAYMENT_STATUS,
  PAYMENT_METHOD,
  CANCELLATION_POLICY,
  MODIFICATION_TYPE,
  DISPUTE_STATUS,
  REMINDER_TYPE,
  CARE_REPORT_MOOD,
  INCIDENT_SEVERITY,
  NOTIFICATION_TYPE,
  PLATFORM_FEE_PERCENTAGE,
  RESERVATION_CONFIG,
  STATE_TRANSITIONS,
  SLOT_BLOCKING_STATUSES,
  CAREGIVER_RESPONSE_STATUS,
  AGREEMENT_LIFECYCLE_STATUS,
  FLOW_API_STATUS,
};
