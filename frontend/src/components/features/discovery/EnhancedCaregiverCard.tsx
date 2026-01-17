// ============================================
// ENHANCED CAREGIVER CARD COMPONENT
// Premium card with Chat/Call/Book CTAs
// ============================================

"use client";

import { memo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Star,
  MapPin,
  Shield,
  Heart,
  MessageSquare,
  Phone,
  Calendar,
  ChevronDown,
  ChevronUp,
  Briefcase,
  Award,
  CheckCircle,
  BadgeCheck,
  Sparkles,
  Video,
} from "lucide-react";
import { SERVICE_TYPE_LABELS } from "@/lib/constants";
import RecommendedBadge from "@/components/ui/RecommendedBadge";
import { OnlineStatusBadge } from "@/components/ui/OnlineStatusBadge";

// ─── Types ─────────────────────────────────────────────────────────
export interface EnhancedCaregiverData {
  caregiverId: string;
  fullName: string;
  avatar?: string;
  headline?: string;
  bio?: string;
  experience: number;
  hourlyRate?: number;
  dailyRate?: number;
  weeklyRate?: number;
  monthlyRate?: number;
  rating?: number;
  totalReviews?: number;
  serviceTypes: string[];
  skills: string[];
  certifications: Array<{ name: string; verified?: boolean }>;
  languages: string[];
  location: {
    city?: string;
    state?: string;
  };
  availability: {
    immediateAvailability?: boolean;
    days?: string[];
  };
  verified?: boolean;
  isRecommended?: boolean;
  backgroundCheck?: boolean;
  matchScore?: number;
  reasons?: string[];
  distance?: number;
  completedJobs?: number;
  responseTime?: string;
  responseRate?: number;
}

interface EnhancedCaregiverCardProps {
  caregiver: EnhancedCaregiverData;
  variant?: "grid" | "list";
  index?: number;
  onChat?: (id: string) => void;
  onCall?: (id: string) => void;
  onBook?: (id: string) => void;
  onFavorite?: (id: string) => void;
  isFavorite?: boolean;
  showMatchScore?: boolean;
}

// ─── Score Style Utility ───────────────────────────────────────────
function getScoreStyle(score: number) {
  if (score >= 85)
    return {
      bg: "from-emerald-500 to-teal-500",
      light: "bg-emerald-50",
      text: "text-emerald-700",
    };
  if (score >= 70)
    return {
      bg: "from-blue-500 to-cyan-500",
      light: "bg-blue-50",
      text: "text-blue-700",
    };
  return {
    bg: "from-slate-400 to-gray-400",
    light: "bg-gray-50",
    text: "text-gray-600",
  };
}

// ─── Grid Card Component ───────────────────────────────────────────
const GridCard = memo(function GridCard({
  caregiver,
  index = 0,
  onChat,
  onCall,
  onBook,
  onFavorite,
  isFavorite,
  showMatchScore,
}: Omit<EnhancedCaregiverCardProps, "variant">) {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);

  const primaryRate =
    caregiver.hourlyRate ||
    caregiver.dailyRate ||
    caregiver.weeklyRate ||
    caregiver.monthlyRate;
  const rateLabel = caregiver.hourlyRate
    ? "/hr"
    : caregiver.dailyRate
      ? "/day"
      : caregiver.weeklyRate
        ? "/wk"
        : caregiver.monthlyRate
          ? "/mo"
          : "";

  const scoreStyle = caregiver.matchScore
    ? getScoreStyle(caregiver.matchScore)
    : null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.05 }}
      className="group relative bg-white rounded-2xl border border-gray-100/80 hover:border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden"
    >
      {/* Top Accent for High Match */}
      {caregiver.matchScore && caregiver.matchScore >= 85 && (
        <div
          className={cn(
            "absolute top-0 left-0 right-0 h-1 bg-linear-to-r",
            scoreStyle?.bg
          )}
        />
      )}

      {/* Main Content */}
      <div className="p-5">
        {/* Header Row */}
        <div className="flex items-start gap-3.5 mb-4">
          {/* Avatar */}
          <Link
            href={`/caregiver/${caregiver.caregiverId}`}
            className="shrink-0 relative"
          >
            <div className="relative w-16 h-16 rounded-2xl overflow-hidden bg-gray-100 ring-2 ring-gray-100 group-hover:ring-teal-200 transition-all">
              {caregiver.avatar ? (
                <Image
                  src={caregiver.avatar}
                  alt={caregiver.fullName}
                  fill
                  className="object-cover"
                  sizes="64px"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-linear-to-br from-teal-600 to-emerald-500 text-white text-xl font-bold">
                  {caregiver.fullName?.charAt(0)?.toUpperCase()}
                </div>
              )}
            </div>
            {/* Verification Badge */}
            {caregiver.verified && (
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-sm border border-blue-100">
                <BadgeCheck className="w-4 h-4 text-blue-500" />
              </div>
            )}
            {/* Online/Offline indicator */}
            <OnlineStatusBadge
              userId={caregiver.caregiverId}
              position="top-right"
              size="xs"
            />
          </Link>

          {/* Name & Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Link href={`/caregiver/${caregiver.caregiverId}`}>
                <h3 className="text-base font-semibold text-gray-900 truncate group-hover:text-teal-700 transition-colors">
                  {caregiver.fullName}
                </h3>
              </Link>
              {caregiver.isRecommended && <RecommendedBadge size="sm" />}
            </div>
            {caregiver.headline && (
              <p className="text-xs text-gray-500 truncate mt-0.5">
                {caregiver.headline}
              </p>
            )}
            {/* Quick Stats */}
            <div className="flex items-center gap-3 mt-2 text-xs">
              {caregiver.rating && caregiver.rating > 0 && (
                <span className="flex items-center gap-1 text-gray-700">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  <span className="font-semibold">
                    {caregiver.rating.toFixed(1)}
                  </span>
                  <span className="text-gray-400">
                    ({caregiver.totalReviews})
                  </span>
                </span>
              )}
              {caregiver.experience > 0 && (
                <span className="text-gray-500">
                  {caregiver.experience}+ yrs
                </span>
              )}
            </div>
          </div>

          {/* Match Score / Favorite */}
          <div className="flex flex-col items-end gap-2">
            {showMatchScore && caregiver.matchScore && (
              <div
                className={cn(
                  "px-2.5 py-1 rounded-full bg-linear-to-r text-white text-xs font-bold shadow-sm",
                  scoreStyle?.bg
                )}
              >
                {caregiver.matchScore}%
              </div>
            )}
            <button
              onClick={(e) => {
                e.preventDefault();
                onFavorite?.(caregiver.caregiverId);
              }}
              className={cn(
                "p-2 rounded-xl transition-all",
                isFavorite
                  ? "bg-red-50 text-red-500"
                  : "text-gray-300 hover:text-red-400 hover:bg-red-50"
              )}
            >
              <Heart
                className={cn("w-4 h-4", isFavorite && "fill-current")}
              />
            </button>
          </div>
        </div>

        {/* Service Types */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {caregiver.serviceTypes.slice(0, 3).map((type) => (
            <span
              key={type}
              className="px-2 py-0.5 bg-teal-50 text-teal-700 text-[10px] font-semibold rounded-md"
            >
              {SERVICE_TYPE_LABELS[type] || type.replace(/_/g, " ")}
            </span>
          ))}
          {caregiver.serviceTypes.length > 3 && (
            <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-[10px] font-medium rounded-md">
              +{caregiver.serviceTypes.length - 3} more
            </span>
          )}
        </div>

        {/* AI Reasons */}
        {caregiver.reasons && caregiver.reasons.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {caregiver.reasons.slice(0, 2).map((reason, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-medium rounded-md"
              >
                <CheckCircle className="w-3 h-3" />
                {reason}
              </span>
            ))}
          </div>
        )}

        {/* Location & Availability */}
        <div className="flex items-center gap-3 text-xs text-gray-500 mb-4">
          {caregiver.location.city && (
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {caregiver.distance
                ? `${caregiver.distance.toFixed(1)} km`
                : caregiver.location.city}
            </span>
          )}
          {/* Real-time online/offline presence */}
          <OnlineStatusBadge
            userId={caregiver.caregiverId}
            showLabel
            size="xs"
          />
          {caregiver.availability.immediateAvailability && (
            <span className="flex items-center gap-1 text-emerald-600 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Available Now
            </span>
          )}
          {caregiver.backgroundCheck && (
            <span className="flex items-center gap-1 text-blue-600">
              <Shield className="w-3 h-3" />
              Verified
            </span>
          )}
        </div>

        {/* Price & Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          {/* Price */}
          <div>
            {primaryRate ? (
              <div className="flex items-baseline gap-0.5">
                <span className="text-xs font-semibold text-gray-400 mr-0.5">Rs.</span>
                <span className="text-xl font-bold text-[#39B54A]">
                  {primaryRate.toLocaleString("en-NP")}
                </span>
                <span className="text-sm text-gray-400">{rateLabel}</span>
              </div>
            ) : (
              <span className="text-sm text-gray-400">Contact for rates</span>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {/* Chat */}
            <button
              onClick={() => onChat?.(caregiver.caregiverId)}
              className="p-2.5 rounded-xl bg-gray-100 hover:bg-teal-100 text-gray-600 hover:text-teal-700 transition-all"
              title="Chat"
            >
              <MessageSquare className="w-4 h-4" />
            </button>

            {/* Call */}
            <button
              onClick={() => onCall?.(caregiver.caregiverId)}
              className="p-2.5 rounded-xl bg-gray-100 hover:bg-blue-100 text-gray-600 hover:text-blue-700 transition-all"
              title="Call"
            >
              <Phone className="w-4 h-4" />
            </button>

            {/* Book */}
            <Link
              href={`/book/${caregiver.caregiverId}`}
              prefetch
              onClick={(e) => {
                // Immediate client-side navigation (avoid "reload" feeling).
                e.preventDefault();
                router.push(`/book/${caregiver.caregiverId}`);
                // Fire-and-forget tracking
                void Promise.resolve(onBook?.(caregiver.caregiverId));
              }}
              className="px-4 py-2.5 bg-linear-to-r from-teal-600 to-emerald-600 text-white text-sm font-semibold rounded-xl hover:shadow-lg hover:shadow-teal-200/40 active:scale-[0.97] transition-all flex items-center gap-1.5"
            >
              <Calendar className="w-4 h-4" />
              Book
            </Link>
          </div>
        </div>
      </div>

      {/* Expandable Details */}
      <div className="border-t border-gray-100">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors"
        >
          {isExpanded ? "Less Details" : "More Details"}
          {isExpanded ? (
            <ChevronUp className="w-3.5 h-3.5" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5" />
          )}
        </button>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="px-5 pb-4 space-y-3">
                {/* Bio */}
                {caregiver.bio && (
                  <p className="text-sm text-gray-600 leading-relaxed line-clamp-3">
                    {caregiver.bio}
                  </p>
                )}

                {/* Skills */}
                {caregiver.skills.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                      Skills
                    </h4>
                    <div className="flex flex-wrap gap-1">
                      {caregiver.skills.slice(0, 6).map((skill) => (
                        <span
                          key={skill}
                          className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] font-medium rounded-md"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Certifications */}
                {caregiver.certifications.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                      Certifications
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {caregiver.certifications.slice(0, 4).map((cert) => (
                        <span
                          key={cert.name}
                          className={cn(
                            "inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-md",
                            cert.verified
                              ? "bg-blue-50 text-blue-700"
                              : "bg-gray-100 text-gray-600"
                          )}
                        >
                          {cert.verified && (
                            <CheckCircle className="w-3 h-3" />
                          )}
                          {cert.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Languages */}
                {caregiver.languages.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                      Languages
                    </h4>
                    <p className="text-sm text-gray-600">
                      {caregiver.languages.join(", ")}
                    </p>
                  </div>
                )}

                {/* View Full Profile */}
                <Link
                  href={`/caregiver/${caregiver.caregiverId}`}
                  className="block w-full text-center py-2.5 text-sm font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-xl transition-colors mt-2"
                >
                  View Full Profile
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
});

// ─── List Card Component ───────────────────────────────────────────
const ListCard = memo(function ListCard({
  caregiver,
  index = 0,
  onChat,
  onCall,
  onBook,
  onFavorite,
  isFavorite,
  showMatchScore,
}: Omit<EnhancedCaregiverCardProps, "variant">) {
  const primaryRate =
    caregiver.hourlyRate ||
    caregiver.dailyRate ||
    caregiver.weeklyRate ||
    caregiver.monthlyRate;
  const rateLabel = caregiver.hourlyRate
    ? "/hr"
    : caregiver.dailyRate
      ? "/day"
      : caregiver.weeklyRate
        ? "/wk"
        : caregiver.monthlyRate
          ? "/mo"
          : "";

  const scoreStyle = caregiver.matchScore
    ? getScoreStyle(caregiver.matchScore)
    : null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: index * 0.03 }}
      className="group flex items-start gap-5 bg-white rounded-2xl border border-gray-100/80 hover:border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 p-5"
    >
      {/* Avatar */}
      <Link
        href={`/caregiver/${caregiver.caregiverId}`}
        className="shrink-0 relative"
      >
        <div className="relative w-20 h-20 rounded-2xl overflow-hidden bg-gray-100 ring-2 ring-gray-100 group-hover:ring-teal-200 transition-all">
          {caregiver.avatar ? (
            <Image
              src={caregiver.avatar}
              alt={caregiver.fullName}
              fill
              className="object-cover"
              sizes="80px"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-linear-to-br from-teal-600 to-emerald-500 text-white text-2xl font-bold">
              {caregiver.fullName?.charAt(0)?.toUpperCase()}
            </div>
          )}
        </div>
        {caregiver.verified && (
          <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-sm border border-blue-100">
            <BadgeCheck className="w-4 h-4 text-blue-500" />
          </div>
        )}
      </Link>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <Link href={`/caregiver/${caregiver.caregiverId}`}>
              <h3 className="text-lg font-semibold text-gray-900 truncate group-hover:text-teal-700 transition-colors">
                {caregiver.fullName}
              </h3>
            </Link>
            {caregiver.headline && (
              <p className="text-sm text-gray-500 truncate mt-0.5">
                {caregiver.headline}
              </p>
            )}
          </div>

          {/* Match Score & Price */}
          <div className="text-right shrink-0">
            {showMatchScore && caregiver.matchScore && (
              <div
                className={cn(
                  "inline-block px-3 py-1 rounded-full bg-linear-to-r text-white text-sm font-bold shadow-sm mb-2",
                  scoreStyle?.bg
                )}
              >
                {caregiver.matchScore}% Match
              </div>
            )}
            {primaryRate && (
              <div className="flex items-baseline gap-1 justify-end">
                <span className="text-xs font-semibold text-gray-400 mr-0.5">Rs.</span>
                <span className="text-xl font-bold text-[#39B54A]">
                  {primaryRate.toLocaleString("en-NP")}
                </span>
                <span className="text-sm text-gray-400">{rateLabel}</span>
              </div>
            )}
          </div>
        </div>

        {/* Stats Row */}
        <div className="flex items-center gap-4 mt-3 text-sm">
          {caregiver.rating && caregiver.rating > 0 && (
            <span className="flex items-center gap-1.5 text-gray-700">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              <span className="font-semibold">
                {caregiver.rating.toFixed(1)}
              </span>
              <span className="text-gray-400">
                ({caregiver.totalReviews} reviews)
              </span>
            </span>
          )}
          {caregiver.experience > 0 && (
            <span className="flex items-center gap-1.5 text-gray-500">
              <Briefcase className="w-4 h-4" />
              {caregiver.experience}+ years
            </span>
          )}
          {caregiver.location.city && (
            <span className="flex items-center gap-1.5 text-gray-500">
              <MapPin className="w-4 h-4" />
              {caregiver.distance
                ? `${caregiver.distance.toFixed(1)} km away`
                : `${caregiver.location.city}, ${caregiver.location.state || ""}`}
            </span>
          )}
          {caregiver.availability.immediateAvailability && (
            <span className="flex items-center gap-1.5 text-emerald-600 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Available Now
            </span>
          )}
        </div>

        {/* Service Types & Certifications */}
        <div className="flex flex-wrap items-center gap-2 mt-3">
          {caregiver.serviceTypes.slice(0, 4).map((type) => (
            <span
              key={type}
              className="px-2.5 py-1 bg-teal-50 text-teal-700 text-xs font-semibold rounded-lg"
            >
              {SERVICE_TYPE_LABELS[type] || type.replace(/_/g, " ")}
            </span>
          ))}
          {caregiver.certifications
            .filter((c) => c.verified)
            .slice(0, 2)
            .map((cert) => (
              <span
                key={cert.name}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded-lg"
              >
                <Award className="w-3 h-3" />
                {cert.name}
              </span>
            ))}
        </div>

        {/* AI Reasons */}
        {caregiver.reasons && caregiver.reasons.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {caregiver.reasons.slice(0, 3).map((reason, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-lg"
              >
                <Sparkles className="w-3 h-3" />
                {reason}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2 shrink-0">
        <button
          onClick={(e) => {
            e.preventDefault();
            onFavorite?.(caregiver.caregiverId);
          }}
          className={cn(
            "p-2.5 rounded-xl transition-all",
            isFavorite
              ? "bg-red-50 text-red-500"
              : "bg-gray-100 text-gray-400 hover:text-red-400 hover:bg-red-50"
          )}
        >
          <Heart className={cn("w-5 h-5", isFavorite && "fill-current")} />
        </button>

        <button
          onClick={() => onChat?.(caregiver.caregiverId)}
          className="p-2.5 rounded-xl bg-gray-100 hover:bg-teal-100 text-gray-500 hover:text-teal-700 transition-all"
          title="Chat"
        >
          <MessageSquare className="w-5 h-5" />
        </button>

        <button
          onClick={() => onCall?.(caregiver.caregiverId)}
          className="p-2.5 rounded-xl bg-gray-100 hover:bg-blue-100 text-gray-500 hover:text-blue-700 transition-all"
          title="Video Call"
        >
          <Video className="w-5 h-5" />
        </button>

        <Link
          href={`/book/${caregiver.caregiverId}`}
          onClick={() => onBook?.(caregiver.caregiverId)}
          className="px-4 py-2.5 bg-linear-to-r from-teal-600 to-emerald-600 text-white text-sm font-semibold rounded-xl hover:shadow-lg hover:shadow-teal-200/40 active:scale-[0.97] transition-all flex items-center justify-center gap-1.5"
        >
          <Calendar className="w-4 h-4" />
          Book
        </Link>
      </div>
    </motion.div>
  );
});

// ─── Main Export ───────────────────────────────────────────────────
export const EnhancedCaregiverCard = memo(function EnhancedCaregiverCard({
  variant = "grid",
  ...props
}: EnhancedCaregiverCardProps) {
  return variant === "list" ? <ListCard {...props} /> : <GridCard {...props} />;
});

export default EnhancedCaregiverCard;
