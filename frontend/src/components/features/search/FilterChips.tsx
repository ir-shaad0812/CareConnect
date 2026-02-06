// ============================================
// FILTER CHIPS - Active filter pills display
// ============================================

"use client";

import { X } from "lucide-react";
import type { SearchFilters } from "@/services/api/search.service";

interface FilterChipsProps {
  filters: SearchFilters;
  onRemoveFilter: (key: keyof SearchFilters, value?: string) => void;
  onClearAll: () => void;
}

// Labels for filter values
const SERVICE_TYPE_LABELS: Record<string, string> = {
  elderly_care: "Elderly Care",
  child_care: "Child Care",
  disability_care: "Disability Care",
  medical_care: "Medical Care",
  companionship: "Companionship",
  housekeeping: "Housekeeping",
  meal_preparation: "Meal Prep",
  transportation: "Transportation",
};

const AVAILABILITY_LABELS: Record<string, string> = {
  weekdays: "Weekdays",
  weekends: "Weekends",
  mornings: "Mornings",
  afternoons: "Afternoons",
  evenings: "Evenings",
  overnight: "Overnight",
  "live-in": "Live-in",
};

export default function FilterChips({
  filters,
  onRemoveFilter,
  onClearAll,
}: FilterChipsProps) {
  // Generate chips from filters
  const chips: { key: keyof SearchFilters; label: string; value?: string }[] = [];

  // Service types
  if (filters.serviceTypes?.length) {
    filters.serviceTypes.forEach((type) => {
      chips.push({
        key: "serviceTypes",
        label: SERVICE_TYPE_LABELS[type] || type,
        value: type,
      });
    });
  }

  // Location
  if (filters.location) {
    chips.push({
      key: "location",
      label: `Near: ${filters.location}${filters.radius ? ` (${filters.radius} mi)` : ""}`,
    });
  }

  // Rating
  if (filters.minRating) {
    chips.push({
      key: "minRating",
      label: `${filters.minRating}+ Stars`,
    });
  }

  // Price range
  if (filters.minPrice || filters.maxPrice) {
    const priceLabel =
      filters.minPrice && filters.maxPrice
        ? `Rs. ${Number(filters.minPrice).toLocaleString("en-NP")} - Rs. ${Number(filters.maxPrice).toLocaleString("en-NP")}/hr`
        : filters.minPrice
          ? `Rs. ${Number(filters.minPrice).toLocaleString("en-NP")}+ /hr`
          : `Up to Rs. ${Number(filters.maxPrice).toLocaleString("en-NP")}/hr`;
    chips.push({
      key: "minPrice",
      label: priceLabel,
    });
  }

  // Experience
  if (filters.minExperience) {
    chips.push({
      key: "minExperience",
      label: `${filters.minExperience}+ Years Exp`,
    });
  }

  // Availability
  if (filters.availability?.length) {
    filters.availability.forEach((avail) => {
      chips.push({
        key: "availability",
        label: AVAILABILITY_LABELS[avail] || avail,
        value: avail,
      });
    });
  }

  // Specializations
  if (filters.specializations?.length) {
    filters.specializations.forEach((spec) => {
      chips.push({
        key: "specializations",
        label: spec,
        value: spec,
      });
    });
  }

  // Languages
  if (filters.languages?.length) {
    filters.languages.forEach((lang) => {
      chips.push({
        key: "languages",
        label: lang,
        value: lang,
      });
    });
  }

  // Verified
  if (filters.verified) {
    chips.push({
      key: "verified",
      label: "Verified Only",
    });
  }

  // Background checked
  if (filters.backgroundCheck) {
    chips.push({
      key: "backgroundCheck",
      label: "Background Checked",
    });
  }

  // Don't render if no chips
  if (chips.length === 0) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-sm text-gray-500 dark:text-gray-400">Active filters:</span>
      
      {chips.map((chip, index) => (
        <button
          key={`${chip.key}-${chip.value || index}`}
          onClick={() => onRemoveFilter(chip.key, chip.value)}
          className="inline-flex items-center gap-1 px-3 py-1.5 bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 text-sm rounded-full hover:bg-teal-100 dark:hover:bg-teal-900/50 transition-colors group"
        >
          <span>{chip.label}</span>
          <X className="w-3.5 h-3.5 group-hover:text-teal-900 dark:group-hover:text-teal-200" />
        </button>
      ))}

      {chips.length > 1 && (
        <button
          onClick={onClearAll}
          className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 underline ml-2"
        >
          Clear all
        </button>
      )}
    </div>
  );
}
