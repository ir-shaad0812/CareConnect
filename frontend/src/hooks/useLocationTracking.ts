/**
 * useLocationTracking
 * Caregiver: broadcasts GPS position to booking room during active bookings.
 * Careseeker: subscribes to booking room and receives caregiver location updates.
 */
"use client";

import { useEffect, useRef, useCallback } from "react";
import { useSocket } from "@/context/SocketContext";
import apiClient from "@/services/api/client";

interface LocationUpdate {
  bookingId: string;
  caregiverId: string;
  coordinates: { lat: number; lng: number };
  timestamp: string;
}

/**
 * Caregiver hook — starts broadcasting location for an active booking.
 * Call with bookingId when service starts, null/undefined to stop.
 */
export function useCaregiverLocationBroadcast(bookingId: string | null | undefined) {
  const { socket } = useSocket();
  const watchIdRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (socket && bookingId) {
      socket.emit("leave_booking_room", bookingId);
    }
  }, [socket, bookingId]);

  useEffect(() => {
    if (!bookingId || !socket || typeof navigator === "undefined") return;
    if (!navigator.geolocation) return;

    socket.emit("join_booking_room", bookingId);

    const postLocation = (lat: number, lng: number) => {
      // Fire-and-forget to backend (backend also emits socket event)
      apiClient.post(`/location/service/${bookingId}/track`, {
        coordinates: { lat, lng },
        source: "gps",
      }).catch(() => {/* ignore — best-effort */});
    };

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        postLocation(pos.coords.latitude, pos.coords.longitude);
      },
      () => {/* permission denied or unavailable */},
      { enableHighAccuracy: true, maximumAge: 30000, timeout: 10000 }
    );

    return () => stopTracking();
  }, [bookingId, socket, stopTracking]);
}

/**
 * Careseeker hook — subscribes to location updates for a booking.
 * Returns nothing; calls onUpdate when location arrives.
 */
export function useCareseekerLocationWatch(
  bookingId: string | null | undefined,
  onUpdate: (update: LocationUpdate) => void
) {
  const { socket } = useSocket();
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  useEffect(() => {
    if (!bookingId || !socket) return;

    socket.emit("join_booking_room", bookingId);

    const handleUpdate = (data: LocationUpdate) => {
      onUpdateRef.current(data);
    };

    socket.on("location:update", handleUpdate);

    return () => {
      socket.off("location:update", handleUpdate);
      socket.emit("leave_booking_room", bookingId);
    };
  }, [bookingId, socket]);
}
