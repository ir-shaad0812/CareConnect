"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { AdminLayout } from "@/components";
import {
  reviewService,
  Review,
  ReviewStats,
  ReviewFilters,
  ModerationAction,
} from "@/services/api/review.service";

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bgColor: string }
> = {
  published: { label: "Published", color: "#059669", bgColor: "#D1FAE5" },
  pending_review: { label: "Pending Review", color: "#D97706", bgColor: "#FEF3C7" },
  hidden: { label: "Hidden", color: "#DC2626", bgColor: "#FEE2E2" },
  removed: { label: "Removed", color: "#6B7280", bgColor: "#F3F4F6" },
};

const MODERATION_ACTIONS: { value: ModerationAction; label: string; color: string }[] = [
  { value: "approved", label: "Approve", color: "bg-green-600 hover:bg-green-700" },
  { value: "hidden", label: "Hide", color: "bg-amber-600 hover:bg-amber-700" },
  { value: "removed", label: "Remove", color: "bg-red-600 hover:bg-red-700" },
];

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Filters & pagination
  const [filters, setFilters] = useState<ReviewFilters>({ page: 1, limit: 15 });
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [activeTab, setActiveTab] = useState<"all" | "reported" | "pending">("all");

  // Moderation modal
  const [showModerateModal, setShowModerateModal] = useState(false);
  const [moderateTarget, setModerateTarget] = useState<Review | null>(null);
  const [moderateAction, setModerateAction] = useState<ModerationAction>("approved");
  const [moderateReason, setModerateReason] = useState("");

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const activeFilters: ReviewFilters = { ...filters };
      if (activeTab === "reported") {
        activeFilters.reported = true;
      } else if (activeTab === "pending") {
        activeFilters.status = "pending_review";
      }

      const [revRes, statsRes] = await Promise.all([
        reviewService.getAllReviews(activeFilters),
        reviewService.getReviewStats(),
      ]);

      if (revRes.success && revRes.data) {
        setReviews(revRes.data.reviews);
        setTotalPages(revRes.data.pagination?.pages || 1);
        setTotalCount(revRes.data.pagination?.total || 0);
      }
      if (statsRes.success && statsRes.data) {
        setStats(statsRes.data);
      }
    } catch {
      setError("Failed to load review data.");
    } finally {
      setIsLoading(false);
    }
  }, [filters, activeTab]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!successMessage) return;
    const t = setTimeout(() => setSuccessMessage(null), 4000);
    return () => clearTimeout(t);
  }, [successMessage]);

  const handleTabChange = (tab: typeof activeTab) => {
    setActiveTab(tab);
    setFilters((f) => ({ ...f, page: 1 }));
  };

  const openModerateModal = (review: Review, action: ModerationAction) => {
    setModerateTarget(review);
    setModerateAction(action);
    setModerateReason("");
    setShowModerateModal(true);
  };

  const handleModerate = async () => {
    if (!moderateTarget) return;

    const trimmedReason = moderateReason.trim();
    if (!trimmedReason) {
      setError("Moderation reason is required.");
      return;
    }

    setActionLoading(moderateTarget._id);
    try {
      const res = await reviewService.moderateReview(moderateTarget._id, {
        action: moderateAction,
        reason: trimmedReason,
      });
      if (res.success) {
        setSuccessMessage("Review moderated successfully.");
        setShowModerateModal(false);
        setModerateTarget(null);
        setSelectedReview(null);
        fetchData();
      } else {
        setError(res.message || "Moderation failed.");
      }
    } catch {
      setError("Failed to moderate review.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemoveMedia = async (reviewId: string, mediaId: string) => {
    setActionLoading(reviewId);
    try {
      const res = await reviewService.removeReviewMediaAsAdmin(
        reviewId,
        mediaId,
        "Removed by admin moderation",
      );
      if (res.success) {
        setSuccessMessage("Review media removed successfully.");
        if (selectedReview && selectedReview._id === reviewId && res.data?.review) {
          setSelectedReview(res.data.review);
        }
        fetchData();
      } else {
        setError(res.message || "Failed to remove media.");
      }
    } catch {
      setError("Failed to remove review media.");
    } finally {
      setActionLoading(null);
    }
  };

  const getUserName = (user: string | { _id?: string; fullName?: string; email?: string }) => {
    if (typeof user === "string") return user;
    return user.fullName || user.email || user._id || "Unknown";
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  const getStatusBadge = (status: string) => {
    const config = STATUS_CONFIG[status] || { label: status, color: "#6B7280", bgColor: "#F3F4F6" };
    return (
      <span
        className="px-2.5 py-0.5 rounded-full text-xs font-medium"
        style={{ color: config.color, backgroundColor: config.bgColor }}
      >
        {config.label}
      </span>
    );
  };

  const renderStars = (rating: number) => {
    return (
      <span className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <svg
            key={i}
            className={`w-3.5 h-3.5 ${i <= rating ? "text-amber-400" : "text-gray-300"}`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
        <span className="text-xs text-gray-500 ml-1">{rating.toFixed(1)}</span>
      </span>
    );
  };

  const tabs = [
    { key: "all" as const, label: "All Reviews" },
    { key: "reported" as const, label: "Reported", badge: stats?.reportedReviews },
    { key: "pending" as const, label: "Pending" },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Review Management</h1>
            <p className="text-sm text-gray-500 mt-1">Moderate reviews and handle reports</p>
          </div>
          <button
            onClick={() => fetchData()}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-white bg-primary-500 rounded-lg hover:bg-[#2F4BDB] disabled:opacity-50 flex items-center gap-2"
          >
            <svg
              className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Refresh
          </button>
        </div>

        {/* Messages */}
        {successMessage && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm">
            {successMessage}
          </div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex justify-between items-center">
            {error}
            <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">✕</button>
          </div>
        )}

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <StatCard label="Total Reviews" value={String(stats.totalReviews || 0)} icon="⭐" />
            <StatCard label="Average Rating" value={String(stats.averageRating?.toFixed(1) || "0")} icon="📊" />
            <StatCard label="Verified" value={String(stats.verifiedReviews || 0)} icon="✅" />
            <StatCard
              label="Reported"
              value={String(stats.reportedReviews || 0)}
              icon="🚩"
              warning={!!stats.reportedReviews}
            />
            <StatCard
              label="Hidden"
              value={String(stats.hiddenReviews || 0)}
              icon="⏳"
              warning={!!stats.hiddenReviews}
            />
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
          {tabs.map(({ key, label, badge }) => (
            <button
              key={key}
              onClick={() => handleTabChange(key)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2 ${
                activeTab === key
                  ? "bg-white text-primary-500 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {label}
              {badge != null && badge > 0 && (
                <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                  {badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-[#E1E6EF] p-4 flex flex-wrap gap-3 items-center">
          <select
            value={filters.reviewType || ""}
            onChange={(e) => {
              const value = e.target.value as "verified" | "";
              setFilters((f) => {
                const rest = { ...f };
                delete rest.reviewType;
                return value ? { ...rest, page: 1, reviewType: value } : { ...rest, page: 1 };
              });
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="">All Types</option>
            <option value="verified">Verified</option>
          </select>
          <select
            value={filters.minRating || ""}
            onChange={(e) => {
              const value = e.target.value ? parseInt(e.target.value) : null;
              setFilters((f) => {
                const rest = { ...f };
                delete rest.minRating;
                return value ? { ...rest, page: 1, minRating: value } : { ...rest, page: 1 };
              });
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="">All Ratings</option>
            <option value="5">5 Stars</option>
            <option value="4">4+ Stars</option>
            <option value="3">3+ Stars</option>
            <option value="2">2+ Stars</option>
            <option value="1">1+ Stars</option>
          </select>
          <span className="text-xs text-gray-500">{totalCount} results</span>
        </div>

        {/* Reviews Table */}
        <div className="bg-white rounded-xl border border-[#E1E6EF] overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-10 h-10 border-4 border-gray-200 border-t-[#4461F2] rounded-full animate-spin" />
            </div>
          ) : reviews.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-gray-500">No reviews found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-[#E1E6EF]">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Reviewer</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Reviewee</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">Rating</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Comment</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">Status</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">Reports</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {reviews.map((review) => (
                    <tr
                      key={review._id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => setSelectedReview(review)}
                    >
                      <td className="px-4 py-3 text-gray-700 truncate max-w-30">
                        {getUserName(review.reviewerId)}
                      </td>
                      <td className="px-4 py-3 text-gray-700 truncate max-w-30">
                        {getUserName(review.revieweeId)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700"
                        >
                          ✓ Verified
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">{renderStars(review.overallRating)}</td>
                      <td className="px-4 py-3 text-gray-600 truncate max-w-50">
                        {review.title || review.comment?.slice(0, 60) || "—"}
                      </td>
                      <td className="px-4 py-3 text-center">{getStatusBadge(review.status)}</td>
                      <td className="px-4 py-3 text-center">
                        {review.reported?.isReported && review.reported.reports?.length > 0 ? (
                          <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                            {review.reported.reports.length}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">0</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                        {formatDate(review.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedReview(review);
                          }}
                          className="text-primary-500 hover:underline text-xs font-medium"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-[#E1E6EF]">
              <p className="text-xs text-gray-500">
                Page {filters.page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    setFilters((f) => ({ ...f, page: Math.max(1, (f.page || 1) - 1) }))
                  }
                  disabled={(filters.page || 1) <= 1}
                  className="px-3 py-1.5 text-xs font-medium border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50"
                >
                  Previous
                </button>
                <button
                  onClick={() =>
                    setFilters((f) => ({ ...f, page: Math.min(totalPages, (f.page || 1) + 1) }))
                  }
                  disabled={(filters.page || 1) >= totalPages}
                  className="px-3 py-1.5 text-xs font-medium border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Review Detail Modal */}
        {selectedReview && (
          <div
            className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
            onClick={() => setSelectedReview(null)}
          >
            <div
              className="bg-white rounded-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900">Review Details</h2>
                <button
                  onClick={() => setSelectedReview(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                {/* Rating & Type */}
                <div className="flex items-center justify-between">
                  {renderStars(selectedReview.overallRating)}
                  <span
                    className="px-2.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700"
                  >
                    ✓ Verified
                  </span>
                </div>

                {/* Status */}
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-500">Status</span>
                  {getStatusBadge(selectedReview.status)}
                </div>

                {/* Users */}
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-500">Reviewer</span>
                  <span className="text-sm font-medium">{getUserName(selectedReview.reviewerId)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-500">Reviewee</span>
                  <span className="text-sm font-medium">{getUserName(selectedReview.revieweeId)}</span>
                </div>

                {/* Title & Comment */}
                {selectedReview.title && (
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{selectedReview.title}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-700 leading-relaxed">{selectedReview.comment}</p>
                </div>

                {/* Detailed Ratings */}
                {selectedReview.ratings && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs font-medium text-gray-500 mb-2">Detailed Ratings</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {Object.entries(selectedReview.ratings).map(([key, val]) => (
                        <div key={key} className="flex justify-between">
                          <span className="text-gray-600 capitalize">
                            {key.replace(/([A-Z])/g, " $1").trim()}
                          </span>
                          <span className="font-medium">{val}/5</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Reports */}
                {selectedReview.reported?.isReported && selectedReview.reported.reports?.length > 0 && (
                  <div className="bg-red-50 rounded-lg p-3">
                    <p className="text-xs font-medium text-red-700 mb-2">
                      Reports ({selectedReview.reported.reports.length})
                    </p>
                    <div className="space-y-2">
                      {selectedReview.reported.reports.map((report, i) => (
                        <div key={i} className="text-xs text-red-600">
                          <span className="font-medium capitalize">{report.reason}</span>
                          {report.description && (
                            <span className="text-red-500"> — {report.description}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Response */}
                {selectedReview.response?.content && (
                  <div className="bg-blue-50 rounded-lg p-3">
                    <p className="text-xs font-medium text-blue-700 mb-1">Owner Response</p>
                    <p className="text-sm text-blue-800">{selectedReview.response.content}</p>
                  </div>
                )}

                {/* Media */}
                {selectedReview.media && selectedReview.media.length > 0 && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs font-medium text-gray-700 mb-2">Attached Media</p>
                    <div className="grid grid-cols-2 gap-2">
                      {selectedReview.media.map((media, idx) => {
                        const mediaKey = media._id || media.publicId || `${idx}`;
                        return (
                          <div key={mediaKey} className="relative rounded-lg overflow-hidden border border-gray-200 bg-white">
                            {media.mediaType === "video" ? (
                              <video src={media.url} controls className="w-full h-24 object-cover bg-black" />
                            ) : (
                              <Image
                                src={media.url}
                                alt={`Review media ${idx + 1}`}
                                width={320}
                                height={96}
                                className="w-full h-24 object-cover"
                                unoptimized
                              />
                            )}
                            {(media._id || media.publicId) && (
                              <button
                                onClick={() => handleRemoveMedia(selectedReview._id, media._id || media.publicId)}
                                className="absolute top-1 right-1 bg-red-600 text-white text-[10px] px-2 py-0.5 rounded-md hover:bg-red-700"
                                disabled={actionLoading === selectedReview._id}
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Date */}
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-500">Created</span>
                  <span className="text-sm text-gray-600">{formatDate(selectedReview.createdAt)}</span>
                </div>

                {/* Moderation History */}
                {selectedReview.moderation && (
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-500">Moderation</span>
                    <span className="text-sm text-gray-600 capitalize">
                      {selectedReview.moderation.action}
                      {selectedReview.moderation.reason && ` — ${selectedReview.moderation.reason}`}
                    </span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="mt-6 space-y-3">
                <p className="text-xs font-medium text-gray-500">Moderation Actions</p>
                <div className="flex flex-wrap gap-2">
                  {MODERATION_ACTIONS.map(({ value, label, color }) => (
                    <button
                      key={value}
                      onClick={() => openModerateModal(selectedReview, value)}
                      disabled={!!actionLoading}
                      className={`px-3 py-2 text-xs font-medium text-white rounded-lg disabled:opacity-50 ${color}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setSelectedReview(null)}
                  className="w-full px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Moderation Modal */}
        {showModerateModal && moderateTarget && (
          <div
            className="fixed inset-0 z-60 bg-black/50 flex items-center justify-center p-4"
            onClick={() => setShowModerateModal(false)}
          >
            <div
              className="bg-white rounded-2xl max-w-md w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-lg font-bold text-gray-900 mb-2">
                Confirm: {moderateAction.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())}
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                This action will update moderation for the review by{" "}
                <span className="font-medium">{getUserName(moderateTarget.reviewerId)}</span>.
              </p>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason (required)
                </label>
                <textarea
                  value={moderateReason}
                  onChange={(e) => setModerateReason(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none"
                  placeholder="Reason for this action"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowModerateModal(false);
                    setModerateTarget(null);
                  }}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleModerate}
                  disabled={!!actionLoading}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-primary-500 rounded-lg hover:bg-[#2F4BDB] disabled:opacity-50"
                >
                  {actionLoading ? "Processing..." : "Confirm"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

function StatCard({
  label,
  value,
  icon,
  warning,
}: {
  label: string;
  value: string;
  icon: string;
  warning?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 bg-white ${
        warning ? "border-red-200" : "border-[#E1E6EF]"
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-500">{label}</span>
        <span className="text-lg">{icon}</span>
      </div>
      <p className={`text-xl font-bold ${warning ? "text-red-600" : "text-gray-900"}`}>{value}</p>
    </div>
  );
}
