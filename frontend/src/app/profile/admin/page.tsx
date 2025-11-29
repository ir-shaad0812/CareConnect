"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { authService } from "@/modules/auth/services";

/**
 * /profile/admin — convenience redirect.
 * Sends authenticated admins to the admin dashboard;
 * unauthenticated visitors go to the admin login page.
 */
export default function AdminProfileRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    const user = authService.getCurrentUser();
    if (user?.role === "admin") {
      router.replace("/admin/dashboard");
    } else {
      router.replace("/admin/login");
    }
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F7FA]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#39B54A]" />
    </div>
  );
}

