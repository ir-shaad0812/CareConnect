import mongoose from 'mongoose';

const FEEDBACK_TYPES = ['bug_report', 'feature_request', 'complaint', 'general'];
const FEEDBACK_STATUSES = ['submitted', 'pending', 'in_progress', 'resolved'];

const feedbackAuditSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      enum: ['submitted', 'status_updated'],
      required: true,
    },
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    actorRole: {
      type: String,
      required: true,
    },
    note: {
      type: String,
      maxlength: 500,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false },
);

const feedbackSchema = new mongoose.Schema(
  {
    feedbackId: {
      type: String,
      unique: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: FEEDBACK_TYPES,
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 180,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000,
    },
    screenshot: {
      url: { type: String, default: null },
      publicId: { type: String, default: null },
    },
    status: {
      type: String,
      enum: FEEDBACK_STATUSES,
      default: 'submitted',
      index: true,
    },
    adminReview: {
      updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      updatedAt: Date,
      note: {
        type: String,
        maxlength: 500,
      },
    },
    auditLog: {
      type: [feedbackAuditSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

feedbackSchema.index({ userId: 1, createdAt: -1 });
feedbackSchema.index({ status: 1, createdAt: -1 });
feedbackSchema.index({ type: 1, createdAt: -1 });

function generateFeedbackId() {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `FBK-${stamp}-${rand}`;
}

feedbackSchema.pre('save', function feedbackIdHook(next) {
  if (this.isNew && !this.feedbackId) {
    this.feedbackId = generateFeedbackId();
  }
  next();
});

const Feedback = mongoose.model('Feedback', feedbackSchema);

export { FEEDBACK_TYPES, FEEDBACK_STATUSES };
export default Feedback;
