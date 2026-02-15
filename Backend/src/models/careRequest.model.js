// ============================================
// CARE REQUEST MODEL
// Handles family/care-seeker urgent care requests
// Can be converted to job listings by admin
// ============================================

import mongoose from 'mongoose';

// ============================================
// CARE REQUEST SCHEMA
// ============================================

const careRequestSchema = new mongoose.Schema(
  {
    // ─── Requester Information ───────────────────────────────────
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Requester is required"],
    },
    requesterProfile: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CareSeeker",
    },

    // ─── Request Details ─────────────────────────────────────────
    title: {
      type: String,
      required: [true, "Request title is required"],
      trim: true,
      maxlength: [200, "Title cannot exceed 200 characters"],
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
      maxlength: [3000, "Description cannot exceed 3000 characters"],
    },

    // ─── Care Type & Category ────────────────────────────────────
    careType: {
      type: String,
      required: true,
      enum: {
        values: [
          "baby_care",
          "child_care",
          "elderly_care",
          "special_needs",
          "medical_care",
          "emergency_care",
          "respite_care",
          "companion_care",
          "post_surgical",
          "dementia_care",
          "palliative_care",
          "disability_support",
          "other",
        ],
        message: "Invalid care type",
      },
    },
    careRecipient: {
      name: { type: String, trim: true },
      age: { type: Number, min: 0, max: 150 },
      gender: { type: String, enum: ["male", "female", "other"] },
      relationship: {
        type: String,
        enum: ["self", "child", "parent", "grandparent", "spouse", "sibling", "relative", "friend", "other"],
      },
      medicalConditions: [{ type: String, trim: true }],
      mobilityLevel: {
        type: String,
        enum: ["independent", "needs_assistance", "wheelchair", "bedridden"],
      },
      specialRequirements: { type: String, trim: true },
    },

    // ─── Urgency & Timing ────────────────────────────────────────
    urgencyLevel: {
      type: String,
      required: true,
      enum: {
        values: ["low", "medium", "high", "urgent", "emergency"],
        message: "Invalid urgency level",
      },
      default: "medium",
    },
    preferredStartDate: {
      type: Date,
      required: [true, "Preferred start date is required"],
    },
    preferredEndDate: { type: Date },
    duration: {
      type: String,
      enum: ["one_time", "daily", "weekly", "monthly", "long_term", "indefinite"],
      default: "one_time",
    },
    schedule: {
      isFlexible: { type: Boolean, default: false },
      preferredDays: [
        {
          type: String,
          enum: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
        },
      ],
      preferredTimeSlots: [
        {
          type: String,
          enum: ["morning", "afternoon", "evening", "night", "overnight", "24_hour"],
        },
      ],
      hoursPerDay: { type: Number, min: 1, max: 24 },
    },

    // ─── Location ────────────────────────────────────────────────
    location: {
      address: { type: String, required: true, trim: true },
      city: { type: String, required: true, trim: true },
      state: { type: String, trim: true },
      zipCode: { type: String, trim: true },
      country: { type: String, default: "Nepal", trim: true },
      coordinates: {
        type: { type: String, enum: ["Point"], default: "Point" },
        coordinates: { type: [Number], default: [0, 0] },
      },
      additionalDirections: { type: String, trim: true },
    },

    // ─── Budget & Preferences ────────────────────────────────────
    budget: {
      min: { type: Number, min: 0 },
      max: { type: Number, min: 0 },
      currency: { type: String, default: "NPR" },
      period: {
        type: String,
        enum: ["hourly", "daily", "weekly", "monthly", "total"],
        default: "monthly",
      },
      isNegotiable: { type: Boolean, default: true },
    },
    preferences: {
      preferredGender: { type: String, enum: ["any", "male", "female"], default: "any" },
      minExperience: { type: Number, default: 0 },
      requiredCertifications: [{ type: String, trim: true }],
      languageRequired: [{ type: String, trim: true }],
      liveIn: { type: Boolean, default: false },
    },

    // ─── Request Status ──────────────────────────────────────────
    status: {
      type: String,
      enum: [
        "pending", // Initial submission
        "under_review", // Admin reviewing
        "approved", // Approved, awaiting action
        "converted_to_job", // Converted to job listing
        "caregiver_assigned", // Direct assignment
        "in_progress", // Care service started
        "completed", // Care service completed
        "rejected", // Request rejected
        "cancelled", // Cancelled by requester
        "expired", // Request expired
      ],
      default: "pending",
    },
    statusHistory: [
      {
        status: { type: String },
        changedAt: { type: Date, default: Date.now },
        changedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        note: { type: String },
      },
    ],

    // ─── Admin Actions ───────────────────────────────────────────
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    reviewedAt: { type: Date },
    reviewNotes: { type: String },
    rejectionReason: { type: String },

    // ─── Conversion to Job ───────────────────────────────────────
    convertedToJob: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
    },
    convertedAt: { type: Date },
    convertedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    // ─── Direct Assignment ───────────────────────────────────────
    assignedCaregiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    assignedAt: { type: Date },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    assignmentNotes: { type: String },

    // ─── Related Booking ─────────────────────────────────────────
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
    },

    // ─── Contact Preferences ─────────────────────────────────────
    contactPreference: {
      type: String,
      enum: ["phone", "email", "whatsapp", "in_app", "any"],
      default: "any",
    },
    preferredContactTime: {
      type: String,
      enum: ["morning", "afternoon", "evening", "anytime"],
      default: "anytime",
    },
    alternatePhone: { type: String, trim: true },

    // ─── Priority & Flags ────────────────────────────────────────
    priority: {
      type: Number,
      default: 0,
      min: 0,
      max: 10,
    },
    flags: [
      {
        type: String,
        enum: [
          "vip_customer",
          "recurring_request",
          "complex_care",
          "budget_constraint",
          "location_challenge",
          "special_equipment",
          "language_barrier",
        ],
      },
    ],
    isVip: { type: Boolean, default: false },

    // ─── Internal Notes ──────────────────────────────────────────
    adminNotes: [
      {
        content: { type: String },
        createdAt: { type: Date, default: Date.now },
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      },
    ],

    // ─── Analytics ───────────────────────────────────────────────
    analytics: {
      responseTime: { type: Number }, // Minutes until first admin response
      resolutionTime: { type: Number }, // Minutes until resolved
      matchAttempts: { type: Number, default: 0 },
      successfulMatch: { type: Boolean },
    },

    // ─── Metadata ────────────────────────────────────────────────
    isActive: { type: Boolean, default: true },
    expiresAt: { type: Date },
    source: {
      type: String,
      enum: ["web", "mobile_app", "phone", "walk_in", "referral", "admin_created"],
      default: "web",
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ============================================
// INDEXES
// ============================================

// Status and urgency queries
careRequestSchema.index({ status: 1, urgencyLevel: -1, createdAt: -1 });
careRequestSchema.index({ status: 1, "location.city": 1 });

// Requester queries
careRequestSchema.index({ requestedBy: 1, status: 1 });

// Date-based queries
careRequestSchema.index({ preferredStartDate: 1 });
careRequestSchema.index({ createdAt: -1 });
careRequestSchema.index({ expiresAt: 1 });

// Admin dashboard priority queue
careRequestSchema.index({ status: 1, priority: -1, urgencyLevel: -1 });

// Geospatial
careRequestSchema.index({ "location.coordinates": "2dsphere" });

// ============================================
// VIRTUALS
// ============================================

// Is expired
careRequestSchema.virtual("isExpired").get(function () {
  if (!this.expiresAt) return false;
  return new Date() > this.expiresAt;
});

// Days since request
careRequestSchema.virtual("daysSinceRequest").get(function () {
  const diff = Date.now() - this.createdAt.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
});

// Urgency color
careRequestSchema.virtual("urgencyColor").get(function () {
  const colors = {
    low: "#10B981", // green
    medium: "#F59E0B", // yellow
    high: "#F97316", // orange
    urgent: "#EF4444", // red
    emergency: "#DC2626", // dark red
  };
  return colors[this.urgencyLevel] || "#6B7280";
});

// ============================================
// PRE-SAVE HOOKS
// ============================================

careRequestSchema.pre("save", async function (next) {
  // Track status changes
  if (this.isModified("status")) {
    this.statusHistory.push({
      status: this.status,
      changedAt: new Date(),
    });
  }

  // Set expiration based on urgency
  if (this.isNew && !this.expiresAt) {
    const expirationDays = {
      emergency: 1,
      urgent: 3,
      high: 7,
      medium: 14,
      low: 30,
    };
    const days = expirationDays[this.urgencyLevel] || 14;
    this.expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  }

  // Auto-set priority based on urgency
  if (this.isNew || this.isModified("urgencyLevel")) {
    const priorityMap = {
      emergency: 10,
      urgent: 8,
      high: 6,
      medium: 4,
      low: 2,
    };
    this.priority = priorityMap[this.urgencyLevel] || 4;
  }

  next();
});

// ============================================
// STATIC METHODS
// ============================================

// Get pending requests for admin
careRequestSchema.statics.getPendingRequests = function (filters = {}) {
  return this.find({
    status: { $in: ["pending", "under_review"] },
    isActive: true,
    ...filters,
  })
    .populate("requestedBy", "fullName email phone profilePicture")
    .sort({ urgencyLevel: -1, priority: -1, createdAt: 1 });
};

// Get requests by status
careRequestSchema.statics.getByStatus = function (status, options = {}) {
  const { limit = 50, skip = 0 } = options;
  return this.find({ status, isActive: true })
    .populate("requestedBy", "fullName email phone")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
};

// Get admin dashboard stats
careRequestSchema.statics.getStats = async function () {
  const now = new Date();
  const startOfDay = new Date(now.setHours(0, 0, 0, 0));
  const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [statusCounts, urgencyCounts, todayCount, thisWeek, thisMonth] = await Promise.all([
    this.aggregate([{ $match: { isActive: true } }, { $group: { _id: "$status", count: { $sum: 1 } } }]),
    this.aggregate([
      { $match: { status: "pending", isActive: true } },
      { $group: { _id: "$urgencyLevel", count: { $sum: 1 } } },
    ]),
    this.countDocuments({ createdAt: { $gte: startOfDay }, isActive: true }),
    this.countDocuments({ createdAt: { $gte: startOfWeek }, isActive: true }),
    this.countDocuments({ createdAt: { $gte: startOfMonth }, isActive: true }),
  ]);

  return {
    byStatus: statusCounts,
    byUrgency: urgencyCounts,
    today: todayCount,
    thisWeek,
    thisMonth,
  };
};

// ============================================
// INSTANCE METHODS
// ============================================

// Approve request
careRequestSchema.methods.approve = async function (adminId, notes = "") {
  this.status = "approved";
  this.reviewedBy = adminId;
  this.reviewedAt = new Date();
  this.reviewNotes = notes;
  this.statusHistory.push({
    status: "approved",
    changedAt: new Date(),
    changedBy: adminId,
    note: notes,
  });

  // Calculate response time
  if (!this.analytics.responseTime) {
    this.analytics.responseTime = Math.round((Date.now() - this.createdAt.getTime()) / 60000);
  }

  await this.save();
  return this;
};

// Reject request
careRequestSchema.methods.reject = async function (adminId, reason) {
  this.status = "rejected";
  this.reviewedBy = adminId;
  this.reviewedAt = new Date();
  this.rejectionReason = reason;
  this.statusHistory.push({
    status: "rejected",
    changedAt: new Date(),
    changedBy: adminId,
    note: reason,
  });
  await this.save();
  return this;
};

// Convert to job listing
careRequestSchema.methods.convertToJob = async function (jobId, adminId) {
  this.status = "converted_to_job";
  this.convertedToJob = jobId;
  this.convertedAt = new Date();
  this.convertedBy = adminId;
  this.statusHistory.push({
    status: "converted_to_job",
    changedAt: new Date(),
    changedBy: adminId,
    note: `Converted to job listing: ${jobId}`,
  });

  this.analytics.resolutionTime = Math.round((Date.now() - this.createdAt.getTime()) / 60000);

  await this.save();
  return this;
};

// Assign caregiver directly
careRequestSchema.methods.assignCaregiver = async function (caregiverId, adminId, notes = "") {
  this.status = "caregiver_assigned";
  this.assignedCaregiver = caregiverId;
  this.assignedAt = new Date();
  this.assignedBy = adminId;
  this.assignmentNotes = notes;
  this.analytics.successfulMatch = true;
  this.statusHistory.push({
    status: "caregiver_assigned",
    changedAt: new Date(),
    changedBy: adminId,
    note: `Assigned caregiver: ${caregiverId}`,
  });

  this.analytics.resolutionTime = Math.round((Date.now() - this.createdAt.getTime()) / 60000);

  await this.save();
  return this;
};

// Add admin note
careRequestSchema.methods.addNote = async function (content, adminId) {
  this.adminNotes.push({
    content,
    createdBy: adminId,
  });
  await this.save();
  return this;
};

// Cancel request
careRequestSchema.methods.cancel = async function (userId, reason = "") {
  this.status = "cancelled";
  this.isActive = false;
  this.statusHistory.push({
    status: "cancelled",
    changedAt: new Date(),
    changedBy: userId,
    note: reason,
  });
  await this.save();
  return this;
};

const CareRequest = mongoose.model('CareRequest', careRequestSchema);

export default CareRequest;
