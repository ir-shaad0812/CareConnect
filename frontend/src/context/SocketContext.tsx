// ============================================
// SOCKET CONTEXT - Real-time Communication
// Provides Socket.io connection across the app
// ============================================

"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import { io, Socket } from "socket.io-client";
import { useAuthContext } from "@/context/AuthContext";
import { env } from "@/config/env";
import { AUTH_CONFIG } from "@/lib/constants";

// Socket event types
export const SOCKET_EVENTS = {
  // Connection events
  CONNECT: "connect",
  DISCONNECT: "disconnect",
  ERROR: "error",

  // Chat events
  JOIN_CONVERSATION: "join_conversation",
  LEAVE_CONVERSATION: "leave_conversation",
  SEND_MESSAGE: "send_message",
  NEW_MESSAGE: "new_message",
  MESSAGE_DELIVERED: "message_delivered",
  MESSAGE_READ: "message_read",
  MESSAGES_READ: "messages_read",

  // Typing events
  TYPING_START: "typing_start",
  TYPING_STOP: "typing_stop",
  USER_TYPING: "user_typing",

  // Online status
  USER_ONLINE: "user_online",
  USER_OFFLINE: "user_offline",
  GET_ONLINE_USERS: "get_online_users",

  // Chat access control events
  CHAT_STATUS_CHANGED: "chat_status_changed",
  SUBSCRIBE_CHAT_STATUS: "subscribe_chat_status",
  MESSAGE_FAILED: "message_failed",

  // Reaction events
  ADD_REACTION: "add_reaction",
  REMOVE_REACTION: "remove_reaction",
  REACTION_UPDATED: "reaction_updated",

  // Pin events
  TOGGLE_PIN: "toggle_pin",
  MESSAGE_PINNED: "message_pinned",

  // Call events
  CALL_INCOMING: "call_incoming",
  CALL_INITIATE: "call_initiate",
  CALL_ACCEPT: "call_accept",
  CALL_DECLINE: "call_decline",
  CALL_END: "call_end",
  CALL_BUSY: "call_busy",
  CALL_CANCELLED: "call_cancelled",

  // Availability & Booking events
  SUBSCRIBE_CAREGIVER_AVAILABILITY: "subscribe_caregiver_availability",
  UNSUBSCRIBE_CAREGIVER_AVAILABILITY: "unsubscribe_caregiver_availability",
  AVAILABILITY_UPDATED: "availability_updated",
  BOOKING_RESERVED: "booking_reserved",
  BOOKING_CONFIRMED: "booking_confirmed",
  BOOKING_CANCELLED: "booking_cancelled",
  RESERVATION_EXPIRED: "reservation_expired",
  RESERVATION_EXPIRING_SOON: "reservation_expiring_soon",

  // Error events
  CHAT_ERROR: "chat_error",
} as const;

interface TypingUser {
  conversationId: string;
  userId: string;
  userName?: string;
}

interface IncomingCall {
  callId: string;
  callerId: string;
  callerName: string;
  callerAvatar?: string;
  callType: "audio" | "video";
  conversationId: string;
  timestamp: Date;
}

// Chat access status change event
interface ChatStatusChangeEvent {
  conversationId: string;
  status: "locked" | "active" | "restricted" | "closed";
  reason: string;
  message?: string;
  timestamp: Date;
}

// Message failed event
interface MessageFailedEvent {
  tempId?: string;
  conversationId: string;
  error: string;
  errorCode: string;
}

// Availability update event
interface AvailabilityUpdateEvent {
  caregiverId: string;
  type: "schedule_updated" | "date_blocked" | "date_unblocked" | "booking_change";
  changes: {
    date?: string;
    dates?: string[];
    schedule?: {
      days: string[];
      hours: { start: string; end: string };
    };
    booking?: {
      bookingNumber: string;
      status: string;
      startDate: string;
      endDate: string;
    };
  };
  timestamp: Date;
}

// Booking event
interface BookingEvent {
  bookingId: string;
  bookingNumber: string;
  caregiverId: string;
  careSeekerName?: string;
  schedule: {
    startDate: string;
    endDate: string;
    startTime: string;
    endTime: string;
  };
  status: string;
  expiresAt?: string;
  timestamp: Date;
}

// Reservation expiry event
interface ReservationExpiryEvent {
  bookingId: string;
  bookingNumber: string;
  caregiverId: string;
  timeRemaining?: number; // seconds, for expiring_soon
  timestamp: Date;
}

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  onlineUsers: Set<string>;
  typingUsers: TypingUser[];
  incomingCall: IncomingCall | null;
  // Connection methods
  connect: () => void;
  disconnect: () => void;
  // Chat methods
  joinConversation: (conversationId: string) => void;
  leaveConversation: (conversationId: string) => void;
  sendMessage: (
    conversationId: string,
    content: string,
    messageType?: string,
    attachments?: unknown[],
    tempId?: string
  ) => void;
  markAsRead: (conversationId: string, messageId?: string) => void;
  subscribeChatStatus: (conversationId: string) => void;
  // Typing methods
  startTyping: (conversationId: string) => void;
  stopTyping: (conversationId: string) => void;
  // Online status
  checkOnlineStatus: (userIds: string[]) => void;
  isUserOnline: (userId: string) => boolean;
  // Call methods
  initiateCall: (userId: string, conversationId: string, callType: "audio" | "video") => void;
  acceptCall: (callId: string) => void;
  declineCall: (callId: string) => void;
  endCall: (callId: string) => void;
  clearIncomingCall: () => void;
  // Availability methods
  subscribeToAvailability: (caregiverId: string) => void;
  unsubscribeFromAvailability: (caregiverId: string) => void;
  // Event listeners
  onNewMessage: (callback: (data: unknown) => void) => () => void;
  onUserTyping: (callback: (data: unknown) => void) => () => void;
  onMessagesRead: (callback: (data: unknown) => void) => () => void;
  onUserOnlineStatus: (callback: (data: unknown) => void) => () => void;
  onChatError: (callback: (data: unknown) => void) => () => void;
  onIncomingCall: (callback: (data: IncomingCall) => void) => () => void;
  onCallEnded: (callback: (data: { callId: string; reason: string }) => void) => () => void;
  // New event listeners for chat access control
  onMessageFailed: (callback: (data: MessageFailedEvent) => void) => () => void;
  onChatStatusChange: (callback: (data: ChatStatusChangeEvent) => void) => () => void;
  // Availability event listeners
  onAvailabilityUpdated: (callback: (data: AvailabilityUpdateEvent) => void) => () => void;
  onBookingReserved: (callback: (data: BookingEvent) => void) => () => void;
  onBookingConfirmed: (callback: (data: BookingEvent) => void) => () => void;
  onBookingCancelled: (callback: (data: BookingEvent) => void) => () => void;
  onReservationExpired: (callback: (data: ReservationExpiryEvent) => void) => () => void;
  onReservationExpiringSoon: (callback: (data: ReservationExpiryEvent) => void) => () => void;
  // Notification
  unreadNotificationCount: number;
  clearNotificationBadge: () => void;
  // Profile completion (real-time)
  profileCompletionPct: number | null;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

// Socket URL is derived centrally in config/env.ts (strips "/api" from API_URL
// or uses NEXT_PUBLIC_SOCKET_URL when explicitly set).
const SOCKET_URL = env.SOCKET_URL;

function decodeJwtPayload(token: string): { exp?: number } | null {
  try {
    const [, payloadBase64] = token.split(".");
    if (!payloadBase64) return null;

    const normalized = payloadBase64
      .replace(/-/g, "+")
      .replace(/_/g, "/");
    const padded = normalized.padEnd(
      normalized.length + ((4 - (normalized.length % 4)) % 4),
      "="
    );

    return JSON.parse(atob(padded)) as { exp?: number };
  } catch {
    return null;
  }
}

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuthContext();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [profileCompletionPct, setProfileCompletionPct] = useState<number | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const tokenRefreshAttempts = useRef(0);
  const MAX_TOKEN_REFRESH_ATTEMPTS = 2;
  const lastRefreshFailureAtRef = useRef(0);
  const REFRESH_FAILURE_COOLDOWN_MS = 30_000;
  const lastNetworkSocketErrorAtRef = useRef(0);
  const SOCKET_NETWORK_ERROR_COOLDOWN_MS = 10_000;

  // Refresh the access token using the refresh token
  const refreshAccessToken = useCallback(async (): Promise<string | null> => {
    if (
      lastRefreshFailureAtRef.current > 0 &&
      Date.now() - lastRefreshFailureAtRef.current < REFRESH_FAILURE_COOLDOWN_MS
    ) {
      return null;
    }

    try {
      const response = await fetch(`${env.API_URL}/auth/refresh-token`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        lastRefreshFailureAtRef.current = Date.now();
        return null;
      }

      const data = await response.json();
      if (data.data?.accessToken) {
        localStorage.setItem(AUTH_CONFIG.TOKEN_KEY, data.data.accessToken);
        if (data.data.refreshToken) {
          localStorage.setItem(AUTH_CONFIG.REFRESH_TOKEN_KEY, data.data.refreshToken);
        }
        lastRefreshFailureAtRef.current = 0;
        return data.data.accessToken;
      }
      lastRefreshFailureAtRef.current = Date.now();
      return null;
    } catch {
      lastRefreshFailureAtRef.current = Date.now();
      return null;
    }
  }, [REFRESH_FAILURE_COOLDOWN_MS]);

  // Initialize socket connection
  const connect = useCallback(async () => {
    if (socketRef.current) return;

    let token = localStorage.getItem(AUTH_CONFIG.TOKEN_KEY);
    if (!token) {
      token = await refreshAccessToken();
    }

    if (token) {
      const payload = decodeJwtPayload(token);
      if (typeof payload?.exp === "number" && payload.exp * 1000 <= Date.now()) {
        token = await refreshAccessToken();
      }
    }

    const newSocket = io(SOCKET_URL, {
      ...(token ? { auth: { token } } : {}),
      transports: ["polling", "websocket"],
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      autoConnect: false,
    });

    newSocket.io.on("reconnect_attempt", () => {
      const latestToken = localStorage.getItem(AUTH_CONFIG.TOKEN_KEY);
      newSocket.auth = latestToken ? { token: latestToken } : {};
    });

    newSocket.on("connect", () => {
      setIsConnected(true);
      tokenRefreshAttempts.current = 0; // reset on successful connect
    });

    newSocket.on("disconnect", () => {
      setIsConnected(false);
    });

    newSocket.on("connect_error", async (error) => {
      setIsConnected(false);
      
      // Non-retryable account status errors — log and bail out
      const lowerMsg = error.message.toLowerCase();
      const isAccountStatusError =
        lowerMsg.includes("suspended") ||
        lowerMsg.includes("rejected") ||
        lowerMsg.includes("deleted") ||
        lowerMsg.includes("not active") ||
        lowerMsg.includes("account is");
      if (isAccountStatusError) {
        console.warn("Socket blocked — account status issue:", error.message);
        socketRef.current = null;
        setSocket(null);
        return;
      }

      // Handle expired / invalid token by attempting a silent refresh
      if (
        error.message.includes("token") ||
        error.message.includes("expired") ||
        error.message.includes("Authentication") ||
        error.message.includes("Invalid")
      ) {
        newSocket.disconnect();

        if (tokenRefreshAttempts.current >= MAX_TOKEN_REFRESH_ATTEMPTS) {
          tokenRefreshAttempts.current = 0;
          socketRef.current = null;
          setSocket(null);
          return;
        }

        const hadExplicitToken = Boolean(
          (newSocket.auth as { token?: string } | undefined)?.token
        );
        tokenRefreshAttempts.current += 1;
        const newToken = await refreshAccessToken();
        if (newToken) {
          newSocket.auth = { token: newToken };
          if (newSocket.disconnected) {
            newSocket.connect();
          }
          return;
        }

        // Retry once with cookie-only auth when a stale local token fails.
        if (hadExplicitToken) {
          newSocket.auth = {};
          if (newSocket.disconnected) {
            newSocket.connect();
          }
          return;
        }

        socketRef.current = null;
        setSocket(null);
        console.warn("Token refresh failed – user needs to re-login");
        return;
      }

      const isTransportError =
        lowerMsg.includes("xhr poll error") ||
        lowerMsg.includes("websocket") ||
        lowerMsg.includes("transport") ||
        lowerMsg.includes("network") ||
        lowerMsg.includes("ecconnrefused") ||
        lowerMsg.includes("connection refused");

      if (isTransportError) {
        const now = Date.now();
        if (
          now - lastNetworkSocketErrorAtRef.current >
          SOCKET_NETWORK_ERROR_COOLDOWN_MS
        ) {
          console.warn(
            "Realtime service is currently unreachable. The app will keep retrying in the background.",
          );
          lastNetworkSocketErrorAtRef.current = now;
        }
        return;
      }

      console.error("Socket connection error:", error.message);
    });

    // Online status updates
    newSocket.on(SOCKET_EVENTS.USER_ONLINE, ({ userId }) => {
      setOnlineUsers((prev) => new Set([...prev, userId]));
    });

    newSocket.on(SOCKET_EVENTS.USER_OFFLINE, ({ userId }) => {
      setOnlineUsers((prev) => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    });

    newSocket.on("online_users_status", (status: Record<string, boolean>) => {
      const onlineIds = Object.entries(status)
        .filter(([, isOnline]) => isOnline)
        .map(([id]) => id);
      setOnlineUsers(new Set(onlineIds));
    });

    // Typing events
    newSocket.on(SOCKET_EVENTS.USER_TYPING, ({ conversationId, userId, userName, isTyping }) => {
      setTypingUsers(prev => {
        if (isTyping) {
          // Add user if not already typing
          if (!prev.some(t => t.conversationId === conversationId && t.userId === userId)) {
            return [...prev, { conversationId, userId, userName }];
          }
          return prev;
        } else {
          // Remove user from typing
          return prev.filter(t => !(t.conversationId === conversationId && t.userId === userId));
        }
      });
    });

    // Call events - incoming call notification
    newSocket.on(SOCKET_EVENTS.CALL_INCOMING, (data: {
      callId: string;
      callerId: string;
      callerName: string;
      callerAvatar?: string;
      callType: "audio" | "video";
      conversationId: string;
    }) => {
      console.log("Incoming call:", data);
      setIncomingCall({
        ...data,
        timestamp: new Date(),
      });
    });

    // Call ended/cancelled by caller
    newSocket.on(SOCKET_EVENTS.CALL_CANCELLED, ({ callId }: { callId: string }) => {
      setIncomingCall(prev => prev?.callId === callId ? null : prev);
    });

    newSocket.on(SOCKET_EVENTS.CALL_END, ({ callId }: { callId: string }) => {
      setIncomingCall(prev => prev?.callId === callId ? null : prev);
    });

    // Notification badge increment
    newSocket.on("notification:new", () => {
      setUnreadNotificationCount(prev => prev + 1);
    });

    // Backward-compatible browser event bridge for review updates.
    newSocket.on("review:new", (payload: {
      _id?: string;
      reviewId?: string;
      overallRating?: number;
      rating?: number;
      bookingId?: string;
      [key: string]: unknown;
    }) => {
      const normalizedRating = Number(
        payload?.overallRating ?? payload?.rating ?? 0,
      );
      const detail = {
        ...payload,
        _id: payload?._id ?? payload?.reviewId,
        overallRating: Number.isFinite(normalizedRating)
          ? normalizedRating
          : 0,
      };

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("socket:new_review", { detail }));
      }
    });

    // Profile completion real-time update
    newSocket.on("profile:completion_updated", ({ completionPercentage }: { completionPercentage: number; userId: string }) => {
      setProfileCompletionPct(completionPercentage);
    });

    socketRef.current = newSocket;
    setSocket(newSocket);
    newSocket.connect();
  }, [refreshAccessToken]);

  // Disconnect socket
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      // Remove all event listeners before disconnecting
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
      setSocket(null);
      setIsConnected(false);
      setOnlineUsers(new Set());
      setTypingUsers([]);
      setIncomingCall(null);
    }
  }, []);

  // Auto-connect when authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Socket lifecycle is intentionally driven by auth state.
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [isAuthenticated, user, connect, disconnect]);

  // Chat methods
  const joinConversation = useCallback((conversationId: string) => {
    socketRef.current?.emit(SOCKET_EVENTS.JOIN_CONVERSATION, conversationId);
  }, []);

  const leaveConversation = useCallback((conversationId: string) => {
    socketRef.current?.emit(SOCKET_EVENTS.LEAVE_CONVERSATION, conversationId);
  }, []);

  const sendMessage = useCallback(
    (
      conversationId: string,
      content: string,
      messageType?: string,
      attachments?: unknown[],
      tempId?: string
    ) => {
      socketRef.current?.emit(SOCKET_EVENTS.SEND_MESSAGE, {
        conversationId,
        content,
        messageType: messageType || 'text',
        attachments,
        tempId, // For optimistic UI reconciliation
      });
    },
    []
  );

  const markAsRead = useCallback(
    (conversationId: string, messageId?: string) => {
      socketRef.current?.emit(SOCKET_EVENTS.MESSAGE_READ, {
        conversationId,
        messageId,
      });
    },
    []
  );

  // Subscribe to chat status changes for a conversation
  const subscribeChatStatus = useCallback((conversationId: string) => {
    socketRef.current?.emit(SOCKET_EVENTS.SUBSCRIBE_CHAT_STATUS, conversationId);
  }, []);

  // Typing methods
  const startTyping = useCallback((conversationId: string) => {
    socketRef.current?.emit(SOCKET_EVENTS.TYPING_START, { conversationId });
  }, []);

  const stopTyping = useCallback((conversationId: string) => {
    socketRef.current?.emit(SOCKET_EVENTS.TYPING_STOP, { conversationId });
  }, []);

  // Online status methods
  const checkOnlineStatus = useCallback((userIds: string[]) => {
    socketRef.current?.emit(SOCKET_EVENTS.GET_ONLINE_USERS, userIds);
  }, []);

  const isUserOnline = useCallback(
    (userId: string) => {
      return onlineUsers.has(userId);
    },
    [onlineUsers]
  );

  // Call methods
  const initiateCall = useCallback((userId: string, conversationId: string, callType: "audio" | "video") => {
    socketRef.current?.emit(SOCKET_EVENTS.CALL_INITIATE, {
      recipientId: userId,
      conversationId,
      callType,
    });
  }, []);

  const acceptCall = useCallback((callId: string) => {
    socketRef.current?.emit(SOCKET_EVENTS.CALL_ACCEPT, { callId });
    setIncomingCall(null);
  }, []);

  const declineCall = useCallback((callId: string) => {
    socketRef.current?.emit(SOCKET_EVENTS.CALL_DECLINE, { callId });
    setIncomingCall(null);
  }, []);

  const endCall = useCallback((callId: string) => {
    socketRef.current?.emit(SOCKET_EVENTS.CALL_END, { callId });
  }, []);

  const clearIncomingCall = useCallback(() => {
    setIncomingCall(null);
  }, []);

  // Event listener helpers
  const createEventListener = useCallback(
    (event: string) => (callback: (data: unknown) => void) => {
      socketRef.current?.on(event, callback);
      return () => {
        socketRef.current?.off(event, callback);
      };
    },
    []
  );

  const onNewMessage = useCallback(
    (callback: (data: unknown) => void) =>
      createEventListener(SOCKET_EVENTS.NEW_MESSAGE)(callback),
    [createEventListener]
  );

  const onUserTyping = useCallback(
    (callback: (data: unknown) => void) =>
      createEventListener(SOCKET_EVENTS.USER_TYPING)(callback),
    [createEventListener]
  );

  const onMessagesRead = useCallback(
    (callback: (data: unknown) => void) =>
      createEventListener(SOCKET_EVENTS.MESSAGES_READ)(callback),
    [createEventListener]
  );

  const onUserOnlineStatus = useCallback(
    (callback: (data: unknown) => void) => {
      socketRef.current?.on(SOCKET_EVENTS.USER_ONLINE, callback);
      socketRef.current?.on(SOCKET_EVENTS.USER_OFFLINE, callback);
      return () => {
        socketRef.current?.off(SOCKET_EVENTS.USER_ONLINE, callback);
        socketRef.current?.off(SOCKET_EVENTS.USER_OFFLINE, callback);
      };
    },
    []
  );

  const onChatError = useCallback(
    (callback: (data: unknown) => void) =>
      createEventListener(SOCKET_EVENTS.CHAT_ERROR)(callback),
    [createEventListener]
  );

  const onIncomingCall = useCallback(
    (callback: (data: IncomingCall) => void) => {
      const handler = (data: Omit<IncomingCall, "timestamp">) => {
        callback({ ...data, timestamp: new Date() });
      };
      socketRef.current?.on(SOCKET_EVENTS.CALL_INCOMING, handler);
      return () => {
        socketRef.current?.off(SOCKET_EVENTS.CALL_INCOMING, handler);
      };
    },
    []
  );

  const onCallEnded = useCallback(
    (callback: (data: { callId: string; reason: string }) => void) => {
      const endedHandler = (data: { callId: string }) => callback({ ...data, reason: "ended" });
      const cancelledHandler = (data: { callId: string }) => callback({ ...data, reason: "cancelled" });
      const declinedHandler = (data: { callId: string }) => callback({ ...data, reason: "declined" });
      const busyHandler = (data: { callId: string }) => callback({ ...data, reason: "busy" });

      socketRef.current?.on(SOCKET_EVENTS.CALL_END, endedHandler);
      socketRef.current?.on(SOCKET_EVENTS.CALL_CANCELLED, cancelledHandler);
      socketRef.current?.on(SOCKET_EVENTS.CALL_DECLINE, declinedHandler);
      socketRef.current?.on(SOCKET_EVENTS.CALL_BUSY, busyHandler);
      return () => {
        socketRef.current?.off(SOCKET_EVENTS.CALL_END, endedHandler);
        socketRef.current?.off(SOCKET_EVENTS.CALL_CANCELLED, cancelledHandler);
        socketRef.current?.off(SOCKET_EVENTS.CALL_DECLINE, declinedHandler);
        socketRef.current?.off(SOCKET_EVENTS.CALL_BUSY, busyHandler);
      };
    },
    []
  );

  // New event listeners for chat access control
  const onMessageFailed = useCallback(
    (callback: (data: MessageFailedEvent) => void) => {
      socketRef.current?.on(SOCKET_EVENTS.MESSAGE_FAILED, callback);
      return () => {
        socketRef.current?.off(SOCKET_EVENTS.MESSAGE_FAILED, callback);
      };
    },
    []
  );

  const onChatStatusChange = useCallback(
    (callback: (data: ChatStatusChangeEvent) => void) => {
      const handler = (data: Omit<ChatStatusChangeEvent, "timestamp">) => {
        callback({ ...data, timestamp: new Date() });
      };
      socketRef.current?.on(SOCKET_EVENTS.CHAT_STATUS_CHANGED, handler);
      return () => {
        socketRef.current?.off(SOCKET_EVENTS.CHAT_STATUS_CHANGED, handler);
      };
    },
    []
  );

  // Availability subscription methods
  const subscribeToAvailability = useCallback((caregiverId: string) => {
    socketRef.current?.emit(SOCKET_EVENTS.SUBSCRIBE_CAREGIVER_AVAILABILITY, caregiverId);
  }, []);

  const unsubscribeFromAvailability = useCallback((caregiverId: string) => {
    socketRef.current?.emit(SOCKET_EVENTS.UNSUBSCRIBE_CAREGIVER_AVAILABILITY, caregiverId);
  }, []);

  // Availability event listeners
  const onAvailabilityUpdated = useCallback(
    (callback: (data: AvailabilityUpdateEvent) => void) => {
      const handler = (data: Omit<AvailabilityUpdateEvent, "timestamp">) => {
        callback({ ...data, timestamp: new Date() });
      };
      socketRef.current?.on(SOCKET_EVENTS.AVAILABILITY_UPDATED, handler);
      return () => {
        socketRef.current?.off(SOCKET_EVENTS.AVAILABILITY_UPDATED, handler);
      };
    },
    []
  );

  const onBookingReserved = useCallback(
    (callback: (data: BookingEvent) => void) => {
      const handler = (data: Omit<BookingEvent, "timestamp">) => {
        callback({ ...data, timestamp: new Date() });
      };
      socketRef.current?.on(SOCKET_EVENTS.BOOKING_RESERVED, handler);
      return () => {
        socketRef.current?.off(SOCKET_EVENTS.BOOKING_RESERVED, handler);
      };
    },
    []
  );

  const onBookingConfirmed = useCallback(
    (callback: (data: BookingEvent) => void) => {
      const handler = (data: Omit<BookingEvent, "timestamp">) => {
        callback({ ...data, timestamp: new Date() });
      };
      socketRef.current?.on(SOCKET_EVENTS.BOOKING_CONFIRMED, handler);
      return () => {
        socketRef.current?.off(SOCKET_EVENTS.BOOKING_CONFIRMED, handler);
      };
    },
    []
  );

  const onBookingCancelled = useCallback(
    (callback: (data: BookingEvent) => void) => {
      const handler = (data: Omit<BookingEvent, "timestamp">) => {
        callback({ ...data, timestamp: new Date() });
      };
      socketRef.current?.on(SOCKET_EVENTS.BOOKING_CANCELLED, handler);
      return () => {
        socketRef.current?.off(SOCKET_EVENTS.BOOKING_CANCELLED, handler);
      };
    },
    []
  );

  const onReservationExpired = useCallback(
    (callback: (data: ReservationExpiryEvent) => void) => {
      const handler = (data: Omit<ReservationExpiryEvent, "timestamp">) => {
        callback({ ...data, timestamp: new Date() });
      };
      socketRef.current?.on(SOCKET_EVENTS.RESERVATION_EXPIRED, handler);
      return () => {
        socketRef.current?.off(SOCKET_EVENTS.RESERVATION_EXPIRED, handler);
      };
    },
    []
  );

  const onReservationExpiringSoon = useCallback(
    (callback: (data: ReservationExpiryEvent) => void) => {
      const handler = (data: Omit<ReservationExpiryEvent, "timestamp">) => {
        callback({ ...data, timestamp: new Date() });
      };
      socketRef.current?.on(SOCKET_EVENTS.RESERVATION_EXPIRING_SOON, handler);
      return () => {
        socketRef.current?.off(SOCKET_EVENTS.RESERVATION_EXPIRING_SOON, handler);
      };
    },
    []
  );

  const value: SocketContextType = {
    socket,
    isConnected,
    onlineUsers,
    typingUsers,
    incomingCall,
    connect,
    disconnect,
    joinConversation,
    leaveConversation,
    sendMessage,
    markAsRead,
    subscribeChatStatus,
    startTyping,
    stopTyping,
    checkOnlineStatus,
    isUserOnline,
    initiateCall,
    acceptCall,
    declineCall,
    endCall,
    clearIncomingCall,
    subscribeToAvailability,
    unsubscribeFromAvailability,
    onNewMessage,
    onUserTyping,
    onMessagesRead,
    onUserOnlineStatus,
    onChatError,
    onIncomingCall,
    onCallEnded,
    onMessageFailed,
    onChatStatusChange,
    onAvailabilityUpdated,
    onBookingReserved,
    onBookingConfirmed,
    onBookingCancelled,
    onReservationExpired,
    onReservationExpiringSoon,
    unreadNotificationCount,
    clearNotificationBadge: () => setUnreadNotificationCount(0),
    profileCompletionPct,
  };

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
}

export function useSocketContext() {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error("useSocketContext must be used within a SocketProvider");
  }
  return context;
}

/** @deprecated Use useSocketContext() for chat/socket context, useSocket() from @/hooks for system events */
export const useSocket = useSocketContext;

// Export types
export type { IncomingCall, ChatStatusChangeEvent, MessageFailedEvent, AvailabilityUpdateEvent, BookingEvent, ReservationExpiryEvent };

export default SocketContext;
