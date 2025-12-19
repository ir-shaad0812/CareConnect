// ============================================
// CHAT CONTROLLER
// HTTP API endpoints for chat functionality
// ============================================

import chatService from '../../services/chat.service.js';
import chatAccessService from '../../services/chatAccess.service.js';
import { ApiError, ApiResponse, asyncHandler } from '../../utils/apiResponse.js';
import { CHAT_PAGINATION, CHAT_SUCCESS, CHAT_ERRORS } from '../../constants/chat.constants.js';

/**
 * Start or get conversation for a booking
 * POST /api/chat/conversations/start
 * Returns conversation with access status for strict payment verification
 */
export const startConversation = asyncHandler(async (req, res) => {
  const { bookingId } = req.body;
  const userId = req.user._id;

  if (!bookingId) {
    throw ApiError.badRequest('Booking ID is required');
  }

  const result = await chatService.startConversation(bookingId, userId);

  res.status(201).json(ApiResponse.created(
    {
      conversation: result.conversation,
      accessStatus: result.accessStatus,
    },
    result.accessStatus.canSendMessages
      ? 'Chat is active - you can send messages'
      : result.accessStatus.reasonMessage || 'Conversation created - payment completion required to unlock chat'
  ));
});

/**
 * Start or get direct conversation with a user (no booking required)
 * POST /api/chat/conversations/direct
 */
export const startDirectConversation = asyncHandler(async (req, res) => {
  const { userId: otherUserId } = req.body;
  const userId = req.user._id;

  if (!otherUserId) {
    throw ApiError.badRequest('User ID is required');
  }

  if (otherUserId === userId.toString()) {
    throw ApiError.badRequest('Cannot start conversation with yourself');
  }

  const conversation = await chatService.startDirectConversation(userId, otherUserId);

  res.status(201).json(ApiResponse.created({ conversation }, 'Conversation started successfully'));
});

/**
 * Get user's conversations
 * GET /api/chat/conversations
 * Query params: page, limit, status (active|archived|all)
 */
export const getConversations = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const page = parseInt(req.query.page) || CHAT_PAGINATION.DEFAULT_PAGE;
  const limit = Math.min(
    parseInt(req.query.limit) || CHAT_PAGINATION.DEFAULT_CONVERSATIONS_LIMIT,
    CHAT_PAGINATION.MAX_CONVERSATIONS_LIMIT
  );
  const status = req.query.status || 'active'; // active, archived, or all

  const result = await chatService.getUserConversations(userId, page, limit, status);

  res.status(200).json(ApiResponse.success(result, 'Conversations retrieved successfully'));
});

/**
 * Get single conversation by ID
 * GET /api/chat/conversations/:conversationId
 */
export const getConversationById = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const userId = req.user._id;

  const conversation = await chatService.getConversationById(conversationId, userId);

  res.status(200).json(ApiResponse.success({ conversation }, 'Conversation retrieved successfully'));
});

/**
 * Get conversation by booking ID
 * GET /api/chat/conversations/booking/:bookingId
 */
export const getConversationByBooking = asyncHandler(async (req, res) => {
  const { bookingId } = req.params;
  const userId = req.user._id;

  const conversation = await chatService.getConversationByBooking(bookingId, userId);

  res.status(200).json(ApiResponse.success({ 
    conversation: conversation || null 
  }, conversation ? 'Conversation retrieved successfully' : 'No conversation found for this booking'));
});

/**
 * Send a message
 * POST /api/chat/conversations/:conversationId/messages
 */
export const sendMessage = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const userId = req.user._id;
  const { content, messageType, attachments } = req.body;

  if (!content && messageType === 'text') {
    throw ApiError.badRequest('Message content is required');
  }

  const message = await chatService.sendMessage(conversationId, userId, {
    content,
    messageType: messageType || 'text',
    attachments,
  });

  res.status(201).json(ApiResponse.created({ message }, CHAT_SUCCESS.MESSAGE_SENT));
});

/**
 * Get messages for a conversation
 * GET /api/chat/conversations/:conversationId/messages
 */
export const getMessages = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const userId = req.user._id;
  const page = parseInt(req.query.page) || CHAT_PAGINATION.DEFAULT_PAGE;
  const limit = Math.min(
    parseInt(req.query.limit) || CHAT_PAGINATION.DEFAULT_MESSAGES_LIMIT,
    CHAT_PAGINATION.MAX_MESSAGES_LIMIT
  );

  const result = await chatService.getMessages(conversationId, userId, page, limit);

  res.status(200).json(ApiResponse.success(result, 'Messages retrieved successfully'));
});

/**
 * Search messages in a conversation
 * GET /api/chat/conversations/:conversationId/search
 */
export const searchMessages = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const { query } = req.query;
  const userId = req.user._id;

  if (!query || query.trim().length < 2) {
    throw ApiError.badRequest('Search query must be at least 2 characters');
  }

  const messages = await chatService.searchMessages(conversationId, userId, query);

  res.status(200).json(ApiResponse.success({ messages }, 'Search completed'));
});

/**
 * Mark messages as read
 * PATCH /api/chat/conversations/:conversationId/read
 */
export const markAsRead = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const userId = req.user._id;

  await chatService.markMessagesAsRead(conversationId, userId);

  res.status(200).json(ApiResponse.success(null, CHAT_SUCCESS.MESSAGES_MARKED_READ));
});

/**
 * Delete a message
 * DELETE /api/chat/messages/:messageId
 */
export const deleteMessage = asyncHandler(async (req, res) => {
  const { messageId } = req.params;
  const userId = req.user._id;

  await chatService.deleteMessage(messageId, userId);

  res.status(200).json(ApiResponse.success(null, CHAT_SUCCESS.MESSAGE_DELETED));
});

/**
 * Block a user in conversation
 * POST /api/chat/conversations/:conversationId/block
 */
export const blockUser = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const { reason } = req.body;
  const userId = req.user._id;

  await chatService.blockUser(conversationId, userId, reason, {
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    platform: req.get('x-client-platform') || 'web',
  });

  res.status(200).json(ApiResponse.success(null, CHAT_SUCCESS.USER_BLOCKED));
});

/**
 * Unblock a user in conversation
 * DELETE /api/chat/conversations/:conversationId/block
 */
export const unblockUser = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const userId = req.user._id;

  await chatService.unblockUser(conversationId, userId, {
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    platform: req.get('x-client-platform') || 'web',
  });

  res.status(200).json(ApiResponse.success(null, CHAT_SUCCESS.USER_UNBLOCKED));
});

/**
 * Report a message
 * POST /api/chat/messages/:messageId/report
 */
export const reportMessage = asyncHandler(async (req, res) => {
  const { messageId } = req.params;
  const { reason } = req.body;
  const userId = req.user._id;

  if (!reason || reason.trim().length < 10) {
    throw ApiError.badRequest('Please provide a detailed reason (minimum 10 characters)');
  }

  await chatService.reportMessage(messageId, userId, reason, {
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    platform: req.get('x-client-platform') || 'web',
  });

  res.status(200).json(ApiResponse.success(null, CHAT_SUCCESS.MESSAGE_REPORTED));
});

/**
 * Get unread message count
 * GET /api/chat/unread-count
 */
export const getUnreadCount = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const result = await chatService.getUnreadCount(userId);

  res.status(200).json(ApiResponse.success(result, 'Unread count retrieved'));
});

/**
 * Upload attachment for chat (handles file upload)
 * POST /api/chat/upload
 */
export const uploadAttachment = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw ApiError.badRequest('No file uploaded');
  }

  const { conversationId } = req.body;

  if (!conversationId) {
    throw ApiError.badRequest('Conversation ID is required');
  }

  // Validate file
  chatService.validateAttachment({
    mimeType: req.file.mimetype,
    size: req.file.size,
  });

  // Upload to Cloudinary
  const attachment = await chatService.uploadAttachment(
    req.file.buffer,
    req.file.mimetype,
    req.file.originalname,
    conversationId
  );

  res.status(200).json(ApiResponse.success({ attachment }, 'File uploaded successfully'));
});

/**
 * Admin: Get conversation for dispute resolution
 * GET /api/chat/admin/conversations/:conversationId
 */
export const getConversationForAdmin = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const adminId = req.user._id;

  const result = await chatService.getConversationForAdmin(conversationId, adminId);

  res.status(200).json(ApiResponse.success(result, 'Conversation retrieved for admin'));
});

// ============================================
// REACTIONS
// ============================================

/**
 * Add a reaction to a message
 * POST /api/chat/messages/:messageId/reactions
 */
export const addReaction = asyncHandler(async (req, res) => {
  const { messageId } = req.params;
  const { emoji } = req.body;
  const userId = req.user._id;
  const userName = req.user.fullName;

  if (!emoji) {
    throw ApiError.badRequest('Emoji is required');
  }

  const message = await chatService.addReaction(messageId, userId, userName, emoji);

  res.status(200).json(ApiResponse.success({ message }, 'Reaction added'));
});

/**
 * Remove a reaction from a message
 * DELETE /api/chat/messages/:messageId/reactions
 */
export const removeReaction = asyncHandler(async (req, res) => {
  const { messageId } = req.params;
  const emoji = req.body?.emoji || req.query?.emoji;
  const userId = req.user._id;

  const message = await chatService.removeReaction(messageId, userId, emoji);

  res.status(200).json(ApiResponse.success({ message }, 'Reaction removed'));
});

// ============================================
// PIN MESSAGES
// ============================================

/**
 * Toggle pin on a message
 * PATCH /api/chat/messages/:messageId/pin
 */
export const togglePinMessage = asyncHandler(async (req, res) => {
  const { messageId } = req.params;
  const userId = req.user._id;

  const message = await chatService.togglePinMessage(messageId, userId);

  res.status(200).json(ApiResponse.success({ message }, 
    message.pinned?.isPinned ? 'Message pinned' : 'Message unpinned'
  ));
});

/**
 * Get pinned messages for a conversation
 * GET /api/chat/conversations/:conversationId/pinned
 */
export const getPinnedMessages = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const userId = req.user._id;

  const messages = await chatService.getPinnedMessages(conversationId, userId);

  res.status(200).json(ApiResponse.success({ messages }, 'Pinned messages retrieved'));
});

// ============================================
// LABELS
// ============================================

/**
 * Set label on a conversation
 * PATCH /api/chat/conversations/:conversationId/label
 */
export const setConversationLabel = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const { label } = req.body;
  const userId = req.user._id;

  const conversation = await chatService.setConversationLabel(conversationId, userId, label);

  res.status(200).json(ApiResponse.success({ conversation }, 'Label updated'));
});

// ============================================
// MUTE & ARCHIVE
// ============================================

/**
 * Toggle mute notifications for a conversation
 * PATCH /api/chat/conversations/:conversationId/mute
 */
export const toggleMuteConversation = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const userId = req.user._id;

  const result = await chatService.toggleMuteConversation(conversationId, userId);

  res.status(200).json(ApiResponse.success(result, result.muted ? 'Notifications muted' : 'Notifications unmuted'));
});

/**
 * Archive a conversation
 * PATCH /api/chat/conversations/:conversationId/archive
 */
export const archiveConversation = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const userId = req.user._id;

  const conversation = await chatService.archiveConversation(conversationId, userId);

  res.status(200).json(ApiResponse.success({ conversation }, 'Conversation archived'));
});

/**
 * Unarchive/restore a conversation
 * PATCH /api/chat/conversations/:conversationId/unarchive
 */
export const unarchiveConversation = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const userId = req.user._id;

  const conversation = await chatService.unarchiveConversation(conversationId, userId);

  res.status(200).json(ApiResponse.success({ conversation }, 'Conversation restored'));
});

// ============================================
// ADMIN MONITORING
// ============================================

/**
 * Get all conversations for admin monitoring
 * GET /api/chat/admin/conversations
 */
export const getAllConversationsForAdmin = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const status = req.query.status || undefined;
  const hasReports = req.query.hasReports === 'true';

  const result = await chatService.getAllConversationsForAdmin(page, limit, { status, hasReports });

  res.status(200).json(ApiResponse.success(result, 'Admin conversations retrieved'));
});

/**
 * Get all reported messages for admin
 * GET /api/chat/admin/reports
 */
export const getReportedMessages = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;

  const result = await chatService.getReportedMessages(page, limit);

  // Keep backward compatibility by returning both `reports` and `messages`.
  res.status(200).json(ApiResponse.success({
    reports: result.messages,
    messages: result.messages,
    pagination: result.pagination,
  }, 'Reported messages retrieved'));
});

/**
 * Get messages for a conversation in admin viewer
 * GET /api/chat/admin/conversations/:conversationId/messages
 */
export const getAdminConversationMessages = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const adminId = req.user._id;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 100;

  const result = await chatService.getConversationForAdmin(conversationId, adminId);
  const totalCount = result.messages.length;
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;

  res.status(200).json(ApiResponse.success({
    messages: result.messages.slice(startIndex, endIndex),
    pagination: {
      page,
      limit,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
      hasMore: endIndex < totalCount,
    },
  }, 'Conversation messages retrieved for admin'));
});

/**
 * Update report status (admin)
 * PATCH /api/chat/admin/reports/:messageId
 */
export const updateReportStatus = asyncHandler(async (req, res) => {
  const { messageId } = req.params;
  const { status, notes } = req.body;
  const adminId = req.user._id;

  if (!status) {
    throw ApiError.badRequest('Status is required');
  }

  const message = await chatService.updateReportStatus(messageId, adminId, status, notes);

  res.status(200).json(ApiResponse.success({ message }, 'Report status updated'));
});

/**
 * Export conversation in various formats
 * GET /api/chat/conversations/:conversationId/export
 */
export const exportConversation = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const { format = 'txt' } = req.query;
  const userId = req.user._id;

  const result = await chatService.exportConversation(conversationId, userId, format);

  // Set headers based on format
  res.setHeader('Content-Type', result.mimeType);
  res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);

  res.send(result.content);
});

// ============================================
// CHAT ACCESS CONTROL
// ============================================

/**
 * Get chat access status for a conversation
 * GET /api/chat/conversations/:conversationId/access-status
 */
export const getChatAccessStatus = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const userId = req.user._id;

  const accessStatus = await chatService.getChatAccessStatus(conversationId, userId);

  res.status(200).json(ApiResponse.success({ accessStatus }, 'Access status retrieved'));
});

/**
 * Request chat unlock (get payment info)
 * POST /api/chat/conversations/:conversationId/request-unlock
 */
export const requestChatUnlock = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const userId = req.user._id;

  const result = await chatService.requestChatUnlock(conversationId, userId);

  res.status(200).json(ApiResponse.success(result,
    result.alreadyUnlocked ? 'Chat is already unlocked' : 'Booking confirmation required to unlock chat'
  ));
});

// ============================================
// ADMIN: CHAT MANAGEMENT
// ============================================

/**
 * Admin force unlock a conversation
 * POST /api/chat/admin/conversations/:conversationId/force-unlock
 */
export const adminForceUnlock = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const { reason } = req.body;
  const adminId = req.user._id;

  const conversation = await chatAccessService.adminForceUnlock(conversationId, adminId, reason);

  res.status(200).json(ApiResponse.success({ conversation }, 'Chat force unlocked by admin'));
});

/**
 * Admin restrict a conversation
 * POST /api/chat/admin/conversations/:conversationId/restrict
 */
export const adminRestrictChat = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const { reason } = req.body;
  const adminId = req.user._id;

  if (!reason) {
    throw ApiError.badRequest('Reason is required');
  }

  const conversation = await chatAccessService.adminRestrictChat(conversationId, adminId, reason);

  res.status(200).json(ApiResponse.success({ conversation }, 'Chat restricted by admin'));
});

/**
 * Get chat statistics for admin dashboard
 * GET /api/chat/admin/stats
 */
export const getChatStats = asyncHandler(async (req, res) => {
  const Conversation = (await import('../../models/conversation.model.js')).default;
  const Message = (await import('../../models/message.model.js')).default;

  const [
    totalConversations,
    activeConversations,
    lockedConversations,
    restrictedConversations,
    closedConversations,
    totalMessages,
    pendingReports,
  ] = await Promise.all([
    Conversation.countDocuments(),
    Conversation.countDocuments({ status: 'active' }),
    Conversation.countDocuments({ status: 'locked' }),
    Conversation.countDocuments({ status: 'restricted' }),
    Conversation.countDocuments({ status: 'closed' }),
    Message.countDocuments(),
    Message.countDocuments({ 'reported.isReported': true, 'reported.status': 'pending' }),
  ]);

  // Return flat stats for frontend compatibility and also keep nested `stats`.
  res.status(200).json(ApiResponse.success({
    totalConversations,
    activeConversations,
    lockedConversations,
    restrictedConversations,
    closedConversations,
    totalMessages,
    pendingReports,
    stats: {
      totalConversations,
      activeConversations,
      lockedConversations,
      restrictedConversations,
      closedConversations,
      totalMessages,
      pendingReports,
    },
  }, 'Chat statistics retrieved'));
});

export default {
  startConversation,
  startDirectConversation,
  getConversations,
  getConversationById,
  getConversationByBooking,
  sendMessage,
  getMessages,
  searchMessages,
  markAsRead,
  deleteMessage,
  blockUser,
  unblockUser,
  reportMessage,
  getUnreadCount,
  uploadAttachment,
  getConversationForAdmin,
  addReaction,
  removeReaction,
  togglePinMessage,
  getPinnedMessages,
  setConversationLabel,
  toggleMuteConversation,
  archiveConversation,
  unarchiveConversation,
  getAllConversationsForAdmin,
  getReportedMessages,
  getAdminConversationMessages,
  updateReportStatus,
  exportConversation,
  // New access control endpoints
  getChatAccessStatus,
  requestChatUnlock,
  // Admin chat management
  adminForceUnlock,
  adminRestrictChat,
  getChatStats,
};
