// ============================================
// JOB APPLICATION MODEL
// Tracks caregiver applications to job listings
// Supports full application lifecycle and analytics
// ============================================

import mongoose from 'mongoose';

// ============================================
// JOB APPLICATION SCHEMA
// ============================================

const jobApplicationSchema = new mongoose.Schema(
  {
    // ─── Core References ─────────────────────────────────────────
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      required: [true, "Job reference is required"],
    },
    applicant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Applicant reference is required"],
    },
    caregiverProfile: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Caregiver",
    },

    // ─── Application Content ─────────────────────────────────────
    coverLetter: {
      type: String,
      maxlength: [3000, "Cover letter cannot exceed 3000 characters"],
      trim: true,
    },
    proposedRate: {
      amount: { type: Number, min: 0 },
      currency: { type: String, default: "NPR" },
      period: {
        type: String,
        enum: ["hourly", "daily", "weekly", "monthly"],
      },
    },
    availableStartDate: { type: Date },
    expectedSalary: {
      min: { type: Number, min: 0 },
      max: { type: Number, min: 0 },
      currency: { type: String, default: "NPR" },
    },

    // ─── Documents ───────────────────────────────────────────────
    resume: {
      url: { type: String },
      fileName: { type: String },
      uploadedAt: { type: Date },
    },
    additionalDocuments: [
      {
        type: { type: String },
        url: { type: String },
        fileName: { type: String },
        uploadedAt: { type: Date },
      },
    ],

    // ─── Application Status ──────────────────────────────────────
    status: {
      type: String,
      enum: [
        "pending",
        "under_review",
        "shortlisted",
        "interview_scheduled",
        "interviewed",
        "offer_extended",
        "offer_accepted",
        "hired",
        "rejected",
        "withdrawn",
        "expired",
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

    // ─── Interview Management ────────────────────────────────────
    interview: {
      scheduledAt: { type: Date },
      type: {
        type: String,
        enum: ["phone", "video", "in_person"],
      },
      location: { type: String },
      meetingLink: { type: String },
      notes: { type: String },
      conductedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      feedback: {
        rating: { type: Number, min: 1, max: 5 },
        comments: { type: String },
        recommendation: {
          type: String,
          enum: ["strongly_recommend", "recommend", "neutral", "not_recommend"],
        },
      },
    },

    // ─── Offer Details ───────────────────────────────────────────
    offer: {
      extendedAt: { type: Date },
      salary: {
        amount: { type: Number },
        currency: { type: String, default: "NPR" },
        period: { type: String },
      },
      startDate: { type: Date },
      benefits: [{ type: String }],
      expiresAt: { type: Date },
      respondedAt: { type: Date },
      response: {
        type: String,
        enum: ["accepted", "rejected", "negotiating"],
      },
      counterOffer: {
        salary: { type: Number },
        notes: { type: String },
      },
    },

    // ─── Screening & Evaluation ──────────────────────────────────
    screening: {
      passedInitialReview: { type: Boolean },
      reviewedAt: { type: Date },
      reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      qualificationMatch: { type: Number, min: 0, max: 100 }, // Percentage match
      experienceMatch: { type: Number, min: 0, max: 100 },
      overallScore: { type: Number, min: 0, max: 100 },
      notes: { type: String },
      flags: [
        {
          type: String,
          enum: ["incomplete_profile", "missing_docs", "location_mismatch", "overqualified", "underqualified"],
        },
      ],
    },

    // ─── Communication Log ───────────────────────────────────────
    communications: [
      {
        type: {
          type: String,
          enum: ["email", "sms", "in_app", "call"],
        },
        subject: { type: String },
        content: { type: String },
        sentAt: { type: Date, default: Date.now },
        sentBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        delivered: { type: Boolean, default: false },
        read: { type: Boolean, default: false },
        readAt: { type: Date },
      },
    ],

    // ─── Internal Notes ──────────────────────────────────────────
    adminNotes: [
      {
        content: { type: String },
        createdAt: { type: Date, default: Date.now },
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        isPrivate: { type: Boolean, default: true },
      },
    ],

    // ─── Analytics & Tracking ────────────────────────────────────
    analytics: {
      timeToApply: { type: Number }, // Minutes from job view to application
      profileViewCount: { type: Number, default: 0 }, // How many times admin viewed
      lastViewedAt: { type: Date },
      source: {
        type: String,
        enum: ["direct", "search", "recommendation", "email", "notification", "social"],
        default: "direct",
      },
      deviceType: {
        type: String,
        enum: ["desktop", "mobile", "tablet"],
      },
    },

    // ─── Metadata ────────────────────────────────────────────────
    isActive: { type: Boolean, default: true },
    isWithdrawn: { type: Boolean, default: false },
    withdrawnAt: { type: Date },
    withdrawnReason: { type: String },
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

// Primary query indexes
jobApplicationSchema.index({ job: 1, applicant: 1 }, { unique: true }); // Prevent duplicate applications
jobApplicationSchema.index({ job: 1, status: 1 });
jobApplicationSchema.index({ applicant: 1, status: 1 });
jobApplicationSchema.index({ status: 1, createdAt: -1 });

// Admin dashboard queries
jobApplicationSchema.index({ "screening.overallScore": -1 });
jobApplicationSchema.index({ "offer.extendedAt": 1, "offer.expiresAt": 1 });

// Date-based queries
jobApplicationSchema.index({ createdAt: -1 });
jobApplicationSchema.index({ "interview.scheduledAt": 1 });

// ============================================
// VIRTUALS
// ============================================

// Days since application
jobApplicationSchema.virtual("daysSinceApplied").get(function () {
  const diff = Date.now() - this.createdAt.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
});

// Is offer expired
jobApplicationSchema.virtual("isOfferExpired").get(function () {
  if (!this.offer?.expiresAt) return false;
  return new Date() > this.offer.expiresAt;
});

// Current status label (human readable)
jobApplicationSchema.virtual("statusLabel").get(function () {
  const labels = {
    pending: "Pending Review",
    under_review: "Under Review",
    shortlisted: "Shortlisted",
    interview_scheduled: "Interview Scheduled",
    interviewed: "Interviewed",
    offer_extended: "Offer Extended",
    offer_accepted: "Offer Accepted",
    hired: "Hired",
    rejected: "Rejected",
    withdrawn: "Withdrawn",
    expired: "Expired",
  };
  return labels[this.status] || this.status;
});

// ============================================
// PRE-SAVE HOOKS
// ============================================

jobApplicationSchema.pre("save", async function (next) {
  // Track status changes
  if (this.isModified("status")) {
    this.statusHistory.push({
      status: this.status,
      changedAt: new Date(),
    });
  }

  // Auto-set withdrawal timestamp
  if (this.isModified("isWithdrawn") && this.isWithdrawn && !this.withdrawnAt) {
    this.withdrawnAt = new Date();
    this.status = "withdrawn";
  }

  next();
});

// ============================================
// POST-SAVE HOOKS
// ============================================

jobApplicationSchema.post("save", async function (doc) {
  // Update job analytics when new application is created
  if (doc.isNew) {
    const Job = mongoose.model("Job");
    await Job.findByIdAndUpdate(doc.job, {
      $inc: { "analytics.applications": 1 },
    });
  }

  // Update shortlisted count
  if (doc.status === "shortlisted") {
    const Job = mongoose.model("Job");
    const shortlistedCount = await mongoose.model("JobApplication").countDocuments({
      job: doc.job,
      status: "shortlisted",
    });
    await Job.findByIdAndUpdate(doc.job, {
      "analytics.shortlisted": shortlistedCount,
    });
  }

  // Update hired count and vacancies
  if (doc.status === "hired") {
    const Job = mongoose.model("Job");
    await Job.findByIdAndUpdate(doc.job, {
      $inc: {
        "analytics.hired": 1,
        "vacancies.filled": 1,
        "vacancies.remaining": -1,
      },
    });
  }
});

// ============================================
// STATIC METHODS
// ============================================

// Get applications for a job
jobApplicationSchema.statics.getJobApplications = function (jobId, filters = {}) {
  return this.find({
    job: jobId,
    isActive: true,
    ...filters,
  })
    .populate("applicant", "fullName email phone profilePicture")
    .populate("caregiverProfile", "skills experienceYears hourlyRate")
    .sort({ createdAt: -1 });
};

// Get applications by caregiver
jobApplicationSchema.statics.getCaregiverApplications = function (caregiverId, filters = {}) {
  return this.find({
    applicant: caregiverId,
    isActive: true,
    ...filters,
  })
    .populate("job", "title category location salary status")
    .sort({ createdAt: -1 });
};

// Get application stats for admin dashboard
jobApplicationSchema.statics.getStats = async function (startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        },
      },
    },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
      },
    },
  ]);
};

// Get top applicants by score
jobApplicationSchema.statics.getTopApplicants = function (jobId, limit = 10) {
  return this.find({
    job: jobId,
    isActive: true,
    status: { $in: ["pending", "under_review", "shortlisted"] },
  })
    .sort({ "screening.overallScore": -1, createdAt: 1 })
    .limit(limit)
    .populate("applicant", "fullName email profilePicture")
    .populate("caregiverProfile");
};

// ============================================
// INSTANCE METHODS
// ============================================

// Update status with tracking
jobApplicationSchema.methods.updateStatus = async function (newStatus, userId, note = "") {
  this.status = newStatus;
  this.statusHistory.push({
    status: newStatus,
    changedAt: new Date(),
    changedBy: userId,
    note,
  });
  await this.save();
  return this;
};

// Schedule interview
jobApplicationSchema.methods.scheduleInterview = async function (interviewDetails, userId) {
  this.interview = {
    ...this.interview,
    ...interviewDetails,
    conductedBy: userId,
  };
  this.status = "interview_scheduled";
  this.statusHistory.push({
    status: "interview_scheduled",
    changedAt: new Date(),
    changedBy: userId,
    note: `Interview scheduled for ${interviewDetails.scheduledAt}`,
  });
  await this.save();
  return this;
};

// Extend offer
jobApplicationSchema.methods.extendOffer = async function (offerDetails, userId) {
  this.offer = {
    ...offerDetails,
    extendedAt: new Date(),
  };
  this.status = "offer_extended";
  this.statusHistory.push({
    status: "offer_extended",
    changedAt: new Date(),
    changedBy: userId,
  });
  await this.save();
  return this;
};

// Respond to offer
jobApplicationSchema.methods.respondToOffer = async function (response, counterOffer = null) {
  this.offer.respondedAt = new Date();
  this.offer.response = response;

  if (response === "accepted") {
    this.status = "offer_accepted";
  } else if (response === "negotiating" && counterOffer) {
    this.offer.counterOffer = counterOffer;
  } else if (response === "rejected") {
    this.status = "rejected";
  }

  this.statusHistory.push({
    status: this.status,
    changedAt: new Date(),
    note: `Offer ${response}`,
  });

  await this.save();
  return this;
};

// Withdraw application
jobApplicationSchema.methods.withdraw = async function (reason = "") {
  this.isWithdrawn = true;
  this.withdrawnAt = new Date();
  this.withdrawnReason = reason;
  this.status = "withdrawn";
  this.statusHistory.push({
    status: "withdrawn",
    changedAt: new Date(),
    note: reason,
  });
  await this.save();
  return this;
};

// Add admin note
jobApplicationSchema.methods.addNote = async function (content, userId, isPrivate = true) {
  this.adminNotes.push({
    content,
    createdBy: userId,
    isPrivate,
  });
  await this.save();
  return this;
};

// Record profile view
jobApplicationSchema.methods.recordView = async function () {
  this.analytics.profileViewCount += 1;
  this.analytics.lastViewedAt = new Date();
  await this.save();
};

const JobApplication = mongoose.model('JobApplication', jobApplicationSchema);

export default JobApplication;
