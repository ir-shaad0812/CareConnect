"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import {
  MapPin,
  Navigation,
  Navigation2,
  Home,
  User,
  Phone,
  Calendar,
  Clock,
  Shield,
  ShieldCheck,
  ShieldAlert,
  ChevronUp,
  Layers,
  LocateFixed,
  Plus,
  Minus,
  ExternalLink,
  CheckCircle,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Route,
  Compass,
  Car,
  Timer,
  Ban,
  X,
} from "lucide-react";

// ============================================
// TYPES
// ============================================

export interface CareSeekerLocation {
  name: string;
  address: string; // Full address (only shown in tooltip/internal)
  maskedAddress: string; // e.g., "Ward 5, Kathmandu"
  city: string;
  state: string;
  zipCode?: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  phone?: string;
  emergencyContact?: {
    name: string;
    relation: string;
    phone: string;
  };
}

export interface BookingDetails {
  id: string;
  status: "approved" | "in_progress" | "completed" | "cancelled";
  serviceType: string;
  scheduledDate: string;
  scheduledTime: string;
  duration: string;
  notes?: string;
  caregiverAssignedAt?: string;
  adminApprovedAt?: string;
}

export interface CaregiverNavigationMapProps {
  careSeekerLocation: CareSeekerLocation;
  bookingDetails: BookingDetails;
  caregiverLocation?: {
    lat: number;
    lng: number;
  };
  estimatedArrival?: {
    distance: string; // "3.2 km"
    duration: string; // "12 min"
  };
  onOpenDirections?: () => void;
  onConfirmArrival?: () => void;
  onStartService?: () => void;
  onContactCareSeeker?: () => void;
  onEmergencyContact?: () => void;
  isApproved?: boolean;
  isAccessRevoked?: boolean;
  className?: string;
}

// ============================================
// MAP STYLE OPTIONS
// ============================================

type MapStyle = "streets" | "light" | "dark" | "satellite";

const MAP_STYLES: { value: MapStyle; label: string; icon: React.ReactNode; colors: { bg: string; road: string; building: string; text: string } }[] = [
  {
    value: "streets",
    label: "Streets",
    icon: <MapPin className="w-4 h-4" />,
    colors: { bg: "#e8e4da", road: "#ffffff", building: "#d4d0c4", text: "#333333" },
  },
  {
    value: "light",
    label: "Light",
    icon: <Compass className="w-4 h-4" />,
    colors: { bg: "#f8f9fa", road: "#ffffff", building: "#e9ecef", text: "#212529" },
  },
  {
    value: "dark",
    label: "Dark",
    icon: <Navigation2 className="w-4 h-4" />,
    colors: { bg: "#1a1a2e", road: "#2d2d44", building: "#252540", text: "#ffffff" },
  },
  {
    value: "satellite",
    label: "Satellite",
    icon: <Layers className="w-4 h-4" />,
    colors: { bg: "#1a3329", road: "#2a4a3a", building: "#1a3329", text: "#ffffff" },
  },
];

// ============================================
// ANIMATED MAP VIEW COMPONENT
// ============================================

interface MapViewProps {
  style: MapStyle;
  careSeekerCoords: { lat: number; lng: number };
  caregiverCoords?: { lat: number; lng: number } | undefined;
  zoom: number;
  onCareSeekerMarkerClick: () => void;
  showRoute: boolean;
}

const MapView = ({
  style,
  caregiverCoords,
  zoom,
  onCareSeekerMarkerClick,
  showRoute,
}: MapViewProps) => {
  const styleConfig = MAP_STYLES.find((s) => s.value === style) || MAP_STYLES[0];
  const { colors } = styleConfig;
  const isDark = style === "dark" || style === "satellite";

  // Animation for route
  const [routeProgress, setRouteProgress] = useState(0);
  
  useEffect(() => {
    if (showRoute && caregiverCoords) {
      const interval = setInterval(() => {
        setRouteProgress((prev) => (prev >= 1 ? 0 : prev + 0.02));
      }, 100);
      return () => clearInterval(interval);
    }

    return undefined;
  }, [showRoute, caregiverCoords]);

  // Grid pattern size based on zoom
  const gridSize = Math.max(15, 50 - zoom * 2);

  return (
    <div
      className="relative w-full h-full overflow-hidden transition-colors duration-700"
      style={{ backgroundColor: colors.bg }}
    >
      {/* Grid Pattern - Street network simulation */}
      <div
        className="absolute inset-0 transition-opacity duration-500"
        style={{
          opacity: style === "satellite" ? 0.1 : 0.3,
          backgroundImage: `
            linear-gradient(${isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)"} 1px, transparent 1px),
            linear-gradient(90deg, ${isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)"} 1px, transparent 1px)
          `,
          backgroundSize: `${gridSize}px ${gridSize}px`,
        }}
      />

      {/* Major Roads SVG */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        {/* Main horizontal road */}
        <path
          d="M 0 50 Q 20 48, 40 50 T 60 52 T 100 50"
          fill="none"
          stroke={colors.road}
          strokeWidth={style === "satellite" ? "0.8" : "2.5"}
          strokeLinecap="round"
          opacity={0.8}
        />
        {/* Main vertical road */}
        <path
          d="M 50 0 Q 48 25, 50 40 T 52 60 T 50 100"
          fill="none"
          stroke={colors.road}
          strokeWidth={style === "satellite" ? "0.8" : "2.5"}
          strokeLinecap="round"
          opacity={0.8}
        />
        {/* Secondary roads */}
        <path d="M 0 25 L 100 30" fill="none" stroke={colors.road} strokeWidth="1" opacity={0.5} />
        <path d="M 0 75 L 100 72" fill="none" stroke={colors.road} strokeWidth="1" opacity={0.5} />
        <path d="M 25 0 L 28 100" fill="none" stroke={colors.road} strokeWidth="1" opacity={0.5} />
        <path d="M 75 0 L 72 100" fill="none" stroke={colors.road} strokeWidth="1" opacity={0.5} />
        
        {/* Tertiary roads */}
        <path d="M 10 0 L 15 100" fill="none" stroke={colors.road} strokeWidth="0.5" opacity={0.3} />
        <path d="M 85 0 L 90 100" fill="none" stroke={colors.road} strokeWidth="0.5" opacity={0.3} />
        <path d="M 0 15 L 100 12" fill="none" stroke={colors.road} strokeWidth="0.5" opacity={0.3} />
        <path d="M 0 88 L 100 85" fill="none" stroke={colors.road} strokeWidth="0.5" opacity={0.3} />
      </svg>

      {/* Building blocks */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(24)].map((_, i) => {
          const col = i % 6;
          const row = Math.floor(i / 6);
          const isNearRoute = (col === 2 || col === 3) && (row === 1 || row === 2);
          
          return (
            <motion.div
              key={i}
              className="absolute rounded-sm"
              style={{
                backgroundColor: colors.building,
                left: `${5 + col * 16}%`,
                top: `${8 + row * 24}%`,
                width: `${6 + (i % 3) * 2}%`,
                height: `${5 + (i % 2) * 3}%`,
                opacity: isNearRoute ? 0.7 : 0.4,
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: isNearRoute ? 0.7 : 0.4 }}
              transition={{ delay: i * 0.02 }}
            />
          );
        })}
      </div>

      {/* Route Line */}
      {caregiverCoords && showRoute && (
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ zIndex: 5 }}
        >
          <defs>
            <linearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#4461F2" />
              <stop offset="50%" stopColor="#6366F1" />
              <stop offset="100%" stopColor="#8B54F7" />
            </linearGradient>
            <filter id="routeGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          
          {/* Route shadow */}
          <motion.path
            d="M 20% 70% Q 35% 55%, 45% 50% T 65% 35%"
            fill="none"
            stroke="rgba(0,0,0,0.2)"
            strokeWidth="8"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
          />
          
          {/* Main route line */}
          <motion.path
            d="M 20% 70% Q 35% 55%, 45% 50% T 65% 35%"
            fill="none"
            stroke="url(#routeGradient)"
            strokeWidth="5"
            strokeLinecap="round"
            filter="url(#routeGlow)"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
          />
          
          {/* Animated dashes overlay */}
          <motion.path
            d="M 20% 70% Q 35% 55%, 45% 50% T 65% 35%"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray="8 12"
            strokeDashoffset={routeProgress * 100}
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 0.6 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
          />
        </svg>
      )}

      {/* Caregiver Location Marker (You) */}
      {caregiverCoords && (
        <motion.div
          className="absolute"
          style={{ left: "20%", top: "70%", zIndex: 10 }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.2 }}
        >
          {/* Pulse rings */}
          <motion.div
            className="absolute -inset-6 rounded-full"
            style={{ backgroundColor: "rgba(68, 97, 242, 0.2)" }}
            animate={{
              scale: [1, 1.8, 1],
              opacity: [0.5, 0, 0.5],
            }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
          />
          <motion.div
            className="absolute -inset-3 rounded-full"
            style={{ backgroundColor: "rgba(68, 97, 242, 0.3)" }}
            animate={{
              scale: [1, 1.4, 1],
              opacity: [0.6, 0.2, 0.6],
            }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeOut", delay: 0.3 }}
          />
          
          {/* Marker body */}
          <div className="relative">
            <div className="w-12 h-12 rounded-full bg-linear-to-br from-primary-500 to-[#6366F1] shadow-lg shadow-[#4461F2]/40 flex items-center justify-center border-[3px] border-white">
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                <Navigation className="w-6 h-6 text-white" />
              </motion.div>
            </div>
            
            {/* Label */}
            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap">
              <span className="text-xs font-semibold bg-white px-3 py-1 rounded-full shadow-md text-gray-700">
                You
              </span>
            </div>
          </div>
        </motion.div>
      )}

      {/* Care Seeker Home Marker */}
      <motion.div
        className="absolute cursor-pointer"
        style={{ left: "65%", top: "35%", zIndex: 15 }}
        initial={{ scale: 0, y: -30, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.4 }}
        onClick={onCareSeekerMarkerClick}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
      >
        <div className="relative">
          {/* Destination glow */}
          <motion.div
            className="absolute -inset-4 rounded-full bg-emerald-400/20"
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.4, 0, 0.4],
            }}
            transition={{ duration: 2.5, repeat: Infinity }}
          />
          
          {/* Custom home pin */}
          <div className="relative">
            <svg width="48" height="60" viewBox="0 0 48 60" fill="none" className="drop-shadow-lg">
              {/* Pin body */}
              <path
                d="M24 0C10.745 0 0 10.745 0 24c0 16.8 24 36 24 36s24-19.2 24-36C48 10.745 37.255 0 24 0z"
                fill="url(#homePin)"
              />
              {/* Inner shadow */}
              <path
                d="M24 4C13.507 4 4 13.507 4 24c0 13.44 20 28.8 20 28.8s20-15.36 20-28.8C44 13.507 34.493 4 24 4z"
                fill="url(#homePinInner)"
                opacity="0.3"
              />
              <defs>
                <linearGradient id="homePin" x1="0" y1="0" x2="0" y2="60">
                  <stop stopColor="#10B981" />
                  <stop offset="1" stopColor="#059669" />
                </linearGradient>
                <linearGradient id="homePinInner" x1="0" y1="0" x2="0" y2="60">
                  <stop stopColor="#ffffff" stopOpacity="0.4" />
                  <stop offset="1" stopColor="#000000" stopOpacity="0.1" />
                </linearGradient>
              </defs>
            </svg>
            
            {/* Home icon */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-inner">
              <Home className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
          
          {/* Label */}
          <motion.div
            className="absolute -bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <span className="text-xs font-bold bg-emerald-500 text-white px-3 py-1.5 rounded-full shadow-lg">
              Care Seeker Home
            </span>
          </motion.div>
        </div>
      </motion.div>

      {/* Map Attribution */}
      <div
        className="absolute bottom-2 right-2 text-[10px] px-2 py-1 rounded bg-black/10"
        style={{ color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.4)" }}
      >
        © Mapbox © OpenStreetMap
      </div>
    </div>
  );
};

// ============================================
// ETA DISPLAY COMPONENT
// ============================================

interface ETADisplayProps {
  distance: string;
  duration: string;
  isDark?: boolean;
}

const ETADisplay = ({ distance, duration, isDark = false }: ETADisplayProps) => (
  <motion.div
    className={`absolute top-4 left-4 z-10 ${
      isDark ? "bg-gray-900/90" : "bg-white/95"
    } backdrop-blur-sm rounded-2xl shadow-lg px-4 py-3`}
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay: 0.5 }}
  >
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-primary-500/10 flex items-center justify-center">
          <Timer className={`w-4 h-4 ${isDark ? "text-blue-400" : "text-primary-500"}`} />
        </div>
        <div>
          <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>ETA</p>
          <p className={`text-lg font-bold ${isDark ? "text-white" : "text-gray-900"}`}>{duration}</p>
        </div>
      </div>
      <div className={`w-px h-10 ${isDark ? "bg-gray-700" : "bg-gray-200"}`} />
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
          <Car className={`w-4 h-4 ${isDark ? "text-emerald-400" : "text-emerald-500"}`} />
        </div>
        <div>
          <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>Distance</p>
          <p className={`text-lg font-bold ${isDark ? "text-white" : "text-gray-900"}`}>{distance}</p>
        </div>
      </div>
    </div>
  </motion.div>
);

// ============================================
// MARKER TOOLTIP COMPONENT
// ============================================

interface MarkerTooltipProps {
  careSeekerName: string;
  bookingId: string;
  scheduledDate: string;
  scheduledTime: string;
  fullAddress: string;
  onClose: () => void;
}

const MarkerTooltip = ({
  careSeekerName,
  bookingId,
  scheduledDate,
  scheduledTime,
  fullAddress,
  onClose,
}: MarkerTooltipProps) => {
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <motion.div
      className="absolute bg-white rounded-2xl shadow-2xl p-5 z-30 min-w-[280px]"
      style={{ left: "calc(65% + 35px)", top: "25%" }}
      initial={{ opacity: 0, scale: 0.9, x: -15 }}
      animate={{ opacity: 1, scale: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.9, x: -15 }}
    >
      {/* Close button */}
      <button
        className="absolute top-3 right-3 p-1.5 hover:bg-gray-100 rounded-full transition-colors"
        onClick={onClose}
      >
        <X className="w-4 h-4 text-gray-400" />
      </button>

      {/* Pointer arrow */}
      <div className="absolute left-0 top-1/2 -translate-x-full -translate-y-1/2">
        <div className="w-0 h-0 border-t-8 border-b-8 border-r-8 border-transparent border-r-white" />
      </div>

      {/* Content */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
            <Home className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h4 className="font-bold text-gray-900">{careSeekerName}</h4>
            <p className="text-xs text-gray-500">Care Seeker</p>
          </div>
        </div>

        <div className="h-px bg-gray-100" />

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500 w-20">Booking:</span>
            <span className="font-medium text-gray-900">#{bookingId}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500 w-20">Date:</span>
            <span className="font-medium text-gray-900">{formatDate(scheduledDate)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500 w-20">Time:</span>
            <span className="font-medium text-gray-900">{scheduledTime}</span>
          </div>
        </div>

        <div className="h-px bg-gray-100" />

        {/* Full address - only shown in tooltip */}
        <div className="bg-gray-50 rounded-xl p-3">
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
            <p className="text-sm text-gray-700 leading-relaxed">{fullAddress}</p>
          </div>
        </div>

        <p className="text-xs text-gray-400 flex items-center gap-1">
          <Lock className="w-3 h-3" />
          Address visible only in this tooltip
        </p>
      </div>
    </motion.div>
  );
};

// ============================================
// MAP CONTROLS COMPONENT
// ============================================

interface MapControlsProps {
  mapStyle: MapStyle;
  onStyleChange: (style: MapStyle) => void;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onRecenter: () => void;
  showStylePicker: boolean;
  onToggleStylePicker: () => void;
}

const MapControls = ({
  mapStyle,
  onStyleChange,
  zoom,
  onZoomIn,
  onZoomOut,
  onRecenter,
  showStylePicker,
  onToggleStylePicker,
}: MapControlsProps) => {
  const isDark = mapStyle === "dark" || mapStyle === "satellite";

  return (
    <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
      {/* Zoom Controls */}
      <div className={`${isDark ? "bg-gray-900/90" : "bg-white/95"} backdrop-blur-sm rounded-xl shadow-lg overflow-hidden`}>
        <motion.button
          onClick={onZoomIn}
          disabled={zoom >= 18}
          className={`w-11 h-11 flex items-center justify-center transition-colors disabled:opacity-40 ${
            isDark ? "hover:bg-white/10 text-white" : "hover:bg-gray-100 text-gray-700"
          }`}
          whileTap={{ scale: 0.95 }}
        >
          <Plus className="w-5 h-5" />
        </motion.button>
        <div className={`h-px ${isDark ? "bg-gray-700" : "bg-gray-200"}`} />
        <motion.button
          onClick={onZoomOut}
          disabled={zoom <= 5}
          className={`w-11 h-11 flex items-center justify-center transition-colors disabled:opacity-40 ${
            isDark ? "hover:bg-white/10 text-white" : "hover:bg-gray-100 text-gray-700"
          }`}
          whileTap={{ scale: 0.95 }}
        >
          <Minus className="w-5 h-5" />
        </motion.button>
      </div>

      {/* Recenter Button */}
      <motion.button
        onClick={onRecenter}
        className={`w-11 h-11 ${isDark ? "bg-gray-900/90 text-white hover:bg-gray-800" : "bg-white/95 text-gray-700 hover:bg-gray-100"} backdrop-blur-sm rounded-xl shadow-lg flex items-center justify-center transition-colors`}
        whileTap={{ scale: 0.95 }}
        title="Re-center map"
      >
        <LocateFixed className="w-5 h-5" />
      </motion.button>

      {/* Style Toggle */}
      <div className="relative">
        <motion.button
          onClick={onToggleStylePicker}
          className={`w-11 h-11 ${isDark ? "bg-gray-900/90 text-white hover:bg-gray-800" : "bg-white/95 text-gray-700 hover:bg-gray-100"} backdrop-blur-sm rounded-xl shadow-lg flex items-center justify-center transition-colors`}
          whileTap={{ scale: 0.95 }}
          title="Change map style"
        >
          <Layers className="w-5 h-5" />
        </motion.button>

        {/* Style Picker Dropdown */}
        <AnimatePresence>
          {showStylePicker && (
            <motion.div
              className="absolute right-full mr-2 top-0 bg-white rounded-xl shadow-2xl overflow-hidden min-w-[140px]"
              initial={{ opacity: 0, x: 10, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 10, scale: 0.95 }}
            >
              {MAP_STYLES.map((style) => (
                <motion.button
                  key={style.value}
                  onClick={() => {
                    onStyleChange(style.value);
                    onToggleStylePicker();
                  }}
                  className={`flex items-center gap-3 px-4 py-3 w-full hover:bg-gray-50 transition-colors ${
                    mapStyle === style.value ? "bg-primary-500/5" : ""
                  }`}
                  whileHover={{ x: 2 }}
                >
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: style.colors.bg }}
                  >
                    <span style={{ color: style.colors.text }}>{style.icon}</span>
                  </div>
                  <span className="text-sm font-medium text-gray-700">{style.label}</span>
                  {mapStyle === style.value && (
                    <CheckCircle className="w-4 h-4 text-primary-500 ml-auto" />
                  )}
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

// ============================================
// INFO PANEL COMPONENT
// ============================================

interface InfoPanelProps {
  careSeekerLocation: CareSeekerLocation;
  bookingDetails: BookingDetails;
  onOpenDirections?: () => void;
  onConfirmArrival?: (() => void) | undefined;
  onContactCareSeeker?: () => void;
  onEmergencyContact?: () => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
  isMobile: boolean;
}

const InfoPanel = ({
  careSeekerLocation,
  bookingDetails,
  onOpenDirections,
  onConfirmArrival,
  onContactCareSeeker,
  onEmergencyContact,
  isExpanded,
  onToggleExpand,
  isMobile,
}: InfoPanelProps) => {
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const panelContent = (
    <>
      {/* Status Indicator */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <motion.div
            className="w-2.5 h-2.5 rounded-full bg-emerald-500"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
          <span className="text-sm font-semibold text-emerald-600">
            {bookingDetails.status === "approved" && "Booking Approved"}
            {bookingDetails.status === "in_progress" && "Service In Progress"}
            {bookingDetails.status === "completed" && "Service Completed"}
          </span>
        </div>
        <span className="text-xs font-mono text-gray-400 bg-gray-100 px-2 py-1 rounded">
          {bookingDetails.id}
        </span>
      </div>

      {/* Care Seeker Profile */}
      <div className="flex items-center gap-4 mb-5">
        <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-primary-500 to-secondary-500 flex items-center justify-center shadow-lg shadow-[#4461F2]/20">
          <User className="w-7 h-7 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900">{careSeekerLocation.name}</h3>
          <p className="text-sm text-gray-500">{bookingDetails.serviceType}</p>
        </div>
      </div>

      {/* Address Card - Masked for privacy */}
      <div className="bg-linear-to-br from-gray-50 to-gray-100/50 rounded-2xl p-4 mb-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center shrink-0">
            <MapPin className="w-5 h-5 text-gray-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-900 mb-1">
              {careSeekerLocation.maskedAddress}
            </p>
            <p className="text-sm text-gray-500">
              {careSeekerLocation.city}, {careSeekerLocation.state}
            </p>
            <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
              <Lock className="w-3 h-3" />
              Full address visible in map marker
            </p>
          </div>
        </div>
      </div>

      {/* Schedule Info */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-white rounded-xl p-3 border border-gray-100">
          <div className="flex items-center gap-2 text-gray-400 mb-1.5">
            <Calendar className="w-4 h-4" />
            <span className="text-xs font-medium">Date</span>
          </div>
          <p className="text-sm font-semibold text-gray-900">
            {formatDate(bookingDetails.scheduledDate)}
          </p>
        </div>
        <div className="bg-white rounded-xl p-3 border border-gray-100">
          <div className="flex items-center gap-2 text-gray-400 mb-1.5">
            <Clock className="w-4 h-4" />
            <span className="text-xs font-medium">Time</span>
          </div>
          <p className="text-sm font-semibold text-gray-900">
            {bookingDetails.scheduledTime}
          </p>
          <p className="text-xs text-gray-500">{bookingDetails.duration}</p>
        </div>
      </div>

      {/* Contact Options */}
      {careSeekerLocation.phone && (
        <motion.button
          onClick={onContactCareSeeker}
          className="w-full flex items-center gap-3 p-3 bg-blue-50 hover:bg-blue-100 rounded-xl mb-3 transition-colors"
          whileTap={{ scale: 0.98 }}
        >
          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
            <Phone className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-left flex-1">
            <p className="text-xs text-blue-600 font-medium">Contact Care Seeker</p>
            <p className="text-sm font-semibold text-blue-700">{careSeekerLocation.phone}</p>
          </div>
        </motion.button>
      )}

      {/* Emergency Contact */}
      {careSeekerLocation.emergencyContact && (
        <motion.button
          onClick={onEmergencyContact}
          className="w-full flex items-center gap-3 p-3 bg-amber-50 hover:bg-amber-100 rounded-xl mb-5 transition-colors"
          whileTap={{ scale: 0.98 }}
        >
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
          </div>
          <div className="text-left flex-1">
            <p className="text-xs text-amber-600 font-medium">Emergency Contact</p>
            <p className="text-sm font-semibold text-amber-700">
              {careSeekerLocation.emergencyContact.name} ({careSeekerLocation.emergencyContact.relation})
            </p>
            <p className="text-xs text-amber-600">{careSeekerLocation.emergencyContact.phone}</p>
          </div>
        </motion.button>
      )}

      {/* Security Notice */}
      <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 rounded-xl p-3 mb-5">
        <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
        <span>Location shared only for this approved booking. Do not share externally.</span>
      </div>

      {/* Action Buttons */}
      <div className="space-y-3">
        <motion.button
          onClick={onOpenDirections}
          className="w-full px-6 py-4 bg-linear-to-r from-primary-500 to-secondary-500 text-white font-bold rounded-2xl flex items-center justify-center gap-3 shadow-xl shadow-[#4461F2]/30"
          whileHover={{ scale: 1.02, boxShadow: "0 20px 40px -10px rgba(68, 97, 242, 0.4)" }}
          whileTap={{ scale: 0.98 }}
        >
          <Route className="w-5 h-5" />
          Open Directions
          <ExternalLink className="w-4 h-4 opacity-70" />
        </motion.button>

        <motion.button
          onClick={onConfirmArrival}
          className="w-full px-6 py-4 border-2 border-emerald-500 text-emerald-600 font-bold rounded-2xl flex items-center justify-center gap-3 hover:bg-emerald-50 transition-colors"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <CheckCircle2 className="w-5 h-5" />
          Confirm Arrival
        </motion.button>
      </div>
    </>
  );

  // Mobile Bottom Sheet Layout
  if (isMobile) {
    return (
      <motion.div
        className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[28px] shadow-2xl z-20"
        initial={{ y: "75%" }}
        animate={{ y: isExpanded ? "5%" : "75%" }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.1}
        onDragEnd={(_, info: PanInfo) => {
          if (info.offset.y > 80) onToggleExpand();
          else if (info.offset.y < -80) onToggleExpand();
        }}
      >
        {/* Drag Handle */}
        <div className="flex justify-center pt-4 pb-3" onClick={onToggleExpand}>
          <motion.div
            className="w-12 h-1.5 rounded-full bg-gray-300"
            whileHover={{ scale: 1.1 }}
          />
        </div>

        {/* Collapsed Preview */}
        {!isExpanded && (
          <div className="px-6 pb-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-linear-to-br from-primary-500 to-secondary-500 flex items-center justify-center">
                  <Home className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">{careSeekerLocation.name}</h3>
                  <p className="text-sm text-gray-500">{careSeekerLocation.maskedAddress}</p>
                </div>
              </div>
              <ChevronUp className="w-5 h-5 text-gray-400" />
            </div>
          </div>
        )}

        {/* Expanded Content */}
        <motion.div
          className={`px-6 pb-10 overflow-y-auto ${isExpanded ? "block" : "hidden"}`}
          style={{ maxHeight: "80vh" }}
        >
          {panelContent}
        </motion.div>
      </motion.div>
    );
  }

  // Desktop Side Panel Layout
  return (
    <div className="w-[380px] bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-6 overflow-y-auto max-h-full border border-gray-100">
      <h2 className="text-xl font-bold text-gray-900 mb-5 flex items-center gap-2">
        <Shield className="w-5 h-5 text-primary-500" />
        Booking Details
      </h2>
      {panelContent}
    </div>
  );
};

// ============================================
// NOT APPROVED STATE
// ============================================

const NotApprovedState = () => (
  <div className="min-h-[500px] flex items-center justify-center bg-linear-to-br from-gray-50 to-gray-100 rounded-2xl">
    <motion.div
      className="text-center max-w-md px-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <motion.div
        className="w-24 h-24 rounded-3xl bg-linear-to-br from-amber-100 to-orange-100 flex items-center justify-center mx-auto mb-8 shadow-lg"
        animate={{ rotate: [0, 5, -5, 0] }}
        transition={{ duration: 4, repeat: Infinity }}
      >
        <ShieldAlert className="w-12 h-12 text-amber-500" />
      </motion.div>
      
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Location Not Available</h2>
      <p className="text-gray-600 mb-8 leading-relaxed">
        The care seeker&apos;s location will be visible only after the booking has been
        <span className="font-semibold"> fully approved</span> and authorized.
      </p>
      
      <div className="bg-white rounded-2xl p-5 text-left shadow-sm border border-gray-100">
        <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
          <Lock className="w-4 h-4 text-amber-500" />
          Privacy Protection Active
        </h4>
        <ul className="text-sm text-gray-600 space-y-2">
          <li className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-500" />
            Location hidden until approval
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-500" />
            Address shared only with assigned caregiver
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-500" />
            Navigation data remains private
          </li>
        </ul>
      </div>
    </motion.div>
  </div>
);

// ============================================
// ACCESS REVOKED STATE
// ============================================

const AccessRevokedState = () => (
  <div className="min-h-[500px] flex items-center justify-center bg-linear-to-br from-red-50 to-gray-100 rounded-2xl">
    <motion.div
      className="text-center max-w-md px-8"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <motion.div
        className="w-24 h-24 rounded-3xl bg-linear-to-br from-red-100 to-red-200 flex items-center justify-center mx-auto mb-8 shadow-lg"
        initial={{ rotate: 0 }}
        animate={{ rotate: [0, -10, 10, 0] }}
        transition={{ duration: 0.5 }}
      >
        <Ban className="w-12 h-12 text-red-500" />
      </motion.div>
      
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Revoked</h2>
      <p className="text-gray-600 mb-8 leading-relaxed">
        Your access to this location has been revoked by the administrator.
        Please contact support if you believe this is an error.
      </p>
      
      <div className="bg-white rounded-2xl p-5 text-left shadow-sm border border-red-100">
        <h4 className="font-bold text-red-700 mb-2">What happened?</h4>
        <p className="text-sm text-gray-600">
          An administrator has disabled location sharing for this booking.
          This may be due to a booking cancellation, reassignment, or security concern.
        </p>
      </div>
    </motion.div>
  </div>
);

// ============================================
// MAIN COMPONENT
// ============================================

export function CaregiverNavigationMapV2({
  careSeekerLocation,
  bookingDetails,
  caregiverLocation,
  estimatedArrival = { distance: "3.2 km", duration: "12 min" },
  onOpenDirections,
  onConfirmArrival,
  onContactCareSeeker,
  onEmergencyContact,
  isApproved = true,
  isAccessRevoked = false,
  className = "",
}: CaregiverNavigationMapProps) {
  const [mapStyle, setMapStyle] = useState<MapStyle>("streets");
  const [zoom, setZoom] = useState(14);
  const [showStylePicker, setShowStylePicker] = useState(false);
  const [isPanelExpanded, setIsPanelExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showMarkerTooltip, setShowMarkerTooltip] = useState(false);

  // Check screen size
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Handle open directions
  const handleOpenDirections = useCallback(() => {
    const { lat, lng } = careSeekerLocation.coordinates;
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
      "_blank"
    );
    onOpenDirections?.();
  }, [careSeekerLocation.coordinates, onOpenDirections]);

  // Handle contact care seeker
  const handleContactCareSeeker = useCallback(() => {
    if (careSeekerLocation.phone) {
      window.location.href = `tel:${careSeekerLocation.phone}`;
    }
    onContactCareSeeker?.();
  }, [careSeekerLocation.phone, onContactCareSeeker]);

  // Handle emergency contact
  const handleEmergencyContact = useCallback(() => {
    if (careSeekerLocation.emergencyContact?.phone) {
      window.location.href = `tel:${careSeekerLocation.emergencyContact.phone}`;
    }
    onEmergencyContact?.();
  }, [careSeekerLocation.emergencyContact, onEmergencyContact]);

  // Access states
  if (isAccessRevoked) {
    return <AccessRevokedState />;
  }

  if (!isApproved) {
    return <NotApprovedState />;
  }

  const isDarkMap = mapStyle === "dark" || mapStyle === "satellite";

  return (
    <div
      className={`relative w-full h-[600px] lg:h-[700px] rounded-3xl overflow-hidden shadow-2xl ${className}`}
    >
      {/* Desktop Layout */}
      {!isMobile && (
        <div className="flex h-full">
          {/* Map Area */}
          <div className="flex-1 relative">
            <MapView
              style={mapStyle}
              careSeekerCoords={careSeekerLocation.coordinates}
              caregiverCoords={caregiverLocation}
              zoom={zoom}
              onCareSeekerMarkerClick={() => setShowMarkerTooltip(!showMarkerTooltip)}
              showRoute={!!caregiverLocation}
            />

            {/* ETA Display */}
            {caregiverLocation && (
              <ETADisplay
                distance={estimatedArrival.distance}
                duration={estimatedArrival.duration}
                isDark={isDarkMap}
              />
            )}

            {/* Map Controls */}
            <MapControls
              mapStyle={mapStyle}
              onStyleChange={setMapStyle}
              zoom={zoom}
              onZoomIn={() => setZoom((z) => Math.min(z + 1, 18))}
              onZoomOut={() => setZoom((z) => Math.max(z - 1, 5))}
              onRecenter={() => setZoom(14)}
              showStylePicker={showStylePicker}
              onToggleStylePicker={() => setShowStylePicker(!showStylePicker)}
            />

            {/* Marker Tooltip */}
            <AnimatePresence>
              {showMarkerTooltip && (
                <MarkerTooltip
                  careSeekerName={careSeekerLocation.name}
                  bookingId={bookingDetails.id}
                  scheduledDate={bookingDetails.scheduledDate}
                  scheduledTime={bookingDetails.scheduledTime}
                  fullAddress={careSeekerLocation.address}
                  onClose={() => setShowMarkerTooltip(false)}
                />
              )}
            </AnimatePresence>
          </div>

          {/* Side Panel */}
          <div className="p-4">
            <InfoPanel
              careSeekerLocation={careSeekerLocation}
              bookingDetails={bookingDetails}
              onOpenDirections={handleOpenDirections}
              onConfirmArrival={onConfirmArrival}
              onContactCareSeeker={handleContactCareSeeker}
              onEmergencyContact={handleEmergencyContact}
              isExpanded={true}
              onToggleExpand={() => {}}
              isMobile={false}
            />
          </div>
        </div>
      )}

      {/* Mobile Layout */}
      {isMobile && (
        <>
          {/* Full Screen Map */}
          <MapView
            style={mapStyle}
            careSeekerCoords={careSeekerLocation.coordinates}
            caregiverCoords={caregiverLocation}
            zoom={zoom}
            onCareSeekerMarkerClick={() => setIsPanelExpanded(true)}
            showRoute={!!caregiverLocation}
          />

          {/* ETA Display */}
          {caregiverLocation && (
            <ETADisplay
              distance={estimatedArrival.distance}
              duration={estimatedArrival.duration}
              isDark={isDarkMap}
            />
          )}

          {/* Map Controls */}
          <MapControls
            mapStyle={mapStyle}
            onStyleChange={setMapStyle}
            zoom={zoom}
            onZoomIn={() => setZoom((z) => Math.min(z + 1, 18))}
            onZoomOut={() => setZoom((z) => Math.max(z - 1, 5))}
            onRecenter={() => setZoom(14)}
            showStylePicker={showStylePicker}
            onToggleStylePicker={() => setShowStylePicker(!showStylePicker)}
          />

          {/* Bottom Sheet */}
          <InfoPanel
            careSeekerLocation={careSeekerLocation}
            bookingDetails={bookingDetails}
            onOpenDirections={handleOpenDirections}
            onConfirmArrival={onConfirmArrival}
            onContactCareSeeker={handleContactCareSeeker}
            onEmergencyContact={handleEmergencyContact}
            isExpanded={isPanelExpanded}
            onToggleExpand={() => setIsPanelExpanded(!isPanelExpanded)}
            isMobile={true}
          />
        </>
      )}
    </div>
  );
}

export default CaregiverNavigationMapV2;
