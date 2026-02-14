"use client";

import { CaregiverLayout } from "../components";
import { BookingCalendar } from "@/components/features/calendar/BookingCalendar";

export default function CaregiverCalendarPage() {
  return (
    <CaregiverLayout pageTitle="Calendar">
      <div className="mx-auto max-w-5xl p-4 sm:p-6 space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Booking Calendar</h1>
          <p className="text-sm text-slate-500 mt-0.5">All your scheduled care sessions</p>
        </div>
        <BookingCalendar role="caregiver" />
      </div>
    </CaregiverLayout>
  );
}
