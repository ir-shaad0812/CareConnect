"use client";

// ============================================
// PremiumReviewPanel — embeddable review widget
// • Real-time via socket (new_review event)
// • Offline-queue REST fallback
// • Strict gate: only active/completed bookings
// • Caregiver profile updates instantly
// ============================================

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Star, Send, X, Image, CheckCircle, AlertCircle,
  Lock, Loader2, RefreshCw,
} from "lucide-react";
import { reviewService, type Review } from "@/services/api/review.service";

// ── Types ──────────────────────────────────────────────────────────────────

interface Props {
  bookingId: string;
  caregiverId: string;
  caregiverName: string;
  caregiverAvatar?: string;
  bookingStatus: string; // from DB
  paymentStatus: string; // from DB
  serviceType?: string;
  onReviewSubmitted?: (review: Review) => void;
}

type Phase = "locked" | "form" | "success" | "already_reviewed";

const ALLOWED_STATUSES = new Set(["confirmed", "active", "in_progress", "completed"]);
const ALLOWED_PAYMENT  = new Set(["fully_paid", "payment_completed", "completed", "paid", "held", "released"]);

// ── StarRow ────────────────────────────────────────────────────────────────

function StarRow({
  value, hover, label, onRate, onHover, size = "md",
}: {
  value: number; hover: number; label?: string;
  onRate: (n: number) => void; onHover: (n: number) => void;
  size?: "sm" | "md";
}) {
  const cls = size === "sm" ? "w-5 h-5" : "w-7 h-7";
  return (
    <div className="flex items-center gap-3">
      {label && <span className="w-36 text-xs text-slate-500 shrink-0">{label}</span>}
      <div className="flex gap-1" onMouseLeave={() => onHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n} type="button"
            onClick={() => onRate(n)}
            onMouseEnter={() => onHover(n)}
            className="transition-transform hover:scale-110 focus:outline-none"
          >
            <Star
              className={`${cls} transition-colors ${
                n <= (hover || value)
                  ? "fill-amber-400 text-amber-400"
                  : "text-slate-200 fill-slate-200"
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────

export function PremiumReviewPanel({
  bookingId,
  caregiverName,
  caregiverAvatar,
  bookingStatus,
  paymentStatus,
  serviceType,
  onReviewSubmitted,
}: Props) {
  const [phase, setPhase] = useState<Phase>("form");
  const [checking, setChecking] = useState(true);

  const [rating, setRating] = useState(0);
  const [hover, setHover]   = useState(0);
  const [comment, setComment] = useState("");
  const [title, setTitle]   = useState("");
  const [files, setFiles]   = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [catRatings, setCatRatings] = useState({
    punctuality: 0, professionalism: 0,
    communication: 0, qualityOfCare: 0, valueForMoney: 0,
  });
  const [catHover, setCatHover] = useState<Record<string, number>>({});

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submittedReview, setSubmittedReview] = useState<Review | null>(null);
  const retryQueue = useRef<Array<() => Promise<Review>>>([]);
  const [isOnline, setIsOnline] = useState(true);

  // ── Access gate ──
  const isAccessGranted = ALLOWED_STATUSES.has(bookingStatus) && ALLOWED_PAYMENT.has(paymentStatus);

  // ── Check eligibility ──
  useEffect(() => {
    if (!isAccessGranted) { setPhase("locked"); setChecking(false); return; }
    reviewService.canReviewBooking(bookingId).then((res) => {
      if (res.success && res.data) {
        if (!res.data.canReview) setPhase("already_reviewed");
        else setPhase("form");
      }
    }).catch(() => setPhase("form")).finally(() => setChecking(false));
  }, [bookingId, isAccessGranted]);

  // ── Online/offline detection ──
  useEffect(() => {
    const up   = () => { setIsOnline(true);  flushRetryQueue(); };
    const down = () => setIsOnline(false);
    window.addEventListener("online",  up);
    window.addEventListener("offline", down);
    return () => { window.removeEventListener("online", up); window.removeEventListener("offline", down); };
  }, []);

  // ── Socket listener for real-time confirmation ──
  useEffect(() => {
    const handler = (e: CustomEvent) => {
      const review = e.detail as Review;
      if (review.bookingId === bookingId) {
        setSubmittedReview(review);
        setPhase("success");
        onReviewSubmitted?.(review);
      }
    };
    window.addEventListener("socket:new_review", handler as EventListener);
    return () => window.removeEventListener("socket:new_review", handler as EventListener);
  }, [bookingId, onReviewSubmitted]);

  const flushRetryQueue = useCallback(async () => {
    const q = [...retryQueue.current];
    retryQueue.current = [];
    for (const fn of q) {
      try {
        const review = await fn();
        setSubmittedReview(review);
        setPhase("success");
        onReviewSubmitted?.(review);
      } catch { /* re-queue on next online event */ retryQueue.current.push(fn); }
    }
  }, [onReviewSubmitted]);

  // ── File handling ──
  const addFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []).slice(0, 6 - files.length);
    setPreviews((p) => [...p, ...picked.map((f) => URL.createObjectURL(f))].slice(0, 6));
    setFiles((f) => [...f, ...picked].slice(0, 6));
  };
  const removeFile = (i: number) => {
    URL.revokeObjectURL(previews[i]);
    setFiles((f) => f.filter((_, idx) => idx !== i));
    setPreviews((p) => p.filter((_, idx) => idx !== i));
  };

  // ── Submit ──
  const handleSubmit = async () => {
    if (rating === 0 || comment.trim().length < 10) {
      setError("Give a rating and write at least 10 characters.");
      return;
    }
    setError("");
    setSubmitting(true);

    const trimmedTitle = title.trim();
    const payload = {
      overallRating: rating,
      comment: comment.trim(),
      ratings: Object.fromEntries(Object.entries(catRatings).filter(([, v]) => v > 0)),
      ...(trimmedTitle ? { title: trimmedTitle } : {}),
      ...(serviceType ? { serviceType } : {}),
    };

    const doSubmit = async (): Promise<Review> => {
      const res = await reviewService.createVerifiedReview(bookingId, payload);
      if (!res.success || !res.data) throw new Error(res.message || "Submit failed");
      return res.data.review;
    };

    if (!isOnline) {
      retryQueue.current.push(doSubmit);
      setError("You're offline. Review queued and will submit automatically when reconnected.");
      setSubmitting(false);
      return;
    }

    try {
      const review = await doSubmit();
      setSubmittedReview(review);
      setPhase("success");
      onReviewSubmitted?.(review);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Submission failed. Queued for retry.";
      setError(msg);
      retryQueue.current.push(doSubmit);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Renders ──

  if (checking) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (phase === "locked") {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center">
        <Lock className="w-10 h-10 text-slate-300 mx-auto mb-3" />
        <p className="font-semibold text-slate-700 text-sm">Reviews Locked</p>
        <p className="text-xs text-slate-500 mt-1">
          Reviews are available once your booking is active and payment is complete.
        </p>
      </div>
    );
  }

  if (phase === "already_reviewed") {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
        <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
        <p className="font-semibold text-emerald-800 text-sm">Review Already Submitted</p>
        <p className="text-xs text-emerald-600 mt-1">
          You've already reviewed this booking. Thank you for your feedback!
        </p>
      </div>
    );
  }

  if (phase === "success" && submittedReview) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 p-8 text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
          className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-200"
        >
          <CheckCircle className="w-8 h-8 text-white" />
        </motion.div>
        <h3 className="text-lg font-bold text-emerald-900">Review Submitted!</h3>
        <p className="text-sm text-emerald-700 mt-1">
          Your {submittedReview.overallRating}-star review for <strong>{caregiverName}</strong> is live.
        </p>
        <div className="flex justify-center gap-1 mt-3">
          {[1, 2, 3, 4, 5].map((n) => (
            <Star
              key={n}
              className={`w-5 h-5 ${n <= submittedReview.overallRating ? "fill-amber-400 text-amber-400" : "text-slate-200 fill-slate-200"}`}
            />
          ))}
        </div>
      </motion.div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
      <div className="h-1 bg-gradient-to-r from-primary-500 via-violet-500 to-pink-500" />
      <div className="p-6 space-y-5">
        {/* Caregiver header */}
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full overflow-hidden bg-slate-100 shrink-0">
            {caregiverAvatar ? (
              <img src={caregiverAvatar} alt={caregiverName} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-lg font-bold text-slate-400">
                {caregiverName[0]}
              </div>
            )}
          </div>
          <div>
            <p className="font-bold text-slate-900">{caregiverName}</p>
            <p className="text-xs text-slate-500">
              {serviceType?.replace(/_/g, " ")} · Share your experience
            </p>
          </div>
          {!isOnline && (
            <span className="ml-auto flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs text-amber-700 font-medium">
              <RefreshCw className="w-3 h-3" /> Offline — queued
            </span>
          )}
        </div>

        {/* Overall */}
        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-2">
            Overall Rating *
          </label>
          <StarRow
            value={rating} hover={hover}
            onRate={setRating} onHover={setHover}
          />
          {rating > 0 && (
            <p className="text-xs text-slate-400 mt-1 ml-0.5">
              {["", "Poor", "Fair", "Good", "Very Good", "Excellent"][rating]}
            </p>
          )}
        </div>

        {/* Category ratings */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block">
            Category Ratings <span className="text-slate-300 normal-case font-normal">(optional)</span>
          </label>
          {Object.keys(catRatings).map((cat) => {
            const label = {
              punctuality: "Punctuality",
              professionalism: "Professionalism",
              communication: "Communication",
              qualityOfCare: "Quality of Care",
              valueForMoney: "Value for Money",
            }[cat];

            return (
              <StarRow
                key={cat}
                size="sm"
                {...(label ? { label } : {})}
                value={catRatings[cat as keyof typeof catRatings]}
                hover={catHover[cat] ?? 0}
                onRate={(n) => setCatRatings((c) => ({ ...c, [cat]: n }))}
                onHover={(n) => setCatHover((h) => ({ ...h, [cat]: n }))}
              />
            );
          })}
        </div>

        {/* Title */}
        <input
          type="text"
          maxLength={100}
          placeholder="Review title (optional)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm placeholder-slate-400 text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-400"
        />

        {/* Comment */}
        <div>
          <textarea
            rows={4}
            maxLength={2000}
            placeholder="Describe your experience (min 10 characters)…"
            value={comment}
            onChange={(e) => { setComment(e.target.value); if (error) setError(""); }}
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm placeholder-slate-400 text-slate-900 resize-none focus:outline-none focus:ring-2 focus:ring-primary-400"
          />
          <p className="text-right text-xs text-slate-400 mt-0.5">{comment.length}/2000</p>
        </div>

        {/* Media */}
        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-2">
            Photos / Videos <span className="text-slate-300 normal-case font-normal">(max 6)</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {previews.map((src, i) => (
              <div key={i} className="relative h-14 w-14 rounded-xl overflow-hidden bg-slate-100 shrink-0">
                <img src={src} alt="" className="h-full w-full object-cover" />
                <button
                  onClick={() => removeFile(i)}
                  className="absolute top-0.5 right-0.5 rounded-full bg-black/60 p-0.5 text-white"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>
            ))}
            {files.length < 6 && (
              <label className="flex h-14 w-14 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 text-slate-400 hover:border-primary-400 hover:text-primary-500 transition-colors shrink-0">
                <Image className="w-4 h-4" />
                <input type="file" accept="image/*,video/mp4,video/webm" multiple onChange={addFiles} className="sr-only" />
              </label>
            )}
          </div>
        </div>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-3 text-sm text-rose-700"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Submit */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSubmit}
          disabled={submitting || rating === 0}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary-600 to-violet-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-primary-200 hover:from-primary-700 hover:to-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {submitting
            ? <><Loader2 className="w-4 h-4 animate-spin" />Submitting…</>
            : <><Send className="w-4 h-4" />Submit Review</>
          }
        </motion.button>
      </div>
    </div>
  );
}

export default PremiumReviewPanel;
