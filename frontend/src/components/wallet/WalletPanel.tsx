"use client";

// ============================================
// WALLET PANEL — Sprint D/E
// Shows user's wallet + ledger. Caregivers also see payout button.
// ============================================

import { useEffect, useState } from "react";
import { walletService, type Wallet, type LedgerEntry, type PayoutRequest } from "@/services/api/wallet.service";
import { useSocketEvent, SYSTEM_EVENTS } from "@/hooks/useSocket";

const OP_LABEL: Record<string, string> = {
  "payment.captured": "Payment received (escrow)",
  "slot.released": "Slot earnings released",
  "commission.taken": "Platform commission",
  "refund.issued": "Refund issued",
  "payout.requested": "Payout requested",
  "payout.completed": "Payout completed",
  "adjustment": "Adjustment",
};

export default function WalletPanel({ role }: { role: "caregiver" | "careseeker" }) {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [payoutRequests, setPayoutRequests] = useState<PayoutRequest[]>([]);
  const [payoutAmount, setPayoutAmount] = useState("");
  const [payoutError, setPayoutError] = useState<string | null>(null);
  const [payoutSuccess, setPayoutSuccess] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [w, l] = await Promise.all([
        walletService.getMyWallet(),
        walletService.getMyLedger({ limit: 50 }),
      ]);

      if (role === "caregiver") {
        const payoutRes = await walletService.getMyPayoutRequests({ limit: 10 });
        if (payoutRes.success && payoutRes.data) setPayoutRequests(payoutRes.data.requests);
      }

      if (w.success && w.data) setWallet(w.data);
      if (l.success && l.data) setLedger(l.data.entries);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Real-time wallet updates — refresh when server emits wallet change
  useSocketEvent(SYSTEM_EVENTS.WALLET_UPDATED, () => {
    load();
  });
  // Also listen for legacy event name
  useSocketEvent("wallet_update", () => {
    load();
  });
  useSocketEvent("admin:payout_request_updated", () => {
    if (role === "caregiver") load();
  });

  const fmt = (n: number) => `${wallet?.currency || "NPR"} ${n.toFixed(2)}`;

  const handlePayout = async () => {
    setPayoutError(null);
    setPayoutSuccess(null);
    const amt = Number(payoutAmount);
    if (!amt || amt <= 0) {
      setPayoutError("Enter a valid amount");
      return;
    }
    try {
      const res = await walletService.requestPayout(amt);
      if (res.success) {
        setPayoutSuccess(`Withdrawal request for ${fmt(amt)} sent to admin for approval`);
        setPayoutAmount("");
        await load();
      } else {
        setPayoutError(res.message || "Payout failed");
      }
    } catch (e) {
      setPayoutError(e instanceof Error ? e.message : "Payout failed");
    }
  };

  if (loading) {
    return <div className="animate-pulse rounded-xl bg-slate-100 p-6 text-center text-slate-500">Loading wallet…</div>;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs uppercase text-slate-500">Available</div>
          <div className="mt-1 text-2xl font-bold text-slate-900">{fmt(wallet?.balance ?? 0)}</div>
          <div className="mt-1 text-xs text-slate-500">Ready to {role === "caregiver" ? "withdraw" : "use"}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs uppercase text-slate-500">In escrow</div>
          <div className="mt-1 text-2xl font-bold text-amber-600">{fmt(wallet?.pendingBalance ?? 0)}</div>
          <div className="mt-1 text-xs text-slate-500">
            {role === "caregiver" ? "Released after slot completion" : "Held until service delivered"}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs uppercase text-slate-500">Lifetime credited</div>
          <div className="mt-1 text-2xl font-bold text-emerald-600">{fmt(wallet?.lifetime?.credited ?? 0)}</div>
        </div>
      </div>

      {role === "caregiver" && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-1 text-sm font-semibold text-slate-900">Request withdrawal</div>
          <div className="mb-2 text-xs text-slate-500">
            Requests are reviewed by admin. Your available balance is debited only after approval.
          </div>
          <div className="flex gap-2">
            <input
              type="number"
              value={payoutAmount}
              onChange={(e) => setPayoutAmount(e.target.value)}
              placeholder="Amount"
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <button
              onClick={handlePayout}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              Withdraw
            </button>
          </div>
          {payoutError && <div className="mt-2 text-sm text-rose-600">{payoutError}</div>}
          {payoutSuccess && <div className="mt-2 text-sm text-emerald-600">{payoutSuccess}</div>}

          {payoutRequests.length > 0 && (
            <div className="mt-4 border-t border-slate-100 pt-3">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Recent payout requests</div>
              <div className="space-y-2">
                {payoutRequests.slice(0, 5).map((request) => (
                  <div key={request._id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                    <div>
                      <div className="text-sm font-medium text-slate-900">
                        {request.currency} {Number(request.amount || 0).toFixed(2)}
                      </div>
                      <div className="text-xs text-slate-500">{new Date(request.createdAt).toLocaleString()}</div>
                    </div>
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-semibold ${
                        request.status === "approved"
                          ? "bg-emerald-100 text-emerald-700"
                          : request.status === "rejected"
                            ? "bg-rose-100 text-rose-700"
                            : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {request.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-900">
          Recent activity
        </div>
        {ledger.length === 0 ? (
          <div className="p-6 text-center text-sm text-slate-500">No transactions yet.</div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {ledger.map((entry) => (
              <li key={entry._id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <div className="text-sm font-medium text-slate-900">
                    {OP_LABEL[entry.op] || entry.op}
                  </div>
                  <div className="text-xs text-slate-500">
                    {new Date(entry.createdAt).toLocaleString()}
                  </div>
                </div>
                <div
                  className={`text-sm font-semibold ${
                    entry.op === "payout.requested" || entry.op === "commission.taken"
                      ? "text-rose-600"
                      : "text-emerald-600"
                  }`}
                >
                  {entry.currency} {entry.amount.toFixed(2)}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
