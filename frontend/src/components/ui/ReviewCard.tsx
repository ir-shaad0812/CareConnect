"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { StarRating } from "./StarRating";
import type { Review } from "@/services/api/review.service";
import type { User } from "@/types";

interface ReviewCardProps {
  review: Review;
  currentUserId?: string;
  onHelpful?: (reviewId: string) => void;
  onReport?: (reviewId: string) => void;
  onRespond?: (reviewId: string, content: string) => void;
  showResponse?: boolean;
}

function getUserDisplay(value: string | User): { name: string; avatar?: string } {
  if (typeof value === "string") return { name: "User" };
  return {
    name: value.fullName || "User",
    ...(value.avatar !== undefined ? { avatar: value.avatar } : {}),
  };
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function ReviewCard({
  review,
  currentUserId,
  onHelpful,
  onReport,
  onRespond,
  showResponse = true,
}: ReviewCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [respondText, setRespondText] = useState("");
  const [showRespondForm, setShowRespondForm] = useState(false);
  const [showReportMenu, setShowReportMenu] = useState(false);

  const reviewer = getUserDisplay(review.reviewerId);
  const isOwnReview =
    currentUserId &&
    (typeof review.reviewerId === "string"
      ? review.reviewerId === currentUserId
      : review.reviewerId._id === currentUserId || review.reviewerId.id === currentUserId);

  const isReviewee =
    currentUserId &&
    (typeof review.revieweeId === "string"
      ? review.revieweeId === currentUserId
      : review.revieweeId._id === currentUserId || review.revieweeId.id === currentUserId);

  const hasVoted = review.helpful?.users?.includes(currentUserId || "");

  const mediaItems =
    review.media && review.media.length > 0
      ? review.media
      : (review.photos || [])
          .map((photo) => {
            if (typeof photo === "string") {
              return { mediaType: "image" as const, url: photo, publicId: photo };
            }

            if (photo && typeof photo === "object" && photo.url) {
              return {
                mediaType: "image" as const,
                url: photo.url,
                publicId: photo.publicId || photo.url,
              };
            }

            return null;
          })
          .filter((item): item is { mediaType: "image"; url: string; publicId: string } => Boolean(item));

  const handleSubmitResponse = () => {
    if (respondText.trim() && onRespond) {
      onRespond(review._id, respondText.trim());
      setRespondText("");
      setShowRespondForm(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl border border-[#E1E6EF] p-5 hover:shadow-md transition-shadow"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-linear-to-br from-primary-500 to-secondary-500 flex items-center justify-center text-white font-semibold text-sm">
            {reviewer.avatar ? (
              <Image
                src={reviewer.avatar}
                alt={reviewer.name}
                width={40}
                height={40}
                className="w-10 h-10 rounded-full object-cover"
                unoptimized
              />
            ) : (
              reviewer.name.charAt(0).toUpperCase()
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-900">{reviewer.name}</span>
              {review.reviewType === "verified" && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Verified
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500">{formatDate(review.createdAt)}</p>
          </div>
        </div>
        <StarRating value={review.overallRating} readOnly size="sm" showValue />
      </div>

      {/* Title */}
      {review.title && (
        <h4 className="font-semibold text-gray-900 mb-1">{review.title}</h4>
      )}

      {/* Comment */}
      <p className={`text-gray-700 text-sm leading-relaxed ${!isExpanded && review.comment.length > 200 ? "line-clamp-3" : ""}`}>
        {review.comment}
      </p>
      {review.comment.length > 200 && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-primary-500 text-sm font-medium mt-1 hover:underline"
        >
          {isExpanded ? "Show less" : "Read more"}
        </button>
      )}

      {/* Rating Breakdown */}
      {review.ratings && Object.values(review.ratings).some((v) => v && v > 0) && (
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
          {Object.entries(review.ratings).map(([key, val]) =>
            val && val > 0 ? (
              <div key={key} className="flex items-center gap-1.5 text-xs text-gray-600">
                <span className="capitalize">
                  {key.replace(/([A-Z])/g, " $1").trim()}
                </span>
                <div className="flex items-center gap-0.5">
                  <svg className="w-3.5 h-3.5 text-amber-400 fill-current" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <span className="font-medium">{val}</span>
                </div>
              </div>
            ) : null
          )}
        </div>
      )}

      {/* Review media (images + short videos) */}
      {mediaItems.length > 0 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {mediaItems.map((media, i) => (
            <div key={`${media.publicId || media.url}-${i}`} className="shrink-0">
              {media.mediaType === "video" ? (
                <video
                  src={media.url}
                  controls
                  preload="metadata"
                  className="w-28 h-20 rounded-lg object-cover border border-gray-200 bg-black"
                />
              ) : (
                <Image
                  src={media.url}
                  alt={`Review media ${i + 1}`}
                  width={80}
                  height={80}
                  className="w-20 h-20 rounded-lg object-cover border border-gray-200"
                  unoptimized
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Response from reviewee */}
      {showResponse && review.response && (
        <div className="mt-4 bg-[#F0F5FF] rounded-lg p-3 border border-primary-500/10">
          <p className="text-xs font-semibold text-primary-500 mb-1">Response from provider</p>
          <p className="text-sm text-gray-700">{review.response.content}</p>
          <p className="text-xs text-gray-500 mt-1">{formatDate(review.response.respondedAt)}</p>
        </div>
      )}

      {/* Actions */}
      <div className="mt-4 flex items-center gap-4 pt-3 border-t border-gray-100">
        <button
          onClick={() => onHelpful?.(review._id)}
          className={`flex items-center gap-1.5 text-sm transition-colors ${
            hasVoted
              ? "text-primary-500 font-medium"
              : "text-gray-500 hover:text-primary-500"
          }`}
        >
          <svg className="w-4 h-4" fill={hasVoted ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"
            />
          </svg>
          Helpful ({review.helpful?.count || 0})
        </button>

        {isReviewee && !review.response && (
          <button
            onClick={() => setShowRespondForm(!showRespondForm)}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary-500 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
            Respond
          </button>
        )}

        {!isOwnReview && (
          <div className="relative ml-auto">
            <button
              onClick={() => setShowReportMenu(!showReportMenu)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </button>
            <AnimatePresence>
              {showReportMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="absolute right-0 mt-1 w-36 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10"
                >
                  <button
                    onClick={() => {
                      onReport?.(review._id);
                      setShowReportMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    Report Review
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Respond Form */}
      <AnimatePresence>
        {showRespondForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 overflow-hidden"
          >
            <textarea
              value={respondText}
              onChange={(e) => setRespondText(e.target.value)}
              placeholder="Write your response..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#4461F2] focus:border-transparent resize-none"
            />
            <div className="flex justify-end gap-2 mt-2">
              <button
                onClick={() => setShowRespondForm(false)}
                className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitResponse}
                disabled={!respondText.trim()}
                className="px-4 py-1.5 text-sm font-medium text-white bg-primary-500 rounded-lg hover:bg-[#2F4BDB] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Submit
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default ReviewCard;
