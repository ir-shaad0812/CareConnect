"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, AlertTriangle } from "lucide-react";
import { useProfileCompletion } from "@/hooks/useProfileCompletion";
import { ProfileCompletionBar } from "@/components/ui/ProfileCompletionBar";

interface WelcomeBannerProps {
  userName?: string;
  completionPercentage?: number;
}

export default function WelcomeBanner({ userName, completionPercentage: propPct }: WelcomeBannerProps) {
  const firstName = userName?.split(" ")[0] || "there";
  const greeting = getGreeting();
  // Real-time profile completion — socket value takes precedence over prop
  const liveCompletion = useProfileCompletion();
  const completionPercentage = liveCompletion || propPct || 0;

  return (
    <div className="space-y-4">
      {/* Welcome */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
          {greeting}, {firstName}! 👋
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Here&apos;s what&apos;s happening with your caregiver profile today.
        </p>
      </motion.div>

      {/* Profile Completion Alert */}
      {completionPercentage < 100 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05, duration: 0.2 }}
          className="flex items-center justify-between gap-4 px-5 py-3.5 bg-linear-to-r from-amber-50 to-orange-50 border border-amber-200/60 rounded-xl"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
              <AlertTriangle size={18} className="text-amber-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-900">
                Complete your profile ({completionPercentage}%)
              </p>
              <ProfileCompletionBar pct={completionPercentage} showLabel={false} size="sm" className="mt-1.5 max-w-48" />
              <p className="text-xs text-amber-700/80 mt-1">
                Profiles with 100% completion get 3x more booking requests.
              </p>
            </div>
          </div>
          <Link
            href="/profile/caregiver"
            className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 text-white text-xs font-semibold rounded-lg hover:bg-amber-600 transition-colors shadow-sm whitespace-nowrap"
          >
            Complete Now
            <ArrowRight size={12} />
          </Link>
        </motion.div>
      )}
    </div>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}
