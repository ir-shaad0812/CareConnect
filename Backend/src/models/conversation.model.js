// ============================================
// CONVERSATION MODEL
// Handles chat conversations between users
// ============================================

import mongoose from 'mongoose';

const conversationSchema = new mongoose.Schema(
  {
    // Participants in the conversation (always 2 for 1-to-1 chat)
    participants: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    }],

    // The booking that enabled this conversation (optional for direct chat)
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: false,
    },

    // Conversation type
    type: {
      type: String,
      enum: ['booking_chat', 'direct_chat'],
      default: 'direct_chat',
    },

    // Last message preview
    lastMessage: {
      content: String,
      senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      messageType: {
        type: String,
        enum: ['text', 'image', 'file', 'voice', 'system'],
      },
      createdAt: Date,
    },

    // Unread count per participant
    unreadCount: {
      type: Map,
      of: Number,
      default: new Map(),
    },

    // Conversation status (strict access control)
    status: {
      type: String,
      enum: ['locked', 'active', 'restricted', 'archived', 'closed'],
      default: 'locked', // Start locked until payment verified
    },

    // Access control tracking for chat lifecycle
    accessControl: {
      // When chat was first unlocked (payment verified)
      chatUnlockedAt: { type: Date, default: null },
      // When status last changed
      lastStatusChange: { type: Date, default: null },
      // Human-readable reason for current status
      statusReason: { type: String, default: null },
      // When payment was verified for this chat
      paymentVerifiedAt: { type: Date, default: null },
      // Who changed the status (for admin actions)
      changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    },

    // Block status
    blockedBy: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      blockedAt: Date,
      reason: String,
    }],

    // Admin monitoring (for dispute resolution)
    adminAccess: {
      enabled: { type: Boolean, default: false },
      enabledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      enabledAt: Date,
      reason: String,
    },

    // Typing indicators (transient, stored in Redis in production)
    typingUsers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],

    // Conversation metadata
    metadata: {
      // Total message count
      messageCount: { type: Number, default: 0 },
      // First message timestamp
      firstMessageAt: Date,
      // Last activity timestamp
      lastActivityAt: Date,
      // Chat enabled/disabled
      chatEnabled: { type: Boolean, default: true },
      // Reason for disabled chat
      disabledReason: String,
    },

    // Conversation label/tag for organization
    label: {
      type: String,
      enum: ['inquiry', 'booked', 'active', 'completed', null],
      default: null,
    },

    // Muted notifications per user
    mutedBy: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],

    // Pinned messages (store IDs for quick access)
    pinnedMessages: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
    }],
  },
  {
    timestamps: true,
  }
);

// Compound index for finding conversations by participants
conversationSchema.index({ participants: 1 });
// Unique index on bookingId - only enforced when bookingId exists and is not null
conversationSchema.index(
  { bookingId: 1 },
  {
    unique: true,
    partialFilterExpression: { bookingId: { $type: 'objectId' } }
  }
);
conversationSchema.index({ 'lastMessage.createdAt': -1 });
conversationSchema.index({ status: 1, 'metadata.lastActivityAt': -1 });
// Index for finding direct conversations between two users
conversationSchema.index({ participants: 1, type: 1 });

// Virtual for getting the other participant
conversationSchema.methods.getOtherParticipant = function(currentUserId) {
  return this.participants.find(
    p => p.toString() !== currentUserId.toString()
  );
};

// Check if a user is blocked in this conversation
conversationSchema.methods.isBlockedBy = function(userId) {
  return this.blockedBy.some(
    block => block.userId.toString() === userId.toString()
  );
};

// Check if chat is enabled for this conversation
conversationSchema.methods.isChatEnabled = function() {
  return this.status === 'active' && 
         this.metadata.chatEnabled && 
         this.blockedBy.length === 0;
};

// Static method to find or create conversation
conversationSchema.statics.findOrCreateByBooking = async function(bookingId, participants) {
  let conversation = await this.findOne({ bookingId });
  
  if (!conversation) {
    conversation = await this.create({
      bookingId,
      participants,
      type: 'booking_chat',
      unreadCount: new Map(participants.map(p => [p.toString(), 0])),
      metadata: {
        firstMessageAt: new Date(),
        lastActivityAt: new Date(),
      },
    });
  }
  
  return conversation;
};

// Static method to find or create a direct conversation between two users
conversationSchema.statics.findOrCreateDirect = async function(userId1, userId2) {
  // Sort participant IDs for consistent lookup
  const participants = [userId1, userId2].sort((a, b) => a.toString().localeCompare(b.toString()));
  
  // Look for existing direct conversation
  let conversation = await this.findOne({
    participants: { $all: participants, $size: 2 },
    type: 'direct_chat',
  });
  
  if (!conversation) {
    conversation = await this.create({
      participants,
      type: 'direct_chat',
      status: 'active',
      unreadCount: new Map(participants.map(p => [p.toString(), 0])),
      metadata: {
        firstMessageAt: new Date(),
        lastActivityAt: new Date(),
        chatEnabled: true,
        disabledReason: null,
      },
      accessControl: {
        chatUnlockedAt: new Date(),
        paymentVerifiedAt: null,
        lastStatusChange: new Date(),
        statusReason: 'direct_chat_active',
      },
    });
  } else if (conversation.status === 'locked') {
    // Legacy direct conversations may still be locked from older defaults.
    conversation.status = 'active';
    conversation.metadata = {
      ...conversation.metadata,
      chatEnabled: true,
      disabledReason: null,
      lastActivityAt: conversation.metadata?.lastActivityAt || new Date(),
    };
    conversation.accessControl = {
      ...conversation.accessControl,
      chatUnlockedAt: conversation.accessControl?.chatUnlockedAt || new Date(),
      paymentVerifiedAt: null,
      lastStatusChange: new Date(),
      statusReason: 'direct_chat_active',
    };
    await conversation.save();
  }
  
  return conversation;
};

// Static method to get user's conversations
conversationSchema.statics.getUserConversations = async function(
  userId,
  page = 1,
  limit = 20,
  status = 'active'
) {
  const skip = (page - 1) * limit;

  const query = {
    participants: userId,
    'blockedBy.userId': { $ne: userId },
  };

  if (status === 'active') {
    // "active" list in UI means non-archived conversations (including read-only closed).
    query.status = { $in: ['active', 'locked', 'restricted', 'closed'] };
  } else if (status !== 'all') {
    query.status = status;
  }
  
  const conversations = await this.find(query)
    .sort({ 'lastMessage.createdAt': -1, updatedAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('participants', 'fullName avatar role')
    .populate('bookingId', 'bookingNumber serviceType status schedule')
    .lean();

  // Add other participant info
  return conversations.map(conv => ({
    ...conv,
    otherParticipant: conv.participants.find(
      p => p._id.toString() !== userId.toString()
    ),
    myUnreadCount: conv.unreadCount?.get?.(userId.toString()) || 
                   conv.unreadCount?.[userId.toString()] || 0,
  }));
};

// Static method to increment unread count
conversationSchema.statics.incrementUnread = async function(conversationId, recipientId) {
  const conversation = await this.findById(conversationId);
  if (!conversation) return null;
  
  const currentCount = conversation.unreadCount.get(recipientId.toString()) || 0;
  conversation.unreadCount.set(recipientId.toString(), currentCount + 1);
  conversation.metadata.lastActivityAt = new Date();
  
  await conversation.save();
  return conversation;
};

// Static method to reset unread count
conversationSchema.statics.resetUnread = async function(conversationId, userId) {
  return this.findByIdAndUpdate(
    conversationId,
    {
      $set: {
        [`unreadCount.${userId}`]: 0,
      },
    },
    { new: true }
  );
};

// Static method to update last message
conversationSchema.statics.updateLastMessage = async function(conversationId, message) {
  return this.findByIdAndUpdate(
    conversationId,
    {
      $set: {
        lastMessage: {
          content: message.messageType === 'text' ? message.content : `[${message.messageType}]`,
          senderId: message.senderId,
          messageType: message.messageType,
          createdAt: message.createdAt,
        },
        'metadata.lastActivityAt': new Date(),
      },
      $inc: {
        'metadata.messageCount': 1,
      },
    },
    { new: true }
  );
};

// Static method to check if conversation exists for booking
conversationSchema.statics.existsForBooking = async function(bookingId) {
  return this.exists({ bookingId });
};

const Conversation = mongoose.model('Conversation', conversationSchema);

export default Conversation;
