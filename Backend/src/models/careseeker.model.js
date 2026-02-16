import mongoose from 'mongoose';

/**
 * CareSeeker Model
 * Stores care seeker-specific profile data separate from base user
 * Collection: careseekers (under careconnect database)
 */
const careSeekerSchema = new mongoose.Schema(
  {
    // Reference to base user
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },

    // Care Requirements
    careNeeds: [{
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
      ],
    }],

    careDescription: {
      type: String,
      maxlength: [2000, 'Care description cannot exceed 2000 characters'],
    },

    urgency: {
      type: String,
      enum: ['immediate', 'within_week', 'within_month', 'flexible'],
      default: 'flexible',
    },

    // Family Members Requiring Care
    familyMembers: [{
      name: { type: String, required: true },
      age: { type: Number },
      relationship: { 
        type: String,
        enum: ['self', 'parent', 'grandparent', 'spouse', 'child', 'sibling', 'relative', 'other'],
      },
      gender: { type: String, enum: ['male', 'female', 'other'] },
      specialNeeds: { type: String },
      medicalConditions: [{ type: String }],
      mobilityStatus: {
        type: String,
        enum: ['independent', 'needs_assistance', 'wheelchair', 'bedridden'],
      },
      dietaryRestrictions: [{ type: String }],
      allergies: [{ type: String }],
      medications: [{ type: String }],
      notes: { type: String },
    }],

    // Schedule Preferences
    preferredSchedule: {
      type: {
        type: String,
        enum: ['one_time', 'recurring', 'live_in', 'as_needed'],
      },
      days: [{
        type: String,
        enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
      }],
      hours: {
        start: { type: String },
        end: { type: String },
      },
      frequency: {
        type: String,
        enum: ['daily', 'weekly', 'bi_weekly', 'monthly'],
      },
      startDate: { type: Date },
      endDate: { type: Date },
    },

    // Budget
    budget: {
      min: { type: Number, min: 0 },
      max: { type: Number, min: 0 },
      type: { 
        type: String, 
        enum: ['hourly', 'daily', 'weekly', 'monthly'],
        default: 'hourly',
      },
      currency: { type: String, default: 'USD' },
      negotiable: { type: Boolean, default: true },
    },

    // Caregiver Preferences
    caregiverPreferences: {
      gender: { 
        type: String, 
        enum: ['male', 'female', 'no_preference'],
        default: 'no_preference',
      },
      ageRange: {
        min: { type: Number },
        max: { type: Number },
      },
      minExperience: { type: Number, min: 0 },
      languages: [{ type: String }],
      certifications: [{ type: String }],
      backgroundCheckRequired: { type: Boolean, default: true },
      nonSmoker: { type: Boolean, default: false },
      hasCar: { type: Boolean, default: false },
      petFriendly: { type: Boolean, default: false },
    },

    // Location for Care
    careLocation: {
      type: { 
        type: String, 
        enum: ['home', 'facility', 'hospital', 'other'],
        default: 'home',
      },
      address: { type: String },
      city: { type: String },
      state: { type: String },
      country: { type: String },
      zipCode: { type: String },
      coordinates: {
        type: { type: String, enum: ['Point'] },
        coordinates: [Number],
      },
      accessInstructions: { type: String },
      parkingAvailable: { type: Boolean },
    },

    // Emergency Contact
    emergencyContact: {
      name: { type: String },
      relationship: { type: String },
      phone: { type: String },
      email: { type: String },
    },

    // Secondary Contact
    secondaryContact: {
      name: { type: String },
      relationship: { type: String },
      phone: { type: String },
      email: { type: String },
    },

    // Insurance Information
    insurance: {
      provider: { type: String },
      policyNumber: { type: String },
      groupNumber: { type: String },
      coverageType: { type: String },
      expiryDate: { type: Date },
    },

    // Saved Caregivers
    savedCaregivers: [{
      caregiverId: { type: mongoose.Schema.Types.ObjectId, ref: 'Caregiver' },
      savedAt: { type: Date, default: Date.now },
      notes: { type: String },
    }],

    // Blocked Caregivers
    blockedCaregivers: [{
      caregiverId: { type: mongoose.Schema.Types.ObjectId, ref: 'Caregiver' },
      blockedAt: { type: Date, default: Date.now },
      reason: { type: String },
    }],

    // Activity Stats
    totalBookings: { type: Number, default: 0 },
    activeBookings: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 },
    lastActive: { type: Date, default: Date.now },

    // Preferences
    notifications: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: false },
      push: { type: Boolean, default: true },
      marketing: { type: Boolean, default: false },
    },

    // Admin Controls
    verified: { type: Boolean, default: false },
    verifiedAt: { type: Date },
    adminNotes: { type: String },
    completionPercentage: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
careSeekerSchema.index({ 'careLocation.coordinates': '2dsphere' });
careSeekerSchema.index({ 'careNeeds': 1 });
careSeekerSchema.index({ createdAt: -1 });

// Virtual: Get all documents for this care seeker
careSeekerSchema.virtual('documents', {
  ref: 'CareSeekerDocument',
  localField: '_id',
  foreignField: 'careSeekerId',
});

// Method to calculate profile completion
careSeekerSchema.methods.calculateCompletion = function() {
  let completed = 0;
  let total = 8;

  if (this.careNeeds?.length > 0) completed++;
  if (this.careDescription) completed++;
  if (this.familyMembers?.length > 0) completed++;
  if (this.preferredSchedule?.days?.length > 0) completed++;
  if (this.budget?.max) completed++;
  if (this.careLocation?.city) completed++;
  if (this.emergencyContact?.phone) completed++;
  if (this.caregiverPreferences) completed++;

  this.completionPercentage = Math.round((completed / total) * 100);
  return this.completionPercentage;
};

// Pre-save: Update completion percentage
careSeekerSchema.pre('save', function(next) {
  this.calculateCompletion();
  next();
});

// Static method to find by userId
careSeekerSchema.statics.findByUserId = function(userId) {
  return this.findOne({ userId }).populate('userId', 'fullName email phone avatar location status');
};

const CareSeeker = mongoose.model('CareSeeker', careSeekerSchema);

export default CareSeeker;
