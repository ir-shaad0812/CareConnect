import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { 
  USER_ROLES, 
  USER_STATUS, 
  GENDER, 
  AUTH_PROVIDERS 
} from '../constants/index.js';

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      minlength: [2, 'Full name must be at least 2 characters'],
      maxlength: [100, 'Full name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    password: {
      type: String,
      minlength: [8, 'Password must be at least 8 characters'],
      select: false, // Never select password by default
    },
    phone: { type: String, trim: true },
    age : {
      type: Number,
      min: [18, 'You must be at least 18 years old'],
      max: [120, 'Invalid age'],
    },
    gender: { type: String, enum: Object.values(GENDER) },
    avatar: { type: String },
    avatarPublicId: { type: String }, // Cloudinary public ID for avatar deletion
    avatarHistory: [{
      url:       { type: String },
      publicId:  { type: String },
      action:    { type: String, enum: ['upload', 'delete'], default: 'upload' },
      createdAt: { type: Date, default: Date.now },
    }],
    role: {
      type: String,
      enum: [...Object.values(USER_ROLES), null],
      default: null,
    },
    status: {
      type: String,
      enum: ['onboarding', 'pending', 'pending_approval', 'active', 'suspended', 'rejected', 'deleted'],
      default: USER_STATUS.PENDING,
    },
    location: {
      address: { type: String },
      city: { type: String },
      state: { type: String },
      country: { type: String },
      zipCode: { type: String },
      postalCode: { type: String },
      coordinates: {
        type: { type: String, enum: ['Point'] },
        coordinates: [Number],
      },
    },
    // Live location proof for care-seekers (replaces image-based address verification)
    locationProof: {
      locationName: { type: String },
      placeId: { type: String },
      coordinates: {
        lat: { type: Number },
        lng: { type: Number },
      },
      selectedCoordinates: {
        lat: { type: Number },
        lng: { type: Number },
      },
      gpsCoordinates: {
        lat: { type: Number },
        lng: { type: Number },
      },
      distanceKm: { type: Number },
      gpsVerified: { type: Boolean, default: false },
      trustScore: { type: Number, default: 0 },
      accuracy: { type: Number }, // GPS accuracy in meters
      address: { type: String }, // Reverse geocoded full address
      city: { type: String },
      state: { type: String },
      country: { type: String },
      postalCode: { type: String },
      capturedAt: { type: Date }, // When the location was captured
      verificationStatus: {
        type: String,
        enum: ['pending', 'verified', 'rejected'],
        default: 'pending',
      },
      verifiedAt: { type: Date },
      verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      rejectionReason: { type: String },
    },
    authProvider: {
      type: String,
      enum: Object.values(AUTH_PROVIDERS),
      default: AUTH_PROVIDERS.LOCAL,
    },
    googleId: { type: String, sparse: true, select: false },
    facebookId: { type: String, sparse: true, select: false },
    isEmailVerified: { type: Boolean, default: false },
    isPhoneVerified: { type: Boolean, default: false },
    loginAttempts: { type: Number, default: 0, select: false },
    lockUntil: { type: Date, select: false },
    lastLogin: { type: Date },
    isProfileComplete: { type: Boolean, default: false },
    
    // Common profile fields
    bio: { type: String, maxlength: [1000, 'Bio cannot exceed 1000 characters'] },
    languages: [{ type: String }],
    
    // i18n: User's preferred UI language
    preferredLanguage: {
      type: String,
      enum: ['en', 'ne', 'hi', 'ur', 'ar'],
      default: 'en',
    },
    
    // Caregiver-specific fields
    experience: { type: Number, min: 0 },
    hourlyRate: { type: Number, min: 0 },
    dailyRate: { type: Number, min: 0 },
    weeklyRate: { type: Number, min: 0 },
    monthlyRate: { type: Number, min: 0 },
    skills: [{ type: String }],
    certifications: [{
      name: { type: String },
      issuer: { type: String },
      issueDate: { type: Date },
      expiryDate: { type: Date },
      documentUrl: { type: String },
      verified: { type: Boolean, default: false },
    }],
    serviceTypes: [{
      type: String,
      enum: [
        'elderly_care', 'child_care', 'special_needs', 'disability_care',
        'post_surgery', 'companionship', 'respite_care', 'palliative_care',
        'dementia_care', 'alzheimers_care', 'mobility_assistance',
        'medication_management', 'meal_preparation', 'personal_hygiene',
        'transportation', 'overnight_care', 'personal_care',
      ],
    }],
    workPreferences: [{
      type: String,
      enum: ['live_in', 'live_out', 'part_time', 'full_time', 'overnight', 'weekends', 'holidays'],
    }],
    serviceRadius: { type: Number, min: 0, default: 25 }, // in km
    availability: {
      days: [{ type: String }],
      hours: {
        start: { type: String },
        end: { type: String },
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
    },
    previousEmployers: [{
      name: { type: String },
      duration: { type: String },
      duties: { type: String },
      reference: { type: String },
      contactPhone: { type: String },
    }],
    backgroundCheck: {
      status: { 
        type: String, 
        enum: ['not_started', 'in_progress', 'passed', 'failed', 'expired'],
        default: 'not_started',
      },
      provider: { type: String },
      completedAt: { type: Date },
      expiryDate: { type: Date },
      reportUrl: { type: String },
    },
    emergencyContact: {
      name: { type: String },
      relationship: { type: String },
      phone: { type: String },
      email: { type: String },
    },
    bankDetails: {
      accountHolder: { type: String, select: false },
      accountNumber: { type: String, select: false }, // Should be encrypted in production
      bankName: { type: String, select: false },
      routingNumber: { type: String, select: false },
      verified: { type: Boolean, default: false },
    },
    earnings: {
      total: { type: Number, default: 0 },
      pending: { type: Number, default: 0 },
      withdrawn: { type: Number, default: 0 },
      lastPayout: { type: Date },
    },
    profileViews: { type: Number, default: 0 },
    rating: { type: Number, min: 0, max: 5, default: 0 },
    totalReviews: { type: Number, default: 0 },
    ratingBreakdown: {
      punctuality: { type: Number, min: 0, max: 5, default: 0 },
      professionalism: { type: Number, min: 0, max: 5, default: 0 },
      communication: { type: Number, min: 0, max: 5, default: 0 },
      qualityOfCare: { type: Number, min: 0, max: 5, default: 0 },
      valueForMoney: { type: Number, min: 0, max: 5, default: 0 },
    },
    featured: { type: Boolean, default: false },
    completionPercentage: { type: Number, default: 0 },

    // Agreement — signed during complete-profile flow (onboarding step 4)
    agreementAccepted: { type: Boolean, default: false },
    agreementAcceptedAt: { type: Date },
    agreementVersion: { type: String, default: 'v1.0' },

    // Careseeker-specific fields
    careNeeds: [{ type: String }],
    preferredSchedule: {
      days: [{ type: String }],
      hours: {
        start: { type: String },
        end: { type: String },
      },
    },
    budget: {
      min: { type: Number },
      max: { type: Number },
      type: { type: String, enum: ['hourly', 'daily', 'weekly', 'monthly'] },
    },
    familyMembers: [{
      name: { type: String },
      age: { type: Number },
      relationship: { type: String },
      specialNeeds: { type: String },
    }],

    // Notification preferences and push devices
    notificationPreferences: {
      booking: {
        inApp: { type: Boolean, default: true },
        push: { type: Boolean, default: true },
        email: { type: Boolean, default: true },
        sms: { type: Boolean, default: false },
      },
      payment: {
        inApp: { type: Boolean, default: true },
        push: { type: Boolean, default: true },
        email: { type: Boolean, default: true },
        sms: { type: Boolean, default: true },
      },
      chat: {
        inApp: { type: Boolean, default: true },
        push: { type: Boolean, default: true },
        email: { type: Boolean, default: false },
        sms: { type: Boolean, default: false },
      },
      document: {
        inApp: { type: Boolean, default: true },
        push: { type: Boolean, default: true },
        email: { type: Boolean, default: true },
        sms: { type: Boolean, default: false },
      },
      profile: {
        inApp: { type: Boolean, default: true },
        push: { type: Boolean, default: false },
        email: { type: Boolean, default: false },
        sms: { type: Boolean, default: false },
      },
      review: {
        inApp: { type: Boolean, default: true },
        push: { type: Boolean, default: true },
        email: { type: Boolean, default: true },
        sms: { type: Boolean, default: false },
      },
      system: {
        inApp: { type: Boolean, default: true },
        push: { type: Boolean, default: false },
        email: { type: Boolean, default: true },
        sms: { type: Boolean, default: false },
      },
      promotion: {
        inApp: { type: Boolean, default: true },
        push: { type: Boolean, default: false },
        email: { type: Boolean, default: true },
        sms: { type: Boolean, default: false },
      },
    },
    notificationDevices: [{
      token: { type: String },
      provider: { type: String, enum: ['fcm', 'apns', 'webpush'], default: 'fcm' },
      platform: { type: String, enum: ['web', 'android', 'ios'], default: 'web' },
      lastSeenAt: { type: Date, default: Date.now },
    }],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for performance
// Note: email index is automatically created by unique: true in schema
userSchema.index({ role: 1, status: 1 }); // Compound index for filtered queries
userSchema.index({ 'location.coordinates': '2dsphere' }); // Geospatial index

// Virtual for checking if account is locked
userSchema.virtual('isLocked').get(function () {
  return this.lockUntil && this.lockUntil > Date.now();
});

// Pre-save middleware to hash password
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  
  if (this.password) {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
  }
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password) return false;
  return await bcrypt.compare(candidatePassword, this.password);
};

// Increment login attempts
userSchema.methods.incrementLoginAttempts = async function () {
  const MAX_ATTEMPTS = 5;
  const LOCK_TIME = 30 * 60 * 1000;

  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $set: { loginAttempts: 1 },
      $unset: { lockUntil: 1 },
    });
  }

  const updates = { $inc: { loginAttempts: 1 } };

  if (this.loginAttempts + 1 >= MAX_ATTEMPTS && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + LOCK_TIME };
  }

  return this.updateOne(updates);
};

// Reset login attempts
userSchema.methods.resetLoginAttempts = async function () {
  return this.updateOne({
    $set: { loginAttempts: 0, lastLogin: new Date() },
    $unset: { lockUntil: 1 },
  });
};

// Transform toJSON
userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.password;
  delete user.loginAttempts;
  delete user.lockUntil;
  delete user.__v;
  return user;
};

const User = mongoose.model('User', userSchema);

export default User;
