"use client";

import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { authService } from "../services";
import type { User } from "@/types";
import { extractStatusCode } from "@/types/errors.types";

type GuardState = "loading" | "allowed" | "blocked";
type BlockReason = "unverified" | "pending_approval" | "rejected" | "inactive";

const PENDING_DASHBOARD_PATH = "/dashboard/pending";

interface DashboardRouteGuardProps {
  children: ReactNode;
}

// ── Session validation cache ──────────────────────────────────────────────────
// Persists across component re-mounts (client-side navigation). Prevents
// calling /auth/me on every dashboard sub-route transition.
interface ValidationCache {
  user: User;
  validatedAt: number; // timestamp
}

let sessionValidationCache: ValidationCache | null = null;
const SESSION_CACHE_TTL_MS = 60_000; // 60 seconds

function getCachedValidation(): User | null {
  if (!sessionValidationCache) return null;
  if (Date.now() - sessionValidationCache.validatedAt > SESSION_CACHE_TTL_MS) {
    sessionValidationCache = null;
    return null;
  }
  return sessionValidationCache.user;
}

function setCachedValidation(user: User): void {
  sessionValidationCache = { user, validatedAt: Date.now() };
}

function invalidateSessionCache(): void {
  sessionValidationCache = null;
}

// ── Pure helpers ──────────────────────────────────────────────────────────────

function logDashboardGuard(
  message: string,
  details?: Record<string, unknown>,
): void {
  if (process.env.NODE_ENV !== "production") {
    console.info("[DashboardRouteGuard]", message, details ?? {});
  }
}

function getRequiredRole(pathname: string): "caregiver" | "careseeker" | null {
  if (pathname.startsWith("/dashboard/caregiver")) return "caregiver";
  if (pathname.startsWith("/dashboard/careseeker")) return "careseeker";
  return null;
}

function getAccountBlockReason(user: User): BlockReason | null {
  if (!user.isEmailVerified) return "unverified";
  if (user.status === "rejected") return "rejected";
  if (user.status === "pending" || user.status === "pending_approval")
    return "pending_approval";
  if (user.status !== "active") return "inactive";
  return null;
}

function getReasonBanner(reason: string | null): string | null {
  if (reason === "inactive")
    return "Account notice: your account status is currently inactive.";
  if (reason === "session_expired")
    return "Session notice: your previous session expired. Please continue securely.";
  if (reason === "unauthorized")
    return "Authorization notice: you do not have access to the previous route.";
  return null;
}

function buildUnauthorizedUrl(pathname: string): string {
  const params = new URLSearchParams({ from: pathname });
  return `/unauthorized?${params.toString()}`;
}

function isPendingDashboardPath(pathname: string): boolean {
  return (
    pathname === PENDING_DASHBOARD_PATH ||
    pathname.startsWith(`${PENDING_DASHBOARD_PATH}/`)
  );
}

function buildPendingUrl(reason: BlockReason | null): string {
  if (reason === "rejected") {
    return "/dashboard/pending?reason=rejected";
  }
  if (reason === "unverified") {
    return "/dashboard/pending?reason=unverified";
  }
  return "/dashboard/pending";
}

function shouldRenderPendingPage(
  reason: BlockReason,
  pathname: string,
): boolean {
  if (!isPendingDashboardPath(pathname)) return false;
  return (
    reason === "pending_approval" ||
    reason === "rejected" ||
    reason === "unverified"
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export function DashboardRouteGuard({ children }: DashboardRouteGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [guardState, setGuardState] = useState<GuardState>("loading");
  const [blockReason, setBlockReason] = useState<BlockReason | null>(null);

  const handleSwitchAccount = useCallback(async () => {
    invalidateSessionCache();
    try {
      await authService.logout();
    } finally {
      router.replace("/login");
    }
  }, [router]);

  const reasonBanner = useMemo(
    () => getReasonBanner(searchParams.get("reason")),
    [searchParams],
  );

  const validateDashboardAccess = useCallback(
    async (forceRefresh = false) => {
      setGuardState("loading");
      setBlockReason(null);

      const requiredRole = getRequiredRole(pathname);

      // ── Fast path: use cached validation result ─────────────────────────
      if (!forceRefresh) {
        const cachedUser = getCachedValidation();
        if (cachedUser) {
          // Re-check role against current pathname (path may have changed)
          if (requiredRole && cachedUser.role !== requiredRole) {
            logDashboardGuard(
              "Role mismatch in cache; forcing fresh validation",
              {
                pathname,
                requiredRole,
                actualRole: cachedUser.role,
              },
            );
            invalidateSessionCache();
          } else {
            const deniedReason = getAccountBlockReason(cachedUser);
            if (deniedReason) {
              if (shouldRenderPendingPage(deniedReason, pathname)) {
                setGuardState("allowed");
                return;
              }

              if (
                deniedReason === "pending_approval" ||
                deniedReason === "rejected" ||
                deniedReason === "unverified"
              ) {
                router.replace(buildPendingUrl(deniedReason));
                return;
              }

              setBlockReason(deniedReason);
              setGuardState("blocked");
              return;
            }

            logDashboardGuard("Dashboard access granted (cache hit)", {
              pathname,
            });
            setGuardState("allowed");
            return;
          }
        }
      }

      // ── Slow path: validate against the server ──────────────────────────
      try {
        const response = await authService.getMe();
        const fetchedUser = response.data?.user;

        if (!fetchedUser) {
          throw new Error("Authenticated session did not return user payload");
        }

        authService.updateStoredUser(fetchedUser);
        setCachedValidation(fetchedUser); // ← populate cache for subsequent navigations

        if (requiredRole && fetchedUser.role !== requiredRole) {
          logDashboardGuard("Role mismatch; redirecting to unauthorized", {
            pathname,
            requiredRole,
            actualRole: fetchedUser.role,
          });
          router.replace(buildUnauthorizedUrl(pathname));
          return;
        }

        const deniedReason = getAccountBlockReason(fetchedUser);
        if (deniedReason) {
          if (shouldRenderPendingPage(deniedReason, pathname)) {
            setGuardState("allowed");
            return;
          }

          if (
            deniedReason === "pending_approval" ||
            deniedReason === "rejected" ||
            deniedReason === "unverified"
          ) {
            router.replace(buildPendingUrl(deniedReason));
            return;
          }

          logDashboardGuard("Blocking dashboard render due to account state", {
            pathname,
            deniedReason,
          });
          setBlockReason(deniedReason);
          setGuardState("blocked");
          return;
        }

        logDashboardGuard("Dashboard access granted (API validated)", {
          pathname,
        });
        setGuardState("allowed");
      } catch (error: unknown) {
        const statusCode = extractStatusCode(error);

        if (statusCode === 401 || statusCode === 403) {
          invalidateSessionCache();
          await authService.logout();
          logDashboardGuard("Session invalid; redirecting to login", {
            pathname,
            statusCode,
          });
          router.replace("/login?reason=session_expired");
          return;
        }

        // Network / transient error — fall back to locally stored user
        const cachedUser = authService.getCurrentUser();
        if (!cachedUser) {
          authService.clearAuthData();
          router.replace("/login?reason=session_expired");
          return;
        }

        if (requiredRole && cachedUser.role !== requiredRole) {
          router.replace(buildUnauthorizedUrl(pathname));
          return;
        }

        const deniedReason = getAccountBlockReason(cachedUser);
        if (deniedReason) {
          if (shouldRenderPendingPage(deniedReason, pathname)) {
            setGuardState("allowed");
            return;
          }

          if (
            deniedReason === "pending_approval" ||
            deniedReason === "rejected" ||
            deniedReason === "unverified"
          ) {
            router.replace(buildPendingUrl(deniedReason));
            return;
          }

          setBlockReason(deniedReason);
          setGuardState("blocked");
          return;
        }

        setGuardState("allowed");
      }
    },
    [pathname, router],
  );

  useEffect(() => {
    void validateDashboardAccess();
  }, [validateDashboardAccess]);

  // ── Loading state ──────────────────────────────────────────────────────────
  if (guardState === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F7FA]">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full border-4 border-gray-200" />
            <div className="absolute inset-0 rounded-full border-4 border-[#39B54A] border-t-transparent animate-spin" />
          </div>
          <p className="text-gray-600 font-medium">
            Validating account access...
          </p>
        </div>
      </div>
    );
  }

  // ── Blocked state ──────────────────────────────────────────────────────────
  if (guardState === "blocked") {
    const content =
      blockReason === "unverified"
        ? {
            title: "Access denied. Check your email.",
            description:
              "Your email is not verified yet. Please verify your email before accessing dashboard routes.",
          }
        : blockReason === "pending_approval"
          ? {
              title: "Account review in progress.",
              description:
                "Your account is currently being reviewed by an administrator. If you have already received an approval email, use Refresh Access Status to sync your latest account state.",
            }
          : blockReason === "rejected"
            ? {
                title: "Registration requires an update.",
                description:
                  "Your previous registration was rejected. Please sign out and submit a new registration with updated details.",
              }
          : {
              title: "Dashboard access is currently unavailable.",
              description:
                "Your account is currently under review and is not yet in an active state. Please contact support if you believe this status is incorrect.",
            };

    return (
      <div className="min-h-screen bg-[#F5F7FA] flex items-center justify-center p-4">
        <div className="w-full max-w-xl bg-white border border-gray-200 rounded-2xl shadow-sm p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-3">
            {content.title}
          </h1>
          <p className="text-gray-600 mb-6">{content.description}</p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                void handleSwitchAccount();
              }}
              className="px-4 py-2.5 bg-[#39B54A] hover:bg-primary-600 text-white font-semibold rounded-xl transition"
            >
              Sign Out and Switch Account
            </button>
            <button
              type="button"
              onClick={() => {
                void validateDashboardAccess(true);
              }}
              className="px-4 py-2.5 border border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold rounded-xl transition"
            >
              Refresh Access Status
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Allowed state ──────────────────────────────────────────────────────────
  return (
    <>
      {reasonBanner && (
        <div className="mx-4 mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {reasonBanner}
        </div>
      )}
      {children}
    </>
  );
}
