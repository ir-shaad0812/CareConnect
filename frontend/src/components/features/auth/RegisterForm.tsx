"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { AlertCircle, CheckCircle2, Eye, EyeOff, Loader2, Mail, Phone, User, Lock } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { authService } from "@/modules/auth/services/auth.service";

type FormState = {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
};

type FormErrors = Partial<Record<keyof FormState, string>>;

const INITIAL_FORM: FormState = {
  fullName: "",
  email: "",
  phone: "",
  password: "",
  confirmPassword: "",
};

function validateForm(data: FormState): FormErrors {
  const errors: FormErrors = {};

  if (!data.fullName.trim() || data.fullName.trim().length < 2) {
    errors.fullName = "Full name must be at least 2 characters";
  }

  if (!data.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.email = "Please enter a valid email address";
  }

  if (!data.phone.trim() || !/^\+?[\d\s\-()]{10,}$/.test(data.phone)) {
    errors.phone = "Please enter a valid phone number";
  }

  if (!data.password || data.password.length < 8) {
    errors.password = "Password must be at least 8 characters";
  } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/.test(data.password)) {
    errors.password = "Use uppercase, lowercase, number, and special character";
  }

  if (!data.confirmPassword) {
    errors.confirmPassword = "Please confirm your password";
  } else if (data.password !== data.confirmPassword) {
    errors.confirmPassword = "Passwords do not match";
  }

  return errors;
}

const INPUT_BASE =
  "w-full rounded-xl border bg-white px-11 pr-11 py-3 text-sm text-gray-900 outline-none transition focus:ring-2";

export const RegisterForm = () => {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const canSubmit = useMemo(() => {
    return (
      form.fullName.trim().length > 1 &&
      form.email.trim().length > 3 &&
      form.phone.trim().length > 6 &&
      form.password.length >= 8 &&
      form.confirmPassword.length >= 8 &&
      !isSubmitting
    );
  }, [form, isSubmitting]);

  const onFieldChange = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
    if (globalError) {
      setGlobalError(null);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const validationErrors = validateForm(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});
    setGlobalError(null);
    setIsSubmitting(true);

    try {
      const response = await authService.register({
        fullName: form.fullName.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        password: form.password,
        confirmPassword: form.confirmPassword,
      });

      if (!response.success || !response.data?.user) {
        throw new Error("Registration failed. Please try again.");
      }

      setIsSuccess(true);
      setTimeout(() => {
        const email = encodeURIComponent(form.email.trim().toLowerCase());
        router.push(`/login?email=${email}`);
      }, 1000);
    } catch (error: unknown) {
      setGlobalError(
        error instanceof Error
          ? error.message
          : "Registration failed. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="w-full max-w-md rounded-2xl bg-white p-10 text-center shadow-xl">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 280, damping: 22 }}
          className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-green-100"
        >
          <CheckCircle2 className="h-10 w-10 text-green-600" />
        </motion.div>
        <h2 className="mb-2 text-2xl font-bold text-gray-900">Welcome to CareConnect</h2>
        <p className="text-sm text-gray-500">
          Account created. Please verify your email to continue setup. Redirecting to login...
        </p>
        <div className="mt-5 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-[#39B54A]" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[880px] overflow-hidden rounded-2xl bg-white shadow-2xl">
      <div className="grid lg:grid-cols-[34%_66%]">
        <div className="relative bg-gradient-to-br from-[#39B54A] via-[#2d913c] to-[#247a32] p-8 text-white">
          <Logo variant="white" showText href="/home" />
          <div className="mt-12">
            <h2 className="text-2xl font-bold">Create your identity</h2>
            <p className="mt-2 text-sm text-white/85">
              Registration only collects your identity details. Role, profile setup,
              and required documents are completed securely in onboarding.
            </p>
          </div>

          <div className="mt-8 rounded-2xl overflow-hidden border border-white/20 shadow-xl shadow-black/20">
            <div className="relative h-52 w-full">
              <Image
                src="/login/Register/Happy_faces.png"
                alt="CareConnect caregivers and families"
                fill
                sizes="(max-width: 1024px) 100vw, 320px"
                className="object-cover"
                unoptimized
              />
              <div className="absolute inset-0 bg-linear-to-t from-black/45 via-transparent to-transparent" />
              <p className="absolute bottom-3 left-3 right-3 text-xs font-semibold text-white">
                Safe, verified, and trusted care in your community.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-[#FAFBFF] p-8 lg:p-10">
          <h1 className="text-2xl font-bold text-gray-900">Sign up</h1>
          <p className="mt-1 text-sm text-gray-500">Join now and finish setup in guided onboarding.</p>

          <button
            type="button"
            onClick={() => authService.initiateGoogleLogin()}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
          >
            <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.73 1.22 9.24 3.62l6.9-6.9C35.94 2.31 30.39 0 24 0 14.64 0 6.54 5.4 2.56 13.28l8.04 6.24C12.52 13.27 17.76 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.5 24.55c0-1.6-.14-3.14-.4-4.62H24v9.2h12.7c-.55 2.96-2.22 5.47-4.73 7.16l7.26 5.63c4.24-3.9 6.67-9.65 6.67-17.37z"/>
              <path fill="#FBBC05" d="M10.6 28.48a14.5 14.5 0 010-8.96l-8.04-6.24A23.98 23.98 0 000 24c0 3.87.93 7.53 2.56 10.72l8.04-6.24z"/>
              <path fill="#34A853" d="M24 48c6.39 0 11.76-2.1 15.68-5.7l-7.26-5.63c-2.02 1.36-4.6 2.18-8.42 2.18-6.24 0-11.48-3.77-13.4-9.02l-8.04 6.24C6.54 42.6 14.64 48 24 48z"/>
            </svg>
            Continue with Google
          </button>

          <div className="my-5 flex items-center gap-3 text-xs text-gray-400">
            <span className="h-px flex-1 bg-gray-200" />
            OR
            <span className="h-px flex-1 bg-gray-200" />
          </div>

          {globalError && (
            <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{globalError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-gray-700">Full name</span>
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  value={form.fullName}
                  onChange={(e) => onFieldChange("fullName", e.target.value)}
                  className={`${INPUT_BASE} ${errors.fullName ? "border-red-400 focus:ring-red-200" : "border-gray-200 focus:border-[#39B54A] focus:ring-[#39B54A]/20"}`}
                  placeholder="Jane Doe"
                />
              </div>
              {errors.fullName && <p className="mt-1 text-xs text-red-600">{errors.fullName}</p>}
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-gray-700">Email</span>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => onFieldChange("email", e.target.value)}
                  className={`${INPUT_BASE} ${errors.email ? "border-red-400 focus:ring-red-200" : "border-gray-200 focus:border-[#39B54A] focus:ring-[#39B54A]/20"}`}
                  placeholder="you@example.com"
                />
              </div>
              {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-gray-700">Phone</span>
              <div className="relative">
                <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => onFieldChange("phone", e.target.value)}
                  className={`${INPUT_BASE} ${errors.phone ? "border-red-400 focus:ring-red-200" : "border-gray-200 focus:border-[#39B54A] focus:ring-[#39B54A]/20"}`}
                  placeholder="+1 555 123 4567"
                />
              </div>
              {errors.phone && <p className="mt-1 text-xs text-red-600">{errors.phone}</p>}
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-gray-700">Password</span>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={(e) => onFieldChange("password", e.target.value)}
                    className={`${INPUT_BASE} ${errors.password ? "border-red-400 focus:ring-red-200" : "border-gray-200 focus:border-[#39B54A] focus:ring-[#39B54A]/20"}`}
                    placeholder="Minimum 8 chars"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password}</p>}
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-gray-700">Confirm password</span>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={form.confirmPassword}
                    onChange={(e) => onFieldChange("confirmPassword", e.target.value)}
                    className={`${INPUT_BASE} ${errors.confirmPassword ? "border-red-400 focus:ring-red-200" : "border-gray-200 focus:border-[#39B54A] focus:ring-[#39B54A]/20"}`}
                    placeholder="Re-enter password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                    aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.confirmPassword && <p className="mt-1 text-xs text-red-600">{errors.confirmPassword}</p>}
              </label>
            </div>

            <button
              type="submit"
              disabled={!canSubmit}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-[#39B54A] py-3 text-sm font-semibold text-white shadow-md shadow-[#39B54A]/25 transition hover:bg-[#2d913c] disabled:cursor-not-allowed disabled:bg-gray-300 disabled:shadow-none"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {isSubmitting ? "Creating account..." : "Create account"}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-gray-600">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-[#39B54A] hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterForm;
