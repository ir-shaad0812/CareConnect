// ============================================
// MODERATION AUDIT LOG MODEL
// Tracks all moderation actions for compliance
// ============================================

import mongoose from 'mongoose';

const moderationLogSchema = new mongoose.Schema({
  // Action type
  action: {
    type: String,
    enum: [
      'user_blocked',
      'user_unblocked',
      'message_reported',
      'message_deleted',
      'user_reported',
      'conversation_archived',
      'conversation_muted',
      'content_flagged',
      'warning_issued',
      'suspension_issued',
      'ban_issued',
      'appeal_submitted',
      'appeal_resolved',
    ],
    required: true,
    index: true,
  },

  // Who performed the action
  performedBy: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ['careseeker', 'caregiver', 'admin', 'system'],
      required: true,
    },
    ipAddress: String,
    userAgent: String,
  },

  // Target of the action
  target: {
    type: {
      type: String,
      enum: ['user', 'message', 'conversation'],
      required: true,
    },
    id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    // Snapshot of target at time of action
    snapshot: mongoose.Schema.Types.Mixed,
  },

  // Related entities
  relatedEntities: {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
    },
    messageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
    },
    reportedUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },

  // Reason/details
  reason: {
    category: {
      type: String,
      enum: [
        'spam',
        'harassment',
        'inappropriate_content',
        'scam',
        'impersonation',
        'hate_speech',
        'violence',
        'privacy_violation',
        'other',
      ],
    },
    description: String,
    evidence: [String], // URLs to screenshots or content
  },

  // Outcome
  outcome: {
    status: {
      type: String,
      enum: ['pending', 'reviewed', 'actioned', 'dismissed', 'escalated'],
      default: 'pending',
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewedAt: Date,
    notes: String,
    actionTaken: String,
  },

  // Severity level
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'low',
  },

  // Metadata
  metadata: {
    source: {
      type: String,
      enum: ['user_report', 'automated', 'admin_action', 'system'],
      default: 'user_report',
    },
    platform: {
      type: String,
      enum: ['web', 'mobile', 'api'],
      default: 'web',
    },
    sessionId: String,
  },

  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
  collection: 'moderation_logs',
});

// Indexes for efficient querying
moderationLogSchema.index({ 'performedBy.userId': 1, createdAt: -1 });
moderationLogSchema.index({ 'target.type': 1, 'target.id': 1 });
moderationLogSchema.index({ 'outcome.status': 1, severity: 1 });
moderationLogSchema.index({ action: 1, createdAt: -1 });

// Static method to log a moderation action
moderationLogSchema.statics.logAction = async function({
  action,
  performedBy,
  target,
  relatedEntities = {},
  reason = {},
  severity = 'low',
  metadata = {},
}) {
  const log = new this({
    action,
    performedBy,
    target,
    relatedEntities,
    reason,
    severity,
    metadata,
  });

  await log.save();
  return log;
};

// Static method to get user's moderation history
moderationLogSchema.statics.getUserHistory = async function(userId, options = {}) {
  const { page = 1, limit = 20, action } = options;
  const skip = (page - 1) * limit;

  const query = {
    $or: [
      { 'performedBy.userId': userId },
      { 'target.id': userId, 'target.type': 'user' },
    ],
  };

  if (action) {
    query.action = action;
  }

  const [logs, total] = await Promise.all([
    this.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('performedBy.userId', 'fullName role')
      .populate('outcome.reviewedBy', 'fullName role')
      .lean(),
    this.countDocuments(query),
  ]);

  return {
    logs,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

// Static method to get pending reviews
moderationLogSchema.statics.getPendingReviews = async function(options = {}) {
  const { page = 1, limit = 20, severity } = options;
  const skip = (page - 1) * limit;

  const query = { 'outcome.status': 'pending' };
  if (severity) {
    query.severity = severity;
  }

  const [logs, total] = await Promise.all([
    this.find(query)
      .sort({ severity: -1, createdAt: 1 })
      .skip(skip)
      .limit(limit)
      .populate('performedBy.userId', 'fullName role')
      .populate('relatedEntities.conversationId')
      .populate('relatedEntities.reportedUserId', 'fullName role')
      .lean(),
    this.countDocuments(query),
  ]);

  return {
    logs,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

// Static method to resolve a moderation log
moderationLogSchema.statics.resolveLog = async function(logId, reviewerId, outcome) {
  const log = await this.findById(logId);
  if (!log) {
    throw new Error('Moderation log not found');
  }

  log.outcome = {
    ...log.outcome,
    status: outcome.status,
    reviewedBy: reviewerId,
    reviewedAt: new Date(),
    notes: outcome.notes,
    actionTaken: outcome.actionTaken,
  };

  await log.save();
  return log;
};

const ModerationLog = mongoose.model('ModerationLog', moderationLogSchema);

export default ModerationLog;
