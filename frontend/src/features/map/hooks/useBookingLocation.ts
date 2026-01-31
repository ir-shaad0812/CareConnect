"use client";

// ============================================
// useBookingLocation
// Fetches real caregiver + careseeker GPS
// coordinates for an active booking session.
// Falls back to user profile location if live
// tracking is unavailable.
// ============================================

import { useState, useEffect, useCallback, useRef } from "react";
import { apiClient } from "@/services/api/client";

export interface LatLng { lat: number; lng: number; }

export interface BookingLocationState {
  caregiverCoords: LatLng | null;
  careSeekerCoords: LatLng | null;
  lastUpdated: Date | null;
  loading: boolean;
  error: string | null;
}

interface ServiceTimelineEntry {
  lat?: number;
  lng?: number;
  timestamp?: string;
  event?: string;
}

interface BookingParty {
  location?: {
    coordinates?: { coordinates?: [number, number] };
  };
  locationProof?: {
    coordinates?: { lat?: number; lng?: number };
    selectedCoordinates?: { lat?: number; lng?: number };
  };
}

/**
 * Poll the service timeline for the latest caregiver GPS location.
 * Falls back to profile location if no live ping found.
 */
async function fetchBookingLocations(bookingId: string): Promise<{
  caregiverCoords: LatLng | null;
  careSeekerCoords: LatLng | null;
}> {
  try {
    // Try live service timeline first
    const timelineRes = await apiClient.get<{ timeline: ServiceTimelineEntry[] }>(
      `/location/service/${bookingId}/timeline`
    );

    let caregiverCoords: LatLng | null = null;

    if (timelineRes.success && timelineRes.data?.timeline?.length) {
      const pings = timelineRes.data.timeline
        .filter((e) => e.lat && e.lng)
        .sort((a, b) =>
          new Date(b.timestamp ?? 0).getTime() - new Date(a.timestamp ?? 0).getTime()
        );

      if (pings.length > 0 && pings[0].lat && pings[0].lng) {
        caregiverCoords = { lat: pings[0].lat, lng: pings[0].lng };
      }
    }

    // Fall back: get booking to extract profile coords
    const bookingRes = await apiClient.get<{
      booking: { caregiver?: BookingParty; careSeeker?: BookingParty };
    }>(`/bookings/${bookingId}`);

    let careSeekerCoords: LatLng | null = null;

    if (bookingRes.success && bookingRes.data?.booking) {
      const { caregiver, careSeeker } = bookingRes.data.booking;

      // Extract caregiver location from profile if no live ping
      if (!caregiverCoords && caregiver?.location?.coordinates?.coordinates) {
        const [lng, lat] = caregiver.location.coordinates.coordinates;
        if (lat && lng) caregiverCoords = { lat, lng };
      }
      if (!caregiverCoords && caregiver?.locationProof?.coordinates) {
        const { lat, lng } = caregiver.locationProof.coordinates;
        if (lat && lng) caregiverCoords = { lat, lng };
      }

      // Extract care seeker location
      if (careSeeker?.locationProof?.selectedCoordinates) {
        const { lat, lng } = careSeeker.locationProof.selectedCoordinates;
        if (lat && lng) careSeekerCoords = { lat, lng };
      } else if (careSeeker?.locationProof?.coordinates) {
        const { lat, lng } = careSeeker.locationProof.coordinates;
        if (lat && lng) careSeekerCoords = { lat, lng };
      } else if (careSeeker?.location?.coordinates?.coordinates) {
        const [lng, lat] = careSeeker.location.coordinates.coordinates;
        if (lat && lng) careSeekerCoords = { lat, lng };
      }
    }

    return { caregiverCoords, careSeekerCoords };
  } catch {
    return { caregiverCoords: null, careSeekerCoords: null };
  }
}

export function useBookingLocation(
  bookingId: string | null | undefined,
  pollingIntervalMs = 30_000
): BookingLocationState {
  const [state, setState] = useState<BookingLocationState>({
    caregiverCoords: null,
    careSeekerCoords: null,
    lastUpdated: null,
    loading: true,
    error: null,
  });

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetch = useCallback(async () => {
    if (!bookingId) {
      setState((s) => ({ ...s, loading: false }));
      return;
    }
    try {
      const { caregiverCoords, careSeekerCoords } = await fetchBookingLocations(bookingId);
      setState({
        caregiverCoords,
        careSeekerCoords,
        lastUpdated: new Date(),
        loading: false,
        error: null,
      });
    } catch (err) {
      setState((s) => ({
        ...s,
        loading: false,
        error: err instanceof Error ? err.message : "Failed to load location",
      }));
    }
  }, [bookingId]);

  useEffect(() => {
    if (!bookingId) return;
    fetch();
    intervalRef.current = setInterval(fetch, pollingIntervalMs);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [bookingId, fetch, pollingIntervalMs]);

  return state;
}
