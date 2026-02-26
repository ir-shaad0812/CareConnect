// ============================================
// USE SOCKET — Real-time Hook for CareConnect
// Bridges to the shared SocketContext socket.
// Previously created a duplicate singleton socket
// which caused "WebSocket closed before connection"
// errors and doubled server load.
// ============================================

"use client";

import { useEffect, useRef, useCallback } from "react";
import type { Socket } from "socket.io-client";
import { useSocketContext } from "@/context/SocketContext";
// Note: useSocketContext is the renamed export (was useSocket in SocketContext)

// ─────────────────────────────────────────────
// SYSTEM EVENTS — mirrors backend event names
// ─────────────────────────────────────────────
export const SYSTEM_EVENTS = {
  BOOKING_CREATED: "booking:created",
  BOOKING_ACCEPTED: "booking:accepted",
  BOOKING_AGREEMENT_GENERATED: "booking:agreement_generated",
  BOOKING_AGREEMENT_ACCEPTED: "booking:agreement_accepted",
  BOOKING_PAYMENT_COMPLETED: "booking:payment_completed",
  BOOKING_PAYMENT_FAILED: "booking:payment_failed",
  BOOKING_CONFIRMED: "booking:confirmed",
  BOOKING_ACTIVE: "booking:active",
  BOOKING_COMPLETED: "booking:completed",
  BOOKING_CANCELLED: "booking:cancelled",
  TRACKING_SUBMITTED: "tracking:submitted",
  TRACKING_FLAGGED: "tracking:flagged",
  TRACKING_MISSED: "tracking:missed",
  DISPUTE_CREATED: "dispute:created",
  DISPUTE_RESOLVED: "dispute:resolved",
  DISPUTE_UPDATED: "dispute:updated",
  NOTE_CREATED: "note:created",
  NOTE_UPDATED: "note:updated",
  NOTE_DELETED: "note:deleted",
  NOTE_SHARED: "note:shared",
  NOTE_EDIT_REQUEST_CREATED: "note:edit_request_created",
  NOTE_EDIT_REQUEST_APPROVED: "note:edit_request_approved",
  NOTE_EDIT_REQUEST_REJECTED: "note:edit_request_rejected",
  SYSTEM_STATS_UPDATED: "system:stats_updated",
  NOTIFICATION_CREATED: "notification:created",
  // Wallet / payment events
  WALLET_UPDATED: "wallet:updated",
  PAYMENT_CAPTURED: "payment:captured",
  PAYOUT_APPROVED: "payout:approved",
  // Review events
  REVIEW_NEW: "review:new",
  REVIEW_MODERATED: "review:moderated",
  // Notice events
  NOTICE_CREATED: "notice:created",
  NOTICE_EXPIRED: "notice:expired",
} as const;

export type SystemEvent = (typeof SYSTEM_EVENTS)[keyof typeof SYSTEM_EVENTS];

type EventHandler = (...args: unknown[]) => void;

export interface UseSocketReturn {
  socket: Socket | null;
  connected: boolean;
  on: (event: string, handler: EventHandler) => void;
  emit: (event: string, data?: unknown) => void;
}

/**
 * Primary hook for system/booking socket events.
 * Reuses the single shared socket from SocketContext — no duplicate connections.
 */
export function useSocket(): UseSocketReturn {
  const ctx = useSocketContext();
  const subscriptionsRef = useRef<{ event: string; handler: EventHandler }[]>([]);
  const socketRef = useRef<Socket | null>(null);

  // Track the current socket so cleanup always uses the right reference
  socketRef.current = ctx.socket;

  const on = useCallback((event: string, handler: EventHandler): void => {
    const socket = socketRef.current;
    if (!socket) {
      if (process.env.NODE_ENV === "development") {
        console.warn(`[useSocket] on("${event}"): socket not yet available`);
      }
      return;
    }
    socket.on(event, handler);
    subscriptionsRef.current.push({ event, handler });
  }, []);

  const emit = useCallback((event: string, data?: unknown): void => {
    const socket = socketRef.current;
    if (!socket?.connected) {
      if (process.env.NODE_ENV === "development") {
        console.warn(`[useSocket] emit("${event}"): socket not connected`);
      }
      return;
    }
    socket.emit(event, data);
  }, []);

  // Clean up all subscriptions on unmount
  useEffect(() => {
    return () => {
      const socket = socketRef.current;
      if (!socket) return;
      for (const { event, handler } of subscriptionsRef.current) {
        socket.off(event, handler);
      }
      subscriptionsRef.current = [];
    };
  }, []);

  return {
    socket: ctx.socket,
    connected: ctx.isConnected,
    on,
    emit,
  };
}

// ─────────────────────────────────────────────
// CONVENIENCE HOOK: useSocketEvent
// Subscribes to a single event with stable
// handler semantics (handler ref never stales).
// ─────────────────────────────────────────────

/**
 * Subscribe to a single socket event.
 *
 * @example
 * useSocketEvent(SYSTEM_EVENTS.BOOKING_CONFIRMED, (payload) => {
 *   toast.success(`Booking ${payload.bookingNumber} confirmed!`);
 * });
 *
 * The handler is always up-to-date (stored in a ref), so you don't need
 * to list it in dependency arrays. Subscription is removed automatically
 * when the component unmounts.
 */
export function useSocketEvent(event: string, handler: EventHandler): void {
  const { socket } = useSocket();
  const handlerRef = useRef<EventHandler>(handler);

  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    if (!socket) return;

    const stableHandler: EventHandler = (...args) => {
      handlerRef.current(...args);
    };

    socket.on(event, stableHandler);

    return () => {
      socket.off(event, stableHandler);
    };
  }, [socket, event]);
}

export type { Socket };
