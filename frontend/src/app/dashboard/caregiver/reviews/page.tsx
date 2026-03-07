"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Star,
  StarHalf,
  MessageSquare,
  RefreshCw,
  AlertTriangle,
  ThumbsUp,
  Calendar,
  TrendingUp,
  Award,
  Filter,
} from "lucide-react";
import CaregiverLayout from "../components/CaregiverLayout";
import { useAuthContext } from "@/context/AuthContext";
import { reviewService } from "@/services";
import { extractStatusCode } from "@/types/errors.types";
import type {
  Review,
  AverageRatings,
  ReviewListResponse,
} from "@/services/api/review.service";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr?: string): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatServiceType(type?: string): string {
  if (!type) return "General Care";
  return type
    .replace(/_/g, " ")
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function getInitials(name?: string): string {
  if (!name) return "?";
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

// ─── Star Rating Display ──────────────────────────────────────────────────────

interface StarRatingProps {
  value: number;
  size?: "sm" | "md" | "lg";
  showValue?: boolean;
}

function StarRating({
  value,
  size = "md",
  showValue = false,
}: StarRatingProps) {
  const sizeClass =
    size === "sm" ? "w-3 h-3" : size === "lg" ? "w-6 h-6" : "w-4 h-4";
  const stars = Array.from({ length: 5 }, (_, i) => {
    const filled = value >= i + 1;
    const half = !filled && value >= i + 0.5;
    return { filled, half };
  });

  return (
    <div className="flex items-center gap-0.5">
      {stars.map((s, i) => (
        <span key={i} className="relative">
          {s.filled ? (
            <Star className={`${sizeClass} text-amber-400 fill-amber-400`} />
          ) : s.half ? (
            <StarHalf
              className={`${sizeClass} text-amber-400 fill-amber-400`}
            />
          ) : (
            <Star className={`${sizeClass} text-gray-200 fill-gray-200`} />
          )}
        </span>
      ))}
      {showValue && (
        <span className="ml-1.5 text-sm font-semibold text-gray-700">
          {value.toFixed(1)}
        </span>
      )}
    </div>
  );
}

// ─── Rating Bar ───────────────────────────────────────────────────────────────

interface RatingBarProps {
  label: string;
  value: number;
  color?: string;
}

function RatingBar({ label, value, color = "bg-[#39B54A]" }: RatingBarProps) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-500 w-28 shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${(value / 5) * 100}%` }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className={`h-full rounded-full ${color}`}
        />
      </div>
      <span className="text-xs font-semibold text-gray-700 w-8 text-right">
        {value > 0 ? value.toFixed(1) : "—"}
      </span>
    </div>
  );
}

// ─── Distribution Bar (1-5 stars) ────────────────────────────────────────────

interface DistributionBarProps {
  star: number;
  count: number;
  total: number;
}

function DistributionBar({ star, count, total }: DistributionBarProps) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500 w-4 text-right">{star}</span>
      <Star className="w-3 h-3 text-amber-400 fill-amber-400 shrink-0" />
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="h-full rounded-full bg-amber-400"
        />
      </div>
      <span className="text-xs text-gray-400 w-6 text-right">{count}</span>
    </div>
  );
}

// ─── Review Card ──────────────────────────────────────────────────────────────

interface ReviewCardProps {
  review: Review;
}

function ReviewCard({ review }: ReviewCardProps) {
  const [expanded, setExpanded] = useState(false);
  const reviewerName =
    typeof review.reviewerId === "object" && review.reviewerId !== null
      ? ((review.reviewerId as { fullName?: string }).fullName ?? "Anonymous")
      : "Anonymous";
  const reviewerAvatar =
    typeof review.reviewerId === "object" && review.reviewerId !== null
      ? (review.reviewerId as { avatar?: string }).avatar
      : undefined;

  const overallRating = review.overallRating ?? 0;

  const comment = review.comment ?? "";
  const isLong = comment.length > 200;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-gray-200 rounded-2xl p-5 hover:shadow-md transition-shadow"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          {reviewerAvatar ? (
            <img
              src={reviewerAvatar}
              alt={reviewerName}
              className="w-10 h-10 rounded-full object-cover border-2 border-gray-100"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-linear-to-br from-[#39B54A]/20 to-[#39B54A]/40 flex items-center justify-center text-sm font-bold text-[#39B54A] border-2 border-[#39B54A]/20">
              {getInitials(reviewerName)}
            </div>
          )}

          <div>
            <p className="text-sm font-semibold text-gray-800">
              {reviewerName}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Calendar className="w-3 h-3 text-gray-400" />
              <span className="text-xs text-gray-400">
                {formatDate(review.createdAt)}
              </span>
              {review.serviceType && (
                <>
                  <span className="text-gray-300">·</span>
                  <span className="text-xs text-[#39B54A] font-medium">
                    {formatServiceType(review.serviceType)}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Rating */}
        <div className="text-right shrink-0">
          <StarRating value={overallRating} size="sm" />
          <p className="text-xs font-bold text-gray-700 mt-0.5">
            {overallRating.toFixed(1)} / 5.0
          </p>
        </div>
      </div>

      {/* Comment */}
      {comment && (
        <div className="mb-4">
          <p
            className={`text-sm text-gray-600 leading-relaxed ${!expanded && isLong ? "line-clamp-3" : ""}`}
          >
            &ldquo;{comment}&rdquo;
          </p>
          {isLong && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-xs text-[#39B54A] hover:underline mt-1 font-medium"
            >
              {expanded ? "Show less" : "Read more"}
            </button>
          )}
        </div>
      )}

      {/* Rating breakdown (if subcategory ratings exist) */}
      {review.ratings &&
        Object.entries(review.ratings).filter(([, v]) => typeof v === "number")
          .length > 0 && (
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mb-4 p-3 bg-gray-50 rounded-xl">
            {Object.entries(review.ratings).map(([key, val]) => (
              <div
                key={key}
                className="flex items-center justify-between gap-2"
              >
                <span className="text-xs text-gray-500 capitalize">
                  {key.replace(/([A-Z])/g, " $1").trim()}
                </span>
                <div className="flex items-center gap-1">
                  <StarRating
                    value={typeof val === "number" ? val : 0}
                    size="sm"
                  />
                </div>
              </div>
            ))}
          </div>
        )}

      {/* Helpful indicator */}
      {typeof review.helpful?.count === "number" &&
        review.helpful.count > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-gray-400 pt-3 border-t border-gray-100">
            <ThumbsUp className="w-3.5 h-3.5" />
            <span>
              {review.helpful.count}{" "}
              {review.helpful.count === 1 ? "person" : "people"} found this
              helpful
            </span>
          </div>
        )}

      {/* Verified badge */}
      {review.reviewType === "verified" && (
        <div className="flex items-center gap-1.5 mt-2">
          <Award className="w-3 h-3 text-[#39B54A]" />
          <span className="text-xs text-[#39B54A] font-medium">
            Verified booking review
          </span>
        </div>
      )}
    </motion.div>
  );
}

// ─── Summary Panel ────────────────────────────────────────────────────────────

interface SummaryPanelProps {
  averageRatings: AverageRatings | undefined;
  totalReviews: number;
  distribution: Record<number, number>;
}

function SummaryPanel({
  averageRatings,
  totalReviews,
  distribution,
}: SummaryPanelProps) {
  const overall = averageRatings?.overall ?? 0;

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
      <div className="flex flex-col sm:flex-row gap-8">
        {/* Overall score */}
        <div className="text-center sm:border-r sm:border-gray-100 sm:pr-8 shrink-0">
          <p className="text-6xl font-black text-gray-900 leading-none">
            {overall > 0 ? overall.toFixed(1) : "—"}
          </p>
          <div className="flex justify-center mt-2">
            <StarRating value={overall} size="lg" />
          </div>
          <p className="text-sm text-gray-400 mt-2">
            {totalReviews} {totalReviews === 1 ? "review" : "reviews"}
          </p>
        </div>

        {/* Distribution */}
        <div className="flex-1 space-y-2">
          {[5, 4, 3, 2, 1].map((star) => (
            <DistributionBar
              key={star}
              star={star}
              count={distribution[star] ?? 0}
              total={totalReviews}
            />
          ))}
        </div>

        {/* Breakdown */}
        {averageRatings && (
          <div className="flex-1 space-y-2 sm:border-l sm:border-gray-100 sm:pl-8">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Category Breakdown
            </p>
            {(
              [
                { label: "Punctuality", key: "punctuality" },
                { label: "Professionalism", key: "professionalism" },
                { label: "Communication", key: "communication" },
                { label: "Quality of Care", key: "qualityOfCare" },
                { label: "Value for Money", key: "valueForMoney" },
              ] as { label: string; key: keyof AverageRatings }[]
            ).map(({ label, key }) => {
              const val =
                typeof averageRatings[key] === "number"
                  ? (averageRatings[key] as number)
                  : 0;
              return <RatingBar key={key} label={label} value={val} />;
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="text-center py-20 bg-white border border-gray-200 rounded-2xl">
      <div className="w-20 h-20 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
        <Star className="w-10 h-10 text-amber-300" />
      </div>
      <h3 className="text-lg font-semibold text-gray-800 mb-2">
        No reviews yet
      </h3>
      <p className="text-gray-500 text-sm max-w-xs mx-auto leading-relaxed">
        Once you complete bookings, care-seekers can leave you reviews. Keep
        delivering excellent care to build your reputation!
      </p>
    </div>
  );
}

// ─── Sort & Filter Controls ───────────────────────────────────────────────────

type SortOption = "newest" | "highest" | "lowest";

interface ControlsProps {
  sort: SortOption;
  onSortChange: (s: SortOption) => void;
  total: number;
}

function Controls({ sort, onSortChange, total }: ControlsProps) {
  return (
    <div className="flex items-center justify-between mb-5">
      <p className="text-sm text-gray-500">
        <span className="font-semibold text-gray-700">{total}</span>{" "}
        {total === 1 ? "review" : "reviews"} received
      </p>
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-gray-400" />
        <select
          value={sort}
          onChange={(e) => onSortChange(e.target.value as SortOption)}
          className="text-sm border border-gray-200 rounded-xl px-3 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#39B54A]/30 focus:border-[#39B54A] bg-white"
        >
          <option value="newest">Newest first</option>
          <option value="highest">Highest rated</option>
          <option value="lowest">Lowest rated</option>
        </select>
      </div>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function ReviewSkeleton() {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 animate-pulse">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 bg-gray-100 rounded-full shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-100 rounded w-1/3" />
          <div className="h-3 bg-gray-100 rounded w-1/2" />
        </div>
        <div className="h-4 bg-gray-100 rounded w-20" />
      </div>
      <div className="space-y-2">
        <div className="h-3 bg-gray-100 rounded" />
        <div className="h-3 bg-gray-100 rounded w-5/6" />
        <div className="h-3 bg-gray-100 rounded w-3/4" />
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CaregiverReviewsPage() {
  const router = useRouter();
  const { user: authUser, isLoading: isAuthLoading } = useAuthContext();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [averageRatings, setAverageRatings] = useState<
    AverageRatings | undefined
  >(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sort, setSort] = useState<SortOption>("newest");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalReviews, setTotalReviews] = useState(0);

  const LIMIT = 10;

  // ── Distribution from reviews ───────────────────────────────────────────────
  const distribution = reviews.reduce<Record<number, number>>((acc, r) => {
    const rating = Math.round(r.overallRating ?? 0);
    if (rating >= 1 && rating <= 5) {
      acc[rating] = (acc[rating] ?? 0) + 1;
    }
    return acc;
  }, {});

  // ── Load reviews ────────────────────────────────────────────────────────────
  const loadReviews = useCallback(async () => {
    if (!authUser) return;
    setIsLoading(true);
    setError(null);

    try {
      // Get reviews received by the current caregiver
      const userId =
        (authUser as unknown as { _id?: string; id?: string })._id ??
        (authUser as unknown as { id?: string }).id ??
        "";

      const sortMap: Record<
        SortOption,
        { sortBy: string; sortOrder: "asc" | "desc" }
      > = {
        newest: { sortBy: "createdAt", sortOrder: "desc" },
        highest: { sortBy: "overallRating", sortOrder: "desc" },
        lowest: { sortBy: "overallRating", sortOrder: "asc" },
      };

      const res = await reviewService.getUserReviews(userId, {
        page,
        limit: LIMIT,
        ...sortMap[sort],
        status: "published",
      });

      const data = res.data as
        | (ReviewListResponse & { averageRatings?: AverageRatings })
        | undefined;
      setReviews(data?.reviews ?? []);
      const total = data?.pagination?.total ?? 0;
      setTotalReviews(total);
      setTotalPages(Math.ceil(total / LIMIT) || 1);
      if (data?.averageRatings) {
        setAverageRatings(data.averageRatings);
      }
    } catch (err) {
      const statusCode = extractStatusCode(err);
      if (statusCode === 401) {
        router.replace("/login?redirect=/dashboard/caregiver/reviews");
        return;
      }

      if (statusCode === 403) {
        router.replace("/dashboard/pending");
        return;
      }

      setError(err instanceof Error ? err.message : "Failed to load reviews");
    } finally {
      setIsLoading(false);
    }
  }, [authUser, page, sort, router]);

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    if (!authUser) {
      setIsLoading(false);
      return;
    }

    if (authUser.role && authUser.role !== "caregiver") {
      setIsLoading(false);
      return;
    }

    void loadReviews();
  }, [isAuthLoading, authUser?._id, authUser?.role, router, loadReviews]);

  // ── Sorted reviews (client-side fallback if API doesn't sort) ───────────────
  const sortedReviews = [...reviews].sort((a, b) => {
    const rA = a.overallRating ?? 0;
    const rB = b.overallRating ?? 0;
    if (sort === "highest") return rB - rA;
    if (sort === "lowest") return rA - rB;
    // newest: by createdAt descending
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <CaregiverLayout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Reviews</h1>
            <p className="text-sm text-gray-500 mt-1">
              Reviews left by care-seekers after completed bookings
            </p>
          </div>
          {totalReviews > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-xl">
              <TrendingUp className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-semibold text-amber-700">
                {averageRatings?.overall
                  ? `${averageRatings.overall.toFixed(1)} avg`
                  : "New"}
              </span>
            </div>
          )}
        </div>

        {/* Summary Panel */}
        {!isLoading && totalReviews > 0 && (
          <SummaryPanel
            averageRatings={averageRatings}
            totalReviews={totalReviews}
            distribution={distribution}
          />
        )}

        {/* Sort / Filter Controls */}
        {!isLoading && totalReviews > 0 && (
          <Controls
            sort={sort}
            onSortChange={(s) => {
              setSort(s);
              setPage(1);
            }}
            total={totalReviews}
          />
        )}

        {/* Content */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <ReviewSkeleton key={i} />
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-16 bg-white border border-gray-200 rounded-2xl">
            <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              Failed to Load Reviews
            </h3>
            <p className="text-gray-500 text-sm mb-6">{error}</p>
            <button
              onClick={() => void loadReviews()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#39B54A] text-white rounded-xl text-sm font-medium hover:bg-primary-600 transition"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
          </div>
        ) : sortedReviews.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <div className="space-y-4">
              <AnimatePresence mode="popLayout">
                {sortedReviews.map((review) => (
                  <ReviewCard key={review._id} review={review} />
                ))}
              </AnimatePresence>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 text-sm font-medium border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  Previous
                </button>

                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  const pageNum =
                    totalPages <= 5
                      ? i + 1
                      : page <= 3
                        ? i + 1
                        : page >= totalPages - 2
                          ? totalPages - 4 + i
                          : page - 2 + i;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`w-9 h-9 text-sm font-medium rounded-xl transition ${
                        pageNum === page
                          ? "bg-[#39B54A] text-white shadow-sm"
                          : "border border-gray-200 text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 text-sm font-medium border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}

        {/* Tip */}
        {!isLoading && totalReviews > 0 && (
          <div className="mt-8 flex items-start gap-3 p-4 bg-[#39B54A]/5 border border-[#39B54A]/20 rounded-xl">
            <MessageSquare className="w-4 h-4 text-[#39B54A] mt-0.5 shrink-0" />
            <p className="text-sm text-[#39B54A]/80 leading-relaxed">
              <span className="font-semibold text-[#39B54A]">Pro tip:</span>{" "}
              Caregivers with 10+ verified reviews and a rating above 4.5 are
              eligible for the Featured Caregiver badge, boosting your
              visibility in search results.
            </p>
          </div>
        )}
      </div>
    </CaregiverLayout>
  );
}
