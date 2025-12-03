// ============================================
// AUTH SERVICE
// Clean API layer for authentication
// ============================================

import { API_CONFIG, AUTH_CONFIG, ENDPOINTS } from "@/config";
import { hasCompletedOnboarding } from "@/lib/auth-routing";
import type { ApiResponse } from "@/types";
import type { User } from "@/types";
import type {
  LoginCredentials,
  RegisterCredentials,
  AuthResponse,
  AuthTokens,
} from "../types";

type ServiceError = Error & {
  statusCode?: number;
  code?: string;
  details?: unknown;
};

// Cookie helpers for Edge middleware compatibility
function buildCookieAttributes(days: number): string {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  const secure =
    typeof window !== "undefined" && window.location.protocol === "https:";
  return `expires=${expires};path=/;SameSite=Lax${secure ? ";Secure" : ""}`;
}

function setCookie(name: string, value: string, days = 7): void {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=${encodeURIComponent(value)};${buildCookieAttributes(days)}`;
}

function deleteCookie(name: string): void {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;SameSite=Lax`;
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;SameSite=Lax;Secure`;
}

function getErrorMessage(data: unknown, fallback: string): string {
  if (typeof data === "object" && data !== null) {
    const payload = data as { message?: unknown; errors?: unknown };
    const message = payload.message;

    if (Array.isArray(payload.errors) && payload.errors.length > 0) {
      const firstError = payload.errors[0];
      if (typeof firstError === "string" && firstError.trim().length > 0) {
        return firstError;
      }
      if (
        typeof firstError === "object" &&
        firstError !== null &&
        "message" in firstError
      ) {
        const fieldMessage = (firstError as { message?: unknown }).message;
        if (typeof fieldMessage === "string" && fieldMessage.trim().length > 0) {
          return fieldMessage;
        }
      }
    }

    if (typeof message === "string" && message.trim().length > 0) {
      return message;
    }
  }
  return fallback;
}

function createApiError(
  response: Response,
  data: unknown,
  fallback: string,
): ServiceError {
  const error = new Error(getErrorMessage(data, fallback)) as ServiceError;
  error.statusCode = response.status;

  if (typeof data === "object" && data !== null && "code" in data) {
    const code = (data as { code?: unknown }).code;
    if (typeof code === "string" && code.length > 0) {
      error.code = code;
    }
  }

  error.details = data;
  return error;
}

function extractUserAccessPayload(user: User): string {
  return JSON.stringify({
    role: user.role,
    status: user.status,
    verificationStatus: user.verificationStatus,
    onboardingCompleted: hasCompletedOnboarding(user),
    isBanned: Boolean(user.isBanned),
    isEmailVerified: Boolean(user.isEmailVerified),
    isProfileComplete: Boolean(user.isProfileComplete),
  });
}

async function parseApiBody(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function requireResponseData<T>(data: unknown, fallbackMessage: string): T {
  if (typeof data === "object" && data !== null && "data" in data) {
    const payload = (data as { data?: unknown }).data;
    if (payload !== undefined && payload !== null) {
      return payload as T;
    }
  }

  throw new Error(fallbackMessage);
}

class AuthService {
  private baseUrl = API_CONFIG.BASE_URL;
  private inFlightMeRequest: Promise<ApiResponse<{ user: User }>> | null = null;

  // ─────────────────────────────────────────────────────────────────
  // API METHODS
  // ─────────────────────────────────────────────────────────────────

  async register(
    credentials: RegisterCredentials,
  ): Promise<ApiResponse<AuthResponse>> {
    const response = await fetch(`${this.baseUrl}${ENDPOINTS.auth.register}`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(credentials),
    });

    const data = await parseApiBody(response);
    if (!response.ok) {
      throw createApiError(response, data, "Registration failed");
    }

    const authData = requireResponseData<AuthResponse>(
      data,
      "Invalid registration response payload",
    );

    // Registration may intentionally return no session tokens.
    // Only persist authenticated state when tokens are present.
    if (authData.accessToken || authData.refreshToken) {
      this.storeAuthData(authData);
    } else {
      this.clearAuthData();
    }

    return { success: true, data: authData };
  }

  async login(
    credentials: LoginCredentials,
  ): Promise<ApiResponse<AuthResponse>> {
    const response = await fetch(`${this.baseUrl}${ENDPOINTS.auth.login}`, {
      method: "POST",
      credentials: "include", // backend sets httpOnly cookies
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(credentials),
    });

    const data = await parseApiBody(response);
    if (!response.ok) {
      throw createApiError(response, data, "Login failed");
    }

    const authData = requireResponseData<AuthResponse>(
      data,
      "Invalid login response payload",
    );
    // Store only non-sensitive user info + role cookie for middleware
    this.storeAuthData(authData);

    return { success: true, data: authData };
  }

  async logout(): Promise<void> {
    try {
      await fetch(`${this.baseUrl}${ENDPOINTS.auth.logout}`, {
        method: "POST",
        credentials: "include", // sends httpOnly refresh cookie to backend
        headers: { "Content-Type": "application/json" },
      });
    } catch {
      // Continue with local cleanup even if API fails
    } finally {
      this.clearAuthData();
    }
  }

  async verifyEmail(token: string): Promise<ApiResponse<{
    message: string;
    requiresApproval?: boolean;
    requiresOnboarding?: boolean;
    user?: User;
    accessToken?: string;
    refreshToken?: string;
  }>> {
    const response = await fetch(
      `${this.baseUrl}${ENDPOINTS.auth.verifyEmail}?token=${token}`,
      {
        credentials: "include",
      },
    );
    const data = await parseApiBody(response);

    if (!response.ok) {
      throw createApiError(response, data, "Verification failed");
    }

    const verifyData = requireResponseData<{
      message: string;
      requiresApproval?: boolean;
      requiresOnboarding?: boolean;
      user?: User;
      accessToken?: string;
      refreshToken?: string;
    }>(
      data,
      "Invalid verify email response payload",
    );

    if (
      verifyData.user &&
      (verifyData.accessToken || verifyData.refreshToken)
    ) {
      this.storeAuthData({
        user: verifyData.user,
        accessToken: verifyData.accessToken || "",
        refreshToken: verifyData.refreshToken || "",
      });
    }

    return {
      success: true,
      data: verifyData,
    };
  }

  async forgotPassword(
    email: string,
  ): Promise<ApiResponse<{ message: string; isGoogleAccount?: boolean }>> {
    const response = await fetch(
      `${this.baseUrl}${ENDPOINTS.auth.forgotPassword}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      },
    );

    const data = await parseApiBody(response);

    if (!response.ok) {
      throw createApiError(response, data, "Request failed");
    }

    return {
      success: true,
      data: requireResponseData<{ message: string; isGoogleAccount?: boolean }>(
        data,
        "Invalid forgot password response payload",
      ),
    };
  }

  async resetPassword(
    token: string,
    password: string,
    confirmPassword?: string,
  ): Promise<ApiResponse<{ message: string }>> {
    const response = await fetch(
      `${this.baseUrl}${ENDPOINTS.auth.resetPassword}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          password,
          confirmPassword: confirmPassword || password,
        }),
      },
    );

    const data = await parseApiBody(response);

    if (!response.ok) {
      throw createApiError(response, data, "Reset failed");
    }

    return {
      success: true,
      data: requireResponseData<{ message: string }>(
        data,
        "Invalid reset password response payload",
      ),
    };
  }

  async refreshToken(): Promise<ApiResponse<AuthTokens>> {
    const refreshToken = this.getRefreshToken();

    // Prefer cookie-only refresh so stale localStorage refresh tokens do not
    // override a valid httpOnly cookie session.
    let response = await fetch(
      `${this.baseUrl}${ENDPOINTS.auth.refreshToken}`,
      {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      },
    );

    let data = await parseApiBody(response);

    // Legacy fallback for clients that still depend on body refreshToken.
    if (!response.ok && refreshToken) {
      response = await fetch(
        `${this.baseUrl}${ENDPOINTS.auth.refreshToken}`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken }),
        },
      );
      data = await parseApiBody(response);
    }

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        this.clearAuthData();
      }
      throw createApiError(response, data, "Token refresh failed");
    }

    const tokenData = requireResponseData<AuthTokens>(
      data,
      "Invalid refresh token response payload",
    );
    return { success: true, data: tokenData };
  }

  async getMe(): Promise<ApiResponse<{ user: User }>> {
    if (this.inFlightMeRequest) {
      return this.inFlightMeRequest;
    }

    this.inFlightMeRequest = (async () => {
      const response = await fetch(`${this.baseUrl}/auth/me`, {
        method: "GET",
        credentials: "include", // sends httpOnly access token cookie
        headers: { "Content-Type": "application/json" },
      });

      const data = await parseApiBody(response);
      if (!response.ok) {
        throw createApiError(response, data, "Session validation failed");
      }

      return {
        success: true,
        data: requireResponseData<{ user: User }>(
          data,
          "Invalid auth profile response payload",
        ),
      };
    })();

    try {
      return await this.inFlightMeRequest;
    } finally {
      this.inFlightMeRequest = null;
    }
  }

  async getMeWithRefresh(): Promise<ApiResponse<{ user: User }>> {
    try {
      return await this.getMe();
    } catch (error: unknown) {
      const statusCode = (error as ServiceError)?.statusCode;
      if (statusCode !== 401 && statusCode !== 403) {
        throw error;
      }

      await this.refreshToken();
      return this.getMe();
    }
  }

  initiateGoogleLogin(): void {
    window.location.href = `${this.baseUrl}${ENDPOINTS.auth.google}`;
  }

  // ─────────────────────────────────────────────────────────────────
  // STORAGE METHODS
  //
  // SECURITY NOTE: The backend sets tokens in httpOnly cookies which
  // cannot be accessed by JavaScript. The localStorage copies below
  // are a secondary convenience for:
  //   1. Client-side route protection in middleware
  //   2. Immediate auth state checks without API calls
  //   3. Cross-tab synchronization
  //
  // The actual API authentication uses cookies (credentials: 'include').
  // localStorage tokens are NOT used for API auth - they're informational.
  // If XSS occurs, attackers cannot steal httpOnly cookies but could
  // read localStorage. Mitigation: CSP headers, input sanitization.
  // ─────────────────────────────────────────────────────────────────

  private storeAuthData(data: AuthResponse): void {
    if (typeof window === "undefined") return;

    // Store non-sensitive user info for client-side UI state
    localStorage.setItem(AUTH_CONFIG.USER_KEY, JSON.stringify(data.user));

    // Store access token in localStorage for API client (client.ts) compatibility.
    // The httpOnly cookie set by the backend is the primary auth mechanism;
    // localStorage is a secondary convenience for the API client layer.
    if (data.accessToken) {
      localStorage.setItem(AUTH_CONFIG.TOKEN_KEY, data.accessToken);
    }
    if (data.refreshToken) {
      localStorage.setItem(AUTH_CONFIG.REFRESH_TOKEN_KEY, data.refreshToken);
    }

    // Mirror auth state to a JS-accessible cookie so the Edge proxy can
    // perform role/status/verification checks without an API round trip.
    setCookie(AUTH_CONFIG.USER_KEY, extractUserAccessPayload(data.user));
  }

  clearAuthData(): void {
    if (typeof window === "undefined") return;

    localStorage.removeItem(AUTH_CONFIG.USER_KEY);
    localStorage.removeItem(AUTH_CONFIG.TOKEN_KEY);
    localStorage.removeItem(AUTH_CONFIG.REFRESH_TOKEN_KEY);
    deleteCookie(AUTH_CONFIG.USER_KEY);
  }

  getAccessToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(AUTH_CONFIG.TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(AUTH_CONFIG.REFRESH_TOKEN_KEY);
  }

  getCurrentUser(): User | null {
    if (typeof window === "undefined") return null;

    const userStr = localStorage.getItem(AUTH_CONFIG.USER_KEY);
    if (!userStr) return null;

    try {
      return JSON.parse(userStr) as User;
    } catch {
      return null;
    }
  }

  updateStoredUser(user: User): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(AUTH_CONFIG.USER_KEY, JSON.stringify(user));
    setCookie(AUTH_CONFIG.USER_KEY, extractUserAccessPayload(user));
  }

  getDashboardPathForRole(role: string | null | undefined): string | null {
    if (role === "admin") return "/admin/dashboard";
    if (role === "caregiver") return "/dashboard/caregiver";
    if (role === "careseeker") return "/dashboard/careseeker";
    return null;
  }

  needsOAuthOnboarding(user: User): boolean {
    if (user.role === "admin") {
      return false;
    }

    const status = typeof user.status === "string" ? user.status : null;
    const lifecycleRequiresOnboarding =
      status === "onboarding" || status === "pending";

    if (!lifecycleRequiresOnboarding) {
      return false;
    }

    return !user.role || !user.phone || !user.gender || !user.age;
  }

  /**
   * Update user's preferred language
   */
  async updatePreferredLanguage(language: string): Promise<User> {
    const response = await fetch(
      `${API_CONFIG.BASE_URL}${ENDPOINTS.USER.PROFILE}`,
      {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferredLanguage: language }),
      },
    );

    const data = await parseApiBody(response);

    if (!response.ok) {
      throw createApiError(
        response,
        data,
        "Failed to update language preference",
      );
    }

    const user = requireResponseData<User>(data, "Invalid response");
    this.updateStoredUser(user);
    return user;
  }

  isAuthenticated(): boolean {
    return !!this.getCurrentUser();
  }

  isAdmin(): boolean {
    const user = this.getCurrentUser();
    return user?.role === "admin";
  }
}

export const authService = new AuthService();
