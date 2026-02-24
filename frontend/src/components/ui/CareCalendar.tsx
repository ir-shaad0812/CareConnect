"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Eye } from "lucide-react";

// ============================================
// TYPES
// ============================================

export type CareEventType =
  | "booking"
  | "session"
  | "appointment"
  | "reminder"
  | "availability";

export interface CareEvent {
  id: string;
  title: string;
  description?: string;
  date: Date;
  startTime?: string;
  endTime?: string;
  type: CareEventType;
  status?: "confirmed" | "pending" | "completed" | "cancelled";
  caregiverName?: string;
  caregiverId?: string;
  serviceType?: string;
  location?: string;
  color?: string;
}

export interface CareCalendarProps {
  events: CareEvent[];
  onEventClick?: (event: CareEvent) => void;
  onDateClick?: (date: Date) => void;
  onAddEvent?: () => void;
  className?: string;
}

// ============================================
// CONFIGURATION
// ============================================

const EVENT_STYLES: Record<
  CareEventType,
  { bg: string; text: string; dot: string; label: string }
> = {
  booking: {
    bg: "bg-indigo-50 border-indigo-200",
    text: "text-indigo-700",
    dot: "bg-indigo-500",
    label: "Bookings",
  },
  session: {
    bg: "bg-emerald-50 border-emerald-200",
    text: "text-emerald-700",
    dot: "bg-emerald-500",
    label: "Sessions",
  },
  appointment: {
    bg: "bg-amber-50 border-amber-200",
    text: "text-amber-700",
    dot: "bg-amber-500",
    label: "Appointments",
  },
  reminder: {
    bg: "bg-rose-50 border-rose-200",
    text: "text-rose-600",
    dot: "bg-rose-400",
    label: "Reminders",
  },
  availability: {
    bg: "bg-gray-50 border-gray-200",
    text: "text-gray-600",
    dot: "bg-gray-400",
    label: "Availability",
  },
};

const WEEKDAYS_FULL = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const STATUS_STYLES: Record<string, string> = {
  confirmed: "bg-green-50 text-green-700 border border-green-200",
  pending: "bg-pink-50 text-pink-700 border border-pink-200",
  completed: "bg-blue-50 text-blue-700 border border-blue-200",
  cancelled: "bg-gray-100 text-gray-500 border border-gray-200",
};

// ============================================
// HELPERS
// ============================================

const getDaysInMonth = (year: number, month: number): Date[] => {
  const days: Date[] = [];
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  // Leading days from previous month
  for (let i = firstDay.getDay() - 1; i >= 0; i--) {
    days.push(new Date(year, month, -i));
  }
  // Current month
  for (let i = 1; i <= lastDay.getDate(); i++) {
    days.push(new Date(year, month, i));
  }
  // Trailing days to fill the last week row
  const trailing = 7 - (days.length % 7);
  if (trailing < 7) {
    for (let i = 1; i <= trailing; i++) {
      days.push(new Date(year, month + 1, i));
    }
  }
  return days;
};

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const isToday = (d: Date) => isSameDay(d, new Date());

// ============================================
// EVENT TOOLTIP
// ============================================

interface EventTooltipProps {
  event: CareEvent;
  onClose: () => void;
  onView?: () => void;
}

function EventTooltip({ event, onClose, onView }: EventTooltipProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const statusLabel = event.status
    ? event.status.charAt(0).toUpperCase() + event.status.slice(1)
    : null;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 6 }}
      transition={{ duration: 0.15 }}
      className="absolute left-1/2 -translate-x-1/2 top-full mt-2 z-50 w-72 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Arrow */}
      <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-l border-t border-gray-200 rotate-45" />

      <div className="relative p-4">
        {/* Time + Status */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            {event.startTime && (
              <>
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>
                  {event.startTime}
                  {event.endTime ? ` – ${event.endTime}` : ""}
                </span>
              </>
            )}
          </div>
          {statusLabel && (
            <span
              className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${
                STATUS_STYLES[event.status || ""] || "bg-gray-100 text-gray-600"
              }`}
            >
              {statusLabel}
            </span>
          )}
        </div>

        {/* Title */}
        <h4 className="font-semibold text-gray-900 text-sm leading-snug mb-1">
          {event.title}
        </h4>

        {/* Service type */}
        {(event.serviceType || event.description) && (
          <p className="text-xs text-gray-500 mb-3">
            {event.serviceType || event.description}
          </p>
        )}

        {/* Caregiver */}
        {event.caregiverName && (
          <div className="flex items-center gap-2 mb-3 text-xs text-gray-600">
            <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-semibold text-[10px]">
              {event.caregiverName.charAt(0)}
            </div>
            <span>{event.caregiverName}</span>
          </div>
        )}

        {/* View link */}
        {onView && (
          <button
            onClick={onView}
            className="inline-flex items-center gap-1.5 text-indigo-600 hover:text-indigo-700 text-xs font-medium"
          >
            <Eye className="w-3.5 h-3.5" />
            View
          </button>
        )}
      </div>
    </motion.div>
  );
}

// ============================================
// DAY CELL
// ============================================

interface DayCellProps {
  date: Date;
  events: CareEvent[];
  isCurrentMonth: boolean;
  isSelected: boolean;
  onClick: () => void;
  onEventClick: (event: CareEvent) => void;
}

function DayCell({
  date,
  events,
  isCurrentMonth,
  isSelected,
  onClick,
  onEventClick,
}: DayCellProps) {
  const [activeEvent, setActiveEvent] = useState<CareEvent | null>(null);
  const today = isToday(date);
  const maxVisible = 2;
  const visible = events.slice(0, maxVisible);
  const extra = events.length - maxVisible;

  return (
    <div
      onClick={onClick}
      className={`
        relative min-h-[110px] p-2 border-b border-r border-gray-100 cursor-pointer
        transition-colors
        ${!isCurrentMonth ? "bg-gray-50/60" : "bg-white hover:bg-gray-50/80"}
        ${isSelected ? "ring-2 ring-inset ring-indigo-400/60" : ""}
      `}
    >
      {/* Date number */}
      <span
        className={`
          inline-flex items-center justify-center w-7 h-7 rounded-full text-sm
          ${
            today
              ? "bg-indigo-500 text-white font-bold"
              : !isCurrentMonth
              ? "text-gray-350 font-normal"
              : "text-gray-700 font-medium"
          }
        `}
      >
        {date.getDate()}
      </span>

      {/* Events */}
      <div className="mt-1 space-y-0.5">
        {visible.map((ev) => {
          const style = EVENT_STYLES[ev.type];
          return (
            <div key={ev.id} className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveEvent(activeEvent?.id === ev.id ? null : ev);
                }}
                className={`
                  w-full text-left px-1.5 py-1 rounded text-[11px] leading-tight font-medium truncate
                  border ${style.bg} ${style.text}
                  hover:shadow-sm transition-shadow
                `}
              >
                <span className="truncate block">
                  {ev.startTime && (
                    <span className="opacity-70 mr-1">
                      {ev.startTime.replace(/:00/g, "")}
                    </span>
                  )}
                  {ev.title}
                </span>
              </button>

              <AnimatePresence>
                {activeEvent?.id === ev.id && (
                  <EventTooltip
                    event={ev}
                    onClose={() => setActiveEvent(null)}
                    onView={() => {
                      onEventClick(ev);
                      setActiveEvent(null);
                    }}
                  />
                )}
              </AnimatePresence>
            </div>
          );
        })}

        {extra > 0 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
            className="text-[11px] text-indigo-500 font-medium pl-1 hover:underline"
          >
            +{extra} more
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================
// MAIN CALENDAR
// ============================================

export function CareCalendar({
  events,
  onEventClick,
  onDateClick,
  onAddEvent,
  className = "",
}: CareCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<"month" | "week">("month");

  const days = useMemo(
    () => getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth()),
    [currentDate]
  );

  const eventsByDate = useMemo(() => {
    const grouped: Record<string, CareEvent[]> = {};
    events.forEach((ev) => {
      if (!ev || !ev.date) return; // Skip null/undefined events or missing dates
      const d = ev.date instanceof Date ? ev.date : new Date(ev.date as unknown as string);
      if (!d || isNaN(d.getTime())) return; // Skip invalid dates
      const k = d.toDateString();
      if (!grouped[k]) grouped[k] = [];
      grouped[k].push(ev);
    });
    return grouped;
  }, [events]);

  const monthLabel = currentDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const prev = () =>
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
    );
  const next = () =>
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
    );
  const goToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    onDateClick?.(date);
  };

  // Unique event types present
  const activeTypes = useMemo(() => {
    const set = new Set(events.map((e) => e.type));
    return Array.from(set);
  }, [events]);

  return (
    <div
      className={`bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden ${className}`}
    >
      {/* ──── Header ──── */}
      <div className="px-6 pt-6 pb-4">
        {/* Top row: title + View as toggle */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-gray-900">My Care Schedule</h2>

          <div className="flex items-center gap-1 text-sm text-gray-500">
            <span className="mr-1">View as :</span>
            <button
              onClick={() => setViewMode("month")}
              className={`px-1 font-medium transition-colors ${
                viewMode === "month"
                  ? "text-indigo-600"
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              Month
            </button>
            <span className="text-gray-300">|</span>
            <button
              onClick={() => setViewMode("week")}
              className={`px-1 font-medium transition-colors ${
                viewMode === "week"
                  ? "text-indigo-600"
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              Week
            </button>
          </div>
        </div>

        {/* Second row: navigation + legend */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {/* Navigation */}
          <div className="flex items-center gap-3">
            <button
              onClick={prev}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-gray-500" />
            </button>

            <span className="text-base font-semibold text-gray-800 min-w-[160px] text-center">
              {monthLabel}
            </span>

            <button
              onClick={next}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ChevronRight className="w-4 h-4 text-gray-500" />
            </button>

            <button
              onClick={goToday}
              className="ml-1 text-sm font-medium text-indigo-500 hover:text-indigo-600 transition-colors"
            >
              Today
            </button>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-5">
            {activeTypes.map((type) => {
              const s = EVENT_STYLES[type];
              return (
                <div key={type} className="flex items-center gap-1.5">
                  <span className={`w-3 h-3 rounded ${s.dot}`} />
                  <span className="text-sm text-gray-500">{s.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ──── Grid ──── */}
      <div className="border-t border-gray-100">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 border-b border-gray-100">
          {WEEKDAYS_FULL.map((day) => (
            <div
              key={day}
              className="py-2.5 text-center text-xs font-semibold text-gray-400 tracking-wide uppercase"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7">
          {days.map((date, i) => (
            <DayCell
              key={i}
              date={date}
              events={eventsByDate[date.toDateString()] || []}
              isCurrentMonth={date.getMonth() === currentDate.getMonth()}
              isSelected={
                selectedDate ? isSameDay(date, selectedDate) : false
              }
              onClick={() => handleDateClick(date)}
              onEventClick={(ev) => onEventClick?.(ev)}
            />
          ))}
        </div>
      </div>

      {/* ──── Footer ──── */}
      {onAddEvent && (
        <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-between">
          <p className="text-xs text-gray-400">
            {events.length} event{events.length !== 1 ? "s" : ""} this month
          </p>
          <button
            onClick={onAddEvent}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-medium rounded-lg transition-colors"
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Book Caregiver
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================
// SAMPLE DATA
// ============================================

export const generateSampleCareEvents = (): CareEvent[] => {
  const today = new Date();
  const m = today.getMonth();
  const y = today.getFullYear();
  const events: CareEvent[] = [];

  events.push({
    id: "1",
    title: "Care Session with Sarah",
    description: "Regular elderly care session",
    date: new Date(y, m, 1),
    startTime: "09:00 AM",
    endTime: "01:00 PM",
    type: "session",
    status: "completed",
    caregiverName: "Sarah Johnson",
    serviceType: "Elderly Care",
    location: "Home",
  });

  events.push({
    id: "2",
    title: "Booking: Child Care",
    description: "Afternoon babysitting session",
    date: new Date(y, m, 5),
    startTime: "02:00 PM",
    endTime: "06:00 PM",
    type: "booking",
    status: "confirmed",
    caregiverName: "Michael Chen",
    serviceType: "Child Care",
  });

  events.push({
    id: "3",
    title: "Special Needs Care",
    description: "Special needs care assistance",
    date: new Date(y, m, 6),
    startTime: "10:00 AM",
    endTime: "02:00 PM",
    type: "session",
    status: "confirmed",
    caregiverName: "Emily Davis",
    serviceType: "Special Needs",
  });

  events.push({
    id: "4",
    title: "Care Plan Review",
    description: "Monthly care plan review",
    date: new Date(y, m, 7),
    startTime: "11:00 AM",
    type: "appointment",
    status: "pending",
  });

  events.push({
    id: "5",
    title: "Weekend Care Request",
    description: "Pending booking for weekend care",
    date: new Date(y, m, 8),
    type: "booking",
    status: "pending",
    caregiverName: "James Wilson",
    serviceType: "Elderly Care",
  });

  events.push({
    id: "6",
    title: "Today's Care Session",
    description: "Today's scheduled care session",
    date: today,
    startTime: "03:00 PM",
    endTime: "07:00 PM",
    type: "session",
    status: "confirmed",
    caregiverName: "Sarah Johnson",
    serviceType: "Elderly Care",
  });

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  events.push({
    id: "7",
    title: "Child Care Session",
    description: "Child care session tomorrow",
    date: tomorrow,
    startTime: "09:00 AM",
    endTime: "12:00 PM",
    type: "booking",
    status: "confirmed",
    caregiverName: "Michael Chen",
    serviceType: "Child Care",
  });

  for (let i = 0; i < 4; i++) {
    const date = new Date(y, m, 8 + i * 7);
    if (date.getMonth() === m) {
      events.push({
        id: `weekly-${i}`,
        title: "Weekly Check-in",
        description: "Regular care consultation",
        date,
        startTime: "10:00 AM",
        type: "appointment",
        status: "confirmed",
        caregiverName: "Emily Davis",
      });
    }
  }

  events.push({
    id: "reminder-1",
    title: "Medication Reminder",
    description: "Don't forget to prepare medications",
    date: new Date(y, m, 13),
    type: "reminder",
  });

  events.push({
    id: "reminder-2",
    title: "Care Plan Review Due",
    description: "Review and update care plan",
    date: new Date(y, m, 20),
    type: "reminder",
  });

  return events;
};
