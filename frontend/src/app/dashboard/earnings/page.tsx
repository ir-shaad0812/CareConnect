"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  ComposedChart,
  Line,
} from "recharts";
import { authService } from "@/modules/auth/services";
import {
  paymentService,
  EarningsDashboard as EarningsDashboardData,
} from "@/services/api/payment.service";

function formatCurrency(amount: number, currency: string = "NPR"): string {
  // For NPR, use custom formatting since Intl may not have NPR symbol
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

const STATUS_COLORS: Record<string, string> = {
  completed: "text-emerald-600 bg-emerald-100",
  pending: "text-amber-600 bg-amber-100",
  processing: "text-blue-600 bg-blue-100",
  failed: "text-red-600 bg-red-100",
};

export default function EarningsDashboardPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<EarningsDashboardData | null>(null);

  useEffect(() => {
    const storedUser = authService.getCurrentUser();
    if (!storedUser) {
      router.push("/login");
      return;
    }
    if (storedUser.role !== "caregiver") {
      router.push("/dashboard");
      return;
    }
    fetchDashboard();
  }, [router]);

  const fetchDashboard = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await paymentService.getEarningsDashboard();
      if (response.success && response.data) {
        setDashboard(response.data.dashboard);
      }
    } catch (err) {
      console.error("Failed to fetch earnings:", err);
      setError("Failed to load earnings data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-[#F0F5FF] to-[#F8F5FF]">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full border-4 border-gray-200" />
            <div className="absolute inset-0 rounded-full border-4 border-primary-500 border-t-transparent animate-spin" />
          </div>
          <p className="text-gray-600 font-medium">Loading earnings...</p>
        </div>
      </div>
    );
  }

  const overview = dashboard?.overview;
  const monthlyData = dashboard?.monthlyBreakdown || [];
  const recentPayouts = dashboard?.recentPayouts || [];

  return (
    <div className="min-h-screen bg-linear-to-br from-[#F0F5FF] to-[#F8F5FF]">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-[#E1E6EF] sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Earnings Dashboard</h1>
              <p className="mt-0.5 text-sm text-gray-500">Track your income and payouts</p>
            </div>
            <div className="flex gap-3">
              <Link
                href="/dashboard"
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-[#E1E6EF] rounded-lg hover:bg-[#F0F5FF] transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Dashboard
              </Link>
              <Link
                href="/dashboard/payments"
                className="px-4 py-2 text-sm font-medium text-white bg-primary-500 rounded-lg hover:bg-[#2F4BDB] transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                All Transactions
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        )}

        {/* Earnings Overview Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0 }}
            className="bg-white rounded-xl p-5 shadow-sm border border-[#E1E6EF] col-span-2 md:col-span-1"
          >
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total Earnings</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(overview?.totalEarnings || 0)}</p>
            <div className="mt-2 flex items-center gap-1 text-emerald-600 text-xs font-medium">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
              </svg>
              Lifetime
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="bg-amber-50 rounded-xl p-5 shadow-sm border border-amber-200">
            <p className="text-xs text-amber-600 uppercase tracking-wide mb-1">Pending</p>
            <p className="text-2xl font-bold text-amber-700">{formatCurrency(overview?.pendingEarnings || 0)}</p>
            <p className="text-xs text-amber-600 mt-2">Awaiting release</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-emerald-50 rounded-xl p-5 shadow-sm border border-emerald-200">
            <p className="text-xs text-emerald-600 uppercase tracking-wide mb-1">Withdrawn</p>
            <p className="text-2xl font-bold text-emerald-700">{formatCurrency(overview?.withdrawnEarnings || 0)}</p>
            <p className="text-xs text-emerald-600 mt-2">Paid out</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="bg-[#F0F5FF] rounded-xl p-5 shadow-sm border border-primary-500/20">
            <p className="text-xs text-primary-500 uppercase tracking-wide mb-1">This Week</p>
            <p className="text-2xl font-bold text-primary-500">{formatCurrency(overview?.weeklyEarnings || 0)}</p>
            <p className="text-xs text-primary-500 mt-2">7-day earnings</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-[#F8F5FF] rounded-xl p-5 shadow-sm border border-secondary-500/20">
            <p className="text-xs text-secondary-500 uppercase tracking-wide mb-1">This Month</p>
            <p className="text-2xl font-bold text-secondary-500">{formatCurrency(overview?.monthlyEarnings || 0)}</p>
            <p className="text-xs text-secondary-500 mt-2">30-day earnings</p>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Monthly Earnings Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-[#E1E6EF] p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Monthly Earnings</h3>
                <p className="text-sm text-gray-500 mt-0.5">Track your income over time</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm bg-linear-to-r from-primary-500 to-secondary-500" />
                  <span className="text-xs text-gray-600">Earnings</span>
                </div>
                <div className="flex items-center gap-1.5 ml-3">
                  <div className="w-3 h-3 rounded-sm bg-emerald-500" />
                  <span className="text-xs text-gray-600">Bookings</span>
                </div>
              </div>
            </div>
            {monthlyData.length === 0 ? (
              <div className="flex items-center justify-center py-20">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 bg-[#F0F5FF] rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <p className="text-gray-500 font-medium">No earnings data yet</p>
                  <p className="text-sm text-gray-400 mt-1">Complete bookings to see your earnings</p>
                </div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={350}>
                <ComposedChart
                  data={monthlyData}
                  margin={{ top: 10, right: 20, bottom: 10, left: 0 }}
                >
                  <defs>
                    <linearGradient id="earningsGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#4461F2" stopOpacity={0.8} />
                      <stop offset="100%" stopColor="#8B54F7" stopOpacity={0.8} />
                    </linearGradient>
                    <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#4461F2" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="#8B54F7" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E1E6EF" vertical={false} />
                  <XAxis
                    dataKey="month"
                    stroke="#9CA3AF"
                    fontSize={12}
                    tickLine={false}
                    axisLine={{ stroke: "#E1E6EF" }}
                  />
                  <YAxis
                    stroke="#9CA3AF"
                    fontSize={12}
                    tickLine={false}
                    axisLine={{ stroke: "#E1E6EF" }}
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "white",
                      border: "1px solid #E1E6EF",
                      borderRadius: "12px",
                      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                      padding: "12px",
                    }}
                    formatter={(value: unknown, name: string) => {
                      if (name === "earnings") {
                        const n = typeof value === "number" ? value : Number(value);
                        return [formatCurrency(Number.isFinite(n) ? n : 0), "Earnings"];
                      }
                      if (name === "bookings") {
                        const n = typeof value === "number" ? value : Number(value);
                        return [Number.isFinite(n) ? n : 0, "Bookings"];
                      }
                      return [String(value ?? ""), name];
                    }}
                    cursor={{ fill: "#F0F5FF", opacity: 0.3 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="earnings"
                    fill="url(#areaGradient)"
                    stroke="none"
                  />
                  <Bar
                    dataKey="earnings"
                    fill="url(#earningsGradient)"
                    radius={[8, 8, 0, 0]}
                    maxBarSize={60}
                  />
                  <Line
                    type="monotone"
                    dataKey="bookings"
                    stroke="#10B981"
                    strokeWidth={3}
                    dot={{ fill: "#10B981", strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6 }}
                    yAxisId={0}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </motion.div>

          {/* Recent Payouts */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-xl shadow-sm border border-[#E1E6EF] p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Payouts</h3>
            {recentPayouts.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <div className="w-12 h-12 mx-auto mb-3 bg-[#F0F5FF] rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <p className="text-sm">No payouts yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentPayouts.map((payout) => (
                  <div
                    key={payout._id}
                    className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-[#F0F5FF] transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {formatCurrency(payout.netAmount)}
                      </p>
                      <p className="text-xs text-gray-500">{formatDate(payout.createdAt)}</p>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                        STATUS_COLORS[payout.status] || "text-gray-600 bg-gray-100"
                      }`}
                    >
                      {payout.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>

        {/* Bank Details Notice */}
        {dashboard && !dashboard.bankDetails?.isConfigured && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3"
          >
            <svg className="w-6 h-6 text-amber-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div>
              <h4 className="font-semibold text-amber-800">Complete Your Payout Setup</h4>
              <p className="text-sm text-amber-700 mt-1">
                Add your bank details to receive payouts for completed bookings.
              </p>
              <Link
                href="/dashboard/caregiver"
                className="inline-block mt-2 text-sm font-medium text-amber-700 hover:text-amber-900 underline"
              >
                Go to Profile Settings ?
              </Link>
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
}

