import type { User } from "@/types";

type AuthRole = User["role"] | null | undefined;
type AuthStatus = User["status"] | null | undefined;
type AuthVerificationStatus = User["verificationStatus"] | null | undefined;

const BLOCKED_LIFECYCLE_STATUSES = new Set(["suspended", "blocked", "deleted"]);
const INCOMPLETE_STATUSES = new Set(["onboarding", "pending", "incomplete"]);
const IN_REVIEW_STATUSES = new Set(["pending_approval", "in_review"]);
const VERIFIED_STATUSES = new Set(["active", "verified"]);

type AuthRoutingUser = Partial<
  Pick<
    User,
    | "role"
    | "status"
    | "verificationStatus"
    | "onboardingCompleted"
    | "isBanned"
    | "isEmailVerified"
    | "isProfileComplete"
    | "phone"
    | "gender"
    | "age"
  >
>;

// ── Status predicates (maps both old DB strings and new semantic names) ────────

export function getDashboardPathForRole(role: AuthRole): string {
  if (role === "admin") return "/admin/dashboard";
  if (role === "caregiver") return "/dashboard/caregiver";
  if (role === "careseeker") return "/dashboard/careseeker";
  return "/dashboard";
}

function isStatusOneOf(status: AuthStatus, statuses: Set<string>): boolean {
  return typeof status === "string" && statuses.has(status);
}

export function isBlockedLifecycleStatus(status: AuthStatus): boolean {
  return isStatusOneOf(status, BLOCKED_LIFECYCLE_STATUSES);
}

export function isIncompleteStatus(status: AuthStatus): boolean {
  // DB: "onboarding" | "pending"  →  semantic: INCOMPLETE
  return isStatusOneOf(status, INCOMPLETE_STATUSES);
}

export function isInReviewStatus(status: AuthStatus): boolean {
  // DB: "pending_approval"  →  semantic: IN_REVIEW
  return isStatusOneOf(status, IN_REVIEW_STATUSES);
}

export function isVerifiedStatus(status: AuthStatus): boolean {
  // DB: "active"  →  semantic: VERIFIED
  return isStatusOneOf(status, VERIFIED_STATUSES);
}

export function isRejectedStatus(status: AuthStatus): boolean {
  return status === "rejected";
}

/** @deprecated Use isIncompleteStatus / isInReviewStatus */
export function isOnboardingStatus(status: AuthStatus): boolean {
  return isIncompleteStatus(status);
}

/** @deprecated Use isInReviewStatus */
export function isPendingLifecycleStatus(status: AuthStatus): boolean {
  return isIncompleteStatus(status) || isInReviewStatus(status);
}

/** @deprecated Use isVerifiedStatus */
export function isApprovedLifecycleStatus(status: AuthStatus): boolean {
  return isVerifiedStatus(status);
}

// ── Onboarding completion check ───────────────────────────────────────────────

function hasVerificationProgress(vStatus: AuthVerificationStatus): boolean {
  return (
    vStatus === "UNDER_REVIEW" ||
    vStatus === "VERIFIED" ||
    vStatus === "REJECTED"
  );
}

function isVerificationPending(
  verificationStatus: AuthVerificationStatus,
  status: AuthStatus,
): boolean {
  if (isVerifiedStatus(status)) return false;
  if (verificationStatus) {
    return String(verificationStatus).toUpperCase() !== "VERIFIED";
  }
  return isInReviewStatus(status);
}

export function hasCompletedOnboarding(user: AuthRoutingUser): boolean {
  if (typeof user.onboardingCompleted === "boolean") {
    return user.onboardingCompleted;
  }
  if (user.role === "admin") return true;
  if (hasVerificationProgress(user.verificationStatus)) return true;

  // pending_approval / active / rejected all imply onboarding was done
  if (
    isInReviewStatus(user.status) ||
    isVerifiedStatus(user.status) ||
    isRejectedStatus(user.status)
  ) {
    return true;
  }

  return Boolean(user.isProfileComplete && user.role);
}

// ── Central routing function ──────────────────────────────────────────────────

/**
 * getPostAuthRoute — single source of truth for post-login redirects.
 *
 * Status → Route:
 *   INCOMPLETE (onboarding/pending)  → /onboarding   (= /complete-profile)
 *   IN_REVIEW  (pending_approval)    → /dashboard/pending
 *   VERIFIED   (active)              → /dashboard/{role}
 *   REJECTED                         → /dashboard/pending
 *   BLOCKED/SUSPENDED/DELETED        → /login?reason=inactive
 */
export function getUserRoute(user: AuthRoutingUser | null | undefined): string {
  if (!user) return "/login";

  if (user.isBanned || isBlockedLifecycleStatus(user.status)) {
    return "/login?reason=inactive";
  }

  if (user.role === "admin") return "/admin/dashboard";

  // Rejected — show pending/rejected notice
  if (isRejectedStatus(user.status)) return "/dashboard/pending";

  // Not yet completed onboarding wizard
  if (!hasCompletedOnboarding(user) || isIncompleteStatus(user.status)) {
    return "/onboarding";
  }

  // Pending admin approval
  if (isVerificationPending(user.verificationStatus, user.status)) {
    return "/dashboard/pending";
  }

  return getDashboardPathForRole(user.role);
}

export function getPostAuthRoute(user: AuthRoutingUser): string {
  return getUserRoute(user);
}
