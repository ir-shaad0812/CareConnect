// ============================================
// APPLICATION CONSTANTS
// ============================================

// User Roles
export const USER_ROLES = {
  CAREGIVER: 'caregiver',
  CARESEEKER: 'careseeker',
  ADMIN: 'admin',
} as const;

// User Status
export const USER_STATUS = {
  PENDING: 'pending',
  PENDING_APPROVAL: 'pending_approval',
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  DELETED: 'deleted',
} as const;

// Booking Status
export const BOOKING_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  DISPUTED: 'disputed',
} as const;

// Document Types
export const DOCUMENT_TYPES = {
  ID_PROOF: 'id_proof',
  ADDRESS_PROOF: 'address_proof',
  CERTIFICATION: 'certification',
  BACKGROUND_CHECK: 'background_check',
} as const;

// Document Status
export const DOCUMENT_STATUS = {
  PENDING: 'pending',
  VERIFIED: 'verified',
  REJECTED: 'rejected',
} as const;

// Service Types
export const SERVICE_TYPES = {
  ELDERLY_CARE: 'elderly_care',
  CHILD_CARE: 'child_care',
  SPECIAL_NEEDS: 'special_needs',
  DISABILITY_CARE: 'disability_care',
  POST_SURGERY: 'post_surgery',
  COMPANIONSHIP: 'companionship',
  RESPITE_CARE: 'respite_care',
  PALLIATIVE_CARE: 'palliative_care',
  DEMENTIA_CARE: 'dementia_care',
  ALZHEIMERS_CARE: 'alzheimers_care',
  OVERNIGHT_CARE: 'overnight_care',
  MEDICATION_MANAGEMENT: 'medication_management',
  MOBILITY_ASSISTANCE: 'mobility_assistance',
  PERSONAL_CARE: 'personal_care',
  MEAL_PREPARATION: 'meal_preparation',
} as const;

// Service Type Labels
export const SERVICE_TYPE_LABELS: Record<string, string> = {
  elderly_care: 'Elderly Care',
  child_care: 'Child Care',
  special_needs: 'Special Needs',
  disability_care: 'Disability Care',
  post_surgery: 'Post-Surgery',
  companionship: 'Companionship',
  respite_care: 'Respite Care',
  palliative_care: 'Palliative Care',
  dementia_care: 'Dementia Care',
  alzheimers_care: "Alzheimer's Care",
  overnight_care: 'Overnight Care',
  medication_management: 'Medication Mgmt',
  mobility_assistance: 'Mobility Assist',
  personal_care: 'Personal Care',
  meal_preparation: 'Meal Prep',
};

// Service Type Options (for dropdowns)
export const SERVICE_TYPE_OPTIONS = Object.entries(SERVICE_TYPE_LABELS).map(
  ([value, label]) => ({ value, label })
);

// Service Type Icons
export const SERVICE_TYPE_ICONS: Record<string, string> = {
  elderly_care: '👴',
  child_care: '👶',
  special_needs: '💙',
  disability_care: '♿',
  post_surgery: '🏥',
  companionship: '🤝',
  respite_care: '😌',
  palliative_care: '❤️',
  dementia_care: '🧠',
  alzheimers_care: '🧠',
  overnight_care: '🌙',
  medication_management: '💊',
  mobility_assistance: '🦽',
  personal_care: '🛁',
  meal_preparation: '🍳',
};

// Languages
export const LANGUAGE_OPTIONS = [
  'English', 'Nepali', 'Hindi', 'Sinhala', 'Tamil',
  'Spanish', 'French', 'Mandarin', 'Arabic',
] as const;

// Skill Options
export const SKILL_OPTIONS = [
  'Child Care', 'Senior Care', 'Special Needs', 'First Aid', 'CPR',
  'Meal Preparation', 'Light Housekeeping', 'Medication Management',
  'Physical Therapy', "Alzheimer's Care", 'Dementia Care', 'Hospice Care',
  'Newborn Care', 'Overnight Care', 'Transportation', 'Companionship',
] as const;

// Sort Options
export const SORT_OPTIONS = [
  { value: 'relevance', label: 'Best Match' },
  { value: 'rating', label: 'Highest Rated' },
  { value: 'price_low', label: 'Price: Low to High' },
  { value: 'price_high', label: 'Price: High to Low' },
  { value: 'experience', label: 'Most Experienced' },
  { value: 'distance', label: 'Nearest' },
] as const;

// Duration Types
export const DURATION_TYPES = [
  { value: 'hourly', label: 'Hourly' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
] as const;

// Validation Rules
export const VALIDATION = {
  MIN_PASSWORD_LENGTH: 8,
  MAX_NAME_LENGTH: 100,
  MAX_BIO_LENGTH: 1000,
  MIN_AGE: 18,
  MAX_AGE: 120,
} as const;
