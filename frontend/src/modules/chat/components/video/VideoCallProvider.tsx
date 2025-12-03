// ============================================
// VIDEO CALL PROVIDER — WebRTC Implementation
// Pure WebRTC peer-to-peer calls using
// Socket.IO as the signaling channel.
// No third-party video SDK required.
// ============================================

"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
  ReactNode,
} from "react";
import { useSocket } from "@/context/SocketContext";
import { useAuthContext } from "@/context/AuthContext";
import { apiClient } from "@/services/api/client";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CallParticipant {
  id: string;
  name: string;
  avatar?: string;
}

export interface IncomingCallData {
  callId: string;
  callerId: string;
  callerName: string;
  callerAvatar?: string;
  callType: "audio" | "video";
  conversationId: string;
  sdp?: RTCSessionDescriptionInit;
}

interface WebRTCCallState {
  isInCall: boolean;
  isInitiating: boolean;
  callId: string | null;
  callType: "audio" | "video" | null;
  conversationId: string | null;
  remoteParticipant: CallParticipant | null;
  incomingCall: IncomingCallData | null;
  isMicOn: boolean;
  isCameraOn: boolean;
  error: string | null;
}

interface WebRTCContextType {
  state: WebRTCCallState;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  startCall: (
    conversationId: string,
    recipientId: string,
    recipientName: string,
    callType?: "audio" | "video"
  ) => Promise<void>;
  acceptCall: () => Promise<void>;
  declineCall: () => void;
  endCall: () => void;
  toggleMic: () => void;
  toggleCamera: () => void;
}

// ─── ICE config ───────────────────────────────────────────────────────────────

const DEFAULT_ICE: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
  iceCandidatePoolSize: 10,
};

async function fetchIceConfig(): Promise<RTCConfiguration> {
  try {
    const res = await apiClient.get<{ iceServers: RTCIceServer[] }>(
      "/video/config"
    );
    if (res.success && res.data?.iceServers) {
      return { iceServers: res.data.iceServers, iceCandidatePoolSize: 10 };
    }
  } catch {
    // fall through
  }
  return DEFAULT_ICE;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const VideoCallContext = createContext<WebRTCContextType | undefined>(undefined);

export function useVideoCall() {
  const ctx = useContext(VideoCallContext);
  if (!ctx) throw new Error("useVideoCall must be used inside VideoCallProvider");
  return ctx;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

const INITIAL_STATE: WebRTCCallState = {
  isInCall: false,
  isInitiating: false,
  callId: null,
  callType: null,
  conversationId: null,
  remoteParticipant: null,
  incomingCall: null,
  isMicOn: true,
  isCameraOn: true,
  error: null,
};

export function VideoCallProvider({ children }: { children: ReactNode }) {
  const { user } = useAuthContext();
  const { socket } = useSocket();

  const [state, setState] = useState<WebRTCCallState>(INITIAL_STATE);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const iceCacheRef = useRef<RTCIceCandidateInit[]>([]);
  const iceConfigRef = useRef<RTCConfiguration>(DEFAULT_ICE);
  const localStreamRef = useRef<MediaStream | null>(null);
  const disconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resetCallRef = useRef<() => void>(() => {});

  // ── Helpers ────────────────────────────────────────────────────────────────

  const patchState = (patch: Partial<WebRTCCallState>) =>
    setState((prev) => ({ ...prev, ...patch }));

  const clearDisconnectTimer = useCallback(() => {
    if (disconnectTimerRef.current) {
      clearTimeout(disconnectTimerRef.current);
      disconnectTimerRef.current = null;
    }
  }, []);

  const destroyPeer = useCallback(() => {
    clearDisconnectTimer();
    pcRef.current?.close();
    pcRef.current = null;
    iceCacheRef.current = [];
  }, [clearDisconnectTimer]);

  const stopLocalStream = useCallback(() => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    setLocalStream(null);
  }, []);

  const setLocalMediaStream = useCallback((stream: MediaStream | null) => {
    localStreamRef.current = stream;
    setLocalStream(stream);
  }, []);

  const resetCall = useCallback(() => {
    clearDisconnectTimer();
    destroyPeer();
    stopLocalStream();
    setRemoteStream(null);
    setState(INITIAL_STATE);
  }, [clearDisconnectTimer, destroyPeer, stopLocalStream]);

  useEffect(() => {
    resetCallRef.current = resetCall;
  }, [resetCall]);

  // ── RTCPeerConnection factory ───────────────────────────────────────────────

  const createPeer = useCallback(
    (callId: string, targetId: string) => {
      const pc = new RTCPeerConnection(iceConfigRef.current);

      pc.onicecandidate = ({ candidate }) => {
        if (candidate && socket) {
          socket.emit("webrtc:ice_candidate", {
            callId,
            targetId,
            candidate: candidate.toJSON(),
          });
        }
      };

      pc.ontrack = (ev) => {
        const [stream] = ev.streams;
        if (stream) setRemoteStream(stream);
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "connected") {
          clearDisconnectTimer();
          return;
        }

        if (pc.connectionState === "disconnected") {
          clearDisconnectTimer();
          disconnectTimerRef.current = setTimeout(() => {
            const currentState = pc.connectionState;
            if (
              currentState === "disconnected" ||
              currentState === "failed" ||
              currentState === "closed"
            ) {
              resetCallRef.current();
            }
          }, 8000);
          return;
        }

        if (
          pc.connectionState === "failed" ||
          pc.connectionState === "closed"
        ) {
          clearDisconnectTimer();
          resetCallRef.current();
        }
      };

      pcRef.current = pc;
      return pc;
    },
    [socket, clearDisconnectTimer]
  );

  // ── getUserMedia ────────────────────────────────────────────────────────────

  const getUserMedia = useCallback(async (callType: "audio" | "video") => {
    const constraints: MediaStreamConstraints = {
      audio: true,
      video: callType === "video",
    };
    return navigator.mediaDevices.getUserMedia(constraints);
  }, []);

  // ── Start outbound call ─────────────────────────────────────────────────────

  const startCall = useCallback(
    async (
      conversationId: string,
      recipientId: string,
      recipientName: string,
      callType: "audio" | "video" = "video"
    ) => {
      if (!user) {
        throw new Error("You must be logged in to start a call.");
      }

      if (!socket?.connected) {
        throw new Error("Realtime connection is not ready. Please try again.");
      }

      if (!conversationId || !recipientId) {
        throw new Error("Invalid conversation or recipient for this call.");
      }

      try {
        patchState({ isInitiating: true, error: null });

        // 1. Fetch ICE config from backend
        iceConfigRef.current = await fetchIceConfig();

        // 2. Reserve call ID from backend
        const initRes = await apiClient.post<{
          callId: string;
          iceConfig: RTCConfiguration;
        }>("/video/call/init", { conversationId, callType, recipientId });

        if (!initRes.success || !initRes.data?.callId) {
          throw new Error(initRes.message || "Failed to initialise call");
        }

        const { callId } = initRes.data;

        // 3. Get local media
        const stream = await getUserMedia(callType);
        setLocalMediaStream(stream);

        // 4. Create peer + add tracks
        const pc = createPeer(callId, recipientId);
        stream.getTracks().forEach((t) => pc.addTrack(t, stream));

        // 5. Create offer
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        // 6. Signal the other side
        socket.emit("webrtc:call_offer", {
          callId,
          callType,
          conversationId,
          recipientId,
          callerName: user.fullName,
          callerAvatar: user.avatar,
          sdp: offer,
        });

        patchState({
          isInitiating: false,
          isInCall: true,
          callId,
          callType,
          conversationId,
          remoteParticipant: { id: recipientId, name: recipientName },
          isCameraOn: callType === "video",
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Call failed";
        patchState({ isInitiating: false, error: msg });
        resetCall();
      }
    },
    [socket, user, createPeer, getUserMedia, setLocalMediaStream, resetCall]
  );

  // ── Accept inbound call ─────────────────────────────────────────────────────

  const acceptCall = useCallback(async () => {
    const { incomingCall } = state;
    if (!incomingCall || !socket) return;

    try {
      const { callId, callerId, callerName, callerAvatar, callType, conversationId } =
        incomingCall;

      iceConfigRef.current = await fetchIceConfig();
      const stream = await getUserMedia(callType);
      setLocalMediaStream(stream);

      const pc = createPeer(callId, callerId);
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      // The offer was cached in the incoming event — apply it
      const cachedSdp = incomingCall.sdp;
      if (cachedSdp) {
        await pc.setRemoteDescription(new RTCSessionDescription(cachedSdp));

        // Drain cached ICE candidates
        for (const c of iceCacheRef.current) {
          await pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
        }
        iceCacheRef.current = [];
      }

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit("webrtc:call_answer", {
        callId,
        callerId,
        sdp: answer,
        acceptedByName: user?.fullName,
      });

      patchState({
        isInCall: true,
        callId,
        callType,
        conversationId,
        remoteParticipant: {
          id: callerId,
          name: callerName,
          ...(callerAvatar !== undefined ? { avatar: callerAvatar } : {}),
        },
        incomingCall: null,
        isCameraOn: callType === "video",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to accept call";
      patchState({ incomingCall: null, error: msg });
      resetCall();
    }
  }, [state, socket, user, createPeer, getUserMedia, setLocalMediaStream, resetCall]);

  // ── Decline inbound call ────────────────────────────────────────────────────

  const declineCall = useCallback(() => {
    const { incomingCall } = state;
    if (!incomingCall || !socket) return;

    socket.emit("webrtc:call_decline", {
      callId: incomingCall.callId,
      callerId: incomingCall.callerId,
    });

    patchState({ incomingCall: null });
  }, [state, socket]);

  // ── End active call ─────────────────────────────────────────────────────────

  const endCall = useCallback(() => {
    const { callId, remoteParticipant } = state;
    if (!socket) return;

    if (callId && remoteParticipant) {
      socket.emit("webrtc:call_end", {
        callId,
        recipientId: remoteParticipant.id,
      });
    }

    resetCall();
  }, [state, socket, resetCall]);

  // ── Media toggles ───────────────────────────────────────────────────────────

  const toggleMic = useCallback(() => {
    localStream?.getAudioTracks().forEach((t) => {
      t.enabled = !t.enabled;
    });
    patchState({ isMicOn: !state.isMicOn });
  }, [localStream, state.isMicOn]);

  const toggleCamera = useCallback(() => {
    localStream?.getVideoTracks().forEach((t) => {
      t.enabled = !t.enabled;
    });
    patchState({ isCameraOn: !state.isCameraOn });
  }, [localStream, state.isCameraOn]);

  // ── Socket event listeners ─────────────────────────────────────────────────

  useEffect(() => {
    if (!socket) return;

    // Inbound call offer
    const onOffer = (data: IncomingCallData & { sdp: RTCSessionDescriptionInit }) => {
      patchState({ incomingCall: { ...data, sdp: data.sdp } });
    };

    // Remote answer (caller receives this)
    const onAnswer = async (data: { callId: string; sdp: RTCSessionDescriptionInit }) => {
      const pc = pcRef.current;
      if (!pc) return;
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
        // Drain cached candidates
        for (const c of iceCacheRef.current) {
          await pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
        }
        iceCacheRef.current = [];
      } catch (err) {
        console.error("[WebRTC] setRemoteDescription(answer) failed:", err);
      }
    };

    // ICE candidate from remote peer
    const onIceCandidate = async (data: { callId: string; candidate: RTCIceCandidateInit }) => {
      const pc = pcRef.current;
      if (!pc) {
        iceCacheRef.current.push(data.candidate);
        return;
      }
      if (!pc.remoteDescription) {
        iceCacheRef.current.push(data.candidate);
        return;
      }
      try {
        await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
      } catch (err) {
        console.error("[WebRTC] addIceCandidate failed:", err);
      }
    };

    // Remote party ended call
    const onCallEnded = () => resetCallRef.current();

    // Remote party declined
    const onCallDeclined = () => {
      patchState({ isInCall: false, isInitiating: false, error: "Call declined" });
      resetCallRef.current();
    };

    // Recipient is unavailable/offline
    const onCallBusy = (data: { reason?: string }) => {
      patchState({
        isInCall: false,
        isInitiating: false,
        error: data?.reason || "User is unavailable",
      });
      resetCallRef.current();
    };

    // Surface call-specific backend errors to the caller UI.
    const onCallError = (data: { code?: string; message?: string }) => {
      if (!data?.code || !data.code.startsWith("CALL")) return;
      patchState({
        isInCall: false,
        isInitiating: false,
        error: data.message || "Call failed",
      });
      resetCallRef.current();
    };

    socket.on("webrtc:call_offer", onOffer);
    socket.on("webrtc:call_answer", onAnswer);
    socket.on("webrtc:ice_candidate", onIceCandidate);
    socket.on("webrtc:call_ended", onCallEnded);
    socket.on("webrtc:call_declined", onCallDeclined);
    socket.on("webrtc:call_busy", onCallBusy);
    socket.on("chat_error", onCallError);

    return () => {
      socket.off("webrtc:call_offer", onOffer);
      socket.off("webrtc:call_answer", onAnswer);
      socket.off("webrtc:ice_candidate", onIceCandidate);
      socket.off("webrtc:call_ended", onCallEnded);
      socket.off("webrtc:call_declined", onCallDeclined);
      socket.off("webrtc:call_busy", onCallBusy);
      socket.off("chat_error", onCallError);
    };
  }, [socket]);

  // Cleanup on unmount
  useEffect(() => () => resetCall(), [resetCall]);

  return (
    <VideoCallContext.Provider
      value={{
        state,
        localStream,
        remoteStream,
        startCall,
        acceptCall,
        declineCall,
        endCall,
        toggleMic,
        toggleCamera,
      }}
    >
      {children}
    </VideoCallContext.Provider>
  );
}

export default VideoCallProvider;
