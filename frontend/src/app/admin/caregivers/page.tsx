// ============================================
// ADMIN CAREGIVERS MANAGEMENT PAGE
// Comprehensive caregiver tracking and management
// ============================================

"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import AdminLayout from "@/components/layout/AdminLayout";
import { caregiverService } from "@/services";

interface Caregiver {
  _id: string;
  fullName: string;
  email: string;
  phone?: string;
  avatar?: string;
  status: string;
  experience?: number;
  hourlyRate?: number;
  rating?: number;
  totalReviews?: number;
  profileViews?: number;
  completionPercentage?: number;
  serviceTypes?: string[];
  workPreferences?: string[];
  serviceRadius?: number;
  featured?: boolean;
  isRecommended?: boolean;
  backgroundCheck?: {
    status: string;
    provider?: string;
    completedAt?: string;
    expiryDate?: string;
  };
  earnings?: {
    total: number;
    pending: number;
    withdrawn: number;
  };
  location?: {
    city?: string;
    state?: string;
  };
  createdAt: string;
  lastLogin?: string;
  isEmailVerified?: boolean;
}

const SERVICE_TYPE_LABELS: Record<string, string> = {
  elderly_care: "Elderly Care",
  child_care: "Child Care",
  special_needs: "Special Needs",
  disability_care: "Disability Care",
  post_surgery: "Post Surgery",
  companionship: "Companionship",
  respite_care: "Respite Care",
  palliative_care: "Palliative Care",
};

const BACKGROUND_CHECK_COLORS: Record<string, { bg: string; text: string }> = {
  pending: { bg: "bg-yellow-100", text: "text-yellow-700" },
  in_progress: { bg: "bg-blue-100", text: "text-blue-700" },
  completed: { bg: "bg-green-100", text: "text-green-700" },
  failed: { bg: "bg-red-100", text: "text-red-700" },
  expired: { bg: "bg-orange-100", text: "text-orange-700" },
  not_started: { bg: "bg-gray-100", text: "text-gray-600" },
};

function CaregiversContent() {
  const searchParams = useSearchParams();

  const [caregivers, setCaregivers] = useState<Caregiver[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  });
  const [stats] = useState({
    totalCaregivers: 0,
    activeCaregivers: 0,
    pendingBackgroundChecks: 0,
    featuredCaregivers: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCaregiver, setSelectedCaregiver] = useState<Caregiver | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "pending" | "featured">("all");

  // Filters
  const [filters, setFilters] = useState({
    search: searchParams.get("search") || "",
    backgroundCheck: searchParams.get("backgroundCheck") || "",
    featured: searchParams.get("featured") || "",
    sortBy: searchParams.get("sortBy") || "createdAt",
  });

  const fetchCaregivers = useCallback(async (page = 1) => {
    try {
      setIsLoading(true);
      
      const adminFilters = {
        page,
        limit: 10,
        ...(filters.search && { location: filters.search }),
        ...(filters.backgroundCheck && { backgroundCheck: filters.backgroundCheck }),
        ...(filters.featured && { featured: filters.featured === "true" }),
        ...(filters.sortBy && { sortBy: filters.sortBy }),
        ...(activeTab === "pending" && { backgroundCheck: "pending" }),
        ...(activeTab === "featured" && { featured: true }),
      };

      const response = await caregiverService.getCaregiversAdmin(adminFilters);

      if (!response.success) throw new Error("Failed to fetch caregivers");

      const data = response.data;
      setCaregivers(data?.caregivers?.map(c => c as unknown as Caregiver) || []);
      setPagination(data?.pagination || { page: 1, limit: 10, total: 0, pages: 0 });
    } catch (err) {
      console.error("Error fetching caregivers:", err);
    } finally {
      setIsLoading(false);
    }
  }, [filters, activeTab]);

  useEffect(() => {
    fetchCaregivers();
  }, [fetchCaregivers]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCaregivers(1);
  };

  const handleBackgroundCheckUpdate = async (caregiverId: string, status: string) => {
    try {
      setActionLoading(true);
      setActionError("");

      await caregiverService.updateBackgroundCheck(caregiverId, { status });

      fetchCaregivers(pagination.page);
      setShowModal(false);
    } catch (err) {
      const apiErr = err as { message?: string };
      const msg = apiErr?.message || "Failed to update background check. The caregiver may not have a profile yet.";
      console.error("Error updating background check:", err);
      setActionError(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleFeatured = async (caregiverId: string) => {
    try {
      setActionLoading(true);

      await caregiverService.toggleFeatured(caregiverId);

      fetchCaregivers(pagination.page);
    } catch (err) {
      console.error("Error toggling featured:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleRecommended = async (caregiverId: string) => {
    try {
      setActionLoading(true);
      await caregiverService.toggleRecommended(caregiverId);
      fetchCaregivers(pagination.page);
    } catch (err) {
      console.error("Error toggling recommended:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteCaregiver = async (caregiverId: string) => {
    const confirmed = window.confirm(
      "Delete this caregiver account permanently? This will remove the caregiver profile, linked caregiver details, and cannot be undone."
    );

    if (!confirmed) return;

    try {
      setActionLoading(true);
      setActionError("");

      await caregiverService.deleteCaregiver(caregiverId);

      if (selectedCaregiver?._id === caregiverId) {
        setShowModal(false);
        setSelectedCaregiver(null);
      }

      await fetchCaregivers(pagination.page);
    } catch (err) {
      const apiErr = err as { message?: string };
      const msg = apiErr?.message || "Failed to delete caregiver account.";
      console.error("Error deleting caregiver:", err);
      setActionError(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const getBackgroundCheckBadge = (status?: string) => {
    const colors = BACKGROUND_CHECK_COLORS[status || "not_started"] || BACKGROUND_CHECK_COLORS.not_started;
    return `${colors.bg} ${colors.text}`;
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Caregiver Management</h1>
            <p className="text-gray-500">Track and manage all platform caregivers</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm p-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[#39B54A]/10 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-[#39B54A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.totalCaregivers}</p>
                <p className="text-sm text-gray-500">Total Caregivers</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.activeCaregivers}</p>
                <p className="text-sm text-gray-500">Active Caregivers</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.pendingBackgroundChecks}</p>
                <p className="text-sm text-gray-500">Pending Checks</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.featuredCaregivers}</p>
                <p className="text-sm text-gray-500">Featured</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm p-2 inline-flex gap-1">
          <button
            onClick={() => setActiveTab("all")}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              activeTab === "all" ? "bg-[#39B54A] text-white" : "text-gray-600 hover:bg-[#39B54A]/5"
            }`}
          >
            All Caregivers
          </button>
          <button
            onClick={() => setActiveTab("pending")}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              activeTab === "pending" ? "bg-[#39B54A] text-white" : "text-gray-600 hover:bg-[#39B54A]/5"
            }`}
          >
            Pending Checks
          </button>
          <button
            onClick={() => setActiveTab("featured")}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              activeTab === "featured" ? "bg-[#39B54A] text-white" : "text-gray-600 hover:bg-[#39B54A]/5"
            }`}
          >
            Featured
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <svg
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search by name, email, or location..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 border border-[#E1E6EF] rounded-xl focus:ring-2 focus:ring-[#39B54A]/20 focus:border-[#39B54A] outline-none"
                />
              </div>
            </div>

            <select
              value={filters.backgroundCheck}
              onChange={(e) => setFilters({ ...filters, backgroundCheck: e.target.value })}
              className="px-4 py-2.5 border border-[#E1E6EF] rounded-xl focus:ring-2 focus:ring-[#39B54A]/20 focus:border-[#39B54A] outline-none"
            >
              <option value="">All Check Status</option>
              <option value="not_started">Not Started</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="expired">Expired</option>
            </select>

            <select
              value={filters.sortBy}
              onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}
              className="px-4 py-2.5 border border-[#E1E6EF] rounded-xl focus:ring-2 focus:ring-[#39B54A]/20 focus:border-[#39B54A] outline-none"
            >
              <option value="createdAt">Newest First</option>
              <option value="rating">Highest Rated</option>
              <option value="profileViews">Most Viewed</option>
              <option value="completionPercentage">Profile Completion</option>
            </select>

            <button
              type="submit"
              className="px-6 py-2.5 bg-[#39B54A] text-white rounded-xl hover:bg-[#2d913c] transition font-medium shadow-sm shadow-[#39B54A]/20"
            >
              Search
            </button>
          </form>
        </div>

        {/* Caregivers Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#39B54A]"></div>
          </div>
        ) : caregivers.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <p className="text-gray-500 text-lg">No caregivers found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {caregivers.map((caregiver) => (
              <div key={caregiver._id} className="bg-white rounded-2xl shadow-sm overflow-hidden hover:shadow-md transition">
                {/* Header */}
                <div className="p-5 border-b border-gray-100">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 bg-linear-to-br from-[#39B54A] to-[#2d913c] rounded-xl flex items-center justify-center text-white text-xl font-bold">
                        {caregiver.avatar ? (
                          <img src={caregiver.avatar} alt={caregiver.fullName} className="w-14 h-14 rounded-xl object-cover" />
                        ) : (
                          caregiver.fullName?.charAt(0)?.toUpperCase() || "C"
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-gray-900">{caregiver.fullName}</h3>
                          {caregiver.featured && (
                            <svg className="w-4 h-4 text-yellow-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          )}
                          {caregiver.isRecommended && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-linear-to-r from-amber-400 to-orange-400 text-white text-[10px] font-bold shadow-sm">
                              <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                              </svg>
                              Rec
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">{caregiver.email}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className="px-5 py-4 grid grid-cols-3 gap-4 bg-[#39B54A]/5">
                  <div className="text-center">
                    <p className="text-lg font-bold text-[#39B54A]">{caregiver.rating?.toFixed(1) || "N/A"}</p>
                    <p className="text-xs text-gray-500">Rating</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-[#39B54A]">{caregiver.profileViews || 0}</p>
                    <p className="text-xs text-gray-500">Views</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-[#39B54A]">{caregiver.completionPercentage || 0}%</p>
                    <p className="text-xs text-gray-500">Complete</p>
                  </div>
                </div>

                {/* Details */}
                <div className="p-5 space-y-3">
                  {/* Background Check */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Background Check</span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full capitalize ${getBackgroundCheckBadge(caregiver.backgroundCheck?.status)}`}>
                      {(caregiver.backgroundCheck?.status || "not_started").replace("_", " ")}
                    </span>
                  </div>

                  {/* Rate & Experience */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Rate / Experience</span>
                    <span className="text-sm font-medium text-gray-900">
                      Rs. {(caregiver.hourlyRate || 0).toLocaleString("en-NP")}/hr • {caregiver.experience || 0}yrs
                    </span>
                  </div>

                  {/* Location */}
                  {caregiver.location?.city && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Location</span>
                      <span className="text-sm text-gray-900">
                        {caregiver.location.city}{caregiver.location.state ? `, ${caregiver.location.state}` : ""}
                      </span>
                    </div>
                  )}

                  {/* Service Types */}
                  {caregiver.serviceTypes && caregiver.serviceTypes.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-2">
                      {caregiver.serviceTypes.slice(0, 3).map((type) => (
                        <span key={type} className="px-2 py-1 bg-[#39B54A]/10 text-[#2d913c] text-xs rounded-full font-medium">
                          {SERVICE_TYPE_LABELS[type] || type}
                        </span>
                      ))}
                      {caregiver.serviceTypes.length > 3 && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                          +{caregiver.serviceTypes.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="px-5 pb-5 flex gap-2">
                  <button
                    onClick={() => {
                      setSelectedCaregiver(caregiver);
                      setShowModal(true);
                    }}
                    className="flex-1 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 font-medium text-sm transition"
                  >
                    View Details
                  </button>
                  <button
                    onClick={() => handleToggleFeatured(caregiver._id)}
                    disabled={actionLoading}
                    className={`px-3 py-2.5 rounded-xl font-medium text-sm transition ${
                      caregiver.featured
                        ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                    title={caregiver.featured ? "Remove from Featured" : "Add to Featured"}
                  >
                    <svg className="w-5 h-5" fill={caregiver.featured ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleToggleRecommended(caregiver._id)}
                    disabled={actionLoading}
                    className={`px-3 py-2.5 rounded-xl font-medium text-sm transition ${
                      caregiver.isRecommended
                        ? "bg-linear-to-r from-amber-100 to-orange-100 text-orange-700 hover:from-amber-200 hover:to-orange-200"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                    title={caregiver.isRecommended ? "Remove Recommendation" : "Mark as Recommended"}
                  >
                    <svg className="w-5 h-5" fill={caregiver.isRecommended ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="bg-white rounded-xl shadow-sm px-6 py-4 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => fetchCaregivers(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="px-4 py-2 border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                Previous
              </button>
              <button
                onClick={() => fetchCaregivers(pagination.page + 1)}
                disabled={pagination.page === pagination.pages}
                className="px-4 py-2 border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Caregiver Details Modal */}
      {showModal && selectedCaregiver && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white">
              <h2 className="text-xl font-bold text-gray-900">Caregiver Details</h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  setSelectedCaregiver(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Profile Header */}
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 bg-linear-to-br from-[#39B54A] to-[#2d913c] rounded-2xl flex items-center justify-center text-white text-2xl font-bold">
                  {selectedCaregiver.avatar ? (
                    <img src={selectedCaregiver.avatar} alt={selectedCaregiver.fullName} className="w-20 h-20 rounded-2xl object-cover" />
                  ) : (
                    selectedCaregiver.fullName?.charAt(0)?.toUpperCase() || "C"
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-xl font-bold text-gray-900">{selectedCaregiver.fullName}</h3>
                    {selectedCaregiver.featured && (
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full">Featured</span>
                    )}
                    {selectedCaregiver.isRecommended && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-linear-to-r from-amber-400 to-orange-400 text-white text-xs font-bold shadow-sm">
                        <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                        </svg>
                        Recommended
                      </span>
                    )}
                  </div>
                  <p className="text-gray-500">{selectedCaregiver.email}</p>
                  {selectedCaregiver.phone && <p className="text-gray-500">{selectedCaregiver.phone}</p>}
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-4 gap-4">
                <div className="text-center p-4 bg-[#39B54A]/5 rounded-xl">
                  <p className="text-2xl font-bold text-[#39B54A]">{selectedCaregiver.rating?.toFixed(1) || "N/A"}</p>
                  <p className="text-sm text-gray-500">Rating</p>
                </div>
                <div className="text-center p-4 bg-[#39B54A]/5 rounded-xl">
                  <p className="text-2xl font-bold text-[#39B54A]">{selectedCaregiver.totalReviews || 0}</p>
                  <p className="text-sm text-gray-500">Reviews</p>
                </div>
                <div className="text-center p-4 bg-[#39B54A]/5 rounded-xl">
                  <p className="text-2xl font-bold text-[#39B54A]">{selectedCaregiver.profileViews || 0}</p>
                  <p className="text-sm text-gray-500">Views</p>
                </div>
                <div className="text-center p-4 bg-[#39B54A]/5 rounded-xl">
                  <p className="text-2xl font-bold text-[#39B54A]">{selectedCaregiver.completionPercentage || 0}%</p>
                  <p className="text-sm text-gray-500">Complete</p>
                </div>
              </div>

              {/* Details */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-[#39B54A]/5 rounded-xl">
                  <p className="text-sm text-gray-500 mb-1">Hourly Rate</p>
                  <p className="font-semibold">Rs. {(selectedCaregiver.hourlyRate || 0).toLocaleString("en-NP")}/hr</p>
                </div>
                <div className="p-4 bg-[#39B54A]/5 rounded-xl">
                  <p className="text-sm text-gray-500 mb-1">Experience</p>
                  <p className="font-semibold">{selectedCaregiver.experience || 0} years</p>
                </div>
                <div className="p-4 bg-[#39B54A]/5 rounded-xl">
                  <p className="text-sm text-gray-500 mb-1">Service Radius</p>
                  <p className="font-semibold">{selectedCaregiver.serviceRadius || 25} km</p>
                </div>
                <div className="p-4 bg-[#39B54A]/5 rounded-xl">
                  <p className="text-sm text-gray-500 mb-1">Location</p>
                  <p className="font-semibold">
                    {selectedCaregiver.location?.city || "Not set"}
                    {selectedCaregiver.location?.state && `, ${selectedCaregiver.location.state}`}
                  </p>
                </div>
              </div>

              {/* Earnings */}
              {selectedCaregiver.earnings && (
                <div className="p-4 bg-green-50 rounded-xl">
                  <h4 className="font-semibold text-gray-900 mb-3">Earnings</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Total</p>
                      <p className="text-lg font-bold text-green-600">Rs. {(selectedCaregiver.earnings.total || 0).toLocaleString("en-NP")}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Pending</p>
                      <p className="text-lg font-bold text-yellow-600">Rs. {(selectedCaregiver.earnings.pending || 0).toLocaleString("en-NP")}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Withdrawn</p>
                      <p className="text-lg font-bold text-gray-600">Rs. {(selectedCaregiver.earnings.withdrawn || 0).toLocaleString("en-NP")}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Service Types */}
              {selectedCaregiver.serviceTypes && selectedCaregiver.serviceTypes.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Service Types</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedCaregiver.serviceTypes.map((type) => (
                      <span key={type} className="px-3 py-1.5 bg-[#39B54A]/10 text-[#2d913c] rounded-full text-sm font-medium">
                        {SERVICE_TYPE_LABELS[type] || type}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Background Check Section */}
              <div className="p-4 border-2 border-gray-200 rounded-xl">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold text-gray-900">Background Check</h4>
                  <span className={`px-3 py-1 text-sm font-medium rounded-full capitalize ${getBackgroundCheckBadge(selectedCaregiver.backgroundCheck?.status)}`}>
                    {(selectedCaregiver.backgroundCheck?.status || "not_started").replace("_", " ")}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-500">Provider</p>
                    <p className="font-medium">{selectedCaregiver.backgroundCheck?.provider || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Completed At</p>
                    <p className="font-medium">
                      {selectedCaregiver.backgroundCheck?.completedAt
                        ? new Date(selectedCaregiver.backgroundCheck.completedAt).toLocaleDateString()
                        : "N/A"}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleBackgroundCheckUpdate(selectedCaregiver._id, "pending")}
                    disabled={actionLoading}
                    className="px-4 py-2 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 font-medium text-sm"
                  >
                    Set Pending
                  </button>
                  <button
                    onClick={() => handleBackgroundCheckUpdate(selectedCaregiver._id, "in_progress")}
                    disabled={actionLoading}
                    className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 font-medium text-sm"
                  >
                    In Progress
                  </button>
                  <button
                    onClick={() => handleBackgroundCheckUpdate(selectedCaregiver._id, "completed")}
                    disabled={actionLoading}
                    className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 font-medium text-sm"
                  >
                    Mark Completed
                  </button>
                  <button
                    onClick={() => handleBackgroundCheckUpdate(selectedCaregiver._id, "failed")}
                    disabled={actionLoading}
                    className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 font-medium text-sm"
                  >
                    Mark Failed
                  </button>
                </div>
              </div>

              {/* Action error */}
              {actionError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                  {actionError}
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => handleDeleteCaregiver(selectedCaregiver._id)}
                  disabled={actionLoading}
                  className="px-4 py-3 bg-red-100 text-red-700 rounded-xl hover:bg-red-200 font-medium transition disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {actionLoading ? "Processing..." : "Delete"}
                </button>
                <button
                  onClick={() => handleToggleFeatured(selectedCaregiver._id)}
                  disabled={actionLoading}
                  className={`flex-1 py-3 rounded-xl font-medium transition ${
                    selectedCaregiver.featured
                      ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      : "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
                  }`}
                >
                  {selectedCaregiver.featured ? "Unfeature" : "Feature"}
                </button>
                <button
                  onClick={() => handleToggleRecommended(selectedCaregiver._id)}
                  disabled={actionLoading}
                  className={`flex-1 py-3 rounded-xl font-medium transition ${
                    selectedCaregiver.isRecommended
                      ? "bg-orange-100 text-orange-700 hover:bg-orange-200"
                      : "bg-linear-to-r from-amber-100 to-orange-100 text-orange-700 hover:from-amber-200 hover:to-orange-200"
                  }`}
                >
                  {selectedCaregiver.isRecommended ? "Remove Badge" : "★ Recommend"}
                </button>
                <a
                  href={`/caregiver/${selectedCaregiver._id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-3 bg-[#39B54A] text-white rounded-xl hover:bg-[#2d913c] font-medium text-center transition shadow-sm shadow-[#39B54A]/20"
                >
                  View Profile
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

export default function AdminCaregiversPage() {
  return (
    <Suspense fallback={
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#39B54A]"></div>
        </div>
      </AdminLayout>
    }>
      <CaregiversContent />
    </Suspense>
  );
}
