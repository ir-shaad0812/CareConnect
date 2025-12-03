// ============================================
// INCOMING CALL MODAL
// Premium UI for receiving audio/video calls
// ============================================

"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Phone,
  PhoneOff,
  Video,
  Volume2,
} from "lucide-react";
import Image from "next/image";

interface IncomingCallModalProps {
  isOpen: boolean;
  callerName: string;
  callerAvatar?: string;
  callerRole?: string;
  callType: "audio" | "video";
  onAccept: () => void;
  onDecline: () => void;
}

// Ring animation variants
const ringVariants = {
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

// Pulse animation for avatar
const pulseVariants = {
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

// Button hover variants
const buttonVariants = {
  initial: { scale: 1 },
  hover: { scale: 1.1 },
  tap: { scale: 0.95 },
};

export function IncomingCallModal({
  isOpen,
  callerName,
  callerAvatar,
  callerRole,
  callType,
  onAccept,
  onDecline,
}: IncomingCallModalProps) {
  const [seconds, setSeconds] = useState(0);

  // Timer for call duration
  useEffect(() => {
    if (!isOpen) {
      setSeconds(0);
      return;
    }

    const interval = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen]);

  // Auto-decline after 45 seconds
  useEffect(() => {
    if (seconds >= 45) {
      onDecline();
    }
  }, [seconds, onDecline]);

  // Play ringtone effect (browser notification sound)
  useEffect(() => {
    if (!isOpen) return;

    // Request notification permission and play sound
    if ("Notification" in window && Notification.permission === "granted") {
      // Browser will handle notification sound
    }

    // Vibrate on mobile if supported
    if ("vibrate" in navigator) {
      const vibrationPattern = [200, 100, 200, 100, 200, 100, 200];
      const vibrationInterval = setInterval(() => {
        navigator.vibrate(vibrationPattern);
      }, 2000);

      return () => {
        clearInterval(vibrationInterval);
        navigator.vibrate(0); // Stop vibration
      };
    }

    return undefined;
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center"
      >
        {/* Backdrop with gradient */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 bg-linear-to-br from-gray-900/95 via-gray-900/98 to-black"
        />

        {/* Content */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="relative z-10 flex flex-col items-center px-8 py-12"
        >
          {/* Call type indicator */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex items-center gap-2 mb-8"
          >
            <div className="p-2 bg-white/10 rounded-full">
              {callType === "video" ? (
                <Video className="w-5 h-5 text-white" />
              ) : (
                <Phone className="w-5 h-5 text-white" />
              )}
            </div>
            <span className="text-white/80 text-lg font-medium">
              Incoming {callType === "video" ? "Video" : "Audio"} Call
            </span>
          </motion.div>

          {/* Avatar with ring effect */}
          <div className="relative mb-8">
            {/* Animated rings */}
            <motion.div
              variants={ringVariants}
              initial="initial"
              animate="animate"
              className="absolute inset-0 rounded-full bg-[#39B54A]"
              style={{ margin: "-20px" }}
            />
            <motion.div
              variants={ringVariants}
              initial="initial"
              animate="animate"
              className="absolute inset-0 rounded-full bg-[#39B54A]"
              style={{ margin: "-20px", animationDelay: "0.5s" }}
            />
            <motion.div
              variants={ringVariants}
              initial="initial"
              animate="animate"
              className="absolute inset-0 rounded-full bg-[#39B54A]"
              style={{ margin: "-20px", animationDelay: "1s" }}
            />

            {/* Avatar */}
            <motion.div
              variants={pulseVariants}
              initial="initial"
              animate="animate"
              className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-white/20 shadow-2xl"
            >
              {callerAvatar ? (
                <Image
                  src={callerAvatar}
                  alt={callerName}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full bg-linear-to-br from-[#39B54A] to-[#2d913c] flex items-center justify-center">
                  <span className="text-white text-4xl font-bold">
                    {callerName.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </motion.div>
          </div>

          {/* Caller info */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-center mb-10"
          >
            <h2 className="text-white text-2xl font-bold mb-2">{callerName}</h2>
            {callerRole && (
              <p className="text-white/60 text-sm capitalize">{callerRole}</p>
            )}
            <p className="text-white/40 text-sm mt-2">
              Ringing... {seconds}s
            </p>
          </motion.div>

          {/* Call actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex items-center gap-8"
          >
            {/* Decline button */}
            <div className="flex flex-col items-center gap-2">
              <motion.button
                variants={buttonVariants}
                initial="initial"
                whileHover="hover"
                whileTap="tap"
                onClick={onDecline}
                className="w-16 h-16 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center shadow-lg shadow-red-500/30 transition-colors"
              >
                <PhoneOff className="w-7 h-7 text-white" />
              </motion.button>
              <span className="text-white/60 text-sm">Decline</span>
            </div>

            {/* Accept button */}
            <div className="flex flex-col items-center gap-2">
              <motion.button
                variants={buttonVariants}
                initial="initial"
                whileHover="hover"
                whileTap="tap"
                onClick={onAccept}
                className="w-16 h-16 bg-[#39B54A] hover:bg-[#2d913c] rounded-full flex items-center justify-center shadow-lg shadow-[#39B54A]/30 transition-colors"
              >
                {callType === "video" ? (
                  <Video className="w-7 h-7 text-white" />
                ) : (
                  <Phone className="w-7 h-7 text-white" />
                )}
              </motion.button>
              <span className="text-white/60 text-sm">Accept</span>
            </div>
          </motion.div>

          {/* Sound indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-8 flex items-center gap-2 text-white/40"
          >
            <Volume2 className="w-4 h-4" />
            <span className="text-xs">Sound on</span>
          </motion.div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default IncomingCallModal;
