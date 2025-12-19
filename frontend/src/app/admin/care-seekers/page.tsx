// ============================================
// ADMIN CARE SEEKERS MANAGEMENT PAGE
// Comprehensive care seeker tracking and management
// ============================================

"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import AdminLayout from "@/components/layout/AdminLayout";
import { adminService } from "@/services";

interface CareSeekerProfile {
  _id: string;
  userId: string;
  careNeeds?: string[];
  familyMembers?: Array<{
    name: string;
    age: number;
    relationship: string;
    careNeeds: string[];
  }>;
  budget?: {
    min: number;
    max: number;
    frequency: string;
  };
  preferredSchedule?: string[];
  location?: {
    city?: string;
    state?: string;
    address?: string;
  };
}

interface CareSeeker {
  _id: string;
  fullName: string;
  email: string;
  phone?: string;
  avatar?: string;
  status: string;
  location?: {
    city?: string;
    state?: string;
  };
  careNeeds?: string[];
  totalBookings?: number;
  activeBookings?: number;
  createdAt: string;
  lastLogin?: string;
  isEmailVerified?: boolean;
  profile?: CareSeekerProfile | null;
}

const CARE_NEEDS_LABELS: Record<string, string> = {
  elderly_care: "Elderly Care",
  child_care: "Child Care",
  special_needs: "Special Needs",
  disability_care: "Disability Care",
  post_surgery: "Post Surgery",
  companionship: "Companionship",
  respite_care: "Respite Care",
  palliative_care: "Palliative Care",
};

function CareSeekersContent() {
  const searchParams = useSearchParams();

  const [careSeekers, setCareSeekers] = useState<CareSeeker[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  });
  const [stats, setStats] = useState({
    totalCareSeekers: 0,
    activeCareSeekers: 0,
    newThisMonth: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<CareSeeker | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Filters
  const [filters, setFilters] = useState({
    search: searchParams.get("search") || "",
    status: searchParams.get("status") || "",
    sortBy: searchParams.get("sortBy") || "createdAt",
  });

  const fetchCareSeekers = useCallback(async (page = 1) => {
    try {
      setIsLoading(true);
      
      const params = {
        page,
        limit: 12,
        ...(filters.search && { search: filters.search }),
        ...(filters.status && { status: filters.status }),
        ...(filters.sortBy && { sortBy: filters.sortBy }),
      };

      const result = await adminService.getCareSeekers(params);
      const careSeekersList = result.careSeekers || [];
      const paginationData = result.pagination || { page: 1, limit: 12, total: 0, pages: 0 };
      
      setCareSeekers(careSeekersList as unknown as CareSeeker[]);
      setPagination(paginationData);
      setStats({
        totalCareSeekers: paginationData.total || 0,
        activeCareSeekers: careSeekersList.filter(u => u.status === "active").length,
        newThisMonth: 0,
      });
    } catch (err) {
      console.error("Error fetching care seekers:", err);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchCareSeekers();
  }, [fetchCareSeekers]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCareSeekers(1);
  };

  const handleStatusChange = async (userId: string, newStatus: string) => {
    try {
      setActionLoading(true);

      await adminService.updateUserStatus(userId, newStatus);

      fetchCareSeekers(pagination.page);
      setShowModal(false);
    } catch (err) {
      console.error("Error updating status:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: "bg-green-100 text-green-700",
      pending: "bg-yellow-100 text-yellow-700",
      suspended: "bg-red-100 text-red-700",
    };
    return styles[status] || "bg-gray-100 text-gray-600";
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Care Seekers</h1>
            <p className="text-gray-500">Manage families and individuals seeking care</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl shadow-sm p-6 border border-[#E1E6EF] hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-linear-to-br from-orange-400 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-200">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <p className="text-3xl font-bold text-gray-900">{stats.totalCareSeekers || pagination.total}</p>
                <p className="text-sm text-gray-500">Total Care Seekers</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-6 border border-[#E1E6EF] hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-linear-to-br from-green-400 to-green-600 rounded-2xl flex items-center justify-center shadow-lg shadow-green-200">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-3xl font-bold text-gray-900">{stats.activeCareSeekers}</p>
                <p className="text-sm text-gray-500">Active</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-6 border border-[#E1E6EF] hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-linear-to-br from-blue-400 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <div>
                <p className="text-3xl font-bold text-gray-900">{stats.newThisMonth}</p>
                <p className="text-sm text-gray-500">New This Month</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-[#E1E6EF]">
          <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <svg
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
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
                  className="w-full pl-12 pr-4 py-3 border border-[#E1E6EF] rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all"
                />
              </div>
            </div>

            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="px-4 py-3 border border-[#E1E6EF] rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none bg-white transition-all"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="suspended">Suspended</option>
            </select>

            <select
              value={filters.sortBy}
              onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}
              className="px-4 py-3 border border-[#E1E6EF] rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none bg-white transition-all"
            >
              <option value="createdAt">Newest First</option>
              <option value="lastLogin">Last Active</option>
              <option value="fullName">Name A-Z</option>
            </select>

            <button
              type="submit"
              className="px-8 py-3 bg-linear-to-r from-orange-500 to-orange-600 text-white rounded-xl hover:from-orange-600 hover:to-orange-700 transition-all font-medium shadow-lg shadow-orange-200"
            >
              Search
            </button>
          </form>
        </div>

        {/* Care Seekers Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-200 border-t-orange-500"></div>
          </div>
        ) : careSeekers.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-16 text-center border border-[#E1E6EF]">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <p className="text-gray-500 text-lg">No care seekers found</p>
            <p className="text-gray-400 text-sm mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {careSeekers.map((user) => (
              <div
                key={user._id}
                className="bg-white rounded-2xl shadow-sm overflow-hidden border border-[#E1E6EF] hover:shadow-lg hover:border-orange-200 transition-all duration-300 group"
              >
                {/* Card Header */}
                <div className="p-5 pb-4">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 bg-linear-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-orange-200 group-hover:scale-105 transition-transform">
                      {user.avatar ? (
                        <img src={user.avatar} alt={user.fullName} className="w-14 h-14 rounded-xl object-cover" />
                      ) : (
                        user.fullName?.charAt(0)?.toUpperCase() || "U"
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">{user.fullName}</h3>
                      <p className="text-sm text-gray-500 truncate">{user.email}</p>
                    </div>
                  </div>
                </div>

                {/* Card Body */}
                <div className="px-5 pb-4 space-y-3">
                  {/* Status */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Status</span>
                    <span className={`px-3 py-1 text-xs font-medium rounded-full capitalize ${getStatusBadge(user.status)}`}>
                      {user.status}
                    </span>
                  </div>

                  {/* Location */}
                  {user.location?.city && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Location</span>
                      <span className="text-sm text-gray-900">
                        {user.location.city}{user.location.state ? `, ${user.location.state}` : ""}
                      </span>
                    </div>
                  )}

                  {/* Joined Date */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Joined</span>
                    <span className="text-sm text-gray-900">{formatDate(user.createdAt)}</span>
                  </div>

                  {/* Email Verified */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Email</span>
                    <span className={`flex items-center gap-1 text-sm ${user.isEmailVerified ? "text-green-600" : "text-yellow-600"}`}>
                      {user.isEmailVerified ? (
                        <>
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          Verified
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                          Pending
                        </>
                      )}
                    </span>
                  </div>

                  {/* Care Needs */}
                  {user.careNeeds && user.careNeeds.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-2">
                      {user.careNeeds.slice(0, 2).map((need) => (
                        <span key={need} className="px-2 py-1 bg-orange-50 text-orange-600 text-xs rounded-full">
                          {CARE_NEEDS_LABELS[need] || need}
                        </span>
                      ))}
                      {user.careNeeds.length > 2 && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                          +{user.careNeeds.length - 2}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Card Actions */}
                <div className="px-5 pb-5 pt-2 border-t border-[#E1E6EF]">
                  <button
                    onClick={() => {
                      setSelectedUser(user);
                      setShowModal(true);
                    }}
                    className="w-full py-2.5 border border-[#E1E6EF] text-gray-700 rounded-xl hover:bg-[#F0F5FF] font-medium text-sm transition-all"
                  >
                    Manage User
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="bg-white rounded-2xl shadow-sm px-6 py-4 flex items-center justify-between border border-[#E1E6EF]">
            <p className="text-sm text-gray-500">
              Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => fetchCareSeekers(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="px-5 py-2.5 border border-[#E1E6EF] rounded-xl hover:bg-[#F0F5FF] disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-all"
              >
                Previous
              </button>
              <button
                onClick={() => fetchCareSeekers(pagination.page + 1)}
                disabled={pagination.page === pagination.pages}
                className="px-5 py-2.5 border border-[#E1E6EF] rounded-xl hover:bg-[#F0F5FF] disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-all"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* User Details Modal */}
      {showModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="p-6 border-b border-[#E1E6EF] flex items-center justify-between sticky top-0 bg-white rounded-t-3xl">
              <h2 className="text-xl font-bold text-gray-900">User Details</h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  setSelectedUser(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-xl transition-all"
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
                <div className="w-20 h-20 bg-linear-to-br from-orange-400 to-orange-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-orange-200">
                  {selectedUser.avatar ? (
                    <img src={selectedUser.avatar} alt={selectedUser.fullName} className="w-20 h-20 rounded-2xl object-cover" />
                  ) : (
                    selectedUser.fullName?.charAt(0)?.toUpperCase() || "U"
                  )}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{selectedUser.fullName}</h3>
                  <p className="text-gray-500">{selectedUser.email}</p>
                  {selectedUser.phone && <p className="text-gray-500">{selectedUser.phone}</p>}
                </div>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-[#F0F5FF] rounded-xl">
                  <p className="text-sm text-gray-500 mb-1">Status</p>
                  <span className={`px-3 py-1 text-sm font-medium rounded-full capitalize ${getStatusBadge(selectedUser.status)}`}>
                    {selectedUser.status}
                  </span>
                </div>
                <div className="p-4 bg-[#F0F5FF] rounded-xl">
                  <p className="text-sm text-gray-500 mb-1">Joined</p>
                  <p className="font-semibold">{formatDate(selectedUser.createdAt)}</p>
                </div>
                <div className="p-4 bg-[#F0F5FF] rounded-xl">
                  <p className="text-sm text-gray-500 mb-1">Location</p>
                  <p className="font-semibold">
                    {selectedUser.location?.city || "Not set"}
                    {selectedUser.location?.state && `, ${selectedUser.location.state}`}
                  </p>
                </div>
                <div className="p-4 bg-[#F0F5FF] rounded-xl">
                  <p className="text-sm text-gray-500 mb-1">Email Status</p>
                  <p className={`font-semibold ${selectedUser.isEmailVerified ? "text-green-600" : "text-yellow-600"}`}>
                    {selectedUser.isEmailVerified ? "Verified" : "Not Verified"}
                  </p>
                </div>
              </div>

              {/* Status Change Actions */}
              <div className="pt-4 border-t border-gray-200">
                <h4 className="font-semibold text-gray-900 mb-4">Change Status</h4>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleStatusChange(selectedUser._id, "active")}
                    disabled={actionLoading || selectedUser.status === "active"}
                    className="px-4 py-2.5 bg-green-100 text-green-700 rounded-xl hover:bg-green-200 font-medium text-sm disabled:opacity-50 transition-all"
                  >
                    {actionLoading ? "..." : "Set Active"}
                  </button>
                  <button
                    onClick={() => handleStatusChange(selectedUser._id, "pending")}
                    disabled={actionLoading || selectedUser.status === "pending"}
                    className="px-4 py-2.5 bg-yellow-100 text-yellow-700 rounded-xl hover:bg-yellow-200 font-medium text-sm disabled:opacity-50 transition-all"
                  >
                    {actionLoading ? "..." : "Set Pending"}
                  </button>
                  <button
                    onClick={() => handleStatusChange(selectedUser._id, "suspended")}
                    disabled={actionLoading || selectedUser.status === "suspended"}
                    className="px-4 py-2.5 bg-red-100 text-red-700 rounded-xl hover:bg-red-200 font-medium text-sm disabled:opacity-50 transition-all"
                  >
                    {actionLoading ? "..." : "Suspend"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

export default function AdminCareSeekersPage() {
  return (
    <Suspense fallback={
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-200 border-t-orange-500"></div>
        </div>
      </AdminLayout>
    }>
      <CareSeekersContent />
    </Suspense>
  );
}
