// ============================================
// CONSTANTS - Application Wide Constants
// ============================================

import { env } from "@/config";
import i18nConfig from "@/locales/config.json";

type AppLanguageCode = "en" | "ne" | "hi" | "es" | "ar" | "fr";

interface AppLanguage {
  code: AppLanguageCode;
  name: string;
  nativeName: string;
  flag: string;
  dir: "ltr" | "rtl";
}

const APP_LANGUAGES = i18nConfig.supportedLanguages as AppLanguage[];

/**
 * API Configuration
 */
export const API_CONFIG = {
  BASE_URL: env.API_URL,
  TIMEOUT: 30000, // 30 seconds
  RETRY_ATTEMPTS: 3,
} as const;

/**
 * Authentication Configuration
 */
export const AUTH_CONFIG = {
  TOKEN_KEY: "careconnect_token",
  REFRESH_TOKEN_KEY: "careconnect_refresh_token",
  USER_KEY: "careconnect_user",
  TOKEN_EXPIRY_BUFFER: 60, // seconds before expiry to refresh
} as const;

/**
 * Application Routes
 */
export const ROUTES = {
  // Public routes
  HOME: "/home",
  ABOUT: "/about",
  HOW_IT_WORKS: "/how-it-works",
  CAREGIVERS: "/caregivers",
  SEARCH: "/search",
  
  // Auth routes
  LOGIN: "/login",
  REGISTER: "/register",
  FORGOT_PASSWORD: "/forgot-password",
  RESET_PASSWORD: "/reset-password",
  VERIFY_EMAIL: "/verify-email",
  
  // Protected routes
  DASHBOARD: "/dashboard",
  PROFILE: "/profile",
  
  // Dashboard sub-routes
  DASHBOARD_OVERVIEW: "/dashboard",
  DASHBOARD_BOOKINGS: "/dashboard/bookings",
  DASHBOARD_MESSAGES: "/messages",
  DASHBOARD_REVIEWS: "/dashboard/reviews",
  DASHBOARD_PAYMENTS: "/dashboard/payments",
  DASHBOARD_EARNINGS: "/dashboard/earnings",
  DASHBOARD_SETTINGS: "/dashboard/settings",
  
  // Admin routes
  ADMIN_LOGIN: "/admin/login",
  ADMIN_DASHBOARD: "/admin/dashboard",
  ADMIN_USERS: "/admin/users",
  ADMIN_CAREGIVERS: "/admin/caregivers",
  ADMIN_CARE_SEEKERS: "/admin/care-seekers",
  ADMIN_DOCUMENTS: "/admin/documents",
  ADMIN_BOOKINGS: "/admin/bookings",
  ADMIN_PAYMENTS: "/admin/payments",
  ADMIN_REVIEWS: "/admin/reviews",
  ADMIN_ANALYTICS: "/admin/analytics",
  ADMIN_SETTINGS: "/admin/settings",
} as const;

/**
 * User Roles
 */
export const USER_ROLES = {
  CAREGIVER: "caregiver",
  CARESEEKER: "careseeker",
  ADMIN: "admin",
} as const;

/**
 * User Status
 */
export const USER_STATUS = {
  PENDING: "pending",
  PENDING_APPROVAL: "pending_approval",
  ACTIVE: "active",
  SUSPENDED: "suspended",
  DELETED: "deleted",
} as const;

/**
 * Document Types
 */
export const DOCUMENT_TYPES = {
  ID_PROOF: "id_proof",
  ADDRESS_PROOF: "address_proof",
  CERTIFICATION: "certification",
  BACKGROUND_CHECK: "background_check",
} as const;

/**
 * Document Status
 */
export const DOCUMENT_STATUS = {
  PENDING: "pending",
  VERIFIED: "verified",
  REJECTED: "rejected",
} as const;

/**
 * Service Types for Caregivers — Single source of truth.
 * Matches backend enum in Backend/src/models/caregiver.model.js
 */
export const SERVICE_TYPES = {
  ELDERLY_CARE: "elderly_care",
  CHILD_CARE: "child_care",
  SPECIAL_NEEDS: "special_needs",
  DISABILITY_CARE: "disability_care",
  POST_SURGERY: "post_surgery",
  COMPANIONSHIP: "companionship",
  RESPITE_CARE: "respite_care",
  PALLIATIVE_CARE: "palliative_care",
  DEMENTIA_CARE: "dementia_care",
  ALZHEIMERS_CARE: "alzheimers_care",
  OVERNIGHT_CARE: "overnight_care",
  MEDICATION_MANAGEMENT: "medication_management",
  MOBILITY_ASSISTANCE: "mobility_assistance",
  PERSONAL_CARE: "personal_care",
  MEAL_PREPARATION: "meal_preparation",
} as const;

/**
 * Service Type Labels — human-friendly display names for all service types.
 */
export const SERVICE_TYPE_LABELS: Record<string, string> = {
  elderly_care: "Elderly Care",
  child_care: "Child Care",
  special_needs: "Special Needs",
  disability_care: "Disability Care",
  post_surgery: "Post-Surgery",
  companionship: "Companionship",
  respite_care: "Respite Care",
  palliative_care: "Palliative Care",
  dementia_care: "Dementia Care",
  alzheimers_care: "Alzheimer's Care",
  overnight_care: "Overnight Care",
  medication_management: "Medication Mgmt",
  mobility_assistance: "Mobility Assist",
  personal_care: "Personal Care",
  meal_preparation: "Meal Prep",
};

/**
 * Service Type Options — for use in dropdowns and filters.
 */
export const SERVICE_TYPE_OPTIONS = Object.entries(SERVICE_TYPE_LABELS).map(
  ([value, label]) => ({ value, label })
);

/**
 * Skill Options — common caregiver skills.
 * Matches backend model's skills array.
 */
export const SKILL_OPTIONS = [
  "Child Care", "Senior Care", "Special Needs", "First Aid", "CPR",
  "Meal Preparation", "Light Housekeeping", "Medication Management",
  "Physical Therapy", "Alzheimer's Care", "Dementia Care", "Hospice Care",
  "Newborn Care", "Overnight Care", "Transportation", "Pet Care",
  "Companionship", "Personal Hygiene", "Wound Care", "Vital Signs Monitoring",
] as const;

/**
 * Care Need Options — for care seekers. Maps to backend careNeeds enum.
 */
export const CARE_NEED_OPTIONS = [
  { value: "elderly_care", label: "Elderly Care" },
  { value: "child_care", label: "Child Care" },
  { value: "special_needs", label: "Special Needs Care" },
  { value: "disability_care", label: "Disability Care" },
  { value: "post_surgery", label: "Post-Surgery Care" },
  { value: "companionship", label: "Companionship" },
  { value: "respite_care", label: "Respite Care" },
  { value: "palliative_care", label: "Palliative Care" },
  { value: "dementia_care", label: "Dementia Care" },
  { value: "alzheimers_care", label: "Alzheimer's Care" },
  { value: "overnight_care", label: "Overnight Care" },
  { value: "medication_management", label: "Medication Management" },
  { value: "mobility_assistance", label: "Mobility Assistance" },
  { value: "personal_care", label: "Personal Care" },
  { value: "meal_preparation", label: "Meal Preparation" },
] as const;

/**
 * Language Options — supported caregiver/care seeker languages.
 */
export const LANGUAGE_OPTIONS = [
  ...APP_LANGUAGES.map((language) => language.name),
] as const;

/**
 * Specialization Options — for advanced filtering.
 */
export const SPECIALIZATION_OPTIONS = [
  "Alzheimer's/Dementia", "Parkinson's Disease", "Stroke Recovery",
  "Post-Surgery Care", "Diabetes Management", "Physical Therapy",
  "Mental Health", "Autism Spectrum", "Special Needs Children",
  "Newborn Care", "Hospice Care", "Wound Care",
] as const;

/**
 * Work Preferences
 */
export const WORK_PREFERENCES = {
  LIVE_IN: "live_in",
  LIVE_OUT: "live_out",
  PART_TIME: "part_time",
  FULL_TIME: "full_time",
  OVERNIGHT: "overnight",
  WEEKENDS: "weekends",
  HOLIDAYS: "holidays",
} as const;

/**
 * Booking Status
 */
export const BOOKING_STATUS = {
  PENDING: "pending",
  CONFIRMED: "confirmed",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
  DISPUTED: "disputed",
} as const;

/**
 * Languages - Supported i18n languages from src/locales/config.json
 * en = English (default)
 * ne = Nepali
 * hi = Hindi
 * es = Spanish
 * ar = Arabic (RTL)
 * fr = French
 */
export const SUPPORTED_LANGUAGES = APP_LANGUAGES.map((language) => ({
  code: language.code,
  name: language.nativeName,
  flag: language.flag,
  rtl: language.dir === "rtl",
})) as readonly {
  code: AppLanguageCode;
  name: string;
  flag: string;
  rtl: boolean;
}[];

export const RTL_LANGUAGES = i18nConfig.rtlLanguages as readonly AppLanguageCode[];

/**
 * Pagination Defaults
 */
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100,
} as const;

/**
 * Form Validation
 */
export const VALIDATION = {
  MIN_PASSWORD_LENGTH: 8,
  MAX_NAME_LENGTH: 100,
  MAX_BIO_LENGTH: 1000,
  MIN_AGE: 18,
  MAX_AGE: 120,
} as const;

/**
 * Sort Options — for search result ordering.
 */
export const SORT_OPTIONS = [
  { value: "relevance", label: "Best Match" },
  { value: "rating", label: "Highest Rated" },
  { value: "price_low", label: "Price: Low to High" },
  { value: "price_high", label: "Price: High to Low" },
  { value: "experience", label: "Most Experienced" },
  { value: "reviews", label: "Most Reviews" },
  { value: "distance", label: "Nearest" },
] as const;

/**
 * Duration Type Options — for booking duration selection.
 */
export const DURATION_TYPE_OPTIONS = [
  { value: "hourly", label: "Hourly", description: "Pay by the hour" },
  { value: "daily", label: "Daily", description: "Full day care" },
  { value: "weekly", label: "Weekly", description: "Week-long service" },
  { value: "monthly", label: "Monthly", description: "Long-term care" },
] as const;

/**
 * Service Type Icons — emoji icons for each service type.
 */
export const SERVICE_TYPE_ICONS: Record<string, string> = {
  elderly_care: "👴",
  child_care: "👶",
  special_needs: "💙",
  disability_care: "♿",
  post_surgery: "🏥",
  companionship: "🤝",
  respite_care: "😌",
  palliative_care: "❤️",
  dementia_care: "🧠",
  alzheimers_care: "🧠",
  overnight_care: "🌙",
  medication_management: "💊",
  mobility_assistance: "🦽",
  personal_care: "🛁",
  meal_preparation: "🍳",
};

/**
 * Activity Content Options — for dashboard activity filtering.
 */
export const ACTIVITY_CONTENT_OPTIONS = [
  { value: "all", label: "All Content" },
  { value: "booking", label: "Bookings" },
  { value: "session", label: "Sessions" },
  { value: "payment", label: "Payments" },
  { value: "review", label: "Reviews" },
  { value: "document", label: "Documents" },
] as const;

/**
 * Care Categories — for home page display.
 */
export const CARE_CATEGORIES = [
  { icon: "👶", titleKey: "childCare", description: "Experienced babysitters and nannies" },
  { icon: "👴", titleKey: "seniorCare", description: "Compassionate elderly caregivers" },
  { icon: "🏥", titleKey: "medicalCare", description: "Certified nursing assistants" },
  { icon: "🧠", titleKey: "specialNeeds", description: "Trained special needs caregivers" },
  { icon: "🏠", titleKey: "homeCare", description: "Daily living assistance" },
  { icon: "🌙", titleKey: "overnightCare", description: "24/7 care providers" },
] as const;
