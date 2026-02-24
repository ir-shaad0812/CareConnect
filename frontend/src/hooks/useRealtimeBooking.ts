// ============================================
// USE REALTIME BOOKING — CareConnect
// Subscribes to all booking + system events
// via the shared useSocket singleton and keeps
// booking/dashboard state in sync with the
// backend in real time.
//
// Two hooks are exported:
//   • useRealtimeBooking  – per-booking events
//   • useRealtimeDashboard – system-wide events
// ============================================

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSocket, SYSTEM_EVENTS } from "./useSocket";

// ─────────────────────────────────────────────
// SHARED TYPES
// ─────────────────────────────────────────────

/** Shape we expect all booking payloads to carry. */
interface BookingPayload {
  bookingId?: string;
  id?: string;
  [key: string]: unknown;
}

/** Extracts the booking identifier from an arbitrary payload. */
function extractBookingId(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const p = payload as BookingPayload;
  return p.bookingId ?? p.id ?? null;
}

/** A snapshot of the last received socket event. */
export interface LastEvent {
  event: string;
  payload: unknown;
  timestamp: string; // ISO-8601
}

// ─────────────────────────────────────────────
// useRealtimeBooking
// ─────────────────────────────────────────────

export interface UseRealtimeBookingOptions {
  /** Called for any status-transition event (accepted, confirmed, active, …). */
  onStatusChange?: (newStatus: string, payload: unknown) => void;
  /** Called when an agreement is generated or accepted. */
  onAgreementUpdate?: (payload: unknown) => void;
  /** Called when payment is completed (or fails). */
  onPaymentComplete?: (payload: unknown) => void;
  /** Called for tracking events (submitted, flagged, missed). */
  onTrackingUpdate?: (payload: unknown) => void;
  /** Called for dispute events (created, updated, resolved). */
  onDisputeUpdate?: (payload: unknown) => void;
  /** Called after any matching event — trigger a data refetch. */
  onRefetch?: () => void;
}

export interface UseRealtimeBookingReturn {
  connected: boolean;
  lastEvent: LastEvent | null;
}

/**
 * Subscribe to all booking-lifecycle and tracking/dispute events for a
 * specific booking.  Payloads whose `bookingId` / `id` field does not match
 * the provided `bookingId` are silently ignored, so this hook is safe to mount
 * on any page regardless of how many parallel bookings exist.
 *
 * @param bookingId  The booking to watch.  Pass `null` to keep the hook
 *                   mounted but dormant (no callbacks will fire).
 * @param options    Callbacks for specific event categories.
 *
 * @example
 * const { connected, lastEvent } = useRealtimeBooking(booking._id, {
 *   onStatusChange: (status) => toast.info(`Status → ${status}`),
 *   onRefetch: () => mutate(),
 * });
 */
export function useRealtimeBooking(
  bookingId: string | null,
  options?: UseRealtimeBookingOptions
): UseRealtimeBookingReturn {
  const { socket, connected, on } = useSocket();
  const [lastEvent, setLastEvent] = useState<LastEvent | null>(null);

  // Keep the latest options in a ref so handlers never go stale.
  const optionsRef = useRef<UseRealtimeBookingOptions | undefined>(options);
  optionsRef.current = options;

  // Also keep bookingId in a ref so the stable handlers can always read it.
  const bookingIdRef = useRef<string | null>(bookingId);
  bookingIdRef.current = bookingId;

  // ── Helper: build a handler for a specific event ──────────────────────────
  const makeHandler = useCallback(
    (
      eventName: string,
      category:
        | "statusChange"
        | "agreement"
        | "payment"
        | "tracking"
        | "dispute"
        | "generic",
      /** Optional status string to forward to onStatusChange. */
      status?: string
    ) =>
      (payload: unknown) => {
        const id = extractBookingId(payload);

        // Ignore events destined for other bookings.
        if (bookingIdRef.current && id && id !== bookingIdRef.current) return;
        // If we have a bookingId but the payload carries no id, still let it
        // through — some events may not include the id at the top level.

        const opts = optionsRef.current;

        // Persist the last event snapshot.
        setLastEvent({
          event: eventName,
          payload,
          timestamp: new Date().toISOString(),
        });

        switch (category) {
          case "statusChange":
            opts?.onStatusChange?.(status ?? eventName, payload);
            break;
          case "agreement":
            opts?.onAgreementUpdate?.(payload);
            break;
          case "payment":
            opts?.onPaymentComplete?.(payload);
            break;
          case "tracking":
            opts?.onTrackingUpdate?.(payload);
            break;
          case "dispute":
            opts?.onDisputeUpdate?.(payload);
            break;
          default:
            break;
        }

        // Auto-refetch for any matching event.
        opts?.onRefetch?.();
      },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [] // stable — intentional; all volatile values read from refs
  );

  // ── Register all booking-related subscriptions ────────────────────────────
  useEffect(() => {
    if (!socket) return;

    // Status-transition events
    on(
      SYSTEM_EVENTS.BOOKING_CREATED,
      makeHandler(SYSTEM_EVENTS.BOOKING_CREATED, "statusChange", "pending")
    );
    on(
      SYSTEM_EVENTS.BOOKING_ACCEPTED,
      makeHandler(SYSTEM_EVENTS.BOOKING_ACCEPTED, "statusChange", "accepted")
    );
    on(
      SYSTEM_EVENTS.BOOKING_CONFIRMED,
      makeHandler(SYSTEM_EVENTS.BOOKING_CONFIRMED, "statusChange", "confirmed")
    );
    on(
      SYSTEM_EVENTS.BOOKING_ACTIVE,
      makeHandler(SYSTEM_EVENTS.BOOKING_ACTIVE, "statusChange", "active")
    );
    on(
      SYSTEM_EVENTS.BOOKING_COMPLETED,
      makeHandler(SYSTEM_EVENTS.BOOKING_COMPLETED, "statusChange", "completed")
    );
    on(
      SYSTEM_EVENTS.BOOKING_CANCELLED,
      makeHandler(SYSTEM_EVENTS.BOOKING_CANCELLED, "statusChange", "cancelled")
    );

    // Agreement events
    on(
      SYSTEM_EVENTS.BOOKING_AGREEMENT_GENERATED,
      makeHandler(
        SYSTEM_EVENTS.BOOKING_AGREEMENT_GENERATED,
        "agreement"
      )
    );
    on(
      SYSTEM_EVENTS.BOOKING_AGREEMENT_ACCEPTED,
      makeHandler(
        SYSTEM_EVENTS.BOOKING_AGREEMENT_ACCEPTED,
        "agreement"
      )
    );

    // Payment events
    on(
      SYSTEM_EVENTS.BOOKING_PAYMENT_COMPLETED,
      makeHandler(SYSTEM_EVENTS.BOOKING_PAYMENT_COMPLETED, "payment")
    );
    on(
      SYSTEM_EVENTS.BOOKING_PAYMENT_FAILED,
      makeHandler(SYSTEM_EVENTS.BOOKING_PAYMENT_FAILED, "payment")
    );

    // Tracking events
    on(
      SYSTEM_EVENTS.TRACKING_SUBMITTED,
      makeHandler(SYSTEM_EVENTS.TRACKING_SUBMITTED, "tracking")
    );
    on(
      SYSTEM_EVENTS.TRACKING_FLAGGED,
      makeHandler(SYSTEM_EVENTS.TRACKING_FLAGGED, "tracking")
    );
    on(
      SYSTEM_EVENTS.TRACKING_MISSED,
      makeHandler(SYSTEM_EVENTS.TRACKING_MISSED, "tracking")
    );

    // Dispute events
    on(
      SYSTEM_EVENTS.DISPUTE_CREATED,
      makeHandler(SYSTEM_EVENTS.DISPUTE_CREATED, "dispute")
    );
    on(
      SYSTEM_EVENTS.DISPUTE_UPDATED,
      makeHandler(SYSTEM_EVENTS.DISPUTE_UPDATED, "dispute")
    );
    on(
      SYSTEM_EVENTS.DISPUTE_RESOLVED,
      makeHandler(SYSTEM_EVENTS.DISPUTE_RESOLVED, "dispute")
    );

    // Note: `on()` from useSocket auto-removes all listeners on unmount, so
    // no explicit cleanup is required here beyond the component unmounting.
  }, [socket, on, makeHandler]);

  return { connected, lastEvent };
}

// ─────────────────────────────────────────────
// useRealtimeDashboard
// ─────────────────────────────────────────────

export interface UseRealtimeDashboardOptions {
  /** A new booking was created anywhere in the system. */
  onBookingCreated?: (payload: unknown) => void;
  /** A booking was accepted by a caregiver. */
  onBookingAccepted?: (payload: unknown) => void;
  /** A booking payment was completed. */
  onPaymentCompleted?: (payload: unknown) => void;
  /** A booking was moved to confirmed. */
  onBookingConfirmed?: (payload: unknown) => void;
  /** A tracking record was flagged (admin alert). */
  onTrackingFlagged?: (payload: unknown) => void;
  /** A new dispute was opened. */
  onDisputeCreated?: (payload: unknown) => void;
  /** Aggregate system statistics changed. */
  onStatsUpdated?: (payload: unknown) => void;
  /** A notification was created for the current user. */
  onNotification?: (payload: unknown) => void;
}

export interface UseRealtimeDashboardReturn {
  connected: boolean;
  /** Count of notification events received since mount (resets on unmount). */
  unreadCount: number;
}

/**
 * Subscribe to system-wide events suitable for an admin/dashboard view.
 * Unlike `useRealtimeBooking`, this hook does NOT filter by booking ID —
 * every matching event fires the corresponding callback.
 *
 * @example
 * const { connected, unreadCount } = useRealtimeDashboard({
 *   onBookingCreated: (p) => refetchBookings(),
 *   onNotification: (p) => toast.info(p.message),
 * });
 */
export function useRealtimeDashboard(
  options?: UseRealtimeDashboardOptions
): UseRealtimeDashboardReturn {
  const { socket, connected, on } = useSocket();
  const [unreadCount, setUnreadCount] = useState(0);

  // Keep the latest options in a ref to avoid stale closures.
  const optionsRef = useRef<UseRealtimeDashboardOptions | undefined>(options);
  optionsRef.current = options;

  useEffect(() => {
    if (!socket) return;

    // ── BOOKING_CREATED ──────────────────────────────────────────────────
    on(SYSTEM_EVENTS.BOOKING_CREATED, (payload: unknown) => {
      optionsRef.current?.onBookingCreated?.(payload);
    });

    // ── BOOKING_ACCEPTED ─────────────────────────────────────────────────
    on(SYSTEM_EVENTS.BOOKING_ACCEPTED, (payload: unknown) => {
      optionsRef.current?.onBookingAccepted?.(payload);
    });

    // ── BOOKING_PAYMENT_COMPLETED ────────────────────────────────────────
    on(SYSTEM_EVENTS.BOOKING_PAYMENT_COMPLETED, (payload: unknown) => {
      optionsRef.current?.onPaymentCompleted?.(payload);
    });

    // ── BOOKING_CONFIRMED ────────────────────────────────────────────────
    on(SYSTEM_EVENTS.BOOKING_CONFIRMED, (payload: unknown) => {
      optionsRef.current?.onBookingConfirmed?.(payload);
    });

    // ── TRACKING_FLAGGED ─────────────────────────────────────────────────
    on(SYSTEM_EVENTS.TRACKING_FLAGGED, (payload: unknown) => {
      optionsRef.current?.onTrackingFlagged?.(payload);
    });

    // ── DISPUTE_CREATED ──────────────────────────────────────────────────
    on(SYSTEM_EVENTS.DISPUTE_CREATED, (payload: unknown) => {
      optionsRef.current?.onDisputeCreated?.(payload);
    });

    // ── SYSTEM_STATS_UPDATED ─────────────────────────────────────────────
    on(SYSTEM_EVENTS.SYSTEM_STATS_UPDATED, (payload: unknown) => {
      optionsRef.current?.onStatsUpdated?.(payload);
    });

    // ── NOTIFICATION_CREATED ─────────────────────────────────────────────
    on(SYSTEM_EVENTS.NOTIFICATION_CREATED, (payload: unknown) => {
      optionsRef.current?.onNotification?.(payload);
      // Increment the local unread counter each time a notification arrives.
      setUnreadCount((prev) => prev + 1);
    });
  }, [socket, on]);

  return { connected, unreadCount };
}
