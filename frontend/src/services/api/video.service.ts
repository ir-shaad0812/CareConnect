// ============================================
// VIDEO CALL SERVICE — WebRTC Frontend Client
// Fetches WebRTC configuration and call metadata
// from the backend. All signaling happens via
// Socket.IO (no third-party call SDK).
// ============================================

import { apiClient } from "./client";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WebRTCConfig {
  provider: "webrtc";
  iceServers: RTCIceServer[];
  iceCandidatePoolSize: number;
}

export interface CallInitResponse {
  callId: string;
  callType: "audio" | "video";
  conversationId: string;
  iceConfig: WebRTCConfig;
  signaling: "socket.io";
  callerId: string;
}

export interface CallDetailsResponse {
  callId: string;
  iceConfig: WebRTCConfig;
  signaling: "socket.io";
  active: boolean;
  callerId?: string;
  recipientId?: string;
  callType?: string;
  conversationId?: string;
}

// ─── API Calls ────────────────────────────────────────────────────────────────

/**
 * Fetch WebRTC ICE server configuration.
 */
export async function getWebRTCConfig() {
  return apiClient.get<WebRTCConfig>("/video/config");
}

/**
 * Initialise a call — validates access and returns callId + ICE config.
 */
export async function initializeCall(
  conversationId: string,
  callType: "audio" | "video" = "video",
  recipientId?: string
) {
  return apiClient.post<CallInitResponse>("/video/call/init", {
    conversationId,
    callType,
    recipientId,
  });
}

/**
 * Get details for an active or recent call.
 */
export async function getCallDetails(callId: string) {
  return apiClient.get<CallDetailsResponse>(`/video/call/${callId}`);
}

// ─── Service Object ───────────────────────────────────────────────────────────

export const videoService = {
  getWebRTCConfig,
  initializeCall,
  getCallDetails,
};

export default videoService;
