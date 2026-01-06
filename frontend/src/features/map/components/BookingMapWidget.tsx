"use client";

// ============================================
// BookingMapWidget
// Drop-in widget for any booking detail page.
// Loads real GPS coords from DB + live pings.
// Polls every 30s during active sessions.
// ============================================

import { useBookingLocation } from "../hooks/useBookingLocation";
import dynamic from "next/dynamic";
import { RefreshCw, MapPin, Clock, AlertCircle } from "lucide-react";

// Lazy-load heavy map component (no SSR)
const CaregiverNavigationMapV2 = dynamic(
  () => import("./CaregiverNavigationMapV2").then((m) => m.CaregiverNavigationMapV2 ?? m.default),
  { ssr: false, loading: () => <MapSkeleton /> }
);

function MapSkeleton() {
  return (
    <div className="h-[360px] w-full rounded-2xl bg-slate-100 animate-pulse flex items-center justify-center text-slate-400">
      <RefreshCw className="w-6 h-6 animate-spin" />
    </div>
  );
}

interface BookingMapWidgetProps {
  bookingId: string;
  caregiverName: string;
  caregiverAvatar?: string;
  careSeekerName: string;
  careSeekerAddress?: string;
  bookingStatus: string;
  /** Whether to poll for live updates (active sessions only) */
  liveTracking?: boolean;
  className?: string;
}

// Statuses where live tracking makes sense
const LIVE_STATUSES = new Set(["active", "in_progress", "confirmed"]);

export function BookingMapWidget({
  bookingId,
  careSeekerName,
  careSeekerAddress,
  bookingStatus,
  liveTracking,
  className = "",
}: BookingMapWidgetProps) {
  const shouldPoll = liveTracking ?? LIVE_STATUSES.has(bookingStatus);
  const { caregiverCoords, careSeekerCoords, lastUpdated, loading, error } =
    useBookingLocation(bookingId, shouldPoll ? 30_000 : 0);

  if (loading) return <MapSkeleton />;

  if (!careSeekerCoords && !caregiverCoords) {
    return (
      <div className={`rounded-2xl border border-slate-200 bg-slate-50 p-6 flex flex-col items-center justify-center text-center gap-2 ${className}`}>
        <MapPin className="w-8 h-8 text-slate-300" />
        <p className="text-sm font-medium text-slate-600">Location not available</p>
        <p className="text-xs text-slate-400">
          {error || "Location data is not yet available for this booking."}
        </p>
      </div>
    );
  }

  // Fallback: if we only have one coord, center on that
  const effectiveCareSeeker = careSeekerCoords ?? caregiverCoords!;
  const effectiveCaregiver  = caregiverCoords  ?? undefined;
  const normalizedStatus: "approved" | "in_progress" | "completed" | "cancelled" =
    bookingStatus === "in_progress" || bookingStatus === "completed" || bookingStatus === "cancelled"
      ? bookingStatus
      : "approved";

  return (
    <div className={`rounded-2xl overflow-hidden border border-slate-200 shadow-sm ${className}`}>
      {/* Live indicator */}
      {shouldPoll && (
        <div className="flex items-center gap-2 px-4 py-2 bg-white border-b border-slate-100">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-medium text-emerald-700">Live tracking active</span>
          {lastUpdated && (
            <span className="text-xs text-slate-400 ml-auto flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Updated {lastUpdated.toLocaleTimeString("en-NP")}
            </span>
          )}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border-b border-amber-100 text-xs text-amber-700">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          Using last known location. Live update failed.
        </div>
      )}

      <div className="h-[360px]">
        <CaregiverNavigationMapV2
          careSeekerLocation={{
            name: careSeekerName,
            address: careSeekerAddress || `${careSeekerName}'s location`,
            maskedAddress: careSeekerAddress || "Location shared",
            city: "",
            state: "",
            coordinates: effectiveCareSeeker,
          }}
          bookingDetails={{
            id: bookingId,
            status: normalizedStatus,
            serviceType: "care_service",
            scheduledDate: "",
            scheduledTime: "",
            duration: "",
          }}
          {...(effectiveCaregiver ? { caregiverLocation: effectiveCaregiver } : {})}
          isApproved={LIVE_STATUSES.has(bookingStatus)}
        />
      </div>
    </div>
  );
}

export default BookingMapWidget;
