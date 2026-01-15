"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  AlertTriangle,
  Bell,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { AdminLayout } from "@/components";
import {
  bookingService,
  type BookingTrackingLog,
  type BookingTrackingResponse,
  type TrackingOverviewResponse,
} from "@/modules/booking/services";
import type { User } from "@/types";

type AdminTrackingAction = "override" | "penalize" | "dispute";

const parseDate = (value?: string | Date | null): Date | null => {
  if (!value) {
    return null;
  }

  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
};

const formatDate = (value?: string | null): string => {
  const parsed = parseDate(value ?? undefined);
  if (!parsed) {
    return "-";
  }

  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const formatDateKey = (value?: string | null): string => {
  if (!value) {
    return "-";
  }

  const parsed = parseDate(`${value}T00:00:00`);
  if (!parsed) {
    return value;
  }

  return parsed.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const formatTime = (value?: string | null): string => {
  if (!value) return "-";

  const parsed = parseDate(value);
  if (!parsed) {
    return "-";
  }

  return parsed.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
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

const getUserName = (value?: string | User | null): string => {
  if (!value) {
    return "Unknown";
  }

  if (typeof value === "string") {
    return value;
  }
  return value.fullName || value.email || "Unknown";
};

const getStatusPill = (status: string): string => {
  if (status === "in_progress") return "bg-blue-100 text-blue-700";
  if (status === "completed") return "bg-emerald-100 text-emerald-700";
  if (status === "disputed") return "bg-red-100 text-red-700";
  if (status === "confirmed") return "bg-indigo-100 text-indigo-700";
  return "bg-gray-100 text-gray-700";
};

const getTrackingLogStatusPill = (log: BookingTrackingLog): string => {
  if (log.adminReview?.status === "dispute_triggered") return "bg-red-100 text-red-700";
  if (log.adminReview?.status === "penalized") return "bg-amber-100 text-amber-700";
  if (log.adminReview?.status === "overridden") return "bg-emerald-100 text-emerald-700";
  if (log.status === "FLAGGED") return "bg-red-100 text-red-700";
  if (log.status === "SUBMITTED") return "bg-blue-100 text-blue-700";
  if (log.missed) return "bg-amber-100 text-amber-700";
  return "bg-gray-100 text-gray-700";
};

const getTrackingLogLabel = (log: BookingTrackingLog): string => {
  if (log.adminReview?.status === "dispute_triggered") return "Dispute Triggered";
  if (log.adminReview?.status === "penalized") return "Penalized";
  if (log.adminReview?.status === "overridden") return "Overridden";
  if (log.status === "FLAGGED") return "Flagged";
  if (log.status === "SUBMITTED") return "Submitted";
  if (log.missed) return "Missed";
  return "Pending";
};

const resolveLogKey = (log: BookingTrackingLog, index: number): string => {
  if (typeof log.dateKey === "string" && log.dateKey.trim().length > 0) {
    return log.dateKey;
  }

  if (typeof log.date === "string" && log.date.trim().length > 0) {
    return log.date;
  }

  return `log-${index}`;
};

export default function AdminTrackingPage() {
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [limit] = useState(12);
  const [caregiverIdInput, setCaregiverIdInput] = useState("");
  const [caregiverIdFilter, setCaregiverIdFilter] = useState("");
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [selectedBookingIdManual, setSelectedBookingIdManual] = useState("");
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [pageError, setPageError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const {
    data: overview,
    isLoading: overviewLoading,
    isFetching: overviewFetching,
    refetch: refetchOverview,
    error: overviewError,
  } = useQuery({
    queryKey: ["admin", "tracking", "overview", page, limit, caregiverIdFilter, flaggedOnly],
    queryFn: async (): Promise<TrackingOverviewResponse> => {
      const response = await bookingService.getAdminTrackingOverview({
        page,
        limit,
        ...(caregiverIdFilter ? { caregiverId: caregiverIdFilter } : {}),
        flaggedOnly,
      });

      if (!response.success || !response.data) {
        throw new Error(response.message || "Failed to fetch tracking overview");
      }

      return response.data;
    },
    staleTime: 15 * 1000,
  });

  const rows = useMemo(() => overview?.bookings ?? [], [overview?.bookings]);

  const selectedBookingId = useMemo(() => {
    if (rows.length === 0) {
      return "";
    }

    const hasManualSelection = rows.some((row) => row.bookingId === selectedBookingIdManual);
    if (selectedBookingIdManual && hasManualSelection) {
      return selectedBookingIdManual;
    }

    return rows[0].bookingId;
  }, [rows, selectedBookingIdManual]);

  const selectedOverviewRow = useMemo(
    () => rows.find((row) => row.bookingId === selectedBookingId) ?? null,
    [rows, selectedBookingId]
  );

  const {
    data: trackingDetail,
    isLoading: detailLoading,
    refetch: refetchDetail,
    error: detailError,
  } = useQuery({
    queryKey: ["admin", "tracking", "detail", selectedBookingId],
    queryFn: async (): Promise<BookingTrackingResponse> => {
      if (!selectedBookingId) {
        throw new Error("Booking is required");
      }
      const response = await bookingService.getTrackingLogs(selectedBookingId);
      if (!response.success || !response.data) {
        throw new Error(response.message || "Failed to fetch booking logs");
      }
      return response.data;
    },
    enabled: Boolean(selectedBookingId),
    staleTime: 10 * 1000,
  });

  const sortedDetailLogs = useMemo(() => {
    const logs = [...(trackingDetail?.trackingLogs ?? [])];
    logs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return logs;
  }, [trackingDetail?.trackingLogs]);

  useEffect(() => {
    if (!overviewError) {
      return;
    }
    setPageError(getErrorMessage(overviewError, "Unable to load tracking overview."));
  }, [overviewError]);

  useEffect(() => {
    if (!detailError) {
      return;
    }
    setPageError(getErrorMessage(detailError, "Unable to load booking tracking details."));
  }, [detailError]);

  const actionMutation = useMutation({
    mutationFn: async (payload: {
      bookingId: string;
      dateKey: string;
      action: AdminTrackingAction;
      note: string;
    }) => {
      const response = await bookingService.adminUpdateTrackingLog(
        payload.bookingId,
        payload.dateKey,
        payload.action,
        payload.note.trim() || undefined
      );

      if (!response.success) {
        throw new Error(response.message || "Unable to apply admin action");
      }

      return response;
    },
    onSuccess: async (_, payload) => {
      setSuccessMessage("Tracking action applied successfully.");
      setNoteDrafts((prev) => ({ ...prev, [payload.dateKey]: "" }));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "tracking", "overview"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "tracking", "detail", payload.bookingId] }),
      ]);
      await Promise.all([refetchOverview(), refetchDetail()]);
    },
    onError: (error) => {
      setPageError(getErrorMessage(error, "Unable to apply admin tracking action."));
    },
  });

  const reminderMutation = useMutation({
    mutationFn: async (payload: {
      bookingId: string;
      dateKey: string;
      message?: string;
    }) => {
      const response = await bookingService.sendTrackingReminder(
        payload.bookingId,
        payload.dateKey,
        payload.message,
      );

      if (!response.success) {
        throw new Error(response.message || 'Unable to send tracking reminder');
      }

      return response;
    },
    onSuccess: async (_, payload) => {
      setSuccessMessage('Reminder sent to caregiver successfully.');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin', 'tracking', 'overview'] }),
        queryClient.invalidateQueries({ queryKey: ['admin', 'tracking', 'detail', payload.bookingId] }),
      ]);
      await Promise.all([refetchOverview(), refetchDetail()]);
    },
    onError: (error) => {
      setPageError(getErrorMessage(error, 'Unable to send tracking reminder.'));
    },
  });

  useEffect(() => {
    if (!successMessage) {
      return;
    }
    const timer = setTimeout(() => setSuccessMessage(null), 3000);
    return () => clearTimeout(timer);
  }, [successMessage]);

  const submitAdminAction = (dateKey: string, action: AdminTrackingAction) => {
    if (!selectedBookingId) {
      return;
    }

    setPageError(null);
    actionMutation.mutate({
      bookingId: selectedBookingId,
      dateKey,
      action,
      note: noteDrafts[dateKey] || "",
    });
  };

  const isActionPending = (dateKey: string, action: AdminTrackingAction): boolean => {
    if (!actionMutation.isPending || !actionMutation.variables) {
      return false;
    }
    return (
      actionMutation.variables.dateKey === dateKey &&
      actionMutation.variables.action === action
    );
  };

  const isReminderPending = (dateKey: string): boolean => {
    if (!reminderMutation.isPending || !reminderMutation.variables) {
      return false;
    }

    return reminderMutation.variables.dateKey === dateKey;
  };

  const applyFilters = () => {
    setPage(1);
    setCaregiverIdFilter(caregiverIdInput.trim());
  };

  const clearFilters = () => {
    setPage(1);
    setCaregiverIdInput("");
    setCaregiverIdFilter("");
    setFlaggedOnly(false);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Tracking Ops</h1>
            <p className="text-sm text-gray-500 mt-1">
              Observe daily care logs, investigate irregularities, and enforce admin actions.
            </p>
          </div>

          <button
            onClick={() => {
              setPageError(null);
              refetchOverview();
              if (selectedBookingId) {
                refetchDetail();
              }
            }}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-700 hover:bg-gray-50"
          >
            <RefreshCw className={`w-4 h-4 ${overviewFetching ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {pageError && (
          <div className="inline-flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="w-4 h-4 mt-0.5" />
            <span>{pageError}</span>
          </div>
        )}

        {successMessage && (
          <div className="inline-flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            <CheckCircle2 className="w-4 h-4 mt-0.5" />
            <span>{successMessage}</span>
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">Bookings</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{overview?.totals?.bookings ?? 0}</p>
          </div>
          <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-red-700">Flagged</p>
            <p className="text-2xl font-bold text-red-700 mt-1">{overview?.totals?.flagged ?? 0}</p>
          </div>
          <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-amber-700">Missed</p>
            <p className="text-2xl font-bold text-amber-700 mt-1">{overview?.totals?.missed ?? 0}</p>
          </div>
          <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-blue-700">Pending</p>
            <p className="text-2xl font-bold text-blue-700 mt-1">{overview?.totals?.pending ?? 0}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              value={caregiverIdInput}
              onChange={(event) => setCaregiverIdInput(event.target.value)}
              placeholder="Filter by caregiver ID"
              className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#39B54A]/20"
            />

            <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={flaggedOnly}
                onChange={(event) => {
                  setPage(1);
                  setFlaggedOnly(event.target.checked);
                }}
              />
              Show flagged only
            </label>

            <div className="flex items-center gap-2">
              <button
                onClick={applyFilters}
                className="px-3 py-2 rounded-xl bg-[#39B54A] text-white text-sm hover:bg-primary-600"
              >
                Apply
              </button>
              <button
                onClick={clearFilters}
                className="px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-700 hover:bg-gray-50"
              >
                Clear
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
          <div className="xl:col-span-6 rounded-2xl border border-gray-100 bg-white overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">Booking Overview</h2>
              {overviewLoading && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
            </div>

            {overviewLoading ? (
              <div className="p-8 flex justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-[#39B54A]" />
              </div>
            ) : rows.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-500">No bookings match current filters.</div>
            ) : (
              <div className="divide-y divide-gray-100 max-h-170 overflow-auto">
                {rows.map((row) => {
                  const selected = row.bookingId === selectedBookingId;
                  return (
                    <button
                      key={row.bookingId}
                      onClick={() => setSelectedBookingIdManual(row.bookingId)}
                      className={`w-full text-left p-4 transition-colors ${
                        selected ? "bg-[#F4FBF5]" : "hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">
                            {row.bookingNumber || row.bookingId}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {getUserName(row.careSeeker)} to {getUserName(row.caregiver)}
                          </p>
                        </div>

                        <span
                          className={`inline-flex px-2 py-1 rounded-full text-[11px] font-semibold ${getStatusPill(
                            row.bookingStatus
                          )}`}
                        >
                          {row.bookingStatus}
                        </span>
                      </div>

                      <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                        <div className="rounded-lg bg-red-50 px-2 py-1.5 text-red-700">
                          Flagged: {row.alerts?.flagged ?? 0}
                        </div>
                        <div className="rounded-lg bg-amber-50 px-2 py-1.5 text-amber-700">
                          Missed: {row.alerts?.missed ?? 0}
                        </div>
                        <div className="rounded-lg bg-blue-50 px-2 py-1.5 text-blue-700">
                          Pending: {row.summary?.pending ?? 0}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {overview?.pagination && overview.pagination.pages > 1 && (
              <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
                <p className="text-xs text-gray-500">
                  Page {overview.pagination.page} of {overview.pagination.pages}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                    disabled={page <= 1}
                    className="p-1.5 rounded-lg border border-gray-200 text-gray-600 disabled:opacity-40"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() =>
                      setPage((prev) =>
                        Math.min(overview.pagination.pages || prev, prev + 1)
                      )
                    }
                    disabled={page >= (overview.pagination.pages || 1)}
                    className="p-1.5 rounded-lg border border-gray-200 text-gray-600 disabled:opacity-40"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="xl:col-span-6 rounded-2xl border border-gray-100 bg-white overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">Daily Tracking Detail</h2>
              {selectedOverviewRow && (
                <p className="text-xs text-gray-500 mt-1">
                  {selectedOverviewRow.bookingNumber || selectedOverviewRow.bookingId}
                </p>
              )}
            </div>

            {!selectedBookingId ? (
              <div className="p-8 text-center text-sm text-gray-500">
                Select a booking to inspect daily logs.
              </div>
            ) : detailLoading && !trackingDetail ? (
              <div className="p-8 flex justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-[#39B54A]" />
              </div>
            ) : !trackingDetail ? (
              <div className="p-8 text-center text-sm text-gray-500">
                Unable to load booking details.
              </div>
            ) : (
              <div className="max-h-170 overflow-auto divide-y divide-gray-100">
                <div className="p-4 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg bg-slate-50 px-3 py-2">
                    Agreement: {trackingDetail.agreement?.accepted ? "Accepted" : "Pending"}
                  </div>
                  <div className="rounded-lg bg-slate-50 px-3 py-2">
                    Last submit: {trackingDetail.summary?.lastSubmittedAt ? formatDate(trackingDetail.summary.lastSubmittedAt) : "-"}
                  </div>
                </div>

                {sortedDetailLogs.length === 0 ? (
                  <div className="p-8 text-center text-sm text-gray-500">No logs found for this booking.</div>
                ) : (
                  sortedDetailLogs.map((log, index) => {
                    const logKey = resolveLogKey(log, index);
                    const dateKey = log.dateKey || "";
                    const noteValue = dateKey ? (noteDrafts[dateKey] || "") : "";

                    return (
                    <div key={logKey} className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">
                            {dateKey ? formatDateKey(dateKey) : formatDate(log.date)}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            In: {formatTime(log.checkInTime)} | Out: {formatTime(log.checkOutTime)}
                          </p>
                        </div>
                        <span
                          className={`inline-flex px-2 py-1 rounded-full text-[11px] font-semibold ${getTrackingLogStatusPill(
                            log
                          )}`}
                        >
                          {getTrackingLogLabel(log)}
                        </span>
                      </div>

                      {log.tasksCompleted && (
                        <p className="text-sm text-gray-700">{log.tasksCompleted}</p>
                      )}

                      {log.issueFlag && (
                        <div className="rounded-xl border border-red-100 bg-red-50 p-3 inline-flex items-start gap-2 text-xs text-red-700">
                          <AlertTriangle className="w-4 h-4 mt-0.5" />
                          <span>{log.issues || "Issue was flagged for this day."}</span>
                        </div>
                      )}

                      {log.adminReview?.note && (
                        <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-xs text-gray-700 inline-flex items-start gap-2">
                          <ShieldAlert className="w-4 h-4 mt-0.5" />
                          <span>{log.adminReview.note}</span>
                        </div>
                      )}

                      <textarea
                        value={noteValue}
                        onChange={(event) =>
                          setNoteDrafts((prev) => (
                            dateKey
                              ? {
                                  ...prev,
                                  [dateKey]: event.target.value,
                                }
                              : prev
                          ))
                        }
                        rows={2}
                        placeholder="Optional admin note"
                        disabled={!dateKey}
                        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#39B54A]/20"
                      />

                      {!dateKey && (
                        <p className="text-xs text-amber-700">
                          Date key missing for this log. Admin actions are unavailable.
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => {
                            if (!selectedBookingId || !dateKey) return;
                            setPageError(null);
                            const trimmedMessage = noteDrafts[dateKey]?.trim();
                            reminderMutation.mutate({
                              bookingId: selectedBookingId,
                              dateKey,
                              ...(trimmedMessage ? { message: trimmedMessage } : {}),
                            });
                          }}
                          disabled={!dateKey || isReminderPending(dateKey)}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-sky-600 text-white text-xs font-medium hover:bg-sky-700 disabled:opacity-60"
                        >
                          {dateKey && isReminderPending(dateKey) ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Bell className="w-3.5 h-3.5" />
                          )}
                          Ping caregiver
                        </button>

                        <button
                          onClick={() => {
                            if (!dateKey) return;
                            submitAdminAction(dateKey, "override");
                          }}
                          disabled={!dateKey || isActionPending(dateKey, "override")}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 disabled:opacity-60"
                        >
                          {dateKey && isActionPending(dateKey, "override") ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <ShieldCheck className="w-3.5 h-3.5" />
                          )}
                          Override
                        </button>

                        <button
                          onClick={() => {
                            if (!dateKey) return;
                            submitAdminAction(dateKey, "penalize");
                          }}
                          disabled={!dateKey || isActionPending(dateKey, "penalize")}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-600 text-white text-xs font-medium hover:bg-amber-700 disabled:opacity-60"
                        >
                          {dateKey && isActionPending(dateKey, "penalize") ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <AlertTriangle className="w-3.5 h-3.5" />
                          )}
                          Penalize
                        </button>

                        <button
                          onClick={() => {
                            if (!dateKey) return;
                            submitAdminAction(dateKey, "dispute");
                          }}
                          disabled={!dateKey || isActionPending(dateKey, "dispute")}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-600 text-white text-xs font-medium hover:bg-red-700 disabled:opacity-60"
                        >
                          {dateKey && isActionPending(dateKey, "dispute") ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <ShieldAlert className="w-3.5 h-3.5" />
                          )}
                          Dispute
                        </button>
                      </div>
                    </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
