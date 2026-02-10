// ============================================
// SEARCH RESULTS - Results grid with pagination
// ============================================

"use client";

import { Grid, List, SortAsc, Loader2 } from "lucide-react";
import CaregiverCard from "./CaregiverCard";
import { SORT_OPTIONS } from "@/lib/constants";

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

interface SearchResultsProps {
  caregivers: CaregiverData[];
  isLoading?: boolean;
  error?: string | null;
  totalCount?: number;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  sortBy: string;
  onSortChange: (sort: string) => void;
  viewMode: "grid" | "list";
  onViewModeChange: (mode: "grid" | "list") => void;
  onFavorite?: (id: string) => void;
  favoriteIds?: string[];
}

// SORT_OPTIONS imported from @/lib/constants

export default function SearchResults({
  caregivers,
  isLoading = false,
  error = null,
  totalCount,
  currentPage,
  totalPages,
  onPageChange,
  sortBy,
  onSortChange,
  viewMode,
  onViewModeChange,
  onFavorite,
  favoriteIds = [],
}: SearchResultsProps) {
  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className="w-12 h-12 text-teal-600 animate-spin mb-4" />
        <p className="text-gray-500 dark:text-gray-400">Searching caregivers...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
          <span className="text-red-500 text-2xl">!</span>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Something went wrong
        </h3>
        <p className="text-gray-500 dark:text-gray-400 text-center max-w-md">
          {error}
        </p>
      </div>
    );
  }

  // Empty state
  if (!caregivers || caregivers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
          <span className="text-4xl">🔍</span>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          No caregivers found
        </h3>
        <p className="text-gray-500 dark:text-gray-400 text-center max-w-md">
          Try adjusting your filters or search in a different area to find more
          caregivers.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Results header */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Showing{" "}
          <span className="font-semibold text-gray-900 dark:text-white">
            {caregivers.length}
          </span>
          {totalCount && totalCount > caregivers.length && (
            <>
              {" "}
              of{" "}
              <span className="font-semibold text-gray-900 dark:text-white">
                {totalCount}
              </span>
            </>
          )}{" "}
          caregivers
        </div>

        <div className="flex items-center gap-3">
          {/* Sort dropdown */}
          <div className="flex items-center gap-2">
            <SortAsc className="w-4 h-4 text-gray-400 hidden sm:block" />
            <select
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value)}
              className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* View toggle */}
          <div className="flex items-center border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden">
            <button
              onClick={() => onViewModeChange("grid")}
              className={`p-2 ${
                viewMode === "grid"
                  ? "bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400"
                  : "bg-white dark:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              }`}
              title="Grid view"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => onViewModeChange("list")}
              className={`p-2 ${
                viewMode === "list"
                  ? "bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400"
                  : "bg-white dark:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              }`}
              title="List view"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Results grid/list */}
      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {caregivers.map((caregiver) => (
            <CaregiverCard
              key={caregiver._id}
              caregiver={caregiver}
              variant="grid"
              {...(onFavorite ? { onFavorite } : {})}
              isFavorite={favoriteIds.includes(caregiver._id)}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {caregivers.map((caregiver) => (
            <CaregiverCard
              key={caregiver._id}
              caregiver={caregiver}
              variant="list"
              {...(onFavorite ? { onFavorite } : {})}
              isFavorite={favoriteIds.includes(caregiver._id)}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-6">
          {/* Previous button */}
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-4 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Previous
          </button>

          {/* Page numbers */}
          <div className="flex items-center gap-1">
            {generatePageNumbers(currentPage, totalPages).map((page, index) =>
              page === "..." ? (
                <span
                  key={`ellipsis-${index}`}
                  className="px-2 py-2 text-gray-400"
                >
                  ...
                </span>
              ) : (
                <button
                  key={page}
                  onClick={() => onPageChange(page as number)}
                  className={`w-10 h-10 text-sm rounded-lg transition-colors ${
                    currentPage === page
                      ? "bg-teal-600 text-white"
                      : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                  }`}
                >
                  {page}
                </button>
              )
            )}
          </div>

          {/* Next button */}
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-4 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

// Helper function to generate page numbers with ellipsis
function generatePageNumbers(
  currentPage: number,
  totalPages: number
): (number | "...")[] {
  const pages: (number | "...")[] = [];
  const maxVisiblePages = 5;

  if (totalPages <= maxVisiblePages) {
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }
  } else {
    // Always show first page
    pages.push(1);

    if (currentPage > 3) {
      pages.push("...");
    }

    // Show pages around current page
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (currentPage < totalPages - 2) {
      pages.push("...");
    }

    // Always show last page
    pages.push(totalPages);
  }

  return pages;
}
