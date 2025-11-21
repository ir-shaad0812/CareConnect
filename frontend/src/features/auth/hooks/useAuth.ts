// ============================================
// USE AUTH HOOK
// Thin wrapper over AuthContext for auth actions.
// Auth state (user) is owned exclusively by AuthContext —
// no duplicate local state here.
// ============================================

"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { authService } from "../services";
import { useAuthContext } from "../lib/AuthContext";
import { ROUTES } from "@/config";
import { getPostAuthRoute } from "@/lib/auth-routing";
import type { User } from "@/types";
import type { LoginCredentials, RegisterCredentials } from "../types";

interface UseAuthReturn {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  login: (credentials: LoginCredentials) => Promise<boolean>;
  register: (credentials: RegisterCredentials) => Promise<boolean>;
  logout: () => Promise<void>;
  clearError: () => void;
}

function resolveSafeReturnUrl(path: string | null): string | null {
  if (!path) return null;
  if (!path.startsWith("/")) return null;
  if (path.startsWith("//")) return null;
  if (path.startsWith("/login") || path.startsWith("/admin/login")) return null;

  try {
    const parsed = new URL(path, "http://localhost");
    if (
      parsed.searchParams.has("redirect") &&
      (
        parsed.pathname.startsWith("/dashboard") ||
        (parsed.pathname.startsWith("/admin") && parsed.pathname !== "/admin/login")
      )
    ) {
      parsed.searchParams.delete("redirect");
    }

    const query = parsed.searchParams.toString();
    return `${parsed.pathname}${query ? `?${query}` : ""}`;
  } catch {
    return path;
  }
}

export function useAuth(): UseAuthReturn {
  const router = useRouter();
  // Single source of truth — use AuthContext user, not a duplicate local state
  const { user, setUser, clearAuth } = useAuthContext();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = useCallback(
    async (credentials: LoginCredentials): Promise<boolean> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await authService.login(credentials);
        if (response.success && response.data) {
          const loggedInUser = response.data.user;

          // AuthContext is the single source of truth — update it once
          setUser(loggedInUser);

          // ── Central redirect engine ──────────────────────────────────────
          const returnUrl =
            typeof window !== "undefined"
              ? sessionStorage.getItem("auth_return_url")
              : null;
          const safeReturnUrl = resolveSafeReturnUrl(returnUrl);

          const targetPath = getPostAuthRoute(loggedInUser);

          if (safeReturnUrl) {
            sessionStorage.removeItem("auth_return_url");
            router.push(safeReturnUrl);
          } else {
            router.push(targetPath);
          }

          return true;
        }
        return false;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Login failed");
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [router, setUser],
  );

  const register = useCallback(
    async (credentials: RegisterCredentials): Promise<boolean> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await authService.register(credentials);
        if (response.success && response.data) {
          setUser(response.data.user);
          router.push(ROUTES.ONBOARDING);
          return true;
        }
        return false;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Registration failed");
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [router],
  );

  const logout = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      await authService.logout();
      clearAuth(); // clears AuthContext + localStorage + cookies
      router.push(ROUTES.LOGIN);
    } finally {
      setIsLoading(false);
    }
  }, [router, clearAuth]);

  const clearError = useCallback(() => setError(null), []);

  return { user, isLoading, error, login, register, logout, clearError };
}
