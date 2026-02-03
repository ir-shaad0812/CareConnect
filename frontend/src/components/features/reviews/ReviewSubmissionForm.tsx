"use client";

import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { reviewService, type CreateVerifiedReviewData, type ReviewRatings } from "@/services/api/review.service";

// ---- Types ----

interface ReviewSubmissionFormProps {
  bookingId: string;
  caregiverName: string;
  serviceType?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

// ---- Icons ----

const StarIcon = ({ filled, half }: { filled?: boolean; half?: boolean }) => (
  <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none">
    <defs>
      <linearGradient id="starGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#F59E0B" />
        <stop offset="100%" stopColor="#F97316" />
      </linearGradient>
    </defs>
    <path
      d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.27 5.82 22 7 14.14l-5-4.87 6.91-1.01L12 2z"
      fill={filled ? "url(#starGrad)" : half ? "url(#starGrad)" : "none"}
      stroke={filled || half ? "none" : "#D1D5DB"}
      strokeWidth="1.5"
      opacity={filled ? 1 : half ? 0.4 : 1}
    />
  </svg>
);

const CheckCircleIcon = () => (
  <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" strokeLinecap="round" strokeLinejoin="round" />
    <polyline points="22 4 12 14.01 9 11.01" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

// ---- Category Rating Labels ----

const CATEGORY_LABELS: { key: keyof ReviewRatings; label: string; description: string }[] = [
  { key: "punctuality", label: "Punctuality", description: "Timely and reliable" },
  { key: "professionalism", label: "Professionalism", description: "Conduct and demeanor" },
  { key: "communication", label: "Communication", description: "Clear and responsive" },
  { key: "qualityOfCare", label: "Quality of Care", description: "Attentive and thorough" },
  { key: "valueForMoney", label: "Value for Money", description: "Worth the cost" },
];

// ---- Star Rating Input ----

function StarRatingInput({
  value,
  onChange,
  size = "lg",
}: {
  value: number;
  onChange: (v: number) => void;
  size?: "sm" | "lg";
}) {
  const [hover, setHover] = useState(0);

  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <motion.button
          key={star}
          type="button"
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.9 }}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(star)}
          className={`transition-transform cursor-pointer ${size === "sm" ? "[&_svg]:w-5 [&_svg]:h-5" : "[&_svg]:w-8 [&_svg]:h-8"}`}
        >
          <StarIcon filled={(hover || value) >= star} />
        </motion.button>
      ))}
    </div>
  );
}

// ---- Main Component ----

export default function ReviewSubmissionForm({
  bookingId,
  caregiverName,
  serviceType,
  onSuccess,
  onCancel,
}: ReviewSubmissionFormProps) {
  const [step, setStep] = useState<"form" | "success">("form");
  const [overallRating, setOverallRating] = useState(0);
  const [categoryRatings, setCategoryRatings] = useState<ReviewRatings>({});
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCategoryRating = useCallback((key: keyof ReviewRatings, val: number) => {
    setCategoryRatings((prev) => ({ ...prev, [key]: val }));
  }, []);

  const canSubmit = overallRating > 0 && comment.trim().length >= 10;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    const data: CreateVerifiedReviewData = {
      overallRating,
      comment: comment.trim(),
      ...(title.trim() && { title: title.trim() }),
      ...(Object.keys(categoryRatings).length > 0 && { ratings: categoryRatings }),
      ...(serviceType && { serviceType }),
    };

    try {
      const response = await reviewService.createVerifiedReview(bookingId, data);
      if (!response.success) {
        throw new Error(response.message || "Failed to submit review");
      }

      const reviewId = response.data?.review?._id;
      if (reviewId && mediaFiles.length > 0) {
        try {
          await reviewService.addReviewMedia(reviewId, mediaFiles);
        } catch {
          // Review itself is already persisted. Media can be retried later.
        }
      }

      setStep("success");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ---- Success View ----

  if (step === "success") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl border border-gray-100 shadow-xl p-8 text-center max-w-lg mx-auto"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
          className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-600"
        >
          <CheckCircleIcon />
        </motion.div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">Review Submitted!</h3>
        <p className="text-gray-500 mb-6">
          Thank you for reviewing {caregiverName}. Your verified feedback helps the community.
        </p>
        <div className="flex justify-center gap-2 mb-4">
          {[1, 2, 3, 4, 5].map((s) => (
            <StarIcon key={s} filled={overallRating >= s} />
          ))}
        </div>
        {onSuccess && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onSuccess}
            className="mt-4 px-6 py-2.5 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors"
          >
            Done
          </motion.button>
        )}
      </motion.div>
    );
  }

  // ---- Form View ----

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl border border-gray-100 shadow-xl overflow-hidden max-w-lg mx-auto"
    >
      {/* Header */}
      <div className="bg-linear-to-r from-primary-600 to-primary-700 px-6 py-5 text-white relative">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold">Rate Your Experience</h3>
            <p className="text-sm text-white/70 mt-0.5">Verified review for {caregiverName}</p>
          </div>
          {onCancel && (
            <button
              onClick={onCancel}
              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white/80"
            >
              <CloseIcon />
            </button>
          )}
        </div>
        <div className="mt-3 flex items-center gap-2 text-xs text-white/60">
          <CheckCircleIcon />
          <span>Verified booking review &bull; Booking paid in full</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* Overall Rating */}
        <div className="text-center">
          <p className="text-sm font-semibold text-gray-700 mb-2">Overall Rating</p>
          <div className="flex justify-center">
            <StarRatingInput value={overallRating} onChange={setOverallRating} size="lg" />
          </div>
          <p className="text-xs text-gray-400 mt-1">
            {overallRating === 0
              ? "Tap a star to rate"
              : ["", "Poor", "Fair", "Good", "Very Good", "Excellent"][overallRating]}
          </p>
        </div>

        {/* Category Ratings */}
        <AnimatePresence>
          {overallRating > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-3 overflow-hidden"
            >
              <p className="text-sm font-semibold text-gray-700">Category Ratings <span className="text-gray-400 font-normal">(optional)</span></p>
              {CATEGORY_LABELS.map(({ key, label, description }) => (
                <div key={key} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-2.5">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{label}</p>
                    <p className="text-xs text-gray-400">{description}</p>
                  </div>
                  <StarRatingInput
                    value={categoryRatings[key] ?? 0}
                    onChange={(v) => handleCategoryRating(key, v)}
                    size="sm"
                  />
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Title */}
        <div>
          <label className="text-sm font-semibold text-gray-700 mb-1 block">
            Review Title <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={100}
            placeholder="Summarize your experience..."
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400 transition-all"
          />
        </div>

        {/* Comment */}
        <div>
          <label className="text-sm font-semibold text-gray-700 mb-1 block">
            Your Review <span className="text-red-400">*</span>
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            minLength={10}
            maxLength={2000}
            rows={4}
            placeholder="Share your experience with this caregiver..."
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400 transition-all resize-none"
          />
          <div className="flex justify-between mt-1">
            <p className="text-xs text-gray-400">Min 10 characters</p>
            <p className={`text-xs ${comment.length >= 10 ? "text-gray-400" : "text-red-400"}`}>
              {comment.length}/2000
            </p>
          </div>
        </div>

        {/* Optional media */}
        <div>
          <label className="text-sm font-semibold text-gray-700 mb-1 block">
            Add photos/video <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            type="file"
            accept="image/*,video/mp4,video/webm,video/quicktime"
            multiple
            onChange={(e) => {
              const files = e.target.files ? Array.from(e.target.files) : [];
              setMediaFiles(files.slice(0, 6));
            }}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm file:mr-3 file:px-3 file:py-1.5 file:border-0 file:rounded-lg file:bg-primary-100 file:text-primary-700 file:font-medium"
          />
          {mediaFiles.length > 0 && (
            <p className="text-xs text-gray-500 mt-1">{mediaFiles.length} file(s) selected</p>
          )}
        </div>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Submit */}
        <motion.button
          type="submit"
          whileHover={canSubmit ? { scale: 1.01 } : {}}
          whileTap={canSubmit ? { scale: 0.99 } : {}}
          disabled={!canSubmit || isSubmitting}
          className={`w-full py-3.5 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
            canSubmit
              ? "bg-linear-to-r from-primary-600 to-primary-700 text-white shadow-lg hover:shadow-xl"
              : "bg-gray-100 text-gray-400 cursor-not-allowed"
          }`}
        >
          {isSubmitting ? (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
              />
              Submitting...
            </>
          ) : (
            "Submit Verified Review"
          )}
        </motion.button>
      </form>
    </motion.div>
  );
}
