// ============================================
// SEARCH SERVICE - Frontend API Client
// Handles caregiver search and discovery
// ============================================

import { apiClient } from "./client";

// Types
export interface CaregiverPreview {
  _id: string;
  userId: string;
  experience: number;
  bio?: string;
  headline?: string;
  languages: string[];
  serviceTypes: string[];
  workPreferences: string[];
  hourlyRate?: number;
  dailyRate?: number;
  weeklyRate?: number;
  monthlyRate?: number;
  currency: string;
  skills: string[];
  certifications: Array<{
    name: string;
    issuer?: string;
    verified: boolean;
  }>;
  serviceRadius?: number;
  serviceAreas?: Array<{
    city: string;
    state: string;
    zipCode?: string;
  }>;
  availability?: {
    days: string[];
    hours?: { start: string; end: string };
    immediateAvailability: boolean;
    availableFrom?: string;
  };
  backgroundCheck?: {
    status: string;
  };
  rating: number;
  totalReviews: number;
  ratingBreakdown?: {
    punctuality: number;
    professionalism: number;
    communication: number;
    qualityOfCare: number;
    valueForMoney: number;
  };
  completedJobs: number;
  responseRate?: number;
  responseTime?: string;
  featured: boolean;
  verified: boolean;
  completionPercentage?: number;
  lastActive?: string;
  distance?: number;
  relevanceScore?: number;
  user: {
    _id: string;
    fullName: string;
    avatar?: string;
    gender?: string;
    location?: {
      city?: string;
      state?: string;
      country?: string;
    };
  };
}

export interface SearchFilters {
  // Basic filters
  serviceType?: string;
  serviceTypes?: string[];
  city?: string;
  state?: string;
  country?: string;
  location?: string;
  radius?: number;

  // Price filters
  minPrice?: number;
  maxPrice?: number;
  priceRange?: "BUDGET" | "ECONOMY" | "STANDARD" | "PREMIUM" | "LUXURY";
  rateType?: "hourly" | "daily" | "weekly" | "monthly";

  // Experience filters
  minExperience?: number;
  maxExperience?: number;
  experienceLevel?: "ENTRY" | "JUNIOR" | "MID" | "SENIOR" | "EXPERT";

  // Rating filters
  minRating?: number;
  ratingRange?: "EXCELLENT" | "VERY_GOOD" | "GOOD" | "AVERAGE" | "ANY";

  // Availability filters
  workPreferences?: string[];
  availableDays?: string[];
  immediatelyAvailable?: boolean;
  availability?: string[];

  // Additional filters
  languages?: string[];
  gender?: string;
  verified?: boolean;
  backgroundCheck?: boolean;
  skills?: string[];
  certifications?: string[];
  specializations?: string[];

  // Location-based search
  lat?: number;
  lng?: number;
  maxDistance?: number;

  // Text search
  query?: string;
  
  // Sorting
  sortBy?: string;
}

export interface SearchOptions {
  page?: number;
  limit?: number;
  sortBy?:
    | "relevance"
    | "rating_high"
    | "rating_low"
    | "price_low"
    | "price_high"
    | "experience_high"
    | "experience_low"
    | "newest"
    | "distance"
    | "availability";
}

export interface SearchResponse {
  caregivers: CaregiverPreview[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
    hasMore: boolean;
  };
  filters: {
    applied: number;
    sortBy: string;
  };
}

export interface FilterOptions {
  serviceTypes: string[];
  languages: string[];
  locations: Array<{
    city: string;
    state: string;
    country: string;
    count: number;
  }>;
  priceStats: {
    minPrice: number;
    maxPrice: number;
    avgPrice: number;
  };
  skills: string[];
  experienceLevels: Array<{
    key: string;
    min: number;
    max: number | null;
    label: string;
  }>;
  ratingRanges: Array<{
    key: string;
    min: number;
    max: number;
    label: string;
  }>;
  priceRanges: Array<{
    key: string;
    min: number;
    max: number | null;
    label: string;
  }>;
}

export interface SearchSuggestions {
  caregivers: Array<{
    _id: string;
    userId: string;
    user: { fullName: string; avatar?: string };
    serviceTypes: string[];
    rating: number;
  }>;
  locations: string[];
  skills: string[];
}

// ============================================
// SEARCH ENDPOINTS
// ============================================

/**
 * Search caregivers with filters
 */
export async function searchCaregivers(
  filters: SearchFilters = {},
  options: SearchOptions = {}
) {
  const params = new URLSearchParams();

  // Add filters to params
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      if (Array.isArray(value)) {
        params.set(key, value.join(","));
      } else {
        params.set(key, String(value));
      }
    }
  });

  // Add options to params
  if (options.page) params.set("page", String(options.page));
  if (options.limit) params.set("limit", String(options.limit));
  if (options.sortBy) params.set("sortBy", options.sortBy);

  return apiClient.get<SearchResponse>(
    `/search/caregivers?${params.toString()}`
  );
}

/**
 * Get featured caregivers
 */
export async function getFeaturedCaregivers(limit = 6) {
  return apiClient.get<{ caregivers: CaregiverPreview[] }>(
    `/search/featured?limit=${limit}`
  );
}

/**
 * Get top rated caregivers
 */
export async function getTopRatedCaregivers(limit = 10) {
  return apiClient.get<{ caregivers: CaregiverPreview[] }>(
    `/search/top-rated?limit=${limit}`
  );
}

/**
 * Get recently active caregivers
 */
export async function getRecentlyActiveCaregivers(limit = 10) {
  return apiClient.get<{ caregivers: CaregiverPreview[] }>(
    `/search/recently-active?limit=${limit}`
  );
}

/**
 * Get caregivers by service type
 */
export async function getCaregiversByServiceType(
  serviceType: string,
  limit = 12
) {
  return apiClient.get<{ caregivers: CaregiverPreview[] }>(
    `/search/by-service/${serviceType}?limit=${limit}`
  );
}

/**
 * Get caregiver profile preview
 */
export async function getCaregiverPreview(caregiverId: string) {
  return apiClient.get<{ caregiver: CaregiverPreview }>(
    `/search/caregivers/${caregiverId}/preview`
  );
}

/**
 * Get search suggestions (autocomplete)
 */
export async function getSearchSuggestions(
  query: string,
  type?: "all" | "caregivers" | "locations" | "skills"
) {
  const params = new URLSearchParams({ query });
  if (type) params.set("type", type);

  return apiClient.get<{ suggestions: SearchSuggestions }>(
    `/search/suggestions?${params.toString()}`
  );
}

/**
 * Get filter options
 */
export async function getFilterOptions() {
  return apiClient.get<{ options: FilterOptions }>("/search/filter-options");
}

// ============================================
// SERVICE TYPE LABELS
// ============================================

export const SERVICE_TYPE_LABELS: Record<string, string> = {
  elderly_care: "Elderly Care",
  child_care: "Child Care",
  special_needs: "Special Needs Care",
  disability_care: "Disability Care",
  post_surgery: "Post-Surgery Care",
  companionship: "Companionship",
  respite_care: "Respite Care",
  palliative_care: "Palliative Care",
  dementia_care: "Dementia Care",
  alzheimers_care: "Alzheimer's Care",
  mobility_assistance: "Mobility Assistance",
  medication_management: "Medication Management",
  meal_preparation: "Meal Preparation",
  personal_hygiene: "Personal Hygiene",
  transportation: "Transportation",
};

export const WORK_PREFERENCE_LABELS: Record<string, string> = {
  live_in: "Live-in",
  live_out: "Live-out",
  part_time: "Part-time",
  full_time: "Full-time",
  overnight: "Overnight",
  weekends: "Weekends",
  holidays: "Holidays",
};

export const SORT_OPTIONS = [
  { value: "relevance", label: "Most Relevant" },
  { value: "rating_high", label: "Highest Rated" },
  { value: "rating_low", label: "Lowest Rated" },
  { value: "price_low", label: "Price: Low to High" },
  { value: "price_high", label: "Price: High to Low" },
  { value: "experience_high", label: "Most Experienced" },
  { value: "newest", label: "Newest" },
  { value: "distance", label: "Nearest" },
];

// ============================================
// EXPORT SERVICE OBJECT
// ============================================

export const searchService = {
  searchCaregivers,
  getFeaturedCaregivers,
  getTopRatedCaregivers,
  getRecentlyActiveCaregivers,
  getCaregiversByServiceType,
  getCaregiverPreview,
  getSearchSuggestions,
  getFilterOptions,
};

export default searchService;
