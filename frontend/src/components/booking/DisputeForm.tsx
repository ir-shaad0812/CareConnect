"use client";

// ============================================
// DISPUTE FORM — CareConnect
// Premium dispute creation modal used by
// caregivers / care-seekers to raise a formal
// dispute against a booking. Slide-up on mobile,
// centred dialog on desktop. Framer-Motion
// powered open / close transitions.
// ============================================

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  AlertTriangle,
  CreditCard,
  Star,
  UserX,
  ShieldAlert,
  HelpCircle,
  Upload,
  ImageIcon,
  Trash2,
  CheckSquare,
  Square,
  ChevronDown,
  Loader2,
  FileWarning,
  Info,
} from "lucide-react";

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

export interface DisputeSubmitData {
  bookingId: string;
  category: string;
  subject: string;
  description: string;
  evidence: File[];
}

export interface DisputeFormProps {
  bookingId: string;
  bookingNumber: string;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: DisputeSubmitData) => Promise<void>;
}

// ─────────────────────────────────────────────
// CATEGORY CONFIG
// ─────────────────────────────────────────────

interface CategoryConfig {
  value: string;
  label: string;
  icon: React.ReactNode;
  description: string;
  badgeBg: string;
  badgeText: string;
  iconBg: string;
}

const CATEGORIES: CategoryConfig[] = [
  {
    value: "payment_dispute",
    label: "Payment Dispute",
    icon: <CreditCard size={15} />,
    description: "Incorrect charge, missing refund, or payment issue",
    badgeBg: "bg-purple-100",
    badgeText: "text-purple-700",
    iconBg: "bg-purple-100 text-purple-600",
  },
  {
    value: "service_quality",
    label: "Service Quality",
    icon: <Star size={15} />,
    description: "Caregiver did not meet expected service standards",
    badgeBg: "bg-amber-100",
    badgeText: "text-amber-700",
    iconBg: "bg-amber-100 text-amber-600",
  },
  {
    value: "no_show",
    label: "No Show",
    icon: <UserX size={15} />,
    description: "Caregiver did not appear for the scheduled session",
    badgeBg: "bg-rose-100",
    badgeText: "text-rose-700",
    iconBg: "bg-rose-100 text-rose-600",
  },
  {
    value: "misconduct",
    label: "Misconduct",
    icon: <ShieldAlert size={15} />,
    description: "Inappropriate behaviour or policy violation",
    badgeBg: "bg-red-100",
    badgeText: "text-red-700",
    iconBg: "bg-red-100 text-red-600",
  },
  {
    value: "other",
    label: "Other",
    icon: <HelpCircle size={15} />,
    description: "Any other issue not covered by the above categories",
    badgeBg: "bg-slate-100",
    badgeText: "text-slate-700",
    iconBg: "bg-slate-100 text-slate-600",
  },
];

// ─────────────────────────────────────────────
// ANIMATION VARIANTS
// ─────────────────────────────────────────────

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.25, ease: "easeOut" } },
  exit: { opacity: 0, transition: { duration: 0.2, ease: "easeIn" } },
};

const mobileSheetVariants = {
  hidden: { y: "100%", opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: "spring", damping: 30, stiffness: 300 },
  },
  exit: {
    y: "100%",
    opacity: 0,
    transition: { duration: 0.25, ease: "easeIn" },
  },
};

const desktopModalVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: "spring", damping: 28, stiffness: 320 },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 20,
    transition: { duration: 0.2, ease: "easeIn" },
  },
};

const fieldVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.06,
      duration: 0.35,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  }),
};

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

function getCategoryConfig(value: string): CategoryConfig {
  return (
    CATEGORIES.find((c) => c.value === value) ??
    CATEGORIES[CATEGORIES.length - 1]
  );
}

interface ImagePreview {
  file: File;
  previewUrl: string;
  id: string;
}

// ─────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────

interface CategoryBadgeProps {
  config: CategoryConfig;
  size?: "sm" | "md";
}
function CategoryBadge({ config, size = "md" }: CategoryBadgeProps) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 rounded-full font-medium",
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-xs",
        config.badgeBg,
        config.badgeText,
      ].join(" ")}
    >
      <span className={`rounded-full p-0.5 ${config.iconBg}`}>
        {config.icon}
      </span>
      {config.label}
    </span>
  );
}

interface EvidenceDropZoneProps {
  previews: ImagePreview[];
  isDragging: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  onFileSelect: (files: FileList | null) => void;
  onRemove: (id: string) => void;
  error?: string | undefined;
  inputRef: React.RefObject<HTMLInputElement | null>;
}

function EvidenceDropZone({
  previews,
  isDragging,
  onDragOver,
  onDragLeave,
  onDrop,
  onFileSelect,
  onRemove,
  error,
  inputRef,
}: EvidenceDropZoneProps) {
  return (
    <div>
      {/* Mandatory warning */}
      <div className="mb-2 flex items-center gap-1.5 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2">
        <Info size={13} className="shrink-0 text-orange-500" />
        <p className="text-xs font-medium text-orange-700">
          Evidence is mandatory for disputes. At least one image is required.
        </p>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={[
          "group relative cursor-pointer rounded-xl border-2 border-dashed p-5 text-center transition-all duration-200",
          isDragging
            ? "border-orange-400 bg-orange-50"
            : error
              ? "border-red-300 bg-red-50 hover:border-red-400"
              : "border-slate-300 bg-slate-50 hover:border-orange-400 hover:bg-orange-50",
        ].join(" ")}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => onFileSelect(e.target.files)}
        />
        <div className="pointer-events-none flex flex-col items-center gap-2">
          <div
            className={[
              "rounded-full p-3 transition-colors",
              isDragging
                ? "bg-orange-200"
                : "bg-slate-200 group-hover:bg-orange-200",
            ].join(" ")}
          >
            <Upload
              size={20}
              className={
                isDragging
                  ? "text-orange-600"
                  : "text-slate-500 group-hover:text-orange-600"
              }
            />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-700">
              {isDragging
                ? "Drop images here"
                : "Click or drag & drop evidence images"}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              PNG, JPG, WebP — max 10MB each
            </p>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-red-500">
          <AlertTriangle size={12} />
          {error}
        </p>
      )}

      {/* Preview grid */}
      {previews.length > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4"
        >
          {previews.map((p) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              className="group relative aspect-square overflow-hidden rounded-lg border border-slate-200 bg-slate-100"
            >
              <img
                src={p.previewUrl}
                alt="Evidence"
                className="h-full w-full object-cover"
              />
              {/* Hover overlay */}
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(p.id);
                  }}
                  className="rounded-full bg-red-500 p-1.5 text-white shadow-lg transition-transform hover:scale-110 active:scale-95"
                  aria-label="Remove evidence"
                >
                  <Trash2 size={13} />
                </button>
              </div>
              {/* File name tooltip */}
              <div className="absolute bottom-0 left-0 right-0 truncate bg-black/50 px-1.5 py-0.5 text-[10px] text-white">
                {p.file.name}
              </div>
            </motion.div>
          ))}
          {/* Add more tile */}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex aspect-square items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 text-slate-400 transition hover:border-orange-400 hover:text-orange-500"
          >
            <ImageIcon size={20} />
          </button>
        </motion.div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// VALIDATION
// ─────────────────────────────────────────────

interface FormErrors {
  category?: string | undefined;
  subject?: string | undefined;
  description?: string | undefined;
  evidence?: string | undefined;
  terms?: string | undefined;
}

function validateForm(
  category: string,
  subject: string,
  description: string,
  evidence: ImagePreview[],
  termsAccepted: boolean,
): FormErrors {
  const errors: FormErrors = {};
  if (!category) errors.category = "Please select a dispute category.";
  if (!subject.trim()) errors.subject = "Subject is required.";
  else if (subject.trim().length > 100)
    errors.subject = "Subject cannot exceed 100 characters.";
  if (!description.trim()) errors.description = "Description is required.";
  else if (description.trim().length < 50)
    errors.description = `Description must be at least 50 characters (${description.trim().length}/50).`;
  else if (description.trim().length > 2000)
    errors.description = "Description cannot exceed 2000 characters.";
  if (evidence.length === 0)
    errors.evidence = "At least one piece of evidence is required.";
  if (!termsAccepted)
    errors.terms = "You must accept the terms before submitting.";
  return errors;
}

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────

export default function DisputeForm({
  bookingId,
  bookingNumber,
  isOpen,
  onClose,
  onSubmit,
}: DisputeFormProps) {
  // Form state
  const [category, setCategory] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [evidence, setEvidence] = useState<ImagePreview[]>([]);
  const [termsAccepted, setTermsAccepted] = useState(false);

  // UI state
  const [isDragging, setIsDragging] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [categoryOpen, setCategoryOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      evidence.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      // slight delay so exit animation plays first
      const t = setTimeout(() => {
        setCategory("");
        setSubject("");
        setDescription("");
        setEvidence((prev) => {
          prev.forEach((p) => URL.revokeObjectURL(p.previewUrl));
          return [];
        });
        setTermsAccepted(false);
        setErrors({});
        setSubmitError(null);
        setCategoryOpen(false);
      }, 300);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [isOpen]);

  // ── File handling ───────────────────────────

  const addFiles = useCallback((files: FileList | null) => {
    if (!files) return;
    const valid: ImagePreview[] = [];
    Array.from(files).forEach((file) => {
      if (!file.type.startsWith("image/")) return;
      if (file.size > 10 * 1024 * 1024) return; // 10 MB limit
      valid.push({
        file,
        previewUrl: URL.createObjectURL(file),
        id: `${file.name}-${Date.now()}-${Math.random()}`,
      });
    });
    setEvidence((prev) => [...prev, ...valid]);
    setErrors((prev) => ({ ...prev, evidence: undefined }) as FormErrors);
    // reset input so same file can be re-added after removal
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const removeEvidence = useCallback((id: string) => {
    setEvidence((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((p) => p.id !== id);
    });
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => setIsDragging(false), []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      addFiles(e.dataTransfer.files);
    },
    [addFiles],
  );

  // ── Submit ──────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors = validateForm(
      category,
      subject,
      description,
      evidence,
      termsAccepted,
    );
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors({});
    setSubmitError(null);
    setSubmitting(true);
    try {
      await onSubmit({
        bookingId,
        category,
        subject: subject.trim(),
        description: description.trim(),
        evidence: evidence.map((p) => p.file),
      });
      onClose();
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Failed to submit dispute. Please try again.";
      setSubmitError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Derived ─────────────────────────────────

  const selectedCat = category ? getCategoryConfig(category) : null;
  const descLen = description.length;
  const subjectLen = subject.length;

  // ── Render ──────────────────────────────────

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          {/* Overlay */}
          <motion.div
            key="dispute-overlay"
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Modal — mobile: slide-up sheet; desktop: centered dialog */}
          <motion.div
            key="dispute-modal"
            ref={modalRef}
            variants={
              typeof window !== "undefined" && window.innerWidth < 640
                ? mobileSheetVariants
                : desktopModalVariants
            }
            initial="hidden"
            animate="visible"
            exit="exit"
            role="dialog"
            aria-modal="true"
            aria-labelledby="dispute-modal-title"
            className="relative z-10 w-full max-w-lg rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
            style={{ maxHeight: "92dvh" }}
          >
            {/* Drag handle (mobile only) */}
            <div className="flex justify-center pt-3 sm:hidden">
              <div className="h-1.5 w-10 rounded-full bg-slate-300" />
            </div>

            {/* Scrollable inner */}
            <div className="flex max-h-[92dvh] flex-col overflow-hidden">
              {/* ── Header ── */}
              <div className="shrink-0 border-b border-slate-100 px-5 pb-4 pt-4 sm:pt-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100">
                      <FileWarning size={20} className="text-red-600" />
                    </div>
                    <div>
                      <h2
                        id="dispute-modal-title"
                        className="text-base font-semibold text-slate-900"
                      >
                        Raise a Dispute
                      </h2>
                      <p className="text-xs text-slate-500">
                        Booking #{bookingNumber}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={submitting}
                    className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40"
                    aria-label="Close dispute form"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Warning banner */}
                <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3">
                  <AlertTriangle
                    size={15}
                    className="mt-0.5 shrink-0 text-amber-500"
                  />
                  <p className="text-xs leading-relaxed text-amber-800">
                    <strong>Important:</strong> Disputes are reviewed by our
                    admin team. False or fabricated disputes may result in
                    account suspension or permanent ban.
                  </p>
                </div>
              </div>

              {/* ── Form body ── */}
              <form
                onSubmit={handleSubmit}
                className="flex-1 overflow-y-auto px-5 py-5"
                noValidate
              >
                <div className="flex flex-col gap-5">
                  {/* Category */}
                  <motion.div
                    custom={0}
                    variants={fieldVariants}
                    initial="hidden"
                    animate="visible"
                  >
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Dispute Category <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setCategoryOpen((v) => !v)}
                        className={[
                          "flex w-full items-center justify-between rounded-xl border px-3.5 py-2.5 text-left text-sm transition focus:outline-none focus:ring-2 focus:ring-offset-1",
                          errors.category
                            ? "border-red-300 bg-red-50 focus:ring-red-300"
                            : "border-slate-200 bg-white focus:ring-orange-300 hover:border-slate-300",
                        ].join(" ")}
                        aria-haspopup="listbox"
                        aria-expanded={categoryOpen}
                      >
                        {selectedCat ? (
                          <CategoryBadge config={selectedCat} />
                        ) : (
                          <span className="text-slate-400">
                            Select a category…
                          </span>
                        )}
                        <ChevronDown
                          size={16}
                          className={[
                            "shrink-0 text-slate-400 transition-transform",
                            categoryOpen ? "rotate-180" : "",
                          ].join(" ")}
                        />
                      </button>

                      <AnimatePresence>
                        {categoryOpen && (
                          <motion.ul
                            initial={{ opacity: 0, y: -6, scale: 0.97 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -6, scale: 0.97 }}
                            transition={{ duration: 0.15 }}
                            role="listbox"
                            className="absolute left-0 right-0 top-full z-20 mt-1.5 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg"
                          >
                            {CATEGORIES.map((cat) => (
                              <li
                                key={cat.value}
                                role="option"
                                aria-selected={category === cat.value}
                                onClick={() => {
                                  setCategory(cat.value);
                                  setCategoryOpen(false);
                                  setErrors(
                                    (prev) =>
                                      ({
                                        ...prev,
                                        category: undefined,
                                      }) as FormErrors,
                                  );
                                }}
                                className={[
                                  "flex cursor-pointer items-start gap-3 px-4 py-3 transition-colors",
                                  category === cat.value
                                    ? "bg-orange-50"
                                    : "hover:bg-slate-50",
                                ].join(" ")}
                              >
                                <span
                                  className={`mt-0.5 rounded-lg p-1.5 ${cat.iconBg}`}
                                >
                                  {cat.icon}
                                </span>
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-slate-800">
                                    {cat.label}
                                  </p>
                                  <p className="text-xs text-slate-500">
                                    {cat.description}
                                  </p>
                                </div>
                              </li>
                            ))}
                          </motion.ul>
                        )}
                      </AnimatePresence>
                    </div>
                    {errors.category && (
                      <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-red-500">
                        <AlertTriangle size={11} />
                        {errors.category}
                      </p>
                    )}
                  </motion.div>

                  {/* Subject */}
                  <motion.div
                    custom={1}
                    variants={fieldVariants}
                    initial="hidden"
                    animate="visible"
                  >
                    <div className="mb-1.5 flex items-center justify-between">
                      <label
                        htmlFor="dispute-subject"
                        className="text-sm font-medium text-slate-700"
                      >
                        Subject <span className="text-red-500">*</span>
                      </label>
                      <span
                        className={`text-xs tabular-nums ${
                          subjectLen > 90
                            ? "text-red-500"
                            : subjectLen > 70
                              ? "text-amber-500"
                              : "text-slate-400"
                        }`}
                      >
                        {subjectLen}/100
                      </span>
                    </div>
                    <input
                      id="dispute-subject"
                      type="text"
                      value={subject}
                      maxLength={100}
                      onChange={(e) => {
                        setSubject(e.target.value);
                        if (errors.subject)
                          setErrors(
                            (prev) =>
                              ({ ...prev, subject: undefined }) as FormErrors,
                          );
                      }}
                      placeholder="Briefly describe the issue (e.g. Caregiver did not arrive on time)"
                      className={[
                        "w-full rounded-xl border px-3.5 py-2.5 text-sm transition placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-offset-1",
                        errors.subject
                          ? "border-red-300 bg-red-50 focus:ring-red-300"
                          : "border-slate-200 bg-white focus:ring-orange-300 hover:border-slate-300",
                      ].join(" ")}
                    />
                    {errors.subject && (
                      <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-red-500">
                        <AlertTriangle size={11} />
                        {errors.subject}
                      </p>
                    )}
                  </motion.div>

                  {/* Description */}
                  <motion.div
                    custom={2}
                    variants={fieldVariants}
                    initial="hidden"
                    animate="visible"
                  >
                    <div className="mb-1.5 flex items-center justify-between">
                      <label
                        htmlFor="dispute-description"
                        className="text-sm font-medium text-slate-700"
                      >
                        Description <span className="text-red-500">*</span>
                      </label>
                      <span
                        className={`text-xs tabular-nums ${
                          descLen > 1900
                            ? "text-red-500"
                            : descLen > 1600
                              ? "text-amber-500"
                              : descLen < 50 && descLen > 0
                                ? "text-amber-500"
                                : "text-slate-400"
                        }`}
                      >
                        {descLen}/2000
                        {descLen < 50 && descLen > 0 && (
                          <span className="ml-1 text-amber-500">
                            (min {50 - descLen} more)
                          </span>
                        )}
                      </span>
                    </div>
                    <textarea
                      id="dispute-description"
                      rows={5}
                      value={description}
                      maxLength={2000}
                      onChange={(e) => {
                        setDescription(e.target.value);
                        if (errors.description)
                          setErrors(
                            (prev) =>
                              ({
                                ...prev,
                                description: undefined,
                              }) as FormErrors,
                          );
                      }}
                      placeholder="Provide a detailed account of what happened, including dates, times, and any relevant context. Minimum 50 characters required."
                      className={[
                        "w-full resize-none rounded-xl border px-3.5 py-2.5 text-sm leading-relaxed transition placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-offset-1",
                        errors.description
                          ? "border-red-300 bg-red-50 focus:ring-red-300"
                          : "border-slate-200 bg-white focus:ring-orange-300 hover:border-slate-300",
                      ].join(" ")}
                    />
                    {errors.description && (
                      <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-red-500">
                        <AlertTriangle size={11} />
                        {errors.description}
                      </p>
                    )}
                  </motion.div>

                  {/* Evidence upload */}
                  <motion.div
                    custom={3}
                    variants={fieldVariants}
                    initial="hidden"
                    animate="visible"
                  >
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Evidence / Proof of Work{" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <EvidenceDropZone
                      previews={evidence}
                      isDragging={isDragging}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onFileSelect={addFiles}
                      onRemove={removeEvidence}
                      error={errors.evidence}
                      inputRef={fileInputRef}
                    />
                  </motion.div>

                  {/* Terms acknowledgment */}
                  <motion.div
                    custom={4}
                    variants={fieldVariants}
                    initial="hidden"
                    animate="visible"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setTermsAccepted((v) => !v);
                        if (errors.terms)
                          setErrors(
                            (prev) =>
                              ({ ...prev, terms: undefined }) as FormErrors,
                          );
                      }}
                      className={[
                        "flex w-full items-start gap-3 rounded-xl border p-3.5 text-left transition",
                        errors.terms
                          ? "border-red-300 bg-red-50"
                          : termsAccepted
                            ? "border-orange-300 bg-orange-50"
                            : "border-slate-200 bg-slate-50 hover:border-slate-300",
                      ].join(" ")}
                    >
                      <span className="mt-0.5 shrink-0">
                        {termsAccepted ? (
                          <CheckSquare size={18} className="text-orange-500" />
                        ) : (
                          <Square
                            size={18}
                            className={
                              errors.terms ? "text-red-400" : "text-slate-400"
                            }
                          />
                        )}
                      </span>
                      <span className="text-xs leading-relaxed text-slate-700">
                        I confirm this dispute is genuine and I have provided
                        accurate and truthful evidence. I understand that
                        submitting false disputes may result in account
                        suspension.
                      </span>
                    </button>
                    {errors.terms && (
                      <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-red-500">
                        <AlertTriangle size={11} />
                        {errors.terms}
                      </p>
                    )}
                  </motion.div>

                  {/* API / server error */}
                  <AnimatePresence>
                    {submitError && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                          <AlertTriangle
                            size={15}
                            className="mt-0.5 shrink-0 text-red-500"
                          />
                          <p className="text-sm text-red-700">{submitError}</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </form>

              {/* ── Footer ── */}
              <div className="shrink-0 border-t border-slate-100 px-5 pb-6 pt-4 sm:pb-5">
                {/* Selected category preview */}
                {selectedCat && (
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-xs text-slate-500">Category:</span>
                    <CategoryBadge config={selectedCat} size="sm" />
                  </div>
                )}

                <div className="flex gap-2.5">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={submitting}
                    className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {submitting ? (
                      <>
                        <Loader2 size={15} className="animate-spin" />
                        Submitting…
                      </>
                    ) : (
                      <>
                        <FileWarning size={15} />
                        Submit Dispute
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
