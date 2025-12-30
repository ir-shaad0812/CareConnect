// ============================================
// ADMIN CARE REQUESTS PAGE
// Manage care requests from families
// ============================================

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { jobService } from "@/services";
import type { CareRequest } from "@/services";

const priorityConfig: Record<string, { bg: string; text: string; dot: string }> = {
  low: { bg: "bg-gray-100", text: "text-gray-700", dot: "bg-gray-400" },
  normal: { bg: "bg-blue-100", text: "text-blue-700", dot: "bg-blue-400" },
  high: { bg: "bg-orange-100", text: "text-orange-700", dot: "bg-orange-400" },
  urgent: { bg: "bg-red-100", text: "text-red-700", dot: "bg-red-400" },
};

const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: "bg-yellow-100", text: "text-yellow-700", label: "Pending" },
  reviewing: { bg: "bg-blue-100", text: "text-blue-700", label: "Under Review" },
  approved: { bg: "bg-green-100", text: "text-green-700", label: "Approved" },
  converted: { bg: "bg-purple-100", text: "text-purple-700", label: "Converted to Job" },
  rejected: { bg: "bg-red-100", text: "text-red-700", label: "Rejected" },
  fulfilled: { bg: "bg-emerald-100", text: "text-emerald-700", label: "Fulfilled" },
  cancelled: { bg: "bg-gray-100", text: "text-gray-700", label: "Cancelled" },
};

const categoryLabels: Record<string, string> = {
  elderly_care: "Elderly Care",
  child_care: "Child Care",
  special_needs: "Special Needs",
  medical_care: "Medical Care",
  companion_care: "Companion Care",
  respite_care: "Respite Care",
  palliative_care: "Palliative Care",
  post_operative_care: "Post-Operative",
  disability_support: "Disability Support",
  dementia_care: "Dementia Care",
};

export default function AdminCareRequestsPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<CareRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRequest, setSelectedRequest] = useState<CareRequest | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const response = await jobService.getCareRequests({ limit: 100 });
      setRequests(response.data || []);
    } catch (error) {
      console.error("Error fetching care requests:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (requestId: string, newStatus: string) => {
    try {
      setUpdatingStatus(true);
      if (newStatus === "approved") {
        await jobService.approveCareRequest(requestId);
      } else if (newStatus === "rejected") {
        await jobService.rejectCareRequest(requestId, "Status changed by admin");
      }
      setRequests((prev) =>
        prev.map((req) =>
          req._id === requestId ? { ...req, status: newStatus } : req
        )
      );
      if (selectedRequest?._id === requestId) {
        setSelectedRequest({ ...selectedRequest, status: newStatus });
      }
    } catch (error) {
      console.error("Error updating status:", error);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-NP", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-NP", {
      style: "currency",
      currency: "NPR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const filteredRequests = requests.filter((req) => {
    const matchesFilter = filter === "all" || req.status === filter;
    const matchesSearch =
      searchQuery === "" ||
      req.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.requestedBy?.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.location?.city?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const statusCounts = requests.reduce((acc, req) => {
    acc[req.status] = (acc[req.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push("/admin/jobs")}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Care Requests</h1>
                <p className="text-gray-500">Manage care requests from families</p>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6">
            <div className="bg-linear-to-br from-yellow-50 to-yellow-100/50 rounded-xl p-4 border border-yellow-200">
              <p className="text-2xl font-bold text-yellow-700">{statusCounts.pending || 0}</p>
              <p className="text-sm text-yellow-600">Pending</p>
            </div>
            <div className="bg-linear-to-br from-blue-50 to-blue-100/50 rounded-xl p-4 border border-blue-200">
              <p className="text-2xl font-bold text-blue-700">{statusCounts.reviewing || 0}</p>
              <p className="text-sm text-blue-600">Reviewing</p>
            </div>
            <div className="bg-linear-to-br from-green-50 to-green-100/50 rounded-xl p-4 border border-green-200">
              <p className="text-2xl font-bold text-green-700">{statusCounts.approved || 0}</p>
              <p className="text-sm text-green-600">Approved</p>
            </div>
            <div className="bg-linear-to-br from-purple-50 to-purple-100/50 rounded-xl p-4 border border-purple-200">
              <p className="text-2xl font-bold text-purple-700">{statusCounts.converted || 0}</p>
              <p className="text-sm text-purple-600">Converted</p>
            </div>
            <div className="bg-linear-to-br from-red-50 to-red-100/50 rounded-xl p-4 border border-red-200">
              <p className="text-2xl font-bold text-red-700">{(statusCounts.urgent || 0) + (requests.filter(r => r.urgencyLevel === "urgent").length)}</p>
              <p className="text-sm text-red-600">Urgent</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Search & Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <svg
              className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
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
            <input
              type="text"
              placeholder="Search requests..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#39B54A]/20 focus:border-[#39B54A]"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2">
            <button
              onClick={() => setFilter("all")}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                filter === "all"
                  ? "bg-[#39B54A] text-white"
                  : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
              }`}
            >
              All ({requests.length})
            </button>
            {Object.entries(statusConfig).map(([status, config]) => {
              const count = statusCounts[status] || 0;
              if (count === 0 && status !== "pending") return null;
              return (
                <button
                  key={status}
                  onClick={() => setFilter(status)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                    filter === status
                      ? "bg-[#39B54A] text-white"
                      : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  {config.label} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="w-12 h-12 border-4 border-gray-200 border-t-[#39B54A] rounded-full animate-spin"></div>
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredRequests.length === 0 && (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
            <svg className="w-20 h-20 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No care requests found</h3>
            <p className="text-gray-500">
              {filter !== "all" ? "Try changing your filters" : "No requests have been submitted yet"}
            </p>
          </div>
        )}

        {/* Requests Grid */}
        {!loading && filteredRequests.length > 0 && (
          <div className="grid gap-4">
            {filteredRequests.map((request, index) => {
              const priority = priorityConfig[request.priority] || priorityConfig.normal;
              const status = statusConfig[request.status] || statusConfig.pending;

              return (
                <motion.div
                  key={request._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-lg transition-shadow"
                >
                  <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                    {/* Main Content */}
                    <div className="flex-1">
                      <div className="flex items-start gap-4">
                        {/* Priority Indicator */}
                        <div className={`w-12 h-12 rounded-xl ${priority.bg} flex items-center justify-center shrink-0`}>
                          <div className={`w-3 h-3 rounded-full ${priority.dot}`}></div>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-lg font-semibold text-gray-900 truncate">
                              {request.title || `${categoryLabels[request.careType] || "Care"} Request`}
                            </h3>
                            {request.urgencyLevel === "urgent" && (
                              <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full animate-pulse">
                                URGENT
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 mb-3">
                            <span className="flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                              {request.requestedBy?.fullName || "Unknown"}
                            </span>
                            <span className="flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              </svg>
                              {request.location?.city}, {request.location?.state}
                            </span>
                            <span className="flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              {formatDate(request.createdAt)}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${status.bg} ${status.text}`}>
                              {status.label}
                            </span>
                            <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                              {categoryLabels[request.careType] || request.careType}
                            </span>
                            {request.budget && (
                              <span className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs font-medium">
                                {formatCurrency(request.budget.min)} - {formatCurrency(request.budget.max)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Description Preview */}
                      {request.description && (
                        <p className="text-gray-600 text-sm mt-4 line-clamp-2 pl-16">
                          {request.description}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 pl-16 lg:pl-0">
                      <button
                        onClick={() => {
                          setSelectedRequest(request);
                          setShowDetailModal(true);
                        }}
                        className="px-4 py-2 text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                      >
                        View Details
                      </button>
                      {request.status === "approved" && (
                        <button
                          onClick={() => router.push(`/admin/jobs/care-requests/${request._id}/convert`)}
                          className="px-4 py-2 bg-[#39B54A] text-white rounded-lg hover:bg-[#2d913c] transition-colors text-sm"
                        >
                          Convert to Job
                        </button>
                      )}
                      {request.status === "pending" && (
                        <button
                          onClick={() => handleStatusChange(request._id, "reviewing")}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                        >
                          Start Review
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {showDetailModal && selectedRequest && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowDetailModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              {/* Modal Header */}
              <div className="sticky top-0 bg-white border-b border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900">Care Request Details</h2>
                  <button
                    onClick={() => setShowDetailModal(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Status & Priority */}
                <div className="flex gap-2">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusConfig[selectedRequest.status]?.bg} ${statusConfig[selectedRequest.status]?.text}`}>
                    {statusConfig[selectedRequest.status]?.label}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${priorityConfig[selectedRequest.urgencyLevel]?.bg || priorityConfig.normal.bg} ${priorityConfig[selectedRequest.urgencyLevel]?.text || priorityConfig.normal.text}`}>
                    {selectedRequest.urgencyLevel?.charAt(0).toUpperCase()}{selectedRequest.urgencyLevel?.slice(1)} Priority
                  </span>
                </div>

                {/* Basic Info */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Request Information</h3>
                  <div className="space-y-2 text-sm">
                    <p><span className="text-gray-500">Title:</span> <span className="text-gray-900">{selectedRequest.title || "N/A"}</span></p>
                    <p><span className="text-gray-500">Care Type:</span> <span className="text-gray-900">{categoryLabels[selectedRequest.careType]}</span></p>
                    <p><span className="text-gray-500">Location:</span> <span className="text-gray-900">{selectedRequest.location?.city}, {selectedRequest.location?.state}</span></p>
                    {selectedRequest.location?.address && (
                      <p><span className="text-gray-500">Address:</span> <span className="text-gray-900">{selectedRequest.location.address}</span></p>
                    )}
                    {selectedRequest.budget && (
                      <p><span className="text-gray-500">Budget:</span> <span className="text-gray-900">{formatCurrency(selectedRequest.budget.min)} - {formatCurrency(selectedRequest.budget.max)} / {selectedRequest.budget.period}</span></p>
                    )}
                  </div>
                </div>

                {/* Requester Info */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Requester</h3>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                      <span className="text-lg font-semibold text-gray-600">
                        {selectedRequest.requestedBy?.fullName?.[0]}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {selectedRequest.requestedBy?.fullName}
                      </p>
                      <p className="text-sm text-gray-500">{selectedRequest.requestedBy?.email}</p>
                    </div>
                  </div>
                </div>

                {/* Description */}
                {selectedRequest.description && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">Description</h3>
                    <p className="text-gray-600 text-sm whitespace-pre-wrap">{selectedRequest.description}</p>
                  </div>
                )}

                {/* Care Recipient */}
                {selectedRequest.careRecipient && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">Care Recipient</h3>
                    <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
                      <p><span className="text-gray-500">Age:</span> <span className="text-gray-900">{selectedRequest.careRecipient.age} years</span></p>
                      <p><span className="text-gray-500">Gender:</span> <span className="text-gray-900">{selectedRequest.careRecipient.gender}</span></p>
                      {Array.isArray(selectedRequest.careRecipient.medicalConditions) && selectedRequest.careRecipient.medicalConditions.length > 0 && (
                        <div>
                          <span className="text-gray-500">Medical Conditions:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {selectedRequest.careRecipient.medicalConditions.map((condition: string, i: number) => (
                              <span key={i} className="px-2 py-0.5 bg-red-50 text-red-700 rounded-full text-xs">
                                {condition}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {selectedRequest.careRecipient.mobilityLevel && (
                        <p><span className="text-gray-500">Mobility:</span> <span className="text-gray-900">{selectedRequest.careRecipient.mobilityLevel}</span></p>
                      )}
                    </div>
                  </div>
                )}

                {/* Schedule */}
                {selectedRequest.schedule && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">Preferred Schedule</h3>
                    <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
                      {selectedRequest.preferredStartDate && (
                        <p><span className="text-gray-500">Start Date:</span> <span className="text-gray-900">{formatDate(selectedRequest.preferredStartDate)}</span></p>
                      )}
                      {selectedRequest.duration && (
                        <p><span className="text-gray-500">Duration:</span> <span className="text-gray-900">{selectedRequest.duration}</span></p>
                      )}
                      {selectedRequest.schedule?.preferredDays && selectedRequest.schedule.preferredDays.length > 0 && (
                        <p><span className="text-gray-500">Preferred Days:</span> <span className="text-gray-900">{selectedRequest.schedule.preferredDays.join(", ")}</span></p>
                      )}
                    </div>
                  </div>
                )}

                {/* Requirements */}
                {selectedRequest.preferences && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">Preferences</h3>
                    <div className="space-y-2 text-sm">
                      {selectedRequest.preferences.minExperience != null && (
                        <p><span className="text-gray-500">Min Experience:</span> <span className="text-gray-900">{selectedRequest.preferences.minExperience} years</span></p>
                      )}
                      {selectedRequest.preferences.preferredGender && (
                        <p><span className="text-gray-500">Preferred Gender:</span> <span className="text-gray-900">{selectedRequest.preferences.preferredGender}</span></p>
                      )}
                      {selectedRequest.preferences.requiredCertifications && selectedRequest.preferences.requiredCertifications.length > 0 && (
                        <div>
                          <span className="text-gray-500">Required Certifications:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {selectedRequest.preferences.requiredCertifications.map((cert: string, i: number) => (
                              <span key={i} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs">
                                {cert}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4 border-t border-gray-200">
                  {selectedRequest.status === "pending" && (
                    <>
                      <button
                        onClick={() => handleStatusChange(selectedRequest._id, "reviewing")}
                        disabled={updatingStatus}
                        className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50"
                      >
                        Start Review
                      </button>
                      <button
                        onClick={() => handleStatusChange(selectedRequest._id, "rejected")}
                        disabled={updatingStatus}
                        className="px-4 py-3 text-red-600 border border-red-200 rounded-xl hover:bg-red-50"
                      >
                        Reject
                      </button>
                    </>
                  )}
                  {selectedRequest.status === "reviewing" && (
                    <>
                      <button
                        onClick={() => handleStatusChange(selectedRequest._id, "approved")}
                        disabled={updatingStatus}
                        className="flex-1 px-4 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleStatusChange(selectedRequest._id, "rejected")}
                        disabled={updatingStatus}
                        className="px-4 py-3 text-red-600 border border-red-200 rounded-xl hover:bg-red-50"
                      >
                        Reject
                      </button>
                    </>
                  )}
                  {selectedRequest.status === "approved" && (
                    <button
                      onClick={() => {
                        setShowDetailModal(false);
                        router.push(`/admin/jobs/care-requests/${selectedRequest._id}/convert`);
                      }}
                      className="flex-1 px-4 py-3 bg-[#39B54A] text-white rounded-xl hover:bg-[#2d913c]"
                    >
                      Convert to Job Posting
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
