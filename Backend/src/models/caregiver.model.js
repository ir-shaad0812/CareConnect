import mongoose from 'mongoose';

/**
 * Caregiver Model - Production-Grade Schema
 * 
 * Architecture: Separate Collection Pattern
 * - Stores caregiver-specific profile data separate from base User model
 * - Linked to User via userId (one-to-one relationship)
 * - Optimized for search aggregations with $lookup to User collection
 * 
 * Collection: caregivers (under careconnect database)
 * 
 * Design Decisions:
 * 1. Separation of Concerns: User handles auth/identity, Caregiver handles professional data
 * 2. Search Optimization: Fields are structured for efficient aggregation pipelines
 * 3. Scalability: Embedded arrays (certifications, previousEmployers) kept small to avoid document bloat
 * 4. Index Strategy: Compound indexes aligned with common query patterns
 * 
 * Note: Some fields are mirrored in User model for backward compatibility.
 * Source of truth for caregiver data is THIS model.
 * 
 * @module models/caregiver
 * @requires mongoose
 */
const caregiverSchema = new mongoose.Schema(
  {
    // Reference to base user - Primary key relationship
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },

    // Professional Information
    experience: { 
      type: Number, 
      min: 0,
      default: 0,
    },
    bio: { 
      type: String, 
      maxlength: [2000, 'Bio cannot exceed 2000 characters'],
    },
    headline: {
      type: String,
      maxlength: [200, 'Headline cannot exceed 200 characters'],
    },
    languages: [{ type: String }],

    // Service Types
    serviceTypes: [{
      type: String,
      enum: [
        'elderly_care',
        'child_care',
        'special_needs',
        'disability_care',
        'post_surgery',
        'companionship',
        'respite_care',
        'palliative_care',
        'dementia_care',
        'alzheimers_care',
        'mobility_assistance',
        'medication_management',
        'meal_preparation',
        'personal_hygiene',
        'transportation',
        'overnight_care',
        'personal_care',
      ],
    }],

    // Work Preferences
    workPreferences: [{
      type: String,
      enum: [
        'live_in',
        'live_out',
        'part_time',
        'full_time',
        'overnight',
        'weekends',
        'holidays',
      ],
    }],

    // Rates
    hourlyRate: { type: Number, min: 0 },
    dailyRate: { type: Number, min: 0 },
    weeklyRate: { type: Number, min: 0 },
    monthlyRate: { type: Number, min: 0 },
    currency: { type: String, default: 'NPR' },

    // Skills & Certifications
    skills: [{ type: String }],
    certifications: [{
      name: { type: String, required: true },
      issuer: { type: String },
      issueDate: { type: Date },
      expiryDate: { type: Date },
      documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'CaregiverDocument' },
      verified: { type: Boolean, default: false },
    }],

    // Service Area
    serviceRadius: { 
      type: Number, 
      min: 0, 
      default: 25, // in km
    },
    serviceAreas: [{
      city: { type: String },
      state: { type: String },
      zipCode: { type: String },
    }],

    // Availability
    availability: {
      days: [{
        type: String,
        enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
      }],
      hours: {
        start: { type: String },
        end: { type: String },
      },
      immediateAvailability: { type: Boolean, default: false },
      availableFrom: { type: Date },
    },
    calendar: [{
      date: { type: Date },
      isAvailable: { type: Boolean, default: true },
      slots: [{
        start: { type: String },
        end: { type: String },
        booked: { type: Boolean, default: false },
        bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
      }],
    }],
    blockedDates: [{ type: Date }],

    // Employment History
    previousEmployers: [{
      name: { type: String },
      position: { type: String },
      duration: { type: String },
      startDate: { type: Date },
      endDate: { type: Date },
      duties: { type: String },
      reference: { type: String },
      contactPhone: { type: String },
      contactEmail: { type: String },
    }],

    // Background Check
    backgroundCheck: {
      status: { 
        type: String, 
        enum: ['not_started', 'in_progress', 'passed', 'failed', 'expired'],
        default: 'not_started',
      },
      provider: { type: String },
      requestedAt: { type: Date },
      completedAt: { type: Date },
      expiryDate: { type: Date },
      documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'CaregiverDocument' },
      notes: { type: String },
    },

    // Emergency Contact
    emergencyContact: {
      name: { type: String },
      relationship: { type: String },
      phone: { type: String },
      email: { type: String },
    },

    // Banking & Payments
    bankDetails: {
      accountHolder: { type: String },
      accountNumber: { type: String }, // Should be encrypted in production
      bankName: { type: String },
      routingNumber: { type: String },
      verified: { type: Boolean, default: false },
    },
    paypalEmail: { type: String },
    preferredPaymentMethod: {
      type: String,
      enum: ['bank_transfer', 'paypal', 'check', 'cash'],
    },

    // Earnings
    earnings: {
      total: { type: Number, default: 0 },
      pending: { type: Number, default: 0 },
      withdrawn: { type: Number, default: 0 },
      lastPayout: { type: Date },
    },

    // ============================================
    // TRUST SCORE SYSTEM
    // Comprehensive trust score (0-100) based on multiple factors
    // ============================================
    trustScore: {
      overall: {
        type: Number,
        default: 0,
        min: 0,
        max: 100,
        index: true,
      },
      components: {
        completedBookings: { type: Number, default: 0, min: 0, max: 25 },    // 0-25 points
        reviewScore: { type: Number, default: 0, min: 0, max: 25 },          // 0-25 points
        cancellationRate: { type: Number, default: 15, min: 0, max: 15 },    // 0-15 points (inverted)
        responseRate: { type: Number, default: 0, min: 0, max: 15 },         // 0-15 points
        profileCompleteness: { type: Number, default: 0, min: 0, max: 10 },  // 0-10 points
        verificationStatus: { type: Number, default: 0, min: 0, max: 10 },   // 0-10 points
      },
      tier: {
        type: String,
        enum: ['basic', 'verified', 'trusted', 'elite'],
        default: 'basic',
      },
      lastCalculated: { type: Date },
    },

    // Cancellation statistics for trust score calculation
    cancellationStats: {
      totalCancelled: { type: Number, default: 0 },
      cancelledByCaregiver: { type: Number, default: 0 },
      totalCompleted: { type: Number, default: 0 },
      cancellationRate: { type: Number, default: 0 },  // percentage (0-100)
      lastCancelledAt: { type: Date },
    },

    // Stats & Ratings
    profileViews: { type: Number, default: 0 },
    rating: { 
      type: Number, 
      min: 0, 
      max: 5, 
      default: 0,
    },
    totalReviews: { type: Number, default: 0 },
    ratingBreakdown: {
      punctuality: { type: Number, min: 0, max: 5, default: 0 },
      professionalism: { type: Number, min: 0, max: 5, default: 0 },
      communication: { type: Number, min: 0, max: 5, default: 0 },
      qualityOfCare: { type: Number, min: 0, max: 5, default: 0 },
      valueForMoney: { type: Number, min: 0, max: 5, default: 0 },
    },
    completedJobs: { type: Number, default: 0 },
    responseRate: { type: Number, default: 0 },
    responseTime: { type: String }, // e.g., "within 1 hour"

    // Admin Controls
    featured: { type: Boolean, default: false },
    featuredUntil: { type: Date },
    verified: { type: Boolean, default: false },
    verifiedAt: { type: Date },
    completionPercentage: { type: Number, default: 0 },
    adminNotes: { type: String },

    // Recommendation badge — admin-awarded
    isRecommended: { type: Boolean, default: false, index: true },
    recommendedAt: { type: Date },
    recommendedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    // Search & Discovery
    searchable: { type: Boolean, default: true },
    lastActive: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ============================================
// INDEXES - Optimized for production queries
// ============================================

// Primary lookup: userId is already unique+indexed in schema definition

// Service filtering - most common search filter
caregiverSchema.index({ serviceTypes: 1 });

// Location-based filtering
caregiverSchema.index({ 'serviceAreas.city': 1 });

// Featured & verified caregivers with rating sort (admin/homepage queries)
caregiverSchema.index({ featured: 1, rating: -1 });
caregiverSchema.index({ verified: 1, rating: -1 });

// Price-based filtering and sorting
caregiverSchema.index({ hourlyRate: 1 });

// Recent caregivers listing
caregiverSchema.index({ createdAt: -1 });

// Search visibility filter (used in match stage)
caregiverSchema.index({ searchable: 1 });

// Activity-based sorting and filtering
caregiverSchema.index({ lastActive: -1 });

// Compound index for common search pattern: active searchable caregivers
caregiverSchema.index({ searchable: 1, verified: 1, rating: -1 });

// Background check status queries (admin, compliance)
caregiverSchema.index({ 'backgroundCheck.status': 1 });

// Virtual: Get all documents for this caregiver
caregiverSchema.virtual('documents', {
  ref: 'CaregiverDocument',
  localField: '_id',
  foreignField: 'caregiverId',
});

// Method to calculate profile completion
caregiverSchema.methods.calculateCompletion = function() {
  let completed = 0;
  let total = 10;

  if (this.bio) completed++;
  if (this.experience > 0) completed++;
  if (this.serviceTypes?.length > 0) completed++;
  if (this.skills?.length > 0) completed++;
  if (this.hourlyRate) completed++;
  if (this.availability?.days?.length > 0) completed++;
  if (this.languages?.length > 0) completed++;
  if (this.previousEmployers?.length > 0) completed++;
  if (this.backgroundCheck?.status === 'passed') completed++;
  if (this.certifications?.length > 0) completed++;

  this.completionPercentage = Math.round((completed / total) * 100);
  return this.completionPercentage;
};

// Method to determine trust tier based on overall score
caregiverSchema.methods.calculateTrustTier = function() {
  const score = this.trustScore?.overall || 0;
  if (score >= 90) return 'elite';
  if (score >= 70) return 'trusted';
  if (score >= 50) return 'verified';
  return 'basic';
};

// Method to update trust tier after score calculation
caregiverSchema.methods.updateTrustTier = function() {
  this.trustScore.tier = this.calculateTrustTier();
  return this.trustScore.tier;
};

// Pre-save: Update completion percentage
caregiverSchema.pre('save', function(next) {
  this.calculateCompletion();
  next();
});

// Static method to find by userId
caregiverSchema.statics.findByUserId = function(userId) {
  return this.findOne({ userId }).populate('userId', 'fullName email phone avatar location status');
};

const Caregiver = mongoose.model('Caregiver', caregiverSchema);

export default Caregiver;
