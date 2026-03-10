"use client";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { BookingCalendar } from "@/components/features/calendar/BookingCalendar";

export default function CareSeekerCalendarPage() {
  return (
    <DashboardLayout>
      <div className="mx-auto max-w-5xl p-4 sm:p-6 space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Care Calendar</h1>
          <p className="text-sm text-slate-500 mt-0.5">View and track all your care bookings</p>
        </div>
        <BookingCalendar role="careseeker" />
      </div>
    </DashboardLayout>
  );
}
