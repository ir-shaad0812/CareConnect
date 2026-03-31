"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  reviewService,
  Review,
  ReviewFilters,
  ReviewableBooking,
  ReportReason,
} from "@/services/api/review.service";
import { ReviewCard } from "@/components/ui/ReviewCard";
import { useSocket } from "@/context/SocketContext";
import { useAuthContext } from "@/context/AuthContext";

export default function ReviewsPage() {
  const router = useRouter();
  const { socket } = useSocket();
  const { user, isLoading: isAuthLoading } = useAuthContext();
  const [activeTab, setActiveTab] = useState<"received" | "written" | "reviewable">("received");
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewableBookings, setReviewableBookings] = useState<ReviewableBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10, pages: 0 });
  const [filters, setFilters] = useState<ReviewFilters>({ page: 1, limit: 10 });
  const [showReportModal, setShowReportModal] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState<ReportReason>("inappropriate");
  const [reportDescription, setReportDescription] = useState("");

  const userId = user?._id || user?.id || "";

  const fetchReviews = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (activeTab === "received") {
        const response = await reviewService.getMyReceivedReviews(filters);
        if (response.success && response.data) {
          setReviews(response.data.reviews);
          setPagination(response.data.pagination);
        }
      } else if (activeTab === "written") {
        const response = await reviewService.getMyWrittenReviews(filters);
        if (response.success && response.data) {
          setReviews(response.data.reviews);
          setPagination(response.data.pagination);
        }
      } else if (activeTab === "reviewable") {
        const response = await reviewService.getReviewableBookings();
        if (response.success && response.data) {
          setReviewableBookings(response.data.bookings);
        }
      }
    } catch (err) {
      const statusCode =
        typeof err === "object" && err && "statusCode" in err
          ? Number((err as { statusCode?: number }).statusCode)
          : null;

      if (statusCode === 401 || statusCode === 403) {
        router.replace("/login?redirect=/dashboard/reviews");
        return;
      }

      console.error("Failed to fetch reviews:", err);
      setError("Failed to load reviews. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, filters, router]);

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    if (!user) {
      router.replace("/login?redirect=/dashboard/reviews");
      return;
    }

    if (user.role === "careseeker") {
      router.replace("/dashboard/careseeker/reviews");
      return;
    }

    if (user.role === "caregiver") {
      router.replace("/dashboard/caregiver/reviews");
    }
  }, [isAuthLoading, router, user]);

  useEffect(() => {
    if (!isAuthLoading && user) {
      fetchReviews();
    }
  }, [isAuthLoading, user, fetchReviews]);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 4000);
      return () => clearTimeout(timer);
    }

    return undefined;
  }, [successMessage]);

  // Real-time: refresh received reviews when a new review arrives
  useEffect(() => {
    if (!socket) return;
    const handleNewReview = () => {
      if (activeTab === "received") fetchReviews();
    };
    socket.on("review:new", handleNewReview);
    return () => { socket.off("review:new", handleNewReview); };
  }, [socket, activeTab, fetchReviews]);

  const handleTabChange = (tab: typeof activeTab) => {
    setActiveTab(tab);
    setFilters({ page: 1, limit: 10 });
  };

  const handleHelpful = async (reviewId: string) => {
    try {
      const response = await reviewService.toggleHelpful(reviewId);
      if (response.success) {
        fetchReviews();
      }
    } catch (err) {
      console.error("Failed to toggle helpful:", err);
    }
  };

  const handleRespond = async (reviewId: string, content: string) => {
    try {
      const response = await reviewService.respondToReview(reviewId, content);
      if (response.success) {
        setSuccessMessage("Response submitted successfully!");
        fetchReviews();
      }
    } catch (err) {
      console.error("Failed to respond:", err);
      setError("Failed to submit response.");
    }
  };

  const handleReport = async () => {
    if (!showReportModal) return;
    try {
      const response = await reviewService.reportReview(showReportModal, {
        reason: reportReason,
        ...(reportDescription ? { description: reportDescription } : {}),
      });
      if (response.success) {
        setSuccessMessage("Review reported. Our team will investigate.");
        setShowReportModal(null);
        setReportReason("inappropriate");
        setReportDescription("");
      }
    } catch (err) {
      console.error("Failed to report:", err);
      setError("Failed to report review.");
    }
  };

  const handlePageChange = (page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  const getUserName = (value: string | { fullName?: string } | null | undefined) => {
    if (!value) return "User";
    if (typeof value === "string") return "User";
    return value.fullName || "User";
  };

  if (
    isAuthLoading ||
    !user ||
    user.role === "careseeker" ||
    user.role === "caregiver"
  ) {
    return (
      <div className="min-h-screen bg-linear-to-br from-[#F0F5FF] to-[#F8F5FF] flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-12 h-12 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full border-4 border-gray-200" />
            <div className="absolute inset-0 rounded-full border-4 border-primary-500 border-t-transparent animate-spin" />
          </div>
          <p className="text-gray-500 text-sm">Opening your reviews...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-[#F0F5FF] to-[#F8F5FF]">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-[#E1E6EF] sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Reviews</h1>
              <p className="mt-0.5 text-sm text-gray-500">Manage your reviews and feedback</p>
            </div>
            <Link
              href="/dashboard"
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-[#E1E6EF] rounded-lg hover:bg-[#F0F5FF] transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Messages */}
        <AnimatePresence>
          {successMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl mb-6 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {successMessage}
            </motion.div>
          )}
        </AnimatePresence>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
            <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-700">?</button>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm p-1.5 mb-6 border border-[#E1E6EF] inline-flex gap-1">
          {([
            { key: "received", label: "Reviews About Me", icon: "⭐" },
            { key: "written", label: "My Reviews", icon: "✍️" },
            { key: "reviewable", label: "Write a Review", icon: "✏️" },
          ] as const).map((tab) => (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={`px-4 py-2.5 text-sm font-medium rounded-lg transition-all ${
                activeTab === tab.key
                  ? "bg-primary-500 text-white shadow-sm"
                  : "text-gray-600 hover:bg-[#F0F5FF] hover:text-primary-500"
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <div className="relative w-12 h-12 mx-auto mb-4">
                <div className="absolute inset-0 rounded-full border-4 border-gray-200" />
                <div className="absolute inset-0 rounded-full border-4 border-primary-500 border-t-transparent animate-spin" />
              </div>
              <p className="text-gray-500 text-sm">Loading reviews...</p>
            </div>
          </div>
        ) : activeTab === "reviewable" ? (
          /* Reviewable Bookings */
          reviewableBookings.length === 0 ? (
            <EmptyState
              icon="📋"
              title="No bookings to review"
              description="Complete a booking to leave a review for your caregiver."
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {reviewableBookings.map((booking) => (
                <motion.div
                  key={booking._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-xl border border-[#E1E6EF] p-5 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-semibold text-gray-900">
                        Booking #{booking.bookingNumber}
                      </h4>
                      <p className="text-sm text-gray-500 capitalize mt-0.5">
                        {booking.serviceType?.replace(/_/g, " ")}
                      </p>
                    </div>
                    <span className="text-xs text-gray-500">
                      {formatDate(booking.schedule?.startDate)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">
                    With: <span className="font-medium">
                      {getUserName(booking.caregiverId)}
                    </span>
                  </p>
                  <Link
                    href={`/dashboard/reviews/write?bookingId=${booking._id}`}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-500 rounded-lg hover:bg-[#2F4BDB] transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                    Write Review
                  </Link>
                </motion.div>
              ))}
            </div>
          )
        ) : reviews.length === 0 ? (
          <EmptyState
            icon={activeTab === "received" ? "⭐" : "✍️"}
            title={activeTab === "received" ? "No reviews received yet" : "No reviews written yet"}
            description={
              activeTab === "received"
                ? "Reviews from clients will appear here."
                : "Complete a booking and leave feedback."
            }
          />
        ) : (
          <div className="space-y-4">
            {reviews.map((review, index) => (
              <motion.div
                key={review._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
              >
                <ReviewCard
                  review={review}
                  currentUserId={userId}
                  onHelpful={handleHelpful}
                  onReport={(id) => setShowReportModal(id)}
                  onRespond={handleRespond}
                />
              </motion.div>
            ))}

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-[#E1E6EF] rounded-lg hover:bg-[#F0F5FF] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                {Array.from({ length: Math.min(pagination.pages, 5) }, (_, i) => (
                  <button
                    key={i + 1}
                    onClick={() => handlePageChange(i + 1)}
                    className={`px-3 py-2 text-sm font-medium rounded-lg ${
                      pagination.page === i + 1
                        ? "bg-primary-500 text-white"
                        : "text-gray-700 bg-white border border-[#E1E6EF] hover:bg-[#F0F5FF]"
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page >= pagination.pages}
                  className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-[#E1E6EF] rounded-lg hover:bg-[#F0F5FF] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Report Modal */}
      <AnimatePresence>
        {showReportModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowReportModal(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6"
            >
              <h3 className="text-lg font-bold text-gray-900 mb-4">Report Review</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                  <select
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value as ReportReason)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#4461F2] focus:border-transparent"
                  >
                    <option value="spam">Spam</option>
                    <option value="inappropriate">Inappropriate Content</option>
                    <option value="fake">Fake Review</option>
                    <option value="harassment">Harassment</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Additional Details (Optional)
                  </label>
                  <textarea
                    value={reportDescription}
                    onChange={(e) => setReportDescription(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#4461F2] focus:border-transparent resize-none"
                    placeholder="Describe why you're reporting this review..."
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowReportModal(null)}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-[#E1E6EF] rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReport}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
                >
                  Submit Report
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function EmptyState({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="text-center py-16 bg-white rounded-xl border border-[#E1E6EF]"
    >
      <div className="w-16 h-16 mx-auto mb-4 bg-[#F0F5FF] rounded-full flex items-center justify-center text-2xl">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-1">{title}</h3>
      <p className="text-gray-500 text-sm">{description}</p>
    </motion.div>
  );
}

