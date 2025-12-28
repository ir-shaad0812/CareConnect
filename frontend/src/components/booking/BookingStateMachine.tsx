"use client";

// ============================================
// BOOKING STATE MACHINE — CareConnect
// Visual timeline showing the full booking
// lifecycle with framer-motion animations.
//
// Display flow:
//   Submitted → Caregiver Accepted → Agreement Required →
//   Payment Pending → Payment Completed → Active → Completed
//
// Underlying status flow:
//   PENDING → ACCEPTED → AGREEMENT_PENDING →
//   PAYMENT_PENDING → CONFIRMED → ACTIVE → COMPLETED
//
// Terminal states (banners):
//   CANCELLED | DISPUTED
// ============================================

import { motion, AnimatePresence } from "framer-motion";
import { Check, X, AlertTriangle } from "lucide-react";
import { useMemo } from "react";

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

export interface BookingStateMachineProps {
  currentStatus: string;
  timestamps?: {
    pending?: string;
    accepted?: string;
    agreement_pending?: string;
    payment_pending?: string;
    confirmed?: string;
    active?: string;
    completed?: string;
    cancelled?: string;
    disputed?: string;
  };
  /** Compact mode: smaller circles, no step descriptions. */
  compact?: boolean;
  className?: string;
}

type StepKey =
  | "pending"
  | "accepted"
  | "agreement_pending"
  | "payment_pending"
  | "confirmed"
  | "active"
  | "completed";

interface Step {
  key: StepKey;
  icon: string;
  label: string;
  description: string;
}

type StepState = "completed" | "current" | "future";

// ─────────────────────────────────────────────
// STEP DEFINITIONS
// ─────────────────────────────────────────────

const STEPS: Step[] = [
  {
    key: "pending",
    icon: "📩",
    label: "Submitted",
    description: "Waiting for caregiver response",
  },
  {
    key: "accepted",
    icon: "👍",
    label: "Caregiver Accepted",
    description: "Caregiver accepted the request. Agreement signing starts.",
  },
  {
    key: "agreement_pending",
    icon: "📄",
    label: "Agreement Required",
    description: "Care seeker and caregiver must both accept.",
  },
  {
    key: "payment_pending",
    icon: "🔒",
    label: "Payment Pending",
    description: "Agreement complete. Care seeker payment is required.",
  },
  {
    key: "confirmed",
    icon: "💳",
    label: "Payment Completed",
    description: "Payment received. Booking is confirmed.",
  },
  {
    key: "active",
    icon: "🔓",
    label: "Active",
    description: "Care session in progress",
  },
  {
    key: "completed",
    icon: "🏁",
    label: "Completed",
    description: "Service finished",
  },
];

/** Map every possible backend status string → the step key it maps to. */
const STATUS_TO_KEY: Record<string, StepKey> = {
  pending: "pending",
  accepted: "accepted",
  agreement_pending: "agreement_pending",
  payment_pending: "payment_pending",
  confirmed: "confirmed",
  in_progress: "active",
  active: "active",
  completed: "completed",
};

const STEP_ORDER: StepKey[] = STEPS.map((s) => s.key);

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

function normalise(status: string): string {
  return status?.toLowerCase().trim() ?? "";
}

function isTerminal(status: string): "cancelled" | "disputed" | null {
  const s = normalise(status);
  if (s === "cancelled") return "cancelled";
  if (s === "disputed") return "disputed";
  return null;
}

function getStepState(
  _stepKey: StepKey,
  currentStepIndex: number,
  stepIndex: number,
): StepState {
  if (stepIndex < currentStepIndex) return "completed";
  if (stepIndex === currentStepIndex) return "current";
  return "future";
}

function formatTimestamp(iso?: string): string | null {
  if (!iso) return null;
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────

// ── Step Circle ──────────────────────────────

interface StepCircleProps {
  step: Step;
  state: StepState;
  compact: boolean;
  index: number;
}

function StepCircle({ step, state, compact, index }: StepCircleProps) {
  const size = compact ? "h-8 w-8 text-base" : "h-12 w-12 text-xl";
  const ringSize = compact ? "h-10 w-10" : "h-16 w-16";

  return (
    <div className="relative flex items-center justify-center">
      {/* Pulsing ring for current step */}
      <AnimatePresence>
        {state === "current" && (
          <motion.span
            key="pulse-ring"
            className={`absolute ${ringSize} rounded-full border-2 border-emerald-400`}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: [0.6, 0], scale: [1, 1.6] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* Circle */}
      <motion.div
        className={[
          "relative z-10 flex items-center justify-center rounded-full font-medium shrink-0 select-none",
          size,
          state === "completed"
            ? "bg-emerald-500 text-white shadow-emerald-200 shadow-md"
            : state === "current"
              ? "bg-emerald-500 text-white ring-4 ring-emerald-200 shadow-emerald-300 shadow-lg"
              : "bg-slate-100 text-slate-400 border-2 border-slate-200",
        ]
          .filter(Boolean)
          .join(" ")}
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: index * 0.07, duration: 0.35, ease: "backOut" }}
      >
        {state === "completed" ? (
          <Check size={compact ? 14 : 18} strokeWidth={3} aria-hidden="true" />
        ) : (
          <span aria-hidden="true">{step.icon}</span>
        )}
      </motion.div>
    </div>
  );
}

// ── Connector Line ────────────────────────────

interface ConnectorProps {
  completed: boolean;
  vertical: boolean;
  compact: boolean;
  index: number;
}

function Connector({ completed, vertical, compact, index }: ConnectorProps) {
  if (vertical) {
    // Vertical connector (mobile): fixed height strip
    const height = compact ? "h-6" : "h-8";
    return (
      <div
        className={`w-0.5 ${height} mx-auto relative overflow-hidden rounded-full bg-slate-200`}
        aria-hidden="true"
      >
        <motion.div
          className="absolute inset-0 bg-emerald-400 origin-top rounded-full"
          initial={{ scaleY: 0 }}
          animate={{ scaleY: completed ? 1 : 0 }}
          transition={{
            delay: index * 0.07 + 0.15,
            duration: 0.4,
            ease: "easeInOut",
          }}
        />
      </div>
    );
  }

  // Horizontal connector (desktop): flex-1 strip
  return (
    <div
      className="flex-1 h-0.5 relative overflow-hidden rounded-full bg-slate-200 mx-1"
      aria-hidden="true"
    >
      <motion.div
        className="absolute inset-0 bg-emerald-400 origin-left rounded-full"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: completed ? 1 : 0 }}
        transition={{
          delay: index * 0.07 + 0.15,
          duration: 0.4,
          ease: "easeInOut",
        }}
      />
    </div>
  );
}

// ── Terminal Banner ───────────────────────────

interface TerminalBannerProps {
  type: "cancelled" | "disputed";
  /** Optional ISO timestamp; may be absent or explicitly undefined. */
  timestamp?: string | undefined;
}

function TerminalBanner({ type, timestamp }: TerminalBannerProps) {
  const isCancelled = type === "cancelled";
  const ts = formatTimestamp(timestamp);

  return (
    <motion.div
      className={[
        "w-full rounded-xl border flex items-start gap-3 px-5 py-4",
        isCancelled
          ? "bg-red-50 border-red-200 text-red-700"
          : "bg-orange-50 border-orange-200 text-orange-700",
      ].join(" ")}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      role="status"
      aria-label={isCancelled ? "Booking cancelled" : "Booking disputed"}
    >
      <span
        className={[
          "mt-0.5 shrink-0 rounded-full p-1.5",
          isCancelled ? "bg-red-100" : "bg-orange-100",
        ].join(" ")}
        aria-hidden="true"
      >
        {isCancelled ? (
          <X size={18} strokeWidth={2.5} />
        ) : (
          <AlertTriangle size={18} strokeWidth={2.5} />
        )}
      </span>
      <div className="min-w-0">
        <p className="font-semibold text-sm leading-snug">
          {isCancelled ? "Booking Cancelled" : "Booking Disputed"}
        </p>
        <p
          className={[
            "text-xs mt-0.5",
            isCancelled ? "text-red-500" : "text-orange-500",
          ].join(" ")}
        >
          {isCancelled
            ? "This booking has been cancelled and is no longer active."
            : "A dispute has been raised for this booking. Our team will review it shortly."}
        </p>
        {ts && (
          <p
            className={[
              "text-xs mt-1 font-medium",
              isCancelled ? "text-red-400" : "text-orange-400",
            ].join(" ")}
          >
            {ts}
          </p>
        )}
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────

export default function BookingStateMachine({
  currentStatus,
  timestamps = {},
  compact = false,
  className = "",
}: BookingStateMachineProps) {
  const normalisedStatus = normalise(currentStatus);
  const terminal = isTerminal(normalisedStatus);

  // Resolve which step index is "current" in the linear flow.
  const currentStepKey: StepKey | null = terminal
    ? null
    : (STATUS_TO_KEY[normalisedStatus] ?? null);

  const currentStepIndex = useMemo(() => {
    if (currentStepKey === null) {
      // For terminal states that follow the linear flow, show all completed.
      if (terminal === "cancelled") {
        // We don't know where it was cancelled; fall back to -1 (none active).
        return -1;
      }
      return -1;
    }
    return STEP_ORDER.indexOf(currentStepKey);
  }, [currentStepKey, terminal]);

  // Derive per-step state.
  const stepStates = useMemo<StepState[]>(
    () =>
      STEPS.map((step, idx) =>
        terminal
          ? "completed" // grey out (treat as completed but no current ring)
          : getStepState(step.key, currentStepIndex, idx),
      ),
    [currentStepIndex, terminal],
  );

  return (
    <div className={["w-full", className].filter(Boolean).join(" ")}>
      {/* ── Linear flow — hidden on mobile, visible from md up ── */}
      <div
        className="hidden md:flex items-start w-full gap-0"
        role="list"
        aria-label="Booking progress"
      >
        {STEPS.map((step, idx) => {
          const state = terminal ? "future" : stepStates[idx];
          const ts = formatTimestamp(timestamps[step.key]);
          const isLast = idx === STEPS.length - 1;

          return (
            <div
              key={step.key}
              className="flex items-center flex-1 min-w-0"
              role="listitem"
            >
              {/* Step content */}
              <div className="flex flex-col items-center text-center min-w-0 shrink-0">
                <StepCircle
                  step={step}
                  state={state}
                  compact={compact}
                  index={idx}
                />

                <motion.div
                  className="mt-2 flex flex-col items-center gap-0.5"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.07 + 0.2, duration: 0.3 }}
                >
                  <span
                    className={[
                      "font-semibold leading-tight whitespace-nowrap",
                      compact ? "text-xs" : "text-xs",
                      state === "completed" || state === "current"
                        ? "text-slate-800"
                        : "text-slate-400",
                    ].join(" ")}
                  >
                    {step.label}
                  </span>

                  {!compact && (
                    <span
                      className={[
                        "text-xs leading-tight max-w-20 text-center",
                        state === "current"
                          ? "text-emerald-600 font-medium"
                          : state === "completed"
                            ? "text-slate-400"
                            : "text-slate-300",
                      ].join(" ")}
                    >
                      {step.description}
                    </span>
                  )}

                  {ts && !compact && (
                    <span
                      className={[
                        "text-[10px] mt-0.5 font-medium",
                        state === "completed"
                          ? "text-emerald-500"
                          : "text-slate-400",
                      ].join(" ")}
                    >
                      {ts}
                    </span>
                  )}
                </motion.div>
              </div>

              {/* Connector line (not after last step) */}
              {!isLast && (
                <div className="flex-1 flex items-center px-1 -mt-7">
                  <Connector
                    completed={stepStates[idx] === "completed" && !terminal}
                    vertical={false}
                    compact={compact}
                    index={idx}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Linear flow — vertical on mobile ── */}
      <div
        className="flex md:hidden flex-col items-start w-full"
        role="list"
        aria-label="Booking progress"
      >
        {STEPS.map((step, idx) => {
          const state = terminal ? "future" : stepStates[idx];
          const ts = formatTimestamp(timestamps[step.key]);
          const isLast = idx === STEPS.length - 1;

          return (
            <div
              key={step.key}
              className="flex flex-col items-start w-full"
              role="listitem"
            >
              <div className="flex items-start gap-3 w-full">
                {/* Circle + vertical connector column */}
                <div className="flex flex-col items-center shrink-0">
                  <StepCircle
                    step={step}
                    state={state}
                    compact={compact}
                    index={idx}
                  />
                  {!isLast && (
                    <Connector
                      completed={stepStates[idx] === "completed" && !terminal}
                      vertical={true}
                      compact={compact}
                      index={idx}
                    />
                  )}
                </div>

                {/* Labels */}
                <motion.div
                  className="flex flex-col gap-0.5 pt-1"
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.07 + 0.2, duration: 0.3 }}
                >
                  <span
                    className={[
                      "font-semibold leading-tight",
                      compact ? "text-xs" : "text-sm",
                      state === "completed" || state === "current"
                        ? "text-slate-800"
                        : "text-slate-400",
                    ].join(" ")}
                  >
                    {step.label}
                  </span>

                  {!compact && (
                    <span
                      className={[
                        "text-xs leading-tight",
                        state === "current"
                          ? "text-emerald-600 font-medium"
                          : state === "completed"
                            ? "text-slate-400"
                            : "text-slate-300",
                      ].join(" ")}
                    >
                      {step.description}
                    </span>
                  )}

                  {ts && !compact && (
                    <span
                      className={[
                        "text-[10px] font-medium",
                        state === "completed"
                          ? "text-emerald-500"
                          : "text-slate-400",
                      ].join(" ")}
                    >
                      {ts}
                    </span>
                  )}
                </motion.div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Terminal state banner ── */}
      <AnimatePresence>
        {terminal && (
          <motion.div
            className="mt-4"
            key="terminal-banner"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
          >
            <TerminalBanner
              type={terminal}
              timestamp={
                terminal === "cancelled"
                  ? timestamps.cancelled
                  : timestamps.disputed
              }
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
