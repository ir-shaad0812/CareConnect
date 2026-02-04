// ============================================
// CAREGIVER CARD - Search result card
// ============================================

"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Star,
  MapPin,
  Shield,
  CheckCircle,
  Clock,
  Award,
  Heart,
} from "lucide-react";
import { SERVICE_TYPE_LABELS } from "@/lib/constants";

interface CaregiverData {
  _id: string;
  userId: {
    _id: string;
    fullName: string;
    avatar?: string;
    email?: string;
  };
  serviceTypes: string[];
  specializations?: string[];
  hourlyRate: number;
  experience: number;
  rating?: number;
  reviewCount?: number;
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
    timeSlots: string[];
  };
  verified?: boolean;
  backgroundChecked?: boolean;
  languages?: string[];
  certifications?: string[];
  relevanceScore?: number;
  distance?: number;
}

interface CaregiverCardProps {
  caregiver: CaregiverData;
  onFavorite?: (id: string) => void;
  onMessage?: (id: string) => void;
  isFavorite?: boolean;
  variant?: "grid" | "list";
}

// SERVICE_TYPE_LABELS imported from @/lib/constants

export default function CaregiverCard({
  caregiver,
  onFavorite,
  isFavorite = false,
  variant = "grid",
}: CaregiverCardProps) {
  const {
    _id,
    userId,
    serviceTypes,
    hourlyRate,
    experience,
    rating,
    reviewCount,
    bio,
    location,
    verified,
    backgroundChecked,
    distance,
  } = caregiver;

  const displayName = userId?.fullName || "Caregiver";
  const displayAvatar = userId?.avatar;

  // Format distance
  const formatDistance = (dist?: number) => {
    if (!dist) return null;
    return dist < 1 ? `${(dist * 5280).toFixed(0)} ft` : `${dist.toFixed(1)} mi`;
  };

  // Get location string
  const locationString =
    location?.city && location?.state
      ? `${location.city}, ${location.state}`
      : location?.city || location?.state || null;

  if (variant === "list") {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow">
        <div className="flex gap-4">
          {/* Avatar */}
          <div className="shrink-0">
            <Link href={`/caregiver/${_id}`}>
              <div className="relative w-24 h-24 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700">
                {displayAvatar ? (
                  <Image
                    src={displayAvatar}
                    alt={displayName}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-2xl font-semibold">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                )}
                {verified && (
                  <div className="absolute bottom-1 right-1 bg-teal-500 rounded-full p-0.5">
                    <CheckCircle className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>
            </Link>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <Link href={`/caregiver/${_id}`}>
                  <h3 className="font-semibold text-gray-900 dark:text-white hover:text-teal-600 dark:hover:text-teal-400 transition-colors">
                    {displayName}
                  </h3>
                </Link>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {rating !== undefined && (
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {rating.toFixed(1)}
                      </span>
                      {reviewCount !== undefined && (
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          ({reviewCount})
                        </span>
                      )}
                    </div>
                  )}
                  {locationString && (
                    <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                      <MapPin className="w-3.5 h-3.5" />
                      <span className="text-sm">{locationString}</span>
                    </div>
                  )}
                  {distance && (
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      • {formatDistance(distance)} away
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-teal-600 dark:text-teal-400">
                  Rs. {hourlyRate?.toLocaleString("en-NP")}/hr
                </div>
              </div>
            </div>

            {/* Bio */}
            {bio && (
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 line-clamp-2">
                {bio}
              </p>
            )}

            {/* Tags */}
            <div className="flex flex-wrap gap-1.5 mt-3">
              {serviceTypes.slice(0, 3).map((type) => (
                <span
                  key={type}
                  className="px-2 py-0.5 text-xs bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 rounded-full"
                >
                  {SERVICE_TYPE_LABELS[type] || type}
                </span>
              ))}
              {serviceTypes.length > 3 && (
                <span className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-full">
                  +{serviceTypes.length - 3}
                </span>
              )}
            </div>

            {/* Badges & Actions */}
            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center gap-2">
                {verified && (
                  <span className="flex items-center gap-1 text-xs text-teal-600 dark:text-teal-400">
                    <Shield className="w-3.5 h-3.5" />
                    Verified
                  </span>
                )}
                {backgroundChecked && (
                  <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                    <Award className="w-3.5 h-3.5" />
                    BG Checked
                  </span>
                )}
                {experience > 0 && (
                  <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                    <Clock className="w-3.5 h-3.5" />
                    {experience} yr{experience > 1 ? "s" : ""}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {onFavorite && (
                  <button
                    onClick={() => onFavorite(_id)}
                    className={`p-2 rounded-full transition-colors ${
                      isFavorite
                        ? "text-red-500 bg-red-50 dark:bg-red-900/30"
                        : "text-gray-400 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-700"
                    }`}
                  >
                    <Heart className={`w-5 h-5 ${isFavorite ? "fill-current" : ""}`} />
                  </button>
                )}
                <Link
                  href={`/book/${_id}`}
                  className="px-4 py-2 bg-teal-600 text-white text-sm rounded-lg hover:bg-teal-700 transition-colors"
                >
                  Book Now
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Grid variant (default)
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow group">
      {/* Image section */}
      <Link href={`/caregiver/${_id}`}>
        <div className="relative aspect-[4/3] bg-gray-200 dark:bg-gray-700">
          {displayAvatar ? (
            <Image
              src={displayAvatar}
              alt={displayName}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400 text-4xl font-semibold">
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}
          {/* Badges overlay */}
          <div className="absolute top-2 left-2 flex gap-1.5">
            {verified && (
              <span className="flex items-center gap-1 px-2 py-1 bg-teal-500 text-white text-xs rounded-full">
                <Shield className="w-3 h-3" />
                Verified
              </span>
            )}
            {backgroundChecked && (
              <span className="flex items-center gap-1 px-2 py-1 bg-green-500 text-white text-xs rounded-full">
                <CheckCircle className="w-3 h-3" />
              </span>
            )}
          </div>
          {/* Favorite button */}
          {onFavorite && (
            <button
              onClick={(e) => {
                e.preventDefault();
                onFavorite(_id);
              }}
              className={`absolute top-2 right-2 p-2 rounded-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm transition-colors ${
                isFavorite
                  ? "text-red-500"
                  : "text-gray-400 hover:text-red-500"
              }`}
            >
              <Heart className={`w-5 h-5 ${isFavorite ? "fill-current" : ""}`} />
            </button>
          )}
          {/* Price tag */}
          <div className="absolute bottom-2 right-2 px-2 py-1 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg">
            <span className="font-bold text-teal-600 dark:text-teal-400">
              Rs. {hourlyRate?.toLocaleString("en-NP")}
            </span>
            <span className="text-gray-500 dark:text-gray-400 text-sm">/hr</span>
          </div>
        </div>
      </Link>

      {/* Content section */}
      <div className="p-4">
        {/* Name and rating */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <Link href={`/caregiver/${_id}`}>
            <h3 className="font-semibold text-gray-900 dark:text-white hover:text-teal-600 dark:hover:text-teal-400 transition-colors truncate">
              {displayName}
            </h3>
          </Link>
          {rating !== undefined && (
            <div className="flex items-center gap-1 shrink-0">
              <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {rating.toFixed(1)}
              </span>
            </div>
          )}
        </div>

        {/* Location & Experience */}
        <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400 mb-3">
          {locationString && (
            <div className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              <span className="truncate">{locationString}</span>
            </div>
          )}
          {experience > 0 && (
            <div className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span>
                {experience}yr{experience > 1 ? "s" : ""}
              </span>
            </div>
          )}
        </div>

        {/* Service types */}
        <div className="flex flex-wrap gap-1 mb-4">
          {serviceTypes.slice(0, 2).map((type) => (
            <span
              key={type}
              className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full"
            >
              {SERVICE_TYPE_LABELS[type] || type}
            </span>
          ))}
          {serviceTypes.length > 2 && (
            <span className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-full">
              +{serviceTypes.length - 2}
            </span>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          <Link
            href={`/caregiver/${_id}`}
            className="flex-1 py-2 text-center text-sm border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            View Profile
          </Link>
          <Link
            href={`/book/${_id}`}
            className="flex-1 py-2 text-center text-sm bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
          >
            Book
          </Link>
        </div>
      </div>
    </div>
  );
}
