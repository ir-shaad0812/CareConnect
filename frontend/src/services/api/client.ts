// ============================================
// API CLIENT - HTTP Request Handler
// ============================================

import { API_CONFIG, AUTH_CONFIG } from "@/lib/constants";
import type { ApiResponse, ApiError } from "@/types";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

interface RequestConfig {
  method: HttpMethod;
  headers?: Record<string, string>;
  params?: Record<string, unknown>;
  body?: unknown;
  timeout?: number;
  skipAuth?: boolean;
}

interface GetOptions {
  params?: Record<string, unknown>;
  headers?: Record<string, string>;
}

// Flag to prevent multiple simultaneous refresh attempts
let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;
let lastRefreshFailureAt = 0;
let sessionExpiredNotified = false;
const REFRESH_FAILURE_COOLDOWN_MS = 30_000;

const LEGACY_AUTH_TOKEN_KEYS = ["token", "careconnect_access_token"] as const;
const LEGACY_REFRESH_TOKEN_KEYS = ["refreshToken"] as const;

/**
 * Get auth token from localStorage (secondary / legacy support only).
 * The primary auth mechanism is httpOnly cookies sent via credentials: 'include'.
 * This is only needed for the Authorization Bearer header fallback.
 */
function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  const primaryToken = localStorage.getItem(AUTH_CONFIG.TOKEN_KEY);
  if (primaryToken) {
    return primaryToken;
  }

  for (const legacyKey of LEGACY_AUTH_TOKEN_KEYS) {
    const legacyToken = localStorage.getItem(legacyKey);
    if (legacyToken) {
      localStorage.setItem(AUTH_CONFIG.TOKEN_KEY, legacyToken);
      localStorage.removeItem(legacyKey);
      return legacyToken;
    }
  }

  return null;
}

/**
 * Get refresh token from storage
 */
function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  const primaryRefreshToken = localStorage.getItem(
    AUTH_CONFIG.REFRESH_TOKEN_KEY,
  );
  if (primaryRefreshToken) {
    return primaryRefreshToken;
  }

  for (const legacyKey of LEGACY_REFRESH_TOKEN_KEYS) {
    const legacyRefreshToken = localStorage.getItem(legacyKey);
    if (legacyRefreshToken) {
      localStorage.setItem(AUTH_CONFIG.REFRESH_TOKEN_KEY, legacyRefreshToken);
      localStorage.removeItem(legacyKey);
      return legacyRefreshToken;
    }
  }

  return null;
}

/**
 * Get current language from storage
 */
function getCurrentLanguage(): string {
  if (typeof window === "undefined") return "en";
  return localStorage.getItem("careconnect_language") || "en";
}

function clearStoredTokens(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(AUTH_CONFIG.TOKEN_KEY);
  localStorage.removeItem(AUTH_CONFIG.REFRESH_TOKEN_KEY);
}

function shouldAttemptRefresh(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const hasTokenHints = Boolean(getAuthToken() || getRefreshToken());
  const hasCachedUser = Boolean(localStorage.getItem(AUTH_CONFIG.USER_KEY));
  const path = window.location.pathname;
  const isProtectedPath = /^\/(dashboard|admin|profile|messages|message)(\/|$)/.test(
    path,
  );

  return hasTokenHints || hasCachedUser || isProtectedPath;
}

function notifySessionExpiredOnce(): void {
  if (typeof window === "undefined" || sessionExpiredNotified) {
    return;
  }

  sessionExpiredNotified = true;
  const currentPath = window.location.pathname;
  const isAdmin = currentPath.startsWith("/admin");

  if (!currentPath.includes("/login")) {
    sessionStorage.setItem("auth_return_url", currentPath);
  }

  window.dispatchEvent(
    new CustomEvent("careconnect:session-expired", {
      detail: { isAdmin },
    }),
  );
}

function isJwtExpiredOrInvalid(token: string): boolean {
  try {
    const [, payloadBase64] = token.split(".");
    if (!payloadBase64) return true;

    const normalizedPayload = payloadBase64
      .replace(/-/g, "+")
      .replace(/_/g, "/");
    const payloadJson = JSON.parse(atob(normalizedPayload)) as { exp?: number };

    if (typeof payloadJson.exp !== "number") {
      return true;
    }

    return payloadJson.exp * 1000 <= Date.now();
  } catch {
    return true;
  }
}

/**
 * Create request headers
 */
function createHeaders(
  customHeaders?: Record<string, string>,
  token?: string | null,
  isFormData = false,
): Headers {
  const headers = new Headers({
    "Accept-Language": getCurrentLanguage(),
    ...customHeaders,
  });

  // Let the browser set multipart boundary automatically for FormData bodies.
  if (!isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const authToken = token || getAuthToken();
  if (authToken && !isJwtExpiredOrInvalid(authToken)) {
    headers.set("Authorization", `Bearer ${authToken}`);
  }

  return headers;
}

/**
 * Attempt to refresh the access token
 */
async function refreshAccessToken(): Promise<boolean> {
  if (sessionExpiredNotified) {
    return false;
  }

  // Avoid noisy refresh attempts for anonymous/public sessions.
  // We still allow refresh when route context implies an active session.
  if (!shouldAttemptRefresh()) {
    return false;
  }

  if (
    lastRefreshFailureAt > 0 &&
    Date.now() - lastRefreshFailureAt < REFRESH_FAILURE_COOLDOWN_MS
  ) {
    return false;
  }

  const refreshToken = getRefreshToken();

  try {
    // Prefer cookie-based refresh first. This avoids sending stale localStorage
    // refresh tokens that can override a valid httpOnly cookie on the backend.
    let response = await fetch(`${API_CONFIG.BASE_URL}/auth/refresh-token`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Legacy fallback: if cookie refresh fails, try body token once.
    if (!response.ok && refreshToken) {
      response = await fetch(`${API_CONFIG.BASE_URL}/auth/refresh-token`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refreshToken }),
      });
    }

    if (!response.ok) {
      // Don't force a logout here. Some sessions remain valid via cookies even
      // when legacy local refresh tokens are stale.
      lastRefreshFailureAt = Date.now();
      clearStoredTokens();
      return false;
    }

    const data = await response.json();

    if (data.data?.accessToken) {
      // Store new access token so subsequent requests can send it as Bearer header
      localStorage.setItem(AUTH_CONFIG.TOKEN_KEY, data.data.accessToken);
      if (data.data.refreshToken) {
        localStorage.setItem(
          AUTH_CONFIG.REFRESH_TOKEN_KEY,
          data.data.refreshToken,
        );
      }
      lastRefreshFailureAt = 0;
      sessionExpiredNotified = false;
      return true;
    }

    lastRefreshFailureAt = Date.now();
    return false;
  } catch (error) {
    console.error("Token refresh failed:", error);
    lastRefreshFailureAt = Date.now();
    return false;
  }
}

/**
 * Handle token refresh with deduplication
 */
async function handleTokenRefresh(): Promise<boolean> {
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = refreshAccessToken().finally(() => {
    isRefreshing = false;
    refreshPromise = null;
  });

  return refreshPromise;
}

/**
 * Handle API response
 */
async function handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
  let data;
  try {
    const text = await response.text();
    data = text ? JSON.parse(text) : {};
  } catch {
    data = {};
  }

  if (!response.ok) {
    const error: ApiError = {
      message: data.message || `Request failed with status ${response.status}`,
      statusCode: response.status,
      errors: data.errors,
    };
    throw error;
  }

  return {
    success: true,
    data: data.data || data,
    message: data.message,
  };
}

/**
 * Main API request function with automatic token refresh
 */
async function request<T>(
  endpoint: string,
  config: RequestConfig,
  isRetry = false,
): Promise<ApiResponse<T>> {
  // Build URL with query params
  let url = `${API_CONFIG.BASE_URL}${endpoint}`;
  if (config.params && Object.keys(config.params).length > 0) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(config.params)) {
      if (value !== undefined && value !== null) {
        searchParams.set(key, String(value));
      }
    }
    const queryString = searchParams.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    config.timeout || API_CONFIG.TIMEOUT,
  );

  try {
    const isFormDataBody =
      typeof FormData !== "undefined" && config.body instanceof FormData;

    // Refresh early when the stored access token is expired or malformed.
    if (!isRetry && !endpoint.includes("/auth/")) {
      const currentToken = getAuthToken();
      if (currentToken && isJwtExpiredOrInvalid(currentToken)) {
        const refreshed = await handleTokenRefresh();
        if (!refreshed) {
          clearStoredTokens();
        }
      }
    }

    // Create headers fresh for each request to get current token
    const requestInit: RequestInit = {
      method: config.method,
      headers: createHeaders(config.headers, undefined, isFormDataBody),
      signal: controller.signal,
      credentials: "include", // Always send httpOnly cookies (primary auth mechanism)
      ...(config.body !== undefined
        ? {
            body: isFormDataBody
              ? (config.body as FormData)
              : JSON.stringify(config.body ?? null),
          }
        : {}),
    };

    const response = await fetch(url, requestInit);
    clearTimeout(timeoutId);

    if (response.ok) {
      sessionExpiredNotified = false;
    }

    // Handle 401 Unauthorized - attempt token refresh
    if (response.status === 401 && !isRetry && !endpoint.includes("/auth/")) {
      clearTimeout(timeoutId); // Clear timeout before retry
      if (!sessionExpiredNotified) {
        const refreshed = await handleTokenRefresh();
        if (refreshed) {
          // Retry the original request with the new token
          return request<T>(endpoint, config, true);
        }
      }

      // Dispatch once; avoid repeated refresh/token-expired storms while the
      // app is already navigating to auth flow.
      notifySessionExpiredOnce();
      throw {
        message: "Session expired. Please login again.",
        statusCode: 401,
      } as ApiError;
    }

    return handleResponse<T>(response);
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === "AbortError") {
      throw { message: "Request timeout", statusCode: 408 } as ApiError;
    }
    // Re-throw ApiError objects as-is (these come from handleResponse or above)
    if (error && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    // Handle network errors (Failed to fetch, CORS, TypeError, etc.)
    if (error instanceof TypeError) {
      throw {
        message:
          "Unable to connect to server. Please check if the backend is running.",
        statusCode: 0,
      } as ApiError;
    }
    // Wrap unknown errors with a proper message
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred";
    throw { message: errorMessage, statusCode: 500 } as ApiError;
  }
}

/**
 * API Client with HTTP methods
 */
export const apiClient = {
  get: <T>(endpoint: string, options?: GetOptions) =>
    request<T>(endpoint, {
      method: "GET",
      ...(options?.headers ? { headers: options.headers } : {}),
      ...(options?.params ? { params: options.params } : {}),
    }),

  post: <T>(
    endpoint: string,
    body?: unknown,
    headers?: Record<string, string>,
  ) =>
    request<T>(endpoint, {
      method: "POST",
      ...(body !== undefined ? { body } : {}),
      ...(headers ? { headers } : {}),
    }),

  put: <T>(
    endpoint: string,
    body?: unknown,
    headers?: Record<string, string>,
  ) =>
    request<T>(endpoint, {
      method: "PUT",
      ...(body !== undefined ? { body } : {}),
      ...(headers ? { headers } : {}),
    }),

  patch: <T>(
    endpoint: string,
    body?: unknown,
    headers?: Record<string, string>,
  ) =>
    request<T>(endpoint, {
      method: "PATCH",
      ...(body !== undefined ? { body } : {}),
      ...(headers ? { headers } : {}),
    }),

  delete: <T>(endpoint: string, headers?: Record<string, string>) =>
    request<T>(endpoint, {
      method: "DELETE",
      ...(headers ? { headers } : {}),
    }),
};

export default apiClient;
