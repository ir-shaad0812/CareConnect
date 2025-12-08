/**
 * AI Match Types
 * 
 * TypeScript interfaces for the AI-powered caregiver matching system.
 * Maps directly to the API response shapes.
 */

// ─── Match Score & Breakdown ───────────────────────────────────────

export interface MatchBreakdown {
  skills: number;
  availability: number;
  distance: number;
  ratings: number;
  budget: number;
}

export interface MatchRawScores {
  skills: number;
  availability: number;
  distance: number;
  ratings: number;
  budget: number;
}

export type MatchCategory = 'excellent' | 'good' | 'fair' | 'low';

export interface CertificationInfo {
  name: string;
  verified: boolean;
}

export interface CaregiverAvailability {
  days: string[];
  immediateAvailability: boolean;
  workPreferences: string[];
}

export interface CaregiverLocation {
  city: string | null;
  state: string | null;
  country: string | null;
}

export interface RatingBreakdown {
  punctuality: number;
  professionalism: number;
  communication: number;
  qualityOfCare: number;
  valueForMoney: number;
}

// ─── AI Match Result (single caregiver) ────────────────────────────

export interface AIMatchResult {
  rank: number;
  caregiverId: string;
  userId: string;

  // Profile
  fullName: string;
  avatar: string | null;
  gender: string | null;
  isEmailVerified: boolean;
  location: CaregiverLocation;

  // Professional
  experience: number;
  bio: string | null;
  headline: string | null;
  languages: string[];
  serviceTypes: string[];
  skills: string[];
  certifications: CertificationInfo[];

  // Rates
  hourlyRate: number | null;
  dailyRate: number | null;
  weeklyRate: number | null;
  monthlyRate: number | null;
  currency: string;

  // Availability
  availability: CaregiverAvailability;

  // Stats
  rating: number;
  totalReviews: number;
  ratingBreakdown: RatingBreakdown | null;
  completedJobs: number;
  responseRate: number;
  responseTime: string | null;

  // Trust
  verified: boolean;
  featured: boolean;
  backgroundCheck: string;

  // AI Match
  matchScore: number;
  breakdown: MatchBreakdown;
  rawScores: MatchRawScores;
  reasons: string[];
  category: MatchCategory;
  personalizationBoost: number;
}

// ─── Search Request ────────────────────────────────────────────────

export interface AIMatchSearchParams {
  query?: string;
  filters?: AIMatchFilters;
  location?: {
    coordinates?: [number, number]; // [lng, lat]
    city?: string;
    state?: string;
  };
  budget?: {
    min?: number;
    max?: number;
    type?: 'hourly' | 'daily' | 'weekly' | 'monthly';
  };
  serviceTypes?: string[];
  skills?: string[];
  sortBy?: AIMatchSortOption;
  page?: number;
  limit?: number;
}

export interface AIMatchFilters {
  minExperience?: number;
  minRating?: number;
  maxDistance?: number;
  workPreferences?: string[];
  preferredGender?: 'male' | 'female' | 'no_preference';
  backgroundCheckRequired?: boolean;
  urgency?: string;
  preferredDays?: string[];
  languages?: string[];
  certifications?: string[];
  serviceTypes?: string[];
  skills?: string[];
  minRate?: number;
  maxRate?: number;
}

export type AIMatchSortOption =
  | 'match_score'
  | 'distance'
  | 'price_low'
  | 'price_high'
  | 'rating'
  | 'experience'
  | 'reviews';

// ─── Search Response ───────────────────────────────────────────────

export interface SemanticConcept {
  concept: string;
  label: string;
  score: number;
}

export interface ParsedQuery {
  original: string;
  parsed: {
    serviceTypes: string[];
    skills: string[];
    filters: Record<string, unknown>;
    concepts: SemanticConcept[];
    confidence: number;
  };
  criteria: {
    serviceTypes: string[];
    skills: string[];
    city: string | null;
    state: string | null;
    hasCoordinates: boolean;
    budgetType: string | null;
    hasBudgetRange: boolean;
    minExperience: number | null;
    urgency: string | null;
    workPreferences: string[];
  };
}

export interface AIMatchSearchResponse {
  success: boolean;
  results: AIMatchResult[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  query: ParsedQuery;
  meta?: {
    weights: MatchBreakdown;
    totalCandidates: number;
    searchTime: number;
  };
}

// ─── Suggestions ───────────────────────────────────────────────────

export interface SearchSuggestion {
  text: string;
  type: 'service' | 'filter' | 'example';
  matchedTerm?: string;
}

// ─── User Preferences ─────────────────────────────────────────────

export interface AIMatchPreferences {
  preferredGender: string;
  preferredLanguages: string[];
  budgetMin: number | null;
  budgetMax: number | null;
  budgetType: string;
  preferredSkills: string[];
  preferredServiceTypes: string[];
  preferredCertifications: string[];
  maxDistance: number;
  minExperience: number;
  minRating: number;
  backgroundCheckRequired: boolean;
  weightOverrides: MatchBreakdown;
}

// ─── Interaction Tracking ──────────────────────────────────────────

export type InteractionAction =
  | 'viewed'
  | 'shortlisted'
  | 'contacted'
  | 'booked'
  | 'reviewed'
  | 'removed'
  | 'profile_click';

export interface TrackInteractionParams {
  caregiverId: string;
  action: InteractionAction;
  metadata?: {
    searchQuery?: string;
    matchScore?: number;
    position?: number;
    source?: string;
    timeSpent?: number;
  };
}

// ─── Service Type Labels ───────────────────────────────────────────

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
  mobility_assistance: 'Mobility Assistance',
  medication_management: 'Medication Management',
  meal_preparation: 'Meal Preparation',
  personal_hygiene: 'Personal Hygiene',
  transportation: 'Transportation',
};

export const SORT_OPTIONS: { value: AIMatchSortOption; label: string }[] = [
  { value: 'match_score', label: 'Best Match' },
  { value: 'rating', label: 'Highest Rated' },
  { value: 'price_low', label: 'Price: Low to High' },
  { value: 'price_high', label: 'Price: High to Low' },
  { value: 'experience', label: 'Most Experienced' },
  { value: 'distance', label: 'Nearest First' },
  { value: 'reviews', label: 'Most Reviews' },
];

export const DAYS_OF_WEEK = [
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
] as const;

export const WORK_PREFERENCE_OPTIONS = [
  { value: 'live_in', label: 'Live-in' },
  { value: 'live_out', label: 'Live-out' },
  { value: 'part_time', label: 'Part Time' },
  { value: 'full_time', label: 'Full Time' },
  { value: 'overnight', label: 'Overnight' },
  { value: 'weekends', label: 'Weekends' },
  { value: 'holidays', label: 'Holidays' },
];
