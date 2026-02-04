"use client";

import React, {
  useEffect,
  useRef,
  useCallback,
  useState,
  useMemo,
  Suspense,
  memo,
} from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Navbar } from "@/components";
import { useAISearch } from "@/hooks";
import {
  SERVICE_TYPE_LABELS,
  SORT_OPTIONS,
} from "@/types/aiMatch.types";
import type {
  AIMatchResult,
  AIMatchFilters,
} from "@/types/aiMatch.types";
import {
  CategoryNavigation,
  LocationPricingContext,
  EnhancedCaregiverCard,
  ViewToggle,
  type ViewMode,
  type EnhancedCaregiverData,
} from "@/components/features/discovery";

type AIMatchFilterPatch = {
  [K in keyof AIMatchFilters]?: AIMatchFilters[K] | undefined;
};

// ─── Constants ─────────────────────────────────────────────────────
const SERVICE_TYPE_OPTIONS = Object.entries(SERVICE_TYPE_LABELS).map(
  ([value, label]) => ({ value, label })
);

const LANGUAGE_OPTIONS = [
  "English",
  "Spanish",
  "French",
  "Mandarin",
  "Hindi",
  "Arabic",
  "Korean",
  "Punjabi",
  "Igbo",
];

// ─── Score Color Utility ───────────────────────────────────────────
function getScoreStyle(score: number) {
  if (score >= 85)
    return {
      bg: "from-emerald-500 to-teal-500",
      text: "text-emerald-700",
      light: "bg-emerald-50",
      border: "border-emerald-200",
      dot: "bg-emerald-500",
      ringStroke: "#10B981",
      ringStrokeEnd: "#14B8A6",
    };
  if (score >= 70)
    return {
      bg: "from-blue-500 to-cyan-500",
      text: "text-blue-700",
      light: "bg-blue-50",
      border: "border-blue-200",
      dot: "bg-blue-500",
      ringStroke: "#3B82F6",
      ringStrokeEnd: "#06B6D4",
    };
  return {
    bg: "from-slate-400 to-gray-400",
    text: "text-gray-600",
    light: "bg-gray-50",
    border: "border-gray-200",
    dot: "bg-gray-400",
    ringStroke: "#94A3B8",
    ringStrokeEnd: "#9CA3AF",
  };
}

// ─── Breakdown Meter ───────────────────────────────────────────────
const BreakdownMeter = memo(function BreakdownMeter({
  label,
  value,
  max,
}: {
  label: string;
  value: number;
  max: number;
}) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  const color =
    pct >= 80 ? "bg-emerald-500" : pct >= 60 ? "bg-blue-500" : "bg-slate-400";
  return (
    <div className="flex items-center gap-2">
      <span className="w-19 text-[11px] text-gray-500 font-medium truncate">
        {label}
      </span>
      <div className="flex-1 h-1.25 rounded-full bg-gray-100 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className={`h-full rounded-full ${color}`}
        />
      </div>
      <span className="w-8 text-right text-[11px] font-semibold text-gray-600">
        {pct}%
      </span>
    </div>
  );
});

// ─── Skeleton Card ─────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 animate-pulse">
      <div className="flex items-start gap-4 mb-4">
        <div className="w-13 h-13 rounded-2xl bg-gray-100" />
        <div className="flex-1">
          <div className="h-4 bg-gray-100 rounded-lg w-3/4 mb-2" />
          <div className="h-3 bg-gray-100 rounded-lg w-1/2" />
        </div>
        <div className="w-14 h-7 bg-gray-100 rounded-full" />
      </div>
      <div className="flex gap-1.5 mb-3">
        <div className="h-5.5 bg-gray-50 rounded-full w-28" />
        <div className="h-5.5 bg-gray-50 rounded-full w-36" />
      </div>
      <div className="flex gap-3 mb-3">
        <div className="h-4 bg-gray-50 rounded w-16" />
        <div className="h-4 bg-gray-50 rounded w-12" />
        <div className="h-4 bg-gray-50 rounded w-14" />
        <div className="h-4 bg-gray-50 rounded w-20" />
      </div>
      <div className="flex gap-1.5 mb-4">
        <div className="h-5 bg-gray-50 rounded-md w-12" />
        <div className="h-5 bg-gray-50 rounded-md w-16" />
        <div className="h-5 bg-gray-50 rounded-md w-20" />
        <div className="h-5 bg-gray-50 rounded-md w-14" />
      </div>
      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <div className="h-5 bg-gray-100 rounded w-14" />
        <div className="flex gap-2">
          <div className="h-9 bg-gray-100 rounded-xl w-28" />
          <div className="h-9 bg-gray-100 rounded-xl w-24" />
        </div>
      </div>
    </div>
  );
}

// ─── Skeleton Filters ──────────────────────────────────────────────
function SkeletonFilters() {
  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100/60 shadow-sm animate-pulse">
      <div className="h-5 bg-gray-100 rounded w-20 mb-5" />
      <div className="space-y-5">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i}>
            <div className="h-3 bg-gray-100 rounded w-24 mb-2" />
            <div className="h-8 bg-gray-50 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Caregiver Card ────────────────────────────────────────────────
const CaregiverSearchCard = memo(function CaregiverSearchCard({
  result,
  index,
  onTrack,
}: {
  result: AIMatchResult;
  index: number;
  onTrack?: (id: string, action: string) => void;
}) {
  const [showBreakdown, setShowBreakdown] = useState(false);
  const style = getScoreStyle(result.matchScore);

  const primaryRate =
    result.hourlyRate ||
    result.dailyRate ||
    result.weeklyRate ||
    result.monthlyRate;
  const rateLabel = result.hourlyRate
    ? "/hr"
    : result.dailyRate
      ? "/day"
      : result.weeklyRate
        ? "/wk"
        : result.monthlyRate
          ? "/mo"
          : "";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.35, delay: index * 0.04 }}
      className="group relative bg-white rounded-2xl border border-gray-100/80 hover:border-gray-200 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.07)] transition-all duration-300 overflow-hidden"
    >
      {/* Top rank ribbon */}
      {result.rank <= 3 && result.category === "excellent" && (
        <div
          className={`absolute top-0 left-0 right-0 h-0.75 bg-linear-to-r ${style.bg}`}
        />
      )}

      <div className="p-5">
        {/* Header Row */}
        <div className="flex items-start gap-3.5 mb-3.5">
          {/* Avatar */}
          <Link
            href={`/caregiver/${result.caregiverId}`}
            onClick={() => onTrack?.(result.caregiverId, "profile_click")}
            className="shrink-0"
          >
            <div className="relative w-13 h-13 rounded-2xl overflow-hidden bg-linear-to-br from-slate-100 to-slate-50 ring-1 ring-gray-100">
              {result.avatar ? (
                <Image
                  src={result.avatar}
                  alt={result.fullName}
                  fill
                  className="object-cover"
                  sizes="52px"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-linear-to-br from-teal-600 to-emerald-500 text-white text-lg font-bold">
                  {result.fullName?.charAt(0)?.toUpperCase()}
                </div>
              )}
              {result.verified && (
                <div className="absolute -bottom-0.5 -right-0.5 w-4.5 h-4.5 bg-white rounded-full flex items-center justify-center shadow-sm">
                  <svg
                    className="w-3 h-3 text-blue-500"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              )}
            </div>
          </Link>

          {/* Name & headline */}
          <div className="flex-1 min-w-0">
            <Link
              href={`/caregiver/${result.caregiverId}`}
              onClick={() => onTrack?.(result.caregiverId, "profile_click")}
            >
              <h3 className="text-[15px] font-semibold text-gray-900 truncate group-hover:text-teal-700 transition-colors leading-tight">
                {result.fullName}
                {result.verified && (
                  <svg
                    className="inline-block w-3.5 h-3.5 text-blue-500 ml-1 -mt-0.5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </h3>
            </Link>
            {result.headline && (
              <p className="text-xs text-gray-500 truncate mt-0.5 leading-relaxed">
                {result.headline}
              </p>
            )}
          </div>

          {/* Match Badge */}
          <div className="shrink-0">
            <div
              className={`px-3 py-1 rounded-full bg-linear-to-r ${style.bg} text-white text-xs font-bold shadow-sm`}
            >
              {result.matchScore}%{" "}
              <span className="font-medium opacity-90">Match</span>
            </div>
          </div>
        </div>

        {/* AI Reasons */}
        {result.reasons.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {result.reasons.slice(0, 2).map((reason, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-teal-50 text-teal-700 text-[11px] font-medium rounded-md"
              >
                <svg
                  className="w-3 h-3 text-teal-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                {reason}
              </span>
            ))}
          </div>
        )}

        {/* Stats Row */}
        <div className="flex items-center gap-3 text-xs mb-3">
          <span className="flex items-center gap-1 text-gray-700">
            <svg
              className="w-3.5 h-3.5 text-amber-400"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
            </svg>
            <span className="font-semibold">
              {result.rating?.toFixed(1) || "—"}
            </span>
            <span className="text-gray-400">({result.totalReviews})</span>
          </span>
          {result.experience > 0 && (
            <span className="text-gray-500">
              {result.experience}+ yrs
            </span>
          )}
          {result.location.city && (
            <span className="flex items-center gap-0.5 text-gray-500">
              <svg
                className="w-3 h-3 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
              </svg>
              {result.rawScores?.distance
                ? `${(result.rawScores.distance as unknown as number / 10).toFixed?.(1) || result.rawScores.distance} km`
                : result.location.city}
            </span>
          )}
          {result.availability.immediateAvailability && (
            <span className="flex items-center gap-1 text-emerald-600 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Available Now
            </span>
          )}
        </div>

        {/* Certification & Language Tags */}
        <div className="flex flex-wrap gap-1 mb-3">
          {result.certifications
            .filter((c) => c.verified)
            .slice(0, 3)
            .map((cert) => (
              <span
                key={cert.name}
                className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-semibold rounded-md tracking-wide uppercase"
              >
                {cert.name}
              </span>
            ))}
          {result.skills.slice(0, 2).map((skill) => (
            <span
              key={skill}
              className="px-2 py-0.5 bg-slate-50 text-slate-600 text-[10px] font-medium rounded-md"
            >
              {skill}
            </span>
          ))}
          {result.languages.slice(0, 2).map((lang) => (
            <span
              key={lang}
              className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[10px] font-medium rounded-md"
            >
              {lang}
            </span>
          ))}
        </div>

        {/* Price + Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100/80">
          <div>
            {primaryRate ? (
              <div className="flex items-baseline gap-0.5">
                <span className="text-xs font-semibold text-gray-400 mr-0.5">Rs.</span>
                <span className="text-lg font-bold text-[#39B54A]">
                  {primaryRate.toLocaleString("en-NP")}
                </span>
                <span className="text-xs text-gray-400">{rateLabel}</span>
              </div>
            ) : (
              <span className="text-sm text-gray-400">Contact for rates</span>
            )}
          </div>
          <div className="flex gap-2">
            <Link
              href={`/caregiver/${result.caregiverId}`}
              onClick={() => onTrack?.(result.caregiverId, "profile_click")}
              className="px-3.5 py-2 text-xs font-semibold text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-200/80 transition-colors flex items-center gap-1.5"
            >
              View Profile
              <svg
                className="w-3 h-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </Link>
            <Link
              href={`/book/${result.caregiverId}`}
              className={`px-4 py-2 text-xs font-semibold text-white bg-linear-to-r ${style.bg} rounded-xl hover:shadow-md hover:shadow-emerald-200/40 active:scale-[0.97] transition-all`}
            >
              Book Now
            </Link>
          </div>
        </div>
      </div>

      {/* Expandable Compatibility Breakdown */}
      <div className="border-t border-gray-100/60">
        <button
          onClick={() => setShowBreakdown(!showBreakdown)}
          className="w-full flex items-center justify-center gap-1.5 py-2 text-[11px] font-medium text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
          {showBreakdown ? "Hide" : "Compatibility"} Breakdown
          <svg
            className={`w-3 h-3 transition-transform ${showBreakdown ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
        <AnimatePresence>
          {showBreakdown && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="px-5 pb-4 space-y-1.5">
                <BreakdownMeter
                  label="Skill Match"
                  value={result.breakdown.skills}
                  max={40}
                />
                <BreakdownMeter
                  label="Availability"
                  value={result.breakdown.availability}
                  max={20}
                />
                <BreakdownMeter
                  label="Proximity"
                  value={result.breakdown.distance}
                  max={15}
                />
                <BreakdownMeter
                  label="Budget Fit"
                  value={result.breakdown.budget}
                  max={10}
                />
                <BreakdownMeter
                  label="Rating"
                  value={result.breakdown.ratings}
                  max={15}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
});

void CaregiverSearchCard;

// ─── Filter Panel ──────────────────────────────────────────────────
function FilterPanel({
  filters,
  onChange,
  onClear,
  activeCount,
}: {
  filters: AIMatchFilters;
  onChange: (f: AIMatchFilterPatch) => void;
  onClear: () => void;
  activeCount: number;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100/60 shadow-sm p-5 sticky top-20">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-sm font-semibold text-gray-900">Filters</h2>
        {activeCount > 0 && (
          <button
            onClick={onClear}
            className="text-xs text-teal-600 hover:text-teal-700 font-medium"
          >
            Reset all
          </button>
        )}
      </div>

      {/* Verified Only */}
      <div className="mb-5 pb-5 border-b border-gray-100">
        <label className="flex items-center justify-between cursor-pointer group">
          <span className="text-sm text-gray-700 font-medium flex items-center gap-2">
            <svg
              className="w-4 h-4 text-blue-500"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            Verified Only
          </span>
          <div
            className={`relative w-9 h-5 rounded-full transition-colors ${
              filters.backgroundCheckRequired
                ? "bg-teal-500"
                : "bg-gray-200"
            }`}
            onClick={() =>
              onChange({
                backgroundCheckRequired: !filters.backgroundCheckRequired,
              })
            }
          >
            <div
              className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                filters.backgroundCheckRequired
                  ? "translate-x-4.5"
                  : "translate-x-0.5"
              }`}
            />
          </div>
        </label>
      </div>

      {/* Minimum Rating */}
      <div className="mb-5 pb-5 border-b border-gray-100">
        <div className="flex items-center justify-between mb-2.5">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Minimum Rating
          </h3>
          <span className="text-xs text-gray-400">
            {filters.minRating ? `${filters.minRating}+` : "Any"}
          </span>
        </div>
        <input
          type="range"
          min="0"
          max="5"
          step="0.5"
          value={filters.minRating || 0}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            onChange({ minRating: v > 0 ? v : 0 });
          }}
          className="w-full h-1.5 bg-gray-100 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-teal-500 [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer"
        />
      </div>

      {/* Min Experience */}
      <div className="mb-5 pb-5 border-b border-gray-100">
        <div className="flex items-center justify-between mb-2.5">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Min. Experience
          </h3>
          <span className="text-xs text-gray-400">
            {filters.minExperience ? `${filters.minExperience}+ yrs` : "Any"}
          </span>
        </div>
        <input
          type="range"
          min="0"
          max="15"
          step="1"
          value={filters.minExperience || 0}
          onChange={(e) => {
            const v = parseInt(e.target.value);
            onChange({ minExperience: v > 0 ? v : 0 });
          }}
          className="w-full h-1.5 bg-gray-100 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-teal-500 [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer"
        />
      </div>

      {/* Languages */}
      <div className="mb-5 pb-5 border-b border-gray-100">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2.5">
          Languages
        </h3>
        <div className="grid grid-cols-2 gap-1.5">
          {LANGUAGE_OPTIONS.map((lang) => {
            const selected = filters.languages?.includes(lang);
            return (
              <button
                key={lang}
                onClick={() => {
                  const current = filters.languages || [];
                  onChange({
                    languages: selected
                      ? current.filter((l) => l !== lang)
                      : [...current, lang],
                  });
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-all ${
                  selected
                    ? "bg-teal-50 text-teal-700 font-medium ring-1 ring-teal-200"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <span
                  className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors ${
                    selected
                      ? "bg-teal-500 border-teal-500"
                      : "border-gray-300"
                  }`}
                >
                  {selected && (
                    <svg
                      className="w-2.5 h-2.5 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </span>
                {lang}
              </button>
            );
          })}
        </div>
      </div>

      {/* Skills & Services */}
      <div className="mb-5 pb-5 border-b border-gray-100">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2.5">
          Skills &amp; Services
        </h3>
        <div className="flex flex-wrap gap-1.5">
          {SERVICE_TYPE_OPTIONS.slice(0, 10).map((st) => {
            const selected = filters.serviceTypes?.includes(st.value);
            return (
              <button
                key={st.value}
                onClick={() => {
                  const current = filters.serviceTypes || [];
                  onChange({
                    serviceTypes: selected
                      ? current.filter((s) => s !== st.value)
                      : [...current, st.value],
                  });
                }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                  selected
                    ? "bg-teal-600 text-white shadow-sm"
                    : "bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-100"
                }`}
              >
                {st.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Budget / Hourly Rate */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-2.5">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Budget (Rs./hr)
          </h3>
          <span className="text-xs text-gray-400">
            {filters.minRate || filters.maxRate
              ? `Rs. ${(filters.minRate ?? 0).toLocaleString("en-NP")}${filters.maxRate ? `–${filters.maxRate.toLocaleString("en-NP")}` : "+"}`
              : "Any"}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {[
            { label: "Under Rs. 500", min: undefined, max: 500 },
            { label: "Rs. 500–1,000", min: 500, max: 1000 },
            { label: "Rs. 1,000–1,800", min: 1000, max: 1800 },
            { label: "Rs. 1,800–3,000", min: 1800, max: 3000 },
            { label: "Rs. 3,000+", min: 3000, max: undefined },
          ].map((range) => {
            const active =
              filters.minRate === range.min && filters.maxRate === range.max;
            return (
              <button
                key={range.label}
                onClick={() =>
                  onChange(
                    active
                      ? { minRate: undefined, maxRate: undefined }
                      : {
                          ...(range.min !== undefined ? { minRate: range.min } : {}),
                          ...(range.max !== undefined ? { maxRate: range.max } : {}),
                        }
                  )
                }
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all text-left ${
                  active
                    ? "bg-teal-600 text-white shadow-sm"
                    : "bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-100"
                }`}
              >
                {range.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── How Ranking Works Panel ───────────────────────────────────────
function RankingExplainer() {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
      >
        <svg
          className="w-3.5 h-3.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        How ranking works
        <svg
          className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 top-7 z-40 w-80 bg-white rounded-xl border border-gray-100 shadow-xl p-4"
          >
            <h4 className="text-sm font-semibold text-gray-900 mb-2">
              AI-Powered Matching
            </h4>
            <p className="text-xs text-gray-500 mb-3 leading-relaxed">
              Each caregiver is scored across 5 dimensions, weighted by
              importance to care quality:
            </p>
            <div className="space-y-2">
              {[
                {
                  label: "Skill Match",
                  weight: "40%",
                  desc: "Certifications, service types & expertise alignment",
                },
                {
                  label: "Availability",
                  weight: "20%",
                  desc: "Schedule compatibility with your needs",
                },
                {
                  label: "Proximity",
                  weight: "15%",
                  desc: "Geographic distance to your location",
                },
                {
                  label: "Ratings",
                  weight: "15%",
                  desc: "Verified reviews and quality scores",
                },
                {
                  label: "Budget",
                  weight: "10%",
                  desc: "Rate alignment with your budget range",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-start gap-2 text-xs"
                >
                  <span className="w-8 text-teal-600 font-bold shrink-0">
                    {item.weight}
                  </span>
                  <div>
                    <span className="font-semibold text-gray-700">
                      {item.label}
                    </span>
                    <span className="text-gray-400 ml-1">— {item.desc}</span>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-gray-400 mt-3 pt-2 border-t border-gray-100 leading-relaxed">
              Scores are personalized based on your search history and
              preferences. Results update in real-time as you adjust filters.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Suggestions Dropdown ──────────────────────────────────────────
function SuggestionsDropdown({
  suggestions,
  onSelect,
  onClose,
}: {
  suggestions: { text: string; type: string }[];
  onSelect: (text: string) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  if (suggestions.length === 0) return null;

  return (
    <div
      ref={ref}
      className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50"
    >
      {suggestions.map((sug, i) => (
        <button
          key={i}
          onClick={() => onSelect(sug.text)}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50 transition-colors text-sm"
        >
          <svg
            className="w-4 h-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <span className="text-gray-700">{sug.text}</span>
          <span className="ml-auto text-[10px] text-gray-400 uppercase tracking-wider font-medium">
            {sug.type}
          </span>
        </button>
      ))}
    </div>
  );
}

// ─── Pagination ────────────────────────────────────────────────────
function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  const pages = useMemo(() => {
    const arr: (number | "...")[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) arr.push(i);
    } else {
      arr.push(1);
      if (page > 3) arr.push("...");
      for (
        let i = Math.max(2, page - 1);
        i <= Math.min(totalPages - 1, page + 1);
        i++
      )
        arr.push(i);
      if (page < totalPages - 2) arr.push("...");
      arr.push(totalPages);
    }
    return arr;
  }, [page, totalPages]);

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-1.5 mt-8">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
        className="px-3 py-2 rounded-lg text-sm font-medium border border-gray-200 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
      >
        ← Prev
      </button>
      {pages.map((p, i) =>
        p === "..." ? (
          <span key={`d${i}`} className="px-1.5 text-gray-400 text-sm">
            ···
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={`w-9 h-9 rounded-lg text-sm font-medium transition-all ${
              page === p
                ? "bg-teal-600 text-white shadow-sm"
                : "hover:bg-gray-50 text-gray-600"
            }`}
          >
            {p}
          </button>
        )
      )}
      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page === totalPages}
        className="px-3 py-2 rounded-lg text-sm font-medium border border-gray-200 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
      >
        Next →
      </button>
    </div>
  );
}

// ─── Main Search Content ───────────────────────────────────────────
function SearchPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const searchRef = useRef<HTMLInputElement>(null);

  const {
    results,
    total,
    page,
    totalPages,
    isLoading,
    error,
    query,
    filters,
    sortBy,
    suggestions,
    showSuggestions,
    searchMeta,
    hasSearched,
    search,
    setQuery,
    setSortBy,
    setFilters,
    clearFilters,
    setPage,
    selectSuggestion,
    hideSuggestions,
    trackInteraction,
  } = useAISearch();

  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  // Handle category selection
  const handleCategoryChange = useCallback(
    (categories: string[]) => {
      setSelectedCategories(categories);
      // Update service types filter
      if (categories.length > 0) {
        setFilters({ serviceTypes: categories });
      } else {
        setFilters({ serviceTypes: [] });
      }
      setTimeout(() => search(), 150);
    },
    [setFilters, search]
  );

  // Initialize from URL params (q, category)
  useEffect(() => {
    const q = searchParams.get("q") || "";
    const category = searchParams.get("category") || "";

    if (q) setQuery(q);

    if (category) {
      // Map category slug to service type key used by the AI search
      const categoryMap: Record<string, string> = {
        "child-care": "child_care",
        "childcare": "child_care",
        "child_care": "child_care",
        "senior-care": "elderly_care",
        "seniorcare": "elderly_care",
        "elderly_care": "elderly_care",
        "medical-care": "medical_care",
        "medical_care": "medical_care",
        "special-needs": "disability_care",
        "specialneeds": "disability_care",
        "disability_care": "disability_care",
        "home-care": "home_care",
        "home_care": "home_care",
        "overnight-care": "overnight_care",
        "overnight_care": "overnight_care",
        "alzheimer": "alzheimer_care",
        "alzheimers-care": "alzheimer_care",
        "alzheimer_care": "alzheimer_care",
      };
      const mappedCategory = categoryMap[category.toLowerCase()] || category;
      setSelectedCategories([mappedCategory]);
      setFilters({ serviceTypes: [mappedCategory] });
    }

    setTimeout(() => search(), 150);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = useCallback(
    (e?: React.FormEvent) => {
      e?.preventDefault();
      search();
    },
    [search]
  );

  const handleSuggestionSelect = useCallback(
    (text: string) => {
      selectSuggestion(text);
      setTimeout(() => search(), 50);
    },
    [selectSuggestion, search]
  );

  const handleFilterChange = useCallback(
    (f: AIMatchFilterPatch) => {
      setFilters(f);
      setTimeout(() => search(), 150);
    },
    [setFilters, search]
  );

  const handleClearFilters = useCallback(() => {
    clearFilters();
    setTimeout(() => search(), 100);
  }, [clearFilters, search]);

  const handleSortChange = useCallback(
    (newSort: string) => {
      setSortBy(newSort);
      setTimeout(() => search(), 50);
    },
    [setSortBy, search]
  );

  // Active filter count
  const activeFilterCount = useMemo(
    () =>
      [
        (filters.serviceTypes?.length || 0) > 0,
        !!filters.minRating,
        !!filters.minExperience,
        (filters.languages?.length || 0) > 0,
        !!filters.backgroundCheckRequired,
        !!filters.maxDistance,
        !!filters.preferredGender,
        !!(filters.minRate || filters.maxRate),
      ].filter(Boolean).length,
    [filters]
  );

  return (
    <div className="min-h-screen bg-[#F8FAFB]">
      <Navbar />

      {/* Sticky Search Bar */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-xl border-b border-gray-100/60 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
        <div className="max-w-340 mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <form onSubmit={handleSearch} className="relative">
            <div className="flex items-center gap-3">
              {/* Main Search Input */}
              <div className="flex-1 relative">
                <div className="flex items-center bg-gray-50/80 rounded-xl border border-gray-200/60 hover:border-gray-300 focus-within:border-teal-400 focus-within:ring-2 focus-within:ring-teal-100 transition-all">
                  <div className="pl-3.5 text-gray-400">
                    <svg
                      className="w-4.5 h-4.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                  </div>
                  <input
                    ref={searchRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Need someone gentle for Alzheimer's patient…"
                    className="flex-1 px-3 py-2.5 bg-transparent text-sm text-gray-900 placeholder:text-gray-400 outline-none"
                  />
                  {query && (
                    <button
                      type="button"
                      onClick={() => {
                        setQuery("");
                        searchRef.current?.focus();
                      }}
                      className="pr-3 text-gray-400 hover:text-gray-600"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  )}
                </div>

                {showSuggestions && (
                  <SuggestionsDropdown
                    suggestions={suggestions}
                    onSelect={handleSuggestionSelect}
                    onClose={hideSuggestions}
                  />
                )}
              </div>

              {/* Sort */}
              <select
                value={sortBy}
                onChange={(e) => handleSortChange(e.target.value)}
                className="hidden sm:block px-3 py-2.5 bg-gray-50/80 border border-gray-200/60 rounded-xl text-sm text-gray-700 cursor-pointer hover:border-gray-300 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none transition-all"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>

              {/* Search Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="px-5 py-2.5 bg-teal-600 text-white text-sm font-semibold rounded-xl hover:bg-teal-700 active:scale-[0.97] disabled:opacity-60 transition-all shadow-sm"
              >
                {isLoading ? (
                  <svg
                    className="animate-spin w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                ) : (
                  "Search"
                )}
              </button>

              {/* Mobile Filter Toggle */}
              <button
                type="button"
                onClick={() => setShowMobileFilters(true)}
                className="lg:hidden flex items-center gap-1.5 px-3 py-2.5 bg-gray-50/80 border border-gray-200/60 rounded-xl text-sm text-gray-700"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                  />
                </svg>
                {activeFilterCount > 0 && (
                  <span className="w-4 h-4 text-[10px] font-bold bg-teal-600 text-white rounded-full flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Category Navigation */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-100/60">
        <div className="max-w-340 mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <CategoryNavigation
            selectedCategories={selectedCategories}
            onCategoryChange={handleCategoryChange}
            variant="horizontal"
            multiSelect={true}
          />
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-340 mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Location Pricing Context */}
        <div className="mb-6">
          <LocationPricingContext
            selectedCategories={selectedCategories}
          />
        </div>

        <div className="flex gap-6">
          {/* Desktop Filter Sidebar */}
          <aside className="hidden lg:block w-70 shrink-0">
            {isLoading && !hasSearched ? (
              <SkeletonFilters />
            ) : (
              <FilterPanel
                filters={filters}
                onChange={handleFilterChange}
                onClear={handleClearFilters}
                activeCount={activeFilterCount}
              />
            )}
          </aside>

          {/* Mobile Filter Sheet */}
          <AnimatePresence>
            {showMobileFilters && (
              <div className="fixed inset-0 z-50 lg:hidden">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                  onClick={() => setShowMobileFilters(false)}
                />
                <motion.div
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  exit={{ y: "100%" }}
                  transition={{ type: "spring", damping: 26, stiffness: 300 }}
                  className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl max-h-[85vh] overflow-y-auto"
                >
                  <div className="sticky top-0 bg-white pt-3 pb-2 px-5 border-b border-gray-100 flex items-center justify-between">
                    <h2 className="text-base font-semibold text-gray-900">
                      Filters
                    </h2>
                    <button
                      onClick={() => setShowMobileFilters(false)}
                      className="p-2 text-gray-400 hover:text-gray-600"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                  <div className="p-5">
                    <FilterPanel
                      filters={filters}
                      onChange={handleFilterChange}
                      onClear={handleClearFilters}
                      activeCount={activeFilterCount}
                    />
                  </div>
                  <div className="sticky bottom-0 bg-white border-t border-gray-100 p-4 flex gap-3">
                    <button
                      onClick={() => {
                        handleClearFilters();
                        setShowMobileFilters(false);
                      }}
                      className="flex-1 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
                    >
                      Reset
                    </button>
                    <button
                      onClick={() => {
                        setShowMobileFilters(false);
                        search();
                      }}
                      className="flex-1 py-2.5 text-sm font-semibold text-white bg-teal-600 rounded-xl hover:bg-teal-700 transition-colors"
                    >
                      Apply Filters
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* Results Column */}
          <div className="flex-1 min-w-0">
            {/* Results Header */}
            <div className="flex items-start justify-between mb-5">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <svg
                    className="w-5 h-5 text-teal-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                    />
                  </svg>
                  <h1 className="text-lg font-semibold text-gray-900">
                    {selectedCategories.length > 0
                      ? `Caregivers for ${selectedCategories.map(c => SERVICE_TYPE_LABELS[c] || c).join(", ")}`
                      : "Best Matches for Your Needs"}
                  </h1>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed max-w-lg">
                  {hasSearched && !isLoading ? (
                    <>
                      <span className="font-semibold text-gray-700">
                        {total}
                      </span>{" "}
                      caregivers ranked by skill match, availability, proximity,
                      ratings &amp; budget compatibility.
                    </>
                  ) : (
                    "Ranked by skill match, availability, proximity, ratings, and budget compatibility."
                  )}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <ViewToggle value={viewMode} onChange={setViewMode} showMap={false} />
                <RankingExplainer />
              </div>
            </div>

            {/* AI Interpretation Chip */}
            <AnimatePresence>
              {searchMeta?.interpretation && !isLoading && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="mb-4 inline-flex items-center gap-2 px-3.5 py-2 bg-teal-50 border border-teal-100 rounded-xl"
                >
                  <svg
                    className="w-4 h-4 text-teal-600 shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                    />
                  </svg>
                  <span className="text-xs text-teal-700 font-medium">
                    AI understood:{" "}
                    <span className="text-teal-900">
                      {searchMeta.interpretation}
                    </span>
                  </span>
                  {searchMeta.confidence !== undefined && (
                    <span className="text-[10px] text-teal-500 font-medium bg-teal-100/60 px-1.5 py-0.5 rounded-md">
                      {Math.round(searchMeta.confidence * 100)}% confidence
                    </span>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Active Filter Chips */}
            {activeFilterCount > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 mb-4">
                {filters.serviceTypes?.map((st) => (
                  <span
                    key={st}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-teal-50 text-teal-700 text-xs font-medium rounded-full border border-teal-100"
                  >
                    {SERVICE_TYPE_LABELS[st] || st.replace(/_/g, " ")}
                    <button
                      onClick={() =>
                        handleFilterChange({
                          serviceTypes: (filters.serviceTypes || []).filter(
                            (s) => s !== st
                          ),
                        })
                      }
                      className="hover:text-red-500"
                    >
                      <svg
                        className="w-3 h-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </span>
                ))}
                {filters.languages?.map((lang) => (
                  <span
                    key={lang}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 text-indigo-700 text-xs font-medium rounded-full border border-indigo-100"
                  >
                    {lang}
                    <button
                      onClick={() =>
                        handleFilterChange({
                          languages: (filters.languages || []).filter(
                            (l) => l !== lang
                          ),
                        })
                      }
                      className="hover:text-red-500"
                    >
                      <svg
                        className="w-3 h-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </span>
                ))}
                {filters.minRating && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 text-xs font-medium rounded-full border border-amber-100">
                    {filters.minRating}+ stars
                    <button
                      onClick={() => handleFilterChange({ minRating: 0 })}
                      className="hover:text-red-500"
                    >
                      <svg
                        className="w-3 h-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </span>
                )}
                {filters.minExperience && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-50 text-purple-700 text-xs font-medium rounded-full border border-purple-100">
                    {filters.minExperience}+ yrs exp
                    <button
                      onClick={() =>
                        handleFilterChange({ minExperience: 0 })
                      }
                      className="hover:text-red-500"
                    >
                      <svg
                        className="w-3 h-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </span>
                )}
                <button
                  onClick={handleClearFilters}
                  className="text-xs text-gray-400 hover:text-red-500 ml-1 transition-colors"
                >
                  Clear all
                </button>
              </div>
            )}

            {/* Loading */}
            {isLoading && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            )}

            {/* Error */}
            {error && !isLoading && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-16 bg-white rounded-2xl border border-red-100/60"
              >
                <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-50 flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-red-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  Something went wrong
                </h3>
                <p className="text-sm text-gray-500 mb-5 max-w-md mx-auto">
                  {error}
                </p>
                <button
                  onClick={() => search()}
                  className="px-5 py-2.5 bg-teal-600 text-white text-sm font-semibold rounded-xl hover:bg-teal-700 transition-colors"
                >
                  Try Again
                </button>
              </motion.div>
            )}

            {/* Empty State */}
            {!isLoading && !error && hasSearched && results.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-20 bg-white rounded-2xl border border-gray-100/60"
              >
                <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-gray-50 flex items-center justify-center">
                  <svg
                    className="w-8 h-8 text-gray-300"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  No caregivers match your current filters
                </h3>
                <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
                  Try expanding your budget, adjusting availability, or
                  broadening your search criteria.
                </p>
                <button
                  onClick={handleClearFilters}
                  className="px-5 py-2.5 bg-teal-600 text-white text-sm font-semibold rounded-xl hover:bg-teal-700 transition-colors"
                >
                  Reset Filters
                </button>
              </motion.div>
            )}

            {/* Results Grid/List */}
            {!isLoading && !error && results.length > 0 && (
              <>
                <div className={viewMode === "list" 
                  ? "flex flex-col gap-4" 
                  : "grid grid-cols-1 md:grid-cols-2 gap-4"
                }>
                  <AnimatePresence mode="popLayout">
                    {results.map((result, i) => {
                      // Transform AIMatchResult to EnhancedCaregiverData (handle null -> undefined)
                      const caregiverData: EnhancedCaregiverData = {
                        caregiverId: result.caregiverId,
                        fullName: result.fullName,
                        ...(result.avatar !== null ? { avatar: result.avatar } : {}),
                        ...(result.headline !== null ? { headline: result.headline } : {}),
                        ...(result.bio !== null ? { bio: result.bio } : {}),
                        experience: result.experience,
                        ...(result.hourlyRate !== null ? { hourlyRate: result.hourlyRate } : {}),
                        ...(result.dailyRate !== null ? { dailyRate: result.dailyRate } : {}),
                        ...(result.weeklyRate !== null ? { weeklyRate: result.weeklyRate } : {}),
                        ...(result.monthlyRate !== null ? { monthlyRate: result.monthlyRate } : {}),
                        rating: result.rating,
                        totalReviews: result.totalReviews,
                        serviceTypes: result.serviceTypes || [],
                        skills: result.skills || [],
                        certifications: result.certifications || [],
                        languages: result.languages || [],
                        location: {
                          ...(result.location.city !== null ? { city: result.location.city } : {}),
                          ...(result.location.state !== null ? { state: result.location.state } : {}),
                        },
                        availability: result.availability,
                        verified: result.verified,
                        backgroundCheck: result.backgroundCheck === "passed",
                        matchScore: result.matchScore,
                        reasons: result.reasons,
                        ...(result.rawScores?.distance && typeof result.rawScores.distance === "number"
                          ? { distance: result.rawScores.distance / 10 }
                          : {}),
                        completedJobs: result.completedJobs,
                        ...(result.responseTime !== null ? { responseTime: result.responseTime } : {}),
                        responseRate: result.responseRate,
                      };
                      return (
                        <EnhancedCaregiverCard
                          key={result.caregiverId}
                          caregiver={caregiverData}
                          variant={viewMode === "list" ? "list" : "grid"}
                          index={i}
                          showMatchScore={true}
                          onChat={(id) => {
                            trackInteraction(id, "contacted");
                            router.push(`/messages?to=${id}`);
                          }}
                          onCall={(id) => {
                            trackInteraction(id, "contacted");
                            router.push(`/call/${id}`);
                          }}
                          onBook={(id) => {
                            trackInteraction(id, "booked");
                          }}
                        />
                      );
                    })}
                  </AnimatePresence>
                </div>
                <Pagination
                  page={page}
                  totalPages={totalPages}
                  onPageChange={setPage}
                />
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

// ─── Page Export ────────────────────────────────────────────────────
export default function CaregiversPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F8FAFB] flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <svg
              className="animate-spin w-8 h-8 text-teal-600"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            <span className="text-sm text-gray-500 font-medium">
              Loading search…
            </span>
          </div>
        </div>
      }
    >
      <SearchPageContent />
    </Suspense>
  );
}
