"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Clock,
  CheckCircle2,
  FileText,
  Shield,
  Mail,
  LogOut,
  RefreshCw,
} from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { authService } from "@/modules/auth/services/auth.service";
import { getPostAuthRoute } from "@/lib/auth-routing";
import type { User } from "@/types";

// ---------------------------------------------------------------------------
// Status step definition
// ---------------------------------------------------------------------------

interface StatusStep {
  icon: React.ElementType;
  label: string;
  done: boolean;
  active?: boolean;
}

const STATUS_STEPS: StatusStep[] = [
  { icon: CheckCircle2, label: "Account Created", done: true },
  { icon: Mail, label: "Email Verified", done: true },
  { icon: FileText, label: "Profile Submitted", done: true },
  { icon: Shield, label: "Under Admin Review", done: false, active: true },
  { icon: CheckCircle2, label: "Account Approved", done: false },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function WaitingContent() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [checkMessage, setCheckMessage] = useState<string | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  // ── On mount: validate session ────────────────────────────────────────────
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await authService.getMe();
        const fetchedUser = response.data?.user;

        if (!fetchedUser) {
          router.replace("/login?reason=session_required");
          return;
        }

        const redirectTarget = getPostAuthRoute(fetchedUser);
        if (redirectTarget !== "/waiting") {
          router.replace(redirectTarget);
          return;
        }

        authService.updateStoredUser(fetchedUser);
        setUser(fetchedUser);
      } catch {
        const cached = authService.getCurrentUser();
        if (!cached) {
          router.replace("/login?reason=session_required");
          return;
        }
        const redirectTarget = getPostAuthRoute(cached);
        if (redirectTarget !== "/waiting") {
          router.replace(redirectTarget);
          return;
        }
        setUser(cached);
      } finally {
        setIsInitialLoading(false);
      }
    };

    void checkStatus();
  }, [router]);

  // ── Manual "Check Status" ─────────────────────────────────────────────────
  const handleCheckStatus = async () => {
    setIsChecking(true);
    setCheckMessage(null);

    try {
      const response = await authService.getMe();
      const fetchedUser = response.data?.user;

      if (!fetchedUser) {
        setCheckMessage("Could not refresh status. Please try again.");
        return;
      }

      authService.updateStoredUser(fetchedUser);

      const redirectTarget = getPostAuthRoute(fetchedUser);
      if (redirectTarget !== "/waiting") {
        router.replace(redirectTarget);
        return;
      }

      setUser(fetchedUser);
      setCheckMessage(
        "Your account is still under review. We will notify you by email once approved.",
      );
    } catch {
      setCheckMessage(
        "Unable to check status right now. Please try again later.",
      );
    } finally {
      setIsChecking(false);
    }
  };

  // ── Logout ────────────────────────────────────────────────────────────────
  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await authService.logout();
    } finally {
      router.replace("/login");
    }
  };

  // ── Initial loading state ─────────────────────────────────────────────────
  if (isInitialLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-emerald-50/30 flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full border-4 border-gray-200" />
            <div className="absolute inset-0 rounded-full border-4 border-[#39B54A] border-t-transparent animate-spin" />
          </div>
          <p className="text-gray-500 text-sm font-medium">
            Checking account status…
          </p>
        </div>
      </div>
    );
  }

  // ── Main render ───────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-emerald-50/30 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-[#39B54A]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-[#39B54A]/8 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-2xl">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Logo showText href="/home" />
        </div>

        {/* Main card */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="bg-white rounded-2xl shadow-xl overflow-hidden"
        >
          {/* ── Header banner ──────────────────────────────────────────── */}
          <div className="bg-gradient-to-r from-[#39B54A] to-[#2d913c] px-8 py-6 text-white">
            <div className="flex items-center gap-4">
              <motion.div
                className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center shrink-0"
                animate={{ scale: [1, 1.06, 1] }}
                transition={{
                  duration: 2.2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                <Clock className="w-7 h-7 text-white" />
              </motion.div>

              <div>
                <h1 className="text-xl font-bold leading-snug">
                  Your Account is Under Review
                </h1>
                <p className="text-white/85 text-sm mt-1">
                  Our team is verifying your
                  {user?.role === "caregiver" ? " caregiver profile and documents" : " profile"}.
                </p>
              </div>
            </div>
          </div>

          {/* ── Body ───────────────────────────────────────────────────── */}
          <div className="px-8 py-7">
            {/* Status steps */}
            <div className="mb-8">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">
                Application Status
              </h2>

              <div className="space-y-3">
                {STATUS_STEPS.map((s, i) => {
                  const Icon = s.icon;
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                          s.done
                            ? "bg-[#39B54A] text-white"
                            : s.active
                              ? "bg-amber-100 text-amber-600 border-2 border-amber-400"
                              : "bg-gray-100 text-gray-400"
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>

                      <span
                        className={`text-sm font-medium ${
                          s.done
                            ? "text-[#39B54A]"
                            : s.active
                              ? "text-amber-600"
                              : "text-gray-400"
                        }`}
                      >
                        {s.label}
                      </span>

                      {s.active && (
                        <motion.span
                          className="ml-1 text-xs text-amber-500 font-medium"
                          animate={{ opacity: [0.4, 1, 0.4] }}
                          transition={{ duration: 1.6, repeat: Infinity }}
                        >
                          In progress…
                        </motion.span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Info box */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
              <p className="text-sm text-blue-700 leading-relaxed">
                <span className="font-semibold">What happens next?</span> Our
                admin team reviews submitted profiles within{" "}
                <strong>1–3 business days</strong>.
                {user?.email && (
                  <>
                    {" "}
                    You (<span className="font-medium">{user.email}</span>)
                  </>
                )}{" "}
                will receive an email notification once your account is approved
                or if additional information is needed.
              </p>
            </div>

            {/* Check-status feedback */}
            {checkMessage && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-5 p-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-600 text-sm"
              >
                {checkMessage}
              </motion.div>
            )}

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => void handleCheckStatus()}
                disabled={isChecking}
                className="flex-1 py-2.5 bg-[#39B54A] hover:bg-[#2d913c] disabled:bg-gray-200 disabled:cursor-not-allowed text-white disabled:text-gray-400 rounded-xl font-semibold transition text-sm flex items-center justify-center gap-2"
              >
                <RefreshCw
                  className={`w-4 h-4 ${isChecking ? "animate-spin" : ""}`}
                />
                {isChecking ? "Checking…" : "Check Status"}
              </button>

              <button
                onClick={() => router.push("/home")}
                className="flex-1 py-2.5 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition text-sm"
              >
                Explore CareConnect
              </button>

              <button
                onClick={() => void handleLogout()}
                disabled={isLoggingOut}
                className="flex-1 py-2.5 bg-gray-100 text-gray-600 rounded-xl font-medium hover:bg-gray-200 disabled:opacity-50 transition text-sm flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                {isLoggingOut ? "Signing out…" : "Sign Out"}
              </button>
            </div>
          </div>
        </motion.div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 mt-6">
          Questions about your application?{" "}
          <a
            href="mailto:support@careconnect.com"
            className="text-[#39B54A] hover:underline font-medium"
          >
            Contact Support
          </a>
        </p>
      </div>
    </div>
  );
}
