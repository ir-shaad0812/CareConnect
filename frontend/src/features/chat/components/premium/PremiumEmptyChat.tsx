// ============================================
// PREMIUM EMPTY CHAT STATE
// Beautiful empty state for chat with animations
// ============================================

"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { MessageCircle, Sparkles, Heart, Users, Search } from "lucide-react";

interface PremiumEmptyChatProps {
  title?: string;
  subtitle?: string;
  showCTA?: boolean;
  onStartChat?: () => void;
  ctaText?: string;
  ctaHref?: string;
  secondaryText?: string;
  secondaryHref?: string;
  className?: string;
}

const floatingVariants = {
  animate: {
    y: [-10, 10, -10],
    transition: {
      duration: 4,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
};

const pulseVariants = {
  animate: {
    scale: [1, 1.05, 1],
    opacity: [0.5, 0.8, 0.5],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
};

const iconVariants = {
  hidden: { scale: 0, rotate: -180 },
  visible: (i: number) => ({
    scale: 1,
    rotate: 0,
    transition: {
      delay: i * 0.15,
      type: "spring",
      stiffness: 260,
      damping: 20,
    },
  }),
};

export const PremiumEmptyChat = memo<PremiumEmptyChatProps>(({
  title = "Your Messages",
  subtitle = "Select a conversation to start chatting or connect with someone new",
  showCTA = true,
  onStartChat,
  ctaText = "Start a Conversation",
  ctaHref,
  secondaryText,
  secondaryHref,
  className = "",
}) => {
  return (
    <div className={`flex flex-col items-center justify-center h-full p-8 bg-linear-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-850 dark:to-gray-900 ${className}`}>
      {/* Floating background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          variants={floatingVariants}
          animate="animate"
          className="absolute top-1/4 left-1/4 w-64 h-64 bg-[#39B54A]/5 rounded-full blur-3xl"
        />
        <motion.div
          variants={floatingVariants}
          animate="animate"
          style={{ animationDelay: "1s" }}
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl"
        />
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center max-w-md text-center">
        {/* Animated icon cluster */}
        <div className="relative mb-8">
          {/* Pulse ring */}
          <motion.div
            variants={pulseVariants}
            animate="animate"
            className="absolute inset-0 w-32 h-32 rounded-full bg-[#39B54A]/10"
          />
          
          {/* Main message icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="relative w-32 h-32 rounded-full bg-linear-to-br from-[#39B54A] to-[#2d913c] flex items-center justify-center shadow-xl shadow-[#39B54A]/20"
          >
            <MessageCircle className="w-14 h-14 text-white" />
          </motion.div>

          {/* Floating decorative icons */}
          <motion.div
            custom={0}
            variants={iconVariants}
            initial="hidden"
            animate="visible"
            className="absolute -top-2 -right-2 w-10 h-10 rounded-xl bg-white dark:bg-gray-800 shadow-lg flex items-center justify-center"
          >
            <Sparkles className="w-5 h-5 text-amber-500" />
          </motion.div>
          
          <motion.div
            custom={1}
            variants={iconVariants}
            initial="hidden"
            animate="visible"
            className="absolute -bottom-1 -left-3 w-9 h-9 rounded-lg bg-white dark:bg-gray-800 shadow-lg flex items-center justify-center"
          >
            <Heart className="w-4 h-4 text-rose-500" />
          </motion.div>
          
          <motion.div
            custom={2}
            variants={iconVariants}
            initial="hidden"
            animate="visible"
            className="absolute top-1/2 -right-4 w-8 h-8 rounded-lg bg-white dark:bg-gray-800 shadow-lg flex items-center justify-center"
          >
            <Users className="w-4 h-4 text-blue-500" />
          </motion.div>
        </div>

        {/* Title */}
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-2xl font-bold text-gray-900 dark:text-white mb-3"
        >
          {title}
        </motion.h2>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-gray-500 dark:text-gray-400 leading-relaxed mb-8"
        >
          {subtitle}
        </motion.p>

        {/* Features list */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="flex flex-wrap justify-center gap-3 mb-8"
        >
          {[
            { icon: "🔒", text: "End-to-end encrypted" },
            { icon: "📱", text: "Real-time messaging" },
            { icon: "🎥", text: "Video calls" },
          ].map((feature, i) => (
            <motion.div
              key={feature.text}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6 + i * 0.1 }}
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 rounded-full shadow-sm border border-gray-100 dark:border-gray-700"
            >
              <span className="text-sm">{feature.icon}</span>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {feature.text}
              </span>
            </motion.div>
          ))}
        </motion.div>

        {/* CTA Buttons */}
        {showCTA && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="flex flex-col sm:flex-row gap-3"
          >
            {ctaHref ? (
              <Link
                href={ctaHref}
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-linear-to-r from-[#39B54A] to-[#2d913c] text-white rounded-xl font-semibold shadow-lg shadow-[#39B54A]/20 hover:shadow-xl hover:shadow-[#39B54A]/30 hover:-translate-y-0.5 transition-all duration-200"
              >
                <Search className="w-5 h-5" />
                {ctaText}
              </Link>
            ) : onStartChat ? (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onStartChat}
                className="px-8 py-3.5 bg-linear-to-r from-[#39B54A] to-[#2d913c] text-white font-semibold rounded-xl shadow-lg shadow-[#39B54A]/20 hover:shadow-xl hover:shadow-[#39B54A]/30 transition-all duration-200"
              >
                {ctaText}
              </motion.button>
            ) : null}
            
            {secondaryText && secondaryHref && (
              <Link
                href={secondaryHref}
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 border-2 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:border-[#39B54A]/20 hover:bg-[#39B54A]/5 hover:-translate-y-0.5 transition-all duration-200"
              >
                {secondaryText}
              </Link>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
});

PremiumEmptyChat.displayName = "PremiumEmptyChat";

export default PremiumEmptyChat;
