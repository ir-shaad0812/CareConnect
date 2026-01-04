// ============================================
// ADMIN LOGIN PAGE
// Login page for administrators only
// ============================================

"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { authService } from "@/services";
import { Logo } from "@/components/ui/Logo";
import { adminService } from "@/services";
import { hasCompletedOnboarding } from "@/lib/auth-routing";
import { AUTH_CONFIG } from "@/lib/constants";
import type { User } from "@/types";

interface AdminLoginResponse {
  accessToken: string;
  refreshToken: string;
  user: Pick<User, "_id" | "fullName" | "email" | "role"> &
    Partial<
      Pick<
        User,
        | "status"
        | "verificationStatus"
        | "onboardingCompleted"
        | "isBanned"
        | "isEmailVerified"
        | "isProfileComplete"
      >
    >;
}

export default function AdminLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  // Check if already logged in as admin
  // Only auto-redirect when BOTH localStorage user AND accessToken cookie exist
  // (guards against stale localStorage after session expiry causing a redirect loop)
  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    setAuthLoading(false);
    if (currentUser?.role === "admin") {
      // Verify the token cookie is actually present before trusting localStorage
      const hasCookie =
        document.cookie.includes("accessToken=") ||
        document.cookie.includes("careconnect_token=");
      if (!hasCookie) return; // stale localStorage — stay on login page
      const dest = searchParams.get("redirect") || searchParams.get("callbackUrl") || "/admin/dashboard";
      router.push(dest);
    }
  }, [router, searchParams]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await adminService.login(
        formData.email.trim(),
        formData.password,
      );
      const data = response.data as AdminLoginResponse;
      
      // Store tokens
      if (data?.accessToken) {
        localStorage.setItem(AUTH_CONFIG.TOKEN_KEY, data.accessToken);
        if (data.refreshToken) {
          localStorage.setItem(AUTH_CONFIG.REFRESH_TOKEN_KEY, data.refreshToken);
        }
        if (data.user) {
          localStorage.setItem(AUTH_CONFIG.USER_KEY, JSON.stringify(data.user));
        }
        // Mirror to cookies so the Edge proxy middleware can authenticate the route
        const expires = new Date(Date.now() + 7 * 864e5).toUTCString();
        document.cookie = `${AUTH_CONFIG.TOKEN_KEY}=${encodeURIComponent(data.accessToken)};expires=${expires};path=/;SameSite=Lax`;
        if (data.user) {
          const userPayload = {
            role: data.user.role,
            status: data.user.status,
            verificationStatus: data.user.verificationStatus,
            onboardingCompleted: hasCompletedOnboarding(data.user),
            isBanned: Boolean(data.user.isBanned),
            isEmailVerified: Boolean(data.user.isEmailVerified),
            isProfileComplete: Boolean(data.user.isProfileComplete),
          };

          document.cookie = `${AUTH_CONFIG.USER_KEY}=${encodeURIComponent(JSON.stringify(userPayload))};expires=${expires};path=/;SameSite=Lax`;
        }
      }

      const dest = searchParams.get("redirect") || searchParams.get("callbackUrl") || "/admin/dashboard";
      router.push(dest);
    } catch (err: unknown) {
      const error = err as { message?: string };
      setError(error.message || "Login failed. Please check your credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F0F5FF]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-900 via-[#1a2654] to-gray-900 flex flex-col">
      {/* Header */}
      <header className="p-6">
        <Link href="/home" className="inline-flex items-center gap-2 text-white hover:opacity-80 transition">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>Back to Home</span>
        </Link>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          {/* Admin Badge */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-primary-500/20 rounded-full mb-4">
              <svg className="w-10 h-10 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Admin Portal</h1>
            <p className="text-gray-400">CareConnect Administration</p>
          </div>

          {/* Login Card */}
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <div className="flex justify-center mb-6">
              <Logo variant="default" showText href="/home" />
            </div>

            <h2 className="text-2xl font-semibold text-gray-900 text-center mb-2">
              Administrator Login
            </h2>
            <p className="text-gray-500 text-center mb-6">
              Access restricted to authorized personnel only
            </p>

            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                <svg className="w-5 h-5 text-red-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Admin Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                    </svg>
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 border border-[#E1E6EF] rounded-lg focus:ring-2 focus:ring-[#4461F2] focus:border-transparent transition"
                    placeholder="Enter admin email"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full pl-10 pr-12 py-3 border border-[#E1E6EF] rounded-lg focus:ring-2 focus:ring-[#4461F2] focus:border-transparent transition"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a9.956 9.956 0 012.293-3.95m3.324-2.394A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.542 7a9.965 9.965 0 01-4.293 5.307M15 12a3 3 0 11-6 0 3 3 0 016 0zm6 9L3 3" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 bg-primary-500 text-white font-semibold rounded-lg hover:bg-[#2F4BDB] focus:ring-4 focus:ring-[#4461F2]/50 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                    </svg>
                    <span>Sign In to Admin Panel</span>
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Contact system administrator for access</span>
              </div>
            </div>
          </div>

          {/* Security Notice */}
          <div className="mt-6 text-center">
            <p className="text-gray-400 text-sm">
              🔒 This is a secure admin portal. All activities are logged.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
