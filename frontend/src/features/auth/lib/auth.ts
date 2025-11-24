import type { NextRequest, NextResponse } from 'next/server';
import { AUTH_CONFIG, AUTH_ROUTES, PROTECTED_ROUTES, ROUTES } from '@/config';

export function getAuthToken(request: NextRequest): string | null {
  return (
    request.cookies.get(AUTH_CONFIG.TOKEN_KEY)?.value ||
    request.cookies.get('__session')?.value ||
    null
  );
}

export function isJwtValid(token: string): boolean {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;

    const padded = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(padded));

    if (typeof payload.exp === 'number' && payload.exp * 1000 < Date.now()) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

export function getUserRole(request: NextRequest): string | null {
  const raw = request.cookies.get(AUTH_CONFIG.USER_KEY)?.value;
  if (!raw) return null;

  try {
    const parsed = JSON.parse(decodeURIComponent(raw));
    return parsed?.role ?? null;
  } catch {
    return null;
  }
}

export function clearAuthCookies(response: NextResponse): void {
  response.cookies.delete(AUTH_CONFIG.TOKEN_KEY);
  response.cookies.delete(AUTH_CONFIG.USER_KEY);
  response.cookies.delete('__session');
}

export function isStaticAssetPath(pathname: string): boolean {
  return (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  );
}

export function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_ROUTES.some((route) => pathname.startsWith(route));
}

export function isAdminRoute(pathname: string): boolean {
  return pathname.startsWith('/admin') && pathname !== ROUTES.ADMIN_LOGIN;
}

export function isAuthRoute(pathname: string): boolean {
  return AUTH_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

export function isOAuthCallback(request: NextRequest): boolean {
  return (
    request.nextUrl.searchParams.has('token') &&
    request.nextUrl.searchParams.has('refreshToken')
  );
}
