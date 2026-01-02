"use client";

// ============================================
// SLOT CARDS — Sprint E
// Visual card view of a booking's atomic slots.
// Replaces dropdowns in the booking detail page.
// ============================================

import { useEffect, useState } from "react";
import { bookingService, type BookingSlot, type SlotSummary } from "@/services/api/booking.service";

interface Props {
  bookingId: string;
}

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  pending:     { bg: "bg-slate-100",    text: "text-slate-700",    label: "Pending" },
  confirmed:   { bg: "bg-blue-100",     text: "text-blue-700",     label: "Confirmed" },
  in_progress: { bg: "bg-amber-100",    text: "text-amber-800",    label: "In progress" },
  completed:   { bg: "bg-emerald-100",  text: "text-emerald-700",  label: "Completed" },
  cancelled:   { bg: "bg-rose-100",     text: "text-rose-700",     label: "Cancelled" },
  no_show:     { bg: "bg-rose-200",     text: "text-rose-800",     label: "No show" },
  disputed:    { bg: "bg-purple-100",   text: "text-purple-700",   label: "Disputed" },
};

export default function SlotCards({ bookingId }: Props) {
  const [summary, setSummary] = useState<SlotSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    bookingService
      .getBookingSlots(bookingId)
      .then((res) => {
        if (!alive) return;
        if (res.success && res.data) setSummary(res.data);
        else setError(res.message || "Failed to load slots");
      })
      .catch((e) => alive && setError(e?.message || "Failed to load slots"))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [bookingId]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl bg-slate-100" />
        ))}
      </div>
    );
  }

  if (error) {
    return <div className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</div>;
  }

  if (!summary || summary.slotCount === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
        No slots yet — slots are generated when the booking is confirmed.
      </div>
    );
  }

  const fmt = (n: number) => `NPR ${n.toFixed(0)}`;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-3 text-sm text-slate-600">
        <span className="font-semibold text-slate-900">{summary.slotCount} slots</span>
        <span>·</span>
        <span>Paid {fmt(summary.totalPaid)}</span>
        <span>·</span>
        <span>Refunded {fmt(summary.totalRefunded)}</span>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {summary.slots.map((slot: BookingSlot) => {
          const style = STATUS_STYLES[slot.status] || STATUS_STYLES.pending;
          return (
            <div
              key={slot._id}
              className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition hover:shadow-md"
            >
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Slot #{slot.slotNumber}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${style.bg} ${style.text}`}>
                  {style.label}
                </span>
              </div>
              <div className="text-sm font-medium text-slate-900">
                {new Date(slot.scheduledStart).toLocaleDateString(undefined, {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })}
              </div>
              <div className="text-xs text-slate-500">
                {new Date(slot.scheduledStart).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                {" – "}
                {new Date(slot.scheduledEnd).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </div>
              <div className="mt-2 border-t border-slate-100 pt-2 text-xs">
                <div className="flex justify-between text-slate-500">
                  <span>Allocated</span>
                  <span className="font-medium text-slate-700">{fmt(slot.amountAllocated)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Paid</span>
                  <span className="font-medium text-slate-700">{fmt(slot.amountPaid)}</span>
                </div>
                {slot.amountRefunded > 0 && (
                  <div className="flex justify-between text-rose-500">
                    <span>Refunded</span>
                    <span className="font-medium">{fmt(slot.amountRefunded)}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
