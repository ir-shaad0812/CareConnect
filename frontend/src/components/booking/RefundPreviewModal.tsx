"use client";

// ============================================
// REFUND PREVIEW MODAL — Sprint E
// Shows a line-by-line refund breakdown before the user confirms cancel.
// ============================================

import { useEffect, useState } from "react";
import { bookingService, type RefundPreview } from "@/services/api/booking.service";

interface Props {
  bookingId: string;
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void> | void;
}

export default function RefundPreviewModal({ bookingId, open, onClose, onConfirm }: Props) {
  const [preview, setPreview] = useState<RefundPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !bookingId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    bookingService
      .previewRefund(bookingId)
      .then((res) => {
        if (cancelled) return;
        if (res.success && res.data) setPreview(res.data);
        else setError(res.message || "Failed to load refund preview");
      })
      .catch((e) => !cancelled && setError(e?.message || "Failed to load refund preview"))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [open, bookingId]);

  if (!open) return null;

  const fmt = (n: number) => `${preview?.currency || "NPR"} ${n.toFixed(2)}`;
  const reasonText = reason.trim();
  const canSubmit = reasonText.length > 0;
  const eligibilityBadge = (e: string) => {
    const map: Record<string, string> = {
      full: "bg-emerald-100 text-emerald-700",
      high: "bg-blue-100 text-blue-700",
      low: "bg-amber-100 text-amber-700",
      none: "bg-rose-100 text-rose-700",
    };
    return map[e] || "bg-slate-100 text-slate-700";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Cancel booking</h2>
            <p className="text-sm text-slate-500">Refunds are available only within 4 hours of booking confirmation and before service starts.</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {loading && <div className="py-10 text-center text-slate-500">Loading refund preview…</div>}
        {error && <div className="rounded-lg bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}

        {preview && (
          <>
            {preview.coolOffActive && (
              <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                <strong>Refund window active</strong> — you're within {preview.coolOffHours}h of
                booking confirmation and the service has not started. The platform fee is non-refundable.
              </div>
            )}

            {!preview.coolOffActive && (
              <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
                <strong>Refund not eligible</strong>
                {preview.refundDecisionReason ? ` — ${preview.refundDecisionReason}.` : ' The 4-hour refund window has expired or the service has already started.'}
              </div>
            )}

            <div className="mb-4 grid grid-cols-3 gap-3 rounded-xl bg-slate-50 p-4 text-center">
              <div>
                <div className="text-xs uppercase text-slate-500">Total paid</div>
                <div className="text-lg font-semibold text-slate-900">{fmt(preview.totalPaid)}</div>
              </div>
              <div>
                <div className="text-xs uppercase text-slate-500">Refund</div>
                <div className="text-lg font-semibold text-emerald-600">{fmt(preview.totalRefund)}</div>
              </div>
              <div>
                <div className="text-xs uppercase text-slate-500">Non-refundable</div>
                <div className="text-lg font-semibold text-rose-600">{fmt(preview.totalNonRefundable)}</div>
              </div>
            </div>

            <div className="mb-4 max-h-64 overflow-y-auto rounded-xl border border-slate-200">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-slate-50 text-left text-xs uppercase text-slate-500">
                  <tr>
                    <th className="p-2">Slot</th>
                    <th className="p-2">Start</th>
                    <th className="p-2">Paid</th>
                    <th className="p-2">Refund</th>
                    <th className="p-2">Tier</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.breakdown.map((row) => (
                    <tr key={row.slotId ?? row.slotNumber} className="border-t border-slate-100">
                      <td className="p-2 font-medium">#{row.slotNumber}</td>
                      <td className="p-2 text-slate-600">
                        {new Date(row.scheduledStart).toLocaleString()}
                      </td>
                      <td className="p-2">{fmt(row.amountPaid)}</td>
                      <td className="p-2 font-medium text-emerald-600">{fmt(row.refundAmount)}</td>
                      <td className="p-2">
                        <span className={`rounded px-2 py-0.5 text-xs ${eligibilityBadge(row.eligibility)}`}>
                          {row.refundPercentage}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium text-slate-700">Reason</label>
              <textarea
                className="w-full rounded-lg border border-slate-300 p-2 text-sm focus:border-slate-500 focus:outline-none"
                rows={2}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Required — tell us why you're cancelling"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={onClose}
                disabled={submitting}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Keep booking
              </button>
              <button
                disabled={submitting || !canSubmit}
                onClick={async () => {
                  if (!canSubmit) {
                    setError("Cancellation reason is required");
                    return;
                  }
                  setSubmitting(true);
                  try {
                    await onConfirm(reasonText);
                    onClose();
                  } catch (e) {
                    const msg = e instanceof Error ? e.message : "Failed to cancel booking";
                    setError(msg);
                  } finally {
                    setSubmitting(false);
                  }
                }}
                className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {submitting ? "Cancelling…" : `Confirm cancel (${fmt(preview.totalRefund)} refund)`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
