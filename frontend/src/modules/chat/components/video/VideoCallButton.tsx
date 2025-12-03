// ============================================
// VIDEO CALL BUTTON — WebRTC Implementation
// Initiates a WebRTC audio or video call.
// ============================================

"use client";

import { useState } from "react";
import { Phone, Video, Loader2 } from "lucide-react";
import { useVideoCall } from "./VideoCallProvider";

interface VideoCallButtonProps {
  conversationId: string;
  recipientId: string;
  recipientName: string;
  type?: "audio" | "video";
  className?: string;
  onCallStarted?: () => void;
  disabled?: boolean;
}

export function VideoCallButton({
  conversationId,
  recipientId,
  recipientName,
  type = "video",
  className = "",
  onCallStarted,
  disabled = false,
}: VideoCallButtonProps) {
  const { startCall, state } = useVideoCall();
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    if (isLoading || disabled || state.isInCall || state.isInitiating) return;

    setIsLoading(true);
    try {
      await startCall(conversationId, recipientId, recipientName, type);
      onCallStarted?.();
    } catch (error) {
      console.error("Failed to start call:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const Icon = type === "audio" ? Phone : Video;
  const isDisabled = isLoading || disabled || state.isInCall || state.isInitiating;

  return (
    <button
      onClick={handleClick}
      disabled={isDisabled}
      className={`p-2.5 text-gray-600 hover:text-[#39B54A] hover:bg-[#39B54A]/5 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      title={type === "audio" ? "Start voice call" : "Start video call"}
    >
      {isLoading ? (
        <Loader2 className="w-5 h-5 animate-spin" />
      ) : (
        <Icon className="w-5 h-5" />
      )}
    </button>
  );
}

export default VideoCallButton;
