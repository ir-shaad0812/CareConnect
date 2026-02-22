"use client";

import React, { useState } from "react";

// ============================================
// CALENDAR TYPES
// ============================================

export interface CalendarEvent {
  id: string;
  title: string;
  start: string | Date;
  end?: string | Date;
  startTime?: string;
  endTime?: string;
  status?: string;
  type?: "session" | "assignment" | "booking";
  color?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: any;
}

interface CalendarProps {
  events?: CalendarEvent[];
  view?: "month" | "week";
  onViewChange?: (view: "month" | "week") => void;
  onDateSelect?: (date: Date) => void;
  onEventClick?: (event: CalendarEvent) => void;
  onMonthChange?: (date: Date) => void;
  selectedDate?: Date;
  className?: string;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

const DAYS_OF_WEEK = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAYS_OF_WEEK_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const getDaysInMonth = (year: number, month: number): number => {
  return new Date(year, month + 1, 0).getDate();
};

const getFirstDayOfMonth = (year: number, month: number): number => {
  return new Date(year, month, 1).getDay();
};

const isSameDay = (date1: Date, date2: Date): boolean => {
  return (
    date1.getDate() === date2.getDate() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getFullYear() === date2.getFullYear()
  );
};

const isToday = (date: Date): boolean => {
  return isSameDay(date, new Date());
};

const formatDate = (date: Date): string => {
  return `${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
};

const getWeekDays = (date: Date): Date[] => {
  const startOfWeek = new Date(date);
  startOfWeek.setDate(date.getDate() - date.getDay());
  
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(startOfWeek);
    day.setDate(startOfWeek.getDate() + i);
    days.push(day);
  }
  return days;
};

// Get events for a specific date
const getEventsForDate = (events: CalendarEvent[], date: Date): CalendarEvent[] => {
  return events.filter(event => {
    const eventStart = new Date(event.start);
    return isSameDay(eventStart, date);
  });
};

// Get status color
const getStatusColor = (status?: string, type?: string): { bg: string; text: string; border: string } => {
  if (type === "session") {
    return { bg: "bg-primary-500/10", text: "text-primary-500", border: "border-l-[#4461F2]" };
  }
  if (type === "assignment") {
    return { bg: "bg-emerald-50", text: "text-emerald-600", border: "border-l-emerald-500" };
  }
  
  switch (status) {
    case "confirmed":
      return { bg: "bg-blue-50", text: "text-blue-700", border: "border-l-blue-500" };
    case "in_progress":
      return { bg: "bg-purple-50", text: "text-purple-700", border: "border-l-purple-500" };
    case "completed":
      return { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-l-emerald-500" };
    case "cancelled":
    case "rejected":
      return { bg: "bg-red-50", text: "text-red-600", border: "border-l-red-500" };
    case "pending":
    default:
      return { bg: "bg-gray-50", text: "text-gray-600", border: "border-l-gray-400" };
  }
};

// ============================================
// MONTH VIEW COMPONENT
// ============================================

interface MonthViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  selectedDate?: Date;
  onDateSelect?: (date: Date) => void;
  onEventClick?: (event: CalendarEvent) => void;
}

const MonthView: React.FC<MonthViewProps> = ({
  currentDate,
  events,
  selectedDate,
  onDateSelect,
  onEventClick,
}) => {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDayOfMonth = getFirstDayOfMonth(year, month);
  
  // Get previous month's trailing days
  const prevMonthDays = getDaysInMonth(year, month - 1);
  const trailingDays = Array.from(
    { length: firstDayOfMonth },
    (_, i) => prevMonthDays - firstDayOfMonth + i + 1
  );
  
  // Get current month's days
  const currentMonthDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  
  // Get next month's leading days
  const totalCells = Math.ceil((firstDayOfMonth + daysInMonth) / 7) * 7;
  const leadingDays = Array.from(
    { length: totalCells - firstDayOfMonth - daysInMonth },
    (_, i) => i + 1
  );

  return (
    <div className="overflow-hidden rounded-xl border border-[#E1E6EF]">
      {/* Header */}
      <div className="grid grid-cols-7 bg-[#F8FAFC]">
        {DAYS_OF_WEEK.map((day, idx) => (
          <div
            key={day}
            className="py-3 px-2 text-center text-sm font-semibold text-gray-700 border-b border-[#E1E6EF]"
          >
            <span className="hidden sm:inline">{day}</span>
            <span className="sm:hidden">{DAYS_OF_WEEK_SHORT[idx]}</span>
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7">
        {/* Previous month trailing days */}
        {trailingDays.map((day, idx) => (
          <div
            key={`prev-${idx}`}
            className="min-h-[100px] sm:min-h-[120px] p-2 bg-gray-50/50 border-b border-r border-[#E1E6EF] last:border-r-0"
          >
            <span className="text-sm text-gray-400">{day}</span>
          </div>
        ))}

        {/* Current month days */}
        {currentMonthDays.map((day) => {
          const date = new Date(year, month, day);
          const dayEvents = getEventsForDate(events, date);
          const isCurrentDay = isToday(date);
          const isSelected = selectedDate && isSameDay(date, selectedDate);

          return (
            <div
              key={day}
              onClick={() => onDateSelect?.(date)}
              className={`min-h-[100px] sm:min-h-[120px] p-2 border-b border-r border-[#E1E6EF] last:border-r-0 cursor-pointer transition-colors hover:bg-[#F0F5FF]/50 ${
                isSelected ? "bg-[#F0F5FF]" : ""
              }`}
            >
              <div className="flex justify-between items-start mb-1">
                <span
                  className={`text-sm font-medium inline-flex items-center justify-center w-7 h-7 rounded-full ${
                    isCurrentDay
                      ? "bg-primary-500 text-white"
                      : isSelected
                      ? "bg-primary-500/10 text-primary-500"
                      : "text-gray-700"
                  }`}
                >
                  {day}
                </span>
                {dayEvents.length > 2 && (
                  <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-full">
                    +{dayEvents.length - 2}
                  </span>
                )}
              </div>
              
              {/* Events */}
              <div className="space-y-1 overflow-hidden">
                {dayEvents.slice(0, 2).map((event) => {
                  const colors = getStatusColor(event.status, event.type);
                  return (
                    <div
                      key={event.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEventClick?.(event);
                      }}
                      className={`text-xs p-1.5 rounded border-l-2 ${colors.bg} ${colors.text} ${colors.border} truncate cursor-pointer hover:opacity-80 transition-opacity`}
                    >
                      <div className="flex items-center gap-1">
                        {event.type === "session" && (
                          <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        )}
                        {event.type === "assignment" && (
                          <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        )}
                        <span className="truncate">{event.title}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Next month leading days */}
        {leadingDays.map((day, idx) => (
          <div
            key={`next-${idx}`}
            className="min-h-[100px] sm:min-h-[120px] p-2 bg-gray-50/50 border-b border-r border-[#E1E6EF] last:border-r-0"
          >
            <span className="text-sm text-gray-400">{day}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================
// WEEK VIEW COMPONENT
// ============================================

interface WeekViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  selectedDate?: Date;
  onDateSelect?: (date: Date) => void;
  onEventClick?: (event: CalendarEvent) => void;
}

const WeekView: React.FC<WeekViewProps> = ({
  currentDate,
  events,
  selectedDate,
  onDateSelect,
  onEventClick,
}) => {
  const weekDays = getWeekDays(currentDate);

  return (
    <div className="overflow-hidden rounded-xl border border-[#E1E6EF]">
      {/* Header */}
      <div className="grid grid-cols-7 bg-[#F8FAFC]">
        {weekDays.map((date, idx) => {
          const isCurrentDay = isToday(date);
          const isSelected = selectedDate && isSameDay(date, selectedDate);
          
          return (
            <div
              key={idx}
              onClick={() => onDateSelect?.(date)}
              className={`py-3 px-2 text-center border-b border-r border-[#E1E6EF] last:border-r-0 cursor-pointer transition-colors hover:bg-[#F0F5FF]/50 ${
                isSelected ? "bg-[#F0F5FF]" : ""
              }`}
            >
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                {DAYS_OF_WEEK_SHORT[idx]}
              </p>
              <span
                className={`text-lg font-semibold inline-flex items-center justify-center w-9 h-9 rounded-full ${
                  isCurrentDay
                    ? "bg-primary-500 text-white"
                    : isSelected
                    ? "bg-primary-500/10 text-primary-500"
                    : "text-gray-900"
                }`}
              >
                {date.getDate()}
              </span>
            </div>
          );
        })}
      </div>

      {/* Events Grid */}
      <div className="grid grid-cols-7 min-h-[400px]">
        {weekDays.map((date, idx) => {
          const dayEvents = getEventsForDate(events, date);
          
          return (
            <div
              key={idx}
              className="p-2 border-r border-[#E1E6EF] last:border-r-0 space-y-2"
            >
              {dayEvents.map((event) => {
                const colors = getStatusColor(event.status, event.type);
                return (
                  <div
                    key={event.id}
                    onClick={() => onEventClick?.(event)}
                    className={`p-2 rounded-lg border-l-2 ${colors.bg} ${colors.border} cursor-pointer hover:opacity-80 transition-opacity`}
                  >
                    <div className="flex items-center gap-1 mb-1">
                      {event.type === "session" && (
                        <svg className={`w-3.5 h-3.5 ${colors.text}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      )}
                      {event.type === "assignment" && (
                        <svg className={`w-3.5 h-3.5 ${colors.text}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      )}
                    </div>
                    <p className={`text-xs font-medium ${colors.text} truncate`}>
                      {event.title}
                    </p>
                    {event.startTime && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        {event.startTime} - {event.endTime || ""}
                      </p>
                    )}
                  </div>
                );
              })}
              
              {dayEvents.length === 0 && (
                <div className="h-full flex items-center justify-center text-gray-300">
                  <span className="text-xs">No events</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ============================================
// MAIN CALENDAR COMPONENT
// ============================================

export const Calendar: React.FC<CalendarProps> = ({
  events = [],
  view = "month",
  onViewChange,
  onDateSelect,
  onEventClick,
  onMonthChange,
  selectedDate,
  className = "",
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState<"month" | "week">(view);

  // Navigate to previous month/week
  const goToPrevious = () => {
    const newDate = new Date(currentDate);
    if (currentView === "month") {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setDate(newDate.getDate() - 7);
    }
    setCurrentDate(newDate);
    onMonthChange?.(newDate);
  };

  // Navigate to next month/week
  const goToNext = () => {
    const newDate = new Date(currentDate);
    if (currentView === "month") {
      newDate.setMonth(newDate.getMonth() + 1);
    } else {
      newDate.setDate(newDate.getDate() + 7);
    }
    setCurrentDate(newDate);
    onMonthChange?.(newDate);
  };

  // Go to today
  const goToToday = () => {
    setCurrentDate(new Date());
    onMonthChange?.(new Date());
  };

  // Handle view change
  const handleViewChange = (newView: "month" | "week") => {
    setCurrentView(newView);
    onViewChange?.(newView);
  };

  // Get title for current view
  const getTitle = () => {
    if (currentView === "month") {
      return formatDate(currentDate);
    }
    const weekDays = getWeekDays(currentDate);
    const startMonth = MONTHS[weekDays[0].getMonth()];
    const endMonth = MONTHS[weekDays[6].getMonth()];
    if (startMonth === endMonth) {
      return `${startMonth} ${weekDays[0].getDate()} - ${weekDays[6].getDate()}, ${currentDate.getFullYear()}`;
    }
    return `${startMonth} ${weekDays[0].getDate()} - ${endMonth} ${weekDays[6].getDate()}, ${currentDate.getFullYear()}`;
  };

  return (
    <div className={`bg-white rounded-2xl shadow-sm ${className}`}>
      {/* Calendar Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 border-b border-[#E1E6EF]">
        <div className="flex items-center gap-3">
          {/* Navigation */}
          <button
            onClick={goToPrevious}
            className="p-2 rounded-lg hover:bg-[#F0F5FF] transition-colors text-gray-600"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          <h2 className="text-lg font-bold text-gray-900 min-w-[180px] text-center">
            {getTitle()}
          </h2>
          
          <button
            onClick={goToNext}
            className="p-2 rounded-lg hover:bg-[#F0F5FF] transition-colors text-gray-600"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          <button
            onClick={goToToday}
            className="px-3 py-1.5 text-sm font-medium text-primary-500 bg-[#F0F5FF] rounded-lg hover:bg-primary-500/20 transition-colors"
          >
            Today
          </button>
        </div>

        <div className="flex items-center gap-4">
          {/* Legend */}
          <div className="hidden md:flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-primary-500"></span>
              <span className="text-sm text-gray-600">Sessions</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-emerald-500"></span>
              <span className="text-sm text-gray-600">Assignments</span>
            </div>
          </div>

          {/* View Toggle */}
          <div className="flex items-center gap-1 text-sm font-medium text-gray-600">
            <span>View as :</span>
            <button
              onClick={() => handleViewChange("month")}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                currentView === "month"
                  ? "text-primary-500 font-semibold"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Month
            </button>
            <span className="text-gray-300">|</span>
            <button
              onClick={() => handleViewChange("week")}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                currentView === "week"
                  ? "text-primary-500 font-semibold"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Week
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Body */}
      <div className="p-4">
        {currentView === "month" ? (
          <MonthView
            currentDate={currentDate}
            events={events}
            {...(selectedDate !== undefined ? { selectedDate } : {})}
            {...(onDateSelect !== undefined ? { onDateSelect } : {})}
            {...(onEventClick !== undefined ? { onEventClick } : {})}
          />
        ) : (
          <WeekView
            currentDate={currentDate}
            events={events}
            {...(selectedDate !== undefined ? { selectedDate } : {})}
            {...(onDateSelect !== undefined ? { onDateSelect } : {})}
            {...(onEventClick !== undefined ? { onEventClick } : {})}
          />
        )}
      </div>
    </div>
  );
};

export default Calendar;
