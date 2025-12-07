// ============================================
// CHAT ACCESS BANNER
// Shows contextual banners based on chat access status
// Locked, Restricted, Closed states with appropriate CTAs
// ============================================

"use client";

import React, { memo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Lock,
  AlertTriangle,
  CheckCircle2,
  CreditCard,
  MessageSquareOff,
  Headphones,
  Clock,
  ChevronDown,
  ChevronUp,
  Calendar,
  Info,
  X,
} from "lucide-react";
import type { ChatAccessStatus, BookingInfo } from "@/modules/chat/services";

// ============================================
// TYPES
// ============================================

interface ChatAccessBannerProps {
  accessStatus: ChatAccessStatus;
  onPayNow?: () => void;
  onContactSupport?: () => void;
  onViewBooking?: () => void;
  isLoading?: boolean;
  className?: string;
}

type BannerVariant = "locked" | "restricted" | "closed" | "active";

// ============================================
// ANIMATION VARIANTS
// ============================================

const bannerVariants = {
  hidden: { opacity: 0, y: -20, height: 0 },
  visible: {
    opacity: 1,
    y: 0,
    height: "auto",
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 30,
      staggerChildren: 0.05,
    },
  },
  exit: {
    opacity: 0,
    y: -20,
    height: 0,
    transition: { duration: 0.2 },
  },
};

const contentVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

const buttonVariants = {
  idle: { scale: 1 },
  hover: { scale: 1.02 },
  tap: { scale: 0.98 },
};

const pulseVariants = {
  pulse: {
    scale: [1, 1.05, 1],
    opacity: [0.5, 0.8, 0.5],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
};

// ============================================
// BANNER CONFIG
// ============================================

const getBannerConfig = (status: string, reason?: string) => {
  const configs: Record<string, {
    variant: BannerVariant;
    icon: React.ElementType;
    bgClass: string;
    borderClass: string;
    iconClass: string;
    textClass: string;
    title: string;
    description: string;
  }> = {
    locked: {
      variant: "locked",
      icon: Lock,
      bgClass: "bg-amber-50 dark:bg-amber-900/20",
      borderClass: "border-amber-200 dark:border-amber-800/50",
      iconClass: "text-amber-500",
      textClass: "text-amber-800 dark:text-amber-200",
      title: "Chat Locked",
      description: "Messaging unlocks after both parties accept the service agreement.",
    },
    restricted: {
      variant: "restricted",
      icon: AlertTriangle,
      bgClass: "bg-red-50 dark:bg-red-900/20",
      borderClass: "border-red-200 dark:border-red-800/50",
      iconClass: "text-red-500",
      textClass: "text-red-800 dark:text-red-200",
      title: "Chat Restricted",
      description: reason || "This chat has been restricted. Contact support for assistance.",
    },
    closed: {
      variant: "closed",
      icon: CheckCircle2,
      bgClass: "bg-gray-50 dark:bg-gray-800/50",
      borderClass: "border-gray-200 dark:border-gray-700",
      iconClass: "text-gray-500",
      textClass: "text-gray-700 dark:text-gray-300",
      title: "Chat Read-Only",
      description: "This booking is complete. Chat history is available for reference.",
    },
    active: {
      variant: "active",
      icon: MessageSquareOff,
      bgClass: "bg-green-50 dark:bg-green-900/20",
      borderClass: "border-green-200 dark:border-green-800/50",
      iconClass: "text-green-500",
      textClass: "text-green-800 dark:text-green-200",
      title: "Chat Active",
      description: "You can send and receive messages.",
    },
  };

  return configs[status] || configs.locked;
};

// ============================================
// PAYMENT INFO CARD
// ============================================

const PaymentInfoCard = memo<{
  booking: BookingInfo;
  onPayNow?: () => void;
  onViewBooking?: () => void;
  isLoading?: boolean;
}>(({ booking, onPayNow, onViewBooking, isLoading }) => {
  const isExpired = booking.isPaymentExpired;
  const deadline = booking.paymentDeadline
    ? new Date(booking.paymentDeadline)
    : null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-NP", {
      style: "currency",
      currency: "NPR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDeadline = (date: Date) => {
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffMs < 0) return "Expired";
    if (diffHours < 1) return "Less than 1 hour";
    if (diffHours < 24) return `${diffHours} hours`;
    return `${diffDays} days`;
  };

  return (
    <motion.div
      variants={contentVariants}
      className="mt-3 p-4 bg-white/60 dark:bg-gray-800/60 rounded-xl border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-sm"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Booking Info */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span className="text-gray-600 dark:text-gray-400">
              Booking #{booking.bookingNumber}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Amount Due</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {formatCurrency(booking.amountDue)}
              </p>
            </div>
            {deadline && (
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Deadline</p>
                <p className={`text-sm font-medium ${
                  isExpired
                    ? "text-red-600 dark:text-red-400"
                    : "text-amber-600 dark:text-amber-400"
                }`}>
                  <Clock className="w-3 h-3 inline mr-1" />
                  {formatDeadline(deadline)}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {onViewBooking && (
            <motion.button
              variants={buttonVariants}
              initial="idle"
              whileHover="hover"
              whileTap="tap"
              onClick={onViewBooking}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors flex items-center gap-2"
            >
              <Info className="w-4 h-4" />
              View Details
            </motion.button>
          )}
          {!isExpired && onPayNow && (
            <motion.button
              variants={buttonVariants}
              initial="idle"
              whileHover="hover"
              whileTap="tap"
              onClick={onPayNow}
              disabled={isLoading}
              className="px-5 py-2 text-sm font-semibold text-white bg-[#39B54A] hover:bg-[#2d913c] disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-md shadow-[#39B54A]/20 transition-all flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4"
                    xmlns="http://www.w3.org/2000/svg"
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
                  Processing...
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4" />
                  Pay Now
                </>
              )}
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  );
});

PaymentInfoCard.displayName = "PaymentInfoCard";

// ============================================
// MAIN COMPONENT
// ============================================

export const ChatAccessBanner = memo<ChatAccessBannerProps>(({
  accessStatus,
  onPayNow,
  onContactSupport,
  onViewBooking,
  isLoading = false,
  className = "",
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isDismissed, setIsDismissed] = useState(false);

  // Don't show banner for active chats or if dismissed
  if (accessStatus.canSendMessages || isDismissed) {
    return null;
  }

  const config = getBannerConfig(accessStatus.status, accessStatus.reason);
  const Icon = config.icon;
  const showPaymentInfo = accessStatus.status === "locked" && accessStatus.booking;
  const showContactSupport = accessStatus.status === "restricted";

  return (
    <AnimatePresence>
      <motion.div
        variants={bannerVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className={`relative overflow-hidden ${className}`}
      >
        <div
          className={`relative ${config.bgClass} ${config.borderClass} border-b`}
        >
          {/* Animated Background Pulse for Locked State */}
          {accessStatus.status === "locked" && (
            <motion.div
              variants={pulseVariants}
              animate="pulse"
              className="absolute inset-0 bg-gradient-to-r from-amber-100/50 via-transparent to-amber-100/50 dark:from-amber-900/20 dark:via-transparent dark:to-amber-900/20"
            />
          )}

          <div className="relative px-4 py-3">
            {/* Header Row */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                {/* Icon */}
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  className={`p-2 rounded-xl ${
                    accessStatus.status === "locked"
                      ? "bg-amber-100 dark:bg-amber-900/40"
                      : accessStatus.status === "restricted"
                      ? "bg-red-100 dark:bg-red-900/40"
                      : "bg-gray-100 dark:bg-gray-800"
                  }`}
                >
                  <Icon className={`w-5 h-5 ${config.iconClass}`} />
                </motion.div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <motion.h3
                    variants={contentVariants}
                    className={`font-semibold ${config.textClass}`}
                  >
                    {config.title}
                  </motion.h3>
                  <motion.p
                    variants={contentVariants}
                    className="text-sm text-gray-600 dark:text-gray-400 mt-0.5"
                  >
                    {config.description}
                  </motion.p>
                </div>
              </div>

              {/* Expand/Collapse & Dismiss */}
              <div className="flex items-center gap-1">
                {showPaymentInfo && (
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="p-1.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-800/50 rounded-lg transition-colors"
                    aria-label={isExpanded ? "Collapse" : "Expand"}
                  >
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </motion.button>
                )}
                {accessStatus.status === "closed" && (
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setIsDismissed(true)}
                    className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-800/50 rounded-lg transition-colors"
                    aria-label="Dismiss"
                  >
                    <X className="w-4 h-4" />
                  </motion.button>
                )}
              </div>
            </div>

            {/* Payment Info Card (for locked state) */}
            <AnimatePresence>
              {showPaymentInfo && isExpanded && accessStatus.booking && (
                <PaymentInfoCard
                  booking={accessStatus.booking}
                  {...(onPayNow ? { onPayNow } : {})}
                  {...(onViewBooking ? { onViewBooking } : {})}
                  isLoading={isLoading}
                />
              )}
            </AnimatePresence>

            {/* Contact Support Button (for restricted state) */}
            {showContactSupport && (
              <motion.div
                variants={contentVariants}
                className="mt-3 flex items-center gap-2"
              >
                <motion.button
                  variants={buttonVariants}
                  initial="idle"
                  whileHover="hover"
                  whileTap="tap"
                  onClick={onContactSupport}
                  className="px-4 py-2 text-sm font-medium text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/40 hover:bg-red-200 dark:hover:bg-red-900/60 rounded-lg transition-colors flex items-center gap-2"
                >
                  <Headphones className="w-4 h-4" />
                  Contact Support
                </motion.button>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Our team can help resolve this issue
                </span>
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
});

ChatAccessBanner.displayName = "ChatAccessBanner";

// ============================================
// COMPACT BANNER (for inline use)
// ============================================

interface CompactBannerProps {
  status: "locked" | "restricted" | "closed";
  message?: string;
  onAction?: () => void;
  actionLabel?: string;
}

export const CompactChatBanner = memo<CompactBannerProps>(({
  status,
  message,
  onAction,
  actionLabel,
}) => {
  const config = getBannerConfig(status);
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${config.bgClass} ${config.borderClass} border`}
    >
      <Icon className={`w-4 h-4 ${config.iconClass}`} />
      <span className={config.textClass}>
        {message || config.title}
      </span>
      {onAction && actionLabel && (
        <button
          onClick={onAction}
          className="ml-1 font-medium underline hover:no-underline"
        >
          {actionLabel}
        </button>
      )}
    </motion.div>
  );
});

CompactChatBanner.displayName = "CompactChatBanner";

export default ChatAccessBanner;

