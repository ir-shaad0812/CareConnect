"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  User,
  Mail,
  Phone,
  Calendar,
  MapPin,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
} from "lucide-react";

// --- Types --------------------------------------------------------------------

export interface PersonalDetailsData {
  fullName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: "male" | "female" | "other" | "prefer_not_to_say" | "";
  address: string;
  password: string;
  confirmPassword: string;
}

export type PersonalDetailsErrors = Partial<Record<keyof PersonalDetailsData, string>>;

interface Props {
  data: PersonalDetailsData;
  errors: PersonalDetailsErrors;
  onChange: (field: keyof PersonalDetailsData, value: string) => void;
  onNext: () => void;
  isOAuthOnboarding?: boolean;
}

// --- Validation ---------------------------------------------------------------

interface PersonalValidationOptions {
  requireAddress?: boolean;
  requirePassword?: boolean;
}

export function validatePersonalDetails(
  data: PersonalDetailsData,
  options: PersonalValidationOptions = {}
): PersonalDetailsErrors {
  const { requireAddress = true, requirePassword = true } = options;
  const errors: PersonalDetailsErrors = {};

  if (!data.fullName.trim() || data.fullName.trim().length < 2) {
    errors.fullName = "Full name must be at least 2 characters";
  }

  if (!data.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.email = "Please enter a valid email address";
  }

  if (!data.phone.trim() || !/^\+?[\d\s\-()]{10,}$/.test(data.phone)) {
    errors.phone = "Please enter a valid phone number (min 10 digits)";
  }

  if (!data.dateOfBirth) {
    errors.dateOfBirth = "Date of birth is required";
  } else {
    const dob = new Date(data.dateOfBirth);
    const today = new Date();
    const age = today.getFullYear() - dob.getFullYear();
    if (age < 18 || age > 120) errors.dateOfBirth = "You must be at least 18 years old";
  }

  if (!data.gender) {
    errors.gender = "Please select your gender";
  }

  if (requireAddress && (!data.address.trim() || data.address.trim().length < 10)) {
    errors.address = "Please enter your full address (min 10 characters)";
  }

  if (requirePassword) {
    if (!data.password || data.password.length < 8) {
      errors.password = "Password must be at least 8 characters";
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(data.password)) {
      errors.password = "Must include uppercase, lowercase, and a number";
    }

    if (!data.confirmPassword) {
      errors.confirmPassword = "Please confirm your password";
    } else if (data.password !== data.confirmPassword) {
      errors.confirmPassword = "Passwords do not match";
    }
  }

  return errors;
}

// --- Component ----------------------------------------------------------------

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, duration: 0.35, ease: "easeOut" },
  }),
};

interface FieldProps {
  label: string;
  error?: string;
  index: number;
  children: React.ReactNode;
}

function Field({ label, error, index, children }: FieldProps) {
  return (
    <motion.div custom={index} variants={fadeUp} initial="hidden" animate="visible">
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      {children}
      {error && (
        <p className="flex items-center gap-1 text-red-500 text-xs mt-1">
          <AlertCircle className="w-3 h-3 shrink-0" />
          {error}
        </p>
      )}
    </motion.div>
  );
}

const INPUT_BASE =
  "w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-all";
const INPUT_NORMAL = `${INPUT_BASE} border-gray-200 focus:border-primary-500 focus:ring-[#4461F2]/15`;
const INPUT_ERROR = `${INPUT_BASE} border-red-400 bg-red-50 focus:border-red-400 focus:ring-red-200`;

export default function StepPersonalDetails({
  data,
  errors,
  onChange,
  onNext,
  isOAuthOnboarding = false,
}: Props) {
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNext();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-5">
        <h2 className="text-2xl font-bold text-gray-900">Tell Us About Yourself</h2>
        <p className="text-sm text-gray-500 mt-1">
          Please provide your basic personal details to get started with CareConnect.
        </p>
      </motion.div>

      {/* Full Name + Email */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Full Name" index={0} {...(errors.fullName !== undefined ? { error: errors.fullName } : {})}>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="John Doe"
              value={data.fullName}
              onChange={(e) => onChange("fullName", e.target.value)}
              className={errors.fullName ? INPUT_ERROR : INPUT_NORMAL}
            />
          </div>
        </Field>

        <Field label="Email Address" index={1} {...(errors.email !== undefined ? { error: errors.email } : {})}>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="email"
              placeholder="john.doe@example.com"
              value={data.email}
              onChange={(e) => onChange("email", e.target.value)}
              disabled={isOAuthOnboarding}
              className={`${errors.email ? INPUT_ERROR : INPUT_NORMAL} ${isOAuthOnboarding ? "bg-gray-100 cursor-not-allowed text-gray-500" : ""}`}
            />
          </div>
        </Field>
      </div>

      {/* Phone + DOB */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Phone Number" index={2} {...(errors.phone !== undefined ? { error: errors.phone } : {})}>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="tel"
              placeholder="+1 (555) 123-4567"
              value={data.phone}
              onChange={(e) => onChange("phone", e.target.value)}
              className={errors.phone ? INPUT_ERROR : INPUT_NORMAL}
            />
          </div>
        </Field>

        <Field label="Date of Birth" index={3} {...(errors.dateOfBirth !== undefined ? { error: errors.dateOfBirth } : {})}>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="date"
              value={data.dateOfBirth}
              onChange={(e) => onChange("dateOfBirth", e.target.value)}
              max={new Date(new Date().setFullYear(new Date().getFullYear() - 18))
                .toISOString()
                .split("T")[0]}
              className={errors.dateOfBirth ? INPUT_ERROR : INPUT_NORMAL}
            />
          </div>
        </Field>
      </div>

      {/* Gender */}
      <Field label="Gender" index={4} {...(errors.gender !== undefined ? { error: errors.gender } : {})}>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <select
            value={data.gender}
            onChange={(e) => onChange("gender", e.target.value)}
            className={errors.gender ? INPUT_ERROR : INPUT_NORMAL}
          >
            <option value="">Select your gender</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
            <option value="prefer_not_to_say">Prefer not to say</option>
          </select>
        </div>
      </Field>

      {/* Address */}
      <Field label={isOAuthOnboarding ? "Full Address (Optional)" : "Full Address"} index={5} {...(errors.address !== undefined ? { error: errors.address } : {})}>
        <div className="relative">
          <MapPin className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
          <textarea
            placeholder="123 Main St, Anytown, CA 90210"
            value={data.address}
            onChange={(e) => onChange("address", e.target.value)}
            rows={2}
            className={`${errors.address ? INPUT_ERROR : INPUT_NORMAL} pl-10 !py-2 resize-none`}
          />
        </div>
      </Field>

      {/* Password + Confirm */}
      {!isOAuthOnboarding && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Password" index={6} {...(errors.password !== undefined ? { error: errors.password } : {})}>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type={showPass ? "text" : "password"}
                placeholder="Minimum 8 characters"
                value={data.password}
                onChange={(e) => onChange("password", e.target.value)}
                className={`${errors.password ? INPUT_ERROR : INPUT_NORMAL} pr-10`}
              />
              <button
                type="button"
                onClick={() => setShowPass((p) => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </Field>

          <Field label="Confirm Password" index={7} {...(errors.confirmPassword !== undefined ? { error: errors.confirmPassword } : {})}>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type={showConfirm ? "text" : "password"}
                placeholder="Re-enter password"
                value={data.confirmPassword}
                onChange={(e) => onChange("confirmPassword", e.target.value)}
                className={`${errors.confirmPassword ? INPUT_ERROR : INPUT_NORMAL} pr-10`}
              />
              <button
                type="button"
                onClick={() => setShowConfirm((p) => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </Field>
        </div>
      )}

      {/* Next Button */}
      <motion.button
        type="submit"
        whileTap={{ scale: 0.98 }}
        className="w-full py-3 bg-primary-500 hover:bg-[#2F4BDB] text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 mt-2 shadow-md shadow-[#4461F2]/25"
      >
        Next Step ?
      </motion.button>
    </form>
  );
}
