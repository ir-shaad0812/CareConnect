"use client";

// ============================================
// CARE-SEEKER REVIEWS PAGE
// Submit & manage reviews for completed bookings
// Real-time: socket new_review event + REST fallback
// ============================================

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Star, Send, Image, X, CheckCircle, AlertCircle, Clock, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { reviewService, type Review, type ReviewableBooking } from "@/services/api/review.service";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useSocketContext } from "@/context/SocketContext";
import { useAuthContext } from "@/context/AuthContext";
import { authService } from "@/modules/auth/services";

// ── Types ──────────────────────────────────────────────────────────────────

interface SubmitState {
  bookingId: string | null;
  rating: number;
  hover: number;
  comment: string;
  title: string;
  files: File[];
  previews: string[];
  categoryRatings: {
    punctuality: number;
    professionalism: number;
    communication: number;
    qualityOfCare: number;
    valueForMoney: number;
  };
}

const CATEGORY_LABELS: Record<string, string> = {
  punctuality: "Punctuality",
  professionalism: "Professionalism",
  communication: "Communication",
  qualityOfCare: "Quality of Care",
  valueForMoney: "Value for Money",
};

const SERVICE_TYPE_LABEL: Record<string, string> = {
  elderly_care: "Elderly Care",
  child_care: "Child Care",
  special_needs: "Special Needs",
  disability_care: "Disability Support",
  post_surgery: "Post-Surgery Care",
  companionship: "Companionship",
  respite_care: "Respite Care",
  palliative_care: "Palliative Care",
  alzheimers_care: "Alzheimer's Care",
};

// ── Star picker ────────────────────────────────────────────────────────────

function StarPicker({
  value,
  hover,
  onRate,
  onHover,
  size = "lg",
}: {
  value: number;
  hover: number;
  onRate: (n: number) => void;
  onHover: (n: number) => void;
  size?: "sm" | "lg";
}) {
  const sz = size === "lg" ? "w-9 h-9" : "w-5 h-5";
  return (
    <div className="flex gap-1" onMouseLeave={() => onHover(0)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onRate(n)}
          onMouseEnter={() => onHover(n)}
          className="transition-transform hover:scale-110 focus:outline-none"
        >
          <Star
            className={`${sz} transition-colors ${
              n <= (hover || value) ? "fill-amber-400 text-amber-400" : "text-slate-200 fill-slate-200"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

// ── BookingCard ────────────────────────────────────────────────────────────

function BookingCard({
  booking,
  onSelect,
  selected,
}: {
  booking: ReviewableBooking;
  onSelect: () => void;
  selected: boolean;
}) {
  const caregiver = booking.caregiverId as { fullName?: string; avatar?: string };
  const name = caregiver?.fullName ?? "Caregiver";
  const avatar = caregiver?.avatar;
  const service = SERVICE_TYPE_LABEL[booking.serviceType] ?? booking.serviceType?.replace(/_/g, " ");

  return (
    <motion.button
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      onClick={onSelect}
      className={`w-full text-left rounded-2xl border-2 p-4 transition-all duration-200 ${
        selected
          ? "border-primary-500 bg-primary-50 shadow-md"
          : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="relative h-12 w-12 shrink-0 rounded-full overflow-hidden bg-slate-100">
          {avatar ? (
            <img src={avatar} alt={name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-lg font-bold text-slate-400">
              {name[0]}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-slate-900 truncate">{name}</p>
          <p className="text-sm text-slate-500">{service}</p>
          <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {new Date(booking.schedule.startDate).toLocaleDateString("en-NP", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        </div>
        {selected && <CheckCircle className="w-5 h-5 text-primary-500 shrink-0" />}
      </div>
    </motion.button>
  );
}

// ── ReviewCard ─────────────────────────────────────────────────────────────

function ReviewCard({ review }: { review: Review }) {
  const [expanded, setExpanded] = useState(false);
  const caregiver = review.revieweeId as { fullName?: string; avatar?: string };
  const name = caregiver?.fullName ?? "Caregiver";
  const avatar = caregiver?.avatar;

  return (
    <motion.div
      layout
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 shrink-0 rounded-full overflow-hidden bg-slate-100">
            {avatar ? (
              <img src={avatar} alt={name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center font-bold text-slate-400">
                {name[0]}
              </div>
            )}
          </div>
          <div>
            <p className="font-semibold text-slate-900 text-sm">{name}</p>
            <div className="flex items-center gap-1 mt-0.5">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  className={`w-3.5 h-3.5 ${s <= review.overallRating ? "fill-amber-400 text-amber-400" : "text-slate-200 fill-slate-200"}`}
                />
              ))}
              <span className="text-xs text-slate-500 ml-1">{review.overallRating}/5</span>
            </div>
          </div>
        </div>
        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
          review.status === "published" ? "bg-emerald-50 text-emerald-700" :
          review.status === "pending_review" ? "bg-amber-50 text-amber-700" :
          "bg-rose-50 text-rose-700"
        }`}>
          {review.status.replace("_", " ")}
        </span>
      </div>

      {review.title && (
        <p className="mt-3 font-semibold text-slate-900 text-sm">{review.title}</p>
      )}
      <p className={`mt-2 text-sm text-slate-600 leading-relaxed ${!expanded && "line-clamp-3"}`}>
        {review.comment}
      </p>
      {review.comment.length > 150 && (
        <button
          onClick={() => setExpanded((e) => !e)}
          className="mt-1 text-xs text-primary-600 hover:text-primary-700 flex items-center gap-0.5"
        >
          {expanded ? <><ChevronUp className="w-3 h-3" />Show less</> : <><ChevronDown className="w-3 h-3" />Read more</>}
        </button>
      )}

      {/* Media */}
      {review.media && review.media.length > 0 && (
        <div className="mt-3 flex gap-2 flex-wrap">
          {review.media.slice(0, 4).map((m, i) => (
            <div key={m._id ?? i} className="h-16 w-16 rounded-lg overflow-hidden bg-slate-100 shrink-0">
              {m.mediaType === "image" ? (
                <img src={m.url} alt="" className="h-full w-full object-cover" />
              ) : (
                <video src={m.url} className="h-full w-full object-cover" muted />
              )}
            </div>
          ))}
        </div>
      )}

      {review.response && (
        <div className="mt-3 rounded-xl bg-slate-50 border border-slate-100 p-3">
          <p className="text-xs font-semibold text-slate-500 mb-1">Caregiver's response</p>
          <p className="text-sm text-slate-700">{review.response.content}</p>
        </div>
      )}

      <p className="mt-3 text-xs text-slate-400">
        {new Date(review.createdAt).toLocaleDateString("en-NP", { month: "long", day: "numeric", year: "numeric" })}
      </p>
    </motion.div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

const INITIAL_FORM: SubmitState = {
  bookingId: null,
  rating: 0,
  hover: 0,
  comment: "",
  title: "",
  files: [],
  previews: [],
  categoryRatings: {
    punctuality: 0,
    professionalism: 0,
    communication: 0,
    qualityOfCare: 0,
    valueForMoney: 0,
  },
};

export default function CareSeekerReviewsPage() {
  const router = useRouter();
  const { user: authUser, isLoading: isAuthLoading } = useAuthContext();
  const { socket } = useSocketContext();
  const searchParams = useSearchParams();
  const requestedBookingId = searchParams.get("bookingId");
  const [bookings, setBookings] = useState<ReviewableBooking[]>([]);
  const [myReviews, setMyReviews] = useState<Review[]>([]);
  const [form, setForm] = useState<SubmitState>(INITIAL_FORM);
  const [catHover, setCatHover] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [pageError, setPageError] = useState("");
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"submit" | "mine">("submit");
  const retryQueueRef = useRef<Array<() => Promise<void>>>([]);

  const load = useCallback(async () => {
    if (!authUser) return;

    setLoading(true);
    setPageError("");
    try {
      const [bookResult, reviewResult] = await Promise.allSettled([
        reviewService.getReviewableBookings(),
        reviewService.getMyWrittenReviews({ limit: 20 }),
      ]);

      let hadFailure = false;

      if (bookResult.status === "fulfilled") {
        const bookRes = bookResult.value;
        if (bookRes.success && bookRes.data) {
          setBookings(bookRes.data.bookings);
        } else {
          hadFailure = true;
        }
      } else {
        hadFailure = true;
      }

      if (reviewResult.status === "fulfilled") {
        const reviewRes = reviewResult.value;
        if (reviewRes.success && reviewRes.data) {
          setMyReviews(reviewRes.data.reviews);
        } else {
          hadFailure = true;
        }
      } else {
        hadFailure = true;
      }

      if (hadFailure) {
        setPageError(
          "Some review data could not be loaded right now. Please refresh in a moment.",
        );
      }
    } catch {
      setPageError("Unable to load review information. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [authUser]);

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    if (!authUser) {
      const cachedUser = authService.getCurrentUser();
      if (cachedUser?.role === "careseeker") {
        return;
      }

      router.replace("/login?redirect=/dashboard/careseeker/reviews");
      return;
    }

    if (authUser.role !== "careseeker") {
      const fallbackRoute = authService.getDashboardPathForRole(authUser.role);
      router.replace(fallbackRoute ?? "/dashboard");
      return;
    }

    void load();
  }, [authUser?._id, authUser?.role, isAuthLoading, load, router]);

  useEffect(() => {
    if (!requestedBookingId) return;

    const isReviewableBooking = bookings.some(
      (booking) => booking._id === requestedBookingId,
    );

    if (!isReviewableBooking) return;

    setTab("submit");
    setForm((prev) =>
      prev.bookingId === requestedBookingId
        ? prev
        : { ...prev, bookingId: requestedBookingId },
    );
  }, [bookings, requestedBookingId]);

  // ── Real-time: refresh on review + booking lifecycle events ──
  useEffect(() => {
    if (!socket) return;

    const refresh = () => {
      void load();
    };

    const realtimeEvents = [
      "review:new",
      "review:changed",
      "booking:payment_completed",
      "booking_payment_completed",
      "booking_confirmed",
      "booking:confirmed",
      "booking_completed",
      "booking:completed",
      "booking_active",
      "booking:active",
      "tracking:submitted",
      "tracking:reviewed",
    ];

    realtimeEvents.forEach((eventName) => socket.on(eventName, refresh));

    return () => {
      realtimeEvents.forEach((eventName) => socket.off(eventName, refresh));
    };
  }, [load, socket]);

  // ── File handling ──
  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []).slice(0, 6 - form.files.length);
    const newPreviews = selected.map((f) => URL.createObjectURL(f));
    setForm((f) => ({
      ...f,
      files: [...f.files, ...selected].slice(0, 6),
      previews: [...f.previews, ...newPreviews].slice(0, 6),
    }));
  };

  const removeFile = (i: number) => {
    URL.revokeObjectURL(form.previews[i]);
    setForm((f) => ({
      ...f,
      files: f.files.filter((_, idx) => idx !== i),
      previews: f.previews.filter((_, idx) => idx !== i),
    }));
  };

  // ── Submit with REST fallback ──
  const handleSubmit = async () => {
    if (!form.bookingId || form.rating === 0 || form.comment.trim().length < 10) {
      setSubmitError("Please select a booking, give a rating, and write at least 10 characters.");
      return;
    }
    setSubmitting(true);
    setSubmitError("");

    const trimmedTitle = form.title.trim();
    const payload = {
      overallRating: form.rating,
      comment: form.comment.trim(),
      ratings: Object.fromEntries(
        Object.entries(form.categoryRatings).filter(([, v]) => v > 0)
      ),
      ...(trimmedTitle ? { title: trimmedTitle } : {}),
    };

    const doSubmit = async () => {
      const res = await reviewService.createVerifiedReview(form.bookingId!, payload);
      if (!res.success) throw new Error(res.message || "Submit failed");
      const createdReview = res.data!.review;

      if (form.files.length > 0) {
        try {
          const mediaRes = await reviewService.addReviewMedia(createdReview._id, form.files);
          if (mediaRes.success && mediaRes.data?.review) {
            return mediaRes.data.review;
          }
        } catch {
          // Keep the created review even if media upload fails.
        }
      }

      return createdReview;
    };

    try {
      const review = await doSubmit();
      setMyReviews((prev) => [review, ...prev]);
      setSubmitSuccess(true);
      setForm(INITIAL_FORM);
      // Remove from reviewable bookings
      setBookings((prev) => prev.filter((b) => b._id !== form.bookingId));
      setTimeout(() => setSubmitSuccess(false), 4000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Submission failed";
      setSubmitError(msg);
      // Offline queue: retry when reconnected
      retryQueueRef.current.push(async () => {
        const review = await doSubmit();
        setMyReviews((prev) => [review, ...prev]);
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (isAuthLoading || !authUser || authUser.role !== "careseeker") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F7FA]">
        <div className="w-8 h-8 border-3 border-[#4461F2] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <DashboardLayout user={authUser}>
      <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Reviews</h1>
            <p className="text-sm text-slate-500 mt-0.5">Rate your caregiver experience</p>
          </div>
        </div>

        {pageError && (
          <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {pageError}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 rounded-xl bg-slate-100 p-1 w-fit">
          {(["submit", "mine"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === t ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {t === "submit" ? "Write a Review" : `My Reviews (${myReviews.length})`}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* ── SUBMIT TAB ── */}
          {tab === "submit" && (
            <motion.div
              key="submit"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 lg:grid-cols-5 gap-6"
            >
              {/* Booking selector */}
              <div className="lg:col-span-2 space-y-3">
                <p className="text-sm font-semibold text-slate-700">1. Select a paid booking</p>
                {loading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-20 rounded-2xl bg-slate-100 animate-pulse" />
                    ))}
                  </div>
                ) : bookings.length === 0 ? (
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
                    <CheckCircle className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    No bookings pending review.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-110 overflow-y-auto pr-1">
                    {bookings.map((b) => (
                      <BookingCard
                        key={b._id}
                        booking={b}
                        selected={form.bookingId === b._id}
                        onSelect={() => setForm((f) => ({ ...f, bookingId: b._id }))}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Form */}
              <div className="lg:col-span-3">
                <div className="relative rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                  <div className="h-1 bg-linear-to-r from-primary-500 via-violet-500 to-pink-500" />
                  <div className="p-6 space-y-5">
                    <p className="text-sm font-semibold text-slate-700">2. Write your review</p>

                    {/* Overall rating */}
                    <div>
                      <label className="text-xs font-medium text-slate-500 uppercase tracking-wide block mb-2">
                        Overall Rating *
                      </label>
                      <StarPicker
                        value={form.rating}
                        hover={form.hover}
                        onRate={(n) => setForm((f) => ({ ...f, rating: n }))}
                        onHover={(n) => setForm((f) => ({ ...f, hover: n }))}
                      />
                      {form.rating > 0 && (
                        <p className="text-xs text-slate-500 mt-1">
                          {["", "Poor", "Fair", "Good", "Very Good", "Excellent"][form.rating]}
                        </p>
                      )}
                    </div>

                    {/* Category ratings */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {Object.keys(form.categoryRatings).map((cat) => (
                        <div key={cat}>
                          <label className="text-xs text-slate-500 mb-1 block">
                            {CATEGORY_LABELS[cat]} <span className="text-slate-300">(optional)</span>
                          </label>
                          <StarPicker
                            size="sm"
                            value={form.categoryRatings[cat as keyof typeof form.categoryRatings]}
                            hover={catHover[cat] ?? 0}
                            onRate={(n) =>
                              setForm((f) => ({
                                ...f,
                                categoryRatings: { ...f.categoryRatings, [cat]: n },
                              }))
                            }
                            onHover={(n) => setCatHover((h) => ({ ...h, [cat]: n }))}
                          />
                        </div>
                      ))}
                    </div>

                    {/* Title */}
                    <input
                      type="text"
                      maxLength={100}
                      placeholder="Title (optional)"
                      value={form.title}
                      onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />

                    {/* Comment */}
                    <div>
                      <textarea
                        rows={4}
                        minLength={10}
                        maxLength={2000}
                        placeholder="Share your experience (at least 10 characters)…"
                        value={form.comment}
                        onChange={(e) => setForm((f) => ({ ...f, comment: e.target.value }))}
                        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                      <p className="text-right text-xs text-slate-400 mt-0.5">
                        {form.comment.length}/2000
                      </p>
                    </div>

                    {/* Media upload */}
                    <div>
                      <label className="text-xs font-medium text-slate-500 uppercase tracking-wide block mb-2">
                        Photos / Videos (max 6)
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {form.previews.map((src, i) => (
                          <div key={i} className="relative h-16 w-16 rounded-xl overflow-hidden bg-slate-100 shrink-0">
                            <img src={src} alt="" className="h-full w-full object-cover" />
                            <button
                              onClick={() => removeFile(i)}
                              className="absolute top-0.5 right-0.5 rounded-full bg-black/60 p-0.5 text-white"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                        {form.files.length < 6 && (
                          <label className="flex h-16 w-16 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 text-slate-400 hover:border-primary-400 hover:text-primary-500 transition-colors shrink-0">
                            <Image className="w-5 h-5" />
                            <input type="file" accept="image/*,video/*" multiple onChange={handleFiles} className="sr-only" />
                          </label>
                        )}
                      </div>
                    </div>

                    {/* Errors */}
                    <AnimatePresence>
                      {submitError && (
                        <motion.div
                          initial={{ opacity: 0, y: -6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-3 text-sm text-rose-700"
                        >
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          {submitError}
                        </motion.div>
                      )}
                      {submitSuccess && (
                        <motion.div
                          initial={{ opacity: 0, y: -6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-700"
                        >
                          <CheckCircle className="w-4 h-4 shrink-0" />
                          Review submitted! Thank you for your feedback.
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Submit */}
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleSubmit}
                      disabled={submitting || !form.bookingId || form.rating === 0}
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-linear-to-r from-primary-600 to-violet-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-primary-200 hover:from-primary-700 hover:to-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      {submitting ? (
                        <><Loader2 className="w-4 h-4 animate-spin" />Submitting…</>
                      ) : (
                        <><Send className="w-4 h-4" />Submit Review</>
                      )}
                    </motion.button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── MY REVIEWS TAB ── */}
          {tab === "mine" && (
            <motion.div
              key="mine"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-36 rounded-2xl bg-slate-100 animate-pulse" />
                  ))}
                </div>
              ) : myReviews.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
                  <Star className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                  <p className="text-slate-500 text-sm">You haven't submitted any reviews yet.</p>
                  <button
                    onClick={() => setTab("submit")}
                    className="mt-4 text-sm text-primary-600 hover:text-primary-700 font-medium"
                  >
                    Write your first review →
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {myReviews.map((r) => (
                    <ReviewCard key={r._id} review={r} />
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
}
