"use client";

import { motion } from "framer-motion";
import { Heart, Search, CheckCircle } from "lucide-react";

// --- Types --------------------------------------------------------------------

export type UserRole = "caregiver" | "careseeker";

export interface RoleDefinition {
  value: UserRole;
  label: string;
  tagline: string;
  description: string;
  features: string[];
  icon: React.ReactNode;
  accentColor: string;
  borderColor: string;
  bgColor: string;
  checkColor: string;
}

const ROLES: RoleDefinition[] = [
  {
    value: "caregiver",
    label: "I am a Care Giver",
    tagline: "Offer caregiving services to families who need help",
    description:
      "Join our network of professional caregivers and help families find the support they need.",
    features: [
      "Set your own schedule & hourly rate",
      "Get matched with families nearby",
      "Build your professional profile",
    ],
    icon: <Heart className="w-6 h-6" />,
    accentColor: "text-pink-500",
    borderColor: "border-pink-400",
    bgColor: "bg-pink-50",
    checkColor: "text-pink-500",
  },
  {
    value: "careseeker",
    label: "I am a Care Seeker",
    tagline: "Find trusted caregivers for your family needs",
    description:
      "Discover verified and background-checked caregivers for your loved ones.",
    features: [
      "Browse vetted, verified caregivers",
      "Smart matching based on your needs",
      "Secure booking & payments",
    ],
    icon: <Search className="w-6 h-6" />,
    accentColor: "text-blue-500",
    borderColor: "border-blue-400",
    bgColor: "bg-blue-50",
    checkColor: "text-blue-500",
  },
];

interface Props {
  selectedRole: UserRole | "";
  onSelect: (role: UserRole) => void;
  onNext: () => void;
  onBack: () => void;
  nextLabel?: string;
}

// --- Animations ---------------------------------------------------------------

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const card = {
  hidden: { opacity: 0, y: 20, scale: 0.97 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.35, ease: "easeOut" } },
};

// --- Component ----------------------------------------------------------------

export default function StepRoleSelection({ selectedRole, onSelect, onNext, onBack, nextLabel = "Next Step ?" }: Props) {
  const canProceed = selectedRole !== "";

  return (
    <div className="space-y-5">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="text-2xl font-bold text-gray-900">Choose How You Want to Use CareConnect</h2>
        <p className="text-sm text-gray-500 mt-1">
          Select your role to personalise your experience. You can only pick one.
        </p>
      </motion.div>

      <motion.div
        variants={container}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 sm:grid-cols-2 gap-4"
      >
        {ROLES.map((role) => {
          const isSelected = selectedRole === role.value;
          return (
            <motion.button
              key={role.value}
              variants={card}
              type="button"
              onClick={() => onSelect(role.value)}
              className={`relative text-left rounded-2xl border-2 p-5 transition-all duration-200 focus:outline-none ${
                isSelected
                  ? `${role.borderColor} ${role.bgColor} shadow-lg`
                  : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-md"
              }`}
            >
              {/* Selected checkmark */}
              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-3 right-3"
                >
                  <CheckCircle className={`w-5 h-5 ${role.checkColor}`} />
                </motion.div>
              )}

              {/* Icon */}
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center mb-3 ${
                  isSelected ? `${role.bgColor} ${role.accentColor}` : "bg-gray-100 text-gray-500"
                } transition-colors`}
              >
                {role.icon}
              </div>

              <h3 className="font-semibold text-gray-900 text-sm mb-0.5">{role.label}</h3>
              <p className={`text-xs ${isSelected ? role.accentColor : "text-gray-500"} mb-3`}>
                {role.tagline}
              </p>

              <ul className="space-y-1.5">
                {role.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs text-gray-600">
                    <CheckCircle
                      className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${
                        isSelected ? role.checkColor : "text-gray-300"
                      } transition-colors`}
                    />
                    {f}
                  </li>
                ))}
              </ul>
            </motion.button>
          );
        })}
      </motion.div>

      {/* Navigation */}
      <div className="flex gap-3 pt-2">
        <motion.button
          type="button"
          whileTap={{ scale: 0.97 }}
          onClick={onBack}
          className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-medium text-sm hover:bg-gray-50 transition-colors"
        >
          ? Back
        </motion.button>

        <motion.button
          type="button"
          whileTap={{ scale: 0.97 }}
          onClick={onNext}
          disabled={!canProceed}
          className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-all shadow-md ${
            canProceed
              ? "bg-primary-500 hover:bg-[#2F4BDB] text-white shadow-[#4461F2]/25"
              : "bg-gray-100 text-gray-400 cursor-not-allowed shadow-none"
          }`}
        >
          {nextLabel}
        </motion.button>
      </div>
    </div>
  );
}
