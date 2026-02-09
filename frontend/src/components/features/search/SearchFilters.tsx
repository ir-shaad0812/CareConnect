// ============================================
// SEARCH FILTERS - Advanced filter sidebar
// ============================================

"use client";

import React, { useState } from "react";
import {
  X,
  ChevronDown,
  ChevronUp,
  MapPin,
  Star,
  Banknote,
  Clock,
  Shield,
  Award,
  Calendar,
} from "lucide-react";
import type { SearchFilters as SearchFiltersType } from "@/services/api/search.service";
import { SERVICE_TYPE_OPTIONS, SPECIALIZATION_OPTIONS, LANGUAGE_OPTIONS } from "@/lib/constants";

interface FilterSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  expanded: boolean;
}

interface SearchFiltersProps {
  filters: SearchFiltersType;
  onFilterChange: (filters: SearchFiltersType) => void;
  onClearFilters: () => void;
  filterOptions?: {
    serviceTypes: string[];
    specializations: string[];
    certifications: string[];
    languages: string[];
    locations: string[];
  };
  isOpen?: boolean;
  onClose?: () => void;
}

// SERVICE_TYPE_OPTIONS, SPECIALIZATION_OPTIONS, LANGUAGE_OPTIONS imported from @/lib/constants

export default function SearchFilters({
  filters,
  onFilterChange,
  onClearFilters,
  filterOptions,
  isOpen = true,
  onClose,
}: SearchFiltersProps) {
  const [sections, setSections] = useState<FilterSection[]>([
    { id: "serviceType", title: "Service Type", icon: <Shield className="w-4 h-4" />, expanded: true },
    { id: "location", title: "Location", icon: <MapPin className="w-4 h-4" />, expanded: true },
    { id: "rating", title: "Rating", icon: <Star className="w-4 h-4" />, expanded: true },
    { id: "price", title: "Price Range", icon: <Banknote className="w-4 h-4" />, expanded: true },
    { id: "experience", title: "Experience", icon: <Award className="w-4 h-4" />, expanded: false },
    { id: "availability", title: "Availability", icon: <Calendar className="w-4 h-4" />, expanded: false },
    { id: "specialization", title: "Specialization", icon: <Clock className="w-4 h-4" />, expanded: false },
    { id: "language", title: "Languages", icon: <Award className="w-4 h-4" />, expanded: false },
  ]);

  const toggleSection = (sectionId: string) => {
    setSections((prev) =>
      prev.map((s) =>
        s.id === sectionId ? { ...s, expanded: !s.expanded } : s
      )
    );
  };

  const updateFilter = (key: keyof SearchFiltersType, value: unknown) => {
    onFilterChange({ ...filters, [key]: value });
  };

  const activeFiltersCount = Object.entries(filters).filter(([, value]) => {
    if (value === undefined || value === null) return false;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === "object") return Object.keys(value).length > 0;
    if (typeof value === "string") return value.trim() !== "";
    return true;
  }).length;

  const specializations = filterOptions?.specializations || [...SPECIALIZATION_OPTIONS];
  const languages = filterOptions?.languages || [...LANGUAGE_OPTIONS];

  return (
    <div
      className={`bg-white dark:bg-gray-800 h-full flex flex-col ${
        isOpen ? "block" : "hidden lg:block"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-gray-900 dark:text-white">Filters</h2>
          {activeFiltersCount > 0 && (
            <span className="px-2 py-0.5 text-xs bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 rounded-full">
              {activeFiltersCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {activeFiltersCount > 0 && (
            <button
              onClick={onClearFilters}
              className="text-sm text-teal-600 hover:text-teal-700 dark:text-teal-400"
            >
              Clear all
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="lg:hidden p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Filter sections */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Service Type */}
        <FilterSectionWrapper
          section={sections.find((s) => s.id === "serviceType")!}
          onToggle={() => toggleSection("serviceType")}
        >
          <div className="space-y-2">
            {SERVICE_TYPE_OPTIONS.map((type) => (
              <label key={type.value} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.serviceTypes?.includes(type.value) || false}
                  onChange={(e) => {
                    const current = filters.serviceTypes || [];
                    updateFilter(
                      "serviceTypes",
                      e.target.checked
                        ? [...current, type.value]
                        : current.filter((t) => t !== type.value)
                    );
                  }}
                  className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">{type.label}</span>
              </label>
            ))}
          </div>
        </FilterSectionWrapper>

        {/* Location */}
        <FilterSectionWrapper
          section={sections.find((s) => s.id === "location")!}
          onToggle={() => toggleSection("location")}
        >
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Enter city or zip code"
              value={filters.location || ""}
              onChange={(e) => updateFilter("location", e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">Within</span>
              <select
                value={filters.radius || 25}
                onChange={(e) => updateFilter("radius", Number(e.target.value))}
                className="flex-1 px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value={5}>5 miles</option>
                <option value={10}>10 miles</option>
                <option value={25}>25 miles</option>
                <option value={50}>50 miles</option>
                <option value={100}>100 miles</option>
              </select>
            </div>
          </div>
        </FilterSectionWrapper>

        {/* Rating */}
        <FilterSectionWrapper
          section={sections.find((s) => s.id === "rating")!}
          onToggle={() => toggleSection("rating")}
        >
          <div className="space-y-2">
            {[4, 3, 2, 1].map((rating) => (
              <label key={rating} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="rating"
                  checked={filters.minRating === rating}
                  onChange={() => updateFilter("minRating", rating)}
                  className="w-4 h-4 border-gray-300 text-teal-600 focus:ring-teal-500"
                />
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${
                        i < rating
                          ? "text-yellow-400 fill-yellow-400"
                          : "text-gray-300 dark:text-gray-600"
                      }`}
                    />
                  ))}
                  <span className="text-sm text-gray-700 dark:text-gray-300 ml-1">
                    & up
                  </span>
                </div>
              </label>
            ))}
          </div>
        </FilterSectionWrapper>

        {/* Price Range */}
        <FilterSectionWrapper
          section={sections.find((s) => s.id === "price")!}
          onToggle={() => toggleSection("price")}
        >
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Min</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                  <input
                    type="number"
                    min={0}
                    placeholder="0"
                    value={filters.minPrice || ""}
                    onChange={(e) => updateFilter("minPrice", Number(e.target.value) || undefined)}
                    className="w-full pl-7 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>
              <span className="mt-5 text-gray-400">-</span>
              <div className="flex-1">
                <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Max</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                  <input
                    type="number"
                    min={0}
                    placeholder="100"
                    value={filters.maxPrice || ""}
                    onChange={(e) => updateFilter("maxPrice", Number(e.target.value) || undefined)}
                    className="w-full pl-7 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Per hour</p>
          </div>
        </FilterSectionWrapper>

        {/* Experience */}
        <FilterSectionWrapper
          section={sections.find((s) => s.id === "experience")!}
          onToggle={() => toggleSection("experience")}
        >
          <div className="space-y-2">
            {[
              { value: 0, label: "Any experience" },
              { value: 1, label: "1+ years" },
              { value: 3, label: "3+ years" },
              { value: 5, label: "5+ years" },
              { value: 10, label: "10+ years" },
            ].map((exp) => (
              <label key={exp.value} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="experience"
                  checked={filters.minExperience === exp.value}
                  onChange={() => updateFilter("minExperience", exp.value)}
                  className="w-4 h-4 border-gray-300 text-teal-600 focus:ring-teal-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">{exp.label}</span>
              </label>
            ))}
          </div>
        </FilterSectionWrapper>

        {/* Availability */}
        <FilterSectionWrapper
          section={sections.find((s) => s.id === "availability")!}
          onToggle={() => toggleSection("availability")}
        >
          <div className="space-y-2">
            {[
              { value: "weekdays", label: "Weekdays" },
              { value: "weekends", label: "Weekends" },
              { value: "mornings", label: "Mornings" },
              { value: "afternoons", label: "Afternoons" },
              { value: "evenings", label: "Evenings" },
              { value: "overnight", label: "Overnight" },
              { value: "live-in", label: "Live-in" },
            ].map((avail) => (
              <label key={avail.value} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.availability?.includes(avail.value) || false}
                  onChange={(e) => {
                    const current = filters.availability || [];
                    updateFilter(
                      "availability",
                      e.target.checked
                        ? [...current, avail.value]
                        : current.filter((a) => a !== avail.value)
                    );
                  }}
                  className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">{avail.label}</span>
              </label>
            ))}
          </div>
        </FilterSectionWrapper>

        {/* Specialization */}
        <FilterSectionWrapper
          section={sections.find((s) => s.id === "specialization")!}
          onToggle={() => toggleSection("specialization")}
        >
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {specializations.map((spec) => (
              <label key={spec} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.specializations?.includes(spec) || false}
                  onChange={(e) => {
                    const current = filters.specializations || [];
                    updateFilter(
                      "specializations",
                      e.target.checked
                        ? [...current, spec]
                        : current.filter((s) => s !== spec)
                    );
                  }}
                  className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">{spec}</span>
              </label>
            ))}
          </div>
        </FilterSectionWrapper>

        {/* Languages */}
        <FilterSectionWrapper
          section={sections.find((s) => s.id === "language")!}
          onToggle={() => toggleSection("language")}
        >
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {languages.map((lang) => (
              <label key={lang} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.languages?.includes(lang) || false}
                  onChange={(e) => {
                    const current = filters.languages || [];
                    updateFilter(
                      "languages",
                      e.target.checked
                        ? [...current, lang]
                        : current.filter((l) => l !== lang)
                    );
                  }}
                  className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">{lang}</span>
              </label>
            ))}
          </div>
        </FilterSectionWrapper>

        {/* Additional filters */}
        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={filters.verified || false}
              onChange={(e) => updateFilter("verified", e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
            />
            <Shield className="w-4 h-4 text-teal-600" />
            <span className="text-sm text-gray-700 dark:text-gray-300">Verified Only</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer mt-2">
            <input
              type="checkbox"
              checked={filters.backgroundCheck || false}
              onChange={(e) => updateFilter("backgroundCheck", e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
            />
            <Award className="w-4 h-4 text-green-600" />
            <span className="text-sm text-gray-700 dark:text-gray-300">Background Checked</span>
          </label>
        </div>
      </div>
    </div>
  );
}

// Filter section wrapper component
interface FilterSectionWrapperProps {
  section: FilterSection;
  onToggle: () => void;
  children: React.ReactNode;
}

function FilterSectionWrapper({ section, onToggle, children }: FilterSectionWrapperProps) {
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      >
        <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
          {section.icon}
          <span className="font-medium text-sm">{section.title}</span>
        </div>
        {section.expanded ? (
          <ChevronUp className="w-4 h-4 text-gray-500" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-500" />
        )}
      </button>
      {section.expanded && <div className="p-3">{children}</div>}
    </div>
  );
}
