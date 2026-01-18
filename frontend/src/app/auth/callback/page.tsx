"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { authService } from "@/modules/auth/services/auth.service";
import { getPostAuthRoute } from "@/lib/auth-routing";
import { Logo } from "@/components/ui/Logo";

type Phase = "resolving" | "redirecting" | "error";

const PHASE_MESSAGES: Record<Phase, string> = {
  resolving: "Completing sign-in…",
  redirecting: "Redirecting you now…",
  error: "Something went wrong. Redirecting to login…",
};

function Spinner({ label }: { label: string }) {
  return (
    <div className="text-center">
      <div className="relative w-16 h-16 mx-auto mb-5">
        <div className="absolute inset-0 rounded-full border-4 border-gray-200" />
        <motion.div
          className="absolute inset-0 rounded-full border-4 border-[#39B54A] border-t-transparent"
          animate={{ rotate: 360 }}
          transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
        />
      </div>
      <p className="text-sm font-medium text-gray-600">{label}</p>
    </div>
  );
}

function ErrorIcon() {
  return (
    <div className="text-center">
      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-5">
        <svg
          className="w-8 h-8 text-red-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
          />
        </svg>
      </div>
      <p className="text-sm font-medium text-gray-600">
        {PHASE_MESSAGES.error}
      </p>
    </div>
  );
}

export default function AuthCallbackPage() {
  const router = useRouter();
  const hasFired = useRef(false);
  const [phase, setPhase] = useState<Phase>("resolving");

  useEffect(() => {
    // Strict-mode guard — only run once
    if (hasFired.current) return;
    hasFired.current = true;

    const resolve = async () => {
      // Small delay so the httpOnly cookie from the OAuth redirect has
      // fully propagated to the browser's cookie jar before we fetch /me.
      await new Promise((r) => setTimeout(r, 300));

      try {
        const response = await authService.getMe();
        const user = response.data?.user;

        if (!user) {
          setPhase("error");
          setTimeout(() => router.replace("/login?reason=oauth_failed"), 2000);
          return;
        }

        // Persist user to localStorage + careconnect_user cookie so
        // the Edge middleware can read role/status immediately.
        authService.updateStoredUser(user);

        setPhase("redirecting");

        router.replace(getPostAuthRoute(user));
      } catch {
        setPhase("error");
        setTimeout(() => router.replace("/login?reason=oauth_failed"), 2500);
      }
    };

    void resolve();
  }, [router]);

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 via-white to-emerald-50/30 flex flex-col items-center justify-center p-4">
      {/* Decorative blobs */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#39B54A]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-[#39B54A]/8 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="relative bg-white border border-gray-100 rounded-2xl shadow-xl px-10 py-12 w-full max-w-sm text-center"
      >
        {/* Logo */}
        <div className="flex items-center justify-center mb-8">
          <Logo variant="default" showText asLink={false} />
        </div>

        {/* Phase content */}
        <AnimatedPhase phase={phase} />
      </motion.div>
    </div>
  );
}

function AnimatedPhase({ phase }: { phase: Phase }) {
  return (
    <motion.div
      key={phase}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.25 }}
    >
      {phase === "error" ? (
        <ErrorIcon />
      ) : (
        <Spinner label={PHASE_MESSAGES[phase]} />
      )}

      {phase === "resolving" && (
        <p className="text-xs text-gray-400 mt-3 leading-relaxed">
          Securely completing your Google sign-in.
          <br />
          This only takes a moment.
        </p>
      )}
    </motion.div>
  );
}
