// ============================================
// BOOKING STATE TRANSITION LOG MODEL
// Immutable audit trail for booking status changes
// ============================================

import mongoose from 'mongoose';

const bookingStateTransitionSchema = new mongoose.Schema(
  {
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
      index: true,
    },
    bookingNumber: {
      type: String,
      index: true,
    },
    fromStatus: {
      type: String,
      required: true,
      index: true,
    },
    toStatus: {
      type: String,
      required: true,
      index: true,
    },
    reason: {
      type: String,
      default: '',
      trim: true,
      maxlength: 500,
    },
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    actorRole: {
      type: String,
      default: 'system',
      index: true,
    },
    source: {
      type: String,
      default: 'service-layer',
      index: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    transitionedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

bookingStateTransitionSchema.index({ bookingId: 1, transitionedAt: -1 });
bookingStateTransitionSchema.index({ fromStatus: 1, toStatus: 1, transitionedAt: -1 });

// Immutable audit records: disallow updates/deletes.
bookingStateTransitionSchema.pre('save', function preventResave(next) {
  if (!this.isNew) {
    return next(new Error('Booking state transition records are immutable'));
  }
  return next();
});

const rejectImmutableMutation = function rejectImmutableMutation(next) {
  return next(new Error('Booking state transition records are immutable'));
};

bookingStateTransitionSchema.pre('updateOne', rejectImmutableMutation);
bookingStateTransitionSchema.pre('updateMany', rejectImmutableMutation);
bookingStateTransitionSchema.pre('findOneAndUpdate', rejectImmutableMutation);
bookingStateTransitionSchema.pre('findOneAndDelete', rejectImmutableMutation);
bookingStateTransitionSchema.pre('deleteOne', rejectImmutableMutation);
bookingStateTransitionSchema.pre('deleteMany', rejectImmutableMutation);

const BookingStateTransition = mongoose.model(
  'BookingStateTransition',
  bookingStateTransitionSchema,
);

export default BookingStateTransition;
