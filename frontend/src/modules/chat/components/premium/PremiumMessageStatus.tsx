// ============================================
// PREMIUM MESSAGE STATUS
// WhatsApp-style multi-state delivery status
// ============================================

"use client";

import React, { memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, CheckCheck, Clock, AlertCircle } from "lucide-react";

// ============================================
// TYPES
// ============================================

type MessageStatusType = "sending" | "sent" | "delivered" | "read" | "failed";

interface PremiumMessageStatusProps {
  status: MessageStatusType;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

// ============================================
// CONSTANTS
// ============================================

const sizeConfig = {
  sm: { icon: "w-3 h-3", label: "text-[10px]" },
  md: { icon: "w-4 h-4", label: "text-xs" },
  lg: { icon: "w-5 h-5", label: "text-sm" },
};

const statusConfig: Record<
  MessageStatusType,
  {
    icon: React.ElementType;
    color: string;
    label: string;
    animate?: boolean;
  }
> = {
  sending: {
    icon: Clock,
    color: "text-gray-400",
    label: "Sending",
    animate: true,
  },
  sent: {
    icon: Check,
    color: "text-gray-400",
    label: "Sent",
  },
  delivered: {
    icon: CheckCheck,
    color: "text-gray-400",
    label: "Delivered",
  },
  read: {
    icon: CheckCheck,
    color: "text-blue-500",
    label: "Read",
  },
  failed: {
    icon: AlertCircle,
    color: "text-red-500",
    label: "Failed",
  },
};

// ============================================
// ANIMATION VARIANTS
// ============================================

const iconVariants = {
  initial: { opacity: 0, scale: 0.5 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 500,
      damping: 25,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.5,
    transition: { duration: 0.15 },
  },
};

const pulseVariants = {
  animate: {
    opacity: [1, 0.5, 1],
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
};

// ============================================
// MAIN COMPONENT
// ============================================

export const PremiumMessageStatus = memo<PremiumMessageStatusProps>(({
  status,
  showLabel = false,
  size = "md",
  className = "",
}) => {
  const config = statusConfig[status];
  const sizeStyles = sizeConfig[size];
  const Icon = config.icon;

  return (
    <div className={`inline-flex items-center gap-1 ${className}`}>
      <AnimatePresence mode="wait">
        <motion.span
          key={status}
          variants={config.animate ? pulseVariants : iconVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          className={`${config.color} flex items-center`}
          aria-label={config.label}
        >
          <Icon className={sizeStyles.icon} />
        </motion.span>
      </AnimatePresence>

      {showLabel && (
        <span className={`${sizeStyles.label} ${config.color} font-medium`}>
          {config.label}
        </span>
      )}
    </div>
  );
});

PremiumMessageStatus.displayName = "PremiumMessageStatus";

export default PremiumMessageStatus;
