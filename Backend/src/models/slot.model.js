// ============================================
// SLOT MODEL — Sprint A
// Atomic unit of a booking. One slot per calendar day.
// All refund / payment / attendance logic operates at this level.
// ============================================

import mongoose from 'mongoose';

export const SLOT_STATUS = {
  PENDING: 'pending',         // Created, not yet started
  CONFIRMED: 'confirmed',     // Caregiver confirmed availability
  IN_PROGRESS: 'in_progress', // Check-in recorded
  COMPLETED: 'completed',     // Check-out recorded
  CANCELLED: 'cancelled',     // Cancelled before start
  NO_SHOW: 'no_show',         // Caregiver did not appear
  DISPUTED: 'disputed',
};

export const REFUND_ELIGIBILITY = {
  FULL: 'full',       // 100%
  HIGH: 'high',       // 70%
  LOW: 'low',         // 30%
  NONE: 'none',       // 0% (started/completed)
};

const slotSchema = new mongoose.Schema({
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true,
    index: true,
  },

  careSeekerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },

  caregiverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },

  // 1-based sequence within a booking (1, 2, 3, …)
  slotNumber: {
    type: Number,
    required: true,
  },

  // Scheduled window for THIS slot (one calendar day)
  scheduledStart: {
    type: Date,
    required: true,
    index: true,
  },
  scheduledEnd: {
    type: Date,
    required: true,
  },

  status: {
    type: String,
    enum: Object.values(SLOT_STATUS),
    default: SLOT_STATUS.PENDING,
    index: true,
  },

  // ── Financials (per-slot allocation) ─────────────────────────────
  amountAllocated: { type: Number, required: true, min: 0 },
  amountPaid:      { type: Number, default: 0, min: 0 },
  amountRefunded:  { type: Number, default: 0, min: 0 },
  amountReleased:  { type: Number, default: 0, min: 0 }, // released to caregiver wallet
  currency:        { type: String, default: 'NPR' },

  // Computed at cancel time — set by refund engine (Sprint B)
  refundEligibility: {
    type: String,
    enum: Object.values(REFUND_ELIGIBILITY),
    default: REFUND_ELIGIBILITY.FULL,
  },

  // ── Availability confirmation (Sprint C) ─────────────────────────
  availabilityConfirmed: {
    status: {
      type: String,
      enum: ['pending', 'yes', 'no', 'no_response'],
      default: 'pending',
    },
    respondedAt: Date,
    askedAt: Date,
  },

  // ── Attendance (Sprint E OTP flow) ───────────────────────────────
  attendance: {
    checkInOtpHash: String,   // bcrypt hash of 6-digit OTP
    checkInOtpExpiresAt: Date,
    checkInAt: Date,
    checkInGps: {
      type: { type: String, enum: ['Point'] },
      coordinates: [Number],
    },
    checkOutAt: Date,
    checkOutGps: {
      type: { type: String, enum: ['Point'] },
      coordinates: [Number],
    },
    verifiedBy: { type: String, enum: ['otp', 'gps', 'manual'] },
  },

  // ── Cancellation record ───────────────────────────────────────────
  cancellation: {
    cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    cancelledByRole: { type: String, enum: ['careseeker', 'caregiver', 'admin', 'system'] },
    reason: String,
    cancelledAt: Date,
    refundAmount: Number,
    refundPercentage: Number,
  },

  completedAt: Date,
}, {
  timestamps: true,
});

// Compound indexes for common queries
slotSchema.index({ bookingId: 1, slotNumber: 1 }, { unique: true });
slotSchema.index({ caregiverId: 1, scheduledStart: 1 });
slotSchema.index({ status: 1, scheduledStart: 1 });

// ── Methods ────────────────────────────────────────────────────────
slotSchema.methods.isFuture = function () {
  return new Date() < new Date(this.scheduledStart);
};

slotSchema.methods.isStarted = function () {
  return new Date() >= new Date(this.scheduledStart);
};

slotSchema.methods.hoursUntilStart = function () {
  const now = Date.now();
  const start = new Date(this.scheduledStart).getTime();
  return (start - now) / (1000 * 60 * 60);
};

slotSchema.methods.isRefundable = function () {
  const nonRefundable = [SLOT_STATUS.COMPLETED, SLOT_STATUS.CANCELLED, SLOT_STATUS.IN_PROGRESS];
  return !nonRefundable.includes(this.status);
};

const Slot = mongoose.model('Slot', slotSchema);
export default Slot;
