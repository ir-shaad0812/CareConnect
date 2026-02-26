// ============================================
// MESSAGE MODEL
// Handles individual chat messages
// ============================================

import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    // Reference to the conversation
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true,
    },

    // Sender of the message
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // Receiver of the message
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // Message type
    messageType: {
      type: String,
      enum: ['text', 'image', 'file', 'voice', 'system'],
      default: 'text',
    },

    // Message content
    content: {
      type: String,
      required: function() {
        return this.messageType === 'text' || this.messageType === 'system';
      },
      maxlength: [5000, 'Message cannot exceed 5000 characters'],
    },

    // Attachments for file/image messages
    attachments: [{
      type: {
        type: String,
        enum: ['image', 'document', 'audio'],
      },
      url: {
        type: String,
        required: true,
      },
      name: String,
      size: Number, // in bytes
      mimeType: String,
    }],

    // Message status
    status: {
      type: String,
      enum: ['sent', 'delivered', 'read', 'failed'],
      default: 'sent',
    },

    // Retry tracking for failed messages
    retryInfo: {
      attempts: { type: Number, default: 0 },
      lastAttempt: { type: Date, default: null },
      errorCode: { type: String, default: null },
      errorMessage: { type: String, default: null },
    },

    // Timestamps for delivery and read
    deliveredAt: Date,
    readAt: Date,

    // Soft delete for individual users
    deletedFor: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],

    // Message metadata
    metadata: {
      // For system messages
      systemMessageType: {
        type: String,
        enum: [
          'booking_approved',
          'booking_cancelled',
          'booking_completed',
          'service_reminder',
          'chat_started',
          // New system message types for chat access control
          'chat_unlocked',
          'chat_restricted',
          'chat_closed',
          'payment_received',
          'deadline_warning',
          'booking_confirmed',
        ],
      },
      // Reference to related booking
      bookingId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Booking',
      },
      // For reply functionality (future enhancement)
      replyTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message',
      },
    },

    // Reported message flag
    reported: {
      isReported: { type: Boolean, default: false },
      reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      reportedAt: Date,
      reason: String,
      status: {
        type: String,
        enum: ['pending', 'reviewed', 'dismissed', 'action_taken'],
        default: 'pending',
      },
    },

    // Emoji reactions on messages
    reactions: [{
      emoji: { type: String, required: true },
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      userName: { type: String, required: true },
      createdAt: { type: Date, default: Date.now },
    }],

    // Pinned message flag
    pinned: {
      isPinned: { type: Boolean, default: false },
      pinnedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      pinnedAt: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
messageSchema.index({ conversationId: 1, createdAt: -1 });
messageSchema.index({ senderId: 1, createdAt: -1 });
messageSchema.index({ receiverId: 1, status: 1 });
messageSchema.index({ 'reported.isReported': 1, 'reported.status': 1 });
messageSchema.index({ 'pinned.isPinned': 1, conversationId: 1 });

// Text index for message content search (enables $text queries)
messageSchema.index({ content: 'text' }, { 
  weights: { content: 1 },
  name: 'message_content_text_index'
});

// Static method to get messages for a conversation
messageSchema.statics.getConversationMessages = async function(
  conversationId,
  userId,
  page = 1,
  limit = 50
) {
  const skip = (page - 1) * limit;
  
  const messages = await this.find({
    conversationId,
    deletedFor: { $ne: userId },
  })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('senderId', 'fullName avatar')
    .populate('receiverId', 'fullName avatar')
    .lean();

  return messages.reverse();
};

// Static method to mark messages as read
messageSchema.statics.markAsRead = async function(conversationId, userId) {
  const now = new Date();
  
  return this.updateMany(
    {
      conversationId,
      receiverId: userId,
      status: { $ne: 'read' },
    },
    {
      $set: {
        status: 'read',
        readAt: now,
      },
    }
  );
};

// Static method to mark messages as delivered
messageSchema.statics.markAsDelivered = async function(conversationId, userId) {
  const now = new Date();
  
  return this.updateMany(
    {
      conversationId,
      receiverId: userId,
      status: 'sent',
    },
    {
      $set: {
        status: 'delivered',
        deliveredAt: now,
      },
    }
  );
};

// Static method to get unread count for a user
messageSchema.statics.getUnreadCount = async function(userId) {
  return this.countDocuments({
    receiverId: userId,
    status: { $ne: 'read' },
    deletedFor: { $ne: userId },
  });
};

// Static method to search messages
messageSchema.statics.searchMessages = async function(conversationId, userId, query) {
  return this.find({
    conversationId,
    deletedFor: { $ne: userId },
    messageType: 'text',
    content: { $regex: query, $options: 'i' },
  })
    .sort({ createdAt: -1 })
    .limit(50)
    .populate('senderId', 'fullName avatar')
    .lean();
};

// Static method to get pinned messages
messageSchema.statics.getPinnedMessages = async function(conversationId, userId) {
  return this.find({
    conversationId,
    deletedFor: { $ne: userId },
    'pinned.isPinned': true,
  })
    .sort({ 'pinned.pinnedAt': -1 })
    .populate('senderId', 'fullName avatar')
    .lean();
};

// Static method to toggle pin on a message
messageSchema.statics.togglePin = async function(messageId, userId) {
  const message = await this.findById(messageId);
  if (!message) throw new Error('Message not found');

  if (message.pinned?.isPinned) {
    message.pinned = { isPinned: false, pinnedBy: null, pinnedAt: null };
  } else {
    message.pinned = { isPinned: true, pinnedBy: userId, pinnedAt: new Date() };
  }
  await message.save();
  return message;
};

// Static method to add reaction
messageSchema.statics.addReaction = async function(messageId, userId, userName, emoji) {
  const message = await this.findById(messageId);
  if (!message) throw new Error('Message not found');

  // Remove existing reaction from same user with same emoji
  message.reactions = message.reactions.filter(
    r => !(r.userId.toString() === userId.toString() && r.emoji === emoji)
  );

  // Add new reaction
  message.reactions.push({ emoji, userId, userName, createdAt: new Date() });
  await message.save();

  return message.populate('senderId', 'fullName avatar');
};

// Static method to remove reaction
messageSchema.statics.removeReaction = async function(messageId, userId, emoji) {
  const message = await this.findById(messageId);
  if (!message) throw new Error('Message not found');

  message.reactions = message.reactions.filter(
    r => !(r.userId.toString() === userId.toString() && r.emoji === emoji)
  );
  await message.save();

  return message.populate('senderId', 'fullName avatar');
};

const Message = mongoose.model('Message', messageSchema);

export default Message;
