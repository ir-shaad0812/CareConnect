// ============================================
// BROWSE CAREGIVERS PAGE
// Premium flip card grid/list view
// ============================================

"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import CaregiverFlipCard, { type CaregiverFlipCardData } from "@/components/features/search/CaregiverFlipCard";
import ViewToggle from "@/components/ui/ViewToggle";
import { searchService, chatService, CaregiverPreview } from "@/services";
import { authService } from "@/modules/auth/services";
import { useSocket } from "@/context/SocketContext";
import caregiversPreviewData from "@/data/caregivers.preview.json";
import {
  Search,
  SlidersHorizontal,
  MapPin,
  Star,
  DollarSign,
  ChevronDown,
  X,
  Loader2,
  Users,
  Sparkles,
  ArrowUpDown,
  MousePointer,
  Hand,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SERVICE_TYPE_LABELS } from "@/lib/constants";

// ============================================
// TYPES
// ============================================

interface Filters {
  serviceType: string;
  minPrice: number;
  maxPrice: number;
  minRating: number;
  minExperience: number;
  verified: boolean;
  backgroundCheck: boolean;
  location: string;
}

type SortOption = "relevance" | "rating" | "price_low" | "price_high" | "experience" | "distance";

const GUEST_PREVIEW_DATA = caregiversPreviewData as CaregiverFlipCardData[];

// ============================================
// COMPONENT
// ============================================

export default function BrowseCaregiversPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { socket } = useSocket();

  // State
  const [caregivers, setCaregivers] = useState<CaregiverFlipCardData[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [flipTrigger, setFlipTrigger] = useState<"hover" | "click">("hover");
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("relevance");
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);

  // Filters state
  const [filters, setFilters] = useState<Filters>({
    serviceType: searchParams.get("serviceType") || "",
    minPrice: 0,
    maxPrice: 200,
    minRating: 0,
    minExperience: 0,
    verified: false,
    backgroundCheck: false,
    location: searchParams.get("location") || "",
  });

  // Service type options
  const serviceTypes = Object.entries(SERVICE_TYPE_LABELS);

  // Sort options
  const sortOptions: { value: SortOption; label: string; icon: React.ReactNode }[] = [
    { value: "relevance", label: "Relevance", icon: <Sparkles className="w-4 h-4" /> },
    { value: "rating", label: "Highest Rated", icon: <Star className="w-4 h-4" /> },
    { value: "price_low", label: "Price: Low to High", icon: <DollarSign className="w-4 h-4" /> },
    { value: "price_high", label: "Price: High to Low", icon: <DollarSign className="w-4 h-4" /> },
    { value: "experience", label: "Most Experienced", icon: <Users className="w-4 h-4" /> },
    { value: "distance", label: "Nearest", icon: <MapPin className="w-4 h-4" /> },
  ];

  // Fetch caregivers
  const fetchCaregivers = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      const guestData = getDemoData(filters, searchQuery, sortBy);
      setCaregivers(guestData);
      setTotalPages(1);
      setTotalResults(guestData.length);
      setIsLoading(false);
      return;
    }

    try {
      const response = await searchService.searchCaregivers({
        query: searchQuery,
        ...(filters.serviceType ? { serviceType: filters.serviceType } : {}),
        ...(filters.minPrice > 0 ? { minPrice: filters.minPrice } : {}),
        ...(filters.maxPrice < 200 ? { maxPrice: filters.maxPrice } : {}),
        ...(filters.minRating > 0 ? { minRating: filters.minRating } : {}),
        ...(filters.minExperience > 0 ? { minExperience: filters.minExperience } : {}),
        ...(filters.verified ? { verified: true } : {}),
        ...(filters.backgroundCheck ? { backgroundCheck: true } : {}),
        ...(filters.location ? { location: filters.location } : {}),
        sortBy,
      });

      if (response.success && response.data) {
        // Transform CaregiverPreview to CaregiverFlipCardData format
        const transformedData: CaregiverFlipCardData[] = response.data.caregivers.map((cg: CaregiverPreview) => ({
          _id: cg._id,
          user: {
            _id: cg.user._id,
            fullName: cg.user.fullName,
            ...(cg.user.avatar !== undefined ? { avatar: cg.user.avatar } : {}),
            ...(cg.user.gender !== undefined ? { gender: cg.user.gender } : {}),
            ...(cg.user.location
              ? {
                  location: {
                    ...(cg.user.location.city !== undefined ? { city: cg.user.location.city } : {}),
                    ...(cg.user.location.state !== undefined ? { state: cg.user.location.state } : {}),
                    ...(cg.user.location.country !== undefined ? { country: cg.user.location.country } : {}),
                  },
                }
              : {}),
          },
          userId: {
            _id: cg.userId,
            fullName: cg.user.fullName,
            ...(cg.user.avatar !== undefined ? { avatar: cg.user.avatar } : {}),
          },
          serviceTypes: cg.serviceTypes,
          skills: cg.skills,
          ...(cg.hourlyRate !== undefined ? { hourlyRate: cg.hourlyRate } : {}),
          experience: cg.experience,
          rating: cg.rating,
          totalReviews: cg.totalReviews,
          ...(cg.bio !== undefined ? { bio: cg.bio } : {}),
          ...(cg.availability !== undefined ? { availability: cg.availability } : {}),
          verified: cg.verified,
          ...(cg.backgroundCheck !== undefined ? { backgroundCheck: cg.backgroundCheck } : {}),
          languages: cg.languages,
          certifications: cg.certifications,
          ...(cg.distance !== undefined ? { distance: cg.distance } : {}),
          featured: cg.featured,
          completedJobs: cg.completedJobs,
          ...(cg.responseTime !== undefined ? { responseTime: cg.responseTime } : {}),
          ...(cg.completionPercentage !== undefined ? { completionPercentage: cg.completionPercentage } : {}),
        }));
        setCaregivers(transformedData);
        setTotalPages(response.data.pagination?.totalPages || 1);
        setTotalResults(response.data.pagination?.totalCount || 0);
      } else {
        const fallbackData = getDemoData(filters, searchQuery, sortBy);
        setCaregivers(fallbackData);
        setTotalPages(1);
        setTotalResults(fallbackData.length);
      }
    } catch (err) {
      console.error("Error fetching caregivers:", err);
      const fallbackData = getDemoData(filters, searchQuery, sortBy);
      setCaregivers(fallbackData);
      setTotalPages(1);
      setTotalResults(fallbackData.length);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, filters, sortBy]);

  useEffect(() => {
    fetchCaregivers();
  }, [fetchCaregivers]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchCaregivers();
    }, 45000);

    return () => clearInterval(interval);
  }, [fetchCaregivers]);

  useEffect(() => {
    if (!socket) return;

    const handleReviewUpdate = () => {
      fetchCaregivers();
    };

    socket.on("review:changed", handleReviewUpdate);
    socket.on("review:new", handleReviewUpdate);

    return () => {
      socket.off("review:changed", handleReviewUpdate);
      socket.off("review:new", handleReviewUpdate);
    };
  }, [socket, fetchCaregivers]);

  // Handle favorite toggle
  const handleFavorite = useCallback((id: string) => {
    setFavorites((prev) => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(id)) {
        newFavorites.delete(id);
      } else {
        newFavorites.add(id);
      }
      return newFavorites;
    });
  }, []);

  // Handle message
  const handleMessage = useCallback(async (caregiverId: string) => {
    const user = authService.getCurrentUser();
    if (!user) {
      router.push("/login?redirect=/browse");
      return;
    }

    try {
      const response = await chatService.startDirectConversation(caregiverId);
      if (response.success && response.data) {
        router.push(`/messages?conversation=${response.data.conversation._id}`);
      }
    } catch (err) {
      console.error("Error starting conversation:", err);
    }
  }, [router]);

  // Filter handlers
  const handleFilterChange = useCallback((key: keyof Filters, value: string | number | boolean) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({
      serviceType: "",
      minPrice: 0,
      maxPrice: 200,
      minRating: 0,
      minExperience: 0,
      verified: false,
      backgroundCheck: false,
      location: "",
    });
    setPage(1);
  }, []);

  // Active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.serviceType) count++;
    if (filters.minPrice > 0) count++;
    if (filters.maxPrice < 200) count++;
    if (filters.minRating > 0) count++;
    if (filters.minExperience > 0) count++;
    if (filters.verified) count++;
    if (filters.backgroundCheck) count++;
    if (filters.location) count++;
    return count;
  }, [filters]);

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      {/* Hero Section */}
      <div className="bg-linear-to-br from-[#39B54A] via-primary-600 to-[#1e6b2a] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold mb-3">
              Find Your Perfect Caregiver
            </h1>
            <p className="text-white/80 text-lg max-w-2xl mx-auto">
              Browse our network of verified, experienced caregivers ready to provide compassionate care
            </p>
          </div>

          {/* Search Bar */}
          <div className="max-w-3xl mx-auto">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, service type, or specialization..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-4 rounded-xl text-gray-900 placeholder-gray-500 bg-white shadow-xl focus:outline-none focus:ring-4 focus:ring-white/30"
              />
              <button
                onClick={() => fetchCaregivers()}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-6 py-2 bg-[#39B54A] text-white rounded-lg hover:bg-primary-600 transition-colors"
              >
                Search
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Toolbar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-4">
            {/* Results count */}
            <div className="text-gray-600">
              <span className="font-semibold text-gray-900">{totalResults}</span> caregivers found
            </div>

            {/* Filter button */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors",
                showFilters || activeFiltersCount > 0
                  ? "border-[#39B54A] text-[#39B54A] bg-[#39B54A]/5"
                  : "border-gray-200 text-gray-600 hover:border-gray-300"
              )}
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filters
              {activeFiltersCount > 0 && (
                <span className="ml-1 px-2 py-0.5 text-xs bg-[#39B54A] text-white rounded-full">
                  {activeFiltersCount}
                </span>
              )}
            </button>

            {activeFiltersCount > 0 && (
              <button
                onClick={clearFilters}
                className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
              >
                <X className="w-4 h-4" />
                Clear all
              </button>
            )}
          </div>

          <div className="flex items-center gap-4">
            {/* Flip trigger toggle */}
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>Flip on:</span>
              <button
                onClick={() => setFlipTrigger("hover")}
                className={cn(
                  "flex items-center gap-1 px-3 py-1.5 rounded-lg transition-colors",
                  flipTrigger === "hover"
                    ? "bg-[#39B54A] text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                )}
              >
                <MousePointer className="w-3.5 h-3.5" />
                Hover
              </button>
              <button
                onClick={() => setFlipTrigger("click")}
                className={cn(
                  "flex items-center gap-1 px-3 py-1.5 rounded-lg transition-colors",
                  flipTrigger === "click"
                    ? "bg-[#39B54A] text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                )}
              >
                <Hand className="w-3.5 h-3.5" />
                Click
              </button>
            </div>

            {/* Sort dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowSortDropdown(!showSortDropdown)}
                className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-gray-600 hover:border-gray-300 transition-colors"
              >
                <ArrowUpDown className="w-4 h-4" />
                <span className="text-sm">
                  {sortOptions.find((opt) => opt.value === sortBy)?.label}
                </span>
                <ChevronDown className={cn("w-4 h-4 transition-transform", showSortDropdown && "rotate-180")} />
              </button>

              <AnimatePresence>
                {showSortDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-20"
                  >
                    {sortOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => {
                          setSortBy(option.value);
                          setShowSortDropdown(false);
                        }}
                        className={cn(
                          "w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors",
                          sortBy === option.value
                            ? "bg-[#39B54A]/10 text-[#39B54A]"
                            : "text-gray-600 hover:bg-gray-50"
                        )}
                      >
                        {option.icon}
                        {option.label}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* View toggle */}
            <ViewToggle view={view} onViewChange={setView} />
          </div>
        </div>

        {/* Filters Panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mb-8"
            >
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {/* Service Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Service Type
                    </label>
                    <select
                      value={filters.serviceType}
                      onChange={(e) => handleFilterChange("serviceType", e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#39B54A]/20 focus:border-[#39B54A]"
                    >
                      <option value="">All Services</option>
                      {serviceTypes.map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Price Range */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Hourly Rate: Rs. {filters.minPrice?.toLocaleString("en-NP")} - Rs. {filters.maxPrice?.toLocaleString("en-NP")}
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min="0"
                        max="200"
                        value={filters.maxPrice}
                        onChange={(e) => handleFilterChange("maxPrice", parseInt(e.target.value))}
                        className="flex-1 accent-[#39B54A]"
                      />
                    </div>
                  </div>

                  {/* Minimum Rating */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Minimum Rating
                    </label>
                    <select
                      value={filters.minRating}
                      onChange={(e) => handleFilterChange("minRating", parseFloat(e.target.value))}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#39B54A]/20 focus:border-[#39B54A]"
                    >
                      <option value={0}>Any Rating</option>
                      <option value={4}>4+ Stars</option>
                      <option value={4.5}>4.5+ Stars</option>
                      <option value={4.8}>4.8+ Stars (Top Rated)</option>
                    </select>
                  </div>

                  {/* Experience */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Minimum Experience
                    </label>
                    <select
                      value={filters.minExperience}
                      onChange={(e) => handleFilterChange("minExperience", parseInt(e.target.value))}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#39B54A]/20 focus:border-[#39B54A]"
                    >
                      <option value={0}>Any Experience</option>
                      <option value={1}>1+ Years</option>
                      <option value={3}>3+ Years</option>
                      <option value={5}>5+ Years</option>
                      <option value={10}>10+ Years</option>
                    </select>
                  </div>

                  {/* Location */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Location
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="City or ZIP code"
                        value={filters.location}
                        onChange={(e) => handleFilterChange("location", e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#39B54A]/20 focus:border-[#39B54A]"
                      />
                    </div>
                  </div>

                  {/* Checkboxes */}
                  <div className="lg:col-span-3 flex flex-wrap gap-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filters.verified}
                        onChange={(e) => handleFilterChange("verified", e.target.checked)}
                        className="w-5 h-5 rounded border-gray-300 text-[#39B54A] focus:ring-[#39B54A]"
                      />
                      <span className="text-sm text-gray-700">Verified Only</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filters.backgroundCheck}
                        onChange={(e) => handleFilterChange("backgroundCheck", e.target.checked)}
                        className="w-5 h-5 rounded border-gray-300 text-[#39B54A] focus:ring-[#39B54A]"
                      />
                      <span className="text-sm text-gray-700">Background Checked</span>
                    </label>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-12 h-12 text-[#39B54A] animate-spin mb-4" />
            <p className="text-gray-500">Loading caregivers...</p>
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className="text-center py-20">
            <div className="text-red-500 mb-4">
              <X className="w-12 h-12 mx-auto" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to load caregivers</h3>
            <p className="text-gray-500 mb-4">{error}</p>
            <button
              onClick={fetchCaregivers}
              className="px-6 py-2 bg-[#39B54A] text-white rounded-lg hover:bg-primary-600 transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Caregivers Grid/List */}
        {!isLoading && !error && (
          <>
            {caregivers.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-xl">
                <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No caregivers found</h3>
                <p className="text-gray-500 mb-6">Try adjusting your filters or search criteria</p>
                <button
                  onClick={clearFilters}
                  className="px-6 py-2 bg-[#39B54A] text-white rounded-lg hover:bg-primary-600 transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              <motion.div
                className={cn(
                  view === "grid"
                    ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 justify-items-center"
                    : "flex flex-col gap-4"
                )}
                layout
              >
                <AnimatePresence mode="popLayout">
                  {caregivers.map((caregiver, index) => (
                    <motion.div
                      key={caregiver._id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ delay: index * 0.05 }}
                      layout
                      className={view === "list" ? "w-full" : ""}
                    >
                      <CaregiverFlipCard
                        caregiver={caregiver}
                        variant={view}
                        flipTrigger={flipTrigger}
                        onFavorite={handleFavorite}
                        onMessage={handleMessage}
                        isFavorite={favorites.has(caregiver._id)}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-12">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>

                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (page <= 3) {
                    pageNum = i + 1;
                  } else if (page >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = page - 2 + i;
                  }

                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={cn(
                        "w-10 h-10 rounded-lg font-medium transition-colors",
                        page === pageNum
                          ? "bg-[#39B54A] text-white"
                          : "text-gray-600 hover:bg-gray-100"
                      )}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Click outside to close sort dropdown */}
      {showSortDropdown && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => setShowSortDropdown(false)}
        />
      )}
    </div>
  );
}

// ============================================
// DEMO DATA
// ============================================

function getDemoData(filters: Filters, query: string, sortBy: SortOption): CaregiverFlipCardData[] {
  const normalizedQuery = query.trim().toLowerCase();

  const filteredData = GUEST_PREVIEW_DATA.filter((caregiver) => {
    const fullName = caregiver.userId?.fullName || caregiver.user?.fullName || "";
    const city = caregiver.location?.city || caregiver.user?.location?.city || "";
    const state = caregiver.location?.state || caregiver.user?.location?.state || "";
    const searchableText = [
      fullName,
      caregiver.bio || "",
      city,
      state,
      ...(caregiver.serviceTypes || []),
      ...(caregiver.skills || caregiver.specializations || []),
    ]
      .join(" ")
      .toLowerCase();

    if (normalizedQuery && !searchableText.includes(normalizedQuery)) {
      return false;
    }

    if (filters.serviceType && !(caregiver.serviceTypes || []).includes(filters.serviceType)) {
      return false;
    }

    const hourlyRate = caregiver.hourlyRate || 0;
    if (hourlyRate < filters.minPrice || hourlyRate > filters.maxPrice) {
      return false;
    }

    if ((caregiver.rating || 0) < filters.minRating) {
      return false;
    }

    if ((caregiver.experience || 0) < filters.minExperience) {
      return false;
    }

    if (filters.verified && caregiver.verified !== true) {
      return false;
    }

    const isBackgroundChecked = caregiver.backgroundChecked === true || caregiver.backgroundCheck?.status === "approved";
    if (filters.backgroundCheck && !isBackgroundChecked) {
      return false;
    }

    if (filters.location) {
      const locationText = `${city} ${state}`.trim().toLowerCase();
      if (!locationText.includes(filters.location.toLowerCase())) {
        return false;
      }
    }

    return true;
  });

  return [...filteredData].sort((a, b) => {
    switch (sortBy) {
      case "rating":
        return (b.rating || 0) - (a.rating || 0);
      case "price_low":
        return (a.hourlyRate || 0) - (b.hourlyRate || 0);
      case "price_high":
        return (b.hourlyRate || 0) - (a.hourlyRate || 0);
      case "experience":
        return (b.experience || 0) - (a.experience || 0);
      case "distance":
        return (a.distance || Number.POSITIVE_INFINITY) - (b.distance || Number.POSITIVE_INFINITY);
      case "relevance":
      default:
        return (b.rating || 0) - (a.rating || 0);
    }
  });
}
