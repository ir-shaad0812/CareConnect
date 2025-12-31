// ============================================
// CHAT SERVICE
// Business logic for real-time messaging
// ============================================

import Message from '../models/message.model.js';
import Conversation from '../models/conversation.model.js';
import Booking from '../models/booking.model.js';
import User from '../models/user.model.js';
import Notification from '../models/notification.model.js';
import ModerationLog from '../models/moderationLog.model.js';
import { BOOKING_STATUS } from '../constants/booking.constants.js';
import {
  MESSAGE_TYPE,
  CONVERSATION_STATUS,
  NOTIFICATION_TYPE,
  CHAT_ACCESS_REASON,
  SYSTEM_MESSAGE_TYPE,
} from '../constants/chat.constants.js';
import { uploadChatAttachment } from '../utils/cloudinary.js';
import chatAccessService from './chatAccess.service.js';
import logger from '../utils/logger.js';

class ChatService {
  async hasConfirmedBookingBetween(userId, otherUserId) {
    const booking = await Booking.findOne({
      $or: [
        { careSeekerId: userId, caregiverId: otherUserId },
        { careSeekerId: otherUserId, caregiverId: userId },
      ],
      status: { $in: [BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.IN_PROGRESS, BOOKING_STATUS.COMPLETED] },
    }).select('_id');

    return Boolean(booking);
  }

  /**
   * Start or get a direct conversation with another user.
   * Access rule: only allowed if users have at least one confirmed/in-progress/completed booking.
   */
  async startDirectConversation(userId, otherUserId) {
    // Verify the other user exists
    const otherUser = await User.findById(otherUserId).select('fullName avatar role status');
    if (!otherUser) {
      throw new Error('User not found');
    }

    if (otherUser.status !== 'active') {
      throw new Error('Cannot start conversation with inactive user');
    }

    const hasEligibleBooking = await this.hasConfirmedBookingBetween(userId, otherUserId);
    if (!hasEligibleBooking) {
      throw new Error('Conversation is available only after a confirmed booking');
    }

    // Find or create direct conversation
    let conversation = await Conversation.findOrCreateDirect(userId, otherUserId);

    // Populate for response
    conversation = await Conversation.findById(conversation._id)
      .populate('participants', 'fullName avatar role');

    // Create system message if new conversation
    if (conversation.metadata.messageCount === 0) {
      const currentUser = await User.findById(userId).select('fullName');
      await this.createSystemMessage(
        conversation._id,
        'chat_started',
        `${currentUser.fullName} started a conversation`,
        null
      );
    }

    return conversation;
  }

  /**
   * Start or get existing conversation for a booking
   * STRICT ACCESS CONTROL: Chat unlocks only after full payment is completed
   */
  async startConversation(bookingId, userId) {
    // Verify booking and get participants
    const booking = await Booking.findById(bookingId)
      .populate('careSeekerId', 'fullName avatar')
      .populate('caregiverId', 'fullName avatar');

    if (!booking) {
      throw new Error('Booking not found');
    }

    // Verify user is part of booking
    const isCaregiver = booking.caregiverId._id.toString() === userId.toString();
    const isCareSeeker = booking.careSeekerId._id.toString() === userId.toString();

    if (!isCaregiver && !isCareSeeker) {
      throw new Error('You are not authorized to access this booking');
    }

    // Check chat access using strict payment verification
    const accessResult = await chatAccessService.canUnlockChat(bookingId);

    // Find or create conversation with correct status
    const participants = [booking.careSeekerId._id, booking.caregiverId._id];
    let conversation = await Conversation.findOne({ bookingId });

    if (!conversation) {
      // Create new conversation with appropriate status
      const conversationStatus = accessResult.allowed
        ? CONVERSATION_STATUS.ACTIVE
        : CONVERSATION_STATUS.LOCKED;

      conversation = await Conversation.create({
        bookingId,
        participants,
        type: 'booking_chat',
        status: conversationStatus,
        unreadCount: new Map(participants.map(p => [p.toString(), 0])),
        metadata: {
          firstMessageAt: new Date(),
          lastActivityAt: new Date(),
          chatEnabled: accessResult.allowed,
          disabledReason: accessResult.allowed ? null : accessResult.reasonMessage,
        },
        accessControl: {
          chatUnlockedAt: accessResult.allowed ? new Date() : null,
          paymentVerifiedAt: accessResult.allowed ? new Date() : null,
          lastStatusChange: new Date(),
          statusReason: accessResult.reason,
        },
      });

      // Link conversation to booking
      booking.conversationId = conversation._id;
      await booking.save();

      // Create system message based on status
      if (accessResult.allowed) {
        await this.createSystemMessage(
          conversation._id,
          SYSTEM_MESSAGE_TYPE.CHAT_UNLOCKED,
          `🔓 Chat unlocked! You can now message each other about booking #${booking.bookingNumber}.`,
          booking._id
        );
      } else {
        await this.createSystemMessage(
          conversation._id,
          SYSTEM_MESSAGE_TYPE.BOOKING_CONFIRMED,
          `📋 Booking #${booking.bookingNumber} created. ${accessResult.reasonMessage}`,
          booking._id
        );
      }
    } else {
      // Existing conversation - verify and potentially update status
      const shouldRestrict = await chatAccessService.shouldRestrictChat(bookingId);

      if (shouldRestrict.restrict && conversation.status === CONVERSATION_STATUS.ACTIVE) {
        // Status changed - restrict the chat
        conversation.status = shouldRestrict.newStatus;
        conversation.metadata.chatEnabled = false;
        conversation.metadata.disabledReason = shouldRestrict.reasonMessage;
        conversation.accessControl.lastStatusChange = new Date();
        conversation.accessControl.statusReason = shouldRestrict.reason;
        await conversation.save();
      } else if (accessResult.allowed && conversation.status === CONVERSATION_STATUS.LOCKED) {
        // Payment completed - unlock the chat
        conversation.status = CONVERSATION_STATUS.ACTIVE;
        conversation.metadata.chatEnabled = true;
        conversation.metadata.disabledReason = null;
        conversation.accessControl.chatUnlockedAt = new Date();
        conversation.accessControl.paymentVerifiedAt = null;
        conversation.accessControl.lastStatusChange = new Date();
        conversation.accessControl.statusReason = CHAT_ACCESS_REASON.CHAT_ACTIVE;
        await conversation.save();

        await this.createSystemMessage(
          conversation._id,
          SYSTEM_MESSAGE_TYPE.CHAT_UNLOCKED,
          '🔓 Payment received! Chat is now unlocked.',
          booking._id
        );
      }
    }

    // Populate for response
    conversation = await Conversation.findById(conversation._id)
      .populate('participants', 'fullName avatar role')
      .populate('bookingId', 'bookingNumber serviceType status schedule paymentStatus totalAmount amountPaid amountDue paymentDeadline');

    // Return conversation with access status
    return {
      conversation,
      accessStatus: {
        canSendMessages: accessResult.allowed,
        status: conversation.status,
        reason: accessResult.reason,
        reasonMessage: accessResult.reasonMessage,
        bookingStatus: booking.status,
      },
    };
  }

  /**
   * Send a message
   * STRICT ACCESS CONTROL: Only allows messages when chat is ACTIVE
   */
  async sendMessage(conversationId, senderId, messageData) {
    // Get conversation and verify access
    const conversation = await Conversation.findById(conversationId)
      .populate('bookingId');

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    // Verify sender is participant
    const isParticipant = conversation.participants.some(
      p => p.toString() === senderId.toString()
    );

    if (!isParticipant) {
      throw new Error('You are not a participant of this conversation');
    }

    // STRICT: Check chat access using access service
    const accessCheck = chatAccessService.canSendMessage(conversation, senderId);
    if (!accessCheck.canSend) {
      const error = new Error(accessCheck.error);
      error.code = accessCheck.errorCode || 'CHAT_ACCESS_DENIED';
      throw error;
    }

    // For booking chats, re-verify payment status before each message
    if (conversation.type === 'booking_chat' && conversation.bookingId) {
      const restrictCheck = await chatAccessService.shouldRestrictChat(
        conversation.bookingId._id || conversation.bookingId
      );

      if (restrictCheck.restrict) {
        // Update conversation status
        conversation.status = restrictCheck.newStatus;
        conversation.metadata.chatEnabled = false;
        conversation.metadata.disabledReason = restrictCheck.reasonMessage;
        conversation.accessControl = {
          ...conversation.accessControl,
          lastStatusChange: new Date(),
          statusReason: restrictCheck.reason,
        };
        await conversation.save();

        const error = new Error(`Chat ${restrictCheck.newStatus}: ${restrictCheck.reasonMessage}`);
        error.code = `CHAT_${restrictCheck.newStatus.toUpperCase()}`;
        throw error;
      }
    }

    // Get receiver
    const receiverId = conversation.getOtherParticipant(senderId);

    // Create message
    const message = new Message({
      conversationId,
      senderId,
      receiverId,
      messageType: messageData.messageType || MESSAGE_TYPE.TEXT,
      content: messageData.content,
      attachments: messageData.attachments || [],
      status: 'sent',
      metadata: {
        bookingId: conversation.bookingId?._id || null,
      },
    });

    await message.save();

    // Update conversation
    await Conversation.updateLastMessage(conversationId, message);
    await Conversation.incrementUnread(conversationId, receiverId);

    // Populate sender info for response
    const populatedMessage = await Message.findById(message._id)
      .populate('senderId', 'fullName avatar')
      .populate('receiverId', 'fullName avatar');

    // Create notification for receiver (only if not muted)
    if (!conversation.mutedBy?.includes(receiverId)) {
      await this.createMessageNotification(receiverId, senderId, message, conversation);
    }

    return populatedMessage;
  }

  /**
   * Get messages for a conversation
   */
  async getMessages(conversationId, userId, page = 1, limit = 50) {
    // Verify user is participant
    const conversation = await Conversation.findById(conversationId);
    
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    const isParticipant = conversation.participants.some(
      p => p.toString() === userId.toString()
    );

    if (!isParticipant) {
      throw new Error('You are not authorized to view these messages');
    }

    // Get messages
    const messages = await Message.getConversationMessages(
      conversationId,
      userId,
      page,
      limit
    );

    // Mark messages as read
    await Message.markAsRead(conversationId, userId);
    await Conversation.resetUnread(conversationId, userId);

    // Get total count
    const totalCount = await Message.countDocuments({
      conversationId,
      deletedFor: { $ne: userId },
    });

    return {
      messages,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasMore: page * limit < totalCount,
      },
    };
  }

  /**
   * Get user's conversations
   */
  async getUserConversations(userId, page = 1, limit = 20, status = 'active') {
    const conversations = await Conversation.getUserConversations(userId, page, limit, status);

    const countQuery = {
      participants: userId,
    };

    if (status === 'active') {
      countQuery.status = { $in: ['active', 'locked', 'restricted', 'closed'] };
    } else if (status !== 'all') {
      countQuery.status = status;
    }

    // Get total count
    const totalCount = await Conversation.countDocuments(countQuery);

    return {
      conversations,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    };
  }

  /**
   * Get conversation by ID
   */
  async getConversationById(conversationId, userId) {
    const conversation = await Conversation.findById(conversationId)
      .populate('participants', 'fullName avatar role')
      .populate('bookingId', 'bookingNumber serviceType status schedule');

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    const isParticipant = conversation.participants.some(
      p => p._id.toString() === userId.toString()
    );

    if (!isParticipant) {
      throw new Error('You are not authorized to view this conversation');
    }

    return conversation;
  }

  /**
   * Get conversation by booking ID
   */
  async getConversationByBooking(bookingId, userId) {
    const conversation = await Conversation.findOne({ bookingId })
      .populate('participants', 'fullName avatar role')
      .populate('bookingId', 'bookingNumber serviceType status schedule');

    if (!conversation) {
      return null;
    }

    const isParticipant = conversation.participants.some(
      p => p._id.toString() === userId.toString()
    );

    if (!isParticipant) {
      throw new Error('You are not authorized to view this conversation');
    }

    return conversation;
  }

  /**
   * Get chat access status for a conversation
   * This provides detailed status info for the frontend UI
   */
  async getChatAccessStatus(conversationId, userId) {
    return chatAccessService.getChatAccessStatus(conversationId, userId);
  }

  /**
    * Request chat unlock (returns booking status info)
   */
  async requestChatUnlock(conversationId, userId) {
    const conversation = await Conversation.findById(conversationId)
      .populate('bookingId');

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    const isParticipant = conversation.participants.some(
      p => p.toString() === userId.toString()
    );

    if (!isParticipant) {
      throw new Error('You are not authorized');
    }

    if (conversation.status === CONVERSATION_STATUS.ACTIVE) {
      return { alreadyUnlocked: true, message: 'Chat is already unlocked' };
    }

    if (!conversation.bookingId) {
      throw new Error('No booking associated with this conversation');
    }

    const booking = conversation.bookingId;
    return {
      alreadyUnlocked: false,
      message: 'Chat unlocks once payment is fully completed',
      bookingId: booking._id,
      bookingNumber: booking.bookingNumber,
      bookingStatus: booking.status,
    };
  }

  /**
   * Search messages in a conversation
   */
  async searchMessages(conversationId, userId, query) {
    // Verify access
    const conversation = await Conversation.findById(conversationId);
    
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    const isParticipant = conversation.participants.some(
      p => p.toString() === userId.toString()
    );

    if (!isParticipant) {
      throw new Error('You are not authorized to search these messages');
    }

    const messages = await Message.searchMessages(conversationId, userId, query);
    return messages;
  }

  /**
   * Mark messages as read
   */
  async markMessagesAsRead(conversationId, userId) {
    await Message.markAsRead(conversationId, userId);
    await Conversation.resetUnread(conversationId, userId);
    return { success: true };
  }

  /**
   * Mark messages as delivered
   */
  async markMessagesAsDelivered(conversationId, userId) {
    await Message.markAsDelivered(conversationId, userId);
    return { success: true };
  }

  /**
   * Delete a message (soft delete for user)
   */
  async deleteMessage(messageId, userId) {
    const message = await Message.findById(messageId);
    
    if (!message) {
      throw new Error('Message not found');
    }

    // Verify user is sender or receiver
    const canDelete = 
      message.senderId.toString() === userId.toString() ||
      message.receiverId.toString() === userId.toString();

    if (!canDelete) {
      throw new Error('You cannot delete this message');
    }

    // Add user to deletedFor array
    if (!message.deletedFor.includes(userId)) {
      message.deletedFor.push(userId);
      await message.save();
    }

    return { success: true };
  }

  /**
   * Block a user in a conversation
   */
  async blockUser(conversationId, userId, reason = '', metadata = {}) {
    const conversation = await Conversation.findById(conversationId);
    
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    const isParticipant = conversation.participants.some(
      p => p.toString() === userId.toString()
    );

    if (!isParticipant) {
      throw new Error('You are not a participant of this conversation');
    }

    // Check if already blocked
    const alreadyBlocked = conversation.blockedBy.some(
      block => block.userId.toString() === userId.toString()
    );

    if (alreadyBlocked) {
      throw new Error('You have already blocked this conversation');
    }

    // Get the blocked user ID (the other participant)
    const blockedUserId = conversation.getOtherParticipant(userId);
    const user = await User.findById(userId).select('role').lean();

    conversation.blockedBy.push({
      userId,
      blockedAt: new Date(),
      reason,
    });

    await conversation.save();

    // Log moderation action
    await ModerationLog.logAction({
      action: 'user_blocked',
      performedBy: {
        userId,
        role: user?.role || 'careseeker',
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
      },
      target: {
        type: 'user',
        id: blockedUserId,
      },
      relatedEntities: {
        conversationId,
      },
      reason: {
        category: 'other',
        description: reason,
      },
      severity: 'medium',
      metadata: {
        source: 'user_report',
        platform: metadata.platform || 'web',
      },
    });

    return { success: true, message: 'User blocked successfully' };
  }

  /**
   * Unblock a user in a conversation
   */
  async unblockUser(conversationId, userId, metadata = {}) {
    const conversation = await Conversation.findById(conversationId);
    
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    const blockedUserId = conversation.getOtherParticipant(userId);
    const user = await User.findById(userId).select('role').lean();

    conversation.blockedBy = conversation.blockedBy.filter(
      block => block.userId.toString() !== userId.toString()
    );

    await conversation.save();

    // Log moderation action
    await ModerationLog.logAction({
      action: 'user_unblocked',
      performedBy: {
        userId,
        role: user?.role || 'careseeker',
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
      },
      target: {
        type: 'user',
        id: blockedUserId,
      },
      relatedEntities: {
        conversationId,
      },
      severity: 'low',
      metadata: {
        source: 'user_report',
        platform: metadata.platform || 'web',
      },
    });

    return { success: true, message: 'User unblocked successfully' };
  }

  /**
   * Report a message
   */
  async reportMessage(messageId, userId, reason, metadata = {}) {
    const message = await Message.findById(messageId)
      .populate('senderId', 'fullName role')
      .lean();
    
    if (!message) {
      throw new Error('Message not found');
    }

    // Cannot report own message
    if (message.senderId._id.toString() === userId.toString()) {
      throw new Error('You cannot report your own message');
    }

    const user = await User.findById(userId).select('role').lean();

    // Update message with report
    await Message.findByIdAndUpdate(messageId, {
      reported: {
        isReported: true,
        reportedBy: userId,
        reportedAt: new Date(),
        reason,
        status: 'pending',
      },
    });

    // Determine severity based on reason
    let severity = 'low';
    if (['harassment', 'hate_speech', 'violence'].includes(reason)) {
      severity = 'high';
    } else if (['scam', 'inappropriate_content'].includes(reason)) {
      severity = 'medium';
    }

    // Log moderation action
    await ModerationLog.logAction({
      action: 'message_reported',
      performedBy: {
        userId,
        role: user?.role || 'careseeker',
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
      },
      target: {
        type: 'message',
        id: messageId,
        snapshot: {
          content: message.content,
          senderId: message.senderId._id,
          senderName: message.senderId.fullName,
          messageType: message.messageType,
          createdAt: message.createdAt,
        },
      },
      relatedEntities: {
        conversationId: message.conversationId,
        messageId: messageId,
        reportedUserId: message.senderId._id,
      },
      reason: {
        category: reason,
        description: reason,
      },
      severity,
      metadata: {
        source: 'user_report',
        platform: metadata.platform || 'web',
      },
    });

    // Notify admins for moderation follow-up
    try {
      const admins = await User.find({ role: 'admin', status: 'active' }).select('_id');
      await Promise.all(
        admins.map((admin) =>
          Notification.createNotification({
            userId: admin._id,
            type: 'system_update',
            title: 'New Chat Reported',
            message: `A message was reported for \"${reason}\" and needs moderation review.`,
            priority: severity === 'high' ? 'high' : 'normal',
            data: {
              referenceId: messageId,
              referenceType: 'message',
              actionUrl: '/admin/chat-monitoring',
              metadata: {
                conversationId: message.conversationId,
                reportedBy: userId,
                reason,
              },
            },
            channels: {
              inApp: true,
              push: true,
              email: false,
              sms: false,
            },
          })
        )
      );
    } catch (notifyError) {
      logger.chat.error('Failed to notify admins about reported message', notifyError, { messageId });
    }

    return { success: true, message: 'Message reported successfully' };
  }

  /**
   * Create a system message
   */
  async createSystemMessage(conversationId, systemMessageType, content, bookingId) {
    const conversation = await Conversation.findById(conversationId);
    
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    const [participant1, participant2] = conversation.participants;

    const message = new Message({
      conversationId,
      senderId: participant1, // System messages use first participant as sender
      receiverId: participant2,
      messageType: MESSAGE_TYPE.SYSTEM,
      content,
      metadata: {
        systemMessageType,
        bookingId,
      },
    });

    await message.save();
    await Conversation.updateLastMessage(conversationId, message);

    return message;
  }

  /**
   * Create notification for new message
   */
  async createMessageNotification(recipientId, senderId, message, conversation) {
    try {
      const sender = await User.findById(senderId);
      
      await Notification.create({
        userId: recipientId,
        type: NOTIFICATION_TYPE.NEW_MESSAGE,
        title: 'New Message',
        message: `${sender.fullName}: ${message.messageType === 'text' ? message.content.substring(0, 50) : `[${message.messageType}]`}`,
        data: {
          conversationId: conversation._id,
          messageId: message._id,
          senderId,
          bookingId: conversation.bookingId,
        },
        channels: {
          inApp: true,
          push: true,
          email: false,
          sms: false,
        },
      });
    } catch (error) {
      logger.chat.error('Failed to create message notification', error, { userId: recipientId, conversationId });
    }
  }

  /**
   * Get unread message count for user
   */
  async getUnreadCount(userId) {
    const count = await Message.getUnreadCount(userId);
    return { unreadCount: count };
  }

  /**
   * Get conversation with messages (for admin dispute resolution)
   */
  async getConversationForAdmin(conversationId, adminId) {
    const conversation = await Conversation.findById(conversationId)
      .populate('participants', 'fullName avatar role email')
      .populate('bookingId');

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    // Enable admin access
    if (!conversation.adminAccess.enabled) {
      conversation.adminAccess = {
        enabled: true,
        enabledBy: adminId,
        enabledAt: new Date(),
        reason: 'Admin review',
      };
      await conversation.save();
    }

    // Get all messages
    const messages = await Message.find({ conversationId })
      .sort({ createdAt: 1 })
      .populate('senderId', 'fullName avatar')
      .populate('receiverId', 'fullName avatar');

    return {
      conversation,
      messages,
    };
  }

  /**
   * Close a conversation
   */
  async closeConversation(conversationId, userId, reason = 'Booking completed') {
    const conversation = await Conversation.findById(conversationId);
    
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    conversation.status = CONVERSATION_STATUS.CLOSED;
    conversation.metadata.chatEnabled = false;
    conversation.metadata.disabledReason = reason;

    await conversation.save();

    // Create system message
    await this.createSystemMessage(
      conversationId,
      'booking_completed',
      `Chat closed: ${reason}`,
      conversation.bookingId
    );

    return conversation;
  }

  /**
   * Upload and validate file attachment
   */
  validateAttachment(file) {
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];

    const maxSize = 10 * 1024 * 1024; // 10MB

    if (!allowedTypes.includes(file.mimeType)) {
      throw new Error('File type not allowed');
    }

    if (file.size > maxSize) {
      throw new Error('File size exceeds 10MB limit');
    }

    return true;
  }

  // ============================================
  // REACTIONS
  // ============================================

  /**
   * Add a reaction to a message
   */
  async addReaction(messageId, userId, userName, emoji) {
    const message = await Message.findById(messageId);
    if (!message) throw new Error('Message not found');

    // Verify user is participant of the conversation
    const conversation = await Conversation.findById(message.conversationId);
    if (!conversation) throw new Error('Conversation not found');

    const isParticipant = conversation.participants.some(
      p => p.toString() === userId.toString()
    );
    if (!isParticipant) throw new Error('Not authorized');

    const updated = await Message.addReaction(messageId, userId, userName, emoji);
    return updated;
  }

  /**
   * Remove a reaction from a message
   */
  async removeReaction(messageId, userId, emoji) {
    const message = await Message.findById(messageId);
    if (!message) throw new Error('Message not found');

    const updated = await Message.removeReaction(messageId, userId, emoji);
    return updated;
  }

  // ============================================
  // PIN MESSAGES
  // ============================================

  /**
   * Toggle pin status of a message
   */
  async togglePinMessage(messageId, userId) {
    const message = await Message.findById(messageId);
    if (!message) throw new Error('Message not found');

    // Verify user is participant
    const conversation = await Conversation.findById(message.conversationId);
    if (!conversation) throw new Error('Conversation not found');

    const isParticipant = conversation.participants.some(
      p => p.toString() === userId.toString()
    );
    if (!isParticipant) throw new Error('Not authorized');

    const updated = await Message.togglePin(messageId, userId);

    // Update conversation pinnedMessages array
    if (updated.pinned?.isPinned) {
      if (!conversation.pinnedMessages.includes(messageId)) {
        conversation.pinnedMessages.push(messageId);
      }
    } else {
      conversation.pinnedMessages = conversation.pinnedMessages.filter(
        id => id.toString() !== messageId.toString()
      );
    }
    await conversation.save();

    return updated;
  }

  /**
   * Get pinned messages for a conversation
   */
  async getPinnedMessages(conversationId, userId) {
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) throw new Error('Conversation not found');

    const isParticipant = conversation.participants.some(
      p => p.toString() === userId.toString()
    );
    if (!isParticipant) throw new Error('Not authorized');

    return Message.getPinnedMessages(conversationId, userId);
  }

  // ============================================
  // LABELS
  // ============================================

  /**
   * Set label on a conversation
   */
  async setConversationLabel(conversationId, userId, label) {
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) throw new Error('Conversation not found');

    const isParticipant = conversation.participants.some(
      p => p.toString() === userId.toString()
    );
    if (!isParticipant) throw new Error('Not authorized');

    conversation.label = label || null;
    await conversation.save();

    return conversation;
  }

  // ============================================
  // MUTE NOTIFICATIONS
  // ============================================

  /**
   * Toggle mute for a conversation
   */
  async toggleMuteConversation(conversationId, userId) {
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) throw new Error('Conversation not found');

    const isMuted = conversation.mutedBy.some(
      id => id.toString() === userId.toString()
    );

    if (isMuted) {
      conversation.mutedBy = conversation.mutedBy.filter(
        id => id.toString() !== userId.toString()
      );
    } else {
      conversation.mutedBy.push(userId);
    }

    await conversation.save();
    return { muted: !isMuted };
  }

  // ============================================
  // ARCHIVE
  // ============================================

  /**
   * Archive a conversation
   */
  async archiveConversation(conversationId, userId) {
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) throw new Error('Conversation not found');

    const isParticipant = conversation.participants.some(
      p => p.toString() === userId.toString()
    );
    if (!isParticipant) throw new Error('Not authorized');

    conversation.status = CONVERSATION_STATUS.ARCHIVED;
    await conversation.save();

    return conversation;
  }

  /**
   * Unarchive/restore a conversation
   */
  async unarchiveConversation(conversationId, userId) {
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) throw new Error('Conversation not found');

    const isParticipant = conversation.participants.some(
      p => p.toString() === userId.toString()
    );
    if (!isParticipant) throw new Error('Not authorized');

    conversation.status = CONVERSATION_STATUS.ACTIVE;
    await conversation.save();

    return conversation;
  }

  // ============================================
  // AUTOMATED SYSTEM MESSAGES
  // ============================================

  /**
   * Send automated booking confirmation message
   */
  async sendBookingSystemMessage(bookingId, messageType, customContent = '') {
    try {
      const conversation = await Conversation.findOne({ bookingId });
      if (!conversation) return null; // No conversation yet, skip

      const booking = await Booking.findById(bookingId);
      if (!booking) return null;

      const contentMap = {
        booking_approved: `✅ Booking #${booking.bookingNumber} has been approved! Your care session is confirmed.`,
        booking_cancelled: `❌ Booking #${booking.bookingNumber} has been cancelled.`,
        booking_completed: `🎉 Booking #${booking.bookingNumber} has been completed. Thank you for using CareConnect!`,
        service_reminder: `⏰ Reminder: Your care session for booking #${booking.bookingNumber} is coming up soon.`,
      };

      const content = customContent || contentMap[messageType] || `Booking update: ${messageType}`;

      // Update conversation label based on booking event
      const labelMap = {
        booking_approved: 'booked',
        booking_cancelled: 'completed',
        booking_completed: 'completed',
      };
      if (labelMap[messageType]) {
        conversation.label = labelMap[messageType];
        await conversation.save();
      }

      return await this.createSystemMessage(
        conversation._id,
        messageType,
        content,
        bookingId
      );
    } catch (error) {
      logger.chat.error('Failed to send booking system message', error, { bookingId });
      return null;
    }
  }

  // ============================================
  // ADMIN: Get all reported messages
  // ============================================

  /**
   * Get all reported messages (admin)
   */
  async getReportedMessages(page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const messages = await Message.find({
      'reported.isReported': true,
    })
      .sort({ 'reported.reportedAt': -1 })
      .skip(skip)
      .limit(limit)
      .populate('senderId', 'fullName avatar email')
      .populate('receiverId', 'fullName avatar email')
      .populate('conversationId', 'bookingId participants')
      .populate('reported.reportedBy', 'fullName')
      .lean();

    const totalCount = await Message.countDocuments({
      'reported.isReported': true,
    });

    return {
      messages,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    };
  }

  /**
   * Update report status (admin)
   */
  async updateReportStatus(messageId, adminId, status, notes = '') {
    const message = await Message.findById(messageId);
    if (!message) throw new Error('Message not found');

    message.reported.status = status;
    message.reported.reviewedBy = adminId;
    message.reported.reviewedAt = new Date();
    message.reported.notes = notes;
    await message.save();

    return message;
  }

  /**
   * Get all conversations for admin monitoring
   */
  async getAllConversationsForAdmin(page = 1, limit = 20, filters = {}) {
    const skip = (page - 1) * limit;
    const query = {};

    if (filters.status) query.status = filters.status;
    if (filters.hasReports) {
      // Get conversations with reported messages
      const reportedConvIds = await Message.distinct('conversationId', {
        'reported.isReported': true,
        'reported.status': 'pending',
      });
      query._id = { $in: reportedConvIds };
    }

    const conversations = await Conversation.find(query)
      .sort({ 'metadata.lastActivityAt': -1 })
      .skip(skip)
      .limit(limit)
      .populate('participants', 'fullName avatar role email')
      .populate('bookingId', 'bookingNumber serviceType status')
      .lean();

    const totalCount = await Conversation.countDocuments(query);

    return {
      conversations,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    };
  }

  // ============================================
  // FILE UPLOAD HELPERS
  // ============================================

  /**
   * Validate attachment file
   */
  validateAttachment(file) {
    const allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ];

    const maxFileSize = 10 * 1024 * 1024; // 10MB

    if (!allowedMimeTypes.includes(file.mimeType)) {
      throw new Error('Invalid file type. Allowed types: images (JPEG, PNG, GIF, WebP), PDF, DOC, DOCX, TXT');
    }

    if (file.size > maxFileSize) {
      throw new Error('File size exceeds 10MB limit');
    }

    return true;
  }

  /**
   * Upload chat attachment to Cloudinary
   */
  async uploadAttachment(fileBuffer, mimeType, originalName, conversationId) {
    try {
      const cloudinaryResult = await uploadChatAttachment(
        fileBuffer,
        mimeType,
        conversationId
      );

      return {
        type: cloudinaryResult.resourceType,
        url: cloudinaryResult.url,
        name: originalName,
        size: cloudinaryResult.size,
        mimeType: mimeType,
        publicId: cloudinaryResult.publicId,
        format: cloudinaryResult.format,
      };
    } catch (error) {
      logger.chat.error('Failed to upload chat attachment', error);
      throw new Error('Failed to upload attachment to cloud storage');
    }
  }

  // ============================================
  // CHAT EXPORT
  // ============================================

  /**
   * Export conversation in various formats (txt, json, pdf)
   */
  async exportConversation(conversationId, userId, format = 'txt') {
    const conversation = await Conversation.findById(conversationId)
      .populate('participants', 'fullName avatar role email')
      .populate('bookingId', 'bookingNumber serviceType');

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    const isParticipant = conversation.participants.some(
      p => p._id.toString() === userId.toString()
    );

    if (!isParticipant) {
      throw new Error('Not authorized to export this conversation');
    }

    // Get all messages
    const messages = await Message.find({ conversationId })
      .sort({ createdAt: 1 })
      .populate('senderId', 'fullName')
      .populate('receiverId', 'fullName')
      .lean();

    const currentUser = conversation.participants.find(p => p._id.toString() === userId.toString());
    const otherUser = conversation.participants.find(p => p._id.toString() !== userId.toString());

    const exportDate = new Date().toISOString();

    switch (format.toLowerCase()) {
      case 'json':
        return {
          format: 'json',
          mimeType: 'application/json',
          filename: `chat_${otherUser?.fullName || 'export'}_${exportDate.split('T')[0]}.json`,
          content: JSON.stringify({
            exportedAt: exportDate,
            exportedBy: currentUser?.fullName,
            conversation: {
              id: conversation._id,
              type: conversation.type,
              participants: conversation.participants.map(p => ({
                id: p._id,
                name: p.fullName,
                role: p.role,
              })),
              bookingNumber: conversation.bookingId?.bookingNumber || null,
              createdAt: conversation.createdAt,
              messageCount: messages.length,
            },
            messages: messages.map(msg => ({
              id: msg._id,
              sender: msg.senderId?.fullName || 'Unknown',
              content: msg.content,
              type: msg.messageType,
              status: msg.status,
              timestamp: msg.createdAt,
              reactions: msg.reactions || [],
              attachments: msg.attachments || [],
            })),
          }, null, 2),
        };

      case 'txt':
      default:
        let txtContent = `CareConnect Chat Export\n`;
        txtContent += `${'='.repeat(50)}\n`;
        txtContent += `Exported: ${new Date(exportDate).toLocaleString()}\n`;
        txtContent += `Conversation with: ${otherUser?.fullName || 'Unknown'}\n`;
        if (conversation.bookingId?.bookingNumber) {
          txtContent += `Booking: #${conversation.bookingId.bookingNumber}\n`;
        }
        txtContent += `Total Messages: ${messages.length}\n`;
        txtContent += `${'='.repeat(50)}\n\n`;

        messages.forEach(msg => {
          const timestamp = new Date(msg.createdAt).toLocaleString();
          const sender = msg.senderId?.fullName || 'Unknown';
          txtContent += `[${timestamp}] ${sender}:\n`;
          if (msg.messageType === 'text') {
            txtContent += `${msg.content}\n`;
          } else if (msg.messageType === 'image') {
            txtContent += `[Image: ${msg.attachments?.[0]?.name || 'attachment'}]\n`;
          } else if (msg.messageType === 'system') {
            txtContent += `--- ${msg.content} ---\n`;
          } else {
            txtContent += `[${msg.messageType}: ${msg.content || 'attachment'}]\n`;
          }
          if (msg.reactions?.length > 0) {
            txtContent += `Reactions: ${msg.reactions.map(r => r.emoji).join(' ')}\n`;
          }
          txtContent += `\n`;
        });

        return {
          format: 'txt',
          mimeType: 'text/plain',
          filename: `chat_${otherUser?.fullName || 'export'}_${exportDate.split('T')[0]}.txt`,
          content: txtContent,
        };
    }
  }
}

export default new ChatService();
