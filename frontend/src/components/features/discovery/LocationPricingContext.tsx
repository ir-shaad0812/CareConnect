// ============================================
// LOCATION PRICING CONTEXT COMPONENT
// Shows average hourly rates in user's area
// ============================================

"use client";

import { memo, useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  MapPin,
  Banknote,
  TrendingUp,
  Users,
  Info,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from "lucide-react";
import {
  caregiverService,
  type CaregiverMarketContext,
} from "@/services/api/caregiver.service";
import { useSocketContext } from "@/context/SocketContext";

// ─── Types ─────────────────────────────────────────────────────────
interface PricingData {
  location: string;
  state?: string;
  country?: string;
  avgLow: number;
  avgHigh: number;
  median: number;
  trend: "up" | "down" | "stable";
  trendPercent?: number;
  sampleSize: number;
  lastUpdated: string;
  totalRegisteredUsers: number;
  totalRegisteredCaregivers: number;
  breakdown?: {
    key?: string;
    category: string;
    count?: number;
    avgLow: number;
    avgHigh: number;
  }[];
  locationBreakdown?: {
    city: string;
    state?: string;
    country?: string;
    count: number;
    avgLow: number;
    avgHigh: number;
  }[];
}

interface LocationPricingContextProps {
  location?: string;
  selectedCategories?: string[];
  className?: string;
  onLocationChange?: (location: string) => void;
}

function toPricingData(marketContext: CaregiverMarketContext): PricingData {
  return {
    location: marketContext.location,
    avgLow: marketContext.avgLow,
    avgHigh: marketContext.avgHigh,
    median: marketContext.median,
    trend: marketContext.trend,
    trendPercent: marketContext.trendPercent,
    sampleSize: marketContext.sampleSize,
    totalRegisteredUsers: marketContext.totalRegisteredUsers,
    totalRegisteredCaregivers: marketContext.totalRegisteredCaregivers,
    lastUpdated: marketContext.lastUpdated,
    breakdown: marketContext.breakdown,
    locationBreakdown: marketContext.locationBreakdown,
  };
}

function formatUpdatedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "just now";
  return date.toLocaleString("en-NP", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Main Component ────────────────────────────────────────────────
export const LocationPricingContext = memo(function LocationPricingContext({
  location,
  selectedCategories,
  className,
}: LocationPricingContextProps) {
  const { socket } = useSocketContext();
  const [pricingData, setPricingData] = useState<PricingData | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const refreshTimeoutRef = useRef<number | null>(null);

  const loadPricingContext = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (!silent) {
        setIsLoading(true);
      }

      try {
        const response = await caregiverService.getMarketContext({
          ...(location ? { location } : {}),
          ...(selectedCategories?.length
            ? { categories: selectedCategories }
            : {}),
          topLocations: 6,
          topCategories: 6,
        });

        if (!response.success || !response.data?.marketContext) {
          throw new Error(response.message || "Failed to load market context");
        }

        setPricingData(toPricingData(response.data.marketContext));
        setLoadError(null);
      } catch {
        setLoadError("Using cached market snapshot");
      } finally {
        if (!silent) {
          setIsLoading(false);
        }
      }
    },
    [location, selectedCategories],
  );

  useEffect(() => {
    void loadPricingContext();
  }, [loadPricingContext]);

  useEffect(() => {
    const refreshSilently = () => {
      void loadPricingContext({ silent: true });
    };

    const intervalId = window.setInterval(refreshSilently, 60000);
    window.addEventListener("focus", refreshSilently);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refreshSilently);
    };
  }, [loadPricingContext]);

  useEffect(() => {
    if (!socket) return;

    const scheduleRefresh = () => {
      if (refreshTimeoutRef.current) {
        window.clearTimeout(refreshTimeoutRef.current);
      }

      refreshTimeoutRef.current = window.setTimeout(() => {
        void loadPricingContext({ silent: true });
      }, 450);
    };

    const realtimeEvents = [
      "booking:created",
      "booking:confirmed",
      "booking:active",
      "booking:completed",
      "booking:payment_completed",
      "booking_confirmed",
      "booking_completed",
      "review:new",
      "review:changed",
      "system:stats_updated",
      "profile:completion_updated",
    ];

    realtimeEvents.forEach((eventName) => socket.on(eventName, scheduleRefresh));

    return () => {
      realtimeEvents.forEach((eventName) => socket.off(eventName, scheduleRefresh));
      if (refreshTimeoutRef.current) {
        window.clearTimeout(refreshTimeoutRef.current);
        refreshTimeoutRef.current = null;
      }
    };
  }, [loadPricingContext, socket]);

  if (isLoading) {
    return (
      <div
        className={cn(
          "bg-white rounded-2xl border border-gray-100 p-4 animate-pulse",
          className
        )}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-100 rounded-xl" />
          <div className="flex-1">
            <div className="h-4 bg-gray-100 rounded w-32 mb-2" />
            <div className="h-3 bg-gray-50 rounded w-48" />
          </div>
        </div>
      </div>
    );
  }

  if (!pricingData) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "bg-linear-to-br from-teal-50 via-white to-emerald-50 rounded-2xl border border-teal-100/60 overflow-hidden",
        className
      )}
    >
      {/* Main Info */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="w-11 h-11 rounded-xl bg-linear-to-br from-teal-500 to-emerald-500 flex items-center justify-center shadow-sm shrink-0">
            <Banknote className="w-5 h-5 text-white" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-sm font-semibold text-gray-900">
                Average rates in{" "}
                <span className="text-teal-700">{pricingData.location}</span>
              </h3>
              {pricingData.trend === "up" && (
                <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-amber-50 text-amber-700 text-[10px] font-medium rounded-full">
                  <TrendingUp className="w-3 h-3" />+{pricingData.trendPercent}%
                </span>
              )}
            </div>

            {/* Price Range */}
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-gray-900">
                Rs. {pricingData.avgLow.toLocaleString("en-NP")}–{pricingData.avgHigh.toLocaleString("en-NP")}
              </span>
              <span className="text-sm text-gray-500">/hr</span>
            </div>

            {/* Meta */}
            <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {pricingData.sampleSize} caregivers
              </span>
              <span>Updated {formatUpdatedAt(pricingData.lastUpdated)}</span>
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-2 text-[11px] text-gray-600">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/80 border border-teal-100">
                <Users className="w-3 h-3 text-teal-600" />
                {pricingData.totalRegisteredUsers.toLocaleString("en-NP")} users
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/80 border border-teal-100">
                {pricingData.totalRegisteredCaregivers.toLocaleString("en-NP")} registered caregivers
              </span>
              {loadError && (
                <span className="text-amber-700">{loadError}</span>
              )}
            </div>
          </div>

          {/* Expand Button */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Expanded Breakdown */}
      <AnimatePresence>
        {isExpanded && pricingData.breakdown && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="border-t border-teal-100/60 overflow-hidden"
          >
            <div className="p-4 bg-white/60">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-teal-600" />
                <h4 className="text-sm font-semibold text-gray-800">
                  Rates by Care Type
                </h4>
              </div>
              <div className="space-y-2">
                {pricingData.breakdown.map((item) => (
                  <div
                    key={item.key || item.category}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-gray-600">
                      {item.category}
                      {typeof item.count === "number" ? ` (${item.count})` : ""}
                    </span>
                    <span className="font-semibold text-gray-900">
                      Rs. {item.avgLow.toLocaleString("en-NP")}–{item.avgHigh.toLocaleString("en-NP")}/hr
                    </span>
                  </div>
                ))}
              </div>

              {pricingData.locationBreakdown && pricingData.locationBreakdown.length > 0 && (
                <>
                  <div className="mt-5 mb-3 h-px bg-teal-100/80" />
                  <div className="flex items-center gap-2 mb-3">
                    <MapPin className="w-4 h-4 text-teal-600" />
                    <h4 className="text-sm font-semibold text-gray-800">
                      Top Locations
                    </h4>
                  </div>
                  <div className="space-y-2">
                    {pricingData.locationBreakdown.map((locationItem) => (
                      <div
                        key={`${locationItem.city}-${locationItem.state || ""}-${locationItem.country || ""}`}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="text-gray-600">
                          {locationItem.city}
                          {locationItem.state ? `, ${locationItem.state}` : ""}
                          <span className="text-gray-400"> ({locationItem.count})</span>
                        </span>
                        <span className="font-semibold text-gray-900">
                          Rs. {locationItem.avgLow.toLocaleString("en-NP")}–{locationItem.avgHigh.toLocaleString("en-NP")}/hr
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Tips */}
              <div className="mt-4 p-3 bg-teal-50/50 rounded-xl border border-teal-100/50">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-teal-600 mt-0.5 shrink-0" />
                  <p className="text-xs text-teal-700 leading-relaxed">
                    Rates vary based on experience, certifications, and
                    specific care requirements. Specialized care like
                    Alzheimer&apos;s typically commands higher rates.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});

export default LocationPricingContext;
