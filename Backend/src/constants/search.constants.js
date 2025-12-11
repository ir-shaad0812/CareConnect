// ============================================
// SEARCH CONSTANTS
// Constants for caregiver search and discovery
// ============================================

// Sort options for search
export const SEARCH_SORT_OPTIONS = {
  RELEVANCE: 'relevance',
  RATING_HIGH: 'rating_high',
  RATING_LOW: 'rating_low',
  PRICE_LOW: 'price_low',
  PRICE_HIGH: 'price_high',
  EXPERIENCE_HIGH: 'experience_high',
  EXPERIENCE_LOW: 'experience_low',
  NEWEST: 'newest',
  AVAILABILITY: 'availability',
  DISTANCE: 'distance',
};

// Filter types
export const FILTER_TYPES = {
  SERVICE_TYPE: 'serviceType',
  LOCATION: 'location',
  PRICE_RANGE: 'priceRange',
  EXPERIENCE: 'experience',
  RATING: 'rating',
  AVAILABILITY: 'availability',
  LANGUAGES: 'languages',
  GENDER: 'gender',
  WORK_PREFERENCES: 'workPreferences',
  VERIFIED: 'verified',
  BACKGROUND_CHECK: 'backgroundCheck',
  CERTIFICATIONS: 'certifications',
};

// Experience levels
export const EXPERIENCE_LEVELS = {
  ENTRY: { min: 0, max: 1, label: 'Entry Level (0-1 years)' },
  JUNIOR: { min: 1, max: 3, label: 'Junior (1-3 years)' },
  MID: { min: 3, max: 5, label: 'Mid-Level (3-5 years)' },
  SENIOR: { min: 5, max: 10, label: 'Senior (5-10 years)' },
  EXPERT: { min: 10, max: null, label: 'Expert (10+ years)' },
};

// Rating ranges
export const RATING_RANGES = {
  EXCELLENT: { min: 4.5, max: 5, label: '4.5+ Excellent' },
  VERY_GOOD: { min: 4.0, max: 4.5, label: '4.0+ Very Good' },
  GOOD: { min: 3.5, max: 4.0, label: '3.5+ Good' },
  AVERAGE: { min: 3.0, max: 3.5, label: '3.0+ Average' },
  ANY: { min: 0, max: 5, label: 'Any Rating' },
};

// Price ranges (hourly rate in NPR - Nepali Rupees)
export const PRICE_RANGES = {
  BUDGET: { min: 0, max: 500, label: 'Under Rs. 500/hr' },
  ECONOMY: { min: 500, max: 1000, label: 'Rs. 500–1,000/hr' },
  STANDARD: { min: 1000, max: 1800, label: 'Rs. 1,000–1,800/hr' },
  PREMIUM: { min: 1800, max: 3000, label: 'Rs. 1,800–3,000/hr' },
  LUXURY: { min: 3000, max: null, label: 'Rs. 3,000+/hr' },
};

// Distance ranges (in km)
export const DISTANCE_RANGES = {
  NEARBY: { max: 5, label: 'Within 5 km' },
  LOCAL: { max: 10, label: 'Within 10 km' },
  CITY: { max: 25, label: 'Within 25 km' },
  REGIONAL: { max: 50, label: 'Within 50 km' },
  ANY: { max: null, label: 'Any Distance' },
};

// Availability options
export const AVAILABILITY_OPTIONS = {
  IMMEDIATELY: 'immediately',
  THIS_WEEK: 'this_week',
  THIS_MONTH: 'this_month',
  FLEXIBLE: 'flexible',
};

// Search pagination
export const SEARCH_PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 12,
  MAX_LIMIT: 50,
};

// Search error messages
export const SEARCH_ERRORS = {
  INVALID_FILTERS: 'Invalid search filters',
  INVALID_SORT: 'Invalid sort option',
  INVALID_COORDINATES: 'Invalid location coordinates',
  NO_RESULTS: 'No caregivers found matching your criteria',
  SEARCH_FAILED: 'Search failed. Please try again.',
};

// Search success messages
export const SEARCH_SUCCESS = {
  RESULTS_FOUND: 'Search results retrieved successfully',
  FILTERS_APPLIED: 'Filters applied successfully',
  SEARCH_SAVED: 'Search saved successfully',
};

// Default search values
export const SEARCH_DEFAULTS = {
  SORT_BY: SEARCH_SORT_OPTIONS.RELEVANCE,
  MIN_RATING: 0,
  MAX_DISTANCE: 50, // km
  PAGE: 1,
  LIMIT: 12,
};

/**
 * Relevance score weights — used in the $addFields aggregation pipeline.
 * Tune these to adjust how the basic relevance score is computed.
 */
export const RELEVANCE_WEIGHTS = {
  RATING_MULTIPLIER: 20,          // Each rating star × 20
  COMPLETED_JOBS_MULTIPLIER: 0.5, // Each completed job × 0.5
  VERIFIED_BONUS: 10,             // Flat bonus for verified caregivers
  BACKGROUND_CHECK_BONUS: 10,     // Flat bonus for passed background check
  FEATURED_BONUS: 20,             // Flat bonus for featured caregivers
  RESPONSE_RATE_MULTIPLIER: 0.1,  // Response rate (0-100) × 0.1
};
