// ============================================
// PREMIUM ONLINE STATUS INDICATOR
// Beautiful animated online indicator
// ============================================

"use client";

import { memo } from "react";
import { motion } from "framer-motion";

// ============================================
// TYPES
// ============================================

interface PremiumOnlineStatusProps {
  isOnline: boolean;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

// ============================================
// CONSTANTS
// ============================================

const sizeConfig = {
  sm: {
    dot: "w-2.5 h-2.5",
    position: "-bottom-0 -right-0",
    ring: "ring-[1.5px]",
    pulse: "w-2.5 h-2.5",
  },
  md: {
    dot: "w-3.5 h-3.5",
    position: "-bottom-0.5 -right-0.5",
    ring: "ring-2",
    pulse: "w-3.5 h-3.5",
  },
  lg: {
    dot: "w-4 h-4",
    position: "-bottom-0.5 -right-0.5",
    ring: "ring-2",
    pulse: "w-4 h-4",
  },
};

// ============================================
// MAIN COMPONENT
// ============================================

export const PremiumOnlineStatus = memo<PremiumOnlineStatusProps>(({
  isOnline,
  size = "md",
  showLabel = false,
  className = "",
}) => {
  const config = sizeConfig[size];

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div
        className={`absolute ${config.position} ${config.ring} ring-white dark:ring-gray-900 rounded-full`}
      >
        {/* Base dot */}
        <div
          className={`${config.dot} rounded-full ${
            isOnline
              ? "bg-linear-to-br from-green-400 to-green-500"
              : "bg-gray-300 dark:bg-gray-600"
          }`}
        />

        {/* Pulse animation when online */}
        {isOnline && (
          <motion.div
            initial={{ opacity: 0.5, scale: 1 }}
            animate={{
              opacity: [0.5, 0],
              scale: [1, 2],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              repeatType: "loop",
              ease: "easeOut",
            }}
            className={`absolute inset-0 ${config.pulse} rounded-full bg-green-400`}
          />
        )}
      </div>

      {showLabel && (
        <span
          className={`text-xs font-medium ${
            isOnline
              ? "text-green-600 dark:text-green-400"
              : "text-gray-500 dark:text-gray-400"
          }`}
        >
          {isOnline ? "Online" : "Offline"}
        </span>
      )}
    </div>
  );
});

PremiumOnlineStatus.displayName = "PremiumOnlineStatus";

export default PremiumOnlineStatus;
