"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  Star,
  CheckCircle,
  TrendingUp,
  Clock,
  XCircle,
  ChevronDown,
  Award,
} from "lucide-react";

interface TrustScoreComponents {
  completedBookings: number;
  reviewScore: number;
  cancellationRate: number;
  responseRate: number;
  profileCompleteness: number;
  verificationStatus: number;
}

interface TrustScoreProps {
  score: number;
  tier?: "basic" | "verified" | "trusted" | "elite";
  components?: TrustScoreComponents;
  showBreakdown?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const TIER_CONFIG = {
  elite: {
    label: "Elite",
    color: "from-amber-400 to-yellow-500",
    bgColor: "bg-amber-50",
    textColor: "text-amber-700",
    borderColor: "border-amber-300",
    icon: Award,
    minScore: 90,
  },
  trusted: {
    label: "Trusted",
    color: "from-blue-400 to-indigo-500",
    bgColor: "bg-blue-50",
    textColor: "text-blue-700",
    borderColor: "border-blue-300",
    icon: Shield,
    minScore: 70,
  },
  verified: {
    label: "Verified",
    color: "from-emerald-400 to-green-500",
    bgColor: "bg-emerald-50",
    textColor: "text-emerald-700",
    borderColor: "border-emerald-300",
    icon: CheckCircle,
    minScore: 50,
  },
  basic: {
    label: "Basic",
    color: "from-gray-400 to-gray-500",
    bgColor: "bg-gray-50",
    textColor: "text-gray-700",
    borderColor: "border-gray-300",
    icon: Star,
    minScore: 0,
  },
};

const COMPONENT_INFO = [
  {
    key: "completedBookings",
    label: "Completed Bookings",
    max: 25,
    icon: CheckCircle,
    description: "Based on total completed jobs",
  },
  {
    key: "reviewScore",
    label: "Review Score",
    max: 25,
    icon: Star,
    description: "Based on ratings and review count",
  },
  {
    key: "cancellationRate",
    label: "Reliability",
    max: 15,
    icon: XCircle,
    description: "Based on low cancellation rate",
  },
  {
    key: "responseRate",
    label: "Response Rate",
    max: 15,
    icon: Clock,
    description: "Based on quick response times",
  },
  {
    key: "profileCompleteness",
    label: "Profile Completeness",
    max: 10,
    icon: TrendingUp,
    description: "Based on profile information",
  },
  {
    key: "verificationStatus",
    label: "Verification",
    max: 10,
    icon: Shield,
    description: "Based on background checks & docs",
  },
];

export function TrustScoreBadge({
  score,
  tier,
  components,
  showBreakdown = false,
  size = "md",
  className = "",
}: TrustScoreProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Determine tier from score if not provided
  const determinedTier =
    tier ||
    (score >= 90
      ? "elite"
      : score >= 70
      ? "trusted"
      : score >= 50
      ? "verified"
      : "basic");

  const tierConfig = TIER_CONFIG[determinedTier];
  const TierIcon = tierConfig.icon;

  const sizeClasses = {
    sm: {
      badge: "px-2 py-1 text-xs",
      icon: "w-3 h-3",
      score: "text-sm",
    },
    md: {
      badge: "px-3 py-1.5 text-sm",
      icon: "w-4 h-4",
      score: "text-base",
    },
    lg: {
      badge: "px-4 py-2 text-base",
      icon: "w-5 h-5",
      score: "text-lg",
    },
  };

  const sizes = sizeClasses[size];

  return (
    <div className={`inline-block ${className}`}>
      <motion.div
        className={`
          relative inline-flex items-center gap-2 rounded-full
          ${tierConfig.bgColor} ${tierConfig.borderColor} border
          ${sizes.badge} cursor-pointer
        `}
        whileHover={{ scale: 1.02 }}
        onClick={() => showBreakdown && setIsExpanded(!isExpanded)}
      >
        {/* Gradient ring for elite/trusted */}
        {(determinedTier === "elite" || determinedTier === "trusted") && (
          <div
            className={`absolute inset-0 rounded-full bg-gradient-to-r ${tierConfig.color} opacity-20`}
          />
        )}

        <TierIcon className={`${sizes.icon} ${tierConfig.textColor}`} />

        <span className={`font-bold ${tierConfig.textColor} ${sizes.score}`}>
          {score}
        </span>

        <span className={`font-medium ${tierConfig.textColor}`}>
          {tierConfig.label}
        </span>

        {showBreakdown && components && (
          <ChevronDown
            className={`${sizes.icon} ${tierConfig.textColor} transition-transform ${
              isExpanded ? "rotate-180" : ""
            }`}
          />
        )}
      </motion.div>

      {/* Breakdown Panel */}
      <AnimatePresence>
        {isExpanded && components && (
          <motion.div
            initial={{ opacity: 0, y: -10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -10, height: 0 }}
            className="mt-2 p-4 bg-white rounded-xl shadow-lg border border-gray-200 w-72"
          >
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary-600" />
              Trust Score Breakdown
            </h4>

            <div className="space-y-3">
              {COMPONENT_INFO.map((comp) => {
                const value =
                  components[comp.key as keyof TrustScoreComponents] || 0;
                const percentage = (value / comp.max) * 100;
                const Icon = comp.icon;

                return (
                  <div key={comp.key}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <div className="flex items-center gap-1.5 text-gray-600">
                        <Icon className="w-3.5 h-3.5" />
                        <span>{comp.label}</span>
                      </div>
                      <span className="font-medium text-gray-900">
                        {value}/{comp.max}
                      </span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        className={`h-full rounded-full ${
                          percentage >= 80
                            ? "bg-emerald-500"
                            : percentage >= 50
                            ? "bg-amber-500"
                            : "bg-red-500"
                        }`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 pt-3 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Total Score</span>
                <span className={`text-lg font-bold ${tierConfig.textColor}`}>
                  {score}/100
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Compact version for cards
export function TrustScoreCompact({
  score,
  tier,
  className = "",
}: {
  score: number;
  tier?: "basic" | "verified" | "trusted" | "elite";
  className?: string;
}) {
  const determinedTier =
    tier ||
    (score >= 90
      ? "elite"
      : score >= 70
      ? "trusted"
      : score >= 50
      ? "verified"
      : "basic");

  const tierConfig = TIER_CONFIG[determinedTier];
  const TierIcon = tierConfig.icon;

  return (
    <div
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${tierConfig.bgColor} ${className}`}
      title={`${tierConfig.label} - Trust Score: ${score}/100`}
    >
      <TierIcon className={`w-3 h-3 ${tierConfig.textColor}`} />
      <span className={`text-xs font-semibold ${tierConfig.textColor}`}>
        {score}
      </span>
    </div>
  );
}

export default TrustScoreBadge;
