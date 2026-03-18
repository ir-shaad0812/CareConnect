"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowRight,
  BookOpenCheck,
  CalendarDays,
  CheckCircle2,
  Flag,
  LayoutDashboard,
  Loader2,
  MessageCircle,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { authService } from "@/modules/auth/services";
import {
  bookingService,
  type Booking,
  type BookingTrackingLog,
  type BookingTrackingResponse,
} from "@/modules/booking/services";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import type { User } from "@/types";

type ReviewAction = "approve" | "flag";

interface QuickActionItem {
  href: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  tintClass: string;
  iconClass: string;
}

const QUICK_ACTIONS: QuickActionItem[] = [
  {
    href: "/dashboard/careseeker",
    title: "Dashboard",
    description: "Back to overview and today widgets.",
    icon: LayoutDashboard,
    tintClass: "from-sky-50 to-sky-100/70 border-sky-100",
    iconClass: "text-sky-700 bg-sky-100",
  },
  {
    href: "/dashboard/bookings",
    title: "Bookings",
    description: "Open bookings and agreement statuses.",
    icon: BookOpenCheck,
    tintClass: "from-emerald-50 to-emerald-100/70 border-emerald-100",
    iconClass: "text-emerald-700 bg-emerald-100",
  },
  {
    href: "/messages",
    title: "Messages",
    description: "Jump into caregiver conversations.",
    icon: MessageCircle,
    tintClass: "from-violet-50 to-violet-100/70 border-violet-100",
    iconClass: "text-violet-700 bg-violet-100",
  },
  {
    href: "/dashboard/careseeker/wallet",
    title: "Wallet",
    description: "Review payments and wallet activity.",
    icon: Wallet,
    tintClass: "from-amber-50 to-amber-100/70 border-amber-100",
    iconClass: "text-amber-700 bg-amber-100",
  },
];

const formatDateLabel = (dateKey: string): string => {
  const date = new Date(`${dateKey}T00:00:00`);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const formatTimeLabel = (value?: string): string => {
  if (!value) return "-";
  return new Date(value).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getStatusPill = (log: BookingTrackingLog) => {
  if (log.reviewedByCareSeeker?.approved === true) {
    return "bg-emerald-100 text-emerald-700";
  }
  if (log.reviewedByCareSeeker?.approved === false || log.status === "FLAGGED") {
    return "bg-red-100 text-red-700";
  }
  if (log.status === "SUBMITTED") {
    return "bg-blue-100 text-blue-700";
  }
  if (log.missed) {
    return "bg-amber-100 text-amber-700";
  }
  return "bg-gray-100 text-gray-600";
};

const getStatusLabel = (log: BookingTrackingLog): string => {
  if (log.reviewedByCareSeeker?.approved === true) return "Approved";
  if (log.reviewedByCareSeeker?.approved === false) return "Flagged by you";
  if (log.status === "FLAGGED") return "Flagged";
  if (log.status === "SUBMITTED") return "Submitted";
  if (log.missed) return "Missed";
  return "Pending";
};

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (typeof error === "object" && error !== null) {
    const maybeError = error as {
      message?: string;
      errors?: Array<{ message?: string; msg?: string }>;
    };
    return (
      maybeError.errors?.[0]?.msg ||
      maybeError.errors?.[0]?.message ||
      maybeError.message ||
      fallback
    );
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
};

export default function CareseekerTrackingReviewPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();

  const user = useMemo(() => authService.getCurrentUser() as User | null, []);
  const [selectedBookingIdManual, setSelectedBookingIdManual] = useState("");
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [pageError, setPageError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      router.replace("/login");
      return;
    }

    if (user.role !== "careseeker") {
      router.replace("/dashboard");
      return;
    }
  }, [router, user]);

  const { data: bookings = [], isLoading: bookingsLoading } = useQuery({
    queryKey: ["careseeker", "tracking", "bookings"],
    queryFn: async (): Promise<Booking[]> => {
      const response = await bookingService.getMyBookings({ limit: 120 });
      if (!response.success || !response.data?.bookings) {
        throw new Error("Failed to fetch bookings");
      }

      return response.data.bookings.filter((booking) =>
        ["confirmed", "in_progress", "completed", "disputed"].includes(booking.status)
      );
    },
    enabled: Boolean(user && user.role === "careseeker"),
    staleTime: 30 * 1000,
  });

  const selectedBookingId = useMemo(() => {
    if (bookings.length === 0) {
      return "";
    }

    const hasManualSelection = bookings.some((booking) => booking._id === selectedBookingIdManual);
    if (selectedBookingIdManual && hasManualSelection) {
      return selectedBookingIdManual;
    }

    const bookingFromQuery = searchParams.get("bookingId");
    if (bookingFromQuery) {
      const match = bookings.find((booking) => booking._id === bookingFromQuery);
      if (match) {
        return match._id;
      }
    }

    const preferred =
      bookings.find((booking) => booking.status === "in_progress") ||
      bookings.find((booking) => booking.status === "confirmed") ||
      bookings[0];

    return preferred?._id || "";
  }, [bookings, searchParams, selectedBookingIdManual]);

  const selectedBooking = useMemo(
    () => bookings.find((booking) => booking._id === selectedBookingId) ?? null,
    [bookings, selectedBookingId]
  );

  const {
    data: tracking,
    isLoading: trackingLoading,
    refetch: refetchTracking,
  } = useQuery({
    queryKey: ["careseeker", "tracking", selectedBookingId],
    queryFn: async (): Promise<BookingTrackingResponse> => {
      if (!selectedBookingId) {
        throw new Error("Booking is required");
      }

      const response = await bookingService.getTrackingLogs(selectedBookingId);
      if (!response.success || !response.data) {
        throw new Error("Failed to fetch tracking logs");
      }

      return response.data;
    },
    enabled: Boolean(selectedBookingId),
    staleTime: 15 * 1000,
  });

  const sortedLogs = useMemo(() => {
    const logs = [...(tracking?.trackingLogs ?? [])];
    logs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return logs;
  }, [tracking?.trackingLogs]);

  const reviewMutation = useMutation({
    mutationFn: async (payload: {
      bookingId: string;
      dateKey: string;
      action: ReviewAction;
      comment: string;
    }) => {
      const response = await bookingService.reviewTrackingLog(
        payload.bookingId,
        payload.dateKey,
        payload.action,
        payload.comment.trim() || undefined
      );

      if (!response.success) {
        throw new Error(response.message || "Unable to submit review");
      }

      return response;
    },
    onSuccess: async (_, payload) => {
      setSuccessMessage(
        payload.action === "approve"
          ? "Daily log approved successfully."
          : "Daily log flagged successfully."
      );
      setCommentDrafts((prev) => ({ ...prev, [payload.dateKey]: "" }));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["careseeker", "tracking", selectedBookingId] }),
        queryClient.invalidateQueries({ queryKey: ["careseeker", "tracking", "bookings"] }),
      ]);
      await refetchTracking();
    },
    onError: (error) => {
      setPageError(getErrorMessage(error, "Unable to submit review action."));
    },
  });

  useEffect(() => {
    if (!successMessage) {
      return;
    }

    const timer = setTimeout(() => setSuccessMessage(null), 3000);
    return () => clearTimeout(timer);
  }, [successMessage]);

  const submitReview = (dateKey: string, action: ReviewAction) => {
    if (!selectedBookingId) {
      return;
    }

    setPageError(null);
    const comment = commentDrafts[dateKey] || "";
    reviewMutation.mutate({
      bookingId: selectedBookingId,
      dateKey,
      action,
      comment,
    });
  };

  const isActionPending = (dateKey: string, action: ReviewAction): boolean => {
    if (!reviewMutation.isPending || !reviewMutation.variables) {
      return false;
    }

    return (
      reviewMutation.variables.dateKey === dateKey &&
      reviewMutation.variables.action === action
    );
  };

  if (!user || user.role !== "careseeker") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F7FA]">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <DashboardLayout user={user}>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Tracking Review</h1>
            <p className="text-sm text-gray-500 mt-1">
              Review daily attendance and reports submitted by your caregiver.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/careseeker"
              className="px-3 py-2 text-sm rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50"
            >
              Dashboard
            </Link>
            <Link
              href="/dashboard/bookings"
              className="px-3 py-2 text-sm rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50"
            >
              View Bookings
            </Link>
            <Link
              href="/messages"
              className="px-3 py-2 text-sm rounded-xl bg-primary-500 text-white hover:bg-primary-600"
            >
              Open Chat
            </Link>
          </div>
        </div>

        {pageError && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 inline-flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5" />
            <span>{pageError}</span>
          </div>
        )}

        {successMessage && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 inline-flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 mt-0.5" />
            <span>{successMessage}</span>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <label className="text-xs uppercase tracking-wide text-gray-500 font-semibold">
              Select Booking
            </label>
            <select
              value={selectedBookingId}
              onChange={(event) => setSelectedBookingIdManual(event.target.value)}
              className="w-full md:max-w-xl px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              disabled={bookingsLoading}
            >
              {bookings.length === 0 && <option value="">No reviewable bookings</option>}
              {bookings.map((booking) => (
                <option key={booking._id} value={booking._id}>
                  {booking.bookingNumber || booking._id} - {booking.status}
                </option>
              ))}
            </select>
          </div>

          {selectedBooking && (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-3">
                <p className="text-xs text-gray-500">Booking Window</p>
                <p className="text-sm font-semibold text-gray-900 mt-1">
                  {new Date(selectedBooking.schedule.startDate).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                  {selectedBooking.schedule.endDate
                    ? ` to ${new Date(selectedBooking.schedule.endDate).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}`
                    : ""}
                </p>
              </div>
              <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-3">
                <p className="text-xs text-gray-500">Agreement</p>
                <p className="text-sm font-semibold mt-1 text-gray-900">
                  {tracking?.agreement.accepted ? "Accepted" : "Pending"}
                </p>
              </div>
              <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-3">
                <p className="text-xs text-gray-500">Tracking Status</p>
                <p className="text-sm font-semibold mt-1 text-gray-900">
                  {tracking?.controls.trackingEnabled ? "Open" : "Restricted"}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Quick Actions</h2>
              <p className="text-xs text-gray-500 mt-0.5">Navigate core dashboard pages instantly.</p>
            </div>
            <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Control Center</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            {QUICK_ACTIONS.map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.href}
                  href={action.href}
                  className={`group rounded-xl border bg-linear-to-br ${action.tintClass} p-3.5 transition-all hover:shadow-md hover:-translate-y-0.5`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${action.iconClass}`}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <ArrowRight className="h-4 w-4 text-gray-400 transition-transform group-hover:translate-x-0.5" />
                  </div>
                  <p className="text-sm font-semibold text-gray-900 mt-3">{action.title}</p>
                  <p className="text-xs text-gray-600 mt-1">{action.description}</p>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-emerald-700">Submitted</p>
            <p className="text-2xl font-bold text-emerald-700 mt-1">{tracking?.summary.submitted ?? 0}</p>
          </div>
          <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-amber-700">Pending</p>
            <p className="text-2xl font-bold text-amber-700 mt-1">{tracking?.summary.pending ?? 0}</p>
          </div>
          <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-red-700">Flagged</p>
            <p className="text-2xl font-bold text-red-700 mt-1">{tracking?.summary.flagged ?? 0}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-slate-700">Missed</p>
            <p className="text-2xl font-bold text-slate-700 mt-1">{tracking?.summary.missed ?? 0}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Daily Logs</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Approve completed days or flag issues with context.
              </p>
            </div>

            {trackingLoading && (
              <div className="inline-flex items-center gap-2 text-xs text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                Refreshing
              </div>
            )}
          </div>

          {trackingLoading && !tracking ? (
            <div className="p-8 flex justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
            </div>
          ) : sortedLogs.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500">
              No daily logs yet for this booking.
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {sortedLogs.map((log) => {
                const rowKey = `${log.dateKey}`;
                const statusClass = getStatusPill(log);
                const statusLabel = getStatusLabel(log);

                return (
                  <div key={rowKey} className="p-5 space-y-3">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-gray-900 inline-flex items-center gap-1.5">
                          <CalendarDays className="w-4 h-4 text-gray-400" />
                          {formatDateLabel(log.dateKey)}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Check-in {formatTimeLabel(log.checkInTime)} - Check-out {formatTimeLabel(log.checkOutTime)}
                        </p>
                      </div>

                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${statusClass}`}>
                        {statusLabel}
                      </span>
                    </div>

                    {log.tasksCompleted && (
                      <p className="text-sm text-gray-700">{log.tasksCompleted}</p>
                    )}

                    {log.issueFlag && (
                      <div className="rounded-xl border border-red-100 bg-red-50 p-3 text-xs text-red-700 inline-flex items-start gap-2">
                        <Flag className="w-4 h-4 mt-0.5" />
                        <span>{log.issues || "Issue has been flagged in this report."}</span>
                      </div>
                    )}

                    <textarea
                      value={commentDrafts[rowKey] || ""}
                      onChange={(event) =>
                        setCommentDrafts((prev) => ({
                          ...prev,
                          [rowKey]: event.target.value,
                        }))
                      }
                      rows={2}
                      placeholder="Optional comment for caregiver"
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                    />

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => submitReview(log.dateKey, "approve")}
                        disabled={isActionPending(log.dateKey, "approve")}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
                      >
                        {isActionPending(log.dateKey, "approve") ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <ShieldCheck className="w-3.5 h-3.5" />
                        )}
                        Approve
                      </button>

                      <button
                        onClick={() => submitReview(log.dateKey, "flag")}
                        disabled={isActionPending(log.dateKey, "flag")}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-60"
                      >
                        {isActionPending(log.dateKey, "flag") ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Flag className="w-3.5 h-3.5" />
                        )}
                        Flag
                      </button>

                      <Link
                        href="/messages"
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        Message
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
