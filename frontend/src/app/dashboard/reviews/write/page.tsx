"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, ArrowLeft, Check, ShieldCheck, X, AlertTriangle } from "lucide-react";
import { useAuthContext } from "@/context/AuthContext";
import {
  reviewService,
  CreateVerifiedReviewData,
  ReviewRatings,
} from "@/services/api/review.service";
import { bookingService, Booking } from "@/modules/booking/services";
import { StarRating } from "@/components/ui/StarRating";

/* -- Rating labels -- */
const RATING_LABELS = ["", "Poor", "Fair", "Good", "Very Good", "Excellent"];
const RATING_EMOJIS = ["", "😞", "😕", "😐", "🙂", "😊"];
const RATING_COLORS = ["", "text-red-500", "text-orange-500", "text-yellow-500", "text-blue-500", "text-emerald-500"];

const SUB_RATINGS: { key: keyof ReviewRatings; label: string; icon: string; description: string }[] = [
  { key: "punctuality", label: "Punctuality", icon: "⏰", description: "Timeliness and reliability" },
  { key: "professionalism", label: "Professionalism", icon: "🤝", description: "Conduct and demeanor" },
  { key: "communication", label: "Communication", icon: "💬", description: "Clarity and responsiveness" },
  { key: "qualityOfCare", label: "Quality of Care", icon: "❤️", description: "Overall care standard" },
  { key: "valueForMoney", label: "Value for Money", icon: "💰", description: "Worth the price paid" },
];

const MAX_REVIEW_MEDIA_FILES = 6;
const MAX_REVIEW_VIDEO_FILES = 1;

function WriteReviewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const bookingId = searchParams.get("bookingId");
  const { user, isLoading: isAuthLoading } = useAuthContext();

  const [booking, setBooking] = useState<Booking | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canReview, setCanReview] = useState(false);
  const [step, setStep] = useState(1); // 1 = rating, 2 = details, 3 = confirm

  const [overallRating, setOverallRating] = useState(0);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaUploadWarning, setMediaUploadWarning] = useState<string | null>(null);
  const [ratings, setRatings] = useState<ReviewRatings>({
    punctuality: 0,
    professionalism: 0,
    communication: 0,
    qualityOfCare: 0,
    valueForMoney: 0,
  });

  useEffect(() => {
    if (isAuthLoading) return;

    if (!user) {
      router.replace("/login?redirect=/dashboard/reviews/write");
      return;
    }

    if (user.role === "careseeker") {
      const destination = bookingId
        ? `/dashboard/careseeker/reviews?bookingId=${encodeURIComponent(bookingId)}`
        : "/dashboard/careseeker/reviews";
      router.replace(destination);
      return;
    }

    if (user.role === "caregiver") {
      router.replace("/dashboard/caregiver/reviews");
      return;
    }

    if (!bookingId) { setError("No booking specified."); setIsLoading(false); return; }

    async function loadBooking() {
      try {
        const checkResponse = await reviewService.canReviewBooking(bookingId!);
        if (!checkResponse.success || !checkResponse.data?.canReview) {
          setError(checkResponse.data?.reason || "You cannot review this booking.");
          setIsLoading(false);
          return;
        }
        setCanReview(true);
        const bookingResponse = await bookingService.getBookingById(bookingId!);
        if (bookingResponse.success && bookingResponse.data) {
          setBooking(bookingResponse.data.booking);
        }
      } catch {
        setError("Failed to load booking details.");
      } finally {
        setIsLoading(false);
      }
    }
    loadBooking();
  }, [bookingId, isAuthLoading, router, user]);

  if (
    isAuthLoading ||
    !user ||
    user.role === "careseeker" ||
    user.role === "caregiver"
  ) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-[#F0F5FF] via-white to-[#F8F5FF]">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full border-4 border-gray-200" />
            <div className="absolute inset-0 rounded-full border-4 border-primary-500 border-t-transparent animate-spin" />
          </div>
          <p className="text-gray-600 font-semibold">Opening your review page...</p>
        </motion.div>
      </div>
    );
  }

  const handleRatingChange = (key: keyof ReviewRatings, value: number) => {
    setRatings((prev) => ({ ...prev, [key]: value }));
  };

  const handleMediaChange = (files: FileList | null) => {
    if (!files) return;

    const selected = Array.from(files);
    const imageFiles = selected.filter((file) => file.type.startsWith("image/"));
    const videoFiles = selected.filter((file) => file.type.startsWith("video/"));

    if (selected.length > MAX_REVIEW_MEDIA_FILES) {
      setError(`You can upload up to ${MAX_REVIEW_MEDIA_FILES} files.`);
      return;
    }

    if (videoFiles.length > MAX_REVIEW_VIDEO_FILES) {
      setError("Only one short video can be attached to a review.");
      return;
    }

    if (imageFiles.length + videoFiles.length !== selected.length) {
      setError("Only image and video files are allowed.");
      return;
    }

    setMediaFiles(selected);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingId || overallRating === 0) { setError("Please provide at least an overall rating."); return; }
    if (!comment.trim()) { setError("Please write a review comment."); return; }
    setIsSubmitting(true);
    setError(null);
    setMediaUploadWarning(null);
    try {
      const reviewData: CreateVerifiedReviewData = {
        overallRating,
        comment: comment.trim(),
        ...(title.trim() ? { title: title.trim() } : {}),
        ...(Object.values(ratings).some((v) => v > 0) ? { ratings } : {}),
        ...(booking?.serviceType !== undefined ? { serviceType: booking.serviceType } : {}),
      };
      const response = await reviewService.createVerifiedReview(bookingId, reviewData);
      if (response.success) {
        const createdReviewId = response.data?.review?._id;
        let mediaUploadPartial = false;

        if (createdReviewId && mediaFiles.length > 0) {
          try {
            await reviewService.addReviewMedia(createdReviewId, mediaFiles);
          } catch {
            mediaUploadPartial = true;
            setMediaUploadWarning(
              "Review saved, but media upload failed. You can retry from your review details.",
            );
          }
        }

        router.push(
          mediaUploadPartial
            ? "/dashboard/reviews?success=review_submitted&media=partial"
            : "/dashboard/reviews?success=review_submitted",
        );
      } else {
        setError(response.message || "Failed to submit review.");
      }
    } catch (err: unknown) {
      const errorMessage = err && typeof err === "object" && "message" in err ? (err as { message: string }).message : "Failed to submit review.";
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCaregiverName = (): string => {
    if (!booking) return "Caregiver";
    const cg = booking.caregiverId;
    if (typeof cg === "string") return "Caregiver";
    return cg.fullName || "Caregiver";
  };

  const getCaregiverInitial = (): string => getCaregiverName().charAt(0).toUpperCase();

  const filledSubRatings = Object.values(ratings).filter((v) => v > 0).length;
  const subRatingAvg = filledSubRatings > 0 ? Object.values(ratings).reduce((a, b) => a + b, 0) / filledSubRatings : 0;

  // -- Loading --
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-[#F0F5FF] via-white to-[#F8F5FF]">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full border-4 border-gray-200" />
            <div className="absolute inset-0 rounded-full border-4 border-primary-500 border-t-transparent animate-spin" />
          </div>
          <p className="text-gray-600 font-semibold">Loading booking...</p>
        </motion.div>
      </div>
    );
  }

  // -- Cannot Review --
  if (!canReview) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-[#F0F5FF] via-white to-[#F8F5FF] p-4">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center max-w-md bg-white rounded-2xl p-8 shadow-xl border border-[#E1E6EF]">
          <div className="w-16 h-16 mx-auto mb-4 bg-amber-100 rounded-2xl flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-amber-600" />
          </div>
          <h2 className="text-xl font-extrabold text-gray-900 mb-2">Cannot Review</h2>
          <p className="text-gray-500 mb-6 text-sm">{error}</p>
          <Link href="/dashboard/reviews" className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-linear-to-r from-primary-500 to-[#7C3AED] rounded-xl hover:shadow-lg transition-all">
            <ArrowLeft className="w-4 h-4" /> Back to Reviews
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-[#F0F5FF] via-white to-[#F8F5FF]">
      {/* -- Header -- */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-[#E1E6EF]/50 sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-linear-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-200/50">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>
              </div>
              <div>
                <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">Write a Review</h1>
                <p className="text-sm text-gray-500">Share your experience with {getCaregiverName()}</p>
              </div>
            </div>
            <Link href="/dashboard/reviews" className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-[#E1E6EF] rounded-xl hover:bg-gray-50 transition-colors shadow-sm">
              Cancel
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* -- Progress Steps -- */}
        <div className="flex items-center justify-center mb-8">
          {[
            { n: 1, label: "Rating" },
            { n: 2, label: "Details" },
            { n: 3, label: "Confirm" },
          ].map(({ n, label }, i) => (
            <div key={n} className="flex items-center">
              {i > 0 && <div className={`w-12 sm:w-20 h-0.5 mx-1 transition-colors duration-300 ${step >= n ? "bg-primary-500" : "bg-gray-200"}`} />}
              <button
                onClick={() => { if (n < step || (n === 2 && overallRating > 0) || (n === 3 && overallRating > 0 && comment.trim())) setStep(n); }}
                className="flex flex-col items-center gap-1"
              >
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                  step === n ? "bg-primary-500 text-white shadow-lg shadow-[#4461F2]/30 scale-110" :
                  step > n ? "bg-emerald-500 text-white" : "bg-gray-200 text-gray-500"
                }`}>
                  {step > n ? <Check className="w-4 h-4" /> : n}
                </div>
                <span className={`text-[10px] font-semibold uppercase tracking-wider ${step >= n ? "text-primary-500" : "text-gray-400"}`}>{label}</span>
              </button>
            </div>
          ))}
        </div>

        {/* -- Caregiver Card -- */}
        {booking && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-[#E1E6EF]/60 p-5 mb-6 flex items-center gap-4 shadow-sm">
            <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-primary-500 to-[#7C3AED] flex items-center justify-center text-white font-extrabold text-xl shadow-lg shadow-[#4461F2]/20">
              {getCaregiverInitial()}
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-gray-900">{getCaregiverName()}</h3>
              <p className="text-sm text-gray-500 capitalize">{booking.serviceType?.replace(/_/g, " ")} &middot; Booking #{booking.bookingNumber}</p>
            </div>
            <div className="text-right">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <ShieldCheck className="w-3.5 h-3.5" /> Verified Booking
              </span>
            </div>
          </motion.div>
        )}

        {/* -- Error -- */}
        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-6 flex items-center gap-3 text-sm font-medium">
              <AlertCircle className="w-5 h-5 shrink-0" />{error}
              <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600"><X className="w-4 h-4" /></button>
            </motion.div>
          )}
        </AnimatePresence>

        {mediaUploadWarning && (
          <div className="bg-amber-50 border border-amber-200 text-amber-700 rounded-xl p-4 mb-6 text-sm font-medium">
            {mediaUploadWarning}
          </div>
        )}

        {/* -- Form -- */}
        <form onSubmit={handleSubmit}>
          <AnimatePresence mode="wait">
            {/* -- STEP 1: Overall Rating -- */}
            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                className="bg-white rounded-2xl border border-[#E1E6EF]/60 shadow-sm overflow-hidden">
                {/* Hero Section */}
                <div className="bg-linear-to-r from-primary-500/5 via-[#7C3AED]/5 to-[#EC4899]/5 p-8 text-center border-b border-[#E1E6EF]/40">
                  <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.1 }}
                    className="text-5xl mb-3">{overallRating > 0 ? RATING_EMOJIS[overallRating] : "?"}</motion.div>
                  <h3 className="text-xl font-extrabold text-gray-900 mb-1">How was your overall experience?</h3>
                  <p className="text-sm text-gray-500">Tap a star to rate {getCaregiverName()}</p>
                  <div className="mt-5 flex justify-center">
                    <StarRating value={overallRating} onChange={setOverallRating} size="lg" />
                  </div>
                  <AnimatePresence mode="wait">
                    {overallRating > 0 && (
                      <motion.p key={overallRating} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                        className={`mt-3 text-lg font-bold ${RATING_COLORS[overallRating]}`}>
                        {RATING_LABELS[overallRating]}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>

                {/* Sub-ratings */}
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-bold text-gray-900">Rate Specific Areas</h4>
                    <span className="text-xs text-gray-400 font-medium">{filledSubRatings}/5 rated</span>
                  </div>
                  <div className="space-y-3">
                    {SUB_RATINGS.map(({ key, label, icon, description }) => (
                      <motion.div key={key} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-3 p-3 rounded-xl bg-gray-50/50 hover:bg-gray-50 transition-colors">
                        <span className="text-xl w-8 text-center">{icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900">{label}</p>
                          <p className="text-[11px] text-gray-400">{description}</p>
                        </div>
                        <StarRating value={ratings[key] || 0} onChange={(v) => handleRatingChange(key, v)} size="sm" />
                      </motion.div>
                    ))}
                  </div>

                  {/* Average Indicator */}
                  {filledSubRatings > 0 && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="mt-4 flex items-center justify-center gap-2 text-sm text-gray-500 bg-[#F0F5FF] rounded-xl py-2.5">
                      <span className="font-bold text-primary-500">{subRatingAvg.toFixed(1)}</span>
                      <span>average across {filledSubRatings} categories</span>
                    </motion.div>
                  )}

                  {/* Next */}
                  <motion.button
                    type="button"
                    disabled={overallRating === 0}
                    onClick={() => setStep(2)}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    className="w-full mt-6 py-3.5 text-sm font-bold text-white bg-linear-to-r from-primary-500 to-[#7C3AED] rounded-xl disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-[#4461F2]/25 transition-all flex items-center justify-center gap-2"
                  >
                    Continue to Details
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </motion.button>
                </div>
              </motion.div>
            )}

            {/* -- STEP 2: Written Review -- */}
            {step === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                className="bg-white rounded-2xl border border-[#E1E6EF]/60 shadow-sm p-6 space-y-6">

                {/* Rating Summary */}
                <div className="flex items-center gap-4 p-4 bg-linear-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-100">
                  <div className="text-3xl">{RATING_EMOJIS[overallRating]}</div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">{RATING_LABELS[overallRating]} — {overallRating}/5 stars</p>
                    <p className="text-xs text-gray-500">Click to edit rating</p>
                  </div>
                  <button type="button" onClick={() => setStep(1)} className="ml-auto text-xs font-semibold text-amber-600 hover:underline">Edit</button>
                </div>

                {/* Title */}
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    Review Title <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    maxLength={100}
                    placeholder="e.g., Excellent care for my mother"
                    className="w-full px-4 py-3 border border-[#E1E6EF] rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-[#4461F2]/40 focus:border-primary-500 outline-none transition-shadow"
                  />
                  <p className="text-[11px] text-gray-400 mt-1 text-right">{title.length}/100</p>
                </div>

                {/* Comment */}
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    Your Review <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      rows={6}
                      maxLength={2000}
                      placeholder="Tell others about your experience — what went well, what could improve, and would you recommend this caregiver?"
                      className="w-full px-4 py-3 border border-[#E1E6EF] rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-[#4461F2]/40 focus:border-primary-500 outline-none resize-none transition-shadow"
                      required
                    />
                    <div className="absolute bottom-3 right-3 flex items-center gap-2">
                      <span className={`text-[11px] font-medium ${comment.length > 1800 ? "text-amber-500" : "text-gray-400"}`}>
                        {comment.length}/2000
                      </span>
                    </div>
                  </div>
                  {/* Writing tips */}
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {["Be specific", "Stay respectful", "Help others decide"].map((tip) => (
                      <div key={tip} className="flex items-center gap-1.5 text-[11px] text-gray-400">
                        <span className="w-1 h-1 rounded-full bg-primary-500" />{tip}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Optional media */}
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    Add Photos / Video <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-[#E1E6EF] rounded-xl p-4 cursor-pointer hover:border-primary-300 hover:bg-primary-50/40 transition-colors">
                    <input
                      type="file"
                      accept="image/*,video/mp4,video/webm,video/quicktime"
                      multiple
                      className="hidden"
                      onChange={(e) => handleMediaChange(e.target.files)}
                    />
                    <span className="text-sm font-semibold text-gray-700">Upload up to 6 files</span>
                    <span className="text-xs text-gray-400">Images + one short video max</span>
                  </label>

                  {mediaFiles.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {mediaFiles.map((file, index) => (
                        <div key={`${file.name}-${index}`} className="flex items-center justify-between gap-3 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                          <div className="min-w-0">
                            <p className="text-sm text-gray-700 truncate">{file.name}</p>
                            <p className="text-xs text-gray-400">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setMediaFiles((prev) => prev.filter((_, i) => i !== index));
                            }}
                            className="text-xs font-semibold text-red-500 hover:text-red-700"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Nav */}
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setStep(1)}
                    className="flex-1 py-3 text-sm font-semibold text-gray-700 bg-white border border-[#E1E6EF] rounded-xl hover:bg-gray-50 transition-colors">
                    ? Back
                  </button>
                  <motion.button type="button" disabled={!comment.trim()} onClick={() => setStep(3)}
                    whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                    className="flex-1 py-3 text-sm font-bold text-white bg-linear-to-r from-primary-500 to-[#7C3AED] rounded-xl disabled:opacity-40 hover:shadow-lg hover:shadow-[#4461F2]/25 transition-all">
                    Preview & Submit ?
                  </motion.button>
                </div>
              </motion.div>
            )}

            {/* -- STEP 3: Preview & Confirm -- */}
            {step === 3 && (
              <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                className="space-y-6">

                {/* Preview Card */}
                <div className="bg-white rounded-2xl border border-[#E1E6EF]/60 shadow-sm overflow-hidden">
                  <div className="bg-linear-to-r from-emerald-50 to-teal-50 p-4 border-b border-emerald-100 flex items-center gap-2">
                    <span className="text-lg">👁️</span>
                    <p className="text-sm font-bold text-emerald-700">Review Preview</p>
                  </div>
                  <div className="p-6">
                    {/* Rating Display */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <svg key={s} className={`w-5 h-5 ${s <= overallRating ? "text-amber-400" : "text-gray-200"}`} fill="currentColor" viewBox="0 0 24 24">
                            <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                          </svg>
                        ))}
                      </div>
                      <span className="text-sm font-bold text-gray-900">{overallRating}.0</span>
                      <span className={`text-sm font-semibold ${RATING_COLORS[overallRating]}`}>{RATING_LABELS[overallRating]}</span>
                    </div>

                    {title && <h4 className="text-lg font-bold text-gray-900 mb-2">&ldquo;{title}&rdquo;</h4>}
                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{comment}</p>

                    {mediaFiles.length > 0 && (
                      <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/70 px-3 py-2 text-sm text-blue-700">
                        {mediaFiles.length} media file{mediaFiles.length > 1 ? "s" : ""} will be attached after review submission.
                      </div>
                    )}

                    {/* Sub-ratings bar */}
                    {filledSubRatings > 0 && (
                      <div className="mt-5 pt-4 border-t border-gray-100 grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {SUB_RATINGS.filter(({ key }) => (ratings[key] ?? 0) > 0).map(({ key, label, icon }) => (
                          <div key={key} className="flex items-center gap-2 text-sm">
                            <span>{icon}</span>
                            <span className="text-gray-600">{label}</span>
                            <span className="ml-auto font-bold text-gray-900">{ratings[key]}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Author line */}
                    <div className="mt-5 pt-4 border-t border-gray-100 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-linear-to-br from-primary-500 to-[#7C3AED] flex items-center justify-center text-white text-xs font-bold">
                        You
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Reviewing</p>
                        <p className="text-sm font-semibold text-gray-900">{getCaregiverName()}</p>
                      </div>
                      <span className="ml-auto text-[10px] text-gray-400 font-mono">Verified ✓</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <button type="button" onClick={() => setStep(2)}
                    className="flex-1 py-3.5 text-sm font-semibold text-gray-700 bg-white border border-[#E1E6EF] rounded-xl hover:bg-gray-50 transition-colors shadow-sm flex items-center justify-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                    Edit Review
                  </button>
                  <motion.button type="submit" disabled={isSubmitting}
                    whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                    className="flex-1 py-3.5 text-sm font-bold text-white bg-linear-to-r from-emerald-500 to-teal-500 rounded-xl hover:shadow-lg hover:shadow-emerald-500/25 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                    {isSubmitting ? (
                      <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Submitting...</>
                    ) : (
                      <><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> Submit Review</>
                    )}
                  </motion.button>
                </div>

                {/* Trust Footer */}
                <div className="flex items-center justify-center gap-4 text-[11px] text-gray-400 pt-2">
                  <span className="flex items-center gap-1">🔒 Private until approved</span>
                  <span className="flex items-center gap-1">✓ Verified booking</span>
                  <span className="flex items-center gap-1">📋 Community guidelines</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </form>
      </main>
    </div>
  );
}

export default function WriteReviewPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#F0F5FF]">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border-4 border-gray-200" />
            <div className="absolute inset-0 rounded-full border-4 border-primary-500 border-t-transparent animate-spin" />
          </div>
        </div>
      }
    >
      <WriteReviewContent />
    </Suspense>
  );
}


