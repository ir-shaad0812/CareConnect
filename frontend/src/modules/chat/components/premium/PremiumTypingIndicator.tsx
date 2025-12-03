// ============================================
// PREMIUM TYPING INDICATOR
// iMessage/WhatsApp-style animated typing dots
// ============================================

"use client";

import { memo } from "react";
import { motion } from "framer-motion";

// ============================================
// TYPES
// ============================================

interface PremiumTypingIndicatorProps {
  userName?: string;
  avatarUrl?: string;
  avatarInitial?: string;
  showAvatar?: boolean;
  variant?: "bubble" | "inline";
  className?: string;
}

// ============================================
// ANIMATION VARIANTS
// ============================================

const containerVariants = {
  initial: { opacity: 0, y: 10, scale: 0.95 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 25,
    },
  },
  exit: {
    opacity: 0,
    y: -10,
    scale: 0.95,
    transition: { duration: 0.2 },
  },
};

const dotVariants = {
  initial: { y: 0 },
  animate: (i: number) => ({
    y: [0, -6, 0],
    transition: {
      duration: 0.6,
      repeat: Infinity,
      repeatType: "loop" as const,
      delay: i * 0.15,
      ease: "easeInOut",
    },
  }),
};

// ============================================
// MAIN COMPONENT
// ============================================

export const PremiumTypingIndicator = memo<PremiumTypingIndicatorProps>(({
  userName,
  avatarUrl,
  avatarInitial,
  showAvatar = true,
  variant = "bubble",
  className = "",
}) => {
  // Inline variant (just text)
  if (variant === "inline") {
    return (
      <motion.div
        variants={containerVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className={`flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 ${className}`}
      >
        {userName && <span className="font-medium text-[#39B54A]">{userName}</span>}
        <span>is typing</span>
        <span className="flex items-center gap-0.5">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              custom={i}
              variants={dotVariants}
              initial="initial"
              animate="animate"
              className="w-1 h-1 rounded-full bg-gray-400 dark:bg-gray-500"
            />
          ))}
        </span>
      </motion.div>
    );
  }

  // Bubble variant (WhatsApp style)
  return (
    <motion.div
      variants={containerVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className={`flex items-end gap-2 ${className}`}
    >
      {/* Avatar */}
      {showAvatar && (
        <div className="shrink-0">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={userName || "User"}
              className="w-8 h-8 rounded-full ring-2 ring-white dark:ring-gray-800 shadow-sm"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-linear-to-br from-[#39B54A] to-[#2d913c] flex items-center justify-center text-white text-sm font-medium shadow-sm">
              {avatarInitial || "?"}
            </div>
          )}
        </div>
      )}

      {/* Typing Bubble */}
      <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
        <div className="flex items-center gap-1">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              custom={i}
              variants={dotVariants}
              initial="initial"
              animate="animate"
              className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-500"
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
});

PremiumTypingIndicator.displayName = "PremiumTypingIndicator";

export default PremiumTypingIndicator;
