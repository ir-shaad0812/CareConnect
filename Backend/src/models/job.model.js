// ============================================
// JOB MODEL
// Comprehensive job listing system for Care Platform marketplace
// Supports Admin posting, Caregiver applications, and analytics
// ============================================

import mongoose from 'mongoose';

// ============================================
// JOB SCHEMA
// ============================================

const jobSchema = new mongoose.Schema(
  {
    // ─── Core Job Information ────────────────────────────────────
    title: {
      type: String,
      required: [true, "Job title is required"],
      trim: true,
      maxlength: [150, "Title cannot exceed 150 characters"],
    },
    description: {
      type: String,
      required: [true, "Job description is required"],
      trim: true,
      maxlength: [5000, "Description cannot exceed 5000 characters"],
    },
    shortDescription: {
      type: String,
      trim: true,
      maxlength: [300, "Short description cannot exceed 300 characters"],
    },

    // ─── Job Classification ──────────────────────────────────────
    category: {
      type: String,
      required: [true, "Job category is required"],
      enum: {
        values: [
          "elderly_care",
          "child_care",
          "special_needs",
          "medical_care",
          "companion_care",
          "respite_care",
          "palliative_care",
          "post_operative_care",
          "disability_support",
          "dementia_care",
          "other",
        ],
        message: "Invalid job category",
      },
    },
    careType: {
      type: String,
      enum: ["live_in", "live_out", "hourly", "daily", "weekly", "full_time", "part_time", "contract", "temporary"],
      default: "full_time",
    },
    urgencyLevel: {
      type: String,
      enum: ["low", "medium", "high", "urgent", "emergency"],
      default: "medium",
    },

    // ─── Location ────────────────────────────────────────────────
    location: {
      address: { type: String, trim: true },
      city: { type: String, required: true, trim: true },
      state: { type: String, trim: true },
      zipCode: { type: String, trim: true },
      country: { type: String, default: "Nepal", trim: true },
      coordinates: {
        type: { type: String, enum: ["Point"], default: "Point" },
        coordinates: { type: [Number], default: [0, 0] }, // [lng, lat]
      },
      isRemote: { type: Boolean, default: false },
    },

    // ─── Compensation ────────────────────────────────────────────
    salary: {
      min: { type: Number, required: true, min: 0 },
      max: { type: Number, min: 0 },
      currency: { type: String, default: "NPR" },
      period: {
        type: String,
        enum: ["hourly", "daily", "weekly", "monthly", "yearly", "per_task"],
        default: "monthly",
      },
      isNegotiable: { type: Boolean, default: false },
    },
    benefits: [
      {
        type: String,
        enum: [
          "health_insurance",
          "paid_leave",
          "accommodation",
          "meals",
          "transport",
          "training",
          "bonus",
          "pension",
          "flexible_hours",
          "other",
        ],
      },
    ],

    // ─── Requirements ────────────────────────────────────────────
    requirements: {
      minExperience: { type: Number, default: 0 }, // Years
      education: {
        type: String,
        enum: ["none", "high_school", "vocational", "associate", "bachelor", "master", "doctorate"],
      },
      certifications: [{ type: String, trim: true }],
      skills: [{ type: String, trim: true }],
      languages: [{ type: String, trim: true }],
      ageRange: {
        min: { type: Number, min: 18 },
        max: { type: Number, max: 100 },
      },
      gender: {
        type: String,
        enum: ["any", "male", "female"],
        default: "any",
      },
      backgroundCheck: { type: Boolean, default: true },
      drivingLicense: { type: Boolean, default: false },
    },

    // ─── Schedule ────────────────────────────────────────────────
    schedule: {
      startDate: { type: Date },
      endDate: { type: Date },
      isFlexible: { type: Boolean, default: false },
      workingDays: [
        {
          type: String,
          enum: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
        },
      ],
      workingHours: {
        start: { type: String }, // "09:00"
        end: { type: String }, // "18:00"
      },
      shiftsAvailable: [
        {
          type: String,
          enum: ["morning", "afternoon", "evening", "night", "overnight"],
        },
      ],
    },

    // ─── Job Status & Management ─────────────────────────────────
    status: {
      type: String,
      enum: ["draft", "pending_review", "active", "paused", "filled", "expired", "cancelled", "closed"],
      default: "draft",
    },
    vacancies: {
      total: { type: Number, default: 1, min: 1 },
      filled: { type: Number, default: 0, min: 0 },
      remaining: { type: Number, default: 1, min: 0 },
    },
    applicationDeadline: { type: Date },
    publishedAt: { type: Date },
    expiresAt: { type: Date },

    // ─── Ownership & Origin ──────────────────────────────────────
    postedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    postedByRole: {
      type: String,
      enum: ["admin", "careseeker"],
      default: "admin",
    },
    // If converted from a care request
    careRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CareRequest",
    },
    // Family who requested (if applicable)
    familyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    assignedCaregiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    // ─── Monetization ────────────────────────────────────────────
    monetization: {
      isFeatured: { type: Boolean, default: false },
      featuredUntil: { type: Date },
      isBoosted: { type: Boolean, default: false },
      boostedUntil: { type: Date },
      hasPremiumBadge: { type: Boolean, default: false },
      listingTier: {
        type: String,
        enum: ["free", "basic", "premium", "enterprise"],
        default: "free",
      },
      pricePaid: { type: Number, default: 0 },
      commissionRate: { type: Number, default: 0, min: 0, max: 100 }, // Percentage
    },

    // ─── Analytics ───────────────────────────────────────────────
    analytics: {
      views: { type: Number, default: 0 },
      uniqueViews: { type: Number, default: 0 },
      saves: { type: Number, default: 0 },
      shares: { type: Number, default: 0 },
      applications: { type: Number, default: 0 },
      shortlisted: { type: Number, default: 0 },
      interviewed: { type: Number, default: 0 },
      hired: { type: Number, default: 0 },
      conversionRate: { type: Number, default: 0 }, // applications/views * 100
      avgTimeToApply: { type: Number, default: 0 }, // Minutes
      revenueGenerated: { type: Number, default: 0 },
    },

    // ─── SEO & Display ───────────────────────────────────────────
    slug: {
      type: String,
      unique: true,
      sparse: true,
    },
    tags: [{ type: String, trim: true, lowercase: true }],
    images: [{ type: String }],
    videoUrl: { type: String },

    // ─── Metadata ────────────────────────────────────────────────
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
    lastModifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    duplicatedFrom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ============================================
// INDEXES FOR PERFORMANCE
// ============================================

// Primary search and filter indexes
jobSchema.index({ status: 1, isActive: 1, isDeleted: 1 });
jobSchema.index({ category: 1, status: 1 });
jobSchema.index({ "location.city": 1, status: 1 });
jobSchema.index({ urgencyLevel: 1, status: 1 });
jobSchema.index({ careType: 1, status: 1 });

// Geospatial index for location-based search
jobSchema.index({ "location.coordinates": "2dsphere" });

// Monetization & featured jobs
jobSchema.index({ "monetization.isFeatured": 1, "monetization.featuredUntil": 1 });
jobSchema.index({ "monetization.isBoosted": 1, status: 1 });

// Salary range search
jobSchema.index({ "salary.min": 1, "salary.max": 1 });

// Date-based queries
jobSchema.index({ publishedAt: -1 });
jobSchema.index({ applicationDeadline: 1 });
jobSchema.index({ expiresAt: 1 });
jobSchema.index({ createdAt: -1 });

// Text search index
jobSchema.index(
  {
    title: "text",
    description: "text",
    "requirements.skills": "text",
    tags: "text",
  },
  {
    weights: {
      title: 10,
      tags: 5,
      "requirements.skills": 3,
      description: 1,
    },
    name: "job_text_search",
  }
);

// Compound indexes for common queries
jobSchema.index({ postedBy: 1, status: 1, createdAt: -1 });
jobSchema.index({ category: 1, "location.city": 1, status: 1, "salary.min": 1 });

// Analytics index
jobSchema.index({ "analytics.views": -1 });
jobSchema.index({ "analytics.applications": -1 });

// ============================================
// VIRTUALS
// ============================================

// Calculate if job is expired
jobSchema.virtual("isExpired").get(function () {
  if (!this.expiresAt) return false;
  return new Date() > this.expiresAt;
});

// Calculate if deadline passed
jobSchema.virtual("isDeadlinePassed").get(function () {
  if (!this.applicationDeadline) return false;
  return new Date() > this.applicationDeadline;
});

// Calculate application rate
jobSchema.virtual("applicationRate").get(function () {
  if (!this.analytics.views || this.analytics.views === 0) return 0;
  return ((this.analytics.applications / this.analytics.views) * 100).toFixed(2);
});

// Days since posted
jobSchema.virtual("daysSincePosted").get(function () {
  if (!this.publishedAt) return null;
  const diff = Date.now() - this.publishedAt.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
});

// Days until deadline
jobSchema.virtual("daysUntilDeadline").get(function () {
  if (!this.applicationDeadline) return null;
  const diff = this.applicationDeadline.getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

// ============================================
// PRE-SAVE HOOKS
// ============================================

jobSchema.pre("save", function (next) {
  // Generate slug from title
  if (this.isModified("title") && !this.slug) {
    const baseSlug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    this.slug = `${baseSlug}-${this._id.toString().slice(-6)}`;
  }

  // Update remaining vacancies
  if (this.isModified("vacancies.total") || this.isModified("vacancies.filled")) {
    this.vacancies.remaining = Math.max(0, this.vacancies.total - this.vacancies.filled);
  }

  // Auto-update conversion rate
  if (this.isModified("analytics.views") || this.isModified("analytics.applications")) {
    if (this.analytics.views > 0) {
      this.analytics.conversionRate = ((this.analytics.applications / this.analytics.views) * 100).toFixed(2);
    }
  }

  // Set publishedAt when status changes to active
  if (this.isModified("status") && this.status === "active" && !this.publishedAt) {
    this.publishedAt = new Date();
  }

  // Auto-generate short description
  if (this.isModified("description") && !this.shortDescription) {
    this.shortDescription = this.description.substring(0, 297) + (this.description.length > 297 ? "..." : "");
  }

  next();
});

// ============================================
// STATIC METHODS
// ============================================

// Find active jobs with filters
jobSchema.statics.findActiveJobs = function (filters = {}) {
  return this.find({
    status: "active",
    isActive: true,
    isDeleted: false,
    ...filters,
  })
    .populate("postedBy", "fullName email profilePicture")
    .sort({ "monetization.isFeatured": -1, "monetization.isBoosted": -1, publishedAt: -1 });
};

// Get featured jobs
jobSchema.statics.getFeaturedJobs = function (limit = 10) {
  return this.find({
    status: "active",
    isActive: true,
    isDeleted: false,
    "monetization.isFeatured": true,
    "monetization.featuredUntil": { $gte: new Date() },
  })
    .limit(limit)
    .sort({ publishedAt: -1 });
};

// Search jobs with text search
jobSchema.statics.searchJobs = function (query, filters = {}) {
  return this.find({
    $text: { $search: query },
    status: "active",
    isActive: true,
    isDeleted: false,
    ...filters,
  })
    .select({ score: { $meta: "textScore" } })
    .sort({ score: { $meta: "textScore" } });
};

// Get jobs near location
jobSchema.statics.findNearby = function (coordinates, maxDistanceKm = 50) {
  return this.find({
    "location.coordinates": {
      $near: {
        $geometry: {
          type: "Point",
          coordinates: coordinates,
        },
        $maxDistance: maxDistanceKm * 1000, // Convert to meters
      },
    },
    status: "active",
    isActive: true,
    isDeleted: false,
  });
};

// Get admin dashboard stats
jobSchema.statics.getAdminStats = async function () {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [statusCounts, categoryStats, revenueStats] = await Promise.all([
    // Status distribution
    this.aggregate([
      { $match: { isDeleted: false } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    // Category distribution
    this.aggregate([
      { $match: { status: "active", isDeleted: false } },
      { $group: { _id: "$category", count: { $sum: 1 } } },
    ]),
    // Revenue this month
    this.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfMonth },
          isDeleted: false,
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$monetization.pricePaid" },
          totalFeatured: { $sum: { $cond: ["$monetization.isFeatured", 1, 0] } },
          totalBoosted: { $sum: { $cond: ["$monetization.isBoosted", 1, 0] } },
        },
      },
    ]),
  ]);

  return {
    statusDistribution: statusCounts,
    categoryDistribution: categoryStats,
    monthlyRevenue: revenueStats[0] || { totalRevenue: 0, totalFeatured: 0, totalBoosted: 0 },
  };
};

// ============================================
// INSTANCE METHODS
// ============================================

// Increment view count
jobSchema.methods.recordView = async function (isUnique = false) {
  this.analytics.views += 1;
  if (isUnique) {
    this.analytics.uniqueViews += 1;
  }
  await this.save();
};

// Duplicate job
jobSchema.methods.duplicate = async function (userId) {
  const Job = this.constructor;
  const duplicated = new Job({
    ...this.toObject(),
    _id: undefined,
    slug: undefined,
    status: "draft",
    analytics: {
      views: 0,
      uniqueViews: 0,
      saves: 0,
      shares: 0,
      applications: 0,
      shortlisted: 0,
      interviewed: 0,
      hired: 0,
      conversionRate: 0,
      avgTimeToApply: 0,
      revenueGenerated: 0,
    },
    publishedAt: undefined,
    duplicatedFrom: this._id,
    lastModifiedBy: userId,
    createdAt: undefined,
    updatedAt: undefined,
  });

  await duplicated.save();
  return duplicated;
};

// Extend deadline
jobSchema.methods.extendDeadline = async function (newDeadline, userId) {
  if (new Date(newDeadline) <= this.applicationDeadline) {
    throw new Error("New deadline must be after current deadline");
  }
  this.applicationDeadline = newDeadline;
  this.lastModifiedBy = userId;
  await this.save();
  return this;
};

// Soft delete
jobSchema.methods.softDelete = async function (userId) {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.status = "cancelled";
  this.lastModifiedBy = userId;
  await this.save();
  return this;
};

const Job = mongoose.model('Job', jobSchema);

export default Job;
