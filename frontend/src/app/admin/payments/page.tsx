"use client";

import { useEffect, useState, useCallback } from "react";
import { AdminLayout } from "@/components";
import {
  paymentService,
  Transaction,
  TransactionStats,
  TransactionFilters,
  AdminPayoutRequest,
} from "@/services/api/payment.service";
import { useSocketEvent } from "@/hooks/useSocket";

// Status config
const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bgColor: string }
> = {
  pending: { label: "Pending", color: "#D97706", bgColor: "#FEF3C7" },
  processing: { label: "Processing", color: "#3B82F6", bgColor: "#DBEAFE" },
  completed: { label: "Completed", color: "#059669", bgColor: "#D1FAE5" },
  failed: { label: "Failed", color: "#DC2626", bgColor: "#FEE2E2" },
  refunded: { label: "Refunded", color: "#7C3AED", bgColor: "#EDE9FE" },
  partially_refunded: {
    label: "Partial Refund",
    color: "#8B5CF6",
    bgColor: "#EDE9FE",
  },
  released: { label: "Released", color: "#10B981", bgColor: "#D1FAE5" },
  held: { label: "Held", color: "#F59E0B", bgColor: "#FEF3C7" },
  cancelled: { label: "Cancelled", color: "#6B7280", bgColor: "#F3F4F6" },
};

const TYPE_CONFIG: Record<string, { label: string; icon: string }> = {
  payment: { label: "Payment", icon: "💳" },
  payout: { label: "Payout", icon: "🏦" },
  refund: { label: "Refund", icon: "↩️" },
  platform_fee: { label: "Platform Fee", icon: "📊" },
};

export default function AdminPaymentsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<TransactionStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [payoutRequests, setPayoutRequests] = useState<AdminPayoutRequest[]>([]);
  const [payoutStatusFilter, setPayoutStatusFilter] = useState<"pending" | "approved" | "rejected" | "">("pending");

  // Filters & pagination
  const [filters, setFilters] = useState<TransactionFilters>({
    page: 1,
    limit: 15,
  });
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");

  // Refund modal
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundTarget, setRefundTarget] = useState<Transaction | null>(null);
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [txRes, statsRes] = await Promise.all([
        paymentService.getAllTransactions(filters),
        paymentService.getTransactionStats(),
      ]);

      const payoutParams = payoutStatusFilter
        ? { status: payoutStatusFilter, limit: 25 }
        : { limit: 25 };

      const payoutRes = await paymentService.getAdminPayoutRequests(payoutParams);

      if (txRes.success && txRes.data) {
        setTransactions(txRes.data.transactions);
        setTotalPages(txRes.data.pagination?.pages || 1);
        setTotalCount(txRes.data.pagination?.total || 0);
      }
      if (statsRes.success && statsRes.data) {
        setStats(statsRes.data.stats);
      }
      if (payoutRes.success && payoutRes.data) {
        setPayoutRequests(payoutRes.data.requests || []);
      }
    } catch {
      setError("Failed to load payment data.");
    } finally {
      setIsLoading(false);
    }
  }, [filters, payoutStatusFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!successMessage) return;
    const t = setTimeout(() => setSuccessMessage(null), 4000);
    return () => clearTimeout(t);
  }, [successMessage]);

  useSocketEvent("admin:payout_request_created", () => {
    fetchData();
  });
  useSocketEvent("admin:payout_request_updated", () => {
    fetchData();
  });

  const handleRelease = async (bookingId: string) => {
    setActionLoading(bookingId);
    try {
      const res = await paymentService.releasePayment(bookingId);
      if (res.success) {
        setSuccessMessage("Payment released successfully.");
        setSelectedTransaction(null);
        fetchData();
      } else {
        setError(res.message || "Failed to release payment.");
      }
    } catch {
      setError("Failed to release payment.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRefundSubmit = async () => {
    if (!refundTarget) return;
    const bookingId =
      typeof refundTarget.bookingId === "string"
        ? refundTarget.bookingId
        : (refundTarget.bookingId as { _id: string })?._id;
    if (!bookingId) return;

    const normalizedReason = refundReason.trim();
    if (!normalizedReason) {
      setError("Refund reason is required.");
      return;
    }

    const parsedAmount = refundAmount.trim() ? Number.parseFloat(refundAmount) : undefined;
    if (
      parsedAmount !== undefined &&
      (!Number.isFinite(parsedAmount) || parsedAmount <= 0)
    ) {
      setError("Refund amount must be a valid positive number.");
      return;
    }

    setActionLoading(bookingId);
    try {
      const refundPayload = {
        ...(parsedAmount !== undefined ? { amount: parsedAmount } : {}),
        reason: normalizedReason,
      };
      const res = await paymentService.processRefund(bookingId, refundPayload);
      if (res.success) {
        setSuccessMessage("Refund processed successfully.");
        setShowRefundModal(false);
        setRefundTarget(null);
        setRefundAmount("");
        setRefundReason("");
        setSelectedTransaction(null);
        fetchData();
      } else {
        setError(res.message || "Failed to process refund.");
      }
    } catch (err: unknown) {
      const message =
        err &&
        typeof err === "object" &&
        "message" in err &&
        typeof (err as { message?: unknown }).message === "string"
          ? (err as { message: string }).message
          : "Failed to process refund.";
      setError(message);
    } finally {
      setActionLoading(null);
    }
  };

  const formatCurrency = (amount: number, currency = "NPR") => {
    if (currency === "NPR") {
      return `Rs. ${new Intl.NumberFormat("en-NP", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount)}`;
    }
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const getPayoutCaregiverName = (request: AdminPayoutRequest) => {
    const caregiver = request.caregiverId;
    if (typeof caregiver === "string") return caregiver;
    return caregiver.fullName || caregiver.email || caregiver._id || "Unknown caregiver";
  };

  const handleApprovePayoutRequest = async (requestId: string) => {
    setActionLoading(requestId);
    try {
      const res = await paymentService.approvePayoutRequest(requestId);
      if (res.success) {
        setSuccessMessage("Payout request approved.");
        fetchData();
      } else {
        setError(res.message || "Failed to approve payout request.");
      }
    } catch {
      setError("Failed to approve payout request.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectPayoutRequest = async (requestId: string) => {
    const reason = window.prompt("Rejection reason (required):", "")?.trim() || "";
    if (!reason) {
      setError("Rejection reason is required.");
      return;
    }

    setActionLoading(requestId);
    try {
      const res = await paymentService.rejectPayoutRequest(requestId, reason);
      if (res.success) {
        setSuccessMessage("Payout request rejected.");
        fetchData();
      } else {
        setError(res.message || "Failed to reject payout request.");
      }
    } catch {
      setError("Failed to reject payout request.");
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const config = STATUS_CONFIG[status] || {
      label: status,
      color: "#6B7280",
      bgColor: "#F3F4F6",
    };
    return (
      <span
        className="px-2.5 py-0.5 rounded-full text-xs font-medium"
        style={{ color: config.color, backgroundColor: config.bgColor }}
      >
        {config.label}
      </span>
    );
  };

  const getUserName = (
    user: string | { _id?: string; fullName?: string; email?: string }
  ) => {
    if (typeof user === "string") return user;
    return user.fullName || user.email || user._id || "Unknown";
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Payment Management
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Manage transactions, releases, and refunds
            </p>
          </div>
          <button
            onClick={() => fetchData()}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-white bg-primary-500 rounded-lg hover:bg-[#2F4BDB] disabled:opacity-50 flex items-center gap-2"
          >
            <svg
              className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Refresh
          </button>
        </div>

        {/* Messages */}
        {successMessage && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm">
            {successMessage}
          </div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex justify-between items-center">
            {error}
            <button
              onClick={() => setError(null)}
              className="text-red-500 hover:text-red-700"
            >
              ✕
            </button>
          </div>
        )}

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              label="Total Volume"
              value={formatCurrency(stats.totalVolume || 0)}
              icon="💰"
            />
            <StatCard
              label="Total Transactions"
              value={String(stats.totalTransactions || 0)}
              icon="📊"
            />
            <StatCard
              label="Platform Revenue"
              value={formatCurrency(stats.totalPlatformFees || 0)}
              icon="🏢"
              accent
            />
            <StatCard
              label="Pending Payouts"
              value={formatCurrency(stats.pendingPayouts || 0)}
              icon="⏳"
            />
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-xl border border-[#E1E6EF] p-4 flex flex-wrap gap-3 items-center">
          <input
            type="text"
            placeholder="Search transaction #..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setFilters((f) => {
                  const { search: _search, ...rest } = f;
                  return searchQuery
                    ? { ...rest, page: 1, search: searchQuery }
                    : { ...rest, page: 1 };
                });
              }
            }}
            className="flex-1 min-w-50 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#4461F2] focus:border-transparent"
          />
          <select
            value={filters.type || ""}
            onChange={(e) => {
              const value = e.target.value as TransactionFilters["type"] | "";
              setFilters((f) => {
                const { type: _type, ...rest } = f;
                return value ? { ...rest, page: 1, type: value } : { ...rest, page: 1 };
              });
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="">All Types</option>
            <option value="payment">Payment</option>
            <option value="payout">Payout</option>
            <option value="refund">Refund</option>
            <option value="platform_fee">Platform Fee</option>
          </select>
          <select
            value={filters.status || ""}
            onChange={(e) => {
              const value = e.target.value as TransactionFilters["status"] | "";
              setFilters((f) => {
                const { status: _status, ...rest } = f;
                return value ? { ...rest, page: 1, status: value } : { ...rest, page: 1 };
              });
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
            <option value="refunded">Refunded</option>
            <option value="released">Released</option>
            <option value="held">Held</option>
          </select>
          <span className="text-xs text-gray-500">{totalCount} results</span>
        </div>

        {/* Payout Requests */}
        <div className="bg-white rounded-xl border border-[#E1E6EF] overflow-hidden">
          <div className="flex items-center justify-between border-b border-[#E1E6EF] px-4 py-3">
            <h2 className="text-sm font-semibold text-gray-900">Caregiver Withdrawal Requests</h2>
            <select
              value={payoutStatusFilter}
              onChange={(e) => setPayoutStatusFilter(e.target.value as "pending" | "approved" | "rejected" | "")}
              className="rounded-lg border border-gray-300 px-2 py-1 text-xs"
            >
              <option value="">All</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          {payoutRequests.length === 0 ? (
            <div className="px-4 py-6 text-sm text-gray-500">No payout requests.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-[#E1E6EF]">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Caregiver</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600">Amount</th>
                    <th className="px-4 py-3 text-center font-medium text-gray-600">Status</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Requested At</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {payoutRequests.map((request) => (
                    <tr key={request._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-700">{getPayoutCaregiverName(request)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900">
                        {formatCurrency(request.amount, request.currency)}
                      </td>
                      <td className="px-4 py-3 text-center">{getStatusBadge(request.status)}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{formatDate(request.createdAt)}</td>
                      <td className="px-4 py-3 text-right">
                        {request.status === "pending" ? (
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleApprovePayoutRequest(request._id)}
                              disabled={actionLoading === request._id}
                              className="rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleRejectPayoutRequest(request._id)}
                              disabled={actionLoading === request._id}
                              className="rounded-md bg-rose-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-rose-700 disabled:opacity-50"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Transactions Table */}
        <div className="bg-white rounded-xl border border-[#E1E6EF] overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-10 h-10 border-4 border-gray-200 border-t-[#4461F2] rounded-full animate-spin" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-gray-500">No transactions found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-[#E1E6EF]">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">
                      Transaction
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">
                      Type
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">
                      Payer
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">
                      Payee
                    </th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">
                      Amount
                    </th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">
                      Fee
                    </th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">
                      Status
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">
                      Date
                    </th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {transactions.map((tx) => (
                    <tr
                      key={tx._id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => setSelectedTransaction(tx)}
                    >
                      <td className="px-4 py-3 font-mono text-xs text-gray-700">
                        {tx.transactionNumber || tx._id.slice(-8)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1.5">
                          <span>
                            {TYPE_CONFIG[tx.type]?.icon || "📄"}
                          </span>
                          <span className="text-gray-700">
                            {TYPE_CONFIG[tx.type]?.label || tx.type}
                          </span>
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 truncate max-w-35">
                        {tx.payerId ? getUserName(tx.payerId) : "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-600 truncate max-w-35">
                        {tx.payeeId ? getUserName(tx.payeeId) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900">
                        {formatCurrency(tx.amount, tx.currency)}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-500">
                        {tx.platformFee
                          ? formatCurrency(tx.platformFee, tx.currency)
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {getStatusBadge(tx.status)}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                        {formatDate(tx.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTransaction(tx);
                          }}
                          className="text-primary-500 hover:underline text-xs font-medium"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-[#E1E6EF]">
              <p className="text-xs text-gray-500">
                Page {filters.page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    setFilters((f) => ({
                      ...f,
                      page: Math.max(1, (f.page || 1) - 1),
                    }))
                  }
                  disabled={(filters.page || 1) <= 1}
                  className="px-3 py-1.5 text-xs font-medium border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50"
                >
                  Previous
                </button>
                <button
                  onClick={() =>
                    setFilters((f) => ({
                      ...f,
                      page: Math.min(totalPages, (f.page || 1) + 1),
                    }))
                  }
                  disabled={(filters.page || 1) >= totalPages}
                  className="px-3 py-1.5 text-xs font-medium border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Transaction Detail Modal */}
        {selectedTransaction && (
          <div
            className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
            onClick={() => setSelectedTransaction(null)}
          >
            <div
              className="bg-white rounded-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900">
                  Transaction Details
                </h2>
                <button
                  onClick={() => setSelectedTransaction(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <DetailRow
                  label="Transaction #"
                  value={
                    selectedTransaction.transactionNumber ||
                    selectedTransaction._id
                  }
                />
                <DetailRow
                  label="Type"
                  value={
                    TYPE_CONFIG[selectedTransaction.type]?.label ||
                    selectedTransaction.type
                  }
                />
                <DetailRow
                  label="Status"
                  value={getStatusBadge(selectedTransaction.status)}
                />
                <DetailRow
                  label="Amount"
                  value={formatCurrency(
                    selectedTransaction.amount,
                    selectedTransaction.currency
                  )}
                />
                {selectedTransaction.platformFee != null && (
                  <DetailRow
                    label="Platform Fee"
                    value={formatCurrency(
                      selectedTransaction.platformFee,
                      selectedTransaction.currency
                    )}
                  />
                )}
                {selectedTransaction.netAmount != null && (
                  <DetailRow
                    label="Net Amount"
                    value={formatCurrency(
                      selectedTransaction.netAmount,
                      selectedTransaction.currency
                    )}
                  />
                )}
                <DetailRow
                  label="Payer"
                  value={
                    selectedTransaction.payerId
                      ? getUserName(selectedTransaction.payerId)
                      : "—"
                  }
                />
                <DetailRow
                  label="Payee"
                  value={
                    selectedTransaction.payeeId
                      ? getUserName(selectedTransaction.payeeId)
                      : "—"
                  }
                />
                <DetailRow
                  label="Date"
                  value={formatDate(selectedTransaction.createdAt)}
                />
                {selectedTransaction.stripePaymentIntentId && (
                  <DetailRow
                    label="Stripe PI"
                    value={
                      <span className="font-mono text-xs">
                        {selectedTransaction.stripePaymentIntentId}
                      </span>
                    }
                  />
                )}
                {selectedTransaction.receiptUrl && (
                  <DetailRow
                    label="Receipt"
                    value={
                      <a
                        href={selectedTransaction.receiptUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-500 hover:underline text-sm"
                      >
                        View Receipt ↗
                      </a>
                    }
                  />
                )}
                {selectedTransaction.description && (
                  <DetailRow
                    label="Description"
                    value={selectedTransaction.description}
                  />
                )}
              </div>

              {/* Actions */}
              <div className="mt-6 flex gap-3">
                {(selectedTransaction.status as string) === "held" &&
                  selectedTransaction.type === "payment" && (
                    <button
                      onClick={() => {
                        const bId =
                          typeof selectedTransaction.bookingId === "string"
                            ? selectedTransaction.bookingId
                            : (selectedTransaction.bookingId as { _id: string })?._id;
                        if (bId) handleRelease(bId);
                      }}
                      disabled={!!actionLoading}
                      className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                      {actionLoading ? "Processing..." : "Release Payment"}
                    </button>
                  )}
                {((selectedTransaction.status as string) === "completed" ||
                  (selectedTransaction.status as string) === "released") &&
                  selectedTransaction.type === "payment" && (
                    <button
                      onClick={() => {
                        setRefundTarget(selectedTransaction);
                        setRefundAmount(
                          String(selectedTransaction.amount)
                        );
                        setShowRefundModal(true);
                      }}
                      className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
                    >
                      Process Refund
                    </button>
                  )}
                <button
                  onClick={() => setSelectedTransaction(null)}
                  className="px-4 py-2.5 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Refund Modal */}
        {showRefundModal && refundTarget && (
          <div
            className="fixed inset-0 z-60 bg-black/50 flex items-center justify-center p-4"
            onClick={() => setShowRefundModal(false)}
          >
            <div
              className="bg-white rounded-2xl max-w-md w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-lg font-bold text-gray-900 mb-4">
                Process Refund
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                Transaction:{" "}
                <span className="font-mono">
                  {refundTarget.transactionNumber}
                </span>
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Refund Amount
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    max={refundTarget.amount}
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    placeholder={`Max: ${refundTarget.amount}`}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Original amount:{" "}
                    {formatCurrency(refundTarget.amount, refundTarget.currency)}
                    . Leave blank for full refund.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reason <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={refundReason}
                    onChange={(e) => setRefundReason(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none"
                    placeholder="Reason for refund..."
                    required
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowRefundModal(false);
                    setRefundTarget(null);
                  }}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRefundSubmit}
                  disabled={!!actionLoading || !refundReason.trim()}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {actionLoading ? "Processing..." : "Confirm Refund"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

// Helper components
function StatCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: string;
  icon: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        accent
          ? "bg-linear-to-br from-primary-500 to-secondary-500 text-white border-transparent"
          : "bg-white border-[#E1E6EF]"
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span
          className={`text-xs font-medium ${
            accent ? "text-white/80" : "text-gray-500"
          }`}
        >
          {label}
        </span>
        <span className="text-lg">{icon}</span>
      </div>
      <p
        className={`text-xl font-bold ${
          accent ? "text-white" : "text-gray-900"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-gray-100">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-900">{value}</span>
    </div>
  );
}
