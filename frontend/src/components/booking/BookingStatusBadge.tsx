"use client";

// ============================================
// BOOKING STATUS BADGE — CareConnect
// Maps every booking lifecycle state to a
// styled, accessible badge with optional icon
// and pulse animation for active states.
// ============================================

import {
  Activity,
  AlertTriangle,
  Ban,
  Bookmark,
  CheckCircle2,
  BadgeCheck,
  Clock,
  CreditCard,
  FileEdit,
  FileText,
  Timer,
  UserCheck,
  XCircle,
  Zap,
} from "lucide-react";

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

export type BookingStatus =
  | "draft"
  | "reserved"
  | "pending"
  | "accepted"
  | "agreement_pending"
  | "payment_pending"
  | "confirmed"
  | "in_progress"
  | "active"
  | "completed"
  | "cancelled"
  | "disputed"
  | "rejected"
  | "expired"
  | (string & {}); // allow arbitrary strings with graceful fallback

export interface BookingStatusBadgeProps {
  status: BookingStatus;
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
  showPulse?: boolean;
  className?: string;
}

// ─────────────────────────────────────────────
// STATUS CONFIG MAP
// ─────────────────────────────────────────────

interface StatusConfig {
  label: string;
  icon: React.ReactNode;
  /** Tailwind classes: background, text, border */
  badge: string;
  /** Dot color class */
  dot: string;
  /** Whether this state should pulse by default */
  pulse: boolean;
}

const STATUS_MAP: Record<string, StatusConfig> = {
  draft: {
    label: "Draft",
    icon: <FileEdit size={12} />,
    badge: "bg-slate-100 text-slate-600 border-slate-200",
    dot: "bg-slate-400",
    pulse: false,
  },
  reserved: {
    label: "Reserved",
    icon: <Bookmark size={12} />,
    badge: "bg-blue-100 text-blue-700 border-blue-200",
    dot: "bg-blue-500",
    pulse: false,
  },
  pending: {
    label: "Pending",
    icon: <Clock size={12} />,
    badge: "bg-amber-100 text-amber-700 border-amber-200",
    dot: "bg-amber-500",
    pulse: false,
  },
  accepted: {
    label: "Accepted",
    icon: <UserCheck size={12} />,
    badge: "bg-sky-100 text-sky-700 border-sky-200",
    dot: "bg-sky-500",
    pulse: false,
  },
  agreement_pending: {
    label: "Agreement Pending",
    icon: <FileText size={12} />,
    badge: "bg-orange-100 text-orange-700 border-orange-200",
    dot: "bg-orange-500",
    pulse: false,
  },
  payment_pending: {
    label: "Payment Pending",
    icon: <CreditCard size={12} />,
    badge: "bg-purple-100 text-purple-700 border-purple-200",
    dot: "bg-purple-500",
    pulse: false,
  },
  confirmed: {
    label: "Confirmed",
    icon: <CheckCircle2 size={12} />,
    badge: "bg-green-100 text-green-700 border-green-200",
    dot: "bg-green-500",
    pulse: false,
  },
  in_progress: {
    label: "In Progress",
    icon: <Activity size={12} />,
    badge: "bg-emerald-100 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
    pulse: true,
  },
  active: {
    label: "Active",
    icon: <Zap size={12} />,
    badge: "bg-emerald-100 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
    pulse: true,
  },
  completed: {
    label: "Completed",
    icon: <BadgeCheck size={12} />,
    badge: "bg-teal-100 text-teal-700 border-teal-200",
    dot: "bg-teal-500",
    pulse: false,
  },
  cancelled: {
    label: "Cancelled",
    icon: <XCircle size={12} />,
    badge: "bg-red-100 text-red-700 border-red-200",
    dot: "bg-red-500",
    pulse: false,
  },
  disputed: {
    label: "Disputed",
    icon: <AlertTriangle size={12} />,
    badge: "bg-rose-100 text-rose-700 border-rose-200",
    dot: "bg-rose-500",
    pulse: false,
  },
  rejected: {
    label: "Rejected",
    icon: <Ban size={12} />,
    badge: "bg-gray-200 text-gray-700 border-gray-300",
    dot: "bg-gray-600",
    pulse: false,
  },
  expired: {
    label: "Expired",
    icon: <Timer size={12} />,
    badge: "bg-gray-100 text-gray-500 border-gray-200",
    dot: "bg-gray-400",
    pulse: false,
  },
};

/** Fallback for any unknown status string */
const FALLBACK_CONFIG: StatusConfig = {
  label: "Unknown",
  icon: <Clock size={12} />,
  badge: "bg-slate-100 text-slate-500 border-slate-200",
  dot: "bg-slate-400",
  pulse: false,
};

// ─────────────────────────────────────────────
// SIZE CLASSES
// ─────────────────────────────────────────────

const SIZE_BADGE: Record<string, string> = {
  sm: "px-2 py-0.5 text-xs gap-1",
  md: "px-2.5 py-1 text-xs gap-1.5",
  lg: "px-3 py-1.5 text-sm gap-2",
};

const SIZE_DOT: Record<string, string> = {
  sm: "h-1.5 w-1.5",
  md: "h-2 w-2",
  lg: "h-2.5 w-2.5",
};

const SIZE_ICON: Record<string, number> = {
  sm: 10,
  md: 12,
  lg: 14,
};

// ─────────────────────────────────────────────
// HELPER — clone icon with corrected size
// ─────────────────────────────────────────────

function resizeIcon(icon: React.ReactNode, size: number): React.ReactNode {
  if (!icon || typeof icon !== "object") return icon;
  const element = icon as React.ReactElement<{ size?: number }>;
  return { ...element, props: { ...element.props, size } };
}

// ─────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────

export default function BookingStatusBadge({
  status,
  size = "md",
  showIcon = true,
  showPulse,
  className = "",
}: BookingStatusBadgeProps) {
  const normalised = status?.toLowerCase().trim() ?? "";
  const config = STATUS_MAP[normalised] ?? FALLBACK_CONFIG;

  // showPulse prop overrides the default; falls back to config value.
  const shouldPulse = showPulse !== undefined ? showPulse : config.pulse;
  const iconSize = SIZE_ICON[size] ?? 12;

  return (
    <span
      role="status"
      aria-label={`Status: ${config.label}`}
      className={[
        "inline-flex items-center font-medium rounded-full border select-none",
        SIZE_BADGE[size],
        config.badge,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* Dot indicator with optional pulse */}
      <span className="relative inline-flex shrink-0 items-center justify-center">
        {shouldPulse && (
          <span
            className={[
              "absolute inline-flex rounded-full opacity-75 animate-ping",
              SIZE_DOT[size],
              config.dot,
            ].join(" ")}
            aria-hidden="true"
          />
        )}
        <span
          className={[
            "relative inline-flex rounded-full shrink-0",
            SIZE_DOT[size],
            config.dot,
          ].join(" ")}
          aria-hidden="true"
        />
      </span>

      {/* Icon */}
      {showIcon && (
        <span className="shrink-0" aria-hidden="true">
          {resizeIcon(config.icon, iconSize)}
        </span>
      )}

      {/* Label — human-readable, supports multi-word statuses */}
      <span className="leading-none whitespace-nowrap">{config.label}</span>
    </span>
  );
}
