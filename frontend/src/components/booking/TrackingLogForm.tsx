"use client";

// ============================================
// TRACKING LOG FORM — CareConnect
// Premium caregiver tracking log submission
// form for active bookings. Supports POW image
// uploads, late-submission warnings, and a
// fully read-only "submitted" view.
// ============================================

import {
  useState,
  useRef,
  useCallback,
  useEffect,
  DragEvent,
  ChangeEvent,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  Upload,
  X,
  Image as ImageIcon,
  Flag,
  FileText,
  StickyNote,
  MessageSquareWarning,
  Lock,
  Loader2,
  CalendarDays,
  BadgeCheck,
  Timer,
} from "lucide-react";

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

export interface TrackingLogSubmitData {
  date: string;
  checkInTime: string;
  checkOutTime: string;
  tasksCompleted: string;
  notes: string;
  issues: string;
  issueFlag: boolean;
  images: File[];
}

export interface TrackingLogFormProps {
  bookingId: string;
  bookingNumber: string;
  date: string; // YYYY-MM-DD
  existingLog?: {
    checkInTime?: string;
    checkOutTime?: string;
    tasksCompleted?: string;
    notes?: string;
    issues?: string;
    issueFlag?: boolean;
    images?: Array<{ imageUrl: string; timestamp: string }>;
    status: string; // 'pending' | 'submitted' | 'flagged'
    submittedAt?: string;
  };
  isLate?: boolean;
  isLoading?: boolean;
  onSubmit: (data: TrackingLogSubmitData) => Promise<void>;
  onCheckIn?: () => Promise<void>;
  onCheckOut?: () => Promise<void>;
  disabled?: boolean;
}

interface ImagePreview {
  id: string;
  dataUrl: string;
  file: File;
  name: string;
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

function getNowTime(): string {
  const now = new Date();
  return now.toTimeString().slice(0, 5); // HH:MM
}

function fmtDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function fmtTime(time?: string): string {
  if (!time) return "—";
  // If it's already HH:MM format
  if (/^\d{2}:\d{2}$/.test(time)) return time;
  // Try ISO
  try {
    return new Date(time).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return time;
  }
}

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

// ─────────────────────────────────────────────
// ANIMATION VARIANTS
// ─────────────────────────────────────────────

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.38, ease: [0.25, 0.46, 0.45, 0.94] },
  },
  exit: { opacity: 0, y: -10, transition: { duration: 0.22 } },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
  },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.88 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.3, ease: [0.34, 1.56, 0.64, 1] },
  },
  exit: { opacity: 0, scale: 0.82, transition: { duration: 0.18 } },
};

const thumbVariant = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.25, ease: [0.34, 1.56, 0.64, 1] },
  },
  exit: { opacity: 0, scale: 0.75, transition: { duration: 0.15 } },
};

// ─────────────────────────────────────────────
// STATUS BADGE
// ─────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<
    string,
    { label: string; cls: string; icon: React.ReactNode }
  > = {
    pending: {
      label: "Pending",
      cls: "bg-amber-50 text-amber-700 border-amber-200",
      icon: <Timer size={12} />,
    },
    submitted: {
      label: "Submitted",
      cls: "bg-green-50 text-green-700 border-green-200",
      icon: <BadgeCheck size={12} />,
    },
    flagged: {
      label: "Flagged",
      cls: "bg-red-50 text-red-700 border-red-200",
      icon: <Flag size={12} />,
    },
  };
  const cfg = map[status?.toLowerCase()] ?? map.pending;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${cfg.cls}`}
    >
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

// ─────────────────────────────────────────────
// SKELETON
// ─────────────────────────────────────────────

function SkeletonField({ rows = 1 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className={`animate-pulse rounded bg-slate-100 ${rows > 1 ? "h-6" : "h-10"}`}
        />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// READ-ONLY VIEW
// ─────────────────────────────────────────────

function ReadOnlyView({
  log,
  bookingNumber,
  date,
}: {
  log: NonNullable<TrackingLogFormProps["existingLog"]>;
  bookingNumber: string;
  date: string;
}) {
  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="space-y-5"
    >
      {/* Submitted banner */}
      <motion.div
        variants={fadeUp}
        className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{
            delay: 0.25,
            type: "spring",
            stiffness: 260,
            damping: 18,
          }}
        >
          <CheckCircle2 size={22} className="text-[#39B54A]" />
        </motion.div>
        <div>
          <p className="text-sm font-semibold text-green-800">Log Submitted</p>
          {log.submittedAt && (
            <p className="text-xs text-green-600">
              Submitted on {fmtDateTime(log.submittedAt)}
            </p>
          )}
        </div>
        <div className="ml-auto">
          <StatusBadge status={log.status} />
        </div>
      </motion.div>

      {/* Meta row */}
      <motion.div
        variants={fadeUp}
        className="flex flex-wrap gap-4 text-sm text-slate-600"
      >
        <span className="flex items-center gap-1.5">
          <CalendarDays size={14} className="text-slate-400" />
          <span className="font-medium">{date}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <FileText size={14} className="text-slate-400" />
          <span className="font-medium">Booking #{bookingNumber}</span>
        </span>
      </motion.div>

      {/* Time row */}
      <motion.div variants={fadeUp} className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="mb-0.5 text-xs font-medium uppercase tracking-wide text-slate-400">
            Check-in
          </p>
          <p className="text-base font-semibold text-slate-800">
            {fmtTime(log.checkInTime)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="mb-0.5 text-xs font-medium uppercase tracking-wide text-slate-400">
            Check-out
          </p>
          <p className="text-base font-semibold text-slate-800">
            {fmtTime(log.checkOutTime)}
          </p>
        </div>
      </motion.div>

      {/* Tasks */}
      <motion.div variants={fadeUp}>
        <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <CheckCircle2 size={12} />
          Tasks Completed
        </p>
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">
          {log.tasksCompleted || (
            <span className="text-slate-400 italic">No tasks recorded</span>
          )}
        </div>
      </motion.div>

      {/* Notes */}
      {log.notes && (
        <motion.div variants={fadeUp}>
          <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <StickyNote size={12} />
            Notes
          </p>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">
            {log.notes}
          </div>
        </motion.div>
      )}

      {/* Issues */}
      {(log.issues || log.issueFlag) && (
        <motion.div variants={fadeUp}>
          <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <MessageSquareWarning size={12} />
            Issues Reported
          </p>
          <div
            className={`rounded-xl border px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
              log.issueFlag
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-slate-200 bg-slate-50 text-slate-700"
            }`}
          >
            {log.issues || (
              <span className="italic opacity-70">No details provided</span>
            )}
            {log.issueFlag && (
              <span className="mt-2 flex items-center gap-1 text-xs font-semibold text-red-600">
                <Flag size={11} /> Flagged for admin review
              </span>
            )}
          </div>
        </motion.div>
      )}

      {/* POW Images */}
      {log.images && log.images.length > 0 && (
        <motion.div variants={fadeUp}>
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <ImageIcon size={12} />
            Proof of Work ({log.images.length} image
            {log.images.length !== 1 ? "s" : ""})
          </p>
          <div className="grid grid-cols-3 gap-2">
            {log.images.map((img, idx) => (
              <div
                key={idx}
                className="group relative aspect-square overflow-hidden rounded-xl border border-slate-200 bg-slate-100"
              >
                <img
                  src={img.imageUrl}
                  alt={`Proof of work ${idx + 1}`}
                  className="h-full w-full object-cover"
                />
                {img.timestamp && (
                  <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-1.5 py-0.5 text-center text-[10px] text-white">
                    {fmtTime(img.timestamp)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Lock notice */}
      <motion.div
        variants={fadeUp}
        className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500"
      >
        <Lock size={14} className="shrink-0 text-slate-400" />
        This log is locked and cannot be edited after submission.
      </motion.div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────

export default function TrackingLogForm({
  bookingId: _bookingId,
  bookingNumber,
  date,
  existingLog,
  isLate = false,
  isLoading = false,
  onSubmit,
  onCheckIn,
  onCheckOut,
  disabled = false,
}: TrackingLogFormProps) {
  // ── form state ──
  const [checkInTime, setCheckInTime] = useState(
    existingLog?.checkInTime ?? getNowTime(),
  );
  const [checkOutTime, setCheckOutTime] = useState(
    existingLog?.checkOutTime ?? "",
  );
  const [tasksCompleted, setTasksCompleted] = useState(
    existingLog?.tasksCompleted ?? "",
  );
  const [notes, setNotes] = useState(existingLog?.notes ?? "");
  const [issues, setIssues] = useState(existingLog?.issues ?? "");
  const [issueFlag, setIssueFlag] = useState(existingLog?.issueFlag ?? false);
  const [images, setImages] = useState<ImagePreview[]>([]);

  // ── UI state ──
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [dragOver, setDragOver] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const isSubmitted = existingLog?.status === "submitted";

  // ─────────────────────────────────────────────
  // LOADING / SKELETON STATE
  // ─────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* Skeleton header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 animate-pulse rounded-lg bg-slate-200" />
            <div className="space-y-1.5">
              <div className="h-4 w-28 animate-pulse rounded bg-slate-200" />
              <div className="h-3 w-20 animate-pulse rounded bg-slate-100" />
            </div>
          </div>
          <div className="h-6 w-20 animate-pulse rounded-full bg-slate-200" />
        </div>
        {/* Skeleton body */}
        <div className="space-y-5 p-5 sm:p-6">
          <div className="grid grid-cols-2 gap-4">
            <SkeletonField />
            <SkeletonField />
          </div>
          <SkeletonField rows={4} />
          <SkeletonField rows={3} />
          <SkeletonField rows={3} />
          <div className="h-5 w-36 animate-pulse rounded bg-slate-100" />
          <div className="h-24 animate-pulse rounded-xl border-2 border-dashed border-slate-200 bg-slate-50" />
          <div className="h-11 animate-pulse rounded-xl bg-slate-200" />
        </div>
      </div>
    );
  }

  // Auto-update check-in time on mount if no existing log
  useEffect(() => {
    if (!existingLog?.checkInTime) {
      setCheckInTime(getNowTime());
    }
  }, [existingLog?.checkInTime]);

  // ── image handling ──
  const processFiles = useCallback((files: FileList | File[]) => {
    const validTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "image/heic",
    ];
    Array.from(files).forEach((file) => {
      if (!validTypes.includes(file.type) && !file.type.startsWith("image/"))
        return;
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        setImages((prev) => [
          ...prev,
          { id: uid(), dataUrl, file, name: file.name },
        ]);
      };
      reader.readAsDataURL(file);
    });
  }, []);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) processFiles(e.target.files);
    // Reset input so same file can be re-added if removed
    e.target.value = "";
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files) processFiles(e.dataTransfer.files);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const removeImage = (id: string) => {
    setImages((prev) => prev.filter((img) => img.id !== id));
  };

  // ── validation ──
  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!checkInTime) errs.checkInTime = "Check-in time is required";
    if (!checkOutTime) errs.checkOutTime = "Check-out time is required";
    if (!tasksCompleted.trim())
      errs.tasksCompleted = "Please describe the tasks completed";
    if (checkInTime && checkOutTime && checkInTime >= checkOutTime) {
      errs.checkOutTime = "Check-out must be after check-in";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ── submit ──
  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      await onSubmit({
        date,
        checkInTime,
        checkOutTime,
        tasksCompleted,
        notes,
        issues,
        issueFlag,
        images: images.map((img) => img.file),
      });
      setSubmitSuccess(true);
    } catch (err) {
      setErrors({
        submit:
          err instanceof Error
            ? err.message
            : "Failed to submit log. Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // ── check-in / check-out quick actions ──
  const handleCheckIn = async () => {
    if (!onCheckIn) return;
    setCheckingIn(true);
    try {
      await onCheckIn();
      setCheckInTime(getNowTime());
    } finally {
      setCheckingIn(false);
    }
  };

  const handleCheckOut = async () => {
    if (!onCheckOut) return;
    setCheckingOut(true);
    try {
      await onCheckOut();
      setCheckOutTime(getNowTime());
    } finally {
      setCheckingOut(false);
    }
  };

  // ─────────────────────────────────────────────
  // READ-ONLY MODE
  // ─────────────────────────────────────────────

  if (isSubmitted && existingLog) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">
            Tracking Log
          </h2>
          <StatusBadge status={existingLog.status} />
        </div>
        <ReadOnlyView
          log={existingLog}
          bookingNumber={bookingNumber}
          date={date}
        />
      </div>
    );
  }

  // ─────────────────────────────────────────────
  // SUCCESS STATE
  // ─────────────────────────────────────────────

  if (submitSuccess) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="flex flex-col items-center py-8 text-center"
        >
          <motion.div variants={scaleIn} className="mb-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2 size={36} className="text-[#39B54A]" />
            </div>
          </motion.div>
          <motion.h3
            variants={fadeUp}
            className="mb-1 text-lg font-semibold text-slate-900"
          >
            Log Submitted!
          </motion.h3>
          <motion.p variants={fadeUp} className="text-sm text-slate-500">
            Your tracking log for{" "}
            <span className="font-medium text-slate-700">{date}</span> has been
            submitted successfully.
          </motion.p>
          <motion.div
            variants={fadeUp}
            className="mt-4 rounded-xl border border-green-200 bg-green-50 px-4 py-2 text-xs text-green-700"
          >
            Booking #{bookingNumber} · {fmtTime(checkInTime)} –{" "}
            {fmtTime(checkOutTime)}
          </motion.div>
        </motion.div>
      </div>
    );
  }

  // ─────────────────────────────────────────────
  // EDIT / SUBMIT FORM
  // ─────────────────────────────────────────────

  const isDisabled = disabled || submitting;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="rounded-2xl border border-slate-200 bg-white shadow-sm"
    >
      {/* ── Header ── */}
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#39B54A]/10">
            <FileText size={16} className="text-[#39B54A]" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-900 sm:text-base">
              Tracking Log
            </h2>
            <p className="text-xs text-slate-400">Booking #{bookingNumber}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {existingLog?.status && <StatusBadge status={existingLog.status} />}
          <span className="hidden items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-500 sm:flex">
            <CalendarDays size={12} />
            {date}
          </span>
        </div>
      </div>

      <div className="p-5 sm:p-6">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="space-y-5"
        >
          {/* ── Late submission warning ── */}
          <AnimatePresence>
            {isLate && (
              <motion.div
                key="late-warning"
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3"
              >
                <AlertTriangle
                  size={16}
                  className="mt-0.5 shrink-0 text-amber-500"
                />
                <div>
                  <p className="text-sm font-semibold text-amber-800">
                    Late Submission
                  </p>
                  <p className="text-xs text-amber-600">
                    You are submitting this log after the scheduled service
                    window. Please ensure all information is accurate.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Cannot-edit warning ── */}
          <motion.div
            variants={fadeUp}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-500"
          >
            <Lock size={12} className="shrink-0 text-slate-400" />
            Once submitted, this log cannot be edited. Please review carefully
            before submitting.
          </motion.div>

          {/* ── Check-in / Check-out times ── */}
          <motion.div
            variants={fadeUp}
            className="grid grid-cols-1 gap-4 sm:grid-cols-2"
          >
            {/* Check-in */}
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                  <Clock size={13} className="text-[#39B54A]" />
                  Check-in Time
                </label>
                {onCheckIn && (
                  <button
                    type="button"
                    onClick={handleCheckIn}
                    disabled={checkingIn || isDisabled}
                    className="flex items-center gap-1 rounded-lg bg-[#39B54A]/10 px-2 py-0.5 text-xs font-medium text-[#39B54A] transition hover:bg-[#39B54A]/20 disabled:opacity-50"
                  >
                    {checkingIn ? (
                      <Loader2 size={10} className="animate-spin" />
                    ) : null}
                    Mark Now
                  </button>
                )}
              </div>
              <input
                type="time"
                value={checkInTime}
                onChange={(e) => {
                  setCheckInTime(e.target.value);
                  setErrors((prev) => ({ ...prev, checkInTime: "" }));
                }}
                disabled={isDisabled}
                className={`w-full rounded-xl border px-3 py-2.5 text-sm text-slate-800 transition focus:outline-none focus:ring-2 focus:ring-[#39B54A]/30 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-60 ${
                  errors.checkInTime
                    ? "border-red-300 bg-red-50 focus:border-red-400"
                    : "border-slate-300 bg-white hover:border-slate-400 focus:border-[#39B54A]"
                }`}
              />
              <AnimatePresence>
                {errors.checkInTime && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="mt-1 text-xs text-red-500"
                  >
                    {errors.checkInTime}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            {/* Check-out */}
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                  <Clock size={13} className="text-slate-400" />
                  Check-out Time
                </label>
                {onCheckOut && (
                  <button
                    type="button"
                    onClick={handleCheckOut}
                    disabled={checkingOut || isDisabled}
                    className="flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 transition hover:bg-slate-200 disabled:opacity-50"
                  >
                    {checkingOut ? (
                      <Loader2 size={10} className="animate-spin" />
                    ) : null}
                    Mark Now
                  </button>
                )}
              </div>
              <input
                type="time"
                value={checkOutTime}
                onChange={(e) => {
                  setCheckOutTime(e.target.value);
                  setErrors((prev) => ({ ...prev, checkOutTime: "" }));
                }}
                disabled={isDisabled}
                className={`w-full rounded-xl border px-3 py-2.5 text-sm text-slate-800 transition focus:outline-none focus:ring-2 focus:ring-[#39B54A]/30 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-60 ${
                  errors.checkOutTime
                    ? "border-red-300 bg-red-50 focus:border-red-400"
                    : "border-slate-300 bg-white hover:border-slate-400 focus:border-[#39B54A]"
                }`}
              />
              <AnimatePresence>
                {errors.checkOutTime && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="mt-1 text-xs text-red-500"
                  >
                    {errors.checkOutTime}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* ── Tasks Completed ── */}
          <motion.div variants={fadeUp}>
            <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-700">
              <CheckCircle2 size={13} className="text-[#39B54A]" />
              Tasks Completed
              <span className="text-red-400">*</span>
            </label>
            <textarea
              value={tasksCompleted}
              onChange={(e) => {
                setTasksCompleted(e.target.value);
                setErrors((prev) => ({ ...prev, tasksCompleted: "" }));
              }}
              disabled={isDisabled}
              rows={4}
              placeholder="Describe the tasks you completed during this session (e.g., meal preparation, medication reminders, personal hygiene assistance)…"
              className={`w-full resize-none rounded-xl border px-3 py-2.5 text-sm leading-relaxed text-slate-800 placeholder:text-slate-400 transition focus:outline-none focus:ring-2 focus:ring-[#39B54A]/30 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-60 ${
                errors.tasksCompleted
                  ? "border-red-300 bg-red-50 focus:border-red-400"
                  : "border-slate-300 bg-white hover:border-slate-400 focus:border-[#39B54A]"
              }`}
            />
            <AnimatePresence>
              {errors.tasksCompleted && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mt-1 text-xs text-red-500"
                >
                  {errors.tasksCompleted}
                </motion.p>
              )}
            </AnimatePresence>
          </motion.div>

          {/* ── Notes ── */}
          <motion.div variants={fadeUp}>
            <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-700">
              <StickyNote size={13} className="text-slate-400" />
              Notes
              <span className="ml-1 text-xs font-normal text-slate-400">
                (optional)
              </span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isDisabled}
              rows={3}
              placeholder="Any additional observations, care recipient's mood, appetite, or other notes…"
              className="w-full resize-none rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm leading-relaxed text-slate-800 placeholder:text-slate-400 transition hover:border-slate-400 focus:border-[#39B54A] focus:outline-none focus:ring-2 focus:ring-[#39B54A]/30 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-60"
            />
          </motion.div>

          {/* ── Issues ── */}
          <motion.div variants={fadeUp}>
            <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-700">
              <MessageSquareWarning size={13} className="text-slate-400" />
              Issues Reported
              <span className="ml-1 text-xs font-normal text-slate-400">
                (optional)
              </span>
            </label>
            <textarea
              value={issues}
              onChange={(e) => setIssues(e.target.value)}
              disabled={isDisabled}
              rows={3}
              placeholder="Report any incidents, health concerns, or problems encountered…"
              className={`w-full resize-none rounded-xl border px-3 py-2.5 text-sm leading-relaxed text-slate-800 placeholder:text-slate-400 transition focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60 ${
                issueFlag
                  ? "border-red-200 bg-red-50/50 hover:border-red-300 focus:border-red-400 focus:ring-red-200/40 disabled:bg-red-50"
                  : "border-slate-300 bg-white hover:border-slate-400 focus:border-[#39B54A] focus:ring-[#39B54A]/30 disabled:bg-slate-50"
              }`}
            />
          </motion.div>

          {/* ── Issue Flag ── */}
          <motion.div variants={fadeUp}>
            <label
              className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition ${
                issueFlag
                  ? "border-red-200 bg-red-50/70"
                  : "border-slate-200 bg-slate-50 hover:border-slate-300"
              }`}
            >
              <div className="relative mt-0.5">
                <input
                  type="checkbox"
                  checked={issueFlag}
                  onChange={(e) => setIssueFlag(e.target.checked)}
                  disabled={isDisabled}
                  className="sr-only"
                />
                <div
                  className={`flex h-5 w-5 items-center justify-center rounded border-2 transition ${
                    issueFlag
                      ? "border-red-500 bg-red-500"
                      : "border-slate-300 bg-white hover:border-slate-400"
                  }`}
                >
                  <AnimatePresence>
                    {issueFlag && (
                      <motion.svg
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        viewBox="0 0 12 10"
                        fill="none"
                        className="h-3 w-3"
                      >
                        <path
                          d="M1 5L4.5 8.5L11 1.5"
                          stroke="white"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </motion.svg>
                    )}
                  </AnimatePresence>
                </div>
              </div>
              <div>
                <p
                  className={`text-sm font-medium ${issueFlag ? "text-red-700" : "text-slate-700"}`}
                >
                  <Flag size={12} className="mr-1 inline-block" />
                  Flag for admin review
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  Check this if any issues require attention from the
                  CareConnect admin team.
                </p>
              </div>
            </label>
          </motion.div>

          {/* ── POW Image Upload ── */}
          <motion.div variants={fadeUp}>
            <div className="mb-2 flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                <ImageIcon size={13} className="text-[#39B54A]" />
                Proof of Work
                <span className="ml-1 text-xs font-normal text-slate-400">
                  (optional)
                </span>
              </label>
              {images.length > 0 && (
                <span className="rounded-full bg-[#39B54A]/10 px-2 py-0.5 text-xs font-medium text-[#39B54A]">
                  {images.length} image{images.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>

            {/* Drop zone */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => !isDisabled && fileInputRef.current?.click()}
              className={`relative flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 transition ${
                isDisabled
                  ? "cursor-not-allowed border-slate-200 bg-slate-50 opacity-60"
                  : dragOver
                    ? "border-[#39B54A] bg-[#39B54A]/5"
                    : "border-slate-300 bg-slate-50 hover:border-[#39B54A]/60 hover:bg-[#39B54A]/5"
              }`}
            >
              <AnimatePresence mode="wait">
                {dragOver ? (
                  <motion.div
                    key="drag"
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="flex flex-col items-center gap-1"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#39B54A]/15">
                      <Upload size={20} className="text-[#39B54A]" />
                    </div>
                    <p className="text-sm font-medium text-[#39B54A]">
                      Drop to upload
                    </p>
                  </motion.div>
                ) : (
                  <motion.div
                    key="idle"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="flex flex-col items-center gap-1.5 text-center"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-200/80">
                      <Upload size={18} className="text-slate-400" />
                    </div>
                    <p className="text-sm font-medium text-slate-600">
                      Click to upload or drag &amp; drop
                    </p>
                    <p className="text-xs text-slate-400">
                      PNG, JPG, WebP up to any size
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="sr-only"
                onChange={handleFileChange}
                disabled={isDisabled}
              />
            </div>

            {/* Image thumbnails grid */}
            <AnimatePresence>
              {images.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="mt-3 grid grid-cols-3 gap-2 overflow-hidden sm:grid-cols-4"
                >
                  <AnimatePresence>
                    {images.map((img) => (
                      <motion.div
                        key={img.id}
                        variants={thumbVariant}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        layout
                        className="group relative aspect-square overflow-hidden rounded-xl border border-slate-200 bg-slate-100"
                      >
                        <img
                          src={img.dataUrl}
                          alt={img.name}
                          className="h-full w-full object-cover transition group-hover:brightness-75"
                        />
                        {/* Remove button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeImage(img.id);
                          }}
                          disabled={isDisabled}
                          className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition hover:bg-red-600 group-hover:opacity-100 disabled:cursor-not-allowed"
                          aria-label={`Remove ${img.name}`}
                        >
                          <X size={12} />
                        </button>
                        {/* File name tooltip */}
                        <div className="absolute bottom-0 left-0 right-0 translate-y-full bg-black/70 px-1 py-0.5 text-center text-[10px] text-white transition group-hover:translate-y-0">
                          {img.name.length > 14
                            ? img.name.slice(0, 12) + "…"
                            : img.name}
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* ── Submit error ── */}
          <AnimatePresence>
            {errors.submit && (
              <motion.div
                key="submit-error"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                <AlertTriangle size={15} className="mt-0.5 shrink-0" />
                {errors.submit}
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Submit button ── */}
          <motion.div variants={fadeUp} className="pt-1">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isDisabled}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#39B54A] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#2ea040] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <AnimatePresence mode="wait">
                {submitting ? (
                  <motion.span
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-2"
                  >
                    <Loader2 size={16} className="animate-spin" />
                    Submitting…
                  </motion.span>
                ) : (
                  <motion.span
                    key="idle"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-2"
                  >
                    <CheckCircle2 size={16} />
                    Submit Tracking Log
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  );
}

// Named export for convenience
export { TrackingLogForm };
