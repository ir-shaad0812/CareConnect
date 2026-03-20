"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Clock, User, Calendar, CheckCircle, Shield, RefreshCw } from "lucide-react";

// ============================================
// TYPES
// ============================================

export type EventStatus = "available" | "pending" | "booked" | "reserved" | "blocked" | "unavailable";

export interface TimetableEvent {
  id: string;
  title: string;
  description?: string;
  date: Date;
  startTime: string; // "09:00"
  endTime: string; // "10:00"
  duration: number; // minutes
  status: EventStatus;
  caregiverId?: string;
  caregiverName?: string;
  caregiverAvatar?: string;
  color?: string;
  icon?: React.ReactNode;
}

export interface TimetableCalendarProps {
  events: TimetableEvent[];
  startHour?: number;
  endHour?: number;
  timeInterval?: number; // minutes (30 or 60)
  currentDate?: Date;
  onEventClick?: (event: TimetableEvent) => void;
  onSlotClick?: (date: Date, time: string) => void;
  onBookClick?: (event: TimetableEvent) => void;
  // Styling
  headerBg?: string;
  headerText?: string;
  timeText?: string;
  gridLines?: string;
  activeDayColor?: string;
  popupBg?: string;
  popupText?: string;
  className?: string;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

const formatTime = (hour: number, minute: number = 0): string => {
  const h = hour % 12 || 12;
  const m = minute.toString().padStart(2, "0");
  const ampm = hour < 12 ? "AM" : "PM";
  return `${h}:${m} ${ampm}`;
};

const formatTime24 = (hour: number, minute: number = 0): string => {
  return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
};

const getWeekDates = (currentDate: Date): Date[] => {
  const week: Date[] = [];
  const start = new Date(currentDate);
  const day = start.getDay();
  const diff = start.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Monday start
  start.setDate(diff);

  for (let i = 0; i < 7; i++) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    week.push(date);
  }
  return week;
};

const isSameDay = (date1: Date, date2: Date): boolean => {
  // Normalize dates to handle timezone issues
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
};

const parseTime = (timeStr: string): { hour: number; minute: number } => {
  const [hour, minute] = timeStr.split(":").map(Number);
  return { hour, minute };
};

// ============================================
// STATUS COLORS & LABELS
// ============================================

const STATUS_CONFIG: Record<EventStatus, { bg: string; text: string; label: string; border: string }> = {
  available: {
    bg: "bg-emerald-500",
    text: "text-white",
    label: "Available",
    border: "border-emerald-500",
  },
  pending: {
    bg: "bg-blue-500",
    text: "text-white",
    label: "Pending Approval",
    border: "border-blue-500",
  },
  reserved: {
    bg: "bg-amber-500",
    text: "text-white",
    label: "Reserved",
    border: "border-amber-500",
  },
  booked: {
    bg: "bg-red-500",
    text: "text-white",
    label: "Booked",
    border: "border-red-500",
  },
  blocked: {
    bg: "bg-gray-700",
    text: "text-white",
    label: "Blocked",
    border: "border-gray-700",
  },
  unavailable: {
    bg: "bg-gray-200",
    text: "text-gray-500",
    label: "Unavailable",
    border: "border-gray-200",
  },
};

// ============================================
// EVENT CARD COMPONENT
// ============================================

interface EventCardProps {
  event: TimetableEvent;
  onClick: () => void;
  timeInterval: number;
  startHour: number;
  slotHeight: number;
}

const EventCard = ({ event, onClick, timeInterval, startHour, slotHeight }: EventCardProps) => {
  const { hour: startH, minute: startM } = parseTime(event.startTime);
  const statusConfig = STATUS_CONFIG[event.status];
  
  // Calculate position and height based on slotHeight
  // slotHeight represents pixels per timeInterval minutes
  const pixelsPerMinute = slotHeight / timeInterval;
  const topOffset = ((startH - startHour) * 60 + startM) * pixelsPerMinute;
  const height = event.duration * pixelsPerMinute;

  const isClickable = event.status === "available";

  return (
    <motion.div
      className={`
        absolute left-1 right-1 rounded-lg px-2 py-1 overflow-hidden z-10
        ${statusConfig.bg} ${statusConfig.text}
        ${isClickable ? "cursor-pointer hover:brightness-110" : "cursor-not-allowed opacity-70"}
        transition-all duration-200 shadow-sm
      `}
      style={{
        top: `${topOffset}px`,
        height: `${Math.max(height, 28)}px`,
      }}
      onClick={isClickable ? onClick : undefined}
      whileHover={isClickable ? { scale: 1.02, zIndex: 20 } : {}}
      whileTap={isClickable ? { scale: 0.98 } : {}}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex flex-col h-full justify-center">
        <p className="text-xs font-semibold truncate">{event.title}</p>
        {height > 40 && (
          <p className="text-[10px] opacity-80 truncate">
            {event.startTime} - {event.endTime}
          </p>
        )}
      </div>
    </motion.div>
  );
};

// ============================================
// EVENT POPUP COMPONENT
// ============================================

interface EventPopupProps {
  event: TimetableEvent;
  onClose: () => void;
  onBook: () => void;
  popupBg?: string;
  popupText?: string;
}

const EventPopup = ({ event, onClose, onBook, popupBg = "#FFFFFF", popupText = "#000000" }: EventPopupProps) => {
  const statusConfig = STATUS_CONFIG[event.status];
  const isBookable = event.status === "available";

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Backdrop */}
      <motion.div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />

      {/* Popup Card */}
      <motion.div
        className="relative w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
        style={{ backgroundColor: popupBg, color: popupText }}
        initial={{ scale: 0.9, y: 20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.9, y: 20, opacity: 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
        >
          <X className="w-4 h-4 text-gray-600" />
        </button>

        {/* Content */}
        <div className="p-6">
          {/* Status Badge */}
          <div
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium mb-4 ${statusConfig.bg} ${statusConfig.text}`}
          >
            <span className="w-2 h-2 rounded-full bg-current opacity-80" />
            {statusConfig.label}
          </div>

          {/* Event Title */}
          <h2 className="text-2xl font-bold mb-2">{event.title}</h2>

          {/* Time & Duration */}
          <div className="flex items-center gap-2 text-gray-600 mb-4">
            <Clock className="w-4 h-4" />
            <span>
              {event.startTime} • {event.duration} minutes
            </span>
          </div>

          {/* Description */}
          {event.description && (
            <p className="text-gray-600 mb-6">{event.description}</p>
          )}

          {/* Event Details */}
          <div className="space-y-3 mb-6">
            <div className="flex items-center gap-3 text-sm">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span>{formatDate(event.date)}</span>
            </div>
            {event.caregiverName && (
              <div className="flex items-center gap-3 text-sm">
                <User className="w-4 h-4 text-gray-400" />
                <span>{event.caregiverName}</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            {isBookable ? (
              <motion.button
                onClick={onBook}
                className="flex-1 px-6 py-3 bg-primary-500 hover:bg-[#3651E2] text-white font-semibold rounded-xl transition-colors"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Book Now
              </motion.button>
            ) : (
              <button
                disabled
                className="flex-1 px-6 py-3 bg-gray-200 text-gray-500 font-semibold rounded-xl cursor-not-allowed"
              >
                {event.status === "booked"
                  ? "Already Booked"
                  : event.status === "reserved"
                  ? "Currently Reserved"
                  : event.status === "blocked"
                  ? "Slot Blocked"
                  : event.status === "pending"
                  ? "Pending Confirmation"
                  : "Not Available"}
              </button>
            )}
            <motion.button
              onClick={onClose}
              className="px-6 py-3 border-2 border-primary-500 text-primary-500 font-semibold rounded-xl hover:bg-primary-500/5 transition-colors"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Close
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ============================================
// MAIN TIMETABLE CALENDAR COMPONENT
// ============================================

export function TimetableCalendar({
  events,
  startHour = 8,
  endHour = 20,
  timeInterval = 60,
  currentDate = new Date(),
  onEventClick,
  onSlotClick,
  onBookClick,
  headerBg = "#FFFFFF",
  headerText = "#000000",
  timeText = "#6B7280",
  gridLines = "#E5E7EB",
  popupBg = "#FFFFFF",
  popupText = "#000000",
  className = "",
}: TimetableCalendarProps) {
  const [selectedDate, setSelectedDate] = useState(currentDate);
  const [selectedEvent, setSelectedEvent] = useState<TimetableEvent | null>(null);

  const weekDates = useMemo(() => getWeekDates(selectedDate), [selectedDate]);
  const today = new Date();

  // Generate time slots
  const timeSlots = useMemo(() => {
    const slots: string[] = [];
    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += timeInterval) {
        slots.push(formatTime24(hour, minute));
      }
    }
    return slots;
  }, [startHour, endHour, timeInterval]);

  // Get events for a specific day
  const getEventsForDay = (date: Date) => {
    return events.filter((event) => isSameDay(event.date, date));
  };

  // Navigate weeks
  const navigateWeek = (direction: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + direction * 7);
    setSelectedDate(newDate);
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  // Handle event click
  const handleEventClick = (event: TimetableEvent) => {
    setSelectedEvent(event);
    onEventClick?.(event);
  };

  // Handle book click
  const handleBookClick = () => {
    if (selectedEvent) {
      onBookClick?.(selectedEvent);
      setSelectedEvent(null);
    }
  };

  // Slot height calculation
  const slotHeight = 60; // pixels per time interval

  return (
    <div className={`bg-white rounded-2xl shadow-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div
        className="px-6 py-4 border-b flex items-center justify-between"
        style={{ backgroundColor: headerBg, borderColor: gridLines }}
      >
        <div>
          <h2 className="text-xl font-bold" style={{ color: headerText }}>
            {selectedDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </h2>
          <p className="text-sm text-gray-500">
            Week of {weekDates[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })} -{" "}
            {weekDates[6].toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={goToToday}
            className="px-4 py-2 text-sm font-medium text-primary-500 hover:bg-primary-500/10 rounded-lg transition-colors"
          >
            Today
          </button>
          <button
            onClick={() => navigateWeek(-1)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={() => navigateWeek(1)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          {/* Day Headers */}
          <div
            className="grid grid-cols-8 border-b"
            style={{ borderColor: gridLines }}
          >
            <div className="p-3 text-center" style={{ color: timeText }}>
              {/* Empty corner */}
            </div>
            {weekDates.map((date, index) => {
              const isToday = isSameDay(date, today);
              const dayName = date.toLocaleDateString("en-US", { weekday: "short" });
              const dayNum = date.getDate();

              return (
                <div
                  key={index}
                  className={`p-3 text-center border-l ${isToday ? "bg-primary-500/5" : ""}`}
                  style={{ borderColor: gridLines }}
                >
                  <p className="text-xs font-medium text-gray-500 uppercase">{dayName}</p>
                  <p
                    className={`text-lg font-bold mt-1 ${
                      isToday ? "text-white bg-primary-500 w-8 h-8 rounded-full flex items-center justify-center mx-auto" : ""
                    }`}
                    style={{ color: isToday ? "#FFFFFF" : headerText }}
                  >
                    {dayNum}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Time Grid */}
          <div className="relative">
            {timeSlots.map((time, slotIndex) => {
              const { hour, minute } = parseTime(time);

              return (
                <div
                  key={time}
                  className="grid grid-cols-8 border-b"
                  style={{ borderColor: gridLines, height: slotHeight }}
                >
                  {/* Time Label */}
                  <div
                    className="p-2 text-right pr-4 text-sm"
                    style={{ color: timeText }}
                  >
                    {formatTime(hour, minute)}
                  </div>

                  {/* Day Columns */}
                  {weekDates.map((date, dayIndex) => {
                    const isToday = isSameDay(date, today);
                    const dayEvents = slotIndex === 0 ? getEventsForDay(date) : [];

                    return (
                      <div
                        key={dayIndex}
                        className={`relative border-l ${isToday ? "bg-primary-500/[0.02]" : ""}`}
                        style={{ borderColor: gridLines }}
                        onClick={() => onSlotClick?.(date, time)}
                      >
                        {/* Events (only render on first slot of each day column) */}
                        {slotIndex === 0 &&
                          dayEvents.map((event) => (
                            <EventCard
                              key={event.id}
                              event={event}
                              onClick={() => handleEventClick(event)}
                              timeInterval={timeInterval}
                              startHour={startHour}
                              slotHeight={slotHeight}
                            />
                          ))}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Event Popup */}
      <AnimatePresence>
        {selectedEvent && (
          <EventPopup
            event={selectedEvent}
            onClose={() => setSelectedEvent(null)}
            onBook={handleBookClick}
            popupBg={popupBg}
            popupText={popupText}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================
// MOBILE TIMETABLE (Day View)
// ============================================

interface MobileTimetableProps {
  events: TimetableEvent[];
  currentDate?: Date;
  onEventClick?: (event: TimetableEvent) => void;
  onBookClick?: (event: TimetableEvent) => void;
}

export function MobileTimetable({
  events,
  currentDate = new Date(),
  onBookClick,
}: MobileTimetableProps) {
  const [selectedDate, setSelectedDate] = useState(currentDate);
  const [selectedEvent, setSelectedEvent] = useState<TimetableEvent | null>(null);

  const weekDates = useMemo(() => getWeekDates(selectedDate), [selectedDate]);
  const today = new Date();

  const dayEvents = useMemo(() => {
    return events
      .filter((event) => isSameDay(event.date, selectedDate))
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [events, selectedDate]);

  const handleBookClick = () => {
    if (selectedEvent) {
      onBookClick?.(selectedEvent);
      setSelectedEvent(null);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
      {/* Date Selector */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">
            {selectedDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </h2>
        </div>

        {/* Week Days */}
        <div className="flex gap-1">
          {weekDates.map((date, index) => {
            const isSelected = isSameDay(date, selectedDate);
            const isToday = isSameDay(date, today);
            const dayName = date.toLocaleDateString("en-US", { weekday: "short" }).charAt(0);

            return (
              <button
                key={index}
                onClick={() => setSelectedDate(date)}
                className={`flex-1 py-2 rounded-xl transition-all ${
                  isSelected
                    ? "bg-primary-500 text-white"
                    : isToday
                    ? "bg-primary-500/10 text-primary-500"
                    : "hover:bg-gray-100"
                }`}
              >
                <p className="text-xs font-medium">{dayName}</p>
                <p className="text-sm font-bold">{date.getDate()}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Events List */}
      <div className="p-4 space-y-3">
        {dayEvents.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No slots available for this day</p>
          </div>
        ) : (
          dayEvents.map((event) => {
            const statusConfig = STATUS_CONFIG[event.status];
            const isClickable = event.status === "available";

            return (
              <motion.div
                key={event.id}
                className={`p-4 rounded-xl border-l-4 ${statusConfig.border} bg-gray-50 ${
                  isClickable ? "cursor-pointer" : "opacity-60"
                }`}
                onClick={() => isClickable && setSelectedEvent(event)}
                whileTap={isClickable ? { scale: 0.98 } : {}}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-900">{event.title}</h3>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${statusConfig.bg} ${statusConfig.text}`}
                  >
                    {statusConfig.label}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock className="w-4 h-4" />
                  <span>
                    {event.startTime} - {event.endTime} ({event.duration} min)
                  </span>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Event Popup */}
      <AnimatePresence>
        {selectedEvent && (
          <EventPopup
            event={selectedEvent}
            onClose={() => setSelectedEvent(null)}
            onBook={handleBookClick}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================
// TRUST SIGNALS COMPONENT
// ============================================

export function TimetableTrustSignals() {
  const signals = [
    { icon: CheckCircle, text: "Verified availability", color: "text-emerald-500" },
    { icon: Shield, text: "Secure booking", color: "text-blue-500" },
    { icon: RefreshCw, text: "Real-time updates", color: "text-purple-500" },
  ];

  return (
    <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-600">
      {signals.map((signal, index) => (
        <motion.div
          key={signal.text}
          className="flex items-center gap-2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <signal.icon className={`w-4 h-4 ${signal.color}`} />
          <span>{signal.text}</span>
        </motion.div>
      ))}
    </div>
  );
}

export default TimetableCalendar;
