// Re-exports from the canonical WebRTC implementation in modules/
// Stream.io has been removed.
export { VideoCallProvider, useVideoCall } from "./VideoCallProvider";
export type { CallParticipant, IncomingCallData } from "./VideoCallProvider";
export { default as VideoCallButton } from "@/modules/chat/components/video/VideoCallButton";
export { default as VideoCallModal } from "./VideoCallModal";
export { IncomingCallModal } from "@/modules/chat/components/video/IncomingCallModal";
export { IncomingCallHandler } from "@/modules/chat/components/video/IncomingCallHandler";
