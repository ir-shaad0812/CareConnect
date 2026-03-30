// ============================================
// ROUTES CONFIGURATION
// Single source of truth for all application routes
// ============================================

export const ROUTES = {
  // Public
  HOME: "/home",
  ABOUT: "/about",
  HOW_IT_WORKS: "/how-it-works",
  CAREGIVERS: "/caregivers",
  SEARCH: "/search",
  HELP: "/help",
  SAFETY: "/safety",
  ARTICLES: "/articles",
  JOBS: "/jobs",
  PRIVACY_POLICY: "/privacy-policy",
  TERMS_OF_SERVICE: "/terms-of-service",

  // Auth
  LOGIN: "/login",
  REGISTER: "/register",
  FORGOT_PASSWORD: "/forgot-password",
  RESET_PASSWORD: "/reset-password",
  VERIFY_EMAIL: "/verify-email",
  ONBOARDING: "/onboarding",
  WAITING: "/waiting",

  // Protected - User
  DASHBOARD: "/dashboard",
  PROFILE: "/profile",
  MESSAGES: "/messages",
  BOOKINGS: "/dashboard/bookings",
  PAYMENTS: "/dashboard/payments",
  SETTINGS: "/dashboard/settings",

  // Protected - Caregiver
  CAREGIVER_DASHBOARD: "/dashboard/caregiver",
  CAREGIVER_PROFILE: "/profile/caregiver",
  CAREGIVER_EARNINGS: "/dashboard/earnings",
  CAREGIVER_SERVICE_AREA: "/caregiver/service-area",

  // Protected - Careseeker
  CARESEEKER_DASHBOARD: "/dashboard/careseeker",
  CARESEEKER_PROFILE: "/profile/careseeker",

  // Admin
  ADMIN_LOGIN: "/admin/login",
  ADMIN_DASHBOARD: "/admin/dashboard",
  ADMIN_USERS: "/admin/users",
  ADMIN_CAREGIVERS: "/admin/caregivers",
  ADMIN_DOCUMENTS: "/admin/documents",
  ADMIN_BOOKINGS: "/admin/bookings",
  ADMIN_PAYMENTS: "/admin/payments",
  ADMIN_ANALYTICS: "/admin/analytics",
  ADMIN_CHAT_MONITORING: "/admin/chat-monitoring",
  ADMIN_JOBS: "/admin/jobs",
} as const;

// Routes that require authentication
export const PROTECTED_ROUTES = [
  "/dashboard",
  "/profile",
  "/messages",
  "/book",
  "/booking",
  "/my-care",
  "/caregiver/assignments",
  "/caregiver/service-area",
] as const;

// Routes that require admin role
export const ADMIN_ROUTES = ["/admin"] as const;

// Auth routes - redirect away if logged in
export const AUTH_ROUTES = ["/login", "/register", "/forgot-password"] as const;

// Fully public routes
export const PUBLIC_ROUTES = [
  "/",
  "/home",
  "/about",
  "/how-it-works",
  "/caregivers",
  "/caregiver",
  "/search",
  "/help",
  "/safety",
  "/articles",
  "/jobs",
  "/privacy-policy",
  "/terms-of-service",
  "/verify-email",
] as const;

export type RouteKey = keyof typeof ROUTES;
export type RoutePath = (typeof ROUTES)[RouteKey];
