"use client";

import { useEffect, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { authService } from "@/modules/auth/services";
import { AUTH_CONFIG } from "@/lib/constants";
import { getPostAuthRoute, hasCompletedOnboarding } from "@/lib/auth-routing";
import { extractStatusCode } from "@/types/errors.types";

function setAuthCookie(name: string, value: string, days = 7): void {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)};expires=${expires};path=/;SameSite=Lax`;
}

function clearAuthStorage() {
  localStorage.removeItem(AUTH_CONFIG.TOKEN_KEY);
  localStorage.removeItem(AUTH_CONFIG.REFRESH_TOKEN_KEY);
  localStorage.removeItem(AUTH_CONFIG.USER_KEY);
  document.cookie = `${AUTH_CONFIG.TOKEN_KEY}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;SameSite=Lax`;
  document.cookie = `${AUTH_CONFIG.USER_KEY}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;SameSite=Lax`;
}

function logDashboardEntry(message: string, details?: Record<string, unknown>): void {
  if (process.env.NODE_ENV !== "production") {
    console.info("[DashboardEntry]", message, details ?? {});
  }
}

function redirectByRole(role: string | null | undefined, router: ReturnType<typeof useRouter>) {
  const target = authService.getDashboardPathForRole(role);

  if (!target) {
    router.replace("/login?reason=unauthorized");
    return;
  }

  router.replace(target);
}

function DashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const hasFired = useRef(false);

  useEffect(() => {
    // Strict-mode / HMR guard — only run once
    if (hasFired.current) return;
    hasFired.current = true;

    const token = searchParams.get("token");
    const refreshToken = searchParams.get("refreshToken");
    const userParam = searchParams.get("user");

    // Legacy flow: tokens passed as URL params (should not happen with current backend,
    // but kept for backward-compat with older OAuth redirects).
    if (token) {
      localStorage.setItem(AUTH_CONFIG.TOKEN_KEY, token);
      if (refreshToken) {
        localStorage.setItem(AUTH_CONFIG.REFRESH_TOKEN_KEY, refreshToken);
      }
      setAuthCookie(AUTH_CONFIG.TOKEN_KEY, token);
      if (userParam) {
        try {
          const userData = JSON.parse(decodeURIComponent(userParam));
          localStorage.setItem(AUTH_CONFIG.USER_KEY, JSON.stringify(userData));
          setAuthCookie(
            AUTH_CONFIG.USER_KEY,
            JSON.stringify({
              role: userData.role,
              status: userData.status,
              verificationStatus: userData.verificationStatus,
              onboardingCompleted: hasCompletedOnboarding(userData),
              isBanned: Boolean(userData.isBanned),
              isEmailVerified: Boolean(userData.isEmailVerified),
            })
          );
        } catch {
          // ignore malformed user param
        }
      }
      // Clean URL immediately so a page refresh doesn't re-process params
      window.history.replaceState({}, "", "/dashboard");
    }

    // Single getMe call — resolves session from httpOnly cookie (OAuth)
    // or from Authorization header (if token is in localStorage).
    const timeout = setTimeout(() => {
      // Soft timeout fallback: try cached auth route first to avoid bouncing
      // users out on transient network stalls.
      const cachedUser = authService.getCurrentUser();
      if (cachedUser) {
        router.replace(getPostAuthRoute(cachedUser));
        return;
      }

      clearAuthStorage();
      router.replace("/login?reason=session_required");
    }, 8000);

    authService
      .getMeWithRefresh()
      .then((response) => {
        clearTimeout(timeout);
        if (response.success && response.data?.user) {
          const fetchedUser = response.data.user;

          // Sync user to localStorage and auth cookie so route guards have fresh state.
          localStorage.setItem(AUTH_CONFIG.USER_KEY, JSON.stringify(fetchedUser));
          setAuthCookie(
            AUTH_CONFIG.USER_KEY,
            JSON.stringify({
              role: fetchedUser.role,
              status: fetchedUser.status,
              verificationStatus: fetchedUser.verificationStatus,
              onboardingCompleted: hasCompletedOnboarding(fetchedUser),
              isBanned: Boolean(fetchedUser.isBanned),
              isEmailVerified: Boolean(fetchedUser.isEmailVerified),
            })
          );

          const target = getPostAuthRoute(fetchedUser);

          logDashboardEntry("Resolved dashboard entry route from backend profile", {
            role: fetchedUser.role,
            status: fetchedUser.status,
            target,
          });

          if (target === "/dashboard") {
            redirectByRole(fetchedUser.role, router);
          } else {
            router.replace(target);
          }
        } else {
          clearAuthStorage();
          router.replace("/login?reason=session_required");
        }
      })
      .catch((err: unknown) => {
        clearTimeout(timeout);
        const statusCode = extractStatusCode(err);

        if (statusCode === 401 || statusCode === 403) {
          clearAuthStorage();
          router.replace("/login?reason=session_expired");
          return;
        }

        const cached = authService.getCurrentUser();
        if (cached) {
          const target = getPostAuthRoute(cached);
          logDashboardEntry("Falling back to cached route after transient getMe failure", {
            role: cached.role,
            target,
            statusCode: statusCode ?? null,
          });
          router.replace(target);
          return;
        }

        clearAuthStorage();
        router.replace("/login?reason=session_required");
      });
  // searchParams is stable — router is stable. No deps needed beyond mount.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F7FA]">
      <div className="text-center">
        <div className="relative w-16 h-16 mx-auto mb-4">
          <div className="absolute inset-0 rounded-full border-4 border-gray-200" />
          <div className="absolute inset-0 rounded-full border-4 border-[#39B54A] border-t-transparent animate-spin" />
        </div>
        <p className="text-gray-600 font-medium">Loading your dashboard...</p>
      </div>
    </div>
  );
}

const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-[#F5F7FA]">
    <div className="relative w-16 h-16">
      <div className="absolute inset-0 rounded-full border-4 border-gray-200" />
      <div className="absolute inset-0 rounded-full border-4 border-[#39B54A] border-t-transparent animate-spin" />
    </div>
  </div>
);

export default function DashboardPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <DashboardContent />
    </Suspense>
  );
}

