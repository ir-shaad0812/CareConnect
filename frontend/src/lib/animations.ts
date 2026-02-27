// ============================================
// PREMIUM ANIMATION VARIANTS
// Reusable Framer Motion animation configurations
// ============================================

import { Variants, Transition } from "framer-motion";

// ============================================
// TRANSITION PRESETS
// ============================================

export const springTransition: Transition = {
  type: "spring",
  stiffness: 400,
  damping: 30,
};

export const smoothTransition: Transition = {
  type: "tween",
  duration: 0.3,
  ease: [0.4, 0, 0.2, 1],
};

export const bounceTransition: Transition = {
  type: "spring",
  stiffness: 500,
  damping: 15,
};

export const gentleTransition: Transition = {
  type: "spring",
  stiffness: 200,
  damping: 25,
};

// ============================================
// ENTRY/EXIT ANIMATIONS
// ============================================

export const fadeInUp: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
};

export const fadeInDown: Variants = {
  initial: { opacity: 0, y: -20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 10 },
};

export const fadeInLeft: Variants = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 20 },
};

export const fadeInRight: Variants = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
};

export const scaleIn: Variants = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
};

export const scaleInBounce: Variants = {
  initial: { opacity: 0, scale: 0.5 },
  animate: { 
    opacity: 1, 
    scale: 1,
    transition: bounceTransition,
  },
  exit: { opacity: 0, scale: 0.8 },
};

// ============================================
// MESSAGE ANIMATIONS
// ============================================

export const messageIn: Variants = {
  initial: { opacity: 0, y: 20, scale: 0.95 },
  animate: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: springTransition,
  },
  exit: { opacity: 0, scale: 0.95 },
};

export const messageOwn: Variants = {
  initial: { opacity: 0, x: 20, scale: 0.95 },
  animate: { 
    opacity: 1, 
    x: 0, 
    scale: 1,
    transition: springTransition,
  },
  exit: { opacity: 0, x: 10, scale: 0.95 },
};

export const messageOther: Variants = {
  initial: { opacity: 0, x: -20, scale: 0.95 },
  animate: { 
    opacity: 1, 
    x: 0, 
    scale: 1,
    transition: springTransition,
  },
  exit: { opacity: 0, x: -10, scale: 0.95 },
};

// ============================================
// STAGGER ANIMATIONS
// ============================================

export const staggerContainer: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
};

export const staggerItem: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: springTransition,
  },
};

export const listStagger: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.03,
    },
  },
  exit: {
    transition: {
      staggerChildren: 0.02,
      staggerDirection: -1,
    },
  },
};

// ============================================
// OVERLAY ANIMATIONS
// ============================================

export const overlayFade: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

export const modalScale: Variants = {
  initial: { opacity: 0, scale: 0.95, y: 20 },
  animate: { 
    opacity: 1, 
    scale: 1, 
    y: 0,
    transition: springTransition,
  },
  exit: { 
    opacity: 0, 
    scale: 0.95, 
    y: 20,
    transition: { duration: 0.15 },
  },
};

export const slideInFromBottom: Variants = {
  initial: { opacity: 0, y: "100%" },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: springTransition,
  },
  exit: { opacity: 0, y: "100%" },
};

export const slideInFromRight: Variants = {
  initial: { x: "100%" },
  animate: { 
    x: 0,
    transition: springTransition,
  },
  exit: { x: "100%" },
};

// ============================================
// BUTTON ANIMATIONS
// ============================================

export const buttonScale: Variants = {
  initial: { scale: 1 },
  hover: { scale: 1.05 },
  tap: { scale: 0.95 },
};

export const buttonPop: Variants = {
  initial: { scale: 1 },
  hover: { 
    scale: 1.08,
    transition: bounceTransition,
  },
  tap: { scale: 0.92 },
};

export const iconSpin: Variants = {
  initial: { rotate: 0 },
  hover: { rotate: 180 },
  tap: { rotate: 90 },
};

// ============================================
// NOTIFICATION ANIMATIONS
// ============================================

export const notificationSlide: Variants = {
  initial: { opacity: 0, x: 100, scale: 0.9 },
  animate: { 
    opacity: 1, 
    x: 0, 
    scale: 1,
    transition: springTransition,
  },
  exit: { 
    opacity: 0, 
    x: 100, 
    scale: 0.9,
    transition: { duration: 0.2 },
  },
};

export const toastPop: Variants = {
  initial: { opacity: 0, y: 50, scale: 0.9 },
  animate: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: bounceTransition,
  },
  exit: { 
    opacity: 0, 
    y: 20, 
    scale: 0.9,
    transition: { duration: 0.15 },
  },
};

// ============================================
// TYPING INDICATOR ANIMATIONS
// ============================================

export const typingDot: Variants = {
  initial: { y: 0 },
  animate: {
    y: [0, -8, 0],
    transition: {
      duration: 0.6,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
};

// ============================================
// REACTION ANIMATIONS
// ============================================

export const reactionPop: Variants = {
  initial: { scale: 0, opacity: 0 },
  animate: { 
    scale: 1, 
    opacity: 1,
    transition: bounceTransition,
  },
  exit: { scale: 0, opacity: 0 },
};

export const reactionPickerItem: Variants = {
  initial: { scale: 0.5, opacity: 0 },
  animate: { 
    scale: 1, 
    opacity: 1,
    transition: bounceTransition,
  },
  hover: { scale: 1.3 },
  tap: { scale: 0.9 },
};

// ============================================
// PULSE ANIMATIONS
// ============================================

export const pulse: Variants = {
  initial: { scale: 1 },
  animate: {
    scale: [1, 1.05, 1],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
};

export const glow: Variants = {
  initial: { opacity: 0.6 },
  animate: {
    opacity: [0.6, 1, 0.6],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
};

// ============================================
// ONLINE STATUS ANIMATIONS
// ============================================

export const onlineIndicator: Variants = {
  initial: { scale: 0, opacity: 0 },
  animate: { 
    scale: 1, 
    opacity: 1,
    transition: bounceTransition,
  },
  exit: { scale: 0, opacity: 0 },
};

export const onlinePulse: Variants = {
  initial: { scale: 1, opacity: 1 },
  animate: {
    scale: [1, 1.2, 1],
    opacity: [1, 0.5, 1],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
};

// ============================================
// UNREAD BADGE ANIMATIONS
// ============================================

export const badgeBounce: Variants = {
  initial: { scale: 0 },
  animate: { 
    scale: 1,
    transition: bounceTransition,
  },
  update: {
    scale: [1, 1.2, 1],
    transition: { duration: 0.2 },
  },
};

// ============================================
// CALL RING ANIMATION
// ============================================

export const callRing: Variants = {
  initial: { scale: 1, opacity: 0.6 },
  animate: {
    scale: [1, 1.5, 2],
    opacity: [0.6, 0.3, 0],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "easeOut",
    },
  },
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Create staggered delay for list items
 */
export const getStaggerDelay = (index: number, baseDelay = 0.03) => ({
  transition: { delay: index * baseDelay },
});

/**
 * Create custom spring transition
 */
export const createSpring = (stiffness = 400, damping = 30): Transition => ({
  type: "spring",
  stiffness,
  damping,
});

/**
 * Reduced motion safe variants
 * Returns static values if user prefers reduced motion
 */
export const reducedMotionSafe = (variants: Variants): Variants => {
  if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
    };
  }
  return variants;
};
