import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ADMIN_PREFIX = "/admin";
const AUTH_ONLY_PATHS = ["/login", "/register"];
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/book",
  "/booking",
  "/profile",
  "/messages",
  "/message",
  "/my-care",
  "/my-timetable",
  "/notices",
  "/caregiver/assignments",
];

interface CookieAuthPayload {
  role?: string;
  status?: string;
  verificationStatus?: string;
  onboardingCompleted?: boolean;
  isBanned?: boolean;
}

function isTokenValid(token: string): boolean {
  try {
    const payload = token.split(".")[1];
    if (!payload) return false;

    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
    const parsed = JSON.parse(atob(padded));

    if (typeof parsed?.exp !== "number") return false;
    return parsed.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

function parseRoleFromToken(token?: string): string | null {
  if (!token) return null;

  try {
    const payload = token.split(".")[1];
    if (!payload) return null;

    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
    const parsed = JSON.parse(atob(padded));

    return typeof parsed?.role === "string" ? parsed.role : null;
  } catch {
    return null;
  }
}

function getCookieAuthPayload(request: NextRequest): CookieAuthPayload | null {
  const userCookie = request.cookies.get("careconnect_user")?.value;
  if (!userCookie) return null;

  try {
    const parsed = JSON.parse(decodeURIComponent(userCookie));
    if (!parsed || typeof parsed !== "object") return null;

    const payload = parsed as CookieAuthPayload;
    const normalized: CookieAuthPayload = {};

    if (typeof payload.role === "string") {
      normalized.role = payload.role;
    }

    if (typeof payload.status === "string") {
      normalized.status = payload.status;
    }

    if (typeof payload.verificationStatus === "string") {
      normalized.verificationStatus = payload.verificationStatus;
    }

    if (typeof payload.onboardingCompleted === "boolean") {
      normalized.onboardingCompleted = payload.onboardingCompleted;
    }

    if (typeof payload.isBanned === "boolean") {
      normalized.isBanned = payload.isBanned;
    }

    return normalized;
  } catch {
    return null;
  }
}

function getDashboardPath(role: string | null): string {
  if (role === "admin") return "/admin/dashboard";
  if (role === "caregiver") return "/dashboard/caregiver";
  if (role === "careseeker") return "/dashboard/careseeker";
  return "/dashboard";
}

function isBlockedStatus(status?: string | null): boolean {
  return status === "suspended" || status === "deleted";
}

function isPendingStatus(status?: string | null): boolean {
  return status === "pending" || status === "pending_approval";
}

function isApprovedStatus(status?: string | null): boolean {
  return status === "active";
}

function isOnboardingStatus(status?: string | null): boolean {
  return status === "onboarding" || status === "pending";
}

function isRejectedStatus(status?: string | null): boolean {
  return status === "rejected";
}

function hasVerificationProgress(verificationStatus?: string | null): boolean {
  return (
    verificationStatus === "UNDER_REVIEW" ||
    verificationStatus === "VERIFIED" ||
    verificationStatus === "REJECTED"
  );
}

function isVerificationPending(
  verificationStatus?: string | null,
  status?: string | null,
): boolean {
  if (isApprovedStatus(status)) {
    return false;
  }

  if (verificationStatus) {
    return verificationStatus.toUpperCase() !== "VERIFIED";
  }

  return isPendingStatus(status);
}

function hasCompletedOnboarding(payload: CookieAuthPayload, role: string | null): boolean {
  if (typeof payload.onboardingCompleted === "boolean") {
    return payload.onboardingCompleted;
  }

  if (role === "admin") return true;

  if (hasVerificationProgress(payload.verificationStatus)) return true;

  // active/pending_approval/rejected all imply onboarding was completed
  if (
    isApprovedStatus(payload.status) ||
    payload.status === "pending_approval" ||
    isRejectedStatus(payload.status)
  ) {
    return true;
  }

  return false;
}

function hasLifecycleSignals(payload: CookieAuthPayload): boolean {
  return (
    typeof payload.status === "string" ||
    typeof payload.verificationStatus === "string" ||
    typeof payload.onboardingCompleted === "boolean"
  );
}

function shouldForceOnboarding(
  payload: CookieAuthPayload,
  role: string | null,
): boolean {
  if (isOnboardingStatus(payload.status)) {
    return true;
  }

  if (hasCompletedOnboarding(payload, role)) {
    return false;
  }

  // If the lifecycle payload is unavailable but role is known from token,
  // let the client resolve authoritative state through /auth/me.
  if (role && !hasLifecycleSignals(payload)) {
    return false;
  }

  return true;
}

function getUserRoute(payload: CookieAuthPayload, role: string | null, isAuthenticated: boolean): string {
  const status = payload.status;

  if (!isAuthenticated) return "/login";

  if (payload.isBanned || isBlockedStatus(status)) {
    return "/login?reason=inactive";
  }

  if (role === "admin") return "/admin/dashboard";

  // Rejected users: show rejection notice (stays on /dashboard/pending)
  if (isRejectedStatus(status)) return "/dashboard/pending";

  // Still in onboarding wizard
  if (shouldForceOnboarding(payload, role)) {
    return "/onboarding";
  }

  // Completed onboarding but awaiting admin approval
  if (isVerificationPending(payload.verificationStatus, status)) {
    return "/dashboard/pending";
  }

  if (isApprovedStatus(status)) return getDashboardPath(role);

  return "/login";
}

function redirectWithReturnPath(request: NextRequest, pathname: string): NextResponse {
  const url = new URL("/login", request.url);
  url.searchParams.set("redirect", pathname);
  return NextResponse.redirect(url);
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/favicon") ||
    pathname.match(/\.(png|jpg|jpeg|svg|ico|webp|gif|css|js|woff|woff2)$/)
  ) {
    return NextResponse.next();
  }

  // /waiting is no longer used — redirect to /dashboard/pending
  if (pathname === "/waiting" || pathname.startsWith("/waiting/")) {
    return NextResponse.redirect(new URL("/dashboard/pending", request.url));
  }

  // Stale redirect params on destination pages can cause confusing self-redirect
  // loops such as /dashboard/caregiver?redirect=/dashboard/caregiver.
  if (
    request.nextUrl.searchParams.has("redirect") &&
    (
      pathname.startsWith("/dashboard") ||
      (pathname.startsWith("/admin") && pathname !== "/admin/login")
    )
  ) {
    const cleanUrl = request.nextUrl.clone();
    cleanUrl.searchParams.delete("redirect");
    return NextResponse.redirect(cleanUrl);
  }

  const accessToken =
    request.cookies.get("accessToken")?.value ||
    request.cookies.get("careconnect_token")?.value;

  const isAuthenticated = !!accessToken && isTokenValid(accessToken);

  const cookiePayload = getCookieAuthPayload(request);
  const payload: CookieAuthPayload = cookiePayload || {};
  const status = payload.status;
  const tokenRole = parseRoleFromToken(accessToken);
  const role = tokenRole || cookiePayload?.role || null;

  if (pathname.startsWith(ADMIN_PREFIX)) {
    if (pathname === "/admin/login") {
      if (isAuthenticated && role === "admin" && isApprovedStatus(status)) {
        return NextResponse.redirect(new URL("/admin/dashboard", request.url));
      }
      return NextResponse.next();
    }

    if (!isAuthenticated || role !== "admin" || !isApprovedStatus(status)) {
      const url = new URL("/admin/login", request.url);
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }

    return NextResponse.next();
  }

  if (pathname === "/onboarding" || pathname.startsWith("/onboarding/")) {
    // Must be authenticated to access onboarding
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL("/login?reason=session_required", request.url));
    }

    if (role && !hasLifecycleSignals(payload)) {
      return NextResponse.next();
    }

    // Block suspended/deleted users
    if (payload.isBanned || isBlockedStatus(status)) {
      return NextResponse.redirect(new URL("/login?reason=inactive", request.url));
    }

    // Allow if still in onboarding flow
    if (shouldForceOnboarding(payload, role)) {
      return NextResponse.next();
    }

    // Completed — redirect to their appropriate destination
    return NextResponse.redirect(new URL(getUserRoute(payload, role, isAuthenticated), request.url));
  }

  if (AUTH_ONLY_PATHS.some((path) => pathname === path)) {
    if (isAuthenticated) {
      const targetPath = getUserRoute(payload, role, isAuthenticated);

      // Avoid self-redirect loops when lifecycle status is unknown.
      if (targetPath === pathname || targetPath === "/login") {
        return NextResponse.next();
      }

      return NextResponse.redirect(new URL(targetPath, request.url));
    }

    return NextResponse.next();
  }

  if (PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    if (!isAuthenticated) {
      return redirectWithReturnPath(request, pathname);
    }

    if (payload.isBanned || status === "suspended" || status === "deleted") {
      return NextResponse.redirect(new URL("/login?reason=inactive", request.url));
    }

    if (role === "admin") {
      return NextResponse.redirect(new URL("/admin/dashboard", request.url));
    }

    if (shouldForceOnboarding(payload, role)) {
      return NextResponse.redirect(new URL("/onboarding", request.url));
    }

    if (isVerificationPending(payload.verificationStatus, status)) {
      // Keep pending users restricted, but allow profile access so they can
      // complete/update details from caregiver dashboard actions.
      if (
        pathname === "/dashboard/pending" ||
        pathname.startsWith("/profile")
      ) {
        return NextResponse.next();
      }
      return NextResponse.redirect(new URL("/dashboard/pending", request.url));
    }


    if ((pathname === "/caregiver" || pathname.startsWith("/caregiver/")) && role !== "caregiver") {
      return NextResponse.redirect(new URL(getDashboardPath(role), request.url));
    }

    if (pathname === "/dashboard/earnings" && role !== "caregiver") {
      return NextResponse.redirect(new URL(getDashboardPath(role), request.url));
    }

    if (pathname.startsWith("/dashboard/caregiver") && role === "careseeker") {
      return NextResponse.redirect(new URL("/dashboard/careseeker", request.url));
    }

    if (pathname.startsWith("/dashboard/careseeker") && role === "caregiver") {
      return NextResponse.redirect(new URL("/dashboard/caregiver", request.url));
    }

    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
