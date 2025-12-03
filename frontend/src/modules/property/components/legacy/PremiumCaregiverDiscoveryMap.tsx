// ============================================
// PREMIUM CAREGIVER DISCOVERY MAP
// Production-grade map with premium UI/UX
// ============================================

"use client";

import React, { useState, useEffect, useCallback, useRef, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type L from "leaflet";
import {
  MapPin,
  Navigation,
  Star,
  Clock,
  ChevronRight,
  Search,
  Filter,
  Maximize2,
  Minimize2,
  Layers,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  Loader2,
  X,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { CaregiverLocation, Coordinates } from "@/types/map.types";
import { formatDistance, getNearestCaregivers } from "@/lib/map-utils";

// ============================================
// TYPES
// ============================================

interface PremiumCaregiverDiscoveryMapProps {
  caregivers: CaregiverLocation[];
  userLocation: Coordinates;
  initialRadius?: number;
  onCaregiverClick?: (caregiver: CaregiverLocation) => void;
  onCaregiverSelect?: (caregiver: CaregiverLocation) => void;
  className?: string;
  showFilters?: boolean;
  showResultsList?: boolean;
  darkMode?: boolean;
}

interface FilterState {
  radius: number;
  minRating: number;
  maxPrice: number | null;
  availableNow: boolean;
  verified: boolean;
  specialties: string[];
}

// ============================================
// CONSTANTS
// ============================================

const RADIUS_OPTIONS = [
  { value: 3, label: "3 km" },
  { value: 5, label: "5 km" },
  { value: 10, label: "10 km" },
  { value: 15, label: "15 km" },
  { value: 20, label: "20 km" },
  { value: 50, label: "50 km" },
];

const ROLE_COLORS: Record<string, { bg: string; text: string; accent: string }> = {
  Nurse: { bg: "bg-rose-500", text: "text-rose-700", accent: "#EF4444" },
  "Child Care": { bg: "bg-amber-500", text: "text-amber-700", accent: "#F59E0B" },
  "Elder Care": { bg: "bg-violet-500", text: "text-violet-700", accent: "#8B5CF6" },
  Physiotherapy: { bg: "bg-emerald-500", text: "text-emerald-700", accent: "#10B981" },
  "Personal Care": { bg: "bg-blue-500", text: "text-blue-700", accent: "#3B82F6" },
  "Disability Support": { bg: "bg-pink-500", text: "text-pink-700", accent: "#EC4899" },
  "Mental Health Support": { bg: "bg-indigo-500", text: "text-indigo-700", accent: "#6366F1" },
};

const DEFAULT_FILTERS: FilterState = {
  radius: 10,
  minRating: 0,
  maxPrice: null,
  availableNow: false,
  verified: false,
  specialties: [],
};

// ============================================
// MAP TILES
// ============================================

const MAP_TILES = {
  light: {
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
  },
  dark: {
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
  },
  street: {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  },
};

// ============================================
// ANIMATION VARIANTS
// ============================================

const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      delay: i * 0.05,
      type: "spring",
      stiffness: 300,
      damping: 25,
    },
  }),
  exit: { opacity: 0, y: -20, scale: 0.95 },
};

const filterVariants = {
  hidden: { opacity: 0, height: 0 },
  visible: { opacity: 1, height: "auto", transition: { duration: 0.3 } },
  exit: { opacity: 0, height: 0 },
};

const pulseAnimation = `
  @keyframes mapMarkerPulse {
    0%, 100% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.2); opacity: 0.7; }
  }
`;

// ============================================
// CUSTOM MARKER ICON
// ============================================

function createPremiumMarkerIcon(leaflet: typeof L, options: {
  color: string;
  isActive?: boolean;
  isSelected?: boolean;
  size?: number;
}): L.DivIcon {
  const { color, isActive = true, isSelected = false, size = 44 } = options;
  const opacity = isActive ? 1 : 0.6;
  const scale = isSelected ? 1.2 : 1;
  const pulseClass = isSelected ? "map-marker-selected" : "";

  const iconHtml = `
    <div class="${pulseClass}" style="
      width: ${size}px;
      height: ${size}px;
      transform: scale(${scale});
      transition: transform 0.3s ease;
    ">
      <svg viewBox="0 0 40 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="markerGrad-${color.replace('#', '')}" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="${color}"/>
            <stop offset="100%" stop-color="${color}dd"/>
          </linearGradient>
          <filter id="dropShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="4" stdDeviation="3" flood-color="rgba(0,0,0,0.3)"/>
          </filter>
        </defs>
        <path filter="url(#dropShadow)" fill="url(#markerGrad-${color.replace('#', '')})" opacity="${opacity}" d="M20 0C8.954 0 0 8.954 0 20c0 14.48 18.42 26.2 19.2 26.79a1.38 1.38 0 001.6 0C21.58 46.2 40 34.48 40 20 40 8.954 31.046 0 20 0z"/>
        <circle cx="20" cy="18" r="10" fill="white" opacity="0.95"/>
        <text x="20" y="23" text-anchor="middle" font-size="14" font-family="system-ui" fill="${color}">★</text>
      </svg>
    </div>
  `;

  return leaflet.divIcon({
    html: iconHtml,
    className: "premium-map-marker",
    iconSize: [size, size + 8],
    iconAnchor: [size / 2, size + 8],
    popupAnchor: [0, -size],
  });
}

function createUserLocationIcon(leaflet: typeof L): L.DivIcon {
  const iconHtml = `
    <div style="
      width: 28px;
      height: 28px;
      position: relative;
    ">
      <div style="
        width: 28px;
        height: 28px;
        background: linear-gradient(135deg, #39B54A, #2d913c);
        border-radius: 50%;
        border: 4px solid white;
        box-shadow: 0 4px 12px rgba(57, 181, 74, 0.4);
        position: absolute;
      "></div>
      <div style="
        width: 56px;
        height: 56px;
        background: rgba(57, 181, 74, 0.2);
        border-radius: 50%;
        position: absolute;
        top: -14px;
        left: -14px;
        animation: mapMarkerPulse 2s ease-in-out infinite;
      "></div>
    </div>
  `;

  return leaflet.divIcon({
    html: iconHtml,
    className: "user-location-marker",
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

// ============================================
// CAREGIVER CARD COMPONENT
// ============================================

interface CaregiverCardProps {
  caregiver: CaregiverLocation & { distance: number };
  isSelected?: boolean;
  onClick?: (caregiver: CaregiverLocation) => void;
  onSelect?: (caregiver: CaregiverLocation) => void;
  index: number;
}

const CaregiverCard = memo<CaregiverCardProps>(({
  caregiver,
  isSelected,
  onClick,
  onSelect,
  index,
}) => {
  const roleStyle = ROLE_COLORS[caregiver.role] || ROLE_COLORS["Personal Care"];

  return (
    <motion.div
      custom={index}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onClick?.(caregiver)}
      className={cn(
        "relative bg-white rounded-2xl border-2 overflow-hidden cursor-pointer transition-all duration-300",
        isSelected
          ? "border-[#39B54A] shadow-lg shadow-[#39B54A]/20 ring-2 ring-[#39B54A]/20"
          : "border-gray-100 hover:border-gray-200 hover:shadow-lg"
      )}
    >
      {/* Top Accent Bar */}
      <div className={cn("h-1.5", roleStyle.bg)} />

      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg",
              roleStyle.bg
            )}>
              {caregiver.name.charAt(0)}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-0.5">{caregiver.name}</h3>
              <span className={cn(
                "inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium",
                "bg-gray-100",
                roleStyle.text
              )}>
                {caregiver.role}
              </span>
            </div>
          </div>

          {/* Verified Badge */}
          {caregiver.isVerified && (
            <div className="flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-medium">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Verified</span>
            </div>
          )}
        </div>

        {/* Stats Row */}
        <div className="flex items-center gap-4 mb-3">
          {caregiver.rating && (
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
              <span className="font-semibold text-gray-900">{caregiver.rating}</span>
              {caregiver.completedBookings && (
                <span className="text-xs text-gray-500">({caregiver.completedBookings})</span>
              )}
            </div>
          )}
          {caregiver.hourlyRate && (
            <div className="flex items-center gap-1 font-semibold text-gray-900">
              <span className="text-[#39B54A]">Rs. {caregiver.hourlyRate?.toLocaleString("en-NP")}</span>
              <span className="text-xs text-gray-500 font-normal">/hr</span>
            </div>
          )}
          <div className="flex items-center gap-1 text-gray-500 text-sm">
            <Navigation className="w-3.5 h-3.5" />
            <span>{formatDistance(caregiver.distance, "km", 1)}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <div className="flex items-center gap-2">
            {caregiver.isActive && (
              <span className="flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded-full text-xs font-medium">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                Available now
              </span>
            )}
            {caregiver.responseRate && caregiver.responseRate >= 90 && (
              <span className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                <Clock className="w-3 h-3" />
                Quick response
              </span>
            )}
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelect?.(caregiver);
            }}
            className="flex items-center gap-1 px-3 py-1.5 bg-[#39B54A] text-white rounded-lg text-sm font-medium hover:bg-[#2d913c] transition-colors"
          >
            View Profile
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Selected indicator */}
      {isSelected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute top-3 right-3 w-6 h-6 bg-[#39B54A] rounded-full flex items-center justify-center"
        >
          <Check className="w-4 h-4 text-white" />
        </motion.div>
      )}
    </motion.div>
  );
});

CaregiverCard.displayName = "CaregiverCard";

// ============================================
// FILTER PANEL COMPONENT
// ============================================

interface FilterPanelProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  onClose: () => void;
}

const FilterPanel = memo<FilterPanelProps>(({ filters, onFiltersChange, onClose }) => {
  return (
    <motion.div
      variants={filterVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="bg-white rounded-2xl border border-gray-200 shadow-xl p-5 mb-4"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <Filter className="w-4 h-4 text-[#39B54A]" />
          Filter Caregivers
        </h3>
        <button
          onClick={onClose}
          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-4">
        {/* Radius */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Search Radius
          </label>
          <div className="flex flex-wrap gap-2">
            {RADIUS_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => onFiltersChange({ ...filters, radius: option.value })}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                  filters.radius === option.value
                    ? "bg-[#39B54A] text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Minimum Rating */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Minimum Rating
          </label>
          <div className="flex gap-2">
            {[0, 3, 3.5, 4, 4.5].map((rating) => (
              <button
                key={rating}
                onClick={() => onFiltersChange({ ...filters, minRating: rating })}
                className={cn(
                  "flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                  filters.minRating === rating
                    ? "bg-amber-500 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                )}
              >
                {rating === 0 ? "Any" : (
                  <>
                    <Star className="w-3.5 h-3.5" />
                    {rating}+
                  </>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Quick Filters */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onFiltersChange({ ...filters, availableNow: !filters.availableNow })}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
              filters.availableNow
                ? "bg-green-500 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            )}
          >
            <span className="w-1.5 h-1.5 bg-current rounded-full" />
            Available Now
          </button>
          <button
            onClick={() => onFiltersChange({ ...filters, verified: !filters.verified })}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
              filters.verified
                ? "bg-emerald-500 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            )}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Verified Only
          </button>
        </div>
      </div>
    </motion.div>
  );
});

FilterPanel.displayName = "FilterPanel";

// ============================================
// MAIN COMPONENT
// ============================================

export const PremiumCaregiverDiscoveryMap = memo<PremiumCaregiverDiscoveryMapProps>(({
  caregivers,
  userLocation,
  initialRadius = 10,
  onCaregiverClick,
  onCaregiverSelect,
  className,
  showFilters = true,
  showResultsList = true,
  darkMode = false,
}) => {
  // State
  const [filters, setFilters] = useState<FilterState>({ ...DEFAULT_FILTERS, radius: initialRadius });
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [selectedCaregiverId, setSelectedCaregiverId] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [mapStyle, setMapStyle] = useState<keyof typeof MAP_TILES>(darkMode ? "dark" : "light");

  // Refs
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const radiusCircleRef = useRef<L.Circle | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const leafletRef = useRef<typeof L | null>(null);

  // Computed
  const filteredCaregivers = React.useMemo(() => {
    let result = getNearestCaregivers(caregivers, userLocation, filters.radius, "km");

    if (filters.minRating > 0) {
      result = result.filter(c => (c.rating || 0) >= filters.minRating);
    }
    if (filters.availableNow) {
      result = result.filter(c => c.isActive);
    }
    if (filters.verified) {
      result = result.filter(c => c.isVerified);
    }
    if (filters.maxPrice) {
      result = result.filter(c => (c.hourlyRate || 0) <= filters.maxPrice!);
    }

    return result;
  }, [caregivers, userLocation, filters]);

  // ============================================
  // MAP INITIALIZATION
  // ============================================

  useEffect(() => {
    // Only initialize once - don't re-create map on location changes
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const initMap = async () => {
      // Dynamically import Leaflet
      const leaflet = (await import('leaflet')).default;
      await import('leaflet/dist/leaflet.css');
      leafletRef.current = leaflet;

      if (!mapContainerRef.current) return;

      const map = leaflet.map(mapContainerRef.current, {
        center: [userLocation.latitude, userLocation.longitude],
        zoom: 13,
        zoomControl: false,
      });

      // Add tile layer
      const tiles = MAP_TILES[mapStyle];
      const tileLayer = leaflet.tileLayer(tiles.url, {
        attribution: tiles.attribution,
        maxZoom: 19,
      }).addTo(map);
      tileLayerRef.current = tileLayer;

      // Add zoom control to bottom right
      leaflet.control.zoom({ position: "bottomright" }).addTo(map);

      // Add markers layer
      markersLayerRef.current = leaflet.layerGroup().addTo(map);

      mapInstanceRef.current = map;
      setIsLoading(false);

      // Add pulse animation styles
      const style = document.createElement("style");
      style.textContent = pulseAnimation;
      document.head.appendChild(style);
    };

    initMap();

    return () => {
      // Safe cleanup with try-catch to prevent errors during unmount
      try {
        markersLayerRef.current?.clearLayers();
      } catch {
        // Ignore
      }
      try {
        mapInstanceRef.current?.remove();
      } catch {
        // Ignore
      }
      mapInstanceRef.current = null;
      tileLayerRef.current = null;
      radiusCircleRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // ============================================
  // UPDATE MAP CENTER ON LOCATION CHANGE
  // ============================================

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    
    try {
      map.setView([userLocation.latitude, userLocation.longitude], map.getZoom());
    } catch {
      // Map may have been removed
    }
  }, [userLocation.latitude, userLocation.longitude]);

  // ============================================
  // UPDATE TILE LAYER
  // ============================================

  useEffect(() => {
    if (!mapInstanceRef.current || !tileLayerRef.current) return;

    const tiles = MAP_TILES[mapStyle];
    tileLayerRef.current.setUrl(tiles.url);
  }, [mapStyle]);

  // ============================================
  // UPDATE MARKERS
  // ============================================

  useEffect(() => {
    // Guard against accessing removed map or missing leaflet
    const map = mapInstanceRef.current;
    const leaflet = leafletRef.current;
    if (!map || !leaflet) return;
    
    // Check if map container is still valid (prevents _leaflet_pos errors)
    try {
      // This will throw if map has been removed
      map.getContainer();
    } catch {
      return;
    }
    
    const markersLayer = markersLayerRef.current;
    if (!markersLayer) return;

    // Clear existing (with safety check)
    try {
      markersLayer.clearLayers();
    } catch {
      // Layer group may have been removed
      return;
    }
    
    if (radiusCircleRef.current) {
      try {
        radiusCircleRef.current.remove();
      } catch {
        // Circle may have been removed
      }
      radiusCircleRef.current = null;
    }

    // Add user location marker
    const userIcon = createUserLocationIcon(leaflet);
    leaflet.marker([userLocation.latitude, userLocation.longitude], { icon: userIcon })
      .bindPopup('<div style="font-weight: 600; color: #39B54A;">📍 Your Location</div>')
      .addTo(markersLayer);

    // Add caregiver markers
    filteredCaregivers.forEach((caregiver) => {
      const roleColor = ROLE_COLORS[caregiver.role]?.accent || "#3B82F6";
      const isSelected = selectedCaregiverId === caregiver.id;
      const icon = createPremiumMarkerIcon(leaflet, {
        color: roleColor,
        ...(caregiver.isActive !== undefined ? { isActive: caregiver.isActive } : {}),
        isSelected,
      });

      const marker = leaflet.marker([caregiver.latitude, caregiver.longitude], { icon });

      // Premium popup content
      const popupHtml = `
        <div style="min-width: 200px; padding: 8px;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
            <div style="
              width: 36px; height: 36px;
              background: ${roleColor};
              border-radius: 10px;
              color: white;
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: bold;
            ">${caregiver.name.charAt(0)}</div>
            <div>
              <div style="font-weight: 600; color: #111827;">${caregiver.name}</div>
              <div style="font-size: 12px; color: ${roleColor}; font-weight: 500;">${caregiver.role}</div>
            </div>
          </div>
          <div style="display: flex; gap: 12px; margin-bottom: 8px; font-size: 13px;">
            ${caregiver.rating ? `<span style="color: #F59E0B;">★ ${caregiver.rating}</span>` : ""}
            ${caregiver.hourlyRate ? `<span style="color: #39B54A; font-weight: 600;">Rs. ${caregiver.hourlyRate}/hr</span>` : ""}
          </div>
          <div style="
            padding: 8px;
            background: #F9FAFB;
            border-radius: 8px;
            font-size: 13px;
            color: #6B7280;
          ">
            📍 ${formatDistance(caregiver.distance, "km", 1)} away
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml, {
        className: "premium-map-popup",
        maxWidth: 280,
      });

      marker.on("click", () => {
        setSelectedCaregiverId(caregiver.id);
        onCaregiverClick?.(caregiver);
      });

      marker.addTo(markersLayer);
    });

    // Add radius circle (with safety check)
    try {
      const circle = leaflet.circle([userLocation.latitude, userLocation.longitude], {
        radius: filters.radius * 1000,
        color: "#39B54A",
        fillColor: "#39B54A",
        fillOpacity: 0.08,
        weight: 2,
        dashArray: "6, 8",
      }).addTo(map);
      radiusCircleRef.current = circle;

      // Fit bounds
      if (filteredCaregivers.length > 0) {
        const bounds = leaflet.latLngBounds([
          [userLocation.latitude, userLocation.longitude],
          ...filteredCaregivers.map(c => [c.latitude, c.longitude] as L.LatLngExpression),
        ]);
        map.fitBounds(bounds, { padding: [60, 60], maxZoom: 14 });
      }
    } catch {
      // Map may have been removed during this operation
    }

  }, [filteredCaregivers, userLocation, filters.radius, selectedCaregiverId, onCaregiverClick]);

  // ============================================
  // HANDLERS
  // ============================================

  const handleCenterOnUser = useCallback(() => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.flyTo([userLocation.latitude, userLocation.longitude], 14, {
      duration: 1,
    });
  }, [userLocation]);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => !prev);
  }, []);

  const cycleMapStyle = useCallback(() => {
    const styles: Array<keyof typeof MAP_TILES> = ["light", "dark", "street"];
    const currentIndex = styles.indexOf(mapStyle);
    const nextIndex = (currentIndex + 1) % styles.length;
    setMapStyle(styles[nextIndex]);
  }, [mapStyle]);

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className={cn(
      "relative",
      isFullscreen && "fixed inset-0 z-50 bg-white",
      className
    )}>
      {/* Add global styles for popups */}
      <style>{`
        .premium-map-popup .leaflet-popup-content-wrapper {
          border-radius: 16px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.15);
          border: 1px solid #E5E7EB;
        }
        .premium-map-popup .leaflet-popup-tip {
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .premium-map-marker {
          background: transparent !important;
          border: none !important;
        }
        .user-location-marker {
          background: transparent !important;
          border: none !important;
        }
      `}</style>

      {/* Header Controls */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-gray-200 shadow-sm">
            <MapPin className="w-4 h-4 text-[#39B54A]" />
            <span className="font-semibold text-gray-900">{filteredCaregivers.length}</span>
            <span className="text-gray-500 text-sm">
              caregiver{filteredCaregivers.length !== 1 ? "s" : ""} found
            </span>
          </div>

          {showFilters && (
            <button
              onClick={() => setShowFilterPanel(!showFilterPanel)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all",
                showFilterPanel
                  ? "bg-[#39B54A] text-white"
                  : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 shadow-sm"
              )}
            >
              <Filter className="w-4 h-4" />
              Filters
              {(filters.minRating > 0 || filters.availableNow || filters.verified) && (
                <span className="w-2 h-2 bg-red-500 rounded-full" />
              )}
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={cycleMapStyle}
            className="p-2.5 bg-white border border-gray-200 rounded-xl text-gray-600 hover:text-[#39B54A] hover:bg-gray-50 transition-colors shadow-sm"
            title="Change map style"
          >
            <Layers className="w-4 h-4" />
          </button>
          <button
            onClick={handleCenterOnUser}
            className="p-2.5 bg-white border border-gray-200 rounded-xl text-gray-600 hover:text-[#39B54A] hover:bg-gray-50 transition-colors shadow-sm"
            title="Center on my location"
          >
            <Navigation className="w-4 h-4" />
          </button>
          <button
            onClick={toggleFullscreen}
            className="p-2.5 bg-white border border-gray-200 rounded-xl text-gray-600 hover:text-[#39B54A] hover:bg-gray-50 transition-colors shadow-sm"
            title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Filter Panel */}
      <AnimatePresence>
        {showFilterPanel && (
          <FilterPanel
            filters={filters}
            onFiltersChange={setFilters}
            onClose={() => setShowFilterPanel(false)}
          />
        )}
      </AnimatePresence>

      {/* Map Container */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative rounded-2xl overflow-hidden shadow-lg border border-gray-200"
        style={{ height: isFullscreen ? "calc(100vh - 200px)" : "500px" }}
      >
        <div ref={mapContainerRef} className="w-full h-full" />

        {/* Loading Overlay */}
        <AnimatePresence>
          {isLoading && (
            <motion.div
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-white/90 backdrop-blur-sm flex items-center justify-center z-10"
            >
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 text-[#39B54A] animate-spin" />
                <span className="text-gray-600 font-medium">Loading map...</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Results List */}
      {showResultsList && filteredCaregivers.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#39B54A]" />
            Nearby Caregivers
          </h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence>
              {filteredCaregivers.slice(0, 6).map((caregiver, index) => (
                <CaregiverCard
                  key={caregiver.id}
                  caregiver={caregiver}
                  isSelected={selectedCaregiverId === caregiver.id}
                  onClick={(c) => {
                    setSelectedCaregiverId(c.id);
                    onCaregiverClick?.(c);
                    
                    // Fly to marker
                    if (mapInstanceRef.current) {
                      mapInstanceRef.current.flyTo([c.latitude, c.longitude], 15, {
                        duration: 0.8,
                      });
                    }
                  }}
                  {...(onCaregiverSelect !== undefined ? { onSelect: onCaregiverSelect } : {})}
                  index={index}
                />
              ))}
            </AnimatePresence>
          </div>

          {filteredCaregivers.length > 6 && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-4 w-full py-3 text-[#39B54A] font-semibold hover:bg-[#39B54A]/5 rounded-xl transition-colors"
            >
              View all {filteredCaregivers.length} caregivers
            </motion.button>
          )}
        </motion.div>
      )}

      {/* Empty State */}
      {filteredCaregivers.length === 0 && !isLoading && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 p-8 bg-gray-50 rounded-2xl text-center"
        >
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Search className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No caregivers found</h3>
          <p className="text-gray-500 mb-4">
            Try expanding your search radius or adjusting filters
          </p>
          <button
            onClick={() => setFilters({ ...DEFAULT_FILTERS, radius: 50 })}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#39B54A] text-white rounded-xl font-medium hover:bg-[#2d913c] transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Expand Search
          </button>
        </motion.div>
      )}
    </div>
  );
});

PremiumCaregiverDiscoveryMap.displayName = "PremiumCaregiverDiscoveryMap";

export default PremiumCaregiverDiscoveryMap;
