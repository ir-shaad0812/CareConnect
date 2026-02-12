// ============================================
// BOOKING WORKFLOW LOG MODEL
// Idempotent worker orchestration tracking
// ============================================

import mongoose from 'mongoose';

export const BOOKING_WORKFLOW_EVENT = Object.freeze({
  BOOKING_CONFIRMED: 'booking.confirmed',
});

export const BOOKING_WORKFLOW_STATUS = Object.freeze({
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
});

const bookingWorkflowLogSchema = new mongoose.Schema(
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
    eventType: {
      type: String,
      enum: Object.values(BOOKING_WORKFLOW_EVENT),
      required: true,
      index: true,
    },
    idempotencyKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(BOOKING_WORKFLOW_STATUS),
      default: BOOKING_WORKFLOW_STATUS.PROCESSING,
      index: true,
    },
    attemptCount: {
      type: Number,
      default: 0,
    },
    source: {
      type: String,
      default: 'queue-worker',
    },
    triggerMetadata: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    result: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    error: {
      message: {
        type: String,
        default: null,
      },
      stack: {
        type: String,
        default: null,
      },
      at: {
        type: Date,
        default: null,
      },
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

bookingWorkflowLogSchema.index({ bookingId: 1, eventType: 1, createdAt: -1 });

const BookingWorkflowLog = mongoose.model('BookingWorkflowLog', bookingWorkflowLogSchema);

export default BookingWorkflowLog;
