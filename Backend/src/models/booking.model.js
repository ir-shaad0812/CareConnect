// ============================================
// BOOKING MODEL
// Handles booking/scheduling between caregivers and care seekers
// ============================================

import mongoose from "mongoose";
import {
  STATE_TRANSITIONS,
  SLOT_BLOCKING_STATUSES,
} from "../constants/booking.constants.js";

const bookingSchema = new mongoose.Schema(
  {
    // Unique booking reference number
    bookingNumber: {
      type: String,
      unique: true,
      required: true,
    },

    // Care seeker who made the booking
    careSeekerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Caregiver providing the service
    caregiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Care recipient details (from care seeker's profile)
    careRecipient: {
      name: String,
      relationship: String,
      age: Number,
      gender: String,
      careType: {
        type: String,
        enum: [
          "elderly",
          "child",
          "special_needs",
          "disability",
          "post_surgery",
        ],
      },
      specialNeeds: [String],
      medicalConditions: [String],
      notes: String,
    },

    // Service type
    serviceType: {
      type: String,
      enum: [
        "elderly_care",
        "child_care",
        "special_needs",
        "disability_care",
        "post_surgery",
        "companionship",
        "respite_care",
        "palliative_care",
        "alzheimers_care",
        "dementia_care",
        "physical_therapy",
        "mental_health",
        "live_in_care",
        "overnight_care",
      ],
      required: true,
    },

    // Booking type
    bookingType: {
      type: String,
      enum: ["one_time", "recurring"],
      default: "one_time",
    },

    // Booking status
    status: {
      type: String,
      enum: [
        "reserved",
        "pending",
        "accepted",
        "agreement_pending",
        "payment_pending",
        "confirmed",
        "active",
        "in_progress",
        "completed",
        "cancelled",
        "disputed",
        "rejected",
        "expired",
      ],
      default: "reserved",
    },

    // ============================================
    // RESERVATION SYSTEM FIELDS
    // ============================================

    // When reservation expires (slot released if not submitted)
    reservationExpiry: {
      type: Date,
      index: true,
    },

    // When reservation was created
    reservedAt: {
      type: Date,
    },

    // Number of times reservation was extended
    extensionCount: {
      type: Number,
      default: 0,
    },

    // Caregiver acceptance
    caregiverAcceptance: {
      status: {
        type: String,
        enum: ["pending", "accepted", "rejected"],
        default: "pending",
      },
      respondedAt: Date,
      notes: String,
    },

    // Schedule details
    schedule: {
      startDate: {
        type: Date,
        required: true,
      },
      endDate: {
        type: Date,
        required: true,
      },
      startTime: {
        type: String,
        required: true,
      },
      endTime: {
        type: String,
        required: true,
      },
      timezone: {
        type: String,
        default: "Asia/Kathmandu",
      },
      // For recurring bookings
      recurringPattern: {
        frequency: {
          type: String,
          enum: ["daily", "weekly", "monthly"],
        },
        daysOfWeek: [Number], // 0-6 (Sunday-Saturday)
        endDate: Date,
      },
    },

    // Duration type
    durationType: {
      type: String,
      enum: [
        "hourly",
        "half_day",
        "daily",
        "full_day",
        "weekly",
        "monthly",
        "long_term",
      ],
      required: true,
    },

    // Location for service
    location: {
      address: {
        type: String,
        required: true,
      },
      city: String,
      state: String,
      zipCode: String,
      coordinates: {
        type: {
          type: String,
          enum: ["Point"],
          default: "Point",
        },
        coordinates: {
          type: [Number], // [longitude, latitude]
          default: [0, 0],
        },
      },
      instructions: String, // Special instructions for finding location
    },

    // Pricing details
    pricing: {
      rateType: {
        type: String,
        enum: ["hourly", "daily", "weekly", "monthly"],
        required: true,
      },
      rate: {
        type: Number,
        required: true,
      },
      totalHours: Number,
      subtotal: {
        type: Number,
        required: true,
      },
      platformFee: {
        type: Number,
        default: 0,
      },
      platformFeePercentage: {
        type: Number,
        default: 10, // 10% platform fee
      },
      taxes: {
        type: Number,
        default: 0,
      },
      total: {
        type: Number,
        required: true,
      },
      currency: {
        type: String,
        default: "NPR",
      },
    },

    // Agreement authority for trust-first operations
    agreement: {
      agreementId: {
        type: String,
      },
      status: {
        type: String,
        enum: ["pending", "accepted", "rejected", "revoked"],
        default: "pending",
      },
      accepted: {
        type: Boolean,
        default: false,
      },
      acceptedAt: Date,
      pdfUrl: String,
      version: {
        type: String,
        default: "v1",
      },
      // Rich agreement content (JSON) auto-generated when caregiver accepts.
      // Stored as Mixed so the full nested structure is preserved without
      // requiring a deeply-nested sub-schema.
      content: {
        type: mongoose.Schema.Types.Mixed,
        default: null,
      },
      // Per-party acceptance tracking (both must accept before payment)
      seekerAccepted: {
        type: Boolean,
        default: false,
      },
      caregiverAccepted: {
        type: Boolean,
        default: false,
      },
      seekerAcceptedAt: {
        type: Date,
        default: null,
      },
      caregiverAcceptedAt: {
        type: Date,
        default: null,
      },
    },

    // Payment information (legacy fields retained for backward compatibility)
    payment: {
      status: {
        type: String,
        enum: ["pending", "held", "released", "refunded", "partially_refunded", "failed"],
        default: "pending",
      },
      method: {
        type: String,
        enum: ["khalti", "esewa", "bank_transfer", "cash", "card", "stripe"],
      },
      transactionId: String,
      paidAt: Date,
      releasedAt: Date,
      escrowHeld: {
        type: Boolean,
        default: false,
      },
    },

    // ============================================
    // SPRINT-05: Strict Payment State Management
    // ============================================

    // Separated payment status (independent of booking status)
    // Note: Index defined via schema.index() for query optimization
    paymentStatus: {
      type: String,
      enum: [
        "unpaid",
        "payment_pending",
        "partially_paid",
        "fully_paid",
        "refunded",
        "partially_refunded",
        "cancelled",
        "expired",
      ],
      default: "unpaid",
    },

    // Total amount for the booking (set from pricing.total)
    totalAmount: {
      type: Number,
      default: 0,
    },

    // Total amount paid so far (sum of all successful payments)
    amountPaid: {
      type: Number,
      default: 0,
    },

    // Remaining amount due
    amountDue: {
      type: Number,
      default: 0,
    },

    // Payment deadline - block payments after this date
    paymentDeadline: {
      type: Date,
    },

    // Array of Stripe Checkout Session IDs for this booking
    stripeSessionIds: [
      {
        type: String,
      },
    ],

    // Array of eSewa transaction IDs for this booking
    esewaTransactionIds: [
      {
        type: String,
      },
    ],

    // Array of Khalti transaction IDs for this booking
    khaltiTransactionIds: [
      {
        type: String,
      },
    ],

    // Last successful payment date
    lastPaymentDate: {
      type: Date,
    },

    // Check-in/Check-out tracking
    checkIn: {
      time: Date,
      location: {
        type: {
          type: String,
          enum: ["Point"],
        },
        coordinates: [Number],
      },
      notes: String,
      verifiedBy: {
        type: String,
        enum: ["gps", "manual", "qr_code"],
      },
    },

    checkOut: {
      time: Date,
      location: {
        type: {
          type: String,
          enum: ["Point"],
        },
        coordinates: [Number],
      },
      notes: String,
      verifiedBy: {
        type: String,
        enum: ["gps", "manual", "qr_code"],
      },
    },

    // Daily tracking logs with Proof of Work (POW)
    trackingLogs: [
      {
        date: {
          type: Date,
          required: true,
        },
        checkInTime: Date,
        checkOutTime: Date,
        tasksCompleted: {
          type: String,
          trim: true,
        },
        notes: {
          type: String,
          trim: true,
        },
        issues: {
          type: String,
          trim: true,
        },
        issueFlag: {
          type: Boolean,
          default: false,
        },
        images: [
          {
            imageUrl: {
              type: String,
              required: true,
            },
            timestamp: {
              type: Date,
              default: Date.now,
            },
            verifiedByAdmin: {
              type: Boolean,
              default: false,
            },
          },
        ],
        status: {
          type: String,
          enum: ["PENDING", "SUBMITTED", "FLAGGED"],
          default: "PENDING",
        },
        lateSubmission: {
          type: Boolean,
          default: false,
        },
        missed: {
          type: Boolean,
          default: false,
        },
        submittedAt: Date,
        submittedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        reviewedByCareSeeker: {
          approved: Boolean,
          reviewedAt: Date,
          reviewerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
          },
          comment: String,
        },
        adminReview: {
          status: {
            type: String,
            enum: ["none", "overridden", "penalized", "dispute_triggered"],
            default: "none",
          },
          reviewerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
          },
          reviewedAt: Date,
          note: String,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
        updatedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Daily care reports
    careReports: [
      {
        date: {
          type: Date,
          required: true,
        },
        submittedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        tasksCompleted: [String],
        vitals: {
          bloodPressure: String,
          temperature: String,
          heartRate: String,
          oxygenLevel: String,
          weight: String,
          bloodSugar: String,
        },
        mood: {
          type: String,
          enum: ["excellent", "good", "neutral", "low", "poor"],
        },
        appetite: {
          type: String,
          enum: ["excellent", "good", "fair", "poor", "refused"],
        },
        medications: [
          {
            name: String,
            dosage: String,
            time: String,
            administered: Boolean,
            notes: String,
          },
        ],
        activities: [String],
        incidents: [
          {
            description: String,
            severity: {
              type: String,
              enum: ["minor", "moderate", "severe"],
            },
            actionTaken: String,
            reportedToFamily: Boolean,
          },
        ],
        notes: String,
        photos: [String],
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Special care instructions from care seeker
    careInstructions: {
      general: String,
      dietary: String,
      medical: String,
      emergency: String,
      preferences: String,
    },

    // Booking notes
    notes: String,

    // Modification requests
    modificationRequests: [
      {
        requestedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        requestType: {
          type: String,
          enum: ["reschedule", "extend", "reduce", "cancel"],
        },
        originalValue: mongoose.Schema.Types.Mixed,
        requestedValue: mongoose.Schema.Types.Mixed,
        reason: String,
        status: {
          type: String,
          enum: ["pending", "approved", "rejected"],
          default: "pending",
        },
        respondedAt: Date,
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Cancellation details
    cancellation: {
      cancelledBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      reason: String,
      cancelledAt: Date,
      refundRequestedAt: Date,
      refundProcessedAt: Date,
      refundDecisionReason: String,
      refundWindowEndsAt: Date,
      refundWindowHours: {
        type: Number,
        default: 4,
      },
      refundAmount: Number,
      refundStatus: {
        type: String,
        enum: [
          "requested",
          "auto_approved",
          "under_review",
          "processed",
          "rejected",
          "pending",
          "completed",
          "denied",
        ],
      },
      cancellationFee: Number,
    },

    // Dispute handling
    dispute: {
      raisedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      reason: String,
      description: String,
      evidence: [String], // URLs to uploaded evidence
      status: {
        type: String,
        enum: ["open", "under_review", "resolved", "escalated", "closed"],
      },
      resolution: String,
      resolvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      resolvedAt: Date,
      createdAt: Date,
    },

    // Reminders sent
    remindersSent: [
      {
        type: {
          type: String,
          enum: [
            "booking_confirmation",
            "upcoming_service",
            "check_in_reminder",
            "check_out_reminder",
            "payment_reminder",
            "review_reminder",
          ],
        },
        sentAt: Date,
        channel: {
          type: String,
          enum: ["email", "sms", "push", "in_app"],
        },
      },
    ],

    // Review reference (after completion)
    reviewId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Review",
    },

    // Conversation/Chat reference
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
    },

    // Timestamps
    confirmedAt: Date,
    startedAt: Date,
    completedAt: Date,
  },
  {
    timestamps: true,
  },
);

// ── Indexes ──────────────────────────────────────────────────────────────────
// Note: bookingNumber index is created automatically by unique:true in schema

// Primary list queries (getMyBookings, caregiver schedule)
bookingSchema.index({ careSeekerId: 1, status: 1, createdAt: -1 });
bookingSchema.index({ caregiverId: 1, status: 1, createdAt: -1 });

// Availability / scheduling queries
bookingSchema.index({ caregiverId: 1, "schedule.startDate": 1 });
bookingSchema.index({ status: 1, "schedule.startDate": 1 });

// Payment deadline enforcement cron
bookingSchema.index({ paymentStatus: 1, paymentDeadline: 1 });

// Reservation expiry cron
bookingSchema.index({ status: 1, reservationExpiry: 1 });

// Geospatial (if location-based booking search is used)
bookingSchema.index({ "location.coordinates": "2dsphere" });

// General recency sort
bookingSchema.index({ createdAt: -1 });

// Compound index for conflict detection (caregiver availability checking)
bookingSchema.index({
  caregiverId: 1,
  status: 1,
  "schedule.startDate": 1,
  "schedule.endDate": 1,
});

// Dashboard aggregation: earnings by caregiver (completed bookings over time)
bookingSchema.index({ caregiverId: 1, status: 1, completedAt: -1 });
// Dashboard aggregation: careseeker spending (status + createdAt range)
bookingSchema.index({ careSeekerId: 1, paymentStatus: 1 });

// Daily tracking observability
bookingSchema.index({ caregiverId: 1, "trackingLogs.date": 1 });
bookingSchema.index({ status: 1, "trackingLogs.status": 1 });

// Pre-save: auto-generate a collision-safe bookingNumber for new documents
bookingSchema.pre("save", async function (next) {
  if (!this.isNew || this.bookingNumber) return next();

  const prefix = "CC";
  const date = new Date();
  const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;

  // Retry until we find a number not already taken (handles concurrent creates)
  let attempts = 0;
  while (attempts < 10) {
    const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
    const candidate = `${prefix}${dateStr}${rand}`;
    const exists = await mongoose
      .model("Booking")
      .exists({ bookingNumber: candidate });
    if (!exists) {
      this.bookingNumber = candidate;
      return next();
    }
    attempts++;
  }

  // Fallback: timestamp + random (essentially guaranteed unique)
  this.bookingNumber = `${prefix}${Date.now()}${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
  next();
});

// Keep static method for backward compatibility with any external callers
bookingSchema.statics.generateBookingNumber = async function () {
  const prefix = "CC";
  const date = new Date();
  const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}${dateStr}${rand}`;
};

// Calculate total price
bookingSchema.methods.calculateTotal = function () {
  const { subtotal, platformFeePercentage } = this.pricing;
  const platformFee = (subtotal * platformFeePercentage) / 100;
  const total = subtotal + platformFee + (this.pricing.taxes || 0);

  this.pricing.platformFee = platformFee;
  this.pricing.total = total;

  // Sprint-05: Sync totalAmount and amountDue
  this.totalAmount = total;
  this.amountDue = total - (this.amountPaid || 0);

  return total;
};

// Sprint-05: Check if payment deadline has expired
bookingSchema.methods.isPaymentExpired = function () {
  if (!this.paymentDeadline) return false;
  return new Date() > new Date(this.paymentDeadline);
};

// Sprint-05: Check if booking is eligible for payment
bookingSchema.methods.canAcceptPayment = function () {
  // Modern flow allows payment after agreement acceptance and before completion.
  const payableStatuses = ["payment_pending", "confirmed", "active", "in_progress"];
  if (!payableStatuses.includes(this.status)) return false;
  // Cannot pay for cancelled bookings
  if (this.paymentStatus === "cancelled") return false;
  // Already fully paid
  if (this.paymentStatus === "fully_paid") return false;
  // Payment deadline expired
  if (this.isPaymentExpired()) return false;
  return true;
};

// Sprint-05: Check if booking is review-eligible
bookingSchema.methods.isReviewEligible = function () {
  return this.status === "completed" && this.paymentStatus === "fully_paid";
};

// ============================================
// RESERVATION SYSTEM METHODS
// ============================================

// Check if a status transition is allowed
bookingSchema.methods.canTransitionTo = function (newStatus) {
  const allowed = STATE_TRANSITIONS[this.status] || [];
  return allowed.includes(newStatus);
};

// Check if reservation has expired
bookingSchema.methods.isReservationExpired = function () {
  if (this.status !== "reserved") return false;
  return (
    this.reservationExpiry && new Date() > new Date(this.reservationExpiry)
  );
};

// Get remaining reservation time in seconds
bookingSchema.methods.getReservationRemainingSeconds = function () {
  if (this.status !== "reserved" || !this.reservationExpiry) return 0;
  const now = new Date().getTime();
  const expiry = new Date(this.reservationExpiry).getTime();
  return Math.max(0, Math.floor((expiry - now) / 1000));
};

// Check if this booking blocks a time slot (for conflict detection)
bookingSchema.methods.blocksTimeSlot = function () {
  return SLOT_BLOCKING_STATUSES.includes(this.status);
};

// Check if can extend reservation
bookingSchema.methods.canExtendReservation = function (maxExtensions = 2) {
  if (this.status !== "reserved") return false;
  return this.extensionCount < maxExtensions;
};

// Check if booking can be cancelled
bookingSchema.methods.canBeCancelled = function () {
  const nonCancellableStatuses = ["completed", "cancelled", "in_progress", "active"];
  if (nonCancellableStatuses.includes(this.status)) return false;

  const toDate = (value) => {
    if (!value) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  const startedAt = toDate(this.startedAt);
  if (startedAt && startedAt.getTime() <= Date.now()) {
    return false;
  }

  const scheduledStart = toDate(this.schedule?.startDate);
  if (scheduledStart) {
    const [startHour, startMinute] = String(this.schedule?.startTime || "")
      .split(":")
      .map((value) => Number(value));

    if (Number.isInteger(startHour) && Number.isInteger(startMinute)) {
      scheduledStart.setUTCHours(startHour, startMinute, 0, 0);
    } else {
      scheduledStart.setUTCHours(0, 0, 0, 0);
    }

    if (scheduledStart.getTime() <= Date.now()) {
      return false;
    }
  }

  if (!startedAt && !scheduledStart) {
    return false;
  }

  return true;
};

// Check if booking can be modified
bookingSchema.methods.canBeModified = function () {
  const nonModifiableStatuses = ["completed", "cancelled", "disputed"];
  return !nonModifiableStatuses.includes(this.status);
};

// Virtual for duration in hours
bookingSchema.virtual("durationHours").get(function () {
  if (this.schedule.startDate && this.schedule.endDate) {
    const start = new Date(this.schedule.startDate);
    const end = new Date(this.schedule.endDate);
    const diffMs = end - start;
    return Math.round(diffMs / (1000 * 60 * 60));
  }
  return 0;
});

// Populate caregiver and care seeker details
bookingSchema.pre(/^find/, function (next) {
  // Only auto-populate if not explicitly disabled
  if (this.options._skipPopulate) {
    return next();
  }
  next();
});

// Sprint-05: Pre-save hook to sync financial fields
bookingSchema.pre("save", function (next) {
  const pricingTotal = Number(this.pricing?.total || 0);

  // Keep payment totals synchronized whenever pricing and paid amount change.
  if (pricingTotal > 0) {
    const shouldSyncTotal =
      !this.totalAmount ||
      this.totalAmount <= 0 ||
      this.isModified("pricing.total") ||
      this.isModified("pricing.subtotal") ||
      this.isModified("pricing.platformFee") ||
      this.isNew;

    if (shouldSyncTotal) {
      this.totalAmount = pricingTotal;
    }

    const paid = Number(this.amountPaid || 0);
    this.amountDue = Math.max(
      Number(this.totalAmount || pricingTotal) - paid,
      0,
    );
  }

  // Set default payment deadline for newly created priced bookings
  if (this.isNew && pricingTotal > 0 && !this.paymentDeadline) {
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + 7);
    this.paymentDeadline = deadline;
  }

  next();
});

const Booking = mongoose.model("Booking", bookingSchema);

export default Booking;
