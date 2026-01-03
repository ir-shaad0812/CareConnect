"use client";

// ============================================
// SLOT PICKER — CareConnect Booking Component
// Full month calendar + time slot grid
// Theme: Purple (#8B54F7) + Green (#39B54A)
// ============================================

import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, CalendarDays, Clock } from "lucide-react";

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

export interface SlotPickerProps {
  /** ISO date strings of days the caregiver has marked available */
  availableDays?: string[];
  /** Slots already booked by other clients */
  bookedSlots?: Array<{ date: string; time: string }>;
  /** Fires when user confirms both a date and a time */
  onSelect: (date: string, time: string) => void;
  /** Controlled selected date (ISO string: YYYY-MM-DD) */
  selectedDate?: string;
  /** Controlled selected time (e.g. "10:00 AM") */
  selectedTime?: string;
  /** Optional caregiver id — reserved for parent-level queries */
  caregiverId?: string;
}

interface CalendarDay {
  /** null for leading/trailing empty cells */
  date: Date | null;
  /** YYYY-MM-DD */
  iso: string;
  isToday: boolean;
  isPast: boolean;
  isAvailable: boolean;
  isSelected: boolean;
}

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────

const DAY_HEADERS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"] as const;

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

/** Generates every 30-minute slot between 10:00 AM and 6:30 PM */
function generateTimeSlots(): string[] {
  const slots: string[] = [];
  // Start: 10:00  End: 18:30  Step: 30 min
  for (let hour = 10; hour <= 18; hour++) {
    const minutes = hour === 18 ? [0, 30] : [0, 30];
    for (const min of minutes) {
      if (hour === 18 && min === 30) {
        slots.push(formatTime(hour, min));
        break;
      }
      slots.push(formatTime(hour, min));
    }
  }
  return slots;
}

function formatTime(hour: number, min: number): string {
  const period = hour < 12 ? "AM" : "PM";
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  const displayMin = min === 0 ? "00" : String(min);
  return `${displayHour}:${displayMin} ${period}`;
}

function toIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isBeforeDay(a: Date, b: Date): boolean {
  const aDate = new Date(a.getFullYear(), a.getMonth(), a.getDate());
  const bDate = new Date(b.getFullYear(), b.getMonth(), b.getDate());
  return aDate < bDate;
}

const TIME_SLOTS = generateTimeSlots();

// ─────────────────────────────────────────────
// ANIMATION VARIANTS
// ─────────────────────────────────────────────

const calendarVariants = {
  initial: { opacity: 0, y: 6 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.22, ease: "easeOut" },
  },
  exit: { opacity: 0, y: -6, transition: { duration: 0.15 } },
};

const slotContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.025, delayChildren: 0.05 },
  },
};

const slotItemVariants = {
  hidden: { opacity: 0, scale: 0.88, y: 4 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.18, ease: "easeOut" },
  },
};

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────

export default function SlotPicker({
  availableDays,
  bookedSlots = [],
  onSelect,
  selectedDate: controlledDate,
  selectedTime: controlledTime,
  caregiverId: _caregiverId,
}: SlotPickerProps) {
  const today = useMemo(() => new Date(), []);

  // ── State ──────────────────────────────────
  const [currentMonth, setCurrentMonth] = useState<Date>(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const [internalDate, setInternalDate] = useState<string | undefined>(
    controlledDate,
  );
  const [internalTime, setInternalTime] = useState<string | undefined>(
    controlledTime,
  );

  const selectedDate = controlledDate ?? internalDate;
  const selectedTime = controlledTime ?? internalTime;

  // ── Derived sets for O(1) lookup ──────────
  const availableSet = useMemo<Set<string>>(() => {
    if (!availableDays || availableDays.length === 0) return new Set<string>();
    return new Set(availableDays.map((d) => d.slice(0, 10)));
  }, [availableDays]);

  const hasAvailabilityFilter = Boolean(
    availableDays && availableDays.length > 0,
  );

  const bookedSet = useMemo<Set<string>>(() => {
    const set = new Set<string>();
    for (const slot of bookedSlots) {
      set.add(`${slot.date.slice(0, 10)}__${slot.time}`);
    }
    return set;
  }, [bookedSlots]);

  // ── Calendar generation ───────────────────
  const calendarDays = useMemo<CalendarDay[]>(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const totalDays = lastDayOfMonth.getDate();
    const startOffset = firstDayOfMonth.getDay(); // 0 = Sunday

    const days: CalendarDay[] = [];

    // Leading empty cells
    for (let i = 0; i < startOffset; i++) {
      days.push({
        date: null,
        iso: "",
        isToday: false,
        isPast: false,
        isAvailable: false,
        isSelected: false,
      });
    }

    // Actual days
    for (let d = 1; d <= totalDays; d++) {
      const date = new Date(year, month, d);
      const iso = toIso(date);
      const isToday = isSameDay(date, today);
      const isPast = isBeforeDay(date, today);
      const isAvailable =
        !isPast && (hasAvailabilityFilter ? availableSet.has(iso) : true);
      const isSelected = iso === selectedDate;

      days.push({ date, iso, isToday, isPast, isAvailable, isSelected });
    }

    // Trailing empty cells to fill final row
    const remainder = days.length % 7;
    if (remainder !== 0) {
      for (let i = 0; i < 7 - remainder; i++) {
        days.push({
          date: null,
          iso: "",
          isToday: false,
          isPast: false,
          isAvailable: false,
          isSelected: false,
        });
      }
    }

    return days;
  }, [currentMonth, today, selectedDate, availableSet, hasAvailabilityFilter]);

  // ── Time slots for selected date ──────────
  const timeSlotsForDate = useMemo<
    Array<{ time: string; isBooked: boolean; isSelected: boolean }>
  >(() => {
    if (!selectedDate) return [];
    return TIME_SLOTS.map((time) => ({
      time,
      isBooked: bookedSet.has(`${selectedDate}__${time}`),
      isSelected: time === selectedTime,
    }));
  }, [selectedDate, selectedTime, bookedSet]);

  // ── Navigation helpers ────────────────────
  const isPrevMonthDisabled = useMemo(() => {
    return (
      currentMonth.getFullYear() === today.getFullYear() &&
      currentMonth.getMonth() === today.getMonth()
    );
  }, [currentMonth, today]);

  const goToPrevMonth = useCallback(() => {
    if (isPrevMonthDisabled) return;
    setCurrentMonth(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1),
    );
  }, [isPrevMonthDisabled]);

  const goToNextMonth = useCallback(() => {
    setCurrentMonth(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1),
    );
  }, []);

  // ── Interaction handlers ──────────────────
  const handleDayClick = useCallback((day: CalendarDay) => {
    if (!day.date || !day.isAvailable) return;
    setInternalDate(day.iso);
    setInternalTime(undefined);
  }, []);

  const handleTimeClick = useCallback(
    (time: string, isBooked: boolean) => {
      if (isBooked || !selectedDate) return;
      setInternalTime(time);
      onSelect(selectedDate, time);
    },
    [selectedDate, onSelect],
  );

  // ── Month key for AnimatePresence ─────────
  const monthKey = `${currentMonth.getFullYear()}-${currentMonth.getMonth()}`;

  // ─────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm w-full select-none">
      {/* ── Calendar Section ─────────────────── */}
      <div className="mb-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-[#8B54F7]" />
            <span className="text-sm font-semibold text-gray-700">
              Select a Date
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={goToPrevMonth}
              disabled={isPrevMonthDisabled}
              aria-label="Previous month"
              className={[
                "h-7 w-7 rounded-lg flex items-center justify-center transition-colors",
                isPrevMonthDisabled
                  ? "text-gray-200 cursor-not-allowed"
                  : "text-gray-500 hover:bg-gray-100 hover:text-gray-700",
              ].join(" ")}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="text-sm font-semibold text-gray-700 min-w-32 text-center tabular-nums">
              {MONTH_NAMES[currentMonth.getMonth()]}{" "}
              {currentMonth.getFullYear()}
            </span>

            <button
              type="button"
              onClick={goToNextMonth}
              aria-label="Next month"
              className="h-7 w-7 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Day-of-week headers */}
        <div className="grid grid-cols-7 mb-2">
          {DAY_HEADERS.map((d) => (
            <div
              key={d}
              className="text-xs font-semibold text-gray-400 text-center py-1"
            >
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={monthKey}
            variants={calendarVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="grid grid-cols-7 gap-y-1"
            style={{ willChange: "opacity, transform" }}
          >
            {calendarDays.map((day, idx) => {
              if (!day.date) {
                return <div key={`empty-${idx}`} className="h-9 w-9 mx-auto" />;
              }

              const baseCell =
                "h-9 w-9 rounded-full text-sm flex items-center justify-center mx-auto transition-colors duration-150 font-medium";

              let cellClass = baseCell;
              let ariaLabel = `${day.iso}`;

              if (day.isSelected) {
                cellClass += " bg-[#8B54F7] text-white shadow-sm";
                ariaLabel += " selected";
              } else if (!day.isAvailable) {
                cellClass += " text-gray-300 cursor-not-allowed";
                ariaLabel += " unavailable";
              } else {
                cellClass +=
                  " text-gray-700 hover:bg-purple-50 hover:text-[#8B54F7] cursor-pointer";
              }

              // Today ring (added on top of other styles unless selected)
              const wrapperClass =
                day.isToday && !day.isSelected
                  ? "rounded-full ring-2 ring-[#39B54A] ring-offset-1"
                  : "";

              return (
                <div
                  key={day.iso}
                  className={wrapperClass}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => handleDayClick(day)}
                    disabled={!day.isAvailable}
                    aria-label={ariaLabel}
                    aria-pressed={day.isSelected}
                    className={cellClass}
                  >
                    {day.date.getDate()}
                  </button>
                </div>
              );
            })}
          </motion.div>
        </AnimatePresence>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-50">
          <LegendDot
            color="ring-2 ring-[#39B54A] ring-offset-1 bg-white"
            label="Today"
          />
          <LegendDot
            color="bg-[#8B54F7]"
            label="Selected"
            textColor="text-white"
          />
          <LegendDot color="bg-gray-100 text-gray-300" label="Unavailable" />
        </div>
      </div>

      {/* ── Time Slots Section ───────────────── */}
      <AnimatePresence mode="wait">
        {selectedDate ? (
          <motion.div
            key={selectedDate}
            initial={{ opacity: 0, y: 8 }}
            animate={{
              opacity: 1,
              y: 0,
              transition: { duration: 0.25, ease: "easeOut" },
            }}
            exit={{ opacity: 0, y: -8, transition: { duration: 0.15 } }}
          >
            {/* Section header */}
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-[#8B54F7]" />
              <span className="text-sm font-semibold text-gray-700">
                Available Times
                <span className="ml-1.5 text-xs font-normal text-gray-400">
                  ({formatDisplayDate(selectedDate)})
                </span>
              </span>
            </div>

            {/* Slot grid */}
            <motion.div
              variants={slotContainerVariants}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-3 gap-2"
            >
              {timeSlotsForDate.map(({ time, isBooked, isSelected }) => {
                let slotClass =
                  "px-3 py-2.5 rounded-xl text-sm font-medium border transition-all duration-150 text-center";

                if (isSelected) {
                  slotClass +=
                    " bg-[#8B54F7] text-white border-[#8B54F7] shadow-sm ring-2 ring-[#8B54F7] ring-offset-1";
                } else if (isBooked) {
                  slotClass +=
                    " bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed line-through";
                } else {
                  slotClass +=
                    " bg-white text-gray-700 border-gray-200 hover:border-[#8B54F7] hover:bg-purple-50 hover:text-[#8B54F7] cursor-pointer";
                }

                return (
                  <motion.button
                    key={time}
                    type="button"
                    variants={slotItemVariants}
                    onClick={() => handleTimeClick(time, isBooked)}
                    disabled={isBooked}
                    aria-pressed={isSelected}
                    aria-label={`${time}${isBooked ? " — booked" : ""}`}
                    className={slotClass}
                    whileHover={!isBooked && !isSelected ? { scale: 1.03 } : {}}
                    whileTap={!isBooked ? { scale: 0.97 } : {}}
                  >
                    {time}
                  </motion.button>
                );
              })}
            </motion.div>

            {/* No slots available edge case */}
            {timeSlotsForDate.every((s) => s.isBooked) && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center text-sm text-gray-400 py-6"
              >
                No available slots for this date.
              </motion.p>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="placeholder"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { delay: 0.1 } }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-8 text-center"
          >
            <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center mb-3">
              <Clock className="w-5 h-5 text-[#8B54F7] opacity-60" />
            </div>
            <p className="text-sm font-medium text-gray-400">
              Select a date to see available time slots
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Selection Summary ────────────────── */}
      <AnimatePresence>
        {selectedDate && selectedTime && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
              transition: { duration: 0.2 },
            }}
            exit={{
              opacity: 0,
              y: 6,
              scale: 0.98,
              transition: { duration: 0.15 },
            }}
            className="mt-5 px-4 py-3 rounded-xl bg-linear-to-r from-purple-50 to-green-50 border border-purple-100 flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#39B54A] shrink-0" />
              <span className="text-xs font-semibold text-gray-600">
                {formatDisplayDate(selectedDate)} · {selectedTime}
              </span>
            </div>
            <span className="text-xs font-semibold text-[#8B54F7]">
              Confirmed ✓
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────

function LegendDot({
  color,
  label,
  textColor = "text-gray-600",
}: {
  color: string;
  label: string;
  textColor?: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`w-3 h-3 rounded-full shrink-0 ${color} ${textColor}`} />
      <span className="text-xs text-gray-400">{label}</span>
    </div>
  );
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

function formatDisplayDate(iso: string): string {
  try {
    const [year, month, day] = iso.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}
