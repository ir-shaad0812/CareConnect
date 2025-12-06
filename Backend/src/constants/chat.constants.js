// ============================================
// CHAT CONSTANTS
// Constants for chat and messaging system
// ============================================

// Message Types
export const MESSAGE_TYPE = {
  TEXT: 'text',
  IMAGE: 'image',
  FILE: 'file',
  VOICE: 'voice',
  SYSTEM: 'system',
};

// Message Status
export const MESSAGE_STATUS = {
  SENT: 'sent',
  DELIVERED: 'delivered',
  READ: 'read',
  FAILED: 'failed', // For failed message delivery
};

// Conversation Status (strict access control based on booking/payment)
export const CONVERSATION_STATUS = {
  LOCKED: 'locked',       // Before full payment - no messages allowed
  ACTIVE: 'active',       // Chat enabled after payment is verified
  RESTRICTED: 'restricted', // Temporary restriction (payment deadline missed, etc.)
  ARCHIVED: 'archived',   // User archived conversation
  CLOSED: 'closed',       // Booking completed/cancelled - read-only mode
};

// Chat Access Reasons (explains why chat is in current state)
export const CHAT_ACCESS_REASON = {
  NO_BOOKING: 'no_active_booking',
  BOOKING_PENDING: 'booking_pending_acceptance',
  BOOKING_NOT_CONFIRMED: 'booking_not_confirmed',
  PAYMENT_REQUIRED: 'payment_required',
  PAYMENT_PENDING: 'payment_pending',
  PAYMENT_EXPIRED: 'payment_deadline_expired',
  BOOKING_COMPLETED: 'booking_completed',
  BOOKING_CANCELLED: 'booking_cancelled',
  BOOKING_REJECTED: 'booking_rejected',
  USER_BLOCKED: 'user_blocked',
  ADMIN_RESTRICTED: 'admin_restricted',
  CHAT_ACTIVE: 'chat_active',
};

// System Message Types
export const SYSTEM_MESSAGE_TYPE = {
  BOOKING_APPROVED: 'booking_approved',
  BOOKING_CANCELLED: 'booking_cancelled',
  BOOKING_COMPLETED: 'booking_completed',
  SERVICE_REMINDER: 'service_reminder',
  CHAT_STARTED: 'chat_started',
  // New system message types for chat access control
  CHAT_UNLOCKED: 'chat_unlocked',
  CHAT_RESTRICTED: 'chat_restricted',
  CHAT_CLOSED: 'chat_closed',
  PAYMENT_RECEIVED: 'payment_received',
  DEADLINE_WARNING: 'deadline_warning',
  BOOKING_CONFIRMED: 'booking_confirmed',
};

// Notification Types for Chat
export const NOTIFICATION_TYPE = {
  NEW_MESSAGE: 'new_message',
  MESSAGE_READ: 'message_read',
  CHAT_BLOCKED: 'chat_blocked',
  CHAT_UNBLOCKED: 'chat_unblocked',
};

// Report Status
export const REPORT_STATUS = {
  PENDING: 'pending',
  REVIEWED: 'reviewed',
  DISMISSED: 'dismissed',
  ACTION_TAKEN: 'action_taken',
};

// Attachment Types
export const ATTACHMENT_TYPE = {
  IMAGE: 'image',
  DOCUMENT: 'document',
  AUDIO: 'audio',
};

// File size limits
export const FILE_LIMITS = {
  MAX_IMAGE_SIZE: 5 * 1024 * 1024, // 5MB
  MAX_DOCUMENT_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_AUDIO_SIZE: 5 * 1024 * 1024, // 5MB
};

// Allowed file types
export const ALLOWED_FILE_TYPES = {
  IMAGES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  DOCUMENTS: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
  AUDIO: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm'],
};

// Chat error messages
export const CHAT_ERRORS = {
  CONVERSATION_NOT_FOUND: 'Conversation not found',
  MESSAGE_NOT_FOUND: 'Message not found',
  NOT_AUTHORIZED: 'You are not authorized to access this chat',
  CHAT_DISABLED: 'This chat is currently disabled',
  USER_BLOCKED: 'You have been blocked from this conversation',
  BOOKING_NOT_APPROVED: 'Chat is only available for approved bookings',
  FILE_TOO_LARGE: 'File size exceeds the allowed limit',
  FILE_TYPE_NOT_ALLOWED: 'This file type is not allowed',
  CANNOT_REPORT_OWN_MESSAGE: 'You cannot report your own message',
  ALREADY_BLOCKED: 'User is already blocked',
};

// Chat success messages
export const CHAT_SUCCESS = {
  MESSAGE_SENT: 'Message sent successfully',
  MESSAGE_DELETED: 'Message deleted successfully',
  USER_BLOCKED: 'User blocked successfully',
  USER_UNBLOCKED: 'User unblocked successfully',
  MESSAGE_REPORTED: 'Message reported successfully',
  MESSAGES_MARKED_READ: 'Messages marked as read',
};

// Socket events
export const SOCKET_EVENTS = {
  // Connection events
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  ERROR: 'error',

  // Chat events
  JOIN_CONVERSATION: 'join_conversation',
  LEAVE_CONVERSATION: 'leave_conversation',
  SEND_MESSAGE: 'send_message',
  NEW_MESSAGE: 'new_message',
  MESSAGE_DELIVERED: 'message_delivered',
  MESSAGE_READ: 'message_read',
  MESSAGES_READ: 'messages_read',

  // Typing events
  TYPING_START: 'typing_start',
  TYPING_STOP: 'typing_stop',
  USER_TYPING: 'user_typing',

  // Online status
  USER_ONLINE: 'user_online',
  USER_OFFLINE: 'user_offline',
  GET_ONLINE_USERS: 'get_online_users',
  ONLINE_USERS_STATUS: 'online_users_status',

  // Chat access control events
  CHAT_STATUS_CHANGED: 'chat_status_changed',
  CHAT_UNLOCKED: 'chat_unlocked',
  CHAT_LOCKED: 'chat_locked',
  CHAT_RESTRICTED: 'chat_restricted',
  CHAT_CLOSED: 'chat_closed',
  SUBSCRIBE_CHAT_STATUS: 'subscribe_chat_status',

  // Message failure/retry events
  MESSAGE_FAILED: 'message_failed',
  MESSAGE_RETRY: 'message_retry',

  // Reaction events
  ADD_REACTION: 'add_reaction',
  REMOVE_REACTION: 'remove_reaction',
  REACTION_UPDATED: 'reaction_updated',

  // Pin events
  TOGGLE_PIN: 'toggle_pin',
  MESSAGE_PINNED: 'message_pinned',

  // Call events (for Stream.io integration)
  CALL_INITIATE: 'call_initiate',
  CALL_INCOMING: 'call_incoming',
  CALL_ACCEPT: 'call_accept',
  CALL_DECLINE: 'call_decline',
  CALL_END: 'call_end',
  CALL_BUSY: 'call_busy',
  CALL_CANCELLED: 'call_cancelled',

  // Error events
  CHAT_ERROR: 'chat_error',
};

// Pagination defaults
export const CHAT_PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_MESSAGES_LIMIT: 50,
  DEFAULT_CONVERSATIONS_LIMIT: 20,
  MAX_MESSAGES_LIMIT: 100,
  MAX_CONVERSATIONS_LIMIT: 50,
};
