"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  UploadCloud,
  Wifi,
  WifiOff,
} from "lucide-react";
import { authService } from "@/modules/auth/services/auth.service";
import { getPostAuthRoute } from "@/lib/auth-routing";
import { useSocketContext } from "@/context/SocketContext";
import type { User } from "@/types";

export default function PendingDashboardPage() {
  const router = useRouter();
  const { socket, isConnected } = useSocketContext();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastCheckedAt, setLastCheckedAt] = useState<Date | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refreshState = useCallback(
    async (silent = false) => {
      if (!silent) setIsRefreshing(true);
      try {
        const response = await authService.getMe();
        const fetchedUser = response.data?.user;
        if (!fetchedUser) {
          router.replace("/login?reason=session_required");
          return;
        }
        authService.updateStoredUser(fetchedUser);
        const target = getPostAuthRoute(fetchedUser);
        if (target !== "/dashboard/pending") {
          router.replace(target);
          return;
        }
        setUser(fetchedUser);
      } catch {
        router.replace("/login?reason=session_required");
      } finally {
        setLastCheckedAt(new Date());
        setIsLoading(false);
        if (!silent) setIsRefreshing(false);
      }
    },
    [router],
  );

  // Initial load
  useEffect(() => {
    void refreshState(true);
  }, [refreshState]);

  // Real-time socket events: admin approves / rejects / suspends
  useEffect(() => {
    if (!socket) return;

    const handleApproved = () => void refreshState(true);
    const handleRejected = () => void refreshState(true);
    const handleSuspended = () => void refreshState(true);
    const handleStatusChanged = () => void refreshState(true);

    socket.on("admin:user_approved", handleApproved);
    socket.on("admin:user_rejected", handleRejected);
    socket.on("admin:account_suspended", handleSuspended);
    socket.on("user:status_changed", handleStatusChanged);
    // Auth state machine events
    socket.on("account:approved", handleApproved);
    socket.on("account:rejected", handleRejected);

    return () => {
      socket.off("admin:user_approved", handleApproved);
      socket.off("admin:user_rejected", handleRejected);
      socket.off("admin:account_suspended", handleSuspended);
      socket.off("user:status_changed", handleStatusChanged);
      socket.off("account:approved", handleApproved);
      socket.off("account:rejected", handleRejected);
    };
  }, [socket, refreshState]);

  // Polling fallback — only when socket is disconnected
  useEffect(() => {
    if (isConnected) {
      // Socket is live — clear any existing poll
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      return;
    }

    // Socket down — fall back to 15s polling
    pollingRef.current = setInterval(() => void refreshState(true), 15_000);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [isConnected, refreshState]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F7FA]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#39B54A] mx-auto mb-3" />
          <p className="text-sm text-gray-600">Loading account state…</p>
        </div>
      </div>
    );
  }

  const isRejected = user.status === "rejected";
  const isUnderReview =
    user.status === "pending_approval" || user.verificationStatus === "UNDER_REVIEW";

  return (
    <div className="min-h-screen bg-[#F5F7FA] p-4 sm:p-8">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 bg-linear-to-r from-[#39B54A] to-primary-600 text-white flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold">Account Verification</h1>
            <p className="text-sm text-white/85 mt-1">
              Platform features unlock after admin approval.
            </p>
          </div>
          {/* Live / polling indicator */}
          <div className="flex items-center gap-1.5 text-xs text-white/80 mt-1">
            {isConnected ? (
              <>
                <Wifi className="w-3.5 h-3.5" />
                <span>Live updates</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5" />
                <span>Polling mode</span>
              </>
            )}
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Onboarding incomplete */}
          {!user.onboardingCompleted && (
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 flex items-start gap-3">
              <Clock className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-blue-900">Profile incomplete</p>
                <p className="text-sm text-blue-800 mt-1">
                  Complete your role, profile, and required documents to enter review.
                </p>
              </div>
            </div>
          )}

          {/* Under review */}
          {isUnderReview && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
              <Clock className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-amber-900">Under review</p>
                <p className="text-sm text-amber-800 mt-1">
                  Your submitted documents are being reviewed. You will be notified
                  automatically the moment a decision is made — no refresh needed.
                </p>
              </div>
            </div>
          )}

          {/* Rejected */}
          {isRejected && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-red-900">Verification rejected</p>
                <p className="text-sm text-red-800 mt-1">
                  {(user as unknown as { rejectionReason?: string }).rejectionReason ||
                    "Please correct your documents and re-submit."}
                </p>
              </div>
            </div>
          )}

          {/* Pending but all complete */}
          {!isRejected && !isUnderReview && user.onboardingCompleted && (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-gray-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-gray-900">Pending verification</p>
                <p className="text-sm text-gray-700 mt-1">
                  Waiting for the next admin moderation action on your account.
                </p>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="grid sm:grid-cols-2 gap-3">
            {!user.onboardingCompleted && (
              <Link
                href="/onboarding"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#39B54A] hover:bg-primary-600 text-white font-semibold py-3 px-4 transition"
              >
                <UploadCloud className="w-4 h-4" />
                Complete profile
              </Link>
            )}

            {isRejected && (
              <Link
                href="/onboarding?step=documents"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#39B54A] hover:bg-primary-600 text-white font-semibold py-3 px-4 transition"
              >
                <UploadCloud className="w-4 h-4" />
                Re-upload documents
              </Link>
            )}

            <button
              type="button"
              onClick={() => void refreshState()}
              className="rounded-xl border border-gray-300 text-gray-800 font-semibold py-3 px-4 hover:bg-gray-50 transition"
            >
              {isRefreshing ? "Refreshing…" : "Refresh Status"}
            </button>

            <button
              type="button"
              onClick={() =>
                void authService.logout().finally(() => router.replace("/login"))
              }
              className="rounded-xl border border-gray-300 text-gray-700 font-semibold py-3 px-4 hover:bg-gray-50 transition"
            >
              Sign Out
            </button>
          </div>

          {/* Status line */}
          <p className="text-xs text-gray-500">
            {isConnected
              ? "Real-time updates active — you will be redirected automatically upon approval."
              : `Polling every 15 seconds.${lastCheckedAt ? ` Last checked: ${lastCheckedAt.toLocaleTimeString("en-NP")}.` : ""}`}
          </p>
        </div>
      </div>
    </div>
  );
}
