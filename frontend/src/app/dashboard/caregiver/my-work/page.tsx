"use client";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  AlertCircle,
  AlertTriangle,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FileImage,
  Loader2,
  MapPin,
  MessageCircle,
  ShieldCheck,
} from "lucide-react";
import {
  bookingService,
  type Booking,
  type BookingTrackingLog,
} from "@/modules/booking/services";
import {
  useCaregiverActionCenter,
  useCaregiverTracking,
} from "@/hooks/useDashboardData";
import { CaregiverLayout } from "../components";

type CalendarMode = "month" | "week";

type TrackingDayStatus = "completed" | "pending" | "issue" | "none";

const toDateOnly = (value: Date | string): Date => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

const toDateKey = (value: Date | string): string => {
  const date = toDateOnly(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const fromDateKey = (dateKey: string): Date => {
  return new Date(`${dateKey}T00:00:00`);
};

const isWithinBookingWindow = (
  date: Date,
  booking: Pick<Booking, "schedule">
): boolean => {
  const check = toDateOnly(date);
  const start = toDateOnly(booking.schedule.startDate);
  const end = toDateOnly(booking.schedule.endDate ?? booking.schedule.startDate);
  return check >= start && check <= end;
};

const buildMonthGrid = (viewDate: Date): Date[] => {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const cells: Date[] = [];

  const startOffset = firstDay.getDay();
  for (let i = startOffset - 1; i >= 0; i -= 1) {
    cells.push(new Date(year, month, -i));
  }

  for (let day = 1; day <= lastDay.getDate(); day += 1) {
    cells.push(new Date(year, month, day));
  }

  while (cells.length % 7 !== 0) {
    const nextDay = cells.length - (startOffset + lastDay.getDate()) + 1;
    cells.push(new Date(year, month + 1, nextDay));
  }

  return cells;
};

const buildWeek = (anchorDate: Date): Date[] => {
  const start = new Date(anchorDate);
  start.setDate(start.getDate() - start.getDay());
  start.setHours(0, 0, 0, 0);

  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return day;
  });
};

const formatDateLabel = (dateKey: string): string => {
  return fromDateKey(dateKey).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
};

const readFileAsDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }
      reject(new Error("Unable to read selected image"));
    };
    reader.onerror = () => reject(new Error("Unable to read selected image"));
    reader.readAsDataURL(file);
  });
};

const extractErrorMessage = (error: unknown, fallback: string): string => {
  if (typeof error === "object" && error !== null) {
    const possibleError = error as {
      message?: string;
      errors?: Array<{ message?: string; msg?: string }>;
    };

    return (
      possibleError.errors?.[0]?.msg ||
      possibleError.errors?.[0]?.message ||
      possibleError.message ||
      fallback
    );
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
};

const STATUS_STYLE: Record<
  TrackingDayStatus,
  { bg: string; text: string; ring: string; dot: string }
> = {
  completed: {
    bg: "bg-emerald-100",
    text: "text-emerald-700",
    ring: "ring-emerald-300",
    dot: "bg-emerald-500",
  },
  pending: {
    bg: "bg-amber-100",
    text: "text-amber-700",
    ring: "ring-amber-300",
    dot: "bg-amber-500",
  },
  issue: {
    bg: "bg-red-100",
    text: "text-red-700",
    ring: "ring-red-300",
    dot: "bg-red-500",
  },
  none: {
    bg: "bg-gray-50",
    text: "text-gray-500",
    ring: "ring-gray-200",
    dot: "bg-gray-300",
  },
};

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function CaregiverMyWorkPage() {
  const searchParams = useSearchParams();
  const {
    data: actionCenterData,
    isLoading: actionLoading,
    refetch: refetchActionCenter,
  } = useCaregiverActionCenter();

  const bookings = actionCenterData?.bookings ?? [];

  const [selectedBookingId, setSelectedBookingId] = useState<string>("");
  const [calendarMode, setCalendarMode] = useState<CalendarMode>("month");
  const [viewDate, setViewDate] = useState<Date>(new Date());

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDateKey, setSelectedDateKey] = useState<string>(toDateKey(new Date()));

  const [tasksCompleted, setTasksCompleted] = useState("");
  const [notes, setNotes] = useState("");
  const [issueFlag, setIssueFlag] = useState(false);
  const [issues, setIssues] = useState("");
  const [powImages, setPowImages] = useState<string[]>([]);

  const [modalError, setModalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionLoadingType, setActionLoadingType] = useState<"checkin" | "checkout" | null>(null);

  useEffect(() => {
    if (bookings.length === 0) {
      return;
    }

    const bookingFromQuery = searchParams.get("bookingId");
    const matchFromQuery = bookingFromQuery
      ? bookings.find((booking) => booking._id === bookingFromQuery)
      : null;

    if (matchFromQuery) {
      setSelectedBookingId(matchFromQuery._id);
      return;
    }

    if (!selectedBookingId) {
      const preferred =
        bookings.find((booking) => booking.status === "in_progress") ??
        bookings.find((booking) => booking.status === "confirmed") ??
        bookings[0];

      if (preferred) {
        setSelectedBookingId(preferred._id);
      }
    }
  }, [bookings, searchParams, selectedBookingId]);

  const selectedBooking = useMemo(
    () => bookings.find((booking) => booking._id === selectedBookingId) ?? null,
    [bookings, selectedBookingId]
  );

  const {
    data: trackingData,
    isLoading: trackingLoading,
    refetch: refetchTracking,
  } = useCaregiverTracking(selectedBookingId || null, Boolean(selectedBookingId));

  const logsByDate = useMemo(() => {
    const map = new Map<string, BookingTrackingLog>();
    for (const log of trackingData?.trackingLogs ?? []) {
      map.set(log.dateKey, log);
    }
    return map;
  }, [trackingData?.trackingLogs]);

  const selectedLog = logsByDate.get(selectedDateKey);

  useEffect(() => {
    if (!isModalOpen) {
      return;
    }

    const log = logsByDate.get(selectedDateKey);
    setTasksCompleted(log?.tasksCompleted ?? "");
    setNotes(log?.notes ?? "");
    setIssueFlag(Boolean(log?.issueFlag));
    setIssues(log?.issues ?? "");
    setPowImages(log?.images?.map((image) => image.imageUrl) ?? []);
    setModalError(null);
  }, [isModalOpen, selectedDateKey, logsByDate]);

  const monthGrid = useMemo(() => buildMonthGrid(viewDate), [viewDate]);
  const weekGrid = useMemo(() => buildWeek(viewDate), [viewDate]);
  const todayKey = toDateKey(new Date());

  const getDayStatus = (date: Date): TrackingDayStatus => {
    if (!selectedBooking) {
      return "none";
    }

    if (!isWithinBookingWindow(date, selectedBooking)) {
      return "none";
    }

    const key = toDateKey(date);
    const log = logsByDate.get(key);

    if (log) {
      if (log.status === "FLAGGED" || log.issueFlag || log.missed) {
        return "issue";
      }
      if (log.status === "SUBMITTED") {
        return "completed";
      }
      return "pending";
    }

    if (toDateOnly(date) <= toDateOnly(new Date())) {
      return "pending";
    }

    return "none";
  };

  const summaryCards = [
    {
      label: "Submitted",
      value: trackingData?.summary.submitted ?? 0,
      style: "bg-emerald-50 text-emerald-700 border-emerald-100",
    },
    {
      label: "Pending",
      value: trackingData?.summary.pending ?? 0,
      style: "bg-amber-50 text-amber-700 border-amber-100",
    },
    {
      label: "Flagged",
      value: trackingData?.summary.flagged ?? 0,
      style: "bg-red-50 text-red-700 border-red-100",
    },
    {
      label: "Missed",
      value: trackingData?.summary.missed ?? 0,
      style: "bg-rose-50 text-rose-700 border-rose-100",
    },
  ];

  const openDateModal = (date: Date) => {
    if (!selectedBooking || !isWithinBookingWindow(date, selectedBooking)) {
      return;
    }

    setSelectedDateKey(toDateKey(date));
    setIsModalOpen(true);
  };

  const refreshTrackingData = async () => {
    await Promise.all([refetchTracking(), refetchActionCenter()]);
  };

  const ensureDateWithinSelectedBookingWindow = (dateKey: string): boolean => {
    if (!selectedBooking) {
      setModalError("Please select a booking first.");
      return false;
    }

    const targetDate = fromDateKey(dateKey);
    if (!isWithinBookingWindow(targetDate, selectedBooking)) {
      setModalError("Selected date is outside this booking schedule window.");
      return false;
    }

    return true;
  };

  const runCheckIn = async (dateKey: string) => {
    if (!selectedBooking) return;

    if (!ensureDateWithinSelectedBookingWindow(dateKey)) {
      return;
    }

    try {
      setActionLoadingType("checkin");
      setModalError(null);
      await bookingService.checkInTracking({
        bookingId: selectedBooking._id,
        date: dateKey,
        notes,
      });
      await refreshTrackingData();
    } catch (error) {
      setModalError(extractErrorMessage(error, "Failed to check in."));
    } finally {
      setActionLoadingType(null);
    }
  };

  const runCheckOut = async (dateKey: string) => {
    if (!selectedBooking) return;

    if (!ensureDateWithinSelectedBookingWindow(dateKey)) {
      return;
    }

    try {
      setActionLoadingType("checkout");
      setModalError(null);
      await bookingService.checkOutTracking({
        bookingId: selectedBooking._id,
        date: dateKey,
        notes,
      });
      await refreshTrackingData();
    } catch (error) {
      setModalError(extractErrorMessage(error, "Failed to check out."));
    } finally {
      setActionLoadingType(null);
    }
  };

  const submitDailyLog = async () => {
    if (!selectedBooking) {
      return;
    }

    if (!ensureDateWithinSelectedBookingWindow(selectedDateKey)) {
      return;
    }

    if (!selectedLog?.checkInTime) {
      setModalError("Check-in is required before submitting daily report.");
      return;
    }

    if (!tasksCompleted.trim()) {
      setModalError("Task summary is required.");
      return;
    }

    if (issueFlag && powImages.length === 0) {
      setModalError("At least one proof image is required when issue is flagged.");
      return;
    }

    try {
      setIsSubmitting(true);
      setModalError(null);
      await bookingService.submitTracking({
        bookingId: selectedBooking._id,
        date: selectedDateKey,
        tasksCompleted,
        notes,
        issues,
        issueFlag,
        images: powImages,
      });

      await refreshTrackingData();
      setIsModalOpen(false);
    } catch (error) {
      setModalError(extractErrorMessage(error, "Failed to submit daily report."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePowUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;

    try {
      const converted = await Promise.all(files.map((file) => readFileAsDataUrl(file)));
      setPowImages((prev) => [...prev, ...converted]);
    } catch (error) {
      setModalError(extractErrorMessage(error, "Unable to process selected image."));
    } finally {
      event.target.value = "";
    }
  };

  const removePowImage = (index: number) => {
    setPowImages((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
  };

  const showTrackingLocked =
    trackingData?.controls.trackingEnabled === false ||
    !trackingData?.agreement.accepted;

  const canEditSelectedLog =
    !selectedLog ||
    (selectedLog.status !== "SUBMITTED" && selectedLog.status !== "FLAGGED");

  if (actionLoading && !actionCenterData) {
    return (
      <CaregiverLayout pageTitle="My Work">
        <div className="h-80 bg-white rounded-2xl border border-gray-100 animate-pulse" />
      </CaregiverLayout>
    );
  }

  return (
    <CaregiverLayout pageTitle="My Work">
      <div className="space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Work Tracking</h1>
            <p className="text-sm text-gray-500 mt-1">
              Daily attendance, proof-of-work, and trust logs for each booking.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={selectedBookingId}
              onChange={(event) => setSelectedBookingId(event.target.value)}
              className="px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#39B54A]/20"
            >
              {bookings.map((booking) => (
                <option key={booking._id} value={booking._id}>
                  {booking.bookingNumber || booking._id} · {booking.status}
                </option>
              ))}
            </select>

            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
              <button
                onClick={() => setCalendarMode("month")}
                className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                  calendarMode === "month"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500"
                }`}
              >
                Month
              </button>
              <button
                onClick={() => setCalendarMode("week")}
                className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                  calendarMode === "week"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500"
                }`}
              >
                Week
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {summaryCards.map((card) => (
            <div
              key={card.label}
              className={`p-4 rounded-xl border ${card.style}`}
            >
              <p className="text-xs font-semibold uppercase tracking-wide">{card.label}</p>
              <p className="text-2xl font-bold mt-1">{card.value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          <div className="xl:col-span-8 space-y-6">
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const nextDate = new Date(viewDate);
                      nextDate.setMonth(
                        viewDate.getMonth() + (calendarMode === "month" ? -1 : 0)
                      );
                      nextDate.setDate(
                        viewDate.getDate() + (calendarMode === "week" ? -7 : 0)
                      );
                      setViewDate(nextDate);
                    }}
                    className="p-2 rounded-lg hover:bg-gray-100"
                  >
                    <ChevronLeft className="w-4 h-4 text-gray-500" />
                  </button>

                  <p className="text-sm font-semibold text-gray-800 min-w-40 text-center">
                    {calendarMode === "month"
                      ? viewDate.toLocaleDateString("en-US", {
                          month: "long",
                          year: "numeric",
                        })
                      : `${weekGrid[0].toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })} - ${weekGrid[6].toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}`}
                  </p>

                  <button
                    onClick={() => {
                      const nextDate = new Date(viewDate);
                      nextDate.setMonth(
                        viewDate.getMonth() + (calendarMode === "month" ? 1 : 0)
                      );
                      nextDate.setDate(
                        viewDate.getDate() + (calendarMode === "week" ? 7 : 0)
                      );
                      setViewDate(nextDate);
                    }}
                    className="p-2 rounded-lg hover:bg-gray-100"
                  >
                    <ChevronRight className="w-4 h-4 text-gray-500" />
                  </button>
                </div>

                <div className="flex items-center gap-4 text-xs text-gray-600">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Completed
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Pending
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500" /> Issue
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-2 mb-2">
                {DAY_LABELS.map((label) => (
                  <p
                    key={label}
                    className="text-[11px] text-center font-semibold text-gray-400 uppercase tracking-wide py-1"
                  >
                    {label}
                  </p>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-2">
                {(calendarMode === "month" ? monthGrid : weekGrid).map((date) => {
                  const isOutsideMonth =
                    calendarMode === "month" && date.getMonth() !== viewDate.getMonth();
                  const dateKey = toDateKey(date);
                  const status = getDayStatus(date);
                  const statusStyle = STATUS_STYLE[status];
                  const isSelected = dateKey === selectedDateKey;
                  const inWindow = selectedBooking
                    ? isWithinBookingWindow(date, selectedBooking)
                    : false;

                  return (
                    <button
                      key={`${calendarMode}-${dateKey}`}
                      disabled={!inWindow}
                      onClick={() => openDateModal(date)}
                      className={`relative rounded-xl border p-2 text-left min-h-16 transition-all ${
                        inWindow ? "hover:shadow-sm" : "opacity-55 cursor-not-allowed"
                      } ${statusStyle.bg} ${statusStyle.text} ${
                        isSelected ? `ring-2 ${statusStyle.ring}` : ""
                      }`}
                    >
                      <p
                        className={`text-xs font-semibold ${
                          isOutsideMonth ? "opacity-55" : ""
                        }`}
                      >
                        {date.getDate()}
                      </p>
                      <span
                        className={`absolute right-2 bottom-2 w-2 h-2 rounded-full ${statusStyle.dot}`}
                      />
                    </button>
                  );
                })}
              </div>

              {trackingLoading && (
                <div className="mt-4 flex items-center gap-2 text-sm text-gray-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Refreshing tracking logs...
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Pending Actions</h3>
              {actionCenterData?.pendingActions?.length ? (
                <div className="space-y-2">
                  {actionCenterData.pendingActions.slice(0, 5).map((item) => (
                    <Link
                      key={item.id}
                      href={`/dashboard/caregiver/my-work?bookingId=${item.bookingId}`}
                      className="block rounded-xl border border-gray-100 p-3 hover:border-gray-200 hover:bg-gray-50 transition-colors"
                    >
                      <p className="text-xs font-semibold text-gray-800">{item.title}</p>
                      <p className="text-[11px] text-gray-500 mt-0.5">{item.subtitle}</p>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400">No pending actions right now.</p>
              )}
            </div>
          </div>

          <div className="xl:col-span-4">
            <div className="sticky top-24 space-y-4">
              <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Sticky Action Panel</h3>

                <div className="space-y-2">
                  <button
                    onClick={() => runCheckIn(todayKey)}
                    disabled={!selectedBooking || !trackingData?.controls.trackingEnabled || actionLoadingType === "checkin"}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#39B54A] text-white text-sm font-medium hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {actionLoadingType === "checkin" ? "Checking in..." : "Check-in now"}
                  </button>

                  <button
                    onClick={() => {
                      setSelectedDateKey(todayKey);
                      setIsModalOpen(true);
                    }}
                    disabled={!selectedBooking || !trackingData?.controls.trackingEnabled}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Submit report
                  </button>
                </div>

                {showTrackingLocked && (
                  <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-100">
                    <p className="text-xs font-semibold text-amber-700">Tracking Locked</p>
                    <p className="text-[11px] text-amber-600 mt-1">
                      Booking must be active and agreement accepted before tracking.
                    </p>
                  </div>
                )}

                <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Agreement</span>
                    <span
                      className={`font-semibold ${
                        trackingData?.agreement.accepted
                          ? "text-emerald-600"
                          : "text-amber-600"
                      }`}
                    >
                      {trackingData?.agreement.accepted ? "Accepted" : "Pending"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Chat & Call</span>
                    <span
                      className={`font-semibold ${
                        trackingData?.controls.chatEnabled
                          ? "text-emerald-600"
                          : "text-gray-500"
                      }`}
                    >
                      {trackingData?.controls.chatEnabled ? "Enabled" : "Locked"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Map Visibility</span>
                    <span
                      className={`font-semibold ${
                        trackingData?.controls.mapVisible
                          ? "text-emerald-600"
                          : "text-gray-500"
                      }`}
                    >
                      {trackingData?.controls.mapVisible ? "Visible" : "Hidden"}
                    </span>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <Link
                    href="/messages"
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50"
                  >
                    <MessageCircle className="w-3.5 h-3.5" /> Chat
                  </Link>
                  <Link
                    href={`/dashboard/bookings/${selectedBookingId}`}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50"
                  >
                    <MapPin className="w-3.5 h-3.5" /> Map
                  </Link>
                </div>

                <Link
                  href={`/dashboard/bookings/${selectedBookingId}?action=dispute`}
                  className="mt-3 inline-flex w-full items-center justify-center gap-1.5 px-3 py-2 text-xs rounded-xl bg-red-50 text-red-700 border border-red-100 hover:bg-red-100"
                >
                  <AlertTriangle className="w-3.5 h-3.5" /> Raise Issue
                </Link>

                {trackingData?.agreement.pdfUrl && (
                  <div className="mt-3 pt-3 border-t border-gray-100 flex gap-2">
                    <a
                      href={trackingData.agreement.pdfUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" /> View Agreement
                    </a>
                    <a
                      href={trackingData.agreement.pdfUrl}
                      download
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50"
                    >
                      <CalendarDays className="w-3.5 h-3.5" /> Download PDF
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {isModalOpen && selectedBooking && (
        <div
          className="fixed inset-0 z-50 bg-black/45 backdrop-blur-[1px] flex items-center justify-center p-4"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="w-full max-w-2xl max-h-[90vh] overflow-auto bg-white rounded-2xl border border-gray-100 p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Daily Tracking Sheet</h2>
                <p className="text-sm text-gray-500">{formatDateLabel(selectedDateKey)}</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-50"
              >
                Close
              </button>
            </div>

            <div className="grid sm:grid-cols-2 gap-3 mb-4">
              <button
                onClick={() => runCheckIn(selectedDateKey)}
                disabled={Boolean(selectedLog?.checkInTime) || actionLoadingType === "checkin" || !canEditSelectedLog}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-emerald-100 disabled:opacity-50"
              >
                {actionLoadingType === "checkin" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                {selectedLog?.checkInTime ? "Checked In" : "Check In"}
              </button>

              <button
                onClick={() => runCheckOut(selectedDateKey)}
                disabled={!selectedLog?.checkInTime || Boolean(selectedLog?.checkOutTime) || actionLoadingType === "checkout" || !canEditSelectedLog}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-50 text-blue-700 border border-blue-100 hover:bg-blue-100 disabled:opacity-50"
              >
                {actionLoadingType === "checkout" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Clock3 className="w-4 h-4" />
                )}
                {selectedLog?.checkOutTime ? "Checked Out" : "Check Out"}
              </button>
            </div>

            {!canEditSelectedLog && (
              <div className="mb-4 p-3 rounded-xl bg-gray-50 border border-gray-100">
                <p className="text-xs font-medium text-gray-600">
                  This log is locked after submission and can only be updated by admin.
                </p>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Task Summary
                </label>
                <textarea
                  value={tasksCompleted}
                  onChange={(event) => setTasksCompleted(event.target.value)}
                  disabled={!canEditSelectedLog}
                  rows={3}
                  placeholder="What was completed today?"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#39B54A]/20 disabled:bg-gray-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  disabled={!canEditSelectedLog}
                  rows={2}
                  placeholder="Extra observations"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#39B54A]/20 disabled:bg-gray-50"
                />
              </div>

              <div className="rounded-xl border border-gray-100 p-3">
                <label className="inline-flex items-center gap-2 text-sm font-medium text-gray-700">
                  <input
                    type="checkbox"
                    checked={issueFlag}
                    disabled={!canEditSelectedLog}
                    onChange={(event) => setIssueFlag(event.target.checked)}
                    className="rounded border-gray-300"
                  />
                  Flag issue for this day
                </label>

                {issueFlag && (
                  <textarea
                    value={issues}
                    onChange={(event) => setIssues(event.target.value)}
                    disabled={!canEditSelectedLog}
                    rows={2}
                    placeholder="Describe the issue"
                    className="mt-2 w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-200 disabled:bg-gray-50"
                  />
                )}
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">
                  Proof of Work (POW)
                </p>
                <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 text-xs text-gray-700 hover:bg-gray-50 cursor-pointer">
                  <FileImage className="w-4 h-4" />
                  Upload image
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    disabled={!canEditSelectedLog}
                    onChange={handlePowUpload}
                    className="hidden"
                  />
                </label>

                {powImages.length > 0 && (
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {powImages.map((imageUrl, index) => (
                      <div key={`${imageUrl.slice(0, 20)}-${index}`} className="relative">
                        <img
                          src={imageUrl}
                          alt={`Proof ${index + 1}`}
                          className="w-full h-20 rounded-lg object-cover border border-gray-200"
                        />
                        {canEditSelectedLog && (
                          <button
                            onClick={() => removePowImage(index)}
                            className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px]"
                          >
                            <Check className="w-3 h-3 mx-auto rotate-45" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {modalError && (
              <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm inline-flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5" />
                <span>{modalError}</span>
              </div>
            )}

            <div className="mt-5 flex items-center justify-between gap-3">
              <div className="text-xs text-gray-500">
                {selectedLog?.checkInTime ? (
                  <span>Checked in at {new Date(selectedLog.checkInTime).toLocaleTimeString()}</span>
                ) : (
                  <span>Check-in required before submission</span>
                )}
              </div>

              <button
                onClick={submitDailyLog}
                disabled={
                  isSubmitting ||
                  !canEditSelectedLog ||
                  !selectedLog?.checkInTime ||
                  !tasksCompleted.trim() ||
                  (issueFlag && powImages.length === 0)
                }
                className="px-5 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Submitting..." : "Submit Daily Report"}
              </button>
            </div>
          </div>
        </div>
      )}
    </CaregiverLayout>
  );
}
