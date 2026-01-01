// ============================================
// CHAT ACCESS SERVICE
// Enforces booking-based chat access rules
// ============================================

import Booking from '../models/booking.model.js';
import Conversation from '../models/conversation.model.js';
import {
  CONVERSATION_STATUS,
  CHAT_ACCESS_REASON,
} from '../constants/chat.constants.js';
import logger from '../utils/logger.js';
import { successResponse, failureResponse } from '../shared/serviceResponse.js';

const CHAT_ACTIVE_BOOKING_STATUSES = new Set(['confirmed', 'active', 'in_progress']);
const UNPAID_PAYMENT_STATUSES = new Set(['unpaid', 'payment_pending', 'partially_paid']);

const toIdString = (value) => {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (value._id) return value._id.toString();
  return value.toString();
};

const hasDeadlinePassed = (deadline) => {
  if (!deadline) return false;
  return new Date() > new Date(deadline);
};

const parseClockTime = (clockTime) => {
  if (typeof clockTime !== 'string') return null;
  const [rawHour, rawMinute] = clockTime.split(':');
  const hour = Number(rawHour);
  const minute = Number(rawMinute || 0);

  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return null;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;

  return { hour, minute };
};

const toScheduleDateTime = (dateInput, clockTime) => {
  if (!dateInput) return null;

  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) return null;

  const parsedTime = parseClockTime(clockTime);
  if (parsedTime) {
    date.setHours(parsedTime.hour, parsedTime.minute, 0, 0);
  } else {
    date.setHours(23, 59, 59, 999);
  }

  return date;
};

const hasBookingWindowEnded = (booking) => {
  const schedule = booking?.schedule;
  if (!schedule?.endDate) return false;

  const endDateTime = toScheduleDateTime(schedule.endDate, schedule.endTime);
  if (!endDateTime) return false;

  return Date.now() > endDateTime.getTime();
};

class ChatAccessService {
  // ============================================
  // RESPONSE HELPERS
  // ============================================

  respond(success, message, code, data = {}, legacy = {}) {
    if (success) {
      return successResponse({ message, code, data, legacy });
    }

    return failureResponse({ message, code, data, legacy });
  }

  accessResult(allowed, reason, reasonMessage, booking = null) {
    return this.respond(
      allowed,
      reasonMessage,
      reason,
      { allowed, reason, reasonMessage, booking },
      { allowed, reason, reasonMessage, booking },
    );
  }

  restrictionResult(restrict, reason, reasonMessage, newStatus = null) {
    const code = reason || CHAT_ACCESS_REASON.CHAT_ACTIVE;
    const message = reasonMessage || (restrict ? 'Chat must be restricted' : 'Chat remains active');

    return this.respond(
      !restrict,
      message,
      code,
      { restrict, reason, reasonMessage, newStatus },
      { restrict, reason, reasonMessage, newStatus },
    );
  }

  isParticipant(conversation, userId) {
    const targetId = toIdString(userId);
    return conversation.participants.some((participant) => toIdString(participant) === targetId);
  }

  isMuted(conversation, userId) {
    const targetId = toIdString(userId);
    return (conversation.mutedBy || []).some((mutedUserId) => toIdString(mutedUserId) === targetId);
  }

  isPaymentOverdue(booking) {
    return UNPAID_PAYMENT_STATUSES.has(booking.paymentStatus) && hasDeadlinePassed(booking.paymentDeadline);
  }

  isPaymentComplete(booking) {
    return booking?.paymentStatus === 'fully_paid';
  }

  applyConversationStatusUpdate(
    conversation,
    {
      status,
      reason,
      chatEnabled,
      disabledReason,
      chatUnlockedAt,
      paymentVerifiedAt,
      changedBy,
    },
  ) {
    conversation.status = status;
    conversation.metadata = {
      ...(conversation.metadata || {}),
      chatEnabled,
      disabledReason,
    };

    conversation.accessControl = {
      ...(conversation.accessControl || {}),
      lastStatusChange: new Date(),
      statusReason: reason,
      ...(chatUnlockedAt !== undefined ? { chatUnlockedAt } : {}),
      ...(paymentVerifiedAt !== undefined ? { paymentVerifiedAt } : {}),
      ...(changedBy ? { changedBy } : {}),
    };
  }

  emitStatusChanged(io, conversationId, payload) {
    if (!io) return;
    io.to(conversationId).emit('chat_status_changed', payload);
  }

  // ============================================
  // ACCESS CHECKS
  // ============================================

  async canUnlockChat(bookingId) {
    if (!bookingId) {
      return this.accessResult(false, CHAT_ACCESS_REASON.NO_BOOKING, 'No booking provided');
    }

    const booking = await Booking.findById(bookingId)
      .populate('careSeekerId', 'fullName avatar')
      .populate('caregiverId', 'fullName avatar');

    if (!booking) {
      return this.accessResult(false, CHAT_ACCESS_REASON.NO_BOOKING, 'Booking not found');
    }

    if (booking.status === 'pending') {
      return this.accessResult(
        false,
        CHAT_ACCESS_REASON.BOOKING_PENDING,
        'Waiting for caregiver to accept the booking',
        booking,
      );
    }

    if (booking.status === 'rejected') {
      return this.accessResult(
        false,
        CHAT_ACCESS_REASON.BOOKING_REJECTED,
        'Booking was rejected by the caregiver. Book again to enable the chat.',
        booking,
      );
    }

    if (booking.status === 'cancelled') {
      return this.accessResult(
        false,
        CHAT_ACCESS_REASON.BOOKING_CANCELLED,
        'Booking has been cancelled. Book again to enable the chat.',
        booking,
      );
    }

    if (booking.status === 'completed') {
      return this.accessResult(
        false,
        CHAT_ACCESS_REASON.BOOKING_COMPLETED,
        'Booking has been completed. Book again to enable the chat.',
        booking,
      );
    }

    if (!CHAT_ACTIVE_BOOKING_STATUSES.has(booking.status)) {
      return this.accessResult(
        false,
        CHAT_ACCESS_REASON.BOOKING_NOT_CONFIRMED,
        'Booking is not confirmed yet',
        booking,
      );
    }

    if (booking.paymentStatus === 'expired' || this.isPaymentOverdue(booking)) {
      return this.accessResult(
        false,
        CHAT_ACCESS_REASON.PAYMENT_EXPIRED,
        'Payment deadline has passed. Book again to enable the chat.',
        booking,
      );
    }

    if (!this.isPaymentComplete(booking)) {
      return this.accessResult(
        false,
        CHAT_ACCESS_REASON.PAYMENT_REQUIRED,
        'Chat unlocks after full payment is completed for this booking.',
        booking,
      );
    }

    if (hasBookingWindowEnded(booking)) {
      return this.accessResult(
        false,
        CHAT_ACCESS_REASON.BOOKING_COMPLETED,
        'This booking session has ended. Book again to enable the chat.',
        booking,
      );
    }

    return this.accessResult(true, CHAT_ACCESS_REASON.CHAT_ACTIVE, 'Chat is active', booking);
  }

  async shouldRestrictChat(bookingId) {
    if (!bookingId) {
      return this.restrictionResult(
        true,
        CHAT_ACCESS_REASON.NO_BOOKING,
        'Booking is required to continue chat',
        CONVERSATION_STATUS.CLOSED,
      );
    }

    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return this.restrictionResult(
        true,
        CHAT_ACCESS_REASON.NO_BOOKING,
        'Booking not found',
        CONVERSATION_STATUS.CLOSED,
      );
    }

    if (booking.status === 'completed') {
      return this.restrictionResult(
        true,
        CHAT_ACCESS_REASON.BOOKING_COMPLETED,
        'Booking completed. Book again to enable the chat.',
        CONVERSATION_STATUS.CLOSED,
      );
    }

    if (booking.status === 'cancelled') {
      return this.restrictionResult(
        true,
        CHAT_ACCESS_REASON.BOOKING_CANCELLED,
        'Booking cancelled. Book again to enable the chat.',
        CONVERSATION_STATUS.CLOSED,
      );
    }

    if (booking.status === 'rejected') {
      return this.restrictionResult(
        true,
        CHAT_ACCESS_REASON.BOOKING_REJECTED,
        'Booking was rejected. Book again to enable the chat.',
        CONVERSATION_STATUS.CLOSED,
      );
    }

    if (!CHAT_ACTIVE_BOOKING_STATUSES.has(booking.status)) {
      return this.restrictionResult(
        true,
        CHAT_ACCESS_REASON.BOOKING_NOT_CONFIRMED,
        'Booking is not currently active for chat access.',
        CONVERSATION_STATUS.LOCKED,
      );
    }

    if (booking.paymentStatus === 'expired' || this.isPaymentOverdue(booking)) {
      return this.restrictionResult(
        true,
        CHAT_ACCESS_REASON.PAYMENT_EXPIRED,
        'Payment deadline has passed. Book again to enable the chat.',
        CONVERSATION_STATUS.CLOSED,
      );
    }

    if (!this.isPaymentComplete(booking)) {
      return this.restrictionResult(
        true,
        CHAT_ACCESS_REASON.PAYMENT_REQUIRED,
        'Chat is locked until this booking is fully paid.',
        CONVERSATION_STATUS.LOCKED,
      );
    }

    if (hasBookingWindowEnded(booking)) {
      return this.restrictionResult(
        true,
        CHAT_ACCESS_REASON.BOOKING_COMPLETED,
        'This booking session has ended. Book again to enable the chat.',
        CONVERSATION_STATUS.CLOSED,
      );
    }

    return this.restrictionResult(false, null, null, null);
  }

  // ============================================
  // ACCESS STATUS FOR UI
  // ============================================

  resolveReasonForStatus(conversation) {
    const statusReason = conversation.accessControl?.statusReason;
    const disabledReason = conversation.metadata?.disabledReason;

    if (conversation.status === CONVERSATION_STATUS.LOCKED) {
      return {
        reason: disabledReason || 'Chat unlocks after full payment is completed.',
        reasonCode: statusReason || CHAT_ACCESS_REASON.PAYMENT_REQUIRED,
      };
    }

    if (conversation.status === CONVERSATION_STATUS.ACTIVE) {
      return {
        reason: 'Chat is active',
        reasonCode: CHAT_ACCESS_REASON.CHAT_ACTIVE,
      };
    }

    if (conversation.status === CONVERSATION_STATUS.RESTRICTED) {
      return {
        reason: disabledReason || 'Chat is temporarily restricted.',
        reasonCode: statusReason || CHAT_ACCESS_REASON.ADMIN_RESTRICTED,
      };
    }

    if (conversation.status === CONVERSATION_STATUS.CLOSED) {
      if (
        statusReason === CHAT_ACCESS_REASON.BOOKING_COMPLETED ||
        statusReason === CHAT_ACCESS_REASON.BOOKING_CANCELLED ||
        statusReason === CHAT_ACCESS_REASON.BOOKING_REJECTED ||
        statusReason === CHAT_ACCESS_REASON.PAYMENT_EXPIRED
      ) {
        return {
          reason: 'Book again to enable the chat.',
          reasonCode: statusReason,
        };
      }

      return {
        reason: disabledReason || 'This chat has been closed.',
        reasonCode: statusReason || CHAT_ACCESS_REASON.BOOKING_COMPLETED,
      };
    }

    if (conversation.status === CONVERSATION_STATUS.ARCHIVED) {
      return {
        reason: 'This conversation is archived.',
        reasonCode: statusReason || CONVERSATION_STATUS.ARCHIVED,
      };
    }

    return {
      reason: 'Unknown status',
      reasonCode: statusReason || conversation.status,
    };
  }

  buildBookingInfo(booking) {
    if (!booking) return null;

    return {
      bookingId: booking._id,
      bookingNumber: booking.bookingNumber,
      bookingStatus: booking.status,
      paymentStatus: booking.paymentStatus,
      totalAmount: booking.totalAmount,
      amountPaid: booking.amountPaid,
      amountDue: booking.amountDue,
      paymentDeadline: booking.paymentDeadline,
      isPaymentExpired: booking.isPaymentExpired?.() || false,
    };
  }

  async getChatAccessStatus(conversationId, userId) {
    const conversation = await Conversation.findById(conversationId)
      .populate('bookingId')
      .populate('participants', 'fullName avatar role');

    if (!conversation) {
      return this.respond(
        false,
        'Conversation not found',
        'NOT_FOUND',
        { exists: false, canSendMessages: false, status: null },
        {
          exists: false,
          canSendMessages: false,
          status: null,
          reason: 'Conversation not found',
          reasonCode: 'NOT_FOUND',
        },
      );
    }

    if (!this.isParticipant(conversation, userId)) {
      return this.respond(
        false,
        'You are not a participant in this conversation',
        'NOT_AUTHORIZED',
        { exists: true, canSendMessages: false, status: conversation.status },
        {
          exists: true,
          canSendMessages: false,
          status: conversation.status,
          reason: 'You are not a participant in this conversation',
          reasonCode: 'NOT_AUTHORIZED',
        },
      );
    }

    if (conversation.isBlockedBy(userId)) {
      return this.respond(
        false,
        'You have been blocked from this conversation',
        CHAT_ACCESS_REASON.USER_BLOCKED,
        { exists: true, canSendMessages: false, status: conversation.status },
        {
          exists: true,
          canSendMessages: false,
          status: conversation.status,
          reason: 'You have been blocked from this conversation',
          reasonCode: CHAT_ACCESS_REASON.USER_BLOCKED,
        },
      );
    }

    // Keep booking chats in sync with schedule/payment rules so the frontend
    // sees read-only status as soon as the booking window expires.
    if (
      conversation.type === 'booking_chat' &&
      conversation.bookingId &&
      conversation.status === CONVERSATION_STATUS.ACTIVE
    ) {
      const bookingId = conversation.bookingId._id || conversation.bookingId;
      const restrictCheck = await this.shouldRestrictChat(bookingId);

      if (restrictCheck.restrict) {
        this.applyConversationStatusUpdate(conversation, {
          status: restrictCheck.newStatus,
          reason: restrictCheck.reason,
          chatEnabled: false,
          disabledReason: restrictCheck.reasonMessage,
        });
        await conversation.save();
      }
    }

    const canSendMessages = conversation.status === CONVERSATION_STATUS.ACTIVE;
    const bookingInfo = this.buildBookingInfo(conversation.bookingId);
    const { reason, reasonCode } = this.resolveReasonForStatus(conversation);

    const payload = {
      exists: true,
      conversationId: conversation._id,
      status: conversation.status,
      canSendMessages,
      reason,
      reasonCode,
      booking: bookingInfo,
      participants: conversation.participants,
      accessControl: conversation.accessControl,
      chatUnlockedAt: conversation.accessControl?.chatUnlockedAt,
      isMuted: this.isMuted(conversation, userId),
    };

    return this.respond(true, reason, reasonCode, payload, payload);
  }

  // ============================================
  // CONVERSATION MUTATIONS
  // ============================================

  async unlockChatOnBookingEligible(bookingId, io = null) {
    const conversation = await Conversation.findOne({ bookingId });

    if (!conversation) {
      logger.chat.accessDenied(null, 'No conversation found', { bookingId });
      return null;
    }

    if (conversation.status !== CONVERSATION_STATUS.LOCKED) {
      logger.debug('Conversation is not locked', { conversationId: conversation._id, status: conversation.status });
      return conversation;
    }

    this.applyConversationStatusUpdate(conversation, {
      status: CONVERSATION_STATUS.ACTIVE,
      reason: CHAT_ACCESS_REASON.CHAT_ACTIVE,
      chatEnabled: true,
      disabledReason: null,
      chatUnlockedAt: new Date(),
      paymentVerifiedAt: null,
    });

    await conversation.save();

    logger.chat.unlocked(conversation._id.toString(), { bookingId });

    this.emitStatusChanged(io, conversation._id.toString(), {
      conversationId: conversation._id,
      newStatus: CONVERSATION_STATUS.ACTIVE,
      reason: CHAT_ACCESS_REASON.CHAT_ACTIVE,
      message: 'Payment confirmed. Chat is now unlocked.',
    });

    return conversation;
  }

  async unlockChatOnPayment(bookingId, io = null) {
    return this.unlockChatOnBookingEligible(bookingId, io);
  }

  async updateChatStatus(bookingId, reason, newStatus, io = null) {
    const conversation = await Conversation.findOne({ bookingId });
    if (!conversation) return null;

    const oldStatus = conversation.status;

    this.applyConversationStatusUpdate(conversation, {
      status: newStatus,
      reason,
      chatEnabled: newStatus === CONVERSATION_STATUS.ACTIVE,
      disabledReason: reason,
    });

    await conversation.save();

    logger.chat.statusChanged(conversation._id.toString(), oldStatus, newStatus, { bookingId, reason });

    this.emitStatusChanged(io, conversation._id.toString(), {
      conversationId: conversation._id,
      oldStatus,
      newStatus,
      reason,
    });

    return conversation;
  }

  // ============================================
  // MESSAGE AND CALL GUARDS
  // ============================================

  canSendMessage(conversation, userId) {
    if (!this.isParticipant(conversation, userId)) {
      return this.respond(
        false,
        'You are not a participant in this conversation',
        'NOT_PARTICIPANT',
        { canSend: false },
        { canSend: false, error: 'You are not a participant in this conversation' },
      );
    }

    if (conversation.status === CONVERSATION_STATUS.LOCKED) {
      return this.respond(
        false,
        'Chat is locked until this booking is fully paid.',
        'CHAT_LOCKED',
        { canSend: false },
        {
          canSend: false,
          error: 'Chat is locked until this booking is fully paid.',
          errorCode: 'CHAT_LOCKED',
        },
      );
    }

    if (conversation.status === CONVERSATION_STATUS.RESTRICTED) {
      const message = `Chat is restricted: ${conversation.metadata?.disabledReason || 'Please contact support.'}`;
      return this.respond(
        false,
        message,
        'CHAT_RESTRICTED',
        { canSend: false },
        { canSend: false, error: message, errorCode: 'CHAT_RESTRICTED' },
      );
    }

    if (conversation.status === CONVERSATION_STATUS.CLOSED) {
      return this.respond(
        false,
        'This chat has been closed and is read-only.',
        'CHAT_CLOSED',
        { canSend: false },
        {
          canSend: false,
          error: 'This chat has been closed and is read-only.',
          errorCode: 'CHAT_CLOSED',
        },
      );
    }

    if (conversation.isBlockedBy(userId)) {
      return this.respond(
        false,
        'You have been blocked from this conversation',
        'USER_BLOCKED',
        { canSend: false },
        { canSend: false, error: 'You have been blocked from this conversation', errorCode: 'USER_BLOCKED' },
      );
    }

    if (!conversation.metadata?.chatEnabled) {
      const message = conversation.metadata?.disabledReason || 'Chat is currently disabled';
      return this.respond(
        false,
        message,
        'CHAT_DISABLED',
        { canSend: false },
        { canSend: false, error: message, errorCode: 'CHAT_DISABLED' },
      );
    }

    return this.respond(true, 'Message can be sent', 'CHAT_ACTIVE', { canSend: true }, { canSend: true });
  }

  async canMakeCall(conversationId, userId) {
    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
      return this.respond(
        false,
        'Conversation not found',
        'NOT_FOUND',
        { canCall: false },
        { canCall: false, error: 'Conversation not found' },
      );
    }

    if (!this.isParticipant(conversation, userId)) {
      return this.respond(
        false,
        'You are not a participant in this conversation',
        'NOT_PARTICIPANT',
        { canCall: false },
        { canCall: false, error: 'You are not a participant in this conversation' },
      );
    }

    if (conversation.type === 'booking_chat' && conversation.bookingId) {
      const restrictCheck = await this.shouldRestrictChat(conversation.bookingId);

      if (restrictCheck.restrict) {
        if (
          conversation.status !== restrictCheck.newStatus ||
          conversation.metadata?.chatEnabled !== false ||
          conversation.metadata?.disabledReason !== restrictCheck.reasonMessage
        ) {
          this.applyConversationStatusUpdate(conversation, {
            status: restrictCheck.newStatus,
            reason: restrictCheck.reason,
            chatEnabled: false,
            disabledReason: restrictCheck.reasonMessage,
          });
          await conversation.save();
        }

        const reasonMessage =
          restrictCheck.reasonMessage || 'Calls are unavailable for this booking.';

        return this.respond(
          false,
          reasonMessage,
          'CALL_NOT_ALLOWED',
          {
            canCall: false,
            status: conversation.status,
            reason: restrictCheck.reason,
            reasonMessage,
          },
          {
            canCall: false,
            error: reasonMessage,
            status: conversation.status,
            reason: restrictCheck.reason,
            reasonMessage,
          },
        );
      }
    }

    if (conversation.status !== CONVERSATION_STATUS.ACTIVE) {
      return this.respond(
        false,
        'Calls are only available when chat is active',
        'CALL_NOT_ALLOWED',
        { canCall: false, status: conversation.status },
        { canCall: false, error: 'Calls are only available when chat is active', status: conversation.status },
      );
    }

    return this.respond(
      true,
      'Call is allowed',
      'CHAT_ACTIVE',
      { canCall: true, conversation },
      { canCall: true, conversation },
    );
  }

  // ============================================
  // ADMIN CONTROLS
  // ============================================

  async adminForceUnlock(conversationId, adminId, reason = 'Admin override') {
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) throw new Error('Conversation not found');

    this.applyConversationStatusUpdate(conversation, {
      status: CONVERSATION_STATUS.ACTIVE,
      reason: `Admin force unlock: ${reason}`,
      chatEnabled: true,
      disabledReason: null,
      chatUnlockedAt: new Date(),
      changedBy: adminId,
    });

    await conversation.save();
    return conversation;
  }

  async adminRestrictChat(conversationId, adminId, reason = 'Admin restriction') {
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) throw new Error('Conversation not found');

    this.applyConversationStatusUpdate(conversation, {
      status: CONVERSATION_STATUS.RESTRICTED,
      reason: CHAT_ACCESS_REASON.ADMIN_RESTRICTED,
      chatEnabled: false,
      disabledReason: reason,
      changedBy: adminId,
    });

    await conversation.save();
    return conversation;
  }
}

const chatAccessService = new ChatAccessService();

export default chatAccessService;
