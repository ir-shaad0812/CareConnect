"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { availabilityService, type TimeSlot, type DayAvailability } from "@/services/api/availability.service";

interface AvailabilityCalendarProps {
  caregiverId: string;
  onSlotSelect: (date: string, slot: TimeSlot) => void;
  onDateRangeSelect?: (startDate: string, endDate: string) => void;
  selectedDate?: string;
  selectedEndDate?: string;
  selectedSlot?: TimeSlot | null;
  slotDuration?: number; // minutes
}

const STATUS_COLORS = {
  available: {
    bg: "bg-emerald-500",
    bgLight: "bg-emerald-50",
    border: "border-emerald-500",
    text: "text-emerald-700",
    hover: "hover:bg-emerald-100",
  },
  booked: {
    bg: "bg-red-500",
    bgLight: "bg-red-50",
    border: "border-red-500",
    text: "text-red-700",
    hover: "",
  },
  reserved: {
    bg: "bg-amber-500",
    bgLight: "bg-amber-50",
    border: "border-amber-500",
    text: "text-amber-700",
    hover: "",
  },
  blocked: {
    bg: "bg-gray-400",
    bgLight: "bg-gray-50",
    border: "border-gray-400",
    text: "text-gray-600",
    hover: "",
  },
};

function toLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function AvailabilityCalendar({
  caregiverId,
  onSlotSelect,
  onDateRangeSelect,
  selectedDate,
  selectedEndDate,
  selectedSlot,
  slotDuration = 60,
}: AvailabilityCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [availability, setAvailability] = useState<Record<string, DayAvailability>>({});
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focusedDate, setFocusedDate] = useState<string | null>(null);

  // Get week dates
  const weekDates = useMemo(() => {
    const dates: Date[] = [];
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());

    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(date.getDate() + i);
      dates.push(date);
    }
    return dates;
  }, [currentDate]);

  // Fetch availability for the week
  useEffect(() => {
    const fetchAvailability = async () => {
      setLoading(true);
      setError(null);

      try {
        const startDate = toLocalDateKey(weekDates[0]);
        const endDate = toLocalDateKey(weekDates[6]);

        const response = await availabilityService.getCaregiverAvailability(
          caregiverId,
          startDate,
          endDate
        );

        if (response.success && response.data?.availability) {
          setAvailability(response.data.availability.calendar || {});
        }
      } catch (err) {
        setError("Failed to load availability");
        console.error("Availability fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAvailability();
  }, [caregiverId, weekDates]);

  useEffect(() => {
    if (selectedDate) {
      setFocusedDate(selectedDate);
    }
  }, [selectedDate]);

  // Fetch slots for focused date
  useEffect(() => {
    const fetchSlots = async () => {
      if (!focusedDate) {
        setSlots([]);
        return;
      }

      setSlotsLoading(true);
      try {
        const response = await availabilityService.getAvailableSlots(
          caregiverId,
          focusedDate,
          slotDuration
        );

        if (response.success && response.data?.slots) {
          setSlots(response.data.slots);
        }
      } catch (err) {
        console.error("Slots fetch error:", err);
        setSlots([]);
      } finally {
        setSlotsLoading(false);
      }
    };

    fetchSlots();
  }, [caregiverId, focusedDate, slotDuration]);

  const navigateWeek = (direction: "prev" | "next") => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() + (direction === "next" ? 7 : -7));
      return newDate;
    });
  };

  const formatDateKey = (date: Date) => toLocalDateKey(date);

  const getDayStatus = (date: Date): "available" | "partial" | "unavailable" | "past" => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (date < today) return "past";

    const dateKey = formatDateKey(date);
    const dayData = availability[dateKey];

    if (!dayData) return "unavailable";
    if (dayData.isBlocked) return "unavailable";
    if (!dayData.isAvailable) return "unavailable";
    if (dayData.bookings && dayData.bookings.length > 0) return "partial";
    return "available";
  };

  const handleDateClick = (date: Date) => {
    const status = getDayStatus(date);
    if (status === "past" || status === "unavailable") return;

    const dateKey = formatDateKey(date);

    if (onDateRangeSelect) {
      if (!selectedDate) {
        onDateRangeSelect(dateKey, dateKey);
      } else {
        const currentStart = selectedDate;
        const currentEnd = selectedEndDate || selectedDate;
        const hasExistingRange = currentStart !== currentEnd;

        if (hasExistingRange) {
          onDateRangeSelect(dateKey, dateKey);
        } else if (dateKey < currentStart) {
          onDateRangeSelect(dateKey, currentStart);
        } else {
          onDateRangeSelect(currentStart, dateKey);
        }
      }
    }

    setFocusedDate(dateKey);
  };

  const handleSlotClick = (slot: TimeSlot) => {
    if (!slot.available || !focusedDate) return;
    onSlotSelect(focusedDate, slot);
  };

  const isSlotSelected = (slot: TimeSlot) => {
    return (
      selectedDate === focusedDate &&
      selectedSlot?.start === slot.start &&
      selectedSlot?.end === slot.end
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12 text-red-600">
        <AlertCircle className="w-5 h-5 mr-2" />
        {error}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary-600" />
            <h3 className="font-semibold text-gray-900">Select Date & Time</h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigateWeek("prev")}
              className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-sm font-medium text-gray-700 min-w-36 text-center">
              {weekDates[0].toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}{" "}
              -{" "}
              {weekDates[6].toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
            <button
              onClick={() => navigateWeek("next")}
              className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Week View */}
      <div className="p-4">
        <div className="grid grid-cols-7 gap-2 mb-4">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div
              key={day}
              className="text-center text-xs font-medium text-gray-500 py-1"
            >
              {day}
            </div>
          ))}

          {weekDates.map((date) => {
            const dateKey = formatDateKey(date);
            const status = getDayStatus(date);
            const isSelected = focusedDate === dateKey;
            const rangeStart = selectedDate || null;
            const rangeEnd = selectedEndDate || selectedDate || null;
            const isRangeStart = Boolean(rangeStart && dateKey === rangeStart);
            const isRangeEnd = Boolean(rangeEnd && dateKey === rangeEnd);
            const isInRange = Boolean(
              rangeStart &&
                rangeEnd &&
                dateKey > rangeStart &&
                dateKey < rangeEnd
            );
            const isToday = formatDateKey(new Date()) === dateKey;

            return (
              <motion.button
                key={dateKey}
                whileHover={status !== "past" && status !== "unavailable" ? { scale: 1.05 } : {}}
                whileTap={status !== "past" && status !== "unavailable" ? { scale: 0.95 } : {}}
                onClick={() => handleDateClick(date)}
                disabled={status === "past" || status === "unavailable"}
                className={`
                  relative p-3 rounded-xl text-center transition-all
                  ${
                    isRangeStart || isRangeEnd
                      ? "bg-primary-600 text-white ring-2 ring-primary-300"
                      : isInRange
                      ? "bg-blue-100 text-blue-700"
                      : isSelected
                      ? "bg-primary-600 text-white ring-2 ring-primary-300"
                      : status === "available"
                      ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                      : status === "partial"
                      ? "bg-amber-50 text-amber-700 hover:bg-amber-100"
                      : status === "past"
                      ? "bg-gray-50 text-gray-400 cursor-not-allowed"
                      : "bg-gray-100 text-gray-400 cursor-not-allowed"
                  }
                `}
              >
                <span className="text-lg font-semibold">{date.getDate()}</span>
                {isToday && (
                  <div
                    className={`absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full ${
                      isSelected || isRangeStart || isRangeEnd ? "bg-white" : "bg-primary-600"
                    }`}
                  />
                )}
                {status === "available" && !isSelected && (
                  <div className="absolute top-1 right-1 w-2 h-2 bg-emerald-500 rounded-full" />
                )}
                {status === "partial" && !isSelected && (
                  <div className="absolute top-1 right-1 w-2 h-2 bg-amber-500 rounded-full" />
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 text-xs text-gray-600 mb-4">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-emerald-500" />
            <span>Available</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-amber-500" />
            <span>Partial</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-gray-400" />
            <span>Unavailable</span>
          </div>
        </div>

        {/* Time Slots */}
        <AnimatePresence mode="wait">
          {focusedDate && (
            <motion.div
              key={focusedDate}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="border-t border-gray-200 pt-4"
            >
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-gray-500" />
                <h4 className="font-medium text-gray-700">
                  Available Time Slots for{" "}
                  {new Date(focusedDate).toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })}
                </h4>
              </div>

              {slotsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
                </div>
              ) : slots.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No available time slots for this date</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                  {slots.map((slot, index) => {
                    const status = slot.status || (slot.available ? "available" : "booked");
                    const colors = STATUS_COLORS[status as keyof typeof STATUS_COLORS] || STATUS_COLORS.blocked;
                    const selected = isSlotSelected(slot);

                    return (
                      <motion.button
                        key={`${slot.start}-${slot.end}`}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.02 }}
                        onClick={() => handleSlotClick(slot)}
                        disabled={!slot.available}
                        className={`
                          relative px-3 py-2 rounded-lg text-sm font-medium transition-all
                          ${
                            selected
                              ? "bg-primary-600 text-white ring-2 ring-primary-300"
                              : slot.available
                              ? `${colors.bgLight} ${colors.text} ${colors.hover} border ${colors.border}`
                              : `${colors.bgLight} ${colors.text} cursor-not-allowed opacity-60`
                          }
                        `}
                      >
                        <span>{slot.start}</span>
                        {selected && (
                          <motion.div
                            layoutId="selected-slot"
                            className="absolute inset-0 bg-primary-600 rounded-lg -z-10"
                          />
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {!focusedDate && (
          <div className="text-center py-8 text-gray-500">
            <Calendar className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="font-medium">Select a date to see available times</p>
            <p className="text-sm">Click on any green or yellow date above</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default AvailabilityCalendar;
