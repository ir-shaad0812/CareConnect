import mongoose from 'mongoose';

/**
 * UserPreference Model
 * Tracks care seeker preferences for AI-powered matching
 * Adapts over time based on user interactions
 */
const userPreferenceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },

    // Explicit preferences (set by user)
    preferredGender: {
      type: String,
      enum: ['male', 'female', 'no_preference'],
      default: 'no_preference',
    },
    preferredLanguages: [{ type: String }],
    budgetMin: { type: Number, min: 0 },
    budgetMax: { type: Number, min: 0 },
    budgetType: {
      type: String,
      enum: ['hourly', 'daily', 'weekly', 'monthly'],
      default: 'hourly',
    },
    preferredSkills: [{ type: String }],
    preferredServiceTypes: [{
      type: String,
      enum: [
        'elderly_care', 'child_care', 'special_needs', 'disability_care',
        'post_surgery', 'companionship', 'respite_care', 'palliative_care',
        'dementia_care', 'alzheimers_care', 'mobility_assistance',
        'medication_management', 'meal_preparation', 'personal_hygiene',
        'transportation',
      ],
    }],
    preferredCertifications: [{ type: String }],
    maxDistance: { type: Number, default: 25, min: 1 }, // in km
    minExperience: { type: Number, default: 0, min: 0 },
    minRating: { type: Number, default: 0, min: 0, max: 5 },
    backgroundCheckRequired: { type: Boolean, default: false },

    // Learned preferences (computed from interactions)
    frequentlySelectedSkills: [{
      skill: { type: String },
      count: { type: Number, default: 0 },
      lastSelected: { type: Date },
    }],
    frequentlyViewedServiceTypes: [{
      serviceType: { type: String },
      count: { type: Number, default: 0 },
      lastViewed: { type: Date },
    }],
    previouslyHiredCaregivers: [{
      caregiverId: { type: mongoose.Schema.Types.ObjectId, ref: 'Caregiver' },
      hiredCount: { type: Number, default: 1 },
      lastHired: { type: Date },
      rating: { type: Number },
    }],

    // Dynamic weight adjustments (learned over time)
    weightOverrides: {
      skills: { type: Number, default: 40, min: 0, max: 100 },
      availability: { type: Number, default: 20, min: 0, max: 100 },
      distance: { type: Number, default: 15, min: 0, max: 100 },
      ratings: { type: Number, default: 15, min: 0, max: 100 },
      budget: { type: Number, default: 10, min: 0, max: 100 },
    },

    // Search history for semantic learning
    recentSearchQueries: [{
      query: { type: String },
      timestamp: { type: Date, default: Date.now },
      resultsClicked: { type: Number, default: 0 },
    }],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

userPreferenceSchema.index({ updatedAt: -1 });

/**
 * Sync preferences from CareSeeker profile
 */
userPreferenceSchema.statics.syncFromCareSeeker = async function (userId, careSeeker) {
  const updates = {};

  if (careSeeker.caregiverPreferences?.gender) {
    updates.preferredGender = careSeeker.caregiverPreferences.gender;
  }
  if (careSeeker.caregiverPreferences?.languages?.length) {
    updates.preferredLanguages = careSeeker.caregiverPreferences.languages;
  }
  if (careSeeker.budget?.min != null) updates.budgetMin = careSeeker.budget.min;
  if (careSeeker.budget?.max != null) updates.budgetMax = careSeeker.budget.max;
  if (careSeeker.budget?.type) updates.budgetType = careSeeker.budget.type;
  if (careSeeker.careNeeds?.length) updates.preferredServiceTypes = careSeeker.careNeeds;
  if (careSeeker.caregiverPreferences?.certifications?.length) {
    updates.preferredCertifications = careSeeker.caregiverPreferences.certifications;
  }
  if (careSeeker.caregiverPreferences?.minExperience != null) {
    updates.minExperience = careSeeker.caregiverPreferences.minExperience;
  }
  if (careSeeker.caregiverPreferences?.backgroundCheckRequired != null) {
    updates.backgroundCheckRequired = careSeeker.caregiverPreferences.backgroundCheckRequired;
  }

  return this.findOneAndUpdate(
    { userId },
    { $set: updates },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
};

const UserPreference = mongoose.model('UserPreference', userPreferenceSchema);

export default UserPreference;
