"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  CalendarDays,
  Clock,
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Save,
  Ban,
  CheckCircle2,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { userService } from "@/modules/user/services";
import { useAuthContext } from "@/context/AuthContext";
import { extractStatusCode } from "@/types/errors.types";
import { CaregiverLayout } from "../components";

interface AvailabilitySlot {
  start: string;
  end: string;
  booked: boolean;
}

interface DayAvailability {
  date: string;
  isAvailable: boolean;
  slots: AvailabilitySlot[];
}

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const TIME_SLOTS = Array.from({ length: 24 }, (_, i) => {
  const hour = i.toString().padStart(2, "0");
  return `${hour}:00`;
});

export default function AvailabilityPage() {
  const router = useRouter();
  const { user: authUser, isLoading: isAuthLoading } = useAuthContext();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [error, setError] = useState("");

  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [blockedDates, setBlockedDates] = useState<string[]>([]);
  const [newBlockedDate, setNewBlockedDate] = useState("");

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [calendarDays, setCalendarDays] = useState<DayAvailability[]>([]);

  useEffect(() => {
    generateCalendarDays();
  }, [currentMonth, selectedDays, blockedDates]);

  const fetchAvailability = useCallback(async () => {
    try {
      setIsLoading(true);

      const response = await userService.getProfile();

      if (response.success && response.data) {
        const user = response.data.user;

        if (user.availability) {
          setSelectedDays(user.availability.days || []);
          setStartTime(user.availability.hours?.start || "09:00");
          setEndTime(user.availability.hours?.end || "17:00");
        }
      }
    } catch (err) {
      const statusCode = extractStatusCode(err);
      if (statusCode === 401) {
        router.replace("/login?redirect=/dashboard/caregiver/availability");
        return;
      }

      if (statusCode === 403) {
        if (authUser?.role === "caregiver") {
          router.replace("/dashboard/pending");
          return;
        }

        setError("You do not have permission to view availability.");
        return;
      }

      console.error("Error fetching availability:", err);
      setError("Failed to load availability");
    } finally {
      setIsLoading(false);
    }
  }, [router, authUser?.role]);

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    if (!authUser) {
      setIsLoading(false);
      return;
    }

    if (authUser.role && authUser.role !== "caregiver") {
      setIsLoading(false);
      return;
    }

    void fetchAvailability();
  }, [
    isAuthLoading,
    authUser?._id,
    authUser?.role,
    router,
    fetchAvailability,
  ]);

  const generateCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: DayAvailability[] = [];

    for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split("T")[0];
      const dayName = DAYS_OF_WEEK[d.getDay() === 0 ? 6 : d.getDay() - 1];

      days.push({
        date: dateStr,
        isAvailable: selectedDays.includes(dayName) && !blockedDates.includes(dateStr),
        slots: [],
      });
    }

    setCalendarDays(days);
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError("");

      await userService.updateAvailability({
        days: selectedDays,
        hours: { start: startTime, end: endTime },
      });

      setSuccessMessage("Availability updated successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      console.error("Error saving availability:", err);
      setError("Failed to save availability");
    } finally {
      setIsSaving(false);
    }
  };

  const toggleDay = (day: string) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const addBlockedDate = () => {
    if (newBlockedDate && !blockedDates.includes(newBlockedDate)) {
      setBlockedDates([...blockedDates, newBlockedDate]);
      setNewBlockedDate("");
    }
  };

  const removeBlockedDate = (date: string) => {
    setBlockedDates(blockedDates.filter((d) => d !== date));
  };

  const navigateMonth = (direction: number) => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + direction, 1));
  };

  if (isLoading) {
    return (
      <CaregiverLayout pageTitle="Availability">
        <div className="flex items-center justify-center py-24">
          <div className="text-center">
            <div className="relative w-14 h-14 mx-auto mb-4">
              <div className="absolute inset-0 rounded-full border-[3px] border-gray-200" />
              <div className="absolute inset-0 rounded-full border-[3px] border-[#39B54A] border-t-transparent animate-spin" />
            </div>
            <p className="text-sm text-gray-500 font-medium">Loading schedule...</p>
          </div>
        </div>
      </CaregiverLayout>
    );
  }

  return (
    <CaregiverLayout pageTitle="Availability">
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">My Schedule</h1>
            <p className="text-sm text-gray-500 mt-1">
              Set your working days, hours, and manage your calendar
            </p>
          </div>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#39B54A] text-white rounded-xl text-sm font-medium hover:bg-[#2d913c] transition-colors disabled:opacity-50"
          >
            {isSaving ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Save size={16} />
            )}
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </div>

        {/* Success / Error Messages */}
        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 p-4 bg-[#39B54A]/10 border border-[#39B54A]/20 rounded-xl text-[#39B54A]"
          >
            <CheckCircle2 size={18} />
            <span className="text-sm font-medium">{successMessage}</span>
          </motion.div>
        )}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600"
          >
            <AlertCircle size={18} />
            <span className="text-sm font-medium">{error}</span>
          </motion.div>
        )}

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Weekly Schedule */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl p-6 border border-gray-100/80"
          >
            <div className="flex items-center gap-2 mb-5">
              <CalendarDays size={18} className="text-[#39B54A]" />
              <h2 className="text-base font-semibold text-gray-900">Weekly Schedule</h2>
            </div>

            {/* Days Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Available Days
              </label>
              <div className="flex flex-wrap gap-2">
                {DAYS_OF_WEEK.map((day) => (
                  <button
                    key={day}
                    onClick={() => toggleDay(day)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                      selectedDays.includes(day)
                        ? "bg-[#39B54A] text-white shadow-sm"
                        : "bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200"
                    }`}
                  >
                    {day.slice(0, 3)}
                  </button>
                ))}
              </div>
            </div>

            {/* Working Hours */}
            <div className="mb-6">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
                <Clock size={14} className="text-gray-400" />
                Working Hours
              </label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Start Time</label>
                  <select
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#39B54A]/20 focus:border-[#39B54A] outline-none bg-gray-50/50"
                  >
                    {TIME_SLOTS.map((time) => (
                      <option key={time} value={time}>
                        {time}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">End Time</label>
                  <select
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#39B54A]/20 focus:border-[#39B54A] outline-none bg-gray-50/50"
                  >
                    {TIME_SLOTS.map((time) => (
                      <option key={time} value={time}>
                        {time}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Blocked Dates */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
                <Ban size={14} className="text-gray-400" />
                Blocked Dates
              </label>
              <div className="flex gap-2 mb-3">
                <input
                  type="date"
                  value={newBlockedDate}
                  onChange={(e) => setNewBlockedDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#39B54A]/20 focus:border-[#39B54A] outline-none bg-gray-50/50"
                />
                <button
                  onClick={addBlockedDate}
                  disabled={!newBlockedDate}
                  className="inline-flex items-center gap-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm hover:bg-gray-200 transition-colors disabled:opacity-40"
                >
                  <Plus size={14} />
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {blockedDates.map((date) => (
                  <span
                    key={date}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 rounded-full text-xs font-medium ring-1 ring-red-100"
                  >
                    {new Date(date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                    <button
                      onClick={() => removeBlockedDate(date)}
                      className="w-4 h-4 rounded-full bg-red-100 hover:bg-red-200 flex items-center justify-center transition-colors"
                    >
                      <X size={10} />
                    </button>
                  </span>
                ))}
                {blockedDates.length === 0 && (
                  <p className="text-xs text-gray-400">No blocked dates</p>
                )}
              </div>
            </div>
          </motion.div>

          {/* Calendar View */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="bg-white rounded-xl p-6 border border-gray-100/80"
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-gray-900">Calendar Preview</h2>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => navigateMonth(-1)}
                  className="p-2 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <ChevronLeft size={16} className="text-gray-500" />
                </button>
                <span className="text-sm font-semibold text-gray-800 min-w-32 text-center">
                  {currentMonth.toLocaleDateString("en-US", {
                    month: "long",
                    year: "numeric",
                  })}
                </span>
                <button
                  onClick={() => navigateMonth(1)}
                  className="p-2 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <ChevronRight size={16} className="text-gray-500" />
                </button>
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div
                  key={day}
                  className="text-center text-[11px] font-semibold text-gray-400 uppercase tracking-wider py-2"
                >
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({
                length: new Date(
                  currentMonth.getFullYear(),
                  currentMonth.getMonth(),
                  1
                ).getDay(),
              }).map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square" />
              ))}
              {calendarDays.map((day) => {
                const date = new Date(day.date);
                const dayName = DAYS_OF_WEEK[date.getDay() === 0 ? 6 : date.getDay() - 1];
                const isAvailable =
                  selectedDays.includes(dayName) && !blockedDates.includes(day.date);
                const isBlocked = blockedDates.includes(day.date);
                const isToday = day.date === new Date().toISOString().split("T")[0];
                const isPast = new Date(day.date) < new Date(new Date().toDateString());

                return (
                  <div
                    key={day.date}
                    className={`aspect-square flex items-center justify-center rounded-lg text-xs font-medium transition-all ${
                      isPast
                        ? "text-gray-300"
                        : isAvailable
                        ? "bg-[#39B54A]/10 text-[#39B54A] ring-1 ring-[#39B54A]/20"
                        : isBlocked
                        ? "bg-red-50 text-red-500 ring-1 ring-red-100"
                        : "bg-gray-50 text-gray-400"
                    } ${isToday ? "ring-2 ring-[#39B54A] font-bold" : ""}`}
                  >
                    {date.getDate()}
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-5 mt-5 pt-4 border-t border-gray-100">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 bg-[#39B54A]/10 rounded ring-1 ring-[#39B54A]/20" />
                <span className="text-xs text-gray-500">Available</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 bg-red-50 rounded ring-1 ring-red-100" />
                <span className="text-xs text-gray-500">Blocked</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 bg-gray-50 rounded ring-1 ring-gray-200" />
                <span className="text-xs text-gray-500">Unavailable</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </CaregiverLayout>
  );
}
