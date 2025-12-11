// ============================================
// PREMIUM CALL OVERLAY
// FaceTime/WhatsApp-style call UI
// ============================================

"use client";

import React, { useState, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Phone,
  PhoneOff,
  Video,
  VideoOff,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  RotateCcw,
  Maximize2,
  Minimize2,
} from "lucide-react";

// ============================================
// TYPES
// ============================================

interface PremiumCallOverlayProps {
  isOpen: boolean;
  callType: "audio" | "video";
  callState: "ringing" | "connecting" | "connected" | "ended";
  remoteName: string;
  remoteAvatar?: string;
  duration?: number;
  isRemoteMuted?: boolean;
  isRemoteVideoOff?: boolean;
  onAnswer?: () => void;
  onDecline?: () => void;
  onEnd?: () => void;
  onToggleMute?: () => void;
  onToggleVideo?: () => void;
  onToggleSpeaker?: () => void;
  onFlipCamera?: () => void;
  onMinimize?: () => void;
  onMaximize?: () => void;
  children?: React.ReactNode;
}

// ============================================
// ANIMATION VARIANTS
// ============================================

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.3 },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.2 },
  },
};

const contentVariants = {
  hidden: { opacity: 0, scale: 0.9, y: 20 },
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
    scale: 0.9,
    y: 20,
    transition: { duration: 0.2 },
  },
};

const pulseVariants = {
  pulse: {
    scale: [1, 1.1, 1],
    opacity: [0.7, 0.4, 0.7],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
};

const buttonVariants = {
  idle: { scale: 1 },
  hover: { scale: 1.1 },
  tap: { scale: 0.95 },
};

// ============================================
// HELPER FUNCTIONS
// ============================================

const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
};

// ============================================
// MAIN COMPONENT
// ============================================

export const PremiumCallOverlay = memo<PremiumCallOverlayProps>(({
  isOpen,
  callType,
  callState,
  remoteName,
  remoteAvatar,
  duration = 0,
  isRemoteMuted = false,
  isRemoteVideoOff = false,
  onAnswer,
  onDecline,
  onEnd,
  onToggleMute,
  onToggleVideo,
  onToggleSpeaker,
  onFlipCamera,
  onMinimize,
  onMaximize,
  children,
}) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(callType === "audio");
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const handleToggleMute = () => {
    setIsMuted(!isMuted);
    onToggleMute?.();
  };

  const handleToggleVideo = () => {
    setIsVideoOff(!isVideoOff);
    onToggleVideo?.();
  };

  const handleToggleSpeaker = () => {
    setIsSpeakerOn(!isSpeakerOn);
    onToggleSpeaker?.();
  };

  const handleMinimize = () => {
    setIsMinimized(true);
    onMinimize?.();
  };

  const handleMaximize = () => {
    setIsMinimized(false);
    onMaximize?.();
  };

  const getStateText = () => {
    switch (callState) {
      case "ringing":
        return callType === "video" ? "Incoming Video Call..." : "Incoming Call...";
      case "connecting":
        return "Connecting...";
      case "connected":
        return formatDuration(duration);
      case "ended":
        return "Call Ended";
      default:
        return "";
    }
  };

  // Minimized view
  if (isMinimized) {
    return (
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, x: 100 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.8, x: 100 }}
            drag
            dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
            className="fixed bottom-24 right-4 z-50 w-36 h-48 bg-gray-900 rounded-2xl shadow-2xl overflow-hidden cursor-move"
            onClick={handleMaximize}
          >
            {/* Video/Avatar */}
            {children || (
              <div className="absolute inset-0 flex items-center justify-center bg-linear-to-br from-[#39B54A] to-[#2d913c]">
                {remoteAvatar ? (
                  <img src={remoteAvatar} alt={remoteName} className="w-16 h-16 rounded-full" />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-white text-2xl font-bold">
                    {remoteName[0]}
                  </div>
                )}
              </div>
            )}

            {/* Duration */}
            <div className="absolute bottom-2 left-0 right-0 text-center">
              <span className="text-xs text-white bg-black/50 px-2 py-1 rounded-full">
                {formatDuration(duration)}
              </span>
            </div>

            {/* Expand button */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className="absolute top-2 right-2 p-1.5 bg-black/30 rounded-full text-white hover:bg-black/50 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                handleMaximize();
              }}
              aria-label="Maximize call"
            >
              <Maximize2 className="w-4 h-4" />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="fixed inset-0 z-50 bg-black/95 flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4">
            <motion.button
              variants={buttonVariants}
              initial="idle"
              whileHover="hover"
              whileTap="tap"
              onClick={handleMinimize}
              className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
              aria-label="Minimize call"
            >
              <Minimize2 className="w-5 h-5" />
            </motion.button>

            <div className="text-center">
              <p className="text-white/60 text-sm">
                {callType === "video" ? "Video Call" : "Voice Call"}
              </p>
            </div>

            <motion.button
              variants={buttonVariants}
              initial="idle"
              whileHover="hover"
              whileTap="tap"
              onClick={onFlipCamera}
              className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
              aria-label="Flip camera"
            >
              <RotateCcw className="w-5 h-5" />
            </motion.button>
          </div>

          {/* Main Content */}
          <motion.div
            variants={contentVariants}
            className="flex-1 flex flex-col items-center justify-center"
          >
            {/* Video placeholder or Avatar */}
            <div className="relative mb-8">
              {/* Pulsing ring for ringing state */}
              {callState === "ringing" && (
                <>
                  <motion.div
                    variants={pulseVariants}
                    animate="pulse"
                    className="absolute inset-0 w-40 h-40 rounded-full bg-[#39B54A]/30"
                    style={{ transform: "translate(-20%, -20%)" }}
                  />
                  <motion.div
                    variants={pulseVariants}
                    animate="pulse"
                    className="absolute inset-0 w-44 h-44 rounded-full bg-[#39B54A]/20"
                    style={{ transform: "translate(-27%, -27%)", animationDelay: "0.5s" }}
                  />
                </>
              )}

              {/* Avatar */}
              {(callState !== "connected" || isRemoteVideoOff || callType === "audio") && (
                <div className="relative z-10">
                  {remoteAvatar ? (
                    <img
                      src={remoteAvatar}
                      alt={remoteName}
                      className="w-32 h-32 rounded-full ring-4 ring-white/20 shadow-2xl"
                    />
                  ) : (
                    <div className="w-32 h-32 rounded-full bg-linear-to-br from-[#39B54A] to-[#2d913c] flex items-center justify-center ring-4 ring-white/20 shadow-2xl">
                      <span className="text-5xl font-bold text-white">
                        {remoteName[0]}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Remote muted indicator */}
              {isRemoteMuted && callState === "connected" && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 bg-red-500/80 rounded-full flex items-center gap-1.5"
                >
                  <MicOff className="w-3.5 h-3.5 text-white" />
                  <span className="text-xs text-white font-medium">Muted</span>
                </motion.div>
              )}
            </div>

            {/* Name and Status */}
            <h2 className="text-3xl font-bold text-white mb-2">{remoteName}</h2>
            <motion.p
              key={callState}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-white/60 text-lg"
            >
              {getStateText()}
            </motion.p>
          </motion.div>

          {/* Video Content Slot */}
          {callType === "video" && callState === "connected" && children && (
            <div className="absolute inset-0 z-0">{children}</div>
          )}

          {/* Controls */}
          <div className="px-6 pb-12">
            {callState === "ringing" ? (
              // Incoming call controls
              <div className="flex items-center justify-center gap-16">
                <motion.button
                  variants={buttonVariants}
                  initial="idle"
                  whileHover="hover"
                  whileTap="tap"
                  onClick={onDecline}
                  className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center shadow-lg shadow-red-500/30"
                  aria-label="Decline call"
                >
                  <PhoneOff className="w-7 h-7 text-white" />
                </motion.button>
                <motion.button
                  variants={buttonVariants}
                  initial="idle"
                  whileHover="hover"
                  whileTap="tap"
                  onClick={onAnswer}
                  className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center shadow-lg shadow-green-500/30"
                  aria-label="Answer call"
                >
                  {callType === "video" ? (
                    <Video className="w-7 h-7 text-white" />
                  ) : (
                    <Phone className="w-7 h-7 text-white" />
                  )}
                </motion.button>
              </div>
            ) : (
              // Active call controls
              <div className="flex items-center justify-center gap-4">
                {/* Mute */}
                <motion.button
                  variants={buttonVariants}
                  initial="idle"
                  whileHover="hover"
                  whileTap="tap"
                  onClick={handleToggleMute}
                  className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
                    isMuted
                      ? "bg-white text-gray-900"
                      : "bg-white/10 text-white hover:bg-white/20"
                  }`}
                  aria-label={isMuted ? "Unmute" : "Mute"}
                  aria-pressed={isMuted}
                >
                  {isMuted ? (
                    <MicOff className="w-6 h-6" />
                  ) : (
                    <Mic className="w-6 h-6" />
                  )}
                </motion.button>

                {/* Video toggle (video calls only) */}
                {callType === "video" && (
                  <motion.button
                    variants={buttonVariants}
                    initial="idle"
                    whileHover="hover"
                    whileTap="tap"
                    onClick={handleToggleVideo}
                    className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
                      isVideoOff
                        ? "bg-white text-gray-900"
                        : "bg-white/10 text-white hover:bg-white/20"
                    }`}
                    aria-label={isVideoOff ? "Turn on camera" : "Turn off camera"}
                    aria-pressed={isVideoOff}
                  >
                    {isVideoOff ? (
                      <VideoOff className="w-6 h-6" />
                    ) : (
                      <Video className="w-6 h-6" />
                    )}
                  </motion.button>
                )}

                {/* End call */}
                <motion.button
                  variants={buttonVariants}
                  initial="idle"
                  whileHover="hover"
                  whileTap="tap"
                  onClick={onEnd}
                  className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center shadow-lg shadow-red-500/30 mx-4"
                  aria-label="End call"
                >
                  <PhoneOff className="w-7 h-7 text-white" />
                </motion.button>

                {/* Speaker */}
                <motion.button
                  variants={buttonVariants}
                  initial="idle"
                  whileHover="hover"
                  whileTap="tap"
                  onClick={handleToggleSpeaker}
                  className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
                    isSpeakerOn
                      ? "bg-white text-gray-900"
                      : "bg-white/10 text-white hover:bg-white/20"
                  }`}
                  aria-label={isSpeakerOn ? "Turn off speaker" : "Turn on speaker"}
                  aria-pressed={isSpeakerOn}
                >
                  {isSpeakerOn ? (
                    <Volume2 className="w-6 h-6" />
                  ) : (
                    <VolumeX className="w-6 h-6" />
                  )}
                </motion.button>

                {/* Flip camera (video calls only) */}
                {callType === "video" && (
                  <motion.button
                    variants={buttonVariants}
                    initial="idle"
                    whileHover="hover"
                    whileTap="tap"
                    onClick={onFlipCamera}
                    className="w-14 h-14 bg-white/10 text-white hover:bg-white/20 rounded-full flex items-center justify-center transition-colors"
                    aria-label="Flip camera"
                  >
                    <RotateCcw className="w-6 h-6" />
                  </motion.button>
                )}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

PremiumCallOverlay.displayName = "PremiumCallOverlay";

export default PremiumCallOverlay;
