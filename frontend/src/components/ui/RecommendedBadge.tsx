"use client";

import { motion } from "framer-motion";

interface RecommendedBadgeProps {
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

export default function RecommendedBadge({
  size = "md",
  showLabel = true,
  className = "",
}: RecommendedBadgeProps) {
  const sizes = {
    sm: { icon: "w-3 h-3", text: "text-[10px]", px: "px-1.5 py-0.5", gap: "gap-1" },
    md: { icon: "w-4 h-4", text: "text-xs",     px: "px-2.5 py-1",   gap: "gap-1.5" },
    lg: { icon: "w-5 h-5", text: "text-sm",     px: "px-3 py-1.5",   gap: "gap-2" },
  };
  const s = sizes[size];

  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.25 }}
      className={`inline-flex items-center ${s.gap} ${s.px} rounded-full bg-gradient-to-r from-amber-400 to-orange-400 text-white font-bold shadow-sm ${className}`}
    >
      {/* Star icon */}
      <svg
        className={`${s.icon} shrink-0`}
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
      {showLabel && <span className={s.text}>Recommended</span>}
    </motion.span>
  );
}
