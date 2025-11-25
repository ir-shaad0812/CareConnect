"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Clock, Shield, CheckCircle2 } from "lucide-react";
import { OnboardingWizard } from "@/components/features/onboarding/OnboardingWizard";
import { authService } from "@/modules/auth/services/auth.service";
import { getPostAuthRoute, hasCompletedOnboarding } from "@/lib/auth-routing";
import { extractStatusCode } from "@/types/errors.types";
import type { User } from "@/types";

type OnboardingMode = "loading" | "wizard" | "pending";

function shouldUseOnboardingWizard(user: User): boolean {
  if (user.role === "admin") {
    return false;
  }

  if (user.verificationStatus === "REJECTED") {
    return true;
  }

  if (!hasCompletedOnboarding(user)) {
    return true;
  }

  if (!user.role) {
    return true;
  }

  if (user.authProvider === "google" && authService.needsOAuthOnboarding(user)) {
    return true;
  }

  return false;
}

function LoadingState() {
  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 via-white to-emerald-50/30 flex items-center justify-center p-4">
      <div className="text-center">
        <div className="relative w-16 h-16 mx-auto mb-4">
          <div className="absolute inset-0 rounded-full border-4 border-gray-200" />
          <div className="absolute inset-0 rounded-full border-4 border-[#39B54A] border-t-transparent animate-spin" />
        </div>
        <p className="text-gray-600 font-medium">Preparing your onboarding...</p>
      </div>
    </div>
  );
}

function PendingView({ email }: { email: string | null }) {
  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 via-white to-emerald-50/30 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
        <div className="bg-linear-to-r from-[#39B54A] to-primary-600 px-8 py-6 text-white">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center">
              <Clock className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Your account is under verification</h1>
              <p className="text-white/85 text-sm mt-1">
                Registration is complete. Access is enabled only after admin
                approval.
              </p>
            </div>
          </div>
        </div>

        <div className="px-8 py-7 space-y-6">
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm text-gray-700">
              <CheckCircle2 className="w-4 h-4 text-[#39B54A]" />
              Registration submitted
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-700">
              <CheckCircle2 className="w-4 h-4 text-[#39B54A]" />
              Documents and location received
            </div>
            <div className="flex items-center gap-3 text-sm text-amber-700">
              <Shield className="w-4 h-4 text-amber-500" />
              Waiting for admin approval
            </div>
          </div>

          <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">
            {email ? (
              <p>
                We will notify <strong>{email}</strong> once your account is
                approved.
              </p>
            ) : (
              <p>We will notify you once your account is approved.</p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/login"
              className="flex-1 text-center px-4 py-3 rounded-xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
            >
              Go to Login
            </Link>
            <Link
              href="/register"
              className="flex-1 text-center px-4 py-3 rounded-xl bg-[#39B54A] text-white font-semibold hover:bg-primary-600 transition-colors"
            >
              Submit New Registration
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = useMemo(() => searchParams.get("email"), [searchParams]);
  const allowPendingWithoutSession =
    useMemo(() => searchParams.get("state") === "pending", [searchParams]);

  const [mode, setMode] = useState<OnboardingMode>("loading");

  useEffect(() => {
    let mounted = true;

    const resolveMode = async () => {
      try {
        const response = await authService.getMeWithRefresh();
        const user = response.data?.user;

        if (!user) {
          throw new Error("Authenticated session did not return user payload");
        }

        authService.updateStoredUser(user);

        if (!mounted) return;

        if (shouldUseOnboardingWizard(user)) {
          setMode("wizard");
          return;
        }

        const target = getPostAuthRoute(user);
        if (target !== "/onboarding") {
          router.replace(target);
          return;
        }

        setMode("pending");
      } catch (error: unknown) {
        if (!mounted) return;

        const statusCode = extractStatusCode(error);
        if (statusCode === 401 || statusCode === 403) {
          authService.clearAuthData();
          if (!allowPendingWithoutSession) {
            router.replace("/login?reason=session_required");
            return;
          }
        }

        const cachedUser = authService.getCurrentUser();
        if (cachedUser) {
          if (shouldUseOnboardingWizard(cachedUser)) {
            setMode("wizard");
            return;
          }

          const fallbackTarget = getPostAuthRoute(cachedUser);
          if (fallbackTarget !== "/onboarding") {
            router.replace(fallbackTarget);
            return;
          }
        }

        setMode("pending");
      }
    };

    void resolveMode();

    return () => {
      mounted = false;
    };
  }, [allowPendingWithoutSession, router]);

  if (mode === "loading") {
    return <LoadingState />;
  }

  if (mode === "wizard") {
    return <OnboardingWizard />;
  }

  return <PendingView email={email} />;
}
