"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Logo } from "@/components/ui/Logo";
import { motion, AnimatePresence } from "framer-motion";
import { authService } from "@/modules/auth/services";
import { getPostAuthRoute } from "@/lib/auth-routing";
import {
  isPendingApprovalError,
  isGoogleLoginOnlyError,
  isRejectedAccountError,
  extractErrorMessage,
} from "@/types/errors.types";

const GOOGLE_ONLY_CACHE_KEY = "careconnect_google_only_accounts";

function getGoogleOnlyEmails(): string[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = localStorage.getItem(GOOGLE_ONLY_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function rememberGoogleOnlyEmail(email: string): void {
  if (typeof window === "undefined") return;
  const normalized = email.trim().toLowerCase();
  if (!normalized) return;

  const existing = getGoogleOnlyEmails();
  if (existing.includes(normalized)) return;

  localStorage.setItem(GOOGLE_ONLY_CACHE_KEY, JSON.stringify([...existing, normalized]));
}

function resolveSafeInternalRedirect(path: string | null): string | null {
  if (!path) return null;
  if (!path.startsWith("/")) return null;
  if (path.startsWith("//")) return null;
  if (path.startsWith("/login") || path.startsWith("/admin/login")) return null;

  try {
    const parsed = new URL(path, "http://localhost");
    if (
      parsed.searchParams.has("redirect") &&
      (
        parsed.pathname.startsWith("/dashboard") ||
        (parsed.pathname.startsWith("/admin") && parsed.pathname !== "/admin/login")
      )
    ) {
      parsed.searchParams.delete("redirect");
    }

    const normalizedQuery = parsed.searchParams.toString();
    return `${parsed.pathname}${normalizedQuery ? `?${normalizedQuery}` : ""}`;
  } catch {
    return path;
  }
}

// Service cards data with green theme
const serviceCards = [
  { icon: "elderly", label: "Elder Care", bg: "bg-emerald-50", color: "text-emerald-600" },
  { icon: "child", label: "Child Care", bg: "bg-teal-50", color: "text-teal-600" },
  { icon: "special", label: "Special Needs", bg: "bg-green-50", color: "text-green-600" },
  { icon: "personal", label: "Personal Care", bg: "bg-lime-50", color: "text-lime-600" },
];

const getServiceIcon = (type: string) => {
  switch (type) {
    case "elderly":
      return <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>;
    case "child":
      return <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M13 2v8h8c0-4.42-3.58-8-8-8zm-2 0c-4.42 0-8 3.58-8 8h8V2zm2 18v-8h8c0 4.42-3.58 8-8 8zm-2 0c-4.42 0-8-3.58-8-8h8v8z"/></svg>;
    case "special":
      return <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>;
    case "personal":
      return <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/></svg>;
    default:
      return null;
  }
};

// Animation variants
const floatVariants = {
  animate: {
    y: [0, -8, 0],
    transition: {
      duration: 3,
      repeat: Infinity,
      ease: "easeInOut"
    }
  }
};

const LoginForm = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionMessage, setSessionMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showApprovalPopup, setShowApprovalPopup] = useState(false);
  const [verifiedBanner, setVerifiedBanner] = useState(false);
  
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [formErrors, setFormErrors] = useState({
    email: "",
    password: "",
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const sessionExpired = searchParams.get('session') === 'expired';
      const redirectPath = searchParams.get('redirect');
      const safeRedirectPath = resolveSafeInternalRedirect(redirectPath);
      if (sessionExpired) {
        setSessionMessage('Your session has expired. Please log in again.');
        sessionStorage.removeItem('auth_redirect_reason');
      } else if (
        redirectPath &&
        ['/browse', '/search', '/caregivers', '/caregiver'].some((prefix) =>
          redirectPath.startsWith(prefix),
        )
      ) {
        setSessionMessage(
          'Please sign in or create an account to unlock this premium feature.',
        );
      }
      if (safeRedirectPath) {
        sessionStorage.setItem('auth_return_url', safeRedirectPath);
      }
      // Show a banner when redirected from successful email verification
      if (searchParams.get('verified') === 'true') {
        setVerifiedBanner(true);
      }
      // Preserve callbackUrl so it survives the login redirect
      const callbackUrl = searchParams.get('callbackUrl');
      const safeCallbackUrl = resolveSafeInternalRedirect(callbackUrl);
      if (safeCallbackUrl) {
        sessionStorage.setItem('auth_return_url', safeCallbackUrl);
      }
      // Pre-fill email when redirected from register with an existing account
      const emailParam = searchParams.get('email');
      if (emailParam) {
        setFormData(prev => ({ ...prev, email: decodeURIComponent(emailParam) }));
      }
    }
  }, [searchParams]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError(null);
    if (formErrors[name as keyof typeof formErrors]) {
      setFormErrors(prev => ({ ...prev, [name]: "" }));
    }
  };

  const validateForm = () => {
    const errors = { email: "", password: "" };
    let isValid = true;

    if (!formData.email.trim()) {
      errors.email = "Email is required";
      isValid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = "Please enter a valid email";
      isValid = false;
    }

    if (!formData.password) {
      errors.password = "Password is required";
      isValid = false;
    }

    setFormErrors(errors);
    return isValid;
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const normalizedEmail = formData.email.trim().toLowerCase();
    if (getGoogleOnlyEmails().includes(normalizedEmail)) {
      setError("This account uses Google login. Please continue with Google.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await authService.login({
        email: formData.email,
        password: formData.password,
      });

      if (response.success) {
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('auth_redirect_reason');
          const returnUrl = sessionStorage.getItem('auth_return_url');
          sessionStorage.removeItem('auth_return_url');
          const redirectParam = resolveSafeInternalRedirect(searchParams.get('redirect'));
          const loggedInUser = response.data?.user || authService.getCurrentUser();
          const defaultDest = loggedInUser
            ? getPostAuthRoute(loggedInUser)
            : "/dashboard";

          router.push(returnUrl || redirectParam || defaultDest);
        } else {
          router.push("/login");
        }
      } else {
        setError(response.message || "Login failed. Please try again.");
      }
    } catch (err: unknown) {
      const errCode = typeof err === 'object' && err !== null && 'code' in err
        ? (err as { code?: string }).code
        : undefined;

      if (errCode === 'PENDING_APPROVAL' || isPendingApprovalError(err)) {
        router.push("/dashboard/pending");
      } else if (errCode === 'ACCOUNT_REJECTED' || isRejectedAccountError(err)) {
        router.push("/dashboard/pending");
      } else if (errCode === 'ONBOARDING_REQUIRED') {
        setError("Your account setup is incomplete. Please complete onboarding or contact support.");
      } else if (isGoogleLoginOnlyError(err)) {
        rememberGoogleOnlyEmail(normalizedEmail);
        setError("This account uses Google login. Please use the Google sign-in button.");
      } else {
        setError(extractErrorMessage(err, "An error occurred. Please try again."));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    authService.initiateGoogleLogin();
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 via-white to-emerald-50/30 flex items-center justify-center p-4 relative overflow-hidden">

      {/* -- Pending Admin Approval Popup ------------------------------------ */}
      <AnimatePresence>
        {showApprovalPopup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowApprovalPopup(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 16 }}
              transition={{ type: "spring", stiffness: 300, damping: 28 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl shadow-2xl shadow-gray-300/50 w-full max-w-md p-8 border border-gray-100"
            >
              {/* Clock icon */}
              <div className="flex justify-center mb-5">
                <div className="w-20 h-20 rounded-full bg-amber-50 border-4 border-amber-100 flex items-center justify-center">
                  <svg className="w-9 h-9 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>

              <div className="text-center mb-5">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Account Under Review</h2>
                <span className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-700 text-xs font-semibold px-3 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  Pending Administrator Approval
                </span>
              </div>

              {/* Trust-building message */}
              <div className="bg-gradient-to-br from-slate-50 to-blue-50 border border-slate-200/70 rounded-2xl p-5 mb-5">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#39B54A]/10 flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-[#39B54A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800 text-sm mb-1">
                      Your account has been successfully verified.
                    </p>
                    <p className="text-gray-500 text-xs leading-relaxed">
                      It is currently pending administrator approval. Our team carefully reviews all
                      caregiver profiles to ensure the safety and trust of every family on our platform.
                      You will receive an email notification once the review process is complete.
                    </p>
                  </div>
                </div>
              </div>

              {/* Status steps */}
              <div className="flex items-center justify-between px-2 mb-5">
                <PopupStep label="Registered" done />
                <div className="flex-1 h-0.5 bg-[#39B54A] mx-1" />
                <PopupStep label="Email Verified" done />
                <div className="flex-1 h-0.5 bg-amber-300 mx-1" />
                <PopupStep label="Under Review" active />
                <div className="flex-1 h-0.5 bg-gray-200 mx-1" />
                <PopupStep label="Active" />
              </div>

              <p className="text-center text-xs text-gray-400 mb-5">
                Typically reviewed within 1-2 business days.
              </p>

              <button
                onClick={() => setShowApprovalPopup(false)}
                className="w-full py-3 bg-[#39B54A] hover:bg-[#2d913c] text-white font-semibold rounded-xl transition"
              >
                I Understand
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Premium Background Effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-linear-to-br from-[#39B54A]/8 to-transparent rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-linear-to-tl from-[#39B54A]/10 to-transparent rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
        <div className="absolute top-1/2 left-1/2 w-[400px] h-[400px] bg-linear-to-br from-emerald-100/20 to-teal-100/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      </div>

      {/* Floating Stat Cards - Desktop Only */}
      {mounted && (
        <div className="absolute inset-0 pointer-events-none hidden lg:block">
          {/* Left: Verified Caregivers stat */}
          <motion.div
            className="absolute top-[18%] left-[4%] bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-100 p-3 flex items-center gap-3 min-w-[160px]"
            variants={floatVariants}
            animate="animate"
          >
            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-[#39B54A]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-900">500+ Caregivers</p>
              <p className="text-[10px] text-gray-500">Verified & Background Checked</p>
            </div>
          </motion.div>

          {/* Left: Rating stat */}
          <motion.div
            className="absolute top-[60%] left-[5%] bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-100 p-3 flex items-center gap-3"
            variants={floatVariants}
            animate="animate"
            style={{ animationDelay: "0.5s" }}
          >
            <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-amber-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-900">4.9 / 5.0</p>
              <p className="text-[10px] text-gray-500">Average Rating</p>
            </div>
          </motion.div>

          {/* Right: Happy Families stat */}
          <motion.div
            className="absolute top-[15%] right-[4%] bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-100 p-3 flex items-center gap-3 min-w-[155px]"
            variants={floatVariants}
            animate="animate"
            style={{ animationDelay: "1s" }}
          >
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-900">10,000+ Families</p>
              <p className="text-[10px] text-gray-500">Trust CareConnect</p>
            </div>
          </motion.div>

          {/* Right: Secure Payments */}
          <motion.div
            className="absolute top-[62%] right-[4%] bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-100 p-3 flex items-center gap-3"
            variants={floatVariants}
            animate="animate"
            style={{ animationDelay: "1.5s" }}
          >
            <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-900">Secure Payments</p>
              <p className="text-[10px] text-gray-500">Khalti & Stripe</p>
            </div>
          </motion.div>
        </div>
      )}

      {/* Main Card */}
      <motion.div 
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="bg-white rounded-3xl shadow-2xl shadow-gray-200/50 flex flex-col lg:flex-row w-full max-w-[1040px] min-h-[620px] overflow-hidden z-10 border border-gray-100/50"
      >
        
        {/* Left Panel - Premium Green Gradient */}
        <div className="w-full lg:w-[44%] bg-linear-to-br from-[#39B54A] via-[#2d913c] to-[#247a32] p-6 lg:p-8 flex flex-col relative overflow-hidden">
          {/* Premium pattern overlay */}
          <div className="absolute inset-0 opacity-[0.07]">
            <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="premium-grid" patternUnits="userSpaceOnUse" width="40" height="40">
                  <circle cx="20" cy="20" r="1" fill="white"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#premium-grid)" />
            </svg>
          </div>

          {/* Gradient glow effects */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full blur-2xl" />

          {/* Logo */}
          <div className="relative z-10 mb-6">
            <Logo
              variant="white"
              showText
              href="/home"
            />
          </div>

          {/* Image Gallery */}
          <div className="flex-1 flex flex-col items-center justify-center relative z-10 py-4 px-2 lg:py-6 lg:px-4">
            <div className="w-full max-w-[360px]">
              <div className="grid grid-cols-2 gap-3">
                <motion.div
                  className="group relative h-[190px] sm:h-[220px] rounded-2xl overflow-hidden shadow-2xl shadow-black/20 ring-2 ring-white/20"
                  initial={{ opacity: 0, x: -20, rotate: -3 }}
                  animate={{ opacity: 1, x: 0, rotate: -1 }}
                  transition={{ delay: 0.3, duration: 0.5 }}
                  whileHover={{ scale: 1.03, rotate: 0, zIndex: 20 }}
                >
                  <Image
                    src="/login/Register/h11.png"
                    alt="Professional caregiver"
                    fill
                    sizes="(max-width: 640px) 44vw, 170px"
                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                    unoptimized
                  />
                  <div className="absolute inset-0 bg-linear-to-t from-black/50 via-transparent to-transparent" />
                  <div className="absolute bottom-2 left-2 right-2">
                    <p className="text-white text-[10px] font-semibold">Trusted Care</p>
                  </div>
                </motion.div>

                <motion.div
                  className="group relative h-[190px] sm:h-[220px] rounded-2xl overflow-hidden shadow-2xl shadow-black/20 ring-2 ring-white/20"
                  initial={{ opacity: 0, x: 20, rotate: 3 }}
                  animate={{ opacity: 1, x: 0, rotate: 1 }}
                  transition={{ delay: 0.4, duration: 0.5 }}
                  whileHover={{ scale: 1.03, rotate: 0, zIndex: 20 }}
                >
                  <Image
                    src="/login/Register/Happy_faces.png"
                    alt="Happy families"
                    fill
                    sizes="(max-width: 640px) 44vw, 170px"
                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                    unoptimized
                  />
                  <div className="absolute inset-0 bg-linear-to-t from-black/50 via-transparent to-transparent" />
                  <div className="absolute bottom-2 left-2 right-2">
                    <p className="text-white text-[10px] font-semibold">Community</p>
                  </div>
                </motion.div>

                <motion.div
                  className="group col-span-2 relative h-[130px] sm:h-[150px] rounded-xl overflow-hidden shadow-2xl shadow-black/25 ring-2 ring-white/30"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5, duration: 0.5 }}
                  whileHover={{ scale: 1.01 }}
                >
                  <Image
                    src="/home-page/map-high.png"
                    alt="Find caregivers nearby"
                    fill
                    sizes="(max-width: 640px) 90vw, 360px"
                    className="object-cover"
                    unoptimized
                  />
                  <div className="absolute bottom-0 left-0 right-0 h-10 bg-linear-to-t from-black/65 to-transparent" />
                  <div className="absolute bottom-2 left-0 right-0 flex items-center justify-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#39B54A] opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#39B54A]" />
                    </span>
                    <p className="text-white text-xs font-semibold">Find Care Near You</p>
                  </div>
                </motion.div>
              </div>

              <motion.div
                className="mt-3 flex flex-wrap items-center justify-center gap-2"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.35 }}
              >
                <span className="bg-white/95 backdrop-blur-sm rounded-full shadow-lg px-3 py-1.5 flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-[#39B54A]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                  </svg>
                  <span className="text-[10px] font-bold text-gray-700">Verified Caregivers</span>
                </span>
                <span className="bg-white/95 backdrop-blur-sm rounded-full shadow-lg px-2.5 py-1 flex items-center gap-1">
                  <svg className="w-3.5 h-3.5 text-amber-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                  </svg>
                  <span className="text-[10px] font-bold text-gray-800">4.9</span>
                </span>
                <span className="bg-white/95 backdrop-blur-sm rounded-full shadow-lg p-1.5">
                  <svg className="w-3.5 h-3.5 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                  </svg>
                </span>
              </motion.div>
            </div>
          </div>

          {/* Service Cards */}
          <div className="grid grid-cols-4 gap-2 px-2 relative z-10">
            {serviceCards.map((card, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + index * 0.1 }}
                className="flex flex-col items-center p-2.5 rounded-xl transition-all duration-300 hover:scale-105 bg-white/95 backdrop-blur-sm shadow-sm hover:shadow-md"
              >
                <span className={`w-8 h-8 ${card.bg} rounded-lg flex items-center justify-center ${card.color}`}>
                  {getServiceIcon(card.icon)}
                </span>
                <span className="text-[9px] font-medium text-gray-700 mt-1.5 text-center leading-tight">
                  {card.label}
                </span>
              </motion.div>
            ))}
          </div>

          {/* Bottom Text */}
          <div className="text-center mt-5 relative z-10">
            <h3 className="text-xl font-bold text-white">Care Services</h3>
            <p className="text-white/80 text-sm">for every stage of life</p>
          </div>
        </div>

        {/* Right Panel - Login Form */}
        <div className="w-full lg:w-[56%] p-8 lg:p-12 flex flex-col justify-center bg-white">
          {/* Header */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-8"
          >
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">
              Welcome to <span className="text-[#39B54A]">CareConnect</span>
            </h1>
            <p className="text-gray-500 text-sm">
              Sign in to find or provide care services
            </p>
          </motion.div>

          {/* Session Expiration Message */}
          <AnimatePresence>
            {sessionMessage && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-sm flex items-center gap-3"
              >
                <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{sessionMessage}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Email Verified Banner */}
          <AnimatePresence>
            {verifiedBanner && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="mb-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm flex items-start gap-3"
              >
                <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Your email has been verified. You can now sign in.</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error Display */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm flex items-center gap-3"
              >
                <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Login Form */}
          <form onSubmit={handleEmailLogin} className="space-y-5">
            {/* Email Field */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="Enter your email"
                className={`w-full px-4 py-3.5 rounded-xl border-2 ${
                  formErrors.email ? 'border-red-300 bg-red-50 focus:border-red-400' : 'border-gray-100 focus:border-[#39B54A]'
                } focus:ring-4 focus:ring-[#39B54A]/10 outline-none transition-all text-sm bg-gray-50/50 text-gray-900 placeholder:text-gray-400`}
              />
              {formErrors.email && (
                <p className="text-red-500 text-xs mt-2 flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {formErrors.email}
                </p>
              )}
            </motion.div>

            {/* Password Field */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="Enter your password"
                  className={`w-full px-4 py-3.5 pr-12 rounded-xl border-2 ${
                    formErrors.password ? 'border-red-300 bg-red-50 focus:border-red-400' : 'border-gray-100 focus:border-[#39B54A]'
                  } focus:ring-4 focus:ring-[#39B54A]/10 outline-none transition-all text-sm bg-gray-50/50 text-gray-900 placeholder:text-gray-400`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#39B54A] transition-colors"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              {formErrors.password && (
                <p className="text-red-500 text-xs mt-2 flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {formErrors.password}
                </p>
              )}
            </motion.div>

            {/* Remember & Forgot */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="flex items-center justify-between"
            >
              <label className="flex items-center gap-2.5 cursor-pointer group">
                <input 
                  type="checkbox" 
                  className="w-4 h-4 rounded border-2 border-gray-200 text-[#39B54A] focus:ring-[#39B54A] focus:ring-offset-0" 
                />
                <span className="text-sm text-gray-600 group-hover:text-gray-900 transition-colors">Remember me</span>
              </label>
              <Link 
                href="/forgot-password" 
                className="text-sm text-[#39B54A] hover:text-[#2d913c] font-semibold transition-colors"
              >
                Forgot password?
              </Link>
            </motion.div>

            {/* Sign In Button */}
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              type="submit"
              disabled={isLoading}
              className="w-full py-4 bg-linear-to-r from-[#39B54A] to-[#2d913c] text-white rounded-xl font-semibold hover:from-[#2d913c] hover:to-[#247a32] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-[#39B54A]/25 hover:shadow-xl hover:shadow-[#39B54A]/30"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </motion.button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-linear-to-r from-transparent via-gray-200 to-transparent"></div>
            <span className="text-sm text-gray-400 font-medium">or</span>
            <div className="flex-1 h-px bg-linear-to-r from-transparent via-gray-200 to-transparent"></div>
          </div>

          {/* Google Login */}
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 px-5 py-3.5 border-2 border-gray-100 rounded-xl 
              hover:bg-gray-50 hover:border-gray-200 transition-all group"
          >
            <svg width="20" height="20" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
              <path d="M23.75,16A7.7446,7.7446,0,0,1,8.7177,18.6259L4.2849,22.1721A13.244,13.244,0,0,0,29.25,16" fill="#00ac47"/>
              <path d="M23.75,16a7.7387,7.7387,0,0,1-3.2516,6.2987l4.3824,3.5059A13.2042,13.2042,0,0,0,29.25,16" fill="#4285f4"/>
              <path d="M8.25,16a7.698,7.698,0,0,1,.4677-2.6259L4.2849,9.8279a13.177,13.177,0,0,0,0,12.3442l4.4328-3.5462A7.698,7.698,0,0,1,8.25,16Z" fill="#ffba00"/>
              <path d="M16,8.25a7.699,7.699,0,0,1,4.558,1.4958l4.06-3.7893A13.2152,13.2152,0,0,0,4.2849,9.8279l4.4328,3.5462A7.756,7.756,0,0,1,16,8.25Z" fill="#ea4435"/>
              <path d="M29.25,15v1L27,19.5H16.5V14H28.25A1,1,0,0,1,29.25,15Z" fill="#4285f4"/>
            </svg>
            <span className="text-gray-700 font-semibold text-sm group-hover:text-gray-900">Continue with Google</span>
          </motion.button>

          {/* Sign Up Link */}
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="text-center text-gray-600 text-sm mt-8"
          >
            Don&apos;t have an account?{" "}
            <Link 
              href="/register" 
              className="text-[#39B54A] hover:text-[#2d913c] font-bold transition-colors"
            >
              Sign up
            </Link>
          </motion.p>
        </div>
      </motion.div>
    </div>
  );
};

export { LoginForm };
export default LoginForm;

// -- PopupStep helper ----------------------------------------------------------
function PopupStep({
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
        className={`w-5 h-5 rounded-full flex items-center justify-center ${
          done ? "bg-[#39B54A]" : active ? "bg-amber-400" : "bg-gray-100"
        }`}
      >
        {done ? (
          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        ) : active ? (
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
        ) : (
          <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
        )}
      </div>
      <span
        className={`text-[9px] font-medium whitespace-nowrap ${
          done ? "text-[#39B54A]" : active ? "text-amber-500" : "text-gray-400"
        }`}
      >
        {label}
      </span>
    </div>
  );
}

