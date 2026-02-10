// ============================================
// BOOKING DAY MODEL
// Daily execution truth layer for each booking
// ============================================

import mongoose from 'mongoose';

export const BOOKING_DAY_STATUS = Object.freeze({
  UPCOMING: 'upcoming',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  MISSED: 'missed',
});

const bookingDaySchema = new mongoose.Schema(
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
    dayNumber: {
      type: Number,
      required: true,
      min: 1,
    },
    timezone: {
      type: String,
      default: 'UTC',
      index: true,
    },

    // Canonical UTC day key.
    serviceDateUtc: {
      type: Date,
      required: true,
      index: true,
    },

    // Human-readable local date key in booking timezone (YYYY-MM-DD).
    serviceDateLocal: {
      type: String,
      required: true,
      index: true,
    },

    scheduledStartUtc: {
      type: Date,
      required: true,
    },
    scheduledEndUtc: {
      type: Date,
      required: true,
    },

    status: {
      type: String,
      enum: Object.values(BOOKING_DAY_STATUS),
      default: BOOKING_DAY_STATUS.UPCOMING,
      index: true,
    },

    // Runtime execution timestamps
    checkInAt: {
      type: Date,
      default: null,
    },
    checkOutAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    missedAt: {
      type: Date,
      default: null,
    },

    // Optional execution metadata
    checkInMeta: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    checkOutMeta: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    // Reference to legacy booking tracking log date/status if needed
    trackingSnapshot: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    source: {
      type: String,
      default: 'booking_workflow',
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

bookingDaySchema.index(
  { bookingId: 1, serviceDateLocal: 1 },
  { unique: true },
);

bookingDaySchema.index({ bookingId: 1, dayNumber: 1 }, { unique: true });
bookingDaySchema.index({ caregiverId: 1, status: 1, serviceDateUtc: 1 });
bookingDaySchema.index({ careSeekerId: 1, status: 1, serviceDateUtc: 1 });

const BookingDay = mongoose.model('BookingDay', bookingDaySchema);

export default BookingDay;
