"use client";

import { useState } from "react";
import Link from "next/link";
import { authService } from "@/modules/auth/services";
import { Logo } from "@/components/ui/Logo";
import { extractErrorMessage } from "@/types/errors.types";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [emailError, setEmailError] = useState("");

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError("");
    setMessage("");

    if (!email.trim()) {
      setEmailError("Email is required");
      return;
    }

    if (!validateEmail(email)) {
      setEmailError("Please enter a valid email address");
      return;
    }

    setIsLoading(true);

    try {
      const response = await authService.forgotPassword(email);
      if (response.success) {
        // Google account: show specific message (same generic success to avoid enumeration)
        if (response.data?.isGoogleAccount) {
          setStatus("success");
          setMessage("This account uses Google login. Please sign in with Google instead.");
        } else {
          setStatus("success");
          setMessage(response.data?.message || "If an account exists, a password reset link has been sent.");
        }
      } else {
        setStatus("error");
        setMessage("Failed to send reset email. Please try again.");
      }
    } catch (err: unknown) {
      setStatus("error");
      setMessage(extractErrorMessage(err, "An error occurred. Please try again."));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center p-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <svg className="absolute inset-0 w-full h-full opacity-[0.05]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="dots" x="0" y="0" width="30" height="30" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1.5" fill="#FFAF00" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dots)" />
        </svg>
      </div>

      <div className="bg-white rounded-3xl shadow-xl p-8 md:p-12 max-w-md w-full relative z-10">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <Logo variant="default" showText href="/home" />
        </div>

        {status === "success" ? (
          /* Success State */
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-6 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-3 font-hubot">Check Your Email</h2>
            <p className="text-gray-600 mb-6">{message}</p>
            <div className="bg-[#FFAF00]/10 border border-[#FFAF00]/30 rounded-xl p-4 mb-6">
              <p className="text-gray-700 text-sm">
                Didn&apos;t receive the email? Check your spam folder or try again.
              </p>
            </div>
            <div className="space-y-3">
              <Link
                href="/"
                className="inline-flex items-center justify-center gap-2 w-full py-3 bg-[#FFAF00] text-gray-900 rounded-xl font-semibold text-sm hover:bg-[#E09900] transition-all"
              >
                Back to Login
              </Link>
              <button
                onClick={() => {
                  setStatus("idle");
                  setEmail("");
                }}
                className="w-full py-3 border border-gray-200 text-gray-700 rounded-xl font-semibold text-sm hover:bg-gray-50 transition-all"
              >
                Send Again
              </button>
            </div>
          </div>
        ) : (
          /* Form State */
          <>
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-gray-800 mb-2 font-hubot">Forgot Password?</h1>
              <p className="text-gray-500 text-sm">
                No worries! Enter your email and we&apos;ll send you reset instructions.
              </p>
            </div>

            {/* Error Message */}
            {status === "error" && message && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm flex items-center gap-2">
                <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {message}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setEmailError("");
                      setStatus("idle");
                    }}
                    placeholder="Enter your email"
                    className={`w-full pl-12 pr-4 py-3 rounded-xl border ${
                      emailError ? 'border-red-400 bg-red-50' : 'border-gray-200'
                    } focus:border-[#FFAF00] focus:ring-2 focus:ring-[#FFAF00]/20 outline-none transition-all text-sm bg-white text-gray-900 placeholder:text-gray-400`}
                  />
                </div>
                {emailError && (
                  <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {emailError}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 bg-[#FFAF00] text-gray-900 rounded-xl font-semibold text-sm hover:bg-[#E09900] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Sending...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Send Reset Link
                  </>
                )}
              </button>
            </form>

            <div className="text-center mt-6">
              <Link 
                href="/" 
                className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Login
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

