// Re-export from the canonical WebRTC implementation in modules/
// Stream.io has been removed — all calls now use native WebRTC.
export {
  VideoCallProvider,
  useVideoCall,
  default,
} from "@/modules/chat/components/video/VideoCallProvider";
export type { CallParticipant, IncomingCallData } from "@/modules/chat/components/video/VideoCallProvider";
