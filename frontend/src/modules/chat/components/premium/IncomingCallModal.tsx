// ============================================
// INCOMING CALL MODAL
// Handles incoming voice/video call notifications
// ============================================

"use client";

import React, { memo, useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Phone,
  PhoneOff,
  Video,
  Volume2,
  VolumeX,
} from "lucide-react";

// ============================================
// TYPES
// ============================================

interface Caller {
  _id: string;
  fullName: string;
  avatar?: string;
  role?: string;
}

interface IncomingCallModalProps {
  isOpen: boolean;
  caller: Caller | null;
  callType: "audio" | "video";
  conversationId: string;
  onAccept: () => void;
  onDecline: () => void;
  onTimeout?: () => void;
  timeoutDuration?: number; // in seconds
  ringtoneUrl?: string;
}

// ============================================
// ANIMATION VARIANTS
// ============================================

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

const modalVariants = {
  hidden: { opacity: 0, scale: 0.8, y: 50 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 30,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.8,
    y: 50,
    transition: { duration: 0.2 },
  },
};

const pulseVariants = {
  pulse: {
    scale: [1, 1.1, 1],
    opacity: [0.5, 0.3, 0.5],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
};

const ringVariants = {
  ring: {
    rotate: [0, 15, -15, 15, -15, 0],
    transition: {
      duration: 0.5,
      repeat: Infinity,
      repeatDelay: 0.5,
    },
  },
};

// ============================================
// AVATAR COMPONENT
// ============================================

const CallerAvatar = memo<{ caller: Caller; callType: "audio" | "video" }>(
  ({ caller, callType }) => {
    return (
      <div className="relative">
        {/* Pulsing rings */}
        <motion.div
          variants={pulseVariants}
          animate="pulse"
          className="absolute inset-0 w-32 h-32 bg-[#39B54A] rounded-full"
        />
        <motion.div
          variants={pulseVariants}
          animate="pulse"
          className="absolute inset-0 w-32 h-32 bg-[#39B54A] rounded-full"
          style={{ animationDelay: "0.5s" }}
        />

        {/* Avatar */}
        <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-xl z-10">
          {caller.avatar ? (
            <img
              src={caller.avatar}
              alt={caller.fullName}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-linear-to-br from-[#39B54A] to-[#2d913c] flex items-center justify-center">
              <span className="text-4xl font-bold text-white">
                {caller.fullName.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
        </div>

        {/* Call type indicator */}
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 z-20">
          <motion.div
            variants={ringVariants}
            animate="ring"
            className={`p-3 rounded-full shadow-lg ${
              callType === "video"
                ? "bg-blue-500"
                : "bg-[#39B54A]"
            }`}
          >
            {callType === "video" ? (
              <Video className="w-5 h-5 text-white" />
            ) : (
              <Phone className="w-5 h-5 text-white" />
            )}
          </motion.div>
        </div>
      </div>
    );
  }
);

CallerAvatar.displayName = "CallerAvatar";

// ============================================
// MAIN COMPONENT
// ============================================

export const IncomingCallModal = memo<IncomingCallModalProps>(({
  isOpen,
  caller,
  callType,
  conversationId: _conversationId,
  onAccept,
  onDecline,
  onTimeout,
  timeoutDuration = 30,
  ringtoneUrl = "/sounds/ringtone.mp3",
}) => {
  const [timeRemaining, setTimeRemaining] = useState(timeoutDuration);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setIsMuted(false);
      setTimeRemaining(timeoutDuration);
    }
  }, [isOpen, timeoutDuration]);

  // Handle ringtone
  useEffect(() => {
    if (!isOpen) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      return;
    }

    // Create and play ringtone
    try {
      audioRef.current = new Audio(ringtoneUrl);
      audioRef.current.loop = true;
      audioRef.current.volume = isMuted ? 0 : 1;
      audioRef.current.play().catch(() => {
        // Autoplay may be blocked - that's okay
      });
    } catch {
      // Audio not available
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current = null;
      }
    };
  }, [isOpen, ringtoneUrl]);

  // Update volume when muted changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : 1;
    }
  }, [isMuted]);

  // Timeout countdown
  useEffect(() => {
    if (!isOpen) {
      setTimeRemaining(timeoutDuration);
      return;
    }

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
          }
          onTimeout?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, timeoutDuration, onTimeout]);

  // Handle mute toggle
  const handleToggleMute = useCallback(() => {
    setIsMuted((prev) => !prev);
  }, []);

  // Handle accept
  const handleAccept = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    onAccept();
  }, [onAccept]);

  // Handle decline
  const handleDecline = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    onDecline();
  }, [onDecline]);

  if (!caller) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="fixed inset-0 z-100 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <motion.div
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="bg-white rounded-3xl shadow-2xl overflow-hidden max-w-sm w-full"
          >
            {/* Header with gradient */}
            <div className="bg-linear-to-br from-[#39B54A] via-[#2d913c] to-[#1f6b2a] pt-8 pb-16 px-6 relative">
              {/* Decorative circles */}
              <div className="absolute top-10 left-10 w-20 h-20 bg-white/10 rounded-full" />
              <div className="absolute top-5 right-5 w-10 h-10 bg-white/10 rounded-full" />
              <div className="absolute bottom-10 right-10 w-16 h-16 bg-white/10 rounded-full" />

              {/* Mute button */}
              <button
                type="button"
                onClick={handleToggleMute}
                aria-label={isMuted ? "Unmute ringtone" : "Mute ringtone"}
                className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/30 rounded-full text-white transition-colors"
              >
                {isMuted ? (
                  <VolumeX className="w-5 h-5" />
                ) : (
                  <Volume2 className="w-5 h-5" />
                )}
              </button>

              {/* Call type badge */}
              <div className="text-center mb-6">
                <span className="px-4 py-1.5 bg-white/20 text-white text-sm font-medium rounded-full">
                  Incoming {callType === "video" ? "Video" : "Voice"} Call
                </span>
              </div>
            </div>

            {/* Avatar section - overlapping header */}
            <div className="flex justify-center -mt-16 mb-4 relative z-10">
              <CallerAvatar caller={caller} callType={callType} />
            </div>

            {/* Caller info */}
            <div className="text-center px-6 pt-4 pb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-1">
                {caller.fullName}
              </h2>
              {caller.role && (
                <p className="text-sm text-gray-500 capitalize mb-4">
                  {caller.role}
                </p>
              )}

              {/* Countdown timer */}
              <div className="mb-6">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-full">
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 1 }}
                    className="w-2 h-2 bg-red-500 rounded-full"
                  />
                  <span className="text-sm text-gray-600">
                    Auto-decline in{" "}
                    <span className="font-semibold text-gray-900">
                      {timeRemaining}s
                    </span>
                  </span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-center gap-6">
                {/* Decline Button */}
                <motion.button
                  type="button"
                  aria-label="Decline call"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleDecline}
                  className="w-16 h-16 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg shadow-red-500/30 flex items-center justify-center transition-colors"
                >
                  <PhoneOff className="w-7 h-7" />
                </motion.button>

                {/* Accept Button */}
                <motion.button
                  type="button"
                  aria-label={callType === "video" ? "Accept video call" : "Accept voice call"}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleAccept}
                  className={`w-20 h-20 rounded-full shadow-lg flex items-center justify-center transition-colors ${
                    callType === "video"
                      ? "bg-blue-500 hover:bg-blue-600 shadow-blue-500/30"
                      : "bg-[#39B54A] hover:bg-[#2d913c] shadow-[#39B54A]/30"
                  }`}
                >
                  {callType === "video" ? (
                    <Video className="w-8 h-8 text-white" />
                  ) : (
                    <Phone className="w-8 h-8 text-white" />
                  )}
                </motion.button>
              </div>

              {/* Helper text */}
              <p className="mt-6 text-xs text-gray-400">
                {callType === "video"
                  ? "Your camera and microphone will be enabled"
                  : "Your microphone will be enabled"}
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

IncomingCallModal.displayName = "IncomingCallModal";

export default IncomingCallModal;
