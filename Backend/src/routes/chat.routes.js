// ============================================
// CHAT ROUTES
// API routes for chat functionality
// ============================================

import express from 'express';
import chatController from '../controllers/chat/chat.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { uploadMiddleware } from '../middleware/upload.middleware.js';
import { USER_ROLES } from '../constants/index.js';
import {
  messageSendLimiter,
  conversationCreateLimiter,
  chatUploadLimiter,
  moderationActionLimiter,
} from '../middleware/rateLimiter.middleware.js';
import {
  validateCreateConversation,
  validateSendMessage,
  validateGetMessages,
  validateMarkAsRead,
  validateGetConversation,
  validateAddReaction,
  validateReportMessage,
  validateFileUpload,
} from '../validators/chat.validator.js';
import { handleValidationErrors, validateFileMiddleware } from '../middleware/validation.middleware.js';

const router = express.Router();

// All chat routes require authentication
router.use(authenticate);

// ============================================
// CONVERSATION ROUTES
// ============================================

/**
 * @route   POST /api/chat/conversations/start
 * @desc    Start or get conversation for a booking
 * @access  Private (Caregiver, CareSeeker)
 */
router.post(
  '/conversations/start',
  authorize(USER_ROLES.CAREGIVER, USER_ROLES.CARESEEKER),
  conversationCreateLimiter,
  validateCreateConversation,
  handleValidationErrors,
  chatController.startConversation
);

/**
 * @route   POST /api/chat/conversations/direct
 * @desc    Start or get direct conversation with a user (no booking required)
 * @access  Private (Caregiver, CareSeeker)
 */
router.post(
  '/conversations/direct',
  authorize(USER_ROLES.CAREGIVER, USER_ROLES.CARESEEKER),
  conversationCreateLimiter,
  validateCreateConversation,
  handleValidationErrors,
  chatController.startDirectConversation
);

/**
 * @route   GET /api/chat/conversations
 * @desc    Get user's conversations
 * @access  Private
 */
router.get(
  '/conversations',
  authorize(USER_ROLES.CAREGIVER, USER_ROLES.CARESEEKER),
  chatController.getConversations
);

/**
 * @route   GET /api/chat/conversations/booking/:bookingId
 * @desc    Get conversation by booking ID
 * @access  Private (Caregiver, CareSeeker)
 */
router.get(
  '/conversations/booking/:bookingId',
  authorize(USER_ROLES.CAREGIVER, USER_ROLES.CARESEEKER),
  chatController.getConversationByBooking
);

/**
 * @route   GET /api/chat/conversations/:conversationId
 * @desc    Get single conversation
 * @access  Private (Caregiver, CareSeeker)
 */
router.get(
  '/conversations/:conversationId',
  authorize(USER_ROLES.CAREGIVER, USER_ROLES.CARESEEKER),
  chatController.getConversationById
);

// ============================================
// CHAT ACCESS CONTROL ROUTES
// ============================================

/**
 * @route   GET /api/chat/conversations/:conversationId/access-status
 * @desc    Get detailed chat access status for UI (checks payment, booking status)
 * @access  Private (Caregiver, CareSeeker)
 */
router.get(
  '/conversations/:conversationId/access-status',
  authorize(USER_ROLES.CAREGIVER, USER_ROLES.CARESEEKER),
  chatController.getChatAccessStatus
);

/**
 * @route   POST /api/chat/conversations/:conversationId/request-unlock
 * @desc    Request chat unlock (returns payment info needed)
 * @access  Private (CareSeeker)
 */
router.post(
  '/conversations/:conversationId/request-unlock',
  authorize(USER_ROLES.CARESEEKER),
  chatController.requestChatUnlock
);

// ============================================
// MESSAGE ROUTES
// ============================================

/**
 * @route   POST /api/chat/conversations/:conversationId/messages
 * @desc    Send a message
 * @access  Private (Caregiver, CareSeeker)
 */
router.post(
  '/conversations/:conversationId/messages',
  authorize(USER_ROLES.CAREGIVER, USER_ROLES.CARESEEKER),
  messageSendLimiter,
  chatController.sendMessage
);

/**
 * @route   GET /api/chat/conversations/:conversationId/messages
 * @desc    Get messages for a conversation
 * @access  Private (Caregiver, CareSeeker)
 */
router.get(
  '/conversations/:conversationId/messages',
  authorize(USER_ROLES.CAREGIVER, USER_ROLES.CARESEEKER),
  chatController.getMessages
);

/**
 * @route   GET /api/chat/conversations/:conversationId/search
 * @desc    Search messages in a conversation
 * @access  Private (Caregiver, CareSeeker)
 */
router.get(
  '/conversations/:conversationId/search',
  authorize(USER_ROLES.CAREGIVER, USER_ROLES.CARESEEKER),
  chatController.searchMessages
);

/**
 * @route   GET /api/chat/conversations/:conversationId/export
 * @desc    Export conversation in various formats (txt, json)
 * @access  Private (Caregiver, CareSeeker)
 */
router.get(
  '/conversations/:conversationId/export',
  authorize(USER_ROLES.CAREGIVER, USER_ROLES.CARESEEKER),
  chatController.exportConversation
);

/**
 * @route   PATCH /api/chat/conversations/:conversationId/read
 * @desc    Mark messages as read
 * @access  Private (Caregiver, CareSeeker)
 */
router.patch(
  '/conversations/:conversationId/read',
  authorize(USER_ROLES.CAREGIVER, USER_ROLES.CARESEEKER),
  chatController.markAsRead
);

/**
 * @route   DELETE /api/chat/messages/:messageId
 * @desc    Delete a message
 * @access  Private (Caregiver, CareSeeker)
 */
router.delete(
  '/messages/:messageId',
  authorize(USER_ROLES.CAREGIVER, USER_ROLES.CARESEEKER),
  chatController.deleteMessage
);

// ============================================
// BLOCK/REPORT ROUTES
// ============================================

/**
 * @route   POST /api/chat/conversations/:conversationId/block
 * @desc    Block user in conversation
 * @access  Private (Caregiver, CareSeeker)
 */
router.post(
  '/conversations/:conversationId/block',
  authorize(USER_ROLES.CAREGIVER, USER_ROLES.CARESEEKER),
  moderationActionLimiter,
  chatController.blockUser
);

/**
 * @route   DELETE /api/chat/conversations/:conversationId/block
 * @desc    Unblock user in conversation
 * @access  Private (Caregiver, CareSeeker)
 */
router.delete(
  '/conversations/:conversationId/block',
  authorize(USER_ROLES.CAREGIVER, USER_ROLES.CARESEEKER),
  chatController.unblockUser
);

/**
 * @route   POST /api/chat/messages/:messageId/report
 * @desc    Report a message
 * @access  Private (Caregiver, CareSeeker)
 */
router.post(
  '/messages/:messageId/report',
  authorize(USER_ROLES.CAREGIVER, USER_ROLES.CARESEEKER),
  moderationActionLimiter,
  chatController.reportMessage
);

// ============================================
// UTILITY ROUTES
// ============================================

/**
 * @route   GET /api/chat/unread-count
 * @desc    Get unread message count
 * @access  Private
 */
router.get(
  '/unread-count',
  authorize(USER_ROLES.CAREGIVER, USER_ROLES.CARESEEKER),
  chatController.getUnreadCount
);

/**
 * @route   POST /api/chat/upload
 * @desc    Upload attachment for chat
 * @access  Private (Caregiver, CareSeeker)
 */
router.post(
  '/upload',
  authorize(USER_ROLES.CAREGIVER, USER_ROLES.CARESEEKER),
  chatUploadLimiter,
  uploadMiddleware.single('file'),
  chatController.uploadAttachment
);

// ============================================
// REACTION ROUTES
// ============================================

/**
 * @route   POST /api/chat/messages/:messageId/reactions
 * @desc    Add reaction to a message
 * @access  Private (Caregiver, CareSeeker)
 */
router.post(
  '/messages/:messageId/reactions',
  authorize(USER_ROLES.CAREGIVER, USER_ROLES.CARESEEKER),
  chatController.addReaction
);

/**
 * @route   DELETE /api/chat/messages/:messageId/reactions
 * @desc    Remove reaction from a message
 * @access  Private (Caregiver, CareSeeker)
 */
router.delete(
  '/messages/:messageId/reactions',
  authorize(USER_ROLES.CAREGIVER, USER_ROLES.CARESEEKER),
  chatController.removeReaction
);

// ============================================
// PIN MESSAGE ROUTES
// ============================================

/**
 * @route   PATCH /api/chat/messages/:messageId/pin
 * @desc    Toggle pin on a message
 * @access  Private (Caregiver, CareSeeker)
 */
router.patch(
  '/messages/:messageId/pin',
  authorize(USER_ROLES.CAREGIVER, USER_ROLES.CARESEEKER),
  chatController.togglePinMessage
);

/**
 * @route   GET /api/chat/conversations/:conversationId/pinned
 * @desc    Get pinned messages in a conversation
 * @access  Private (Caregiver, CareSeeker)
 */
router.get(
  '/conversations/:conversationId/pinned',
  authorize(USER_ROLES.CAREGIVER, USER_ROLES.CARESEEKER),
  chatController.getPinnedMessages
);

// ============================================
// LABEL & MUTE ROUTES
// ============================================

/**
 * @route   PATCH /api/chat/conversations/:conversationId/label
 * @desc    Set label on a conversation
 * @access  Private (Caregiver, CareSeeker)
 */
router.patch(
  '/conversations/:conversationId/label',
  authorize(USER_ROLES.CAREGIVER, USER_ROLES.CARESEEKER),
  chatController.setConversationLabel
);

/**
 * @route   PATCH /api/chat/conversations/:conversationId/mute
 * @desc    Toggle mute notifications for conversation
 * @access  Private (Caregiver, CareSeeker)
 */
router.patch(
  '/conversations/:conversationId/mute',
  authorize(USER_ROLES.CAREGIVER, USER_ROLES.CARESEEKER),
  chatController.toggleMuteConversation
);

/**
 * @route   PATCH /api/chat/conversations/:conversationId/archive
 * @desc    Archive a conversation
 * @access  Private (Caregiver, CareSeeker)
 */
router.patch(
  '/conversations/:conversationId/archive',
  authorize(USER_ROLES.CAREGIVER, USER_ROLES.CARESEEKER),
  chatController.archiveConversation
);

/**
 * @route   PATCH /api/chat/conversations/:conversationId/unarchive
 * @desc    Unarchive/restore a conversation
 * @access  Private (Caregiver, CareSeeker)
 */
router.patch(
  '/conversations/:conversationId/unarchive',
  authorize(USER_ROLES.CAREGIVER, USER_ROLES.CARESEEKER),
  chatController.unarchiveConversation
);

// ============================================
// ADMIN ROUTES
// ============================================

/**
 * @route   GET /api/chat/admin/conversations
 * @desc    Get all conversations for monitoring (admin)
 * @access  Private (Admin)
 */
router.get(
  '/admin/conversations',
  authorize(USER_ROLES.ADMIN),
  chatController.getAllConversationsForAdmin
);

/**
 * @route   GET /api/chat/admin/conversations/:conversationId
 * @desc    Get conversation for dispute resolution (admin only)
 * @access  Private (Admin)
 */
router.get(
  '/admin/conversations/:conversationId',
  authorize(USER_ROLES.ADMIN),
  chatController.getConversationForAdmin
);

/**
 * @route   GET /api/chat/admin/conversations/:conversationId/messages
 * @desc    Get messages for a conversation (admin viewer)
 * @access  Private (Admin)
 */
router.get(
  '/admin/conversations/:conversationId/messages',
  authorize(USER_ROLES.ADMIN),
  chatController.getAdminConversationMessages
);

/**
 * @route   GET /api/chat/admin/reports
 * @desc    Get all reported messages (admin)
 * @access  Private (Admin)
 */
router.get(
  '/admin/reports',
  authorize(USER_ROLES.ADMIN),
  chatController.getReportedMessages
);

/**
 * @route   PATCH /api/chat/admin/reports/:messageId
 * @desc    Update report status (admin)
 * @access  Private (Admin)
 */
router.patch(
  '/admin/reports/:messageId',
  authorize(USER_ROLES.ADMIN),
  chatController.updateReportStatus
);

/**
 * @route   GET /api/chat/admin/stats
 * @desc    Get chat statistics for admin dashboard
 * @access  Private (Admin)
 */
router.get(
  '/admin/stats',
  authorize(USER_ROLES.ADMIN),
  chatController.getChatStats
);

/**
 * @route   POST /api/chat/admin/conversations/:conversationId/force-unlock
 * @desc    Admin force unlock a restricted/locked chat
 * @access  Private (Admin)
 */
router.post(
  '/admin/conversations/:conversationId/force-unlock',
  authorize(USER_ROLES.ADMIN),
  chatController.adminForceUnlock
);

/**
 * @route   POST /api/chat/admin/conversations/:conversationId/restrict
 * @desc    Admin restrict a chat with reason
 * @access  Private (Admin)
 */
router.post(
  '/admin/conversations/:conversationId/restrict',
  authorize(USER_ROLES.ADMIN),
  chatController.adminRestrictChat
);

export default router;
