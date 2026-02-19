// ============================================
// DISPUTE MODEL
// Ticket-based dispute resolution system
// ============================================

import mongoose from 'mongoose';

const disputeTimelineSchema = new mongoose.Schema({
  action: {
    type: String,
    required: true,
    enum: [
      'created',
      'status_changed',
      'message_sent',
      'evidence_added',
      'admin_note',
      'resolution_proposed',
      'resolved',
      'escalated',
      'reopened',
    ],
  },
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  message: {
    type: String,
    trim: true,
    maxlength: 2000,
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const disputeSchema = new mongoose.Schema({
  // Ticket number for display
  ticketNumber: {
    type: String,
    unique: true,
  },

  // The booking this dispute is about
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true,
  },

  // Who filed the dispute
  filedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },

  filedByRole: {
    type: String,
    enum: ['caregiver', 'careseeker'],
    required: true,
  },

  // The other party
  againstUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },

  // Dispute category
  category: {
    type: String,
    required: true,
    enum: [
      'service_quality',
      'payment_issue',
      'no_show',
      'safety_concern',
      'misconduct',
      'cancellation_dispute',
      'property_damage',
      'communication_issue',
      'schedule_dispute',
      'other',
    ],
  },

  // Reason / subject
  subject: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200,
  },

  // Detailed description
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 5000,
  },

  // Evidence / proof (uploaded files)
  evidence: [{
    url: { type: String, required: true },
    publicId: { type: String },
    type: { type: String, enum: ['image', 'document', 'video'] },
    name: { type: String },
    uploadedAt: { type: Date, default: Date.now },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  }],

  // Priority level
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium',
  },

  // Current status
  status: {
    type: String,
    enum: ['open', 'investigating', 'awaiting_response', 'resolved', 'dismissed', 'escalated'],
    default: 'open',
  },

  // Resolution details
  resolution: {
    type: {
      type: String,
      enum: ['refund', 'partial_refund', 'warning', 'ban', 'no_action', 'mediation', 'compensation'],
    },
    description: { type: String, trim: true, maxlength: 2000 },
    refundAmount: { type: Number, min: 0 },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    resolvedAt: { type: Date },
  },

  // Assigned admin
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },

  // Timeline of events
  timeline: [disputeTimelineSchema],

  // Admin internal notes (not visible to users)
  adminNotes: [{
    content: { type: String, required: true, trim: true },
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    createdAt: { type: Date, default: Date.now },
  }],

  // Messages between admin and users
  messages: [{
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    senderRole: { type: String, enum: ['admin', 'caregiver', 'careseeker'], required: true },
    content: { type: String, required: true, trim: true, maxlength: 2000 },
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    createdAt: { type: Date, default: Date.now },
  }],

  isDeleted: {
    type: Boolean,
    default: false,
  },

}, {
  timestamps: true,
});

// Auto-generate ticket number
disputeSchema.pre('save', async function (next) {
  if (!this.ticketNumber) {
    const count = await this.constructor.countDocuments();
    this.ticketNumber = `DSP-${String(count + 1).padStart(5, '0')}`;
  }

  // Add creation timeline entry
  if (this.isNew) {
    this.timeline.push({
      action: 'created',
      performedBy: this.filedBy,
      message: 'Dispute ticket created',
    });
  }

  next();
});

// Indexes
disputeSchema.index({ status: 1, createdAt: -1 });
disputeSchema.index({ filedBy: 1, status: 1 });
disputeSchema.index({ againstUser: 1, status: 1 });
disputeSchema.index({ bookingId: 1 });
disputeSchema.index({ assignedTo: 1, status: 1 });
disputeSchema.index({ category: 1, status: 1 });
disputeSchema.index({ priority: 1, status: 1 });

const Dispute = mongoose.model('Dispute', disputeSchema);

export default Dispute;
