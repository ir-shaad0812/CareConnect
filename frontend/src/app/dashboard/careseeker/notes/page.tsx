"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import NotesPage from "@/components/features/notes/NotesPage";
import { useAuthContext } from "@/context/AuthContext";
import { authService } from "@/modules/auth/services";

export default function CareseekerNotesPage() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuthContext();

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    if (!user) {
      const cachedUser = authService.getCurrentUser();
      if (cachedUser?.role === "careseeker") {
        return;
      }

      router.replace("/login?redirect=/dashboard/careseeker/notes");
      return;
    }

    if (user.role !== "careseeker") {
      const fallbackRoute = authService.getDashboardPathForRole(user.role);
      router.replace(fallbackRoute ?? "/dashboard");
    }
  }, [isAuthLoading, router, user]);

  if (isAuthLoading || !user || user.role !== "careseeker") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F7FA]">
        <div className="w-8 h-8 border-3 border-[#4461F2] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <DashboardLayout user={user}>
      <NotesPage userRole="careseeker" />
    </DashboardLayout>
  );
}
