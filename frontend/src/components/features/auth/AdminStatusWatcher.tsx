"use client";

// AdminStatusWatcher
// Listens for real-time admin actions (approve/reject/suspend) on the
// currently logged-in user's socket connection. When the backend emits one
// of these events, the user's session is refreshed and they are redirected
// to the correct destination based on their new status.
//
// Mount this inside the AuthProvider so useAuthContext() is available.

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSocket } from "@/hooks/useSocket";
import { useAuthContext } from "@/context/AuthContext";
import { authService } from "@/modules/auth/services/auth.service";
import { getUserRoute } from "@/lib/auth-routing";

export function AdminStatusWatcher() {
  const { user, setUser, clearAuth } = useAuthContext();
  const { on: socketOn } = useSocket();
  const router = useRouter();

  useEffect(() => {
    if (!user) return;

    // Admin approved this user — refresh session and redirect to dashboard
    socketOn("admin:user_approved", async () => {
      try {
        const res = await authService.getMe();
        const fresh = res.data?.user;
        if (fresh) {
          authService.updateStoredUser(fresh);
          setUser(fresh);
          router.replace(getUserRoute(fresh));
        }
      } catch {
        // If refresh fails, force re-login so they can get a clean token
        router.replace("/login?reason=approved");
      }
    });

    // Admin rejected this user — push to pending/rejected page
    socketOn("admin:user_rejected", () => {
      try {
        const updatedUser = { ...user, status: "rejected" as const };
        authService.updateStoredUser(updatedUser as any);
        setUser(updatedUser as any);
      } catch {
        // no-op
      }
      router.replace("/dashboard/pending");
    });

    // Admin suspended this user — force logout immediately
    socketOn("admin:account_suspended", () => {
      clearAuth();
      window.location.replace("/login?reason=suspended");
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?._id, socketOn]);

  return null;
}
