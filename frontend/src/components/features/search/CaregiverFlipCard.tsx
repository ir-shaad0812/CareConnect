// ============================================
// CAREGIVER FLIP CARD COMPONENT
// Premium animated flip card for Browse Caregivers
// ============================================

"use client";

import React, { useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  Star,
  MapPin,
  Shield,
  CheckCircle,
  Clock,
  Award,
  Heart,
  MessageSquare,
  Calendar,
  ArrowRight,
  Repeat2,
  Briefcase,
  Languages,
  BadgeCheck,
  Crown,
  CalendarCheck,
  Banknote,
  User,
  XCircle,
} from "lucide-react";
import { SERVICE_TYPE_LABELS } from "@/lib/constants";

// ============================================
// TYPES & INTERFACES
// ============================================

// Exported type for use in browse page
export interface CaregiverFlipCardData {
  _id: string;
  // Support both old userId format and new user format
  userId?: {
    _id: string;
    fullName: string;
    avatar?: string;
    email?: string;
    phone?: string;
  };
  user?: {
    _id: string;
    fullName: string;
    avatar?: string;
    gender?: string;
    location?: {
      city?: string;
      state?: string;
      country?: string;
    };
  };
  serviceTypes: string[];
  specializations?: string[];
  skills?: string[];
  hourlyRate?: number;
  experience: number;
  rating?: number;
  reviewCount?: number;
  totalReviews?: number;
  bio?: string;
  location?: {
    city?: string;
    state?: string;
    coordinates?: {
      type: string;
      coordinates: [number, number];
    };
  };
  availability?: {
    days: string[];
    timeSlots?: string[];
    hours?: { start: string; end: string };
    isAvailable?: boolean;
    immediateAvailability?: boolean;
  };
  verified?: boolean;
  backgroundChecked?: boolean;
  backgroundCheck?: { status: string };
  languages?: string[];
  certifications?: string[] | Array<{ name: string; issuer?: string; verified: boolean }>;
  relevanceScore?: number;
  distance?: number;
  isPremium?: boolean;
  featured?: boolean;
  totalBookings?: number;
  completedJobs?: number;
  responseTime?: string;
  responseRate?: number;
  completionRate?: number;
  completionPercentage?: number;
}

// Internal normalized data
interface NormalizedCaregiverData {
  id: string;
  fullName: string;
  avatar?: string;
  serviceTypes: string[];
  specializations: string[];
  hourlyRate: number;
  experience: number;
  rating: number;
  reviewCount: number;
  bio: string;
  city?: string;
  state?: string;
  availableDays: string[];
  timeSlots: string[];
  isAvailable: boolean;
  isVerified: boolean;
  isBackgroundChecked: boolean;
  languages: string[];
  certifications: string[];
  distance?: number;
  isPremium: boolean;
  totalBookings: number;
  responseTime?: string;
  completionRate: number;
}


interface CaregiverFlipCardProps {
  caregiver: CaregiverFlipCardData;
  onFavorite?: (id: string) => void;
  onMessage?: (id: string) => void;
  onBook?: (id: string) => void;
  isFavorite?: boolean;
  variant?: "grid" | "list";
  flipTrigger?: "hover" | "click";
}

// ============================================
// NORMALIZE FUNCTION
// ============================================
function normalizeCaregiver(caregiver: CaregiverFlipCardData): NormalizedCaregiverData {
  // Get user info from either userId or user property
  const userInfo = caregiver.userId || caregiver.user;
  const userLocation = caregiver.user?.location;
  
  // Normalize certifications to string array
  const certs = caregiver.certifications || [];
  const certStrings = certs.map(c => typeof c === 'string' ? c : c.name);
  
  // Check availability
  const avail = caregiver.availability;
  const isAvailable = avail?.isAvailable !== false && avail?.immediateAvailability !== false;
  const city = caregiver.location?.city || userLocation?.city;
  const state = caregiver.location?.state || userLocation?.state;
  
  // Check background check status
  const isBackgroundChecked = caregiver.backgroundChecked === true || 
    caregiver.backgroundCheck?.status === 'approved' || 
    caregiver.backgroundCheck?.status === 'verified';

  return {
    id: caregiver._id,
    fullName: userInfo?.fullName || 'Unknown',
    ...(userInfo?.avatar !== undefined ? { avatar: userInfo.avatar } : {}),
    serviceTypes: caregiver.serviceTypes || [],
    specializations: caregiver.specializations || caregiver.skills || [],
    hourlyRate: caregiver.hourlyRate || 0,
    experience: caregiver.experience || 0,
    rating: caregiver.rating || 0,
    reviewCount: caregiver.reviewCount || caregiver.totalReviews || 0,
    bio: caregiver.bio || '',
    ...(city !== undefined ? { city } : {}),
    ...(state !== undefined ? { state } : {}),
    availableDays: avail?.days || [],
    timeSlots: avail?.timeSlots || [],
    isAvailable,
    isVerified: caregiver.verified === true,
    isBackgroundChecked,
    languages: caregiver.languages || [],
    certifications: certStrings,
    ...(caregiver.distance !== undefined ? { distance: caregiver.distance } : {}),
    isPremium: caregiver.isPremium === true || caregiver.featured === true,
    totalBookings: caregiver.totalBookings || caregiver.completedJobs || 0,
    ...(caregiver.responseTime !== undefined ? { responseTime: caregiver.responseTime } : {}),
    completionRate: caregiver.completionRate || caregiver.completionPercentage || 0,
  };
}

// ============================================
// DESIGN DOCUMENTATION
// ============================================
/**
 * FRONT OF CARD (Quick Overview):
 * - Profile photo with gradient overlay
 * - Caregiver name
 * - Star rating & review count
 * - Location (city, state)
 * - Hourly rate (prominent)
 * - Verified badge (if applicable)
 * - Premium crown (if applicable)
 * - Unavailable overlay (if not available)
 * - Favorite heart button
 * - Quick flip hint icon
 *
 * BACK OF CARD (Detailed Info):
 * - Brief bio/description
 * - Experience years
 * - Service types (max 4)
 * - Languages spoken
 * - Availability status with days
 * - Background check status
 * - Response time
 * - Completion rate
 * - Action buttons: View Profile, Book Now, Message
 *
 * CONDITIONAL DISPLAYS:
 * - Verified badge: Shows shield icon when backgroundChecked=true
 * - Premium badge: Shows crown icon when isPremium=true
 * - Unavailable overlay: Grays out card when availability.isAvailable=false
 * - Top Rated badge: Shows when rating >= 4.8
 * - New badge: Shows when totalBookings < 5
 *
 * UX BEST PRACTICES IMPLEMENTED:
 * 1. Visual flip hint (Repeat2 icon) in corner
 * 2. Keyboard accessibility (Enter/Space to flip)
 * 3. Screen reader announcements
 * 4. Click AND hover support (configurable)
 * 5. Smooth 700ms transition
 * 6. Preserved 3D perspective
 * 7. Touch-friendly on mobile
 * 8. Clear action hierarchy on back
 */

// ============================================
// COMPONENT
// ============================================

export default function CaregiverFlipCard({
  caregiver,
  onFavorite,
  onMessage,
  isFavorite = false,
  variant = "grid",
  flipTrigger = "hover",
}: CaregiverFlipCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);

  // Normalize the caregiver data to internal format
  const data = normalizeCaregiver(caregiver);
  
  const {
    id,
    fullName,
    avatar,
    serviceTypes,
    hourlyRate,
    experience,
    rating,
    reviewCount,
    bio,
    city,
    state,
    availableDays,
    isAvailable,
    isVerified,
    isBackgroundChecked,
    languages,
    certifications,
    distance,
    isPremium,
    totalBookings,
    responseTime,
    completionRate,
  } = data;

  const isTopRated = rating >= 4.8;
  const isNewCaregiver = totalBookings < 5;

  // Format distance
  const formatDistance = (dist?: number) => {
    if (!dist) return null;
    return dist < 1 ? `${(dist * 5280).toFixed(0)} ft` : `${dist.toFixed(1)} mi`;
  };

  // Get location string
  const locationString =
    city && state
      ? `${city}, ${state}`
      : city || state || null;

  // Format availability days
  const formatAvailability = () => {
    if (!availableDays || availableDays.length === 0) return "Contact for availability";
    if (availableDays.length === 7) return "Available 7 days/week";
    if (availableDays.length >= 5) return "Weekdays available";
    return availableDays.slice(0, 3).join(", ") + (availableDays.length > 3 ? "..." : "");
  };

  // Flip handlers
  const handleMouseEnter = useCallback(() => {
    if (flipTrigger === "hover") {
      setIsFlipped(true);
    }
  }, [flipTrigger]);

  const handleMouseLeave = useCallback(() => {
    if (flipTrigger === "hover") {
      setIsFlipped(false);
    }
  }, [flipTrigger]);

  const handleClick = useCallback(() => {
    if (flipTrigger === "click") {
      setIsFlipped((prev) => !prev);
    }
  }, [flipTrigger]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setIsFlipped((prev) => !prev);
      }
    },
    []
  );

  // ============================================
  // LIST VARIANT
  // ============================================
  if (variant === "list") {
    return (
      <div
        className={cn(
          "group relative w-full [perspective:2000px]",
          "h-[180px] md:h-[160px]"
        )}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="button"
        aria-pressed={isFlipped}
        aria-label={`${fullName} caregiver card. ${isFlipped ? "Showing details" : "Showing overview"}. Press Enter to flip.`}
      >
        <div
          className={cn(
            "relative h-full w-full",
            "[transform-style:preserve-3d]",
            "transition-all duration-700 ease-out",
            isFlipped ? "[transform:rotateX(180deg)]" : "[transform:rotateX(0deg)]"
          )}
        >
          {/* FRONT - List View */}
          <div
            className={cn(
              "absolute inset-0 h-full w-full",
              "[backface-visibility:hidden] [transform:rotateX(0deg)]",
              "overflow-hidden rounded-2xl",
              "bg-white dark:bg-gray-800",
              "border border-gray-200 dark:border-gray-700",
              "shadow-sm hover:shadow-lg",
              "transition-all duration-500",
              !isAvailable && "opacity-60"
            )}
          >
            <div className="flex h-full p-4 gap-4">
              {/* Avatar */}
              <div className="shrink-0 relative">
                <div className="relative w-24 h-24 md:w-28 md:h-28 rounded-xl overflow-hidden bg-gray-200 dark:bg-gray-700">
                  {avatar ? (
                    <Image
                      src={avatar}
                      alt={fullName}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-linear-to-br from-[#39B54A] to-[#2d913c] text-white text-3xl font-bold">
                      {fullName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  {/* Verified badge */}
                  {isVerified && (
                    <div className="absolute bottom-1 right-1 bg-[#39B54A] rounded-full p-0.5 shadow-lg">
                      <CheckCircle className="w-4 h-4 text-white" />
                    </div>
                  )}
                  {/* Premium crown */}
                  {isPremium && (
                    <div className="absolute top-1 left-1 bg-linear-to-r from-amber-400 to-amber-500 rounded-full p-1 shadow-lg">
                      <Crown className="w-3 h-3 text-white" />
                    </div>
                  )}
                </div>
                {/* Unavailable overlay */}
                {!isAvailable && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-xl">
                    <span className="text-xs text-white font-medium px-2 py-1 bg-red-500 rounded-full">
                      Unavailable
                    </span>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-lg text-gray-900 dark:text-white truncate">
                        {fullName}
                      </h3>
                      {isTopRated && (
                        <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-medium rounded-full flex items-center gap-1">
                          <Star className="w-3 h-3 fill-current" />
                          Top Rated
                        </span>
                      )}
                      {isNewCaregiver && (
                        <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-medium rounded-full">
                          New
                        </span>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xl font-bold text-[#39B54A]">
                        Rs. {hourlyRate?.toLocaleString("en-NP") ?? 0}
                        <span className="text-sm font-normal text-gray-500">/hr</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 mt-1 flex-wrap text-sm">
                    {rating !== undefined && (
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                        <span className="font-medium text-gray-700 dark:text-gray-300">
                          {rating.toFixed(1)}
                        </span>
                        {reviewCount !== undefined && (
                          <span className="text-gray-500">({reviewCount} reviews)</span>
                        )}
                      </div>
                    )}
                    {locationString && (
                      <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                        <MapPin className="w-3.5 h-3.5" />
                        <span>{locationString}</span>
                        {distance && <span>• {formatDistance(distance)}</span>}
                      </div>
                    )}
                    {experience > 0 && (
                      <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                        <Briefcase className="w-3.5 h-3.5" />
                        <span>{experience} yr{experience > 1 ? "s" : ""} exp</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Tags */}
                <div className="flex items-center justify-between mt-2">
                  <div className="flex flex-wrap gap-1.5">
                    {serviceTypes.slice(0, 3).map((type) => (
                      <span
                        key={type}
                        className="px-2 py-0.5 text-xs bg-[#39B54A]/10 text-[#39B54A] rounded-full font-medium"
                      >
                        {SERVICE_TYPE_LABELS[type] || type}
                      </span>
                    ))}
                    {serviceTypes.length > 3 && (
                      <span className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 rounded-full">
                        +{serviceTypes.length - 3}
                      </span>
                    )}
                  </div>
                  
                  {/* Flip hint */}
                  <div className="flex items-center gap-1 text-xs text-gray-400 group-hover:text-[#39B54A] transition-colors">
                    <Repeat2 className="w-4 h-4" />
                    <span className="hidden sm:inline">Flip for details</span>
                  </div>
                </div>
              </div>

              {/* Favorite button */}
              {onFavorite && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onFavorite(id);
                  }}
                  className={cn(
                    "absolute top-3 right-3 p-2 rounded-full transition-all duration-200",
                    "bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-sm",
                    isFavorite
                      ? "text-red-500 scale-110"
                      : "text-gray-400 hover:text-red-500 hover:scale-110"
                  )}
                  aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
                >
                  <Heart className={cn("w-5 h-5", isFavorite && "fill-current")} />
                </button>
              )}
            </div>
          </div>

          {/* BACK - List View */}
          <div
            className={cn(
              "absolute inset-0 h-full w-full",
              "[backface-visibility:hidden] [transform:rotateX(180deg)]",
              "overflow-hidden rounded-2xl p-4",
              "bg-linear-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-900",
              "border border-gray-200 dark:border-gray-700",
              "shadow-lg"
            )}
          >
            <div className="flex h-full gap-4">
              {/* Left - Info */}
              <div className="flex-1 flex flex-col">
                <h3 className="font-semibold text-gray-900 dark:text-white truncate mb-2">
                  {fullName}
                </h3>
                
                {bio && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">
                    {bio}
                  </p>
                )}

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <CalendarCheck className="w-4 h-4 text-[#39B54A]" />
                    <span className="truncate">{formatAvailability()}</span>
                  </div>
                  {languages && languages.length > 0 && (
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <Languages className="w-4 h-4 text-[#39B54A]" />
                      <span className="truncate">{languages.slice(0, 2).join(", ")}</span>
                    </div>
                  )}
                  {isBackgroundChecked && (
                    <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                      <BadgeCheck className="w-4 h-4" />
                      <span>Background Verified</span>
                    </div>
                  )}
                  {responseTime && (
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <Clock className="w-4 h-4 text-[#39B54A]" />
                      <span>Responds in {responseTime}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Right - Actions */}
              <div className="flex flex-col gap-2 justify-center">
                <Link
                  href={`/caregiver/${id}`}
                  onClick={(e) => e.stopPropagation()}
                  className={cn(
                    "flex items-center justify-center gap-2 px-4 py-2 rounded-xl",
                    "border border-gray-200 dark:border-gray-600",
                    "text-gray-700 dark:text-gray-300 text-sm font-medium",
                    "hover:bg-gray-50 dark:hover:bg-gray-700",
                    "transition-all duration-200 hover:scale-105"
                  )}
                >
                  <User className="w-4 h-4" />
                  Profile
                </Link>
                
                {onMessage && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onMessage(id);
                    }}
                    className={cn(
                      "flex items-center justify-center gap-2 px-4 py-2 rounded-xl",
                      "border border-gray-200 dark:border-gray-600",
                      "text-gray-700 dark:text-gray-300 text-sm font-medium",
                      "hover:bg-gray-50 dark:hover:bg-gray-700",
                      "transition-all duration-200 hover:scale-105"
                    )}
                  >
                    <MessageSquare className="w-4 h-4" />
                    Message
                  </button>
                )}

                <Link
                  href={`/book/${id}`}
                  onClick={(e) => e.stopPropagation()}
                  className={cn(
                    "flex items-center justify-center gap-2 px-4 py-2 rounded-xl",
                    "bg-linear-to-r from-[#39B54A] to-[#2d913c]",
                    "text-white text-sm font-medium shadow-lg shadow-[#39B54A]/30",
                    "hover:shadow-xl hover:scale-105",
                    "transition-all duration-200",
                    !isAvailable && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <Calendar className="w-4 h-4" />
                  Book Now
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================
  // GRID VARIANT (Default)
  // ============================================
  return (
    <div
      className={cn(
        "group relative [perspective:2000px]",
        "h-[380px] w-full max-w-[320px]"
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-pressed={isFlipped}
      aria-label={`${fullName} caregiver card. ${isFlipped ? "Showing details" : "Showing overview"}. Press Enter to flip.`}
    >
      <div
        className={cn(
          "relative h-full w-full",
          "[transform-style:preserve-3d]",
          "transition-all duration-700 ease-out",
          isFlipped ? "[transform:rotateY(180deg)]" : "[transform:rotateY(0deg)]"
        )}
      >
        {/* ============================================ */}
        {/* FRONT OF CARD - Grid View */}
        {/* ============================================ */}
        <div
          className={cn(
            "absolute inset-0 h-full w-full",
            "[backface-visibility:hidden] [transform:rotateY(0deg)]",
            "overflow-hidden rounded-2xl",
            "bg-white dark:bg-gray-800",
            "border border-gray-200 dark:border-gray-700",
            "shadow-sm",
            "transition-all duration-500",
            "group-hover:shadow-xl group-hover:border-[#39B54A]/30",
            isFlipped ? "opacity-0" : "opacity-100",
            !isAvailable && "grayscale-[50%]"
          )}
        >
          {/* Profile Image Section */}
          <div className="relative h-[55%] overflow-hidden">
            {avatar ? (
              <Image
                src={avatar}
                alt={fullName}
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-110"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-linear-to-br from-[#39B54A] to-[#2d913c]">
                <span className="text-white text-6xl font-bold">
                  {fullName.charAt(0).toUpperCase()}
                </span>
              </div>
            )}

            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent" />

            {/* Top badges row */}
            <div className="absolute top-3 left-3 flex gap-2">
              {isPremium && (
                <span className="flex items-center gap-1 px-2 py-1 bg-linear-to-r from-amber-400 to-amber-500 text-white text-xs font-medium rounded-full shadow-lg">
                  <Crown className="w-3 h-3" />
                  Premium
                </span>
              )}
              {isVerified && (
                <span className="flex items-center gap-1 px-2 py-1 bg-[#39B54A] text-white text-xs font-medium rounded-full shadow-lg">
                  <Shield className="w-3 h-3" />
                  Verified
                </span>
              )}
              {isTopRated && !isPremium && (
                <span className="flex items-center gap-1 px-2 py-1 bg-amber-500 text-white text-xs font-medium rounded-full shadow-lg">
                  <Star className="w-3 h-3 fill-white" />
                  Top Rated
                </span>
              )}
              {isNewCaregiver && (
                <span className="px-2 py-1 bg-blue-500 text-white text-xs font-medium rounded-full shadow-lg">
                  New
                </span>
              )}
            </div>

            {/* Favorite button */}
            {onFavorite && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onFavorite(id);
                }}
                className={cn(
                  "absolute top-3 right-3 p-2.5 rounded-full transition-all duration-300",
                  "bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm shadow-lg",
                  isFavorite
                    ? "text-red-500 scale-110"
                    : "text-gray-400 hover:text-red-500 hover:scale-110"
                )}
                aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
              >
                <Heart className={cn("w-5 h-5", isFavorite && "fill-current")} />
              </button>
            )}

            {/* Unavailable overlay */}
            {!isAvailable && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <span className="px-4 py-2 bg-red-500 text-white font-semibold rounded-full flex items-center gap-2">
                  <XCircle className="w-4 h-4" />
                  Currently Unavailable
                </span>
              </div>
            )}

            {/* Price tag */}
            <div className="absolute bottom-3 right-3 px-3 py-1.5 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-xl shadow-lg">
              <span className="text-lg font-bold text-[#39B54A]">Rs. {hourlyRate?.toLocaleString("en-NP") ?? 0}</span>
              <span className="text-gray-500 text-sm">/hr</span>
            </div>

            {/* Name & Rating overlay */}
            <div className="absolute bottom-3 left-3 text-white">
              <h3 className="font-bold text-lg drop-shadow-md">{fullName}</h3>
              <div className="flex items-center gap-2 text-sm">
                {rating !== undefined && (
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                    <span className="font-medium">{rating.toFixed(1)}</span>
                    {reviewCount !== undefined && (
                      <span className="text-white/80">({reviewCount})</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Content Section */}
          <div className="p-4 h-[45%] flex flex-col justify-between">
            {/* Location & Experience */}
            <div className="space-y-2">
              {locationString && (
                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm">
                  <MapPin className="w-4 h-4 text-[#39B54A]" />
                  <span>{locationString}</span>
                  {distance && (
                    <span className="text-gray-400">• {formatDistance(distance)}</span>
                  )}
                </div>
              )}
              <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                {experience > 0 && (
                  <div className="flex items-center gap-1">
                    <Briefcase className="w-4 h-4 text-[#39B54A]" />
                    <span>{experience} yr{experience > 1 ? "s" : ""} exp</span>
                  </div>
                )}
                {isBackgroundChecked && (
                  <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                    <BadgeCheck className="w-4 h-4" />
                    <span>BG Checked</span>
                  </div>
                )}
              </div>
            </div>

            {/* Service types */}
            <div className="flex flex-wrap gap-1.5">
              {serviceTypes.slice(0, 3).map((type) => (
                <span
                  key={type}
                  className="px-2 py-1 text-xs bg-[#39B54A]/10 text-[#39B54A] rounded-full font-medium"
                >
                  {SERVICE_TYPE_LABELS[type] || type}
                </span>
              ))}
              {serviceTypes.length > 3 && (
                <span className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 rounded-full">
                  +{serviceTypes.length - 3}
                </span>
              )}
            </div>

            {/* Flip hint */}
            <div className="flex items-center justify-center gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
              <Repeat2 className="w-4 h-4 text-gray-400 group-hover:text-[#39B54A] transition-colors group-hover:rotate-180 duration-500" />
              <span className="text-xs text-gray-400 group-hover:text-[#39B54A] transition-colors">
                {flipTrigger === "hover" ? "Hover" : "Click"} to see details
              </span>
            </div>
          </div>
        </div>

        {/* ============================================ */}
        {/* BACK OF CARD - Grid View */}
        {/* ============================================ */}
        <div
          className={cn(
            "absolute inset-0 h-full w-full",
            "[backface-visibility:hidden] [transform:rotateY(180deg)]",
            "overflow-hidden rounded-2xl p-5",
            "bg-linear-to-br from-gray-50 via-white to-gray-50 dark:from-gray-800 dark:via-gray-900 dark:to-gray-800",
            "border border-gray-200 dark:border-gray-700",
            "shadow-xl",
            "flex flex-col",
            "transition-all duration-500",
            isFlipped ? "opacity-100" : "opacity-0"
          )}
        >
          {/* Header */}
          <div className="flex items-center gap-3 pb-4 border-b border-gray-200 dark:border-gray-700">
            <div className="relative w-14 h-14 rounded-xl overflow-hidden shrink-0">
              {avatar ? (
                <Image src={avatar} alt={fullName} fill className="object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-linear-to-br from-[#39B54A] to-[#2d913c] text-white text-xl font-bold">
                  {fullName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-gray-900 dark:text-white truncate">{fullName}</h3>
              <div className="flex items-center gap-2 text-sm">
                <Banknote className="w-4 h-4 text-[#39B54A]" />
                <span className="font-semibold text-[#39B54A]">Rs. {hourlyRate?.toLocaleString("en-NP") ?? 0}/hr</span>
              </div>
            </div>
          </div>

          {/* Bio */}
          {bio && (
            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 py-3">
              {bio}
            </p>
          )}

          {/* Details Grid */}
          <div className="flex-1 space-y-2 py-2">
            {/* Availability */}
            <div
              className={cn(
                "flex items-start gap-3 p-2 rounded-lg",
                "bg-gray-50 dark:bg-gray-800/50"
              )}
              style={{
                transform: isFlipped ? "translateX(0)" : "translateX(-10px)",
                opacity: isFlipped ? 1 : 0,
                transition: "all 0.5s ease",
                transitionDelay: "200ms",
              }}
            >
              <CalendarCheck className="w-5 h-5 text-[#39B54A] shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Availability</p>
                <p className={cn(
                  "text-sm font-medium",
                  isAvailable ? "text-green-600 dark:text-green-400" : "text-red-500"
                )}>
                  {isAvailable ? formatAvailability() : "Not Available"}
                </p>
              </div>
            </div>

            {/* Experience & Completion Rate */}
            <div
              className="flex items-start gap-3 p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50"
              style={{
                transform: isFlipped ? "translateX(0)" : "translateX(-10px)",
                opacity: isFlipped ? 1 : 0,
                transition: "all 0.5s ease",
                transitionDelay: "300ms",
              }}
            >
              <Award className="w-5 h-5 text-[#39B54A] shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs text-gray-500 dark:text-gray-400">Experience</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {experience} year{experience > 1 ? "s" : ""} in caregiving
                  {completionRate && (
                    <span className="text-gray-500 ml-2">• {completionRate}% completion</span>
                  )}
                </p>
              </div>
            </div>

            {/* Languages */}
            {languages && languages.length > 0 && (
              <div
                className="flex items-start gap-3 p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50"
                style={{
                  transform: isFlipped ? "translateX(0)" : "translateX(-10px)",
                  opacity: isFlipped ? 1 : 0,
                  transition: "all 0.5s ease",
                  transitionDelay: "400ms",
                }}
              >
                <Languages className="w-5 h-5 text-[#39B54A] shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Languages</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {languages.join(", ")}
                  </p>
                </div>
              </div>
            )}

            {/* Certifications */}
            {certifications && certifications.length > 0 && (
              <div
                className="flex items-start gap-3 p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50"
                style={{
                  transform: isFlipped ? "translateX(0)" : "translateX(-10px)",
                  opacity: isFlipped ? 1 : 0,
                  transition: "all 0.5s ease",
                  transitionDelay: "500ms",
                }}
              >
                <BadgeCheck className="w-5 h-5 text-[#39B54A] shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Certifications</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white line-clamp-1">
                    {certifications.slice(0, 2).join(", ")}
                    {certifications.length > 2 && ` +${certifications.length - 2}`}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
            {/* Primary Action - Book Now */}
            <Link
              href={`/book/${id}`}
              onClick={(e) => e.stopPropagation()}
              className={cn(
                "group/btn relative flex items-center justify-between w-full",
                "px-4 py-3 rounded-xl",
                "bg-linear-to-r from-[#39B54A] to-[#2d913c]",
                "text-white font-medium",
                "shadow-lg shadow-[#39B54A]/30",
                "transition-all duration-300",
                "hover:shadow-xl hover:scale-[1.02]",
                !isAvailable && "opacity-50 cursor-not-allowed pointer-events-none"
              )}
            >
              <span className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Book Now
              </span>
              <ArrowRight className="w-5 h-5 transition-transform duration-300 group-hover/btn:translate-x-1" />
            </Link>

            {/* Secondary Actions */}
            <div className="flex gap-2">
              <Link
                href={`/caregiver/${id}`}
                onClick={(e) => e.stopPropagation()}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl",
                  "border border-gray-200 dark:border-gray-600",
                  "text-gray-700 dark:text-gray-300 text-sm font-medium",
                  "hover:bg-gray-50 dark:hover:bg-gray-700",
                  "transition-all duration-200 hover:scale-[1.02]"
                )}
              >
                <User className="w-4 h-4" />
                Profile
              </Link>

              {onMessage && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onMessage(id);
                  }}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl",
                    "border border-gray-200 dark:border-gray-600",
                    "text-gray-700 dark:text-gray-300 text-sm font-medium",
                    "hover:bg-gray-50 dark:hover:bg-gray-700",
                    "transition-all duration-200 hover:scale-[1.02]"
                  )}
                >
                  <MessageSquare className="w-4 h-4" />
                  Message
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Custom keyframe animations */}
      <style jsx>{`
        @keyframes pulse-ring {
          0% {
            transform: scale(0.95);
            opacity: 0.5;
          }
          50% {
            transform: scale(1);
            opacity: 0.8;
          }
          100% {
            transform: scale(0.95);
            opacity: 0.5;
          }
        }
      `}</style>
    </div>
  );
}

// ============================================
// UX BEST PRACTICES DOCUMENTATION
// ============================================
/**
 * UX BEST PRACTICES FOR FLIP CARDS:
 *
 * 1. VISUAL AFFORDANCE
 *    - Flip icon (Repeat2) visible in corner
 *    - Text hint "Hover/Click to see details"
 *    - Subtle scale/shadow changes on hover
 *
 * 2. ACCESSIBILITY
 *    - Full keyboard support (Enter/Space to flip)
 *    - ARIA labels for screen readers
 *    - role="button" with aria-pressed state
 *    - Focus visible styles
 *
 * 3. SMOOTH TRANSITIONS
 *    - 700ms flip duration (not too fast, not too slow)
 *    - Staggered content reveals on back
 *    - Opacity transitions to prevent flash
 *
 * 4. MOBILE CONSIDERATION
 *    - Click flip trigger option (hover doesn't work on touch)
 *    - Touch-friendly tap targets (min 44x44px)
 *    - List view optimized for mobile
 *
 * 5. CONTENT HIERARCHY
 *    - Front: Quick scan info (photo, name, rate, rating)
 *    - Back: Decision-making info (availability, bio, actions)
 *    - Primary CTA (Book Now) most prominent on back
 *
 * 6. STATE INDICATORS
 *    - Unavailable: Grayed out with overlay
 *    - Premium: Gold crown badge
 *    - Verified: Green shield badge
 *    - Top Rated: Star badge for 4.8+ rating
 *    - New: Blue badge for <5 bookings
 *
 * 7. PREVENT ACCIDENTAL NAVIGATION
 *    - e.stopPropagation() on action buttons
 *    - Flip area vs clickable links clearly separated
 *
 * 8. PERFORMANCE
 *    - backface-visibility: hidden for smooth 3D
 *    - will-change hints for animations
 *    - transform-style: preserve-3d for proper depth
 */
