"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { authService } from "@/modules/auth/services";
import { useAuthContext } from "@/context/AuthContext";
import CaregiverSidebar from "./CaregiverSidebar";
import CaregiverTopBar from "./CaregiverTopBar";

interface UserProfile {
  _id: string;
  fullName: string;
  email: string;
  avatar?: string;
  role: string;
}

interface CaregiverLayoutProps {
  children: React.ReactNode;
  /** Optional page title for screen readers / breadcrumbs */
  pageTitle?: string;
}

export default function CaregiverLayout({ children }: CaregiverLayoutProps) {
  const router = useRouter();
  const { user: authUser, isLoading: isAuthLoading } = useAuthContext();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const handleLogout = async () => {
    await authService.logout();
    router.push("/home");
  };

  if (isAuthLoading || !authUser || authUser.role !== "caregiver") {
    return (
      <div className="min-h-screen bg-[#FAFBFC] flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-14 h-14 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full border-[3px] border-gray-200" />
            <div className="absolute inset-0 rounded-full border-[3px] border-[#39B54A] border-t-transparent animate-spin" />
          </div>
          <p className="text-sm text-gray-500 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  const user = authUser as unknown as UserProfile;

  return (
    <div className="min-h-screen bg-[#FAFBFC]">
      {/* Sidebar */}
      <CaregiverSidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        user={user}
        onLogout={handleLogout}
      />

      {/* Main wrapper with left margin for sidebar */}
      <div
        className={`transition-all duration-300 ${
          sidebarCollapsed ? "ml-0 md:ml-18" : "ml-0 md:ml-65"
        }`}
      >
        {/* Top Bar */}
        <CaregiverTopBar user={user} />

        {/* Main Content */}
        <main>
          <div className="max-w-350 mx-auto px-6 py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
