"use client";

// ============================================
// BookingCalendar — shared premium calendar
// Works for caregiver, careseeker, and admin.
// Uses real DB data via /api/bookings/calendar
// ============================================

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, RefreshCw, Calendar, Clock, User } from "lucide-react";
import { bookingService, type CalendarEventData } from "@/services/api/booking.service";

// ── Constants & helpers ────────────────────────────────────────────────────

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const STATUS_COLORS: Record<string, string> = {
  pending:          "bg-slate-100  text-slate-700   border-slate-200",
  accepted:         "bg-blue-100   text-blue-700    border-blue-200",
  agreement_pending:"bg-indigo-100 text-indigo-700  border-indigo-200",
  payment_pending:  "bg-amber-100  text-amber-700   border-amber-200",
  confirmed:        "bg-violet-100 text-violet-700  border-violet-200",
  active:           "bg-emerald-100 text-emerald-700 border-emerald-200",
  in_progress:      "bg-emerald-100 text-emerald-700 border-emerald-200",
  completed:        "bg-teal-100   text-teal-700    border-teal-200",
  cancelled:        "bg-rose-100   text-rose-700    border-rose-200",
  disputed:         "bg-orange-100 text-orange-700  border-orange-200",
};

const STATUS_DOT: Record<string, string> = {
  pending: "bg-slate-400", accepted: "bg-blue-400",
  confirmed: "bg-violet-500", active: "bg-emerald-500",
  in_progress: "bg-emerald-500", completed: "bg-teal-500",
  cancelled: "bg-rose-500", payment_pending: "bg-amber-500",
  disputed: "bg-orange-500",
};

function startOfMonth(y: number, m: number) { return new Date(y, m, 1); }
function daysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate(); }
function fmt(d: string) {
  return new Date(d).toLocaleDateString("en-NP", { month: "short", day: "numeric" });
}

// ── Types ──────────────────────────────────────────────────────────────────

export interface BookingCalendarProps {
  role: "caregiver" | "careseeker" | "admin";
  className?: string;
}

// ── EventPill ──────────────────────────────────────────────────────────────

function EventPill({ event, onClick }: { event: CalendarEventData; onClick: () => void }) {
  const color = STATUS_COLORS[event.status] || STATUS_COLORS.pending;
  return (
    <button
      onClick={onClick}
      className={`w-full text-left text-[10px] font-medium rounded px-1.5 py-0.5 truncate border transition-all hover:opacity-80 ${color}`}
    >
      {event.title || event.serviceType?.replace(/_/g, " ") || "Booking"}
    </button>
  );
}

// ── EventDetailModal ───────────────────────────────────────────────────────

function EventDetailModal({ event, onClose, role }: { event: CalendarEventData; onClose: () => void; role: string }) {
  const statusCls = STATUS_COLORS[event.status] || STATUS_COLORS.pending;
  const other = role === "caregiver" ? event.careSeeker : event.caregiver;
  const otherLabel = role === "caregiver" ? "Care Seeker" : "Caregiver";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.94, y: 10 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.94, y: 10 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden"
        >
          <div className="h-1.5 bg-gradient-to-r from-primary-500 via-violet-500 to-pink-500" />
          <div className="p-6 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-bold text-slate-900 text-lg leading-tight">
                  {event.title || event.serviceType?.replace(/_/g, " ")}
                </p>
                {event.bookingNumber && (
                  <p className="text-xs text-slate-400 mt-0.5">#{event.bookingNumber}</p>
                )}
              </div>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${statusCls}`}>
                {event.status.replace(/_/g, " ")}
              </span>
            </div>

            {/* Dates */}
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
              <span>
                {fmt(event.start)}
                {event.end && event.end !== event.start && ` → ${fmt(event.end)}`}
              </span>
            </div>

            {/* Time */}
            {(event.startTime || event.endTime) && (
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                <span>{event.startTime || ""}{event.endTime ? ` – ${event.endTime}` : ""}</span>
              </div>
            )}

            {/* Other party */}
            {other && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="h-9 w-9 rounded-full overflow-hidden bg-slate-200 shrink-0">
                  {other.avatar ? (
                    <img src={other.avatar} alt={other.fullName} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center font-bold text-slate-500 text-sm">
                      {other.fullName?.[0]}
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-xs text-slate-500">{otherLabel}</p>
                  <p className="text-sm font-semibold text-slate-900">{other.fullName}</p>
                </div>
              </div>
            )}

            {/* Pricing */}
            {event.pricing?.totalAmount && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Amount</span>
                <span className="font-bold text-slate-900">
                  NPR {event.pricing.totalAmount.toLocaleString("en-NP")}
                </span>
              </div>
            )}
          </div>

          <div className="px-6 pb-5">
            <button
              onClick={onClose}
              className="w-full rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white hover:bg-slate-700 transition-all"
            >
              Close
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────

export function BookingCalendar({ role, className = "" }: BookingCalendarProps) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [events, setEvents] = useState<CalendarEventData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEventData | null>(null);
  const [viewMode, setViewMode] = useState<"month" | "list">("month");

  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      const start = new Date(year, month, 1).toISOString();
      const end   = new Date(year, month + 1, 0, 23, 59, 59).toISOString();

      let res;
      if (role === "admin") {
        res = await bookingService.getAdminCalendarEvents(start, end);
      } else {
        res = await bookingService.getCalendarEvents(start, end);
      }

      if (res.success && res.data) setEvents(res.data.events || []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [year, month, role]);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  // ── Build calendar grid ──
  const firstDay = startOfMonth(year, month).getDay();
  const numDays  = daysInMonth(year, month);
  const cells: Array<number | null> = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: numDays }, (_, i) => i + 1),
  ];

  // events keyed by YYYY-MM-DD
  const eventsByDate: Record<string, CalendarEventData[]> = {};
  events.forEach((ev) => {
    if (!ev?.start) return;
    const key = ev.start.split("T")[0];
    if (!eventsByDate[key]) eventsByDate[key] = [];
    eventsByDate[key].push(ev);
  });

  const prevMonth = () => { if (month === 0) { setYear(y => y - 1); setMonth(11); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setYear(y => y + 1); setMonth(0); } else setMonth(m => m + 1); };

  const statusLegend = ["active", "confirmed", "pending", "completed", "cancelled"];

  return (
    <div className={`rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
        <div className="flex items-center gap-4">
          <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-base font-bold text-slate-900 min-w-[140px] text-center">
            {MONTHS[month]} {year}
          </h2>
          <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors">
            <ChevronRight className="w-5 h-5" />
          </button>
          <button
            onClick={() => { setYear(today.getFullYear()); setMonth(today.getMonth()); }}
            className="text-xs text-primary-600 hover:text-primary-700 font-medium px-2 py-1 rounded-lg hover:bg-primary-50"
          >
            Today
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">{events.length} bookings</span>
          <button
            onClick={loadEvents}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          {/* View toggle */}
          <div className="flex rounded-lg bg-slate-100 p-0.5">
            {(["month", "list"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setViewMode(v)}
                className={`px-3 py-1 rounded text-xs font-medium transition-all capitalize ${
                  viewMode === v ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 px-6 py-2 border-b border-slate-50 flex-wrap">
        {statusLegend.map((s) => (
          <span key={s} className="flex items-center gap-1 text-xs text-slate-500">
            <span className={`h-2 w-2 rounded-full ${STATUS_DOT[s] || "bg-slate-300"}`} />
            {s.replace(/_/g, " ")}
          </span>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {viewMode === "month" ? (
          <motion.div key="month" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {/* Day headers */}
            <div className="grid grid-cols-7 border-b border-slate-100">
              {DAYS.map((d) => (
                <div key={d} className="py-2 text-center text-xs font-semibold text-slate-400">
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar cells */}
            {loading ? (
              <div className="flex items-center justify-center py-20 text-slate-400">
                <RefreshCw className="w-5 h-5 animate-spin mr-2" />Loading…
              </div>
            ) : (
              <div className="grid grid-cols-7">
                {cells.map((day, i) => {
                  if (!day) return <div key={`e-${i}`} className="min-h-[90px] border-b border-r border-slate-50" />;

                  const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                  const dayEvents = eventsByDate[key] || [];
                  const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;

                  return (
                    <div
                      key={key}
                      className={`min-h-[90px] p-1.5 border-b border-r border-slate-50 transition-colors ${
                        isToday ? "bg-primary-50/40" : "hover:bg-slate-50/60"
                      }`}
                    >
                      <div className={`text-xs font-semibold mb-1 w-6 h-6 flex items-center justify-center rounded-full ${
                        isToday ? "bg-primary-500 text-white" : "text-slate-600"
                      }`}>
                        {day}
                      </div>
                      <div className="space-y-0.5">
                        {dayEvents.slice(0, 3).map((ev) => (
                          <EventPill key={ev.id} event={ev} onClick={() => setSelectedEvent(ev)} />
                        ))}
                        {dayEvents.length > 3 && (
                          <p className="text-[10px] text-slate-400 pl-1">+{dayEvents.length - 3} more</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="divide-y divide-slate-100 max-h-[560px] overflow-y-auto"
          >
            {loading ? (
              <div className="flex items-center justify-center py-20 text-slate-400">
                <RefreshCw className="w-5 h-5 animate-spin mr-2" />Loading…
              </div>
            ) : events.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <Calendar className="w-10 h-10 text-slate-200 mb-3" />
                <p className="text-sm">No bookings in {MONTHS[month]}</p>
              </div>
            ) : (
              events
                .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
                .map((ev) => {
                  const other = role === "caregiver" ? ev.careSeeker : ev.caregiver;
                  const statusCls = STATUS_COLORS[ev.status] || STATUS_COLORS.pending;
                  return (
                    <div
                      key={ev.id}
                      onClick={() => setSelectedEvent(ev)}
                      className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <div className="text-center w-10 shrink-0">
                        <p className="text-xs text-slate-400 font-medium">
                          {new Date(ev.start).toLocaleDateString("en-NP", { month: "short" })}
                        </p>
                        <p className="text-xl font-bold text-slate-900 leading-none">
                          {new Date(ev.start).getDate()}
                        </p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-900 text-sm truncate">
                          {ev.title || ev.serviceType?.replace(/_/g, " ")}
                        </p>
                        {other && (
                          <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                            <User className="w-3 h-3" />{other.fullName}
                          </p>
                        )}
                        {ev.startTime && (
                          <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3" />{ev.startTime}
                          </p>
                        )}
                      </div>
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full border shrink-0 ${statusCls}`}>
                        {ev.status.replace(/_/g, " ")}
                      </span>
                    </div>
                  );
                })
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Event modal */}
      {selectedEvent && (
        <EventDetailModal
          event={selectedEvent}
          role={role}
          onClose={() => setSelectedEvent(null)}
        />
      )}
    </div>
  );
}

export default BookingCalendar;
