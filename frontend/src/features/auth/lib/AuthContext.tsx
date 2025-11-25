// ============================================
// AUTH CONTEXT
// Global authentication state provider
// ============================================

"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { authService } from "../services";
import { AUTH_CONFIG } from "@/config";
import type { User, UserRole, UserStatus } from "@/types";
import { extractStatusCode } from "@/types/errors.types";

// Refresh token 5 minutes before expiry (assuming 15min access token = refresh at 10min)
const TOKEN_REFRESH_INTERVAL = 10 * 60 * 1000; // 10 minutes
// Minimum gap between visibility-triggered refreshes (avoid hammering on rapid tab switches)
const VISIBILITY_REFRESH_COOLDOWN = 60 * 1000; // 1 minute

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  userRole: UserRole | null;
  accountStatus: UserStatus | null;
  isVerified: boolean;
  setUser: (user: User | null) => void;
  checkAuth: () => Promise<void>;
  clearAuth: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

function logAuthDebug(
  message: string,
  details?: Record<string, unknown>,
): void {
  if (process.env.NODE_ENV !== "production") {
    console.info("[AuthContext]", message, details ?? {});
  }
}

const SESSION_REQUIRED_PREFIXES = [
  "/dashboard",
  "/admin",
  "/profile",
  "/messages",
  "/message",
  "/book",
  "/booking",
  "/my-care",
  "/my-timetable",
  "/notices",
  "/caregiver/assignments",
];

function hasClientAuthHint(): boolean {
  if (typeof window === "undefined") return false;

  const hasStoredUser = Boolean(localStorage.getItem(AUTH_CONFIG.USER_KEY));
  const hasStoredToken = Boolean(
    localStorage.getItem(AUTH_CONFIG.TOKEN_KEY) ||
    localStorage.getItem(AUTH_CONFIG.REFRESH_TOKEN_KEY),
  );
  const hasUserCookie = document.cookie.includes(`${AUTH_CONFIG.USER_KEY}=`);

  return hasStoredUser || hasStoredToken || hasUserCookie;
}

function routeRequiresSessionResolution(pathname: string): boolean {
  if (pathname === "/admin/login") return false;
  return SESSION_REQUIRED_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix),
  );
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastVisibilityRefreshRef = useRef<number>(0);

  const clearAuth = useCallback(() => {
    authService.clearAuthData();
    setUser(null);
  }, []);

  const checkAuth = useCallback(async () => {
    setIsLoading(true);

    const cachedUser = authService.getCurrentUser();
    if (cachedUser) {
      setUser(cachedUser);
    }

    if (typeof window !== "undefined") {
      const pathname = window.location.pathname;
      const shouldResolve =
        hasClientAuthHint() || routeRequiresSessionResolution(pathname);

      if (!shouldResolve) {
        setUser(cachedUser ?? null);
        setIsLoading(false);
        logAuthDebug(
          "Skipping session resolution on public route without auth hints",
          {
            pathname,
          },
        );
        return;
      }
    }

    try {
      const response = await authService.getMe();
      const fetchedUser = response.data?.user ?? null;

      if (!fetchedUser) {
        clearAuth();
        logAuthDebug("Session resolved without user payload; auth cleared");
        return;
      }

      authService.updateStoredUser(fetchedUser);
      setUser(fetchedUser);
      logAuthDebug("Session resolved from backend", {
        role: fetchedUser.role,
        status: fetchedUser.status,
        isEmailVerified: fetchedUser.isEmailVerified,
      });
    } catch (error: unknown) {
      const statusCode = extractStatusCode(error);
      if (statusCode === 401 || statusCode === 403) {
        await authService.logout();
        setUser(null);
        logAuthDebug("Session expired/forbidden while resolving auth", {
          statusCode,
        });
        return;
      }

      // Keep cached user for transient network failures.
      setUser(cachedUser ?? null);
      logAuthDebug("Session resolution failed; using cached auth state", {
        statusCode: statusCode ?? null,
        hasCachedUser: Boolean(cachedUser),
      });
    } finally {
      setIsLoading(false);
    }
  }, [clearAuth]);

  // Proactive token refresh
  const refreshTokenProactively = useCallback(async () => {
    const token = authService.getAccessToken();
    if (!token) return;

    try {
      await authService.refreshToken();
    } catch (error) {
      const statusCode = extractStatusCode(error);
      // Do not force logout on background refresh failures. Some sessions are
      // still valid through cookie auth and should continue until a protected
      // request actually fails with 401/403.
      if (statusCode === 401 || statusCode === 403) {
        logAuthDebug(
          "Proactive token refresh rejected; deferring logout until session validation fails",
          { statusCode },
        );
        return;
      }
      logAuthDebug("Proactive token refresh failed", {
        statusCode: statusCode ?? null,
      });
    }
  }, []);

  useEffect(() => {
    void checkAuth();

    // Set up proactive token refresh
    const startRefreshInterval = () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }

      const token = authService.getAccessToken();
      if (token) {
        refreshIntervalRef.current = setInterval(
          refreshTokenProactively,
          TOKEN_REFRESH_INTERVAL,
        );
      }
    };

    startRefreshInterval();

    // Listen for storage changes (logout in other tabs)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === AUTH_CONFIG.TOKEN_KEY && !e.newValue) {
        setUser(null);
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current);
        }
      }

      if (e.key === AUTH_CONFIG.USER_KEY) {
        setUser(authService.getCurrentUser());
      }
    };

    // Listen for visibility changes to refresh token when tab becomes visible.
    // Rate-limited to once per minute to avoid hammering on rapid tab switches.
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        const token = authService.getAccessToken();
        const now = Date.now();
        if (
          token &&
          now - lastVisibilityRefreshRef.current >= VISIBILITY_REFRESH_COOLDOWN
        ) {
          lastVisibilityRefreshRef.current = now;
          void refreshTokenProactively();
        }
      }
    };

    // Handle session expiry dispatched by the API client (avoids window.location.href in data layer)
    const handleSessionExpired = (e: Event) => {
      const detail = (e as CustomEvent<{ isAdmin: boolean }>).detail;
      clearAuth();
      const returnPath = window.location.pathname;
      if (!returnPath.includes("/login")) {
        sessionStorage.setItem("auth_return_url", returnPath);
      }
      // Use replaceState to avoid polluting history, then trigger a navigation
      const redirectPath = detail?.isAdmin
        ? "/admin/login?reason=session_expired"
        : "/login?reason=session_expired";
      window.location.replace(redirectPath);
    };

    window.addEventListener(
      "careconnect:session-expired",
      handleSessionExpired,
    );
    window.addEventListener("storage", handleStorageChange);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
      window.removeEventListener(
        "careconnect:session-expired",
        handleSessionExpired,
      );
      window.removeEventListener("storage", handleStorageChange);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [checkAuth, clearAuth, refreshTokenProactively]);

  const userRole: UserRole | null = user?.role ?? null;
  const accountStatus: UserStatus | null = user?.status ?? null;
  const isVerified = Boolean(user?.isEmailVerified);

  // Memoize context value to prevent unnecessary re-renders of children
  const value: AuthContextValue = useMemo(
    () => ({
      user,
      isAuthenticated: !!user,
      isLoading,
      userRole,
      accountStatus,
      isVerified,
      setUser,
      checkAuth,
      clearAuth,
    }),
    [
      user,
      isLoading,
      userRole,
      accountStatus,
      isVerified,
      setUser,
      checkAuth,
      clearAuth,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }
  return context;
}
