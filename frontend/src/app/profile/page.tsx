"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { authService } from "@/modules/auth/services";
import { extractStatusCode } from "@/types/errors.types";

export default function ProfileRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    const redirectByRole = (role: string | null | undefined) => {
      if (role === "caregiver") {
        router.replace("/profile/caregiver");
      } else if (role === "careseeker") {
        router.replace("/profile/careseeker");
      } else if (role === "admin") {
        router.replace("/admin/dashboard");
      } else {
        router.replace("/dashboard");
      }
    };

    const resolveProfileRoute = async () => {
      const cachedUser = authService.getCurrentUser();
      if (cachedUser) {
        redirectByRole(cachedUser.role);
        return;
      }

      try {
        const response = await authService.getMe();
        const fetchedUser = response.data?.user;
        if (!fetchedUser) {
          throw new Error("No user in session response");
        }

        authService.updateStoredUser(fetchedUser);
        if (!cancelled) {
          redirectByRole(fetchedUser.role);
        }
      } catch (error: unknown) {
        const statusCode = extractStatusCode(error);
        if (!cancelled && (statusCode === 401 || statusCode === 403)) {
          router.replace("/login?redirect=/profile/careseeker");
          return;
        }

        if (!cancelled) {
          router.replace("/login?redirect=/profile/careseeker");
        }
      }
    };

    void resolveProfileRoute();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="min-h-screen bg-[#F0F5FF] flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecting to your profile...</p>
      </div>
    </div>
  );
}

