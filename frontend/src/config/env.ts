// ENVIRONMENT CONFIGURATION
// Single source of truth for public runtime configuration.
// Never access process.env directly outside this file.

type AppEnv = 'development' | 'production' | 'test';

type PublicEnvKey =
  | 'NEXT_PUBLIC_API_URL'
  | 'NEXT_PUBLIC_APP_URL'
  | 'NEXT_PUBLIC_SOCKET_URL'
  | 'NEXT_PUBLIC_ENABLE_SOCIAL_LOGIN'
  | 'NEXT_PUBLIC_GOOGLE_CLIENT_ID'
  | 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY'
  | 'NEXT_PUBLIC_MAPBOX_API_KEY';

// Static access lets Next.js inline NEXT_PUBLIC_* in client bundles.
const publicEnv: Record<PublicEnvKey, string | undefined> = {
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_SOCKET_URL: process.env.NEXT_PUBLIC_SOCKET_URL,
  NEXT_PUBLIC_ENABLE_SOCIAL_LOGIN: process.env.NEXT_PUBLIC_ENABLE_SOCIAL_LOGIN,
  NEXT_PUBLIC_GOOGLE_CLIENT_ID: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  NEXT_PUBLIC_MAPBOX_API_KEY: process.env.NEXT_PUBLIC_MAPBOX_API_KEY,
};

const appEnv = (process.env.NODE_ENV as AppEnv | undefined) ?? 'development';

function normalize(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function isValidUrlOrRelativePath(value: string): boolean {
  if (value.startsWith('/')) {
    return true;
  }

  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function assertRequiredEnv(key: PublicEnvKey): string {
  const value = normalize(publicEnv[key]);
  if (!value) {
    throw new Error(`[env] Missing required environment variable: ${key}`);
  }

  if (!isValidUrlOrRelativePath(value)) {
    throw new Error(`[env] Invalid value for ${key}. Expected absolute http(s) URL or relative path starting with '/'.`);
  }

  return value;
}

function readOptionalEnv(key: PublicEnvKey): string | undefined {
  return normalize(publicEnv[key]);
}

function deriveSocketUrl(apiUrl: string, explicitSocketUrl?: string): string {
  if (explicitSocketUrl) {
    if (!isValidUrlOrRelativePath(explicitSocketUrl)) {
      throw new Error('[env] Invalid value for NEXT_PUBLIC_SOCKET_URL. Expected absolute http(s) URL or relative path starting with \'/\'.');
    }
    return explicitSocketUrl;
  }

  if (apiUrl.startsWith('/')) {
    if (typeof window !== 'undefined') {
      return window.location.origin;
    }
    return apiUrl;
  }

  return apiUrl.replace(/\/api\/?$/, '');
}

export function validateEnv(): void {
  assertRequiredEnv('NEXT_PUBLIC_API_URL');
}

const apiUrl = assertRequiredEnv('NEXT_PUBLIC_API_URL');
const appUrl = assertRequiredEnv('NEXT_PUBLIC_APP_URL');
const socketUrl = deriveSocketUrl(apiUrl, readOptionalEnv('NEXT_PUBLIC_SOCKET_URL'));

export const env = {
  API_URL: apiUrl,
  SOCKET_URL: socketUrl,
  APP_URL: appUrl,
  APP_ENV: appEnv,
  ENABLE_SOCIAL_LOGIN: readOptionalEnv('NEXT_PUBLIC_ENABLE_SOCIAL_LOGIN') === 'true',
  GOOGLE_CLIENT_ID: readOptionalEnv('NEXT_PUBLIC_GOOGLE_CLIENT_ID'),
  STRIPE_PUBLISHABLE_KEY: readOptionalEnv('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY'),
  MAPBOX_API_KEY: readOptionalEnv('NEXT_PUBLIC_MAPBOX_API_KEY'),
  isDevelopment: () => appEnv === 'development',
  isProduction: () => appEnv === 'production',
  isTest: () => appEnv === 'test',
} as const;

// Validate environment variables on module load
if (typeof window !== 'undefined') {
  validateEnv();
}

export default env;
