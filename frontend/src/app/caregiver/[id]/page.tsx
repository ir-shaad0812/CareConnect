"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { Logo } from "@/components/ui/Logo";
import { caregiverService, type Caregiver } from "@/services";
import { authService } from "@/modules/auth/services";
import { reviewService, type Review } from "@/services/api/review.service";
import { useSocket } from "@/context/SocketContext";
import { OnlineStatusBadge } from "@/components/ui/OnlineStatusBadge";
import type { User } from "@/types";

export default function CaregiverProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { socket } = useSocket();
  const [caregiver, setCaregiver] = useState<Caregiver | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [averageRating, setAverageRating] = useState(0);
  const [averageTotalReviews, setAverageTotalReviews] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isReviewsLoading, setIsReviewsLoading] = useState(true);
  const [error, setError] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const revieweeUserId =
    (caregiver as (Caregiver & { userId?: string }) | null)?.userId || "";

  const fetchCaregiver = useCallback(async () => {
    try {
      setIsLoading(true);
      setError("");

      const response = await caregiverService.getCaregiverProfile(params.id as string);

      if (!response.success) {
        throw new Error("Failed to fetch caregiver");
      }

      setCaregiver(response.data?.caregiver || null);
    } catch (err) {
      console.error("Error fetching caregiver:", err);
      setError(err instanceof Error ? err.message : "Failed to load caregiver profile");
    } finally {
      setIsLoading(false);
    }
  }, [params.id]);

  const fetchReviews = useCallback(async (revieweeId: string) => {
    try {
      setIsReviewsLoading(true);
      const response = await reviewService.getUserReviews(revieweeId, {
        page: 1,
        limit: 6,
        sortBy: "newest",
      });

      if (response.success && response.data) {
        setReviews(response.data.reviews || []);

        const avg = response.data.averageRatings as {
          overall?: number;
          totalReviews?: number;
          averageOverall?: number;
        };

        setAverageRating(avg?.overall ?? avg?.averageOverall ?? 0);
        setAverageTotalReviews(avg?.totalReviews ?? response.data.pagination?.total ?? 0);
      }
    } catch {
      setReviews([]);
      setAverageRating(caregiver?.rating || 0);
      setAverageTotalReviews(caregiver?.totalReviews || 0);
    } finally {
      setIsReviewsLoading(false);
    }
  }, [caregiver?.rating, caregiver?.totalReviews]);

  useEffect(() => {
    // Check if user is logged in
    const storedUser = authService.getCurrentUser();
    setUser(storedUser);
  }, []);

  useEffect(() => {
    if (params.id) {
      fetchCaregiver();
    }
  }, [params.id, fetchCaregiver]);

  useEffect(() => {
    if (!revieweeUserId) return;
    fetchReviews(revieweeUserId);
  }, [revieweeUserId, fetchReviews]);

  useEffect(() => {
    if (!params.id || !revieweeUserId) return;

    const refreshInterval = setInterval(() => {
      fetchCaregiver();
      fetchReviews(revieweeUserId);
    }, 45000);

    return () => clearInterval(refreshInterval);
  }, [params.id, revieweeUserId, fetchCaregiver, fetchReviews]);

  useEffect(() => {
    const revieweeId = revieweeUserId;
    if (!socket || !revieweeId) return;

    socket.emit("subscribe_caregiver_reviews", revieweeId);

    const handleReviewUpdate = (payload: { revieweeId?: string }) => {
      if (payload?.revieweeId !== revieweeId) return;
      fetchCaregiver();
      fetchReviews(revieweeId);
    };

    socket.on("review:changed", handleReviewUpdate);
    socket.on("review:media_updated", handleReviewUpdate);
    socket.on("review:new", handleReviewUpdate);

    return () => {
      socket.emit("unsubscribe_caregiver_reviews", revieweeId);
      socket.off("review:changed", handleReviewUpdate);
      socket.off("review:media_updated", handleReviewUpdate);
      socket.off("review:new", handleReviewUpdate);
    };
  }, [socket, revieweeUserId, fetchCaregiver, fetchReviews]);

  const getMemberSince = (dateString?: string) => {
    if (!dateString) return "Unknown";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  };

  const formatNPR = (amount: number): string => `NPR ${amount.toLocaleString()}`;

  const getReviewMediaPreview = (review: Review) => {
    if (review.media && review.media.length > 0) {
      return review.media;
    }

    return (review.photos || [])
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
      .filter((media): media is { mediaType: "image"; url: string; publicId: string } => Boolean(media));
  };

  const trustRating = averageRating || caregiver?.rating || 0;
  const trustReviewCount = averageTotalReviews || caregiver?.totalReviews || 0;
  const trustedFamilies =
    (caregiver as (Caregiver & { completedJobs?: number }) | null)?.completedJobs || 0;
  const featuredReviewMedia = reviews.flatMap((review) => getReviewMediaPreview(review)).slice(0, 6);

  const dashboardHref = user?.role === "admin" ? "/admin/dashboard" : "/dashboard";

  const getAvailabilityStatus = (): { available: boolean; label: string; timeLabel: string } => {
    if (!caregiver?.availability?.days?.length) {
      return { available: false, label: "Availability Not Set", timeLabel: "" };
    }
    const now = new Date();
    const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const today = dayNames[now.getDay()];
    const availDays = (caregiver.availability.days || []).map((d: string) => d.toLowerCase());
    if (!availDays.includes(today)) {
      return { available: false, label: "Not Available Today", timeLabel: "" };
    }
    const start = caregiver.availability.hours?.start;
    const end = caregiver.availability.hours?.end;
    if (!start || !end) {
      return { available: true, label: "Available Today", timeLabel: "" };
    }
    const [sh, sm] = start.split(":").map(Number);
    const [eh, em] = end.split(":").map(Number);
    const startMins = sh * 60 + (sm || 0);
    const endMins = eh * 60 + (em || 0);
    const currentMins = now.getHours() * 60 + now.getMinutes();
    if (currentMins >= startMins && currentMins <= endMins) {
      return { available: true, label: "Available Now", timeLabel: `${start} \u2013 ${end}` };
    }
    if (currentMins < startMins) {
      return { available: false, label: "Not Available Right Now", timeLabel: `Available from ${start} today` };
    }
    return { available: false, label: "Not Available Right Now", timeLabel: `Working hours: ${start}\u2013${end}` };
  };

  const availStatus = getAvailabilityStatus();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-[#39B54A]/5 via-white to-[#39B54A]/5 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#39B54A] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400 font-medium">Loading profile&hellip;</p>
        </div>
      </div>
    );
  }

  if (error || !caregiver) {
    return (
      <div className="min-h-screen bg-linear-to-br from-[#39B54A]/5 via-white to-[#39B54A]/5">
        <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200/60 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <Link href="/home" className="flex items-center gap-2.5">
                <Logo variant="default" showText asLink={false} />
              </Link>
            </div>
          </div>
        </header>
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <div className="bg-white rounded-2xl p-12 shadow-xl border border-slate-100 max-w-sm mx-auto">
            <div className="text-5xl mb-4">\ud83d\ude14</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Caregiver Not Found</h1>
            <p className="text-gray-400 mb-6 text-sm">{error || "This caregiver doesn't exist or is no longer available."}</p>
            <Link href="/caregivers" className="inline-flex items-center gap-2 px-6 py-3 bg-[#39B54A] text-white rounded-xl hover:bg-[#2d913c] transition-all font-semibold shadow-md shadow-[#39B54A]/30">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              Browse Caregivers
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-[#39B54A]/5 via-white to-[#39B54A]/5">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200/60 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Logo variant="default" showText href="/home" />
            <nav className="hidden md:flex items-center gap-8">
              <Link href="/home" className="text-sm font-medium text-gray-500 hover:text-primary-500 transition-colors">Home</Link>
              <Link href="/caregivers" className="text-sm font-medium text-gray-500 hover:text-primary-500 transition-colors">Find Caregivers</Link>
            </nav>
            <div className="flex items-center gap-3">
              {user ? (
                <>
                  <Link href={dashboardHref} className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-primary-500 transition-colors">
                    Dashboard
                  </Link>
                  {user.role === "admin" && (
                    <Link href="/admin/dashboard" className="px-5 py-2 bg-[#39B54A] hover:bg-[#2d913c] text-white text-sm font-semibold rounded-xl transition-all shadow-sm hover:shadow-[#39B54A]/30">
                      Admin Panel
                    </Link>
                  )}
                </>
              ) : (
                <>
                  <Link href="/login" className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-primary-500 transition-colors">Login</Link>
                  <Link href="/caregivers" className="px-5 py-2 bg-[#39B54A] hover:bg-[#2d913c] text-white text-sm font-semibold rounded-xl transition-all shadow-sm hover:shadow-[#39B54A]/30">Sign Up</Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-500 hover:text-[#39B54A] mb-6 transition-colors text-sm font-medium">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          Back to Caregivers
        </button>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-5">

            {/* Hero Card */}
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-slate-100">
              <div className="h-32 bg-linear-to-r from-[#39B54A] via-[#4ac95c] to-[#81BC89] relative">
                <div className="absolute top-4 right-6 w-24 h-24 rounded-full bg-white/10" />
                <div className="absolute -top-2 right-16 w-14 h-14 rounded-full bg-white/10" />
              </div>
              <div className="px-6 pb-6">
                <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-12 mb-5">
                  <div className="relative inline-block shrink-0">
                    <div className={`w-24 h-24 rounded-2xl border-4 shadow-lg flex items-center justify-center overflow-hidden bg-white ${availStatus.available ? "border-emerald-400" : "border-slate-200"}`}>
                      {caregiver.avatar ? (
                        <Image src={caregiver.avatar} alt={caregiver.fullName} width={96} height={96} className="object-cover w-full h-full" />
                      ) : (
                        <span className="text-3xl font-bold text-[#39B54A]">{caregiver.fullName?.charAt(0)?.toUpperCase()}</span>
                      )}
                    </div>
                    {/* Real-time online/offline presence dot */}
                    <OnlineStatusBadge
                      userId={revieweeUserId || (caregiver as unknown as { _id?: string })?._id}
                      position="bottom-right"
                      size="md"
                    />
                  </div>
                  <div className="flex-1 min-w-0 sm:pb-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h1 className="text-2xl font-extrabold text-gray-900">{caregiver.fullName}</h1>
                      {caregiver.isEmailVerified && (
                        <svg className="w-5 h-5 text-[#39B54A] shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      )}
                      {/* Real-time online/offline label */}
                      <OnlineStatusBadge
                        userId={revieweeUserId || (caregiver as unknown as { _id?: string })?._id}
                        showLabel
                        size="xs"
                      />
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${availStatus.available ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${availStatus.available ? "bg-emerald-500" : "bg-slate-400"}`} />
                        {availStatus.label}
                      </span>
                    </div>
                    {availStatus.timeLabel && <p className="text-xs text-gray-400 mb-1">{availStatus.timeLabel}</p>}
                    <p className="text-gray-400 text-sm">
                      {caregiver.location?.city || "Location not specified"}
                      {caregiver.location?.state && `, ${caregiver.location.state}`}
                    </p>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { value: caregiver.rating ? caregiver.rating.toFixed(1) : "N/A", label: "Rating", star: true },
                    { value: caregiver.totalReviews || 0, label: "Reviews", star: false },
                    { value: `${caregiver.experience || 0} yrs`, label: "Experience", star: false },
                    { value: caregiver.hourlyRate ? formatNPR(caregiver.hourlyRate) : "Ask", label: "Per Hour", star: false },
                  ].map((stat) => (
                    <div key={stat.label} className="text-center p-3 bg-[#39B54A]/5 rounded-xl border border-[#39B54A]/10">
                      <div className="flex items-center justify-center gap-1 mb-0.5 font-extrabold text-[#39B54A]">
                        {stat.star && <svg className="w-3.5 h-3.5 text-yellow-400 fill-current" viewBox="0 0 20 20"><path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" /></svg>}
                        <span className="text-sm leading-tight">{stat.value}</span>
                      </div>
                      <p className="text-xs text-gray-400">{stat.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Trust Snapshot */}
            <div className="bg-white rounded-2xl shadow-md p-6 border border-slate-100">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-gray-900">Trust Snapshot</h2>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
                  Verified Reviews
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-xl border border-amber-100 bg-amber-50">
                  <p className="text-xs text-amber-700 font-semibold mb-1">Average Rating</p>
                  <p className="text-2xl font-extrabold text-amber-700">
                    {trustRating > 0 ? trustRating.toFixed(1) : "N/A"}
                  </p>
                  <div className="flex items-center gap-0.5 mt-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <svg key={i} className={`w-3.5 h-3.5 ${i <= Math.round(trustRating) ? "text-amber-400" : "text-amber-200"}`} fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                    ))}
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-blue-100 bg-blue-50">
                  <p className="text-xs text-blue-700 font-semibold mb-1">Verified Reviews</p>
                  <p className="text-2xl font-extrabold text-blue-700">{trustReviewCount}</p>
                  <p className="text-xs text-blue-600 mt-1">Only after completed &amp; fully paid bookings</p>
                </div>

                <div className="p-3 rounded-xl border border-emerald-100 bg-emerald-50">
                  <p className="text-xs text-emerald-700 font-semibold mb-1">Trusted Families</p>
                  <p className="text-2xl font-extrabold text-emerald-700">{trustedFamilies}</p>
                  <p className="text-xs text-emerald-600 mt-1">Completed care jobs</p>
                </div>
              </div>
            </div>

            {/* Review Media Gallery */}
            {featuredReviewMedia.length > 0 && (
              <div className="bg-white rounded-2xl shadow-md p-6 border border-slate-100">
                <h2 className="text-base font-bold text-gray-900 mb-3">Trusted Moments</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {featuredReviewMedia.map((media, index) => (
                    <div key={`${media.publicId || media.url}-${index}`} className="rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
                      {media.mediaType === "video" ? (
                        <video src={media.url} controls preload="metadata" className="w-full h-32 object-cover bg-black" />
                      ) : (
                        <Image
                          src={media.url}
                          alt={`Review media ${index + 1}`}
                          width={320}
                          height={128}
                          className="w-full h-32 object-cover"
                          unoptimized
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Reviews */}
            <div className="bg-white rounded-2xl shadow-md p-6 border border-slate-100">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-bold text-gray-900">Recent Verified Reviews</h2>
                {isReviewsLoading && <span className="text-xs text-gray-400">Updating...</span>}
              </div>

              {reviews.length === 0 ? (
                <p className="text-sm text-gray-400 italic">No reviews yet for this caregiver.</p>
              ) : (
                <div className="space-y-3">
                  {reviews.map((review) => {
                    const reviewerName =
                      typeof review.reviewerId === "string"
                        ? "Verified Careseeker"
                        : review.reviewerId.fullName || "Verified Careseeker";

                    return (
                      <div key={review._id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <div className="flex items-center justify-between gap-3 mb-1">
                          <p className="text-sm font-semibold text-gray-800">{reviewerName}</p>
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((i) => (
                              <svg key={i} className={`w-3.5 h-3.5 ${i <= review.overallRating ? "text-amber-400" : "text-slate-300"}`} fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                            ))}
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-3">{review.comment}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* About */}
            <div className="bg-white rounded-2xl shadow-md p-6 border border-slate-100">
              <h2 className="text-base font-bold text-gray-900 mb-3">About</h2>
              <p className="text-gray-600 leading-relaxed text-sm">{caregiver.bio || "No bio provided."}</p>
            </div>

            {/* Skills */}
            {caregiver.skills && caregiver.skills.length > 0 && (
              <div className="bg-white rounded-2xl shadow-md p-6 border border-slate-100">
                <h2 className="text-base font-bold text-gray-900 mb-3">Skills &amp; Expertise</h2>
                <div className="flex flex-wrap gap-2">
                  {caregiver.skills.map((skill: string) => (
                    <span key={skill} className="px-3 py-1.5 bg-[#39B54A]/10 text-[#2d913c] border border-[#39B54A]/20 rounded-full text-xs font-semibold">{skill}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Service Types */}
            {caregiver.serviceTypes && caregiver.serviceTypes.length > 0 && (
              <div className="bg-white rounded-2xl shadow-md p-6 border border-slate-100">
                <h2 className="text-base font-bold text-gray-900 mb-3">Services Offered</h2>
                <div className="flex flex-wrap gap-2">
                  {caregiver.serviceTypes.map((type: string) => (
                    <span key={type} className="px-3 py-1.5 bg-[#39B54A]/10 text-[#2d913c] border border-[#39B54A]/20 rounded-full text-xs font-semibold capitalize">{type.replace(/_/g, " ")}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Certifications */}
            {caregiver.certifications && caregiver.certifications.length > 0 && (
              <div className="bg-white rounded-2xl shadow-md p-6 border border-slate-100">
                <h2 className="text-base font-bold text-gray-900 mb-4">Certifications</h2>
                <div className="space-y-3">
                  {caregiver.certifications.map((cert: { name?: string; issuer?: string; verified?: boolean } | string, index: number) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center shrink-0">
                        <svg className="w-4 h-4 text-emerald-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-800 text-sm">{typeof cert === "string" ? cert : cert.name}</p>
                        {typeof cert !== "string" && cert.issuer && <p className="text-xs text-gray-400 mt-0.5">Issued by {cert.issuer}</p>}
                      </div>
                      {typeof cert !== "string" && cert.verified && (
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full shrink-0">Verified</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Availability */}
            <div className="bg-white rounded-2xl shadow-md p-6 border border-slate-100">
              <h2 className="text-base font-bold text-gray-900 mb-4">Availability</h2>
              <div className={`flex items-center gap-3 p-3.5 rounded-xl mb-4 ${availStatus.available ? "bg-emerald-50 border border-emerald-100" : "bg-slate-50 border border-slate-200"}`}>
                <span className={`w-3 h-3 rounded-full shrink-0 ${availStatus.available ? "bg-emerald-400" : "bg-slate-400"}`} />
                <div>
                  <p className={`text-sm font-bold ${availStatus.available ? "text-emerald-700" : "text-slate-600"}`}>{availStatus.label}</p>
                  {availStatus.timeLabel && <p className="text-xs text-gray-400 mt-0.5">{availStatus.timeLabel}</p>}
                </div>
              </div>
              {caregiver.availability?.days && caregiver.availability.days.length > 0 ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Working Days</p>
                    <div className="flex flex-wrap gap-2">
                      {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, i) => {
                        const fullDays = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
                        const isAvail = caregiver.availability?.days?.map((d: string) => d.toLowerCase()).includes(fullDays[i]);
                        return (
                          <span key={day} className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold ${isAvail ? "bg-[#39B54A] text-white shadow-sm shadow-[#39B54A]/30" : "bg-slate-100 text-slate-400"}`}>{day.slice(0, 2)}</span>
                        );
                      })}
                    </div>
                  </div>
                  {caregiver.availability?.hours?.start && caregiver.availability?.hours?.end && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Working Hours</p>
                      <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-xl border border-slate-200 text-sm font-semibold text-gray-700">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        {caregiver.availability.hours.start} &ndash; {caregiver.availability.hours.end}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-gray-400 text-sm italic">Availability schedule not specified</p>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-5">
            <div className="bg-white rounded-2xl shadow-xl border border-slate-100 sticky top-24 overflow-hidden">
              <div className="bg-linear-to-br from-[#39B54A] to-[#2d913c] px-5 py-4 text-center">
                {caregiver.hourlyRate ? (
                  <>
                    <p className="text-blue-200 text-xs font-semibold uppercase tracking-widest mb-1">Starting From</p>
                    <p className="text-3xl font-extrabold text-white">{formatNPR(caregiver.hourlyRate)}</p>
                    <p className="text-blue-200 text-sm">per hour</p>
                  </>
                ) : (
                  <p className="text-white font-semibold">Contact for pricing</p>
                )}
              </div>
              <div className="p-5">
                {(caregiver.hourlyRate || caregiver.dailyRate || caregiver.weeklyRate || caregiver.monthlyRate) && (
                  <div className="mb-4 space-y-2 text-sm">
                    {caregiver.hourlyRate && (
                      <div className="flex justify-between items-center py-1.5 border-b border-slate-50">
                        <span className="text-gray-500">Per Hour</span>
                        <span className="font-bold text-gray-800">{formatNPR(caregiver.hourlyRate)}</span>
                      </div>
                    )}
                    {caregiver.dailyRate && (
                      <div className="flex justify-between items-center py-1.5 border-b border-slate-50">
                        <span className="text-gray-500">Per Day</span>
                        <span className="font-bold text-gray-800">{formatNPR(caregiver.dailyRate)}</span>
                      </div>
                    )}
                    {caregiver.weeklyRate && (
                      <div className="flex justify-between items-center py-1.5 border-b border-slate-50">
                        <span className="text-gray-500">Per Week</span>
                        <span className="font-bold text-gray-800">{formatNPR(caregiver.weeklyRate)}</span>
                      </div>
                    )}
                    {caregiver.monthlyRate && (
                      <div className="flex justify-between items-center py-1.5">
                        <span className="text-gray-500">Per Month</span>
                        <span className="font-bold text-gray-800">{formatNPR(caregiver.monthlyRate)}</span>
                      </div>
                    )}
                  </div>
                )}

                <div className={`flex items-center gap-2 p-2.5 rounded-lg mb-4 text-xs font-semibold ${availStatus.available ? "bg-emerald-50 text-emerald-700" : "bg-slate-50 text-slate-500"}`}>
                  <span className={`w-2 h-2 rounded-full shrink-0 ${availStatus.available ? "bg-emerald-400" : "bg-slate-400"}`} />
                  {availStatus.label}
                  {availStatus.timeLabel && <span className="text-gray-400 font-normal ml-auto">{availStatus.timeLabel}</span>}
                </div>

                {user?.role === "careseeker" ? (
                  <Link href={`/book/${caregiver._id}`} className="block w-full py-3 bg-linear-to-r from-[#39B54A] to-[#2d913c] text-white text-center font-bold rounded-xl hover:from-[#2d913c] hover:to-[#39B54A] transition-all shadow-md hover:shadow-[#39B54A]/30 mb-3 text-sm">
                    Book Now
                  </Link>
                ) : user?.role === "caregiver" ? (
                  <div className="w-full py-3 bg-slate-100 text-slate-400 text-center font-semibold rounded-xl mb-3 cursor-not-allowed text-sm">Caregivers cannot book</div>
                ) : (
                  <Link href={`/login?redirect=/book/${caregiver._id}`} className="block w-full py-3 bg-linear-to-r from-[#39B54A] to-[#2d913c] text-white text-center font-bold rounded-xl hover:from-[#2d913c] hover:to-[#39B54A] transition-all shadow-md hover:shadow-[#39B54A]/30 mb-3 text-sm">
                    Book Now
                  </Link>
                )}
                <Link href={user ? `/message/${caregiver._id}` : `/login?redirect=/message/${caregiver._id}`} className="block w-full py-3 border-2 border-[#39B54A] text-[#39B54A] text-center font-semibold rounded-xl hover:bg-[#39B54A]/5 transition-all text-sm">
                  Send Message
                </Link>

                <div className="mt-5 pt-5 border-t border-slate-100 space-y-3 text-sm">
                  {caregiver.languages && caregiver.languages.length > 0 && (
                    <div className="flex items-start gap-3">
                      <svg className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" /></svg>
                      <div>
                        <p className="text-xs text-gray-400">Languages</p>
                        <p className="font-medium text-gray-700">{caregiver.languages.join(", ")}</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-start gap-3">
                    <svg className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    <div>
                      <p className="text-xs text-gray-400">Member Since</p>
                      <p className="font-medium text-gray-700">{getMemberSince(caregiver.createdAt)}</p>
                    </div>
                  </div>
                  {caregiver.isEmailVerified && (
                    <div className="flex items-start gap-3">
                      <svg className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                      <div>
                        <p className="text-xs text-gray-400">Verification</p>
                        <p className="font-semibold text-emerald-600">Email Verified</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-amber-50 rounded-2xl p-5 border border-amber-100">
              <h3 className="font-bold text-amber-800 mb-3 flex items-center gap-2 text-sm">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                Safety Tips
              </h3>
              <ul className="text-xs text-amber-700 space-y-1.5">
                <li className="flex items-start gap-1.5"><span className="text-amber-500 font-bold mt-0.5">&bull;</span>Always meet in person or via video call first</li>
                <li className="flex items-start gap-1.5"><span className="text-amber-500 font-bold mt-0.5">&bull;</span>Check references before hiring</li>
                <li className="flex items-start gap-1.5"><span className="text-amber-500 font-bold mt-0.5">&bull;</span>Never share financial information directly</li>
                <li className="flex items-start gap-1.5"><span className="text-amber-500 font-bold mt-0.5">&bull;</span>Report any suspicious activity</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
