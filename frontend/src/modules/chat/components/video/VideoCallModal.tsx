// ============================================
// VIDEO CALL MODAL — WebRTC Implementation
// Full-screen modal for active audio/video calls.
// Uses native browser WebRTC APIs and Socket.IO
// ============================================

"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  PhoneOff,
  Video,
  VideoOff,
  Mic,
  MicOff,
  Maximize2,
  Minimize2,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useVideoCall } from "./VideoCallProvider";
import { useState, useCallback } from "react";

interface VideoCallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function VideoCallModal({ isOpen, onClose }: VideoCallModalProps) {
  const { state, localStream, remoteStream, endCall, toggleMic, toggleCamera } =
    useVideoCall();

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const isAudioOnly = state.callType === "audio";

  // Attach streams to video elements
  useEffect(() => {
    if (!localVideoRef.current) return;

    if (localStream) {
      localVideoRef.current.srcObject = localStream;
      localVideoRef.current.play().catch(() => {});
      return;
    }

    localVideoRef.current.srcObject = null;
  }, [localStream]);

  useEffect(() => {
    if (!remoteVideoRef.current) return;

    // For video calls, keep remote stream attached to the remote <video> element.
    if (!isAudioOnly && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current.play().catch(() => {});
      return;
    }

    remoteVideoRef.current.srcObject = null;
  }, [remoteStream, isAudioOnly]);

  useEffect(() => {
    if (!remoteAudioRef.current) return;

    // Audio-only calls need a dedicated media element or remote audio won't play.
    if (isAudioOnly && remoteStream) {
      remoteAudioRef.current.srcObject = remoteStream;
      remoteAudioRef.current.play().catch(() => {});
      return;
    }

    remoteAudioRef.current.srcObject = null;
  }, [remoteStream, isAudioOnly]);

  // Call timer
  useEffect(() => {
    if (!state.isInCall) { setElapsed(0); return; }
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [state.isInCall]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  const handleEndCall = useCallback(() => {
    endCall();
    onClose();
  }, [endCall, onClose]);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  const isConnected = Boolean(remoteStream);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-9999 bg-gray-950 flex flex-col"
        >
          {/* ── HEADER ─────────────────────────────── */}
          <div className="absolute top-0 inset-x-0 z-10 flex items-center justify-between px-5 py-4 bg-linear-to-b from-black/70 to-transparent">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <div>
                <p className="text-white font-semibold text-sm leading-none">
                  {state.remoteParticipant?.name ?? "Connecting…"}
                </p>
                <p className="text-white/60 text-xs mt-0.5">
                  {isConnected ? formatTime(elapsed) : "Connecting…"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isConnected ? (
                <Wifi className="w-4 h-4 text-green-400" />
              ) : (
                <WifiOff className="w-4 h-4 text-amber-400 animate-pulse" />
              )}
              <button
                onClick={toggleFullscreen}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                aria-label="Toggle fullscreen"
              >
                {isFullscreen ? (
                  <Minimize2 className="w-4 h-4" />
                ) : (
                  <Maximize2 className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* ── VIDEO AREA ─────────────────────────── */}
          <div className="flex-1 relative overflow-hidden bg-gray-900">
            {isAudioOnly ? (
              /* Audio-only — show avatar */
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                <div className="w-28 h-28 rounded-full bg-linear-to-br from-violet-500 to-purple-700 flex items-center justify-center shadow-2xl">
                  <span className="text-white text-4xl font-bold">
                    {state.remoteParticipant?.name?.charAt(0) ?? "?"}
                  </span>
                </div>
                <div className="flex gap-1.5 items-end h-8">
                  {[...Array(4)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="w-1.5 bg-violet-400 rounded-full"
                      animate={{ height: [8, 24, 8] }}
                      transition={{
                        repeat: Infinity,
                        duration: 0.8,
                        delay: i * 0.15,
                      }}
                    />
                  ))}
                </div>
                <p className="text-white/70 text-sm">
                  {isConnected ? "Audio call in progress" : "Connecting audio…"}
                </p>
              </div>
            ) : (
              /* Video call — remote fills frame */
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="absolute inset-0 w-full h-full object-cover"
              />
            )}

            {/* Waiting overlay */}
            {!isConnected && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 backdrop-blur-sm">
                <div className="text-center">
                  <div className="w-16 h-16 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-white font-medium">Waiting for the other party…</p>
                </div>
              </div>
            )}

            {/* Local video (PiP) */}
            {!isAudioOnly && (
              <motion.div
                drag
                dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                className="absolute bottom-20 right-4 w-32 h-44 rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20 cursor-grab active:cursor-grabbing"
              >
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover scale-x-[-1]"
                />
                {!state.isCameraOn && (
                  <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                    <VideoOff className="w-6 h-6 text-white/50" />
                  </div>
                )}
              </motion.div>
            )}
          </div>

          <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />

          {/* ── CONTROLS ───────────────────────────── */}
          <div className="absolute bottom-0 inset-x-0 flex items-center justify-center gap-4 pb-10 pt-6 bg-linear-to-t from-black/70 to-transparent">
            {/* Mic */}
            <button
              onClick={toggleMic}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-lg ${
                state.isMicOn
                  ? "bg-white/20 hover:bg-white/30 text-white"
                  : "bg-white text-gray-900"
              }`}
              aria-label={state.isMicOn ? "Mute" : "Unmute"}
            >
              {state.isMicOn ? (
                <Mic className="w-6 h-6" />
              ) : (
                <MicOff className="w-6 h-6" />
              )}
            </button>

            {/* Camera (video only) */}
            {!isAudioOnly && (
              <button
                onClick={toggleCamera}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-lg ${
                  state.isCameraOn
                    ? "bg-white/20 hover:bg-white/30 text-white"
                    : "bg-white text-gray-900"
                }`}
                aria-label={state.isCameraOn ? "Turn off camera" : "Turn on camera"}
              >
                {state.isCameraOn ? (
                  <Video className="w-6 h-6" />
                ) : (
                  <VideoOff className="w-6 h-6" />
                )}
              </button>
            )}

            {/* End Call */}
            <button
              onClick={handleEndCall}
              className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-xl transition-all active:scale-95"
              aria-label="End call"
            >
              <PhoneOff className="w-7 h-7 text-white" />
            </button>
          </div>

          {/* Error toast */}
          <AnimatePresence>
            {state.error && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="absolute top-16 inset-x-4 bg-red-900/90 text-red-200 text-sm px-4 py-3 rounded-xl text-center"
              >
                {state.error}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
