"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { authService } from "@/modules/auth/services";

function mapReason(reason: string | null): string {
  if (reason === "role_mismatch") {
    return "This area is restricted to a different account role.";
  }
  if (reason === "rejected") {
    return "Your previous registration was rejected. Please start a new registration to re-apply.";
  }
  if (reason === "inactive") {
    return "Your account does not currently have active dashboard access.";
  }
  return "You are not authorized to access this page.";
}

export default function UnauthorizedPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reason = searchParams.get("reason");
  const [isSwitching, setIsSwitching] = useState(false);

  const handleStartNewRegistration = async () => {
    if (isSwitching) return;
    setIsSwitching(true);
    try {
      await authService.logout();
    } finally {
      router.replace("/register?reason=rejected");
      setIsSwitching(false);
    }
  };

  const handleSwitchAccount = async () => {
    if (isSwitching) return;
    setIsSwitching(true);
    try {
      await authService.logout();
    } finally {
      router.replace("/login");
      setIsSwitching(false);
    }
  };

  const shouldShowSwitchAccount =
    reason === "inactive" || reason === "role_mismatch" || reason === "rejected";

  return (
    <div className="min-h-screen bg-[#F5F7FA] flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-white border border-gray-200 rounded-2xl shadow-sm p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-3">Unauthorized Access</h1>
        <p className="text-gray-600 mb-6">{mapReason(reason)}</p>
        <div className="flex flex-wrap gap-3">
          {reason === "rejected" ? (
            <button
              type="button"
              onClick={() => {
                void handleStartNewRegistration();
              }}
              disabled={isSwitching}
              className="px-4 py-2.5 bg-[#39B54A] hover:bg-[#2d913c] disabled:opacity-60 text-white font-semibold rounded-xl transition"
            >
              {isSwitching ? "Preparing..." : "Start New Registration"}
            </button>
          ) : shouldShowSwitchAccount ? (
            <button
              type="button"
              onClick={() => {
                void handleSwitchAccount();
              }}
              disabled={isSwitching}
              className="px-4 py-2.5 bg-[#39B54A] hover:bg-[#2d913c] disabled:opacity-60 text-white font-semibold rounded-xl transition"
            >
              {isSwitching ? "Switching..." : "Sign Out and Use Another Account"}
            </button>
          ) : (
            <Link
              href="/login"
              className="px-4 py-2.5 bg-[#39B54A] hover:bg-[#2d913c] text-white font-semibold rounded-xl transition"
            >
              Go to Login
            </Link>
          )}
          <Link
            href="/dashboard"
            className="px-4 py-2.5 border border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold rounded-xl transition"
          >
            Go to Dashboard Entry
          </Link>
        </div>
      </div>
    </div>
  );
}
