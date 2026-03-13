import mongoose from 'mongoose';

/**
 * UserActivity Model
 * Comprehensive tracking of all user actions on the platform
 * Used for admin analytics, audit logs, and activity monitoring
 */
const userActivitySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    // Activity categorization
    category: {
      type: String,
      enum: ['auth', 'booking', 'message', 'note', 'document', 'profile', 'payment', 'job', 'dispute', 'review', 'system'],
      required: true,
      index: true,
    },
    action: {
      type: String,
      enum: [
        // Auth actions
        'login', 'logout', 'password_reset', 'password_change', 'account_verify', 'session_refresh',
        // Booking actions
        'booking_create', 'booking_confirm', 'booking_cancel', 'booking_complete', 'booking_reschedule', 'booking_view',
        // Message actions
        'message_send', 'message_read', 'conversation_start', 'conversation_view',
        // Note actions
        'note_create', 'note_update', 'note_delete', 'note_share', 'note_view', 'edit_request', 'edit_approve', 'edit_reject',
        // Document actions
        'document_upload', 'document_verify', 'document_reject', 'document_view',
        // Profile actions
        'profile_update', 'avatar_change', 'availability_update', 'rates_update',
        // Payment actions
        'payment_initiate', 'payment_complete', 'payment_fail', 'refund_request', 'refund_complete',
        // Job actions
        'job_view', 'job_apply', 'job_save', 'job_create', 'job_update',
        // Dispute actions
        'dispute_create', 'dispute_update', 'dispute_message', 'dispute_resolve',
        // Review actions
        'review_submit', 'review_view',
        // System actions
        'session_start', 'page_view', 'search_perform', 'notification_click',
      ],
      required: true,
      index: true,
    },
    // Related entity references
    relatedEntity: {
      type: {
        type: String,
        enum: ['booking', 'message', 'note', 'document', 'job', 'dispute', 'review', 'user', 'payment', 'conversation'],
      },
      id: {
        type: mongoose.Schema.Types.ObjectId,
      },
    },
    // Metadata for additional context
    metadata: {
      // Device info
      userAgent: { type: String },
      browser: { type: String },
      os: { type: String },
      device: { type: String },
      // Location info
      ip: { type: String },
      country: { type: String },
      city: { type: String },
      coordinates: {
        lat: { type: Number },
        lng: { type: Number },
      },
      // Action-specific metadata
      description: { type: String },
      previousValue: { type: mongoose.Schema.Types.Mixed },
      newValue: { type: mongoose.Schema.Types.Mixed },
      duration: { type: Number }, // For page views, session time
      success: { type: Boolean },
      errorMessage: { type: String },
      amount: { type: Number }, // For payment-related actions
      // Search/filter context
      searchQuery: { type: String },
      filters: { type: mongoose.Schema.Types.Mixed },
      // Target user (for messages, reviews, etc.)
      targetUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    },
    // Session tracking
    sessionId: {
      type: String,
      index: true,
    },
    // User role at time of action
    userRole: {
      type: String,
      enum: ['admin', 'caregiver', 'careseeker'],
    },
    // Status of the action
    status: {
      type: String,
      enum: ['success', 'failed', 'pending'],
      default: 'success',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound indexes for efficient queries
userActivitySchema.index({ userId: 1, createdAt: -1 });
userActivitySchema.index({ category: 1, action: 1, createdAt: -1 });
userActivitySchema.index({ createdAt: -1 });
userActivitySchema.index({ 'relatedEntity.type': 1, 'relatedEntity.id': 1 });
userActivitySchema.index({ userRole: 1, category: 1, createdAt: -1 });

// TTL index — auto-delete activities older than 90 days
userActivitySchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

/**
 * Static method to log an activity
 */
userActivitySchema.statics.log = async function(data) {
  try {
    const activity = new this(data);
    await activity.save();
    return activity;
  } catch (error) {
    console.error('Failed to log activity:', error);
    // Don't throw - activity logging should be non-blocking
    return null;
  }
};

/**
 * Get activity summary for a user
 */
userActivitySchema.statics.getUserSummary = async function(userId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return this.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId), createdAt: { $gte: startDate } } },
    {
      $group: {
        _id: '$category',
        count: { $sum: 1 },
        lastActivity: { $max: '$createdAt' },
        actions: { $addToSet: '$action' },
      },
    },
    { $sort: { count: -1 } },
  ]);
};

/**
 * Get platform-wide activity stats
 */
userActivitySchema.statics.getPlatformStats = async function(days = 7) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const [byCategoryDaily, byActionCount, activeUsers, peakHours] = await Promise.all([
    // Activity by category per day
    this.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            category: '$category',
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.date': 1 } },
    ]),
    // Top actions
    this.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $group: { _id: '$action', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 15 },
    ]),
    // Active unique users per day
    this.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          uniqueUsers: { $addToSet: '$userId' },
          totalActivities: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 1,
          activeUsers: { $size: '$uniqueUsers' },
          totalActivities: 1,
        },
      },
      { $sort: { _id: 1 } },
    ]),
    // Peak activity hours
    this.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: { $hour: '$createdAt' },
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]),
  ]);

  return { byCategoryDaily, byActionCount, activeUsers, peakHours };
};

/**
 * Get recent activities with user info
 */
userActivitySchema.statics.getRecentWithUsers = async function(limit = 50, filters = {}) {
  const match = {};
  
  if (filters.category) match.category = filters.category;
  if (filters.action) match.action = filters.action;
  if (filters.userRole) match.userRole = filters.userRole;
  if (filters.startDate) match.createdAt = { $gte: new Date(filters.startDate) };
  if (filters.endDate) {
    match.createdAt = match.createdAt || {};
    match.createdAt.$lte = new Date(filters.endDate);
  }

  return this.aggregate([
    { $match: match },
    { $sort: { createdAt: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: 'users',
        localField: 'userId',
        foreignField: '_id',
        as: 'user',
        pipeline: [{ $project: { fullName: 1, email: 1, avatar: 1, role: 1 } }],
      },
    },
    { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
  ]);
};

const UserActivity = mongoose.model('UserActivity', userActivitySchema);

export default UserActivity;
