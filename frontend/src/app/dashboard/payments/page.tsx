"use client";

import { useEffect, useState, useCallback, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { authService } from "@/modules/auth/services";
import {
  paymentService,
  Transaction,
  TransactionFilters,
  TransactionType,
  TransactionStatus,
} from "@/services/api/payment.service";
import { InvoiceDownloadButton } from "@/components/features/payments/InvoiceDownloadButton";
import type { User } from "@/types";

/* -- Helpers -- */
const fmt = (amount: number, currency = "NPR") => {
  if (currency === "NPR") {
    return `Rs. ${new Intl.NumberFormat("en-NP", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount)}`;
  }
  return new Intl.NumberFormat("en-US", { style: "currency", currency, minimumFractionDigits: 2 }).format(amount);
};
const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
const fmtFullDate = (d: string) =>
  new Date(d).toLocaleString("en-US", {
    month: "long", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit",
  });

/* -- Status / Type Config -- */
const STATUS_CFG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  completed: { label: "Completed", color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200", dot: "bg-emerald-500" },
  pending: { label: "Pending", color: "text-amber-700", bg: "bg-amber-50 border-amber-200", dot: "bg-amber-500" },
  processing: { label: "Processing", color: "text-blue-700", bg: "bg-blue-50 border-blue-200", dot: "bg-blue-500" },
  initiated: { label: "Initiated", color: "text-gray-600", bg: "bg-gray-50 border-gray-200", dot: "bg-gray-400" },
  failed: { label: "Failed", color: "text-red-700", bg: "bg-red-50 border-red-200", dot: "bg-red-500" },
  cancelled: { label: "Cancelled", color: "text-gray-500", bg: "bg-gray-50 border-gray-200", dot: "bg-gray-400" },
  expired: { label: "Expired", color: "text-gray-500", bg: "bg-gray-50 border-gray-200", dot: "bg-gray-400" },
  refunded: { label: "Refunded", color: "text-purple-700", bg: "bg-purple-50 border-purple-200", dot: "bg-purple-500" },
  partially_refunded: { label: "Partial Refund", color: "text-orange-700", bg: "bg-orange-50 border-orange-200", dot: "bg-orange-500" },
};
const TYPE_CFG: Record<string, { label: string; icon: string; color: string }> = {
  payment: { label: "Payment", icon: "💳", color: "text-blue-600" },
  payout: { label: "Payout", icon: "🏦", color: "text-emerald-600" },
  refund: { label: "Refund", icon: "↩️", color: "text-purple-600" },
  platform_fee: { label: "Platform Fee", icon: "📊", color: "text-gray-600" },
  cancellation_fee: { label: "Cancellation", icon: "❌", color: "text-red-600" },
};

/* -- Stat Card -- */
function StatCard({ label, value, icon, gradient }: {
  label: string; value: string; icon: string; gradient: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden bg-white rounded-2xl border border-[#E1E6EF]/60 p-5 hover:shadow-xl hover:shadow-gray-100/60 transition-all duration-300 group"
    >
      <div className={`absolute top-0 right-0 w-24 h-24 rounded-bl-[60px] opacity-[0.07] ${gradient}`} />
      <div className="flex items-start justify-between relative">
        <div>
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">{label}</p>
          <p className="text-2xl font-extrabold text-gray-900 mt-1.5">{value}</p>
        </div>
        <span className="text-2xl group-hover:scale-110 transition-transform">{icon}</span>
      </div>
    </motion.div>
  );
}

/* -- Transaction Row -- */
function TransactionRow({ txn, onSelect, idx }: { txn: Transaction; onSelect: (t: Transaction) => void; idx: number }) {
  const status = STATUS_CFG[txn.status] ?? STATUS_CFG.pending;
  const type = TYPE_CFG[txn.type] ?? TYPE_CFG.payment;
  const bookingNum = typeof txn.bookingId === "object" ? txn.bookingId.bookingNumber : null;

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: idx * 0.025 }}
      whileHover={{ backgroundColor: "rgba(68,97,242,0.02)" }}
      onClick={() => onSelect(txn)}
      className="group flex items-center gap-4 px-5 py-4 border-b border-gray-100/80 cursor-pointer transition-colors last:border-0"
    >
      <div className="w-11 h-11 rounded-xl bg-linear-to-br from-gray-50 to-gray-100 flex items-center justify-center text-lg shrink-0 group-hover:shadow-md transition-shadow">
        {type.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-gray-900 truncate">{type.label}</p>
          {bookingNum && <span className="text-[10px] text-gray-400 font-mono bg-gray-50 px-1.5 py-0.5 rounded">#{bookingNum}</span>}
        </div>
        <p className="text-xs text-gray-500 mt-0.5">{txn.transactionNumber} &middot; {fmtDate(txn.createdAt)}</p>
      </div>
      <div className="text-right shrink-0">
        <p className={`text-sm font-bold ${txn.type === "refund" ? "text-purple-600" : "text-gray-900"}`}>
          {txn.type === "refund" ? "-" : "+"}{fmt(txn.amount, txn.currency)}
        </p>
        <div className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${status.bg} ${status.color}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
          {status.label}
        </div>
      </div>
      <svg className="w-4 h-4 text-gray-300 group-hover:text-primary-500 transition-colors shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </motion.div>
  );
}

/* -- Transaction Detail Modal -- */
function TransactionDetailModal({ txn, onClose }: { txn: Transaction; onClose: () => void }) {
  const status = STATUS_CFG[txn.status] ?? STATUS_CFG.pending;
  const type = TYPE_CFG[txn.type] ?? TYPE_CFG.payment;
  const bookingData = typeof txn.bookingId === "object" ? txn.bookingId : null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 24 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
      >
        {/* Gradient Header */}
        <div className="relative bg-linear-to-r from-primary-500 to-[#7C3AED] p-6 rounded-t-2xl">
          <button onClick={onClose} className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="flex items-center gap-3">
            <span className="text-3xl">{type.icon}</span>
            <div>
              <p className="text-white/70 text-sm font-medium">{type.label}</p>
              <p className="text-white text-2xl font-extrabold tracking-tight">{fmt(txn.amount, txn.currency)}</p>
            </div>
          </div>
          <div className="inline-flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full text-xs font-semibold bg-white/15 text-white backdrop-blur-sm">
            <span className={`w-2 h-2 rounded-full ${status.dot}`} />
            {status.label}
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Transaction Details Grid */}
          <div>
            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Transaction Details</h4>
            <div className="grid grid-cols-2 gap-4">
              <div><p className="text-[11px] text-gray-400">Transaction ID</p><p className="text-sm font-mono font-semibold text-gray-900">{txn.transactionNumber}</p></div>
              <div><p className="text-[11px] text-gray-400">Date</p><p className="text-sm font-semibold text-gray-900">{fmtFullDate(txn.createdAt)}</p></div>
              <div><p className="text-[11px] text-gray-400">Payment Method</p><p className="text-sm font-semibold text-gray-900 capitalize">{txn.paymentMethod?.replace(/_/g, " ") ?? "N/A"}</p></div>
              <div><p className="text-[11px] text-gray-400">Currency</p><p className="text-sm font-semibold text-gray-900">{txn.currency}</p></div>
            </div>
          </div>

          {/* Financial Breakdown */}
          <div>
            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Financial Breakdown</h4>
            <div className="bg-linear-to-br from-gray-50 to-gray-100/50 rounded-xl p-4 space-y-2.5">
              <div className="flex justify-between text-sm"><span className="text-gray-500">Amount</span><span className="font-semibold text-gray-900">{fmt(txn.amount, txn.currency)}</span></div>
              {txn.platformFee > 0 && (
                <div className="flex justify-between text-sm"><span className="text-gray-500">Platform Fee</span><span className="text-gray-600">-{fmt(txn.platformFee, txn.currency)}</span></div>
              )}
              <div className="border-t border-gray-200 pt-2 flex justify-between text-sm"><span className="font-bold text-gray-700">Net Amount</span><span className="font-extrabold text-gray-900">{fmt(txn.netAmount || txn.amount, txn.currency)}</span></div>
            </div>
          </div>

          {/* Running Balance */}
          {txn.runningAmountPaid !== undefined && (
            <div>
              <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Booking Balance</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-emerald-50 rounded-xl p-3 text-center border border-emerald-100"><p className="text-[10px] text-emerald-600 font-semibold uppercase">Total Paid</p><p className="text-lg font-extrabold text-emerald-700">{fmt(txn.runningAmountPaid, txn.currency)}</p></div>
                <div className="bg-amber-50 rounded-xl p-3 text-center border border-amber-100"><p className="text-[10px] text-amber-600 font-semibold uppercase">Outstanding</p><p className="text-lg font-extrabold text-amber-700">{fmt(txn.runningAmountDue ?? 0, txn.currency)}</p></div>
              </div>
            </div>
          )}

          {/* Booking Info */}
          {bookingData && (
            <div className="bg-[#F0F5FF] rounded-xl p-4 border border-primary-500/10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-gray-900">Booking #{bookingData.bookingNumber}</p>
                  <p className="text-xs text-gray-500 mt-0.5 capitalize">{bookingData.serviceType?.replace(/_/g, " ")}</p>
                </div>
                <Link href={`/dashboard/bookings/${bookingData._id}`} className="text-xs font-semibold text-primary-500 hover:underline">
                  View Booking ?
                </Link>
              </div>
            </div>
          )}

          {txn.description && (
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Description</p>
              <p className="text-sm text-gray-700">{txn.description}</p>
            </div>
          )}

          {txn.failureReason && (
            <div className="bg-red-50 rounded-xl p-4 border border-red-100">
              <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest mb-1">Failure Reason</p>
              <p className="text-sm text-red-700">{txn.failureReason}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            {txn.receiptUrl && (
              <a href={txn.receiptUrl} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-primary-500 bg-[#F0F5FF] rounded-xl hover:bg-[#E4EBFF] transition-colors border border-primary-500/10">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                Receipt
              </a>
            )}
            {txn.status === "completed" && (
              <div className="flex-1"><InvoiceDownloadButton transactionId={txn._id} variant="button" className="w-full" /></div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* -- Main Content -- */
function PaymentsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const successParam = searchParams.get("success");

  const [user, setUser] = useState<User | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 15, pages: 0 });
  const [filters, setFilters] = useState<TransactionFilters>({ page: 1, limit: 15, sortBy: "createdAt", sortOrder: "desc" });
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });

  const stats = useMemo(() => {
    const completed = transactions.filter((t) => t.status === "completed");
    const totalPaid = completed.filter((t) => t.type === "payment").reduce((s, t) => s + t.amount, 0);
    const totalRefunds = completed.filter((t) => t.type === "refund").reduce((s, t) => s + t.amount, 0);
    return {
      total: pagination.total,
      totalPaid,
      totalRefunds,
      pending: transactions.filter((t) => ["pending", "processing", "initiated"].includes(t.status)).length,
    };
  }, [transactions, pagination.total]);

  const fetchTransactions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const q: TransactionFilters = { ...filters };
      if (searchQuery) (q as Record<string, unknown>).search = searchQuery;
      if (dateRange.start) q.startDate = dateRange.start;
      if (dateRange.end) q.endDate = dateRange.end;
      const res = await paymentService.getMyTransactions(q);
      if (res.success && res.data) {
        setTransactions(res.data.transactions);
        setPagination(res.data.pagination);
      }
    } catch {
      setError("Failed to load transactions. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [filters, searchQuery, dateRange]);

  useEffect(() => {
    const u = authService.getCurrentUser();
    if (!u) { router.push("/login"); return; }
    setUser(u);
  }, [router]);

  useEffect(() => { if (user) fetchTransactions(); }, [user, fetchTransactions]);

  const handleExportCSV = async () => {
    setIsExporting(true);
    try { await paymentService.exportTransactionsCSV(filters); } catch { setError("CSV export failed."); } finally { setIsExporting(false); }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-[#F0F5FF] via-white to-[#F8F5FF]">
      {/* -- Header -- */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-[#E1E6EF]/50 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-linear-to-br from-primary-500 to-[#7C3AED] flex items-center justify-center shadow-lg shadow-[#4461F2]/20">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
              </div>
              <div>
                <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Transaction History</h1>
                <p className="text-sm text-gray-500">Track all your payments, refunds &amp; payouts</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={handleExportCSV} disabled={isExporting}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-[#E1E6EF] rounded-xl hover:bg-gray-50 transition-all disabled:opacity-50 shadow-sm">
                {isExporting
                  ? <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                  : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
                Export CSV
              </motion.button>
              {user?.role === "caregiver" && (
                <Link href="/dashboard/earnings" className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-white bg-linear-to-r from-primary-500 to-[#7C3AED] rounded-xl hover:shadow-lg hover:shadow-[#4461F2]/25 transition-all">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  Earnings
                </Link>
              )}
              <Link href="/dashboard" className="px-4 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-[#E1E6EF] rounded-xl hover:bg-gray-50 transition-colors shadow-sm">
                Dashboard
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* -- Success Banner -- */}
      <AnimatePresence>
        {successParam === "true" && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3 text-emerald-700">
              <span className="text-xl">?</span>
              <p className="text-sm font-semibold">Payment completed successfully!</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* -- Stats -- */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Transactions" value={String(stats.total)} icon="📊" gradient="bg-linear-to-br from-blue-400 to-indigo-500" />
          <StatCard label="Total Paid" value={fmt(stats.totalPaid)} icon="💰" gradient="bg-linear-to-br from-emerald-400 to-teal-500" />
          <StatCard label="Total Refunded" value={fmt(stats.totalRefunds)} icon="↩️" gradient="bg-linear-to-br from-purple-400 to-violet-500" />
          <StatCard label="Pending" value={String(stats.pending)} icon="⏳" gradient="bg-linear-to-br from-amber-400 to-orange-500" />
        </div>

        {/* -- Filters Bar -- */}
        <div className="bg-white rounded-2xl border border-[#E1E6EF]/60 p-4 shadow-sm">
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="relative flex-1">
              <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input type="text" placeholder="Search by transaction ID or booking..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-[#E1E6EF] rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-[#4461F2]/40 focus:border-primary-500 outline-none transition-shadow" />
            </div>
            <select value={filters.type || ""} onChange={(e) => setFilters((p) => ({ ...p, type: (e.target.value as TransactionType) || undefined, page: 1 }))}
              className="px-4 py-2.5 border border-[#E1E6EF] rounded-xl text-sm text-gray-700 bg-white focus:ring-2 focus:ring-[#4461F2]/40 outline-none cursor-pointer">
              <option value="">All Types</option>
              <option value="payment">Payments</option>
              <option value="refund">Refunds</option>
              <option value="payout">Payouts</option>
              <option value="platform_fee">Fees</option>
            </select>
            <select value={filters.status || ""} onChange={(e) => setFilters((p) => ({ ...p, status: (e.target.value as TransactionStatus) || undefined, page: 1 }))}
              className="px-4 py-2.5 border border-[#E1E6EF] rounded-xl text-sm text-gray-700 bg-white focus:ring-2 focus:ring-[#4461F2]/40 outline-none cursor-pointer">
              <option value="">All Status</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="failed">Failed</option>
              <option value="refunded">Refunded</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <div className="flex gap-2">
              <input type="date" value={dateRange.start} onChange={(e) => setDateRange((p) => ({ ...p, start: e.target.value }))}
                className="px-3 py-2.5 border border-[#E1E6EF] rounded-xl text-sm text-gray-700 focus:ring-2 focus:ring-[#4461F2]/40 outline-none" />
              <input type="date" value={dateRange.end} onChange={(e) => setDateRange((p) => ({ ...p, end: e.target.value }))}
                className="px-3 py-2.5 border border-[#E1E6EF] rounded-xl text-sm text-gray-700 focus:ring-2 focus:ring-[#4461F2]/40 outline-none" />
            </div>
          </div>
        </div>

        {/* -- Error -- */}
        {error && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3 text-red-700">
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <p className="text-sm font-medium flex-1">{error}</p>
            <button onClick={fetchTransactions} className="text-xs font-semibold text-red-600 hover:underline shrink-0">Retry</button>
          </motion.div>
        )}

        {/* -- Transactions List -- */}
        <div className="bg-white rounded-2xl border border-[#E1E6EF]/60 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-8 space-y-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 animate-pulse">
                  <div className="w-11 h-11 rounded-xl bg-gray-100" />
                  <div className="flex-1 space-y-2"><div className="h-4 w-1/3 bg-gray-100 rounded" /><div className="h-3 w-1/4 bg-gray-50 rounded" /></div>
                  <div className="h-4 w-20 bg-gray-100 rounded" />
                </div>
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-linear-to-br from-gray-100 to-gray-50 rounded-2xl flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900">No transactions found</h3>
              <p className="text-sm text-gray-500 mt-1">Transactions will appear here after your first payment.</p>
            </div>
          ) : (
            transactions.map((txn, i) => (
              <TransactionRow key={txn._id} txn={txn} onSelect={setSelectedTransaction} idx={i} />
            ))
          )}
        </div>

        {/* -- Pagination -- */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between bg-white rounded-2xl border border-[#E1E6EF]/60 p-4 shadow-sm">
            <p className="text-sm text-gray-500">
              Showing <span className="font-semibold text-gray-700">{(pagination.page - 1) * pagination.limit + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)}</span> of {pagination.total}
            </p>
            <div className="flex items-center gap-1.5">
              <button onClick={() => setFilters((p) => ({ ...p, page: (p.page ?? 1) - 1 }))} disabled={pagination.page <= 1}
                className="px-3 py-2 text-sm font-semibold text-gray-700 bg-white border border-[#E1E6EF] rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-colors">
                ? Prev
              </button>
              {Array.from({ length: Math.min(pagination.pages, 5) }, (_, i) => {
                const p = i + 1;
                return (
                  <button key={p} onClick={() => setFilters((prev) => ({ ...prev, page: p }))}
                    className={`w-9 h-9 text-sm font-semibold rounded-lg transition-all ${pagination.page === p ? "bg-primary-500 text-white shadow-md shadow-[#4461F2]/30" : "text-gray-700 hover:bg-gray-100"}`}>
                    {p}
                  </button>
                );
              })}
              <button onClick={() => setFilters((p) => ({ ...p, page: (p.page ?? 1) + 1 }))} disabled={pagination.page >= pagination.pages}
                className="px-3 py-2 text-sm font-semibold text-gray-700 bg-white border border-[#E1E6EF] rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-colors">
                Next ?
              </button>
            </div>
          </div>
        )}
      </main>

      {/* -- Detail Modal -- */}
      <AnimatePresence>
        {selectedTransaction && <TransactionDetailModal txn={selectedTransaction} onClose={() => setSelectedTransaction(null)} />}
      </AnimatePresence>
    </div>
  );
}

/* -- Page Export with Suspense -- */
export default function PaymentsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-[#F0F5FF] via-white to-[#F8F5FF]">
        <div className="relative w-14 h-14"><div className="absolute inset-0 rounded-full border-4 border-gray-200" /><div className="absolute inset-0 rounded-full border-4 border-primary-500 border-t-transparent animate-spin" /></div>
      </div>
    }>
      <PaymentsContent />
    </Suspense>
  );
}

