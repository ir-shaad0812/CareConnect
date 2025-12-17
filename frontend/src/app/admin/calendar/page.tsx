"use client";

import AdminLayout from "@/components/layout/AdminLayout";
import { BookingCalendar } from "@/components/features/calendar/BookingCalendar";

export default function AdminCalendarPage() {
  return (
    <AdminLayout>
      <div className="mx-auto max-w-6xl p-4 sm:p-6 space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Booking Calendar</h1>
          <p className="text-sm text-slate-500 mt-0.5">All platform bookings across all users</p>
        </div>
        <BookingCalendar role="admin" />
      </div>
    </AdminLayout>
  );
}
