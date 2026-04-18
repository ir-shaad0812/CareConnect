'use client';

import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { authService } from '../services';
import type { User } from '@/types';
import { extractStatusCode } from '@/types/errors.types';
import { getPostAuthRoute } from '@/lib/auth-routing';

interface AuthPageGuardProps {
  children: ReactNode;
}

function logAuthPageGuard(message: string, details?: Record<string, unknown>): void {
  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.info('[AuthPageGuard]', message, details ?? {});
  }
}

function canUseOAuthOnboarding(pathname: string, oauthParam: string | null, user: User): boolean {
  if (pathname !== '/register') return false;
  if (oauthParam !== 'success') return false;
  return authService.needsOAuthOnboarding(user);
}

function hasClientAuthHint(): boolean {
  if (typeof window === 'undefined') return false;

  const hasStoredUser = Boolean(localStorage.getItem('careconnect_user'));
  const hasStoredToken = Boolean(
    localStorage.getItem('careconnect_token') ||
      localStorage.getItem('careconnect_refresh_token')
  );
  const hasUserCookie = document.cookie.includes('careconnect_user=');

  return hasStoredUser || hasStoredToken || hasUserCookie;
}

export function AuthPageGuard({ children }: AuthPageGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isChecking, setIsChecking] = useState(true);

  const search = useMemo(() => searchParams.toString(), [searchParams]);

  useEffect(() => {
    let isMounted = true;

    const resolveAuthPageAccess = async () => {
      const params = new URLSearchParams(search);
      const oauthParam = params.get('oauth');

      const cachedUser = authService.getCurrentUser();
      if (!cachedUser && !hasClientAuthHint()) {
        if (isMounted) {
          setIsChecking(false);
        }
        logAuthPageGuard('No auth hints on auth page; skipping session lookup', {
          pathname,
        });
        return;
      }

      try {
        const response = await authService.getMe();
        const fetchedUser = response.data?.user;

        if (!fetchedUser) {
          throw new Error('Authenticated session did not return user payload');
        }

        authService.updateStoredUser(fetchedUser);

        if (canUseOAuthOnboarding(pathname, oauthParam, fetchedUser)) {
          if (isMounted) {
            setIsChecking(false);
          }
          logAuthPageGuard('Allowed OAuth onboarding route', {
            pathname,
            role: fetchedUser.role,
          });
          return;
        }

        const targetPath = getPostAuthRoute(fetchedUser);
        logAuthPageGuard('Redirecting authenticated user away from auth page', {
          pathname,
          targetPath,
          role: fetchedUser.role,
          status: fetchedUser.status,
        });
        router.replace(targetPath);
      } catch (error: unknown) {
        const statusCode = extractStatusCode(error);

        if (statusCode === 401 || statusCode === 403) {
          authService.clearAuthData();
          if (isMounted) {
            setIsChecking(false);
          }
          logAuthPageGuard('No valid session for auth page; allowing access', {
            pathname,
            statusCode,
          });
          return;
        }

        if (cachedUser) {
          if (canUseOAuthOnboarding(pathname, oauthParam, cachedUser)) {
            if (isMounted) {
              setIsChecking(false);
            }
            logAuthPageGuard('Allowed OAuth onboarding route from cached user', {
              pathname,
              role: cachedUser.role,
            });
            return;
          }

          const targetPath = getPostAuthRoute(cachedUser);
          logAuthPageGuard('Redirecting using cached auth user', {
            pathname,
            targetPath,
            role: cachedUser.role,
            status: cachedUser.status,
            statusCode: statusCode ?? null,
          });
          router.replace(targetPath);
          return;
        }

        if (isMounted) {
          setIsChecking(false);
        }
      }
    };

    void resolveAuthPageAccess();

    return () => {
      isMounted = false;
    };
  }, [pathname, router, search]);

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F7FA]">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-full border-4 border-gray-200" />
          <div className="absolute inset-0 rounded-full border-4 border-[#39B54A] border-t-transparent animate-spin" />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
