// ============================================
// MESSAGE SENT ANIMATION
// Premium feedback animation when message is sent
// ============================================

"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, CheckCheck, Send, Sparkles } from "lucide-react";

interface MessageSentAnimationProps {
  show: boolean;
  status: "sending" | "sent" | "delivered" | "read" | "error";
  onComplete?: () => void;
}

export function MessageSentAnimation({
  show,
  status,
  onComplete,
}: MessageSentAnimationProps) {
  const [phase, setPhase] = useState<"initial" | "flying" | "landing" | "complete">("initial");

  useEffect(() => {
    if (!show) {
      setPhase("initial");
      return;
    }

    // Animate through phases
    setPhase("flying");
    
    const flyTimer = setTimeout(() => {
      setPhase("landing");
    }, 300);

    const landTimer = setTimeout(() => {
      setPhase("complete");
      onComplete?.();
    }, 600);

    return () => {
      clearTimeout(flyTimer);
      clearTimeout(landTimer);
    };
  }, [show, onComplete]);

  const getStatusIcon = () => {
    switch (status) {
      case "sending":
        return <Send className="w-4 h-4" />;
      case "sent":
        return <Check className="w-4 h-4" />;
      case "delivered":
        return <CheckCheck className="w-4 h-4" />;
      case "read":
        return <CheckCheck className="w-4 h-4 text-blue-500" />;
      default:
        return <Check className="w-4 h-4" />;
    }
  };

  return (
    <AnimatePresence>
      {show && phase !== "complete" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center"
        >
          {/* Flying message icon */}
          <motion.div
            initial={{ scale: 0.5, x: 0, y: 100, opacity: 0 }}
            animate={{
              scale: phase === "flying" ? 1 : 0.8,
              x: phase === "landing" ? 50 : 0,
              y: phase === "flying" ? -50 : phase === "landing" ? -100 : 100,
              opacity: 1,
            }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 20,
            }}
            className="relative"
          >
            {/* Main icon */}
            <motion.div
              animate={{
                rotate: phase === "flying" ? [0, -10, 10, 0] : 0,
              }}
              transition={{ duration: 0.3, repeat: phase === "flying" ? 1 : 0 }}
              className="w-12 h-12 bg-linear-to-br from-[#39B54A] to-[#2d913c] rounded-full flex items-center justify-center text-white shadow-lg shadow-[#39B54A]/30"
            >
              {getStatusIcon()}
            </motion.div>

            {/* Sparkle effects */}
            {phase === "landing" && (
              <>
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1.5, opacity: [0, 1, 0] }}
                  transition={{ duration: 0.4 }}
                  className="absolute -top-2 -right-2"
                >
                  <Sparkles className="w-4 h-4 text-yellow-400" />
                </motion.div>
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1.5, opacity: [0, 1, 0] }}
                  transition={{ duration: 0.4, delay: 0.1 }}
                  className="absolute -bottom-1 -left-2"
                >
                  <Sparkles className="w-3 h-3 text-yellow-400" />
                </motion.div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ============================================
// MESSAGE STATUS INDICATOR
// Animated status changes for messages
// ============================================

interface MessageStatusIndicatorProps {
  status: "sending" | "sent" | "delivered" | "read" | "error";
  animate?: boolean;
}

export function MessageStatusIndicator({
  status,
  animate = true,
}: MessageStatusIndicatorProps) {
  const variants = {
    initial: { scale: 0.5, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 0.5, opacity: 0 },
  };

  const transition = {
    type: "spring" as const,
    stiffness: 500,
    damping: 25,
  };

  return (
    <AnimatePresence mode="wait">
      <motion.span
        key={status}
        {...(animate ? { variants } : {})}
        initial={animate ? "initial" : false}
        animate="animate"
        {...(animate ? { exit: "exit" as const } : {})}
        transition={transition}
        className="inline-flex items-center"
      >
        {status === "sending" && (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-3.5 h-3.5 border-2 border-gray-300 border-t-[#39B54A] rounded-full"
          />
        )}
        {status === "sent" && (
          <Check className="w-3.5 h-3.5 text-gray-400" />
        )}
        {status === "delivered" && (
          <CheckCheck className="w-3.5 h-3.5 text-gray-400" />
        )}
        {status === "read" && (
          <CheckCheck className="w-3.5 h-3.5 text-blue-500" />
        )}
        {status === "error" && (
          <motion.span
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 0.5, repeat: 2 }}
            className="w-3.5 h-3.5 bg-red-500 rounded-full flex items-center justify-center text-white text-[8px] font-bold"
          >
            !
          </motion.span>
        )}
      </motion.span>
    </AnimatePresence>
  );
}

// ============================================
// SENDING INDICATOR
// Shows while message is being sent
// ============================================

export function SendingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex items-center gap-2 text-sm text-gray-500"
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        className="w-4 h-4 border-2 border-gray-200 border-t-[#39B54A] rounded-full"
      />
      <span>Sending...</span>
    </motion.div>
  );
}

export default MessageSentAnimation;
