"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

// ============================================
// TYPES
// ============================================

export interface DiscoveryCallButtonProps {
  /** Main button text */
  text?: string;
  /** Text shown on hover hint */
  hintText?: string;
  /** Text inside the circular badge */
  badgeText?: string;
  /** Avatar image URL */
  avatarSrc?: string;
  /** Avatar fallback initials */
  avatarFallback?: string;
  /** Link URL when clicked */
  href?: string;
  /** onClick handler */
  onClick?: () => void;
  /** Button background color */
  backgroundColor?: string;
  /** Button hover background color */
  hoverBackgroundColor?: string;
  /** Text color */
  textColor?: string;
  /** Hover text color */
  hoverTextColor?: string;
  /** Border radius */
  borderRadius?: number;
  /** Border color */
  borderColor?: string;
  /** Border width */
  borderWidth?: number;
  /** Badge background color */
  badgeBackgroundColor?: string;
  /** Badge text color */
  badgeTextColor?: string;
  /** Custom className */
  className?: string;
}

// ============================================
// AVATAR COMPONENT
// ============================================

const Avatar = ({
  src,
  fallback,
  size = 40,
}: {
  src?: string;
  fallback?: string;
  size?: number;
}) => {
  const initials = fallback?.slice(0, 2).toUpperCase() || "ME";

  if (src) {
    return (
      <div
        className="relative rounded-full overflow-hidden ring-2 ring-white shadow-lg"
        style={{ width: size, height: size }}
      >
        <Image src={src} alt="Avatar" fill className="object-cover" />
      </div>
    );
  }

  return (
    <div
      className="flex items-center justify-center rounded-full bg-linear-to-br from-primary-500 to-secondary-500 text-white font-semibold ring-2 ring-white shadow-lg"
      style={{ width: size, height: size, fontSize: size * 0.35 }}
    >
      {initials}
    </div>
  );
};

// ============================================
// MAIN DISCOVERY CALL BUTTON COMPONENT
// ============================================

export function DiscoveryCallButton({
  text = "Book a Call",
  hintText = "Let's talk…",
  badgeText = "You",
  avatarSrc,
  avatarFallback = "CC",
  href,
  onClick,
  backgroundColor = "#1F2937",
  hoverBackgroundColor = "#4461F2",
  textColor = "#FFFFFF",
  hoverTextColor = "#FFFFFF",
  borderRadius = 50,
  borderColor = "transparent",
  borderWidth = 0,
  badgeBackgroundColor = "#FFFFFF",
  badgeTextColor = "#1F2937",
  className = "",
}: DiscoveryCallButtonProps) {
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (href) {
      window.open(href, "_blank");
    }
  };

  return (
    <motion.button
      className={`relative flex items-center justify-center gap-3 px-6 py-3 font-medium transition-colors overflow-hidden ${className}`}
      style={{
        backgroundColor: isHovered ? hoverBackgroundColor : backgroundColor,
        color: isHovered ? hoverTextColor : textColor,
        borderRadius,
        borderColor,
        borderWidth,
        borderStyle: borderWidth > 0 ? "solid" : "none",
        minWidth: isHovered ? 220 : 160,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
      whileTap={{ scale: 0.98 }}
      animate={{
        minWidth: isHovered ? 260 : 160,
      }}
      transition={{
        type: "spring",
        stiffness: 400,
        damping: 30,
      }}
    >
      {/* Avatar - slides in from left on hover */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, x: -20, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -20, scale: 0.8 }}
            transition={{ type: "spring", stiffness: 500, damping: 25 }}
            className="flex items-center"
          >
            <div className="relative">
              <Avatar
                {...(avatarSrc !== undefined ? { src: avatarSrc } : {})}
                fallback={avatarFallback}
                size={36}
              />
              {/* Badge */}
              <motion.div
                className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold shadow-md"
                style={{
                  backgroundColor: badgeBackgroundColor,
                  color: badgeTextColor,
                }}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, type: "spring", stiffness: 500 }}
              >
                {badgeText}
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Text */}
      <motion.span
        className="font-semibold whitespace-nowrap"
        animate={{
          x: isHovered ? 0 : 0,
        }}
      >
        {text}
      </motion.span>

      {/* Hint Text - slides in from right on hover */}
      <AnimatePresence>
        {isHovered && (
          <motion.span
            className="text-sm opacity-80 whitespace-nowrap"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 0.9, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ type: "spring", stiffness: 400, damping: 25, delay: 0.05 }}
          >
            {hintText}
          </motion.span>
        )}
      </AnimatePresence>

      {/* Arrow Icon */}
      <motion.svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        animate={{
          x: isHovered ? 4 : 0,
          opacity: isHovered ? 0 : 1,
        }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M17 8l4 4m0 0l-4 4m4-4H3"
        />
      </motion.svg>
    </motion.button>
  );
}

// ============================================
// VARIANT: DISCOVERY CALL BUTTON WITH GLOW
// ============================================

export function DiscoveryCallButtonGlow({
  text = "Schedule a Discovery Call",
  hintText = "Let's build together…",
  badgeText = "You",
  avatarSrc,
  avatarFallback = "CC",
  href,
  onClick,
  className = "",
}: Omit<DiscoveryCallButtonProps, "backgroundColor" | "hoverBackgroundColor">) {
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (href) {
      window.open(href, "_blank");
    }
  };

  return (
    <div className="relative">
      {/* Glow effect */}
      <motion.div
        className="absolute inset-0 rounded-full bg-linear-to-r from-primary-500 to-secondary-500 blur-xl"
        animate={{
          opacity: isHovered ? 0.6 : 0,
          scale: isHovered ? 1.1 : 1,
        }}
        transition={{ duration: 0.3 }}
      />

      <motion.button
        className={`relative flex items-center justify-center gap-3 px-8 py-4 font-medium bg-linear-to-r from-primary-500 to-secondary-500 text-white overflow-hidden ${className}`}
        style={{
          borderRadius: 50,
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleClick}
        whileTap={{ scale: 0.98 }}
        animate={{
          paddingLeft: isHovered ? 24 : 32,
          paddingRight: isHovered ? 32 : 32,
        }}
        transition={{
          type: "spring",
          stiffness: 400,
          damping: 30,
        }}
      >
        {/* Avatar group on hover */}
        <AnimatePresence>
          {isHovered && (
            <motion.div
              initial={{ opacity: 0, x: -30, scale: 0.5 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -30, scale: 0.5 }}
              transition={{ type: "spring", stiffness: 500, damping: 25 }}
              className="flex items-center -space-x-2"
            >
              <Avatar
                {...(avatarSrc !== undefined ? { src: avatarSrc } : {})}
                fallback={avatarFallback}
                size={32}
              />
              <motion.div
                className="w-8 h-8 rounded-full bg-white text-gray-900 flex items-center justify-center text-[10px] font-bold ring-2 ring-white shadow-lg"
                initial={{ scale: 0, x: -10 }}
                animate={{ scale: 1, x: 0 }}
                transition={{ delay: 0.1, type: "spring", stiffness: 500 }}
              >
                {badgeText}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Text content */}
        <div className="flex items-center gap-2">
          <span className="font-semibold whitespace-nowrap">{text}</span>

          <AnimatePresence>
            {isHovered && (
              <motion.span
                className="text-sm text-white/80 whitespace-nowrap"
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
              >
                — {hintText}
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Animated arrow */}
        <motion.div
          animate={{
            x: isHovered ? 4 : 0,
            rotate: isHovered ? -45 : 0,
          }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </motion.div>
      </motion.button>
    </div>
  );
}

// ============================================
// VARIANT: MINIMAL DISCOVERY BUTTON
// ============================================

export function DiscoveryCallButtonMinimal({
  text = "Let's Talk",
  hintText = "I'm available",
  avatarSrc,
  avatarFallback = "CC",
  href,
  onClick,
  className = "",
}: Pick<DiscoveryCallButtonProps, "text" | "hintText" | "avatarSrc" | "avatarFallback" | "href" | "onClick" | "className">) {
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (href) {
      window.open(href, "_blank");
    }
  };

  return (
    <motion.button
      className={`group relative flex items-center gap-3 px-5 py-2.5 bg-white border border-gray-200 rounded-full hover:border-primary-500/30 hover:shadow-lg transition-all ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
      whileTap={{ scale: 0.98 }}
    >
      {/* Avatar with status dot */}
      <div className="relative">
        <Avatar
          {...(avatarSrc !== undefined ? { src: avatarSrc } : {})}
          fallback={avatarFallback}
          size={32}
        />
        <motion.div
          className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full ring-2 ring-white"
          animate={{
            scale: isHovered ? [1, 1.2, 1] : 1,
          }}
          transition={{
            duration: 0.5,
            repeat: isHovered ? Infinity : 0,
            repeatDelay: 1,
          }}
        />
      </div>

      {/* Text */}
      <div className="flex flex-col items-start">
        <span className="font-semibold text-gray-900 text-sm group-hover:text-primary-500 transition-colors">
          {text}
        </span>
        <motion.span
          className="text-xs text-gray-500"
          animate={{
            opacity: isHovered ? 1 : 0.7,
          }}
        >
          {isHovered ? hintText : "Available now"}
        </motion.span>
      </div>

      {/* Arrow */}
      <motion.svg
        className="w-4 h-4 text-gray-400 group-hover:text-primary-500"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        animate={{
          x: isHovered ? 3 : 0,
        }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </motion.svg>
    </motion.button>
  );
}

// ============================================
// VARIANT: FLOATING DISCOVERY BUTTON (Fixed Position)
// ============================================

export function FloatingDiscoveryButton({
  text = "Book a Call",
  hintText = "Let's connect!",
  avatarSrc,
  avatarFallback = "CC",
  href,
  onClick,
  position = "bottom-right",
  className = "",
}: DiscoveryCallButtonProps & {
  position?: "bottom-right" | "bottom-left" | "bottom-center";
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  const positionClasses = {
    "bottom-right": "bottom-6 right-6",
    "bottom-left": "bottom-6 left-6",
    "bottom-center": "bottom-6 left-1/2 -translate-x-1/2",
  };

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (href) {
      window.open(href, "_blank");
    }
  };

  return (
    <motion.div
      className={`fixed ${positionClasses[position]} z-50 ${className}`}
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 1, type: "spring", stiffness: 300, damping: 25 }}
    >
      {/* Pulse ring */}
      <motion.div
        className="absolute inset-0 rounded-full bg-primary-500"
        animate={{
          scale: [1, 1.5, 1.5],
          opacity: [0.4, 0, 0],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeOut",
        }}
      />

      <motion.button
        className="relative flex items-center gap-3 bg-linear-to-r from-primary-500 to-secondary-500 text-white rounded-full shadow-2xl shadow-[#4461F2]/30"
        style={{
          padding: isExpanded ? "12px 24px" : "12px",
        }}
        onMouseEnter={() => {
          setIsExpanded(true);
        }}
        onMouseLeave={() => {
          setIsExpanded(false);
        }}
        onClick={handleClick}
        whileTap={{ scale: 0.95 }}
        animate={{
          width: isExpanded ? "auto" : 56,
        }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
      >
        {/* Avatar/Icon */}
        <div className="relative shrink-0">
          {isExpanded ? (
            <Avatar
              {...(avatarSrc !== undefined ? { src: avatarSrc } : {})}
              fallback={avatarFallback}
              size={32}
            />
          ) : (
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
          )}
        </div>

        {/* Expanded content */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              className="flex flex-col items-start whitespace-nowrap"
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            >
              <span className="font-semibold text-sm">{text}</span>
              <span className="text-xs text-white/80">{hintText}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    </motion.div>
  );
}

export default DiscoveryCallButton;
