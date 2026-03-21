"use client";

import { motion } from "framer-motion";
import type { Transaction } from "@/services/api/payment.service";
import type { User } from "@/types";

interface TransactionCardProps {
  transaction: Transaction;
  currentUserId?: string;
  onClick?: (transaction: Transaction) => void;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: string }> = {
  pending: { label: "Pending", color: "text-amber-700", bgColor: "bg-amber-100", icon: "⏳" },
  processing: { label: "Processing", color: "text-blue-700", bgColor: "bg-blue-100", icon: "⟳" },
  completed: { label: "Completed", color: "text-emerald-700", bgColor: "bg-emerald-100", icon: "✓" },
  failed: { label: "Failed", color: "text-red-700", bgColor: "bg-red-100", icon: "✗" },
  cancelled: { label: "Cancelled", color: "text-gray-700", bgColor: "bg-gray-200", icon: "⊘" },
  refunded: { label: "Refunded", color: "text-purple-700", bgColor: "bg-purple-100", icon: "↩" },
  partially_refunded: { label: "Partial Refund", color: "text-orange-700", bgColor: "bg-orange-100", icon: "↩" },
};

const TYPE_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  payment: { label: "Payment", icon: "💳", color: "text-blue-600" },
  payout: { label: "Payout", icon: "🏦", color: "text-emerald-600" },
  refund: { label: "Refund", icon: "↩️", color: "text-purple-600" },
  platform_fee: { label: "Platform Fee", icon: "🏢", color: "text-gray-600" },
};

function getUserName(value: string | User): string {
  if (typeof value === "string") return "User";
  return value.fullName || "User";
}

function formatCurrency(amount: number, currency: string = "NPR"): string {
  if (currency === "NPR") {
    return `Rs. ${new Intl.NumberFormat("en-NP", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)}`;
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(dateString: string): string {
  return new Date(dateString).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function TransactionCard({ transaction, currentUserId, onClick }: TransactionCardProps) {
  const status = STATUS_CONFIG[transaction.status] || STATUS_CONFIG.pending;
  const type = TYPE_CONFIG[transaction.type] || TYPE_CONFIG.payment;

  const isPayer =
    typeof transaction.payerId === "string"
      ? transaction.payerId === currentUserId
      : (transaction.payerId?._id === currentUserId || transaction.payerId?.id === currentUserId);

  const isIncoming = !isPayer;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={() => onClick?.(transaction)}
      className="bg-white rounded-xl border border-[#E1E6EF] p-4 hover:shadow-md hover:border-primary-500/30 transition-all cursor-pointer"
    >
      <div className="flex items-center justify-between">
        {/* Left: Icon + Info */}
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${
            isIncoming ? "bg-emerald-100" : "bg-blue-100"
          }`}>
            {type.icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-900 text-sm">
                {type.label}
              </span>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${status.bgColor} ${status.color}`}>
                {status.icon} {status.label}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              {transaction.transactionNumber} • {formatDate(transaction.createdAt)} at {formatTime(transaction.createdAt)}
            </p>
            <p className="text-xs text-gray-500">
              {isPayer ? `To: ${getUserName(transaction.payeeId)}` : `From: ${getUserName(transaction.payerId)}`}
            </p>
          </div>
        </div>

        {/* Right: Amount */}
        <div className="text-right">
          <p className={`text-lg font-bold ${isIncoming ? "text-emerald-600" : "text-gray-900"}`}>
            {isIncoming ? "+" : "-"}{formatCurrency(transaction.amount, transaction.currency)}
          </p>
          {transaction.platformFee > 0 && (
            <p className="text-xs text-gray-500">
              Fee: {formatCurrency(transaction.platformFee, transaction.currency)}
            </p>
          )}
          {transaction.netAmount !== transaction.amount && (
            <p className="text-xs text-emerald-600 font-medium">
              Net: {formatCurrency(transaction.netAmount, transaction.currency)}
            </p>
          )}
        </div>
      </div>

      {/* Description */}
      {transaction.description && (
        <p className="mt-2 text-xs text-gray-600 border-t border-gray-100 pt-2">
          {transaction.description}
        </p>
      )}
    </motion.div>
  );
}

export default TransactionCard;
