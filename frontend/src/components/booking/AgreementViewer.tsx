"use client";

// ============================================
// AGREEMENT VIEWER — CareConnect
// Premium agreement viewer with acceptance
// workflow, PDF download, and party status.
// ============================================

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  CheckCircle2,
  Clock,
  Download,
  Printer,
  Shield,
  AlertTriangle,
  Calendar,
  CreditCard,
  ClipboardList,
  LogOut,
  Gavel,
  Lock,
  Users,
  ChevronDown,
  ChevronUp,
  BadgeCheck,
} from "lucide-react";

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

export interface AgreementContent {
  agreementId: string;
  version: string;
  generatedAt: string;
  parties: {
    careSeeker: { name: string; email: string };
    caregiver: { name: string; email: string };
  };
  bookingDetails: {
    bookingNumber: string;
    serviceType: string;
    startDate: string;
    endDate: string;
    startTime: string;
    endTime: string;
    location: string;
    durationType: string;
  };
  paymentTerms: {
    totalAmount: number;
    currency: string;
    deadlineDays: number;
    partialPaymentAllowed: boolean;
    partialRules: string;
  };
  trackingRules: {
    dailyCheckInRequired: boolean;
    reportSubmissionRequired: boolean;
    proofOfWorkRequired: boolean;
    missedLogAutoFlag: boolean;
  };
  leavePolicy: {
    noSuddenLeave: boolean;
    minNoticeHours: number;
    approvalRequired: boolean;
  };
  penaltyRules: {
    missedWorkPenalty: string;
    lateSubmissionFlag: boolean;
    repeatedMisses: string;
  };
  disputeTerms: {
    evidenceRequired: boolean;
    adminFinalDecision: boolean;
    resolutionDays: number;
  };
  platformRules: {
    noOffPlatformCommunication: boolean;
    dataPrivacy: boolean;
    platformFeePercent: number;
  };
}

export interface AgreementViewerProps {
  bookingId: string;
  bookingNumber: string;
  agreementContent: AgreementContent | null;
  agreementStatus: "generated" | "pending" | "accepted" | "partially_accepted";
  userRole: "caregiver" | "careseeker" | "admin";
  hasCurrentUserAccepted: boolean;
  seekerAccepted?: boolean;
  caregiverAccepted?: boolean;
  onAccept: () => Promise<void>;
  onDownloadPDF: () => Promise<void>;
  isLoading?: boolean;
}

// ─────────────────────────────────────────────
// ANIMATION VARIANTS
// ─────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.07, delayChildren: 0.1 },
  },
};

const sectionVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

const headerVariants = {
  hidden: { opacity: 0, y: -16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

function fmt(currency: string, amount: number): string {
  return `${currency} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

function toTitleCase(str: string): string {
  return str.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────

interface SectionProps {
  id?: string;
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function Section({
  id,
  icon,
  title,
  children,
  defaultOpen = true,
}: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <motion.div
      id={id}
      variants={sectionVariants}
      className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden"
    >
      {/* Section header */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#39B54A] focus-visible:ring-inset"
        aria-expanded={open}
      >
        <div className="flex items-center gap-3">
          {/* Colored left indicator */}
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#39B54A]/10 text-[#39B54A]">
            {icon}
          </span>
          <h3 className="text-sm font-semibold text-slate-800 tracking-wide uppercase">
            {title}
          </h3>
        </div>
        <span className="text-slate-400">
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </span>
      </button>

      {/* Colored left border accent */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="border-t border-slate-100 border-l-4 border-l-[#39B54A] px-5 py-4">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

interface RuleRowProps {
  label: string;
  value: string | boolean | number;
  highlight?: "green" | "amber" | "rose" | "none";
}

function RuleRow({ label, value, highlight = "none" }: RuleRowProps) {
  const displayValue =
    typeof value === "boolean" ? (value ? "Yes" : "No") : String(value);

  const highlightStyles: Record<string, string> = {
    green: "bg-emerald-50 text-emerald-700 font-medium",
    amber: "bg-amber-50 text-amber-700 font-medium",
    rose: "bg-rose-50 text-rose-700 font-medium",
    none: "text-slate-700",
  };

  const boolIcon =
    typeof value === "boolean" ? (
      value ? (
        <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
      ) : (
        <span className="inline-block h-3 w-3 rounded-full bg-slate-300 shrink-0" />
      )
    ) : null;

  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-slate-50 last:border-0">
      <span className="text-sm text-slate-500 leading-snug">{label}</span>
      <span
        className={`text-sm leading-snug text-right flex items-center gap-1.5 ${highlightStyles[highlight]}`}
      >
        {boolIcon}
        {displayValue}
      </span>
    </div>
  );
}

interface PartyCardProps {
  role: "Care Seeker" | "Caregiver";
  name: string;
  email: string;
  accepted: boolean;
  color: "blue" | "green";
}

function PartyCard({ role, name, email, accepted, color }: PartyCardProps) {
  const colorMap = {
    blue: {
      avatar: "bg-blue-100 text-blue-700",
      badge: "bg-emerald-100 text-emerald-700",
      pendingBadge: "bg-amber-100 text-amber-700",
    },
    green: {
      avatar: "bg-[#39B54A]/10 text-[#39B54A]",
      badge: "bg-emerald-100 text-emerald-700",
      pendingBadge: "bg-amber-100 text-amber-700",
    },
  };
  const styles = colorMap[color];

  return (
    <div className="flex-1 min-w-0 rounded-xl border border-slate-100 p-4 bg-slate-50/50">
      <div className="flex items-center gap-3 mb-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${styles.avatar}`}
        >
          {initials(name)}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
            {role}
          </p>
          <p className="text-sm font-semibold text-slate-900 truncate">
            {name}
          </p>
          <p className="text-xs text-slate-400 truncate">{email}</p>
        </div>
      </div>
      {accepted ? (
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${styles.badge}`}
        >
          <CheckCircle2 size={12} />
          Accepted
        </span>
      ) : (
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${styles.pendingBadge}`}
        >
          <Clock size={12} />
          Awaiting acceptance
        </span>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// PENDING / LOADING STATES
// ─────────────────────────────────────────────

function AgreementPending({ bookingNumber }: { bookingNumber: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-20 text-center gap-4"
    >
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-amber-50 border border-amber-200">
        <Clock size={36} className="text-amber-500" />
      </div>
      <div>
        <h3 className="text-lg font-semibold text-slate-800">
          Agreement Pending
        </h3>
        <p className="text-sm text-slate-500 mt-1 max-w-sm">
          The agreement for booking <strong>{bookingNumber}</strong> is being
          generated. Please check back shortly.
        </p>
      </div>
    </motion.div>
  );
}

function AgreementSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="rounded-2xl border border-slate-100 p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-9 w-9 rounded-xl bg-slate-100" />
            <div className="h-4 w-40 rounded bg-slate-100" />
          </div>
          <div className="space-y-2">
            <div className="h-3 w-full rounded bg-slate-100" />
            <div className="h-3 w-5/6 rounded bg-slate-100" />
            <div className="h-3 w-4/6 rounded bg-slate-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────

export default function AgreementViewer({
  bookingId,
  bookingNumber,
  agreementContent,
  agreementStatus,
  userRole,
  hasCurrentUserAccepted,
  seekerAccepted = false,
  caregiverAccepted = false,
  onAccept,
  onDownloadPDF,
  isLoading = false,
}: AgreementViewerProps) {
  const [accepting, setAccepting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const statusAccepted = agreementStatus === "accepted";
  const bothAccepted = statusAccepted || (seekerAccepted && caregiverAccepted);
  const partiallyAccepted =
    !bothAccepted && (seekerAccepted || caregiverAccepted);
  const effectiveSeekerAccepted = bothAccepted ? true : seekerAccepted;
  const effectiveCaregiverAccepted = bothAccepted ? true : caregiverAccepted;

  const handleAccept = async () => {
    if (accepting || hasCurrentUserAccepted) return;
    setAccepting(true);
    try {
      await onAccept();
    } finally {
      setAccepting(false);
    }
  };

  const handleDownload = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      await onDownloadPDF();
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  // ── Render guards ──────────────────────────

  if (isLoading) {
    return (
      <div className="w-full max-w-3xl mx-auto px-4 py-6" data-booking-id={bookingId}>
        <AgreementSkeleton />
      </div>
    );
  }

  if (agreementStatus === "pending" || !agreementContent) {
    return (
      <div className="w-full max-w-3xl mx-auto px-4 py-6" data-booking-id={bookingId}>
        <AgreementPending bookingNumber={bookingNumber} />
      </div>
    );
  }

  const c = agreementContent;

  // ── Full render ────────────────────────────

  return (
    <div
      className="w-full max-w-3xl mx-auto px-4 py-6 print:px-0 print:py-0"
      data-booking-id={bookingId}
    >
      {/* ── HEADER ─────────────────────────────── */}
      <motion.div
        variants={headerVariants}
        initial="hidden"
        animate="visible"
        className="mb-6"
      >
        {/* Top bar */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#39B54A]/10">
              <FileText size={22} className="text-[#39B54A]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 leading-tight">
                Professional Service Agreement
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Booking #{bookingNumber} · v{c.version} · Generated{" "}
                {fmtDate(c.generatedAt)}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 shrink-0 print:hidden">
            <button
              type="button"
              onClick={handleDownload}
              disabled={downloading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 hover:border-slate-300 active:scale-95 transition-all disabled:opacity-50"
            >
              <Download size={15} />
              {downloading ? "Downloading…" : "Download PDF"}
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 hover:border-slate-300 active:scale-95 transition-all"
            >
              <Printer size={15} />
              Print
            </button>
          </div>
        </div>

        {/* Agreement ID pill */}
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-5">
          <BadgeCheck size={13} className="text-[#39B54A]" />
          <span>Agreement ID:</span>
          <code className="font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-700">
            {c.agreementId}
          </code>
        </div>

        {/* ── WARNING BANNER ─────────────────────── */}
        <AnimatePresence>
          {!bothAccepted && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
              className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3.5 mb-2"
            >
              <AlertTriangle
                size={18}
                className="text-amber-500 shrink-0 mt-0.5"
              />
              <div className="text-sm">
                <p className="font-semibold text-amber-800 leading-snug">
                  Acceptance required from both parties
                </p>
                <p className="text-amber-700 mt-0.5 leading-snug">
                  {partiallyAccepted
                    ? "One party has accepted. Waiting for the other party's acceptance before payment can proceed."
                    : "Both the care seeker and caregiver must accept this agreement before payment is possible."}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── ACCEPTANCE STATUS CARDS ─────────────── */}
        <div className="flex flex-col sm:flex-row gap-3 mt-4">
          <PartyCard
            role="Care Seeker"
            name={c.parties.careSeeker.name}
            email={c.parties.careSeeker.email}
            accepted={effectiveSeekerAccepted}
            color="blue"
          />
          <PartyCard
            role="Caregiver"
            name={c.parties.caregiver.name}
            email={c.parties.caregiver.email}
            accepted={effectiveCaregiverAccepted}
            color="green"
          />
        </div>
      </motion.div>

      {/* ── AGREEMENT SECTIONS ─────────────────── */}
      <motion.div
        ref={contentRef}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-3 mb-6"
      >
        {/* 1. PARTIES */}
        <Section
          id="section-parties"
          icon={<Users size={18} />}
          title="Parties Involved"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                Care Seeker
              </p>
              <RuleRow label="Name" value={c.parties.careSeeker.name} />
              <RuleRow label="Email" value={c.parties.careSeeker.email} />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                Caregiver
              </p>
              <RuleRow label="Name" value={c.parties.caregiver.name} />
              <RuleRow label="Email" value={c.parties.caregiver.email} />
            </div>
          </div>
        </Section>

        {/* 2. BOOKING DETAILS */}
        <Section
          id="section-booking"
          icon={<Calendar size={18} />}
          title="Booking Details"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
            <RuleRow
              label="Booking Number"
              value={c.bookingDetails.bookingNumber}
            />
            <RuleRow
              label="Service Type"
              value={toTitleCase(c.bookingDetails.serviceType)}
            />
            <RuleRow
              label="Start Date"
              value={fmtDate(c.bookingDetails.startDate)}
            />
            <RuleRow
              label="End Date"
              value={fmtDate(c.bookingDetails.endDate)}
            />
            <RuleRow label="Start Time" value={c.bookingDetails.startTime} />
            <RuleRow label="End Time" value={c.bookingDetails.endTime} />
            <RuleRow
              label="Duration Type"
              value={toTitleCase(c.bookingDetails.durationType)}
            />
            <RuleRow label="Location" value={c.bookingDetails.location} />
          </div>
        </Section>

        {/* 3. PAYMENT TERMS */}
        <Section
          id="section-payment"
          icon={<CreditCard size={18} />}
          title="Payment Terms"
        >
          <div className="mb-3 inline-flex items-center gap-2 rounded-xl bg-[#39B54A]/10 px-4 py-2.5">
            <span className="text-sm text-slate-600 font-medium">
              Total Amount
            </span>
            <span className="text-lg font-bold text-[#39B54A]">
              {fmt(c.paymentTerms.currency, c.paymentTerms.totalAmount)}
            </span>
          </div>
          <RuleRow
            label="Payment Deadline"
            value={`${c.paymentTerms.deadlineDays} day${c.paymentTerms.deadlineDays !== 1 ? "s" : ""} after confirmation`}
          />
          <RuleRow
            label="Partial Payment Allowed"
            value={c.paymentTerms.partialPaymentAllowed}
            highlight={c.paymentTerms.partialPaymentAllowed ? "green" : "none"}
          />
          {c.paymentTerms.partialPaymentAllowed && (
            <div className="mt-2 rounded-xl bg-amber-50 border border-amber-100 px-3 py-2.5 text-xs text-amber-800">
              <span className="font-semibold">Partial Payment Rules: </span>
              {c.paymentTerms.partialRules}
            </div>
          )}
        </Section>

        {/* 4. TRACKING REQUIREMENTS */}
        <Section
          id="section-tracking"
          icon={<ClipboardList size={18} />}
          title="Tracking Requirements"
        >
          <RuleRow
            label="Daily Check-In Required"
            value={c.trackingRules.dailyCheckInRequired}
            highlight={c.trackingRules.dailyCheckInRequired ? "amber" : "none"}
          />
          <RuleRow
            label="Report Submission Required"
            value={c.trackingRules.reportSubmissionRequired}
            highlight={
              c.trackingRules.reportSubmissionRequired ? "amber" : "none"
            }
          />
          <RuleRow
            label="Proof of Work Required"
            value={c.trackingRules.proofOfWorkRequired}
            highlight={c.trackingRules.proofOfWorkRequired ? "amber" : "none"}
          />
          <RuleRow
            label="Missed Log Auto-Flag"
            value={c.trackingRules.missedLogAutoFlag}
            highlight={c.trackingRules.missedLogAutoFlag ? "rose" : "none"}
          />
          {c.trackingRules.missedLogAutoFlag && (
            <div className="mt-2 rounded-xl bg-rose-50 border border-rose-100 px-3 py-2.5 text-xs text-rose-700">
              <AlertTriangle size={12} className="inline mr-1" />
              Failure to submit daily logs will trigger an automatic flag on
              your account.
            </div>
          )}
        </Section>

        {/* 5. LEAVE POLICY */}
        <Section
          id="section-leave"
          icon={<LogOut size={18} />}
          title="Leave Policy"
        >
          <RuleRow
            label="Sudden Leave Prohibited"
            value={c.leavePolicy.noSuddenLeave}
            highlight={c.leavePolicy.noSuddenLeave ? "rose" : "none"}
          />
          <RuleRow
            label="Minimum Notice Required"
            value={`${c.leavePolicy.minNoticeHours} hour${c.leavePolicy.minNoticeHours !== 1 ? "s" : ""}`}
            highlight="amber"
          />
          <RuleRow
            label="Approval Required Before Leave"
            value={c.leavePolicy.approvalRequired}
            highlight={c.leavePolicy.approvalRequired ? "amber" : "none"}
          />
        </Section>

        {/* 6. PENALTY RULES */}
        <Section
          id="section-penalties"
          icon={<Gavel size={18} />}
          title="Penalty Rules"
        >
          <RuleRow
            label="Missed Work Penalty"
            value={c.penaltyRules.missedWorkPenalty}
            highlight="rose"
          />
          <RuleRow
            label="Late Submission Flag"
            value={c.penaltyRules.lateSubmissionFlag}
            highlight={c.penaltyRules.lateSubmissionFlag ? "amber" : "none"}
          />
          <RuleRow
            label="Repeated Misses Policy"
            value={c.penaltyRules.repeatedMisses}
            highlight="rose"
          />
        </Section>

        {/* 7. DISPUTE TERMS */}
        <Section
          id="section-disputes"
          icon={<AlertTriangle size={18} />}
          title="Dispute Terms"
        >
          <RuleRow
            label="Evidence Required for Disputes"
            value={c.disputeTerms.evidenceRequired}
            highlight={c.disputeTerms.evidenceRequired ? "amber" : "none"}
          />
          <RuleRow
            label="Admin Final Decision"
            value={c.disputeTerms.adminFinalDecision}
            highlight={c.disputeTerms.adminFinalDecision ? "green" : "none"}
          />
          <RuleRow
            label="Resolution Timeline"
            value={`${c.disputeTerms.resolutionDays} business day${c.disputeTerms.resolutionDays !== 1 ? "s" : ""}`}
          />
        </Section>

        {/* 8. PLATFORM RULES */}
        <Section
          id="section-platform"
          icon={<Shield size={18} />}
          title="Platform Rules"
        >
          <RuleRow
            label="No Off-Platform Communication"
            value={c.platformRules.noOffPlatformCommunication}
            highlight={
              c.platformRules.noOffPlatformCommunication ? "rose" : "none"
            }
          />
          <RuleRow
            label="Data Privacy Policy"
            value={c.platformRules.dataPrivacy ? "Agreed" : "Not agreed"}
            highlight={c.platformRules.dataPrivacy ? "green" : "none"}
          />
          <RuleRow
            label="Platform Service Fee"
            value={`${c.platformRules.platformFeePercent}%`}
          />
          <div className="mt-3 flex items-start gap-2 rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5 text-xs text-slate-600">
            <Lock size={13} className="shrink-0 text-slate-400 mt-0.5" />
            All interactions, payments, and communications must occur through
            the CareConnect platform. Violations may result in account
            suspension.
          </div>
        </Section>
      </motion.div>

      {/* ── ACCEPT ACTION AREA ─────────────────── */}
      <motion.div
        variants={sectionVariants}
        initial="hidden"
        animate="visible"
        transition={{ delay: 0.5 }}
        className="print:hidden"
      >
        {/* Role-specific action area */}
        {userRole !== "admin" && (
          <div className="rounded-2xl border border-slate-200 bg-linear-to-br from-white to-slate-50 p-5 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h4 className="text-sm font-semibold text-slate-900">
                  {hasCurrentUserAccepted
                    ? "You have accepted this agreement"
                    : "Ready to accept?"}
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  {hasCurrentUserAccepted
                    ? "Your acceptance has been recorded. Waiting for the other party."
                    : "By clicking accept, you formally acknowledge and agree to all contractual terms outlined above."}
                </p>
              </div>

              {hasCurrentUserAccepted ? (
                <span className="inline-flex items-center gap-2 rounded-xl bg-emerald-100 px-4 py-2 text-sm font-semibold text-emerald-700 shrink-0">
                  <CheckCircle2 size={16} />
                  Agreement Accepted
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleAccept}
                  disabled={accepting || hasCurrentUserAccepted}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#39B54A] px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-[#39B54A]/25 hover:bg-[#2ea040] active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100 shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#39B54A] focus-visible:ring-offset-2"
                >
                  {accepting ? (
                    <>
                      <svg
                        className="h-4 w-4 animate-spin"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48 2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48 2.83-2.83"
                        />
                      </svg>
                      Submitting…
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} />I Accept this Agreement
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Both accepted celebration */}
            <AnimatePresence>
              {bothAccepted && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-800">
                    <CheckCircle2
                      size={16}
                      className="text-emerald-500 shrink-0"
                    />
                    <span>
                      <strong>Both parties have accepted.</strong> Payment can
                      now proceed.
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Admin view */}
        {userRole === "admin" && (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
            <div className="flex items-center gap-2 mb-1">
              <Shield size={15} className="text-slate-400" />
              <span className="font-semibold text-slate-700">Admin View</span>
            </div>
            <p>
              Status:{" "}
              <span className="font-medium text-slate-900 capitalize">
                {agreementStatus.replace(/_/g, " ")}
              </span>{" "}
              · Seeker: {effectiveSeekerAccepted ? "Accepted" : "Pending"} · Caregiver:{" "}
              {effectiveCaregiverAccepted ? "Accepted" : "Pending"}
            </p>
          </div>
        )}
      </motion.div>
    </div>
  );
}
