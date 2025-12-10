"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { authService } from "@/modules/auth/services";
import { getPostAuthRoute } from "@/lib/auth-routing";
import { Navbar } from "@/components";
import { Logo } from "@/components/ui/Logo";

type VerifyStatus = "verifying" | "success" | "pending_approval" | "error";

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<VerifyStatus>("verifying");
  const [message, setMessage] = useState("");
  const [countdown, setCountdown] = useState(5);
  const [redirectPath, setRedirectPath] = useState("/onboarding");

  // Guard against React StrictMode double-invocation in development
  const hasVerified = useRef(false);

  useEffect(() => {
    // Prevent duplicate API calls (React StrictMode runs effects twice in dev)
    if (hasVerified.current) return;
    hasVerified.current = true;

    const verifyEmail = async () => {
      if (!token) {
        setStatus("error");
        setMessage(
          "Verification token is missing. Please check your email link.",
        );
        return;
      }

      try {
        const response = await authService.verifyEmail(token);
        const data = response.data as {
          requiresApproval?: boolean;
          requiresOnboarding?: boolean;
          message?: string;
        };

        let resolvedRedirectPath = "/login?verified=true";
        try {
          const meResponse = await authService.getMe();
          const user = meResponse.data?.user;
          if (user) {
            authService.updateStoredUser(user);
            resolvedRedirectPath = getPostAuthRoute(user);
          }
        } catch {
          // Keep login fallback when no authenticated session is available.
        }

        setRedirectPath(resolvedRedirectPath);

        if (response.success) {
          if (data?.requiresApproval) {
            // Caregiver - email verified but needs admin approval before accessing platform
            setStatus("pending_approval");
            setMessage(
              data.message ||
                "Your email has been verified. Your account is pending administrator approval.",
            );
          } else {
            setStatus("success");
            setMessage(
              data?.message ||
                response.message ||
                "Your email has been verified successfully!",
            );
          }
        } else {
          setStatus("error");
          setMessage(
            response.message || "Email verification failed. Please try again.",
          );
        }
      } catch (error: unknown) {
        const err = error as {
          message?: string;
          response?: { data?: { message?: string } };
        };
        const errMsg =
          err?.response?.data?.message ||
          err?.message ||
          "An error occurred during verification.";

        // "already been used" means the user clicked the link a second time -
        // their account IS verified, so treat it as success.
        if (
          errMsg.toLowerCase().includes("already been used") ||
          errMsg.toLowerCase().includes("already verified")
        ) {
          setStatus("success");
          setMessage("Your email is already verified. You can log in now.");

          try {
            const meResponse = await authService.getMe();
            const user = meResponse.data?.user;
            if (user) {
              authService.updateStoredUser(user);
              setRedirectPath(getPostAuthRoute(user));
            }
          } catch {
            setRedirectPath("/login?verified=true");
          }
        } else {
          setStatus("error");
          setMessage(errMsg);
        }
      }
    };

    verifyEmail();
  }, [token]);

  // Countdown redirect after successful verification
  useEffect(() => {
    if (status !== "success" && status !== "pending_approval") return;
    if (countdown <= 0) {
      router.push(redirectPath);
      return;
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [status, countdown, redirectPath, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F0F5FF] via-white to-[#F8F5FF] flex flex-col">
      {/* Navbar */}
      <Navbar />

      {/* Verification Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12 max-w-md w-full text-center">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <Logo variant="default" showText href="/home" priority />
          </div>

          {/* Status Icon */}
          {status === "verifying" && (
            <div className="mb-6">
              <div className="w-20 h-20 mx-auto bg-blue-100 rounded-full flex items-center justify-center">
                <svg
                  className="animate-spin w-10 h-10 text-blue-600"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              </div>
            </div>
          )}

          {status === "success" && (
            <div className="mb-6">
              <div className="w-20 h-20 mx-auto bg-green-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-10 h-10 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            </div>
          )}

          {/* Pending approval icon */}
          {status === "pending_approval" && (
            <div className="mb-6">
              <div className="w-20 h-20 mx-auto bg-amber-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-10 h-10 text-amber-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>
          )}

          {status === "error" && (
            <div className="mb-6">
              <div className="w-20 h-20 mx-auto bg-red-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-10 h-10 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
            </div>
          )}

          {/* Title */}
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
            {status === "verifying" && "Verifying Your Email"}
            {status === "success" && "Email Verified!"}
            {status === "pending_approval" && "Email Verified!"}
            {status === "error" && "Verification Failed"}
          </h1>

          {/* Badge for pending approval */}
          {status === "pending_approval" && (
            <div className="mb-4">
              <span className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-700 text-xs font-semibold px-3 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                Pending Administrator Approval
              </span>
            </div>
          )}

          {/* Message */}
          <p className="text-gray-600 mb-6">
            {status === "verifying" &&
              "Please wait while we verify your email address..."}
            {status === "success" && message}
            {status === "pending_approval" && message}
            {status === "error" && message}
          </p>

          {/* Pending approval - detailed trust-building card */}
          {status === "pending_approval" && (
            <div className="mb-6 bg-gradient-to-br from-slate-50 to-blue-50 border border-slate-200/80 rounded-2xl p-5 text-left">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#39B54A]/10 flex items-center justify-center shrink-0 mt-0.5">
                  <svg
                    className="w-5 h-5 text-[#39B54A]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-gray-800 text-sm mb-1">
                    Your account has been successfully verified.
                  </p>
                  <p className="text-gray-500 text-xs leading-relaxed">
                    It is currently pending administrator approval. Our team
                    reviews all caregiver profiles to maintain a safe and
                    trusted environment for families. You will receive an email
                    notification once the review process is complete.
                  </p>
                </div>
              </div>

              {/* Status timeline */}
              <div className="mt-4 flex items-center justify-between px-1">
                <StatusStep label="Registered" done />
                <div className="flex-1 h-0.5 bg-[#39B54A] mx-1" />
                <StatusStep label="Email Verified" done />
                <div className="flex-1 h-0.5 bg-amber-300 mx-1" />
                <StatusStep label="Under Review" active />
                <div className="flex-1 h-0.5 bg-gray-200 mx-1" />
                <StatusStep label="Active" />
              </div>

              <p className="text-center text-xs text-gray-400 mt-3">
                Typically reviewed within 1-2 business days.
              </p>
            </div>
          )}

          {/* Actions */}
          {status === "success" && (
            <div className="space-y-3">
              <p className="text-sm text-gray-500 mb-4">
                Redirecting in {countdown} second
                {countdown !== 1 ? "s" : ""}...
              </p>
              <Link
                href={redirectPath}
                className="inline-block w-full py-3 bg-[#FFAF00] text-gray-900 rounded-xl font-semibold hover:bg-[#e09e00] transition-all text-center"
              >
                {redirectPath.startsWith("/login")
                  ? "Go to Login Now"
                  : "Continue to Next Step"}
              </Link>
            </div>
          )}

          {status === "pending_approval" && (
            <div className="space-y-3">
              <p className="text-sm text-gray-500 mb-1">
                Redirecting in {countdown} second{countdown !== 1 ? "s" : ""}...
              </p>
              <Link
                href={redirectPath}
                className="inline-block w-full py-3 bg-[#39B54A] text-white rounded-xl font-semibold hover:bg-[#2d913c] transition-all text-center"
              >
                {redirectPath.startsWith("/login")
                  ? "Back to Login"
                  : "Continue to Next Step"}
              </Link>
            </div>
          )}

          {status === "error" && (
            <div className="space-y-3">
              <Link
                href="/login"
                className="inline-block w-full py-3 bg-[#FFAF00] text-gray-900 rounded-xl font-semibold hover:bg-[#e09e00] transition-all"
              >
                Go to Login
              </Link>
              <Link
                href="/register"
                className="inline-block w-full py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all"
              >
                Register Again
              </Link>
            </div>
          )}

          {status === "verifying" && (
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
              <div className="animate-pulse">?</div>
              <div className="animate-pulse delay-100">?</div>
              <div className="animate-pulse delay-200">?</div>
            </div>
          )}
        </div>
      </div>

      {/* Footer Info */}
      <div className="py-6 text-center text-sm text-gray-500">
        <p>
          Need help?{" "}
          <Link href="/help" className="text-[#1a73e8] hover:underline">
            Contact Support
          </Link>
        </p>
      </div>
    </div>
  );
}

// -- Status step component -----------------------------------------------------
function StatusStep({
  label,
  done = false,
  active = false,
}: {
  label: string;
  done?: boolean;
  active?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`w-5 h-5 rounded-full flex items-center justify-center
          ${done ? "bg-[#39B54A]" : active ? "bg-amber-400" : "bg-gray-100"}`}
      >
        {done ? (
          <svg
            className="w-3 h-3 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={3}
              d="M5 13l4 4L19 7"
            />
          </svg>
        ) : active ? (
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
        ) : (
          <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
        )}
      </div>
      <span
        className={`text-[9px] font-medium whitespace-nowrap ${done ? "text-[#39B54A]" : active ? "text-amber-500" : "text-gray-400"}`}
      >
        {label}
      </span>
    </div>
  );
}
