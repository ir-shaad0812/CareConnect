"use client";

import React from "react";
import {
  Area,
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

// ============================================
// CIRCULAR PROGRESS STAT CARD
// Modern stat card with circular progress indicator
// ============================================

interface CircularProgressStatProps {
  title: string;
  value: string | number;
  subtitle?: string;
  percentage: number;
  color: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  icon?: React.ReactNode;
}

export function CircularProgressStat({
  title,
  value,
  subtitle,
  percentage,
  color,
  trend,
}: CircularProgressStatProps) {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-lg transition-all duration-300">
      <div className="flex items-center gap-4">
        {/* Circular Progress */}
        <div className="relative">
          <svg width="88" height="88" className="-rotate-90">
            {/* Background Circle */}
            <circle
              cx="44"
              cy="44"
              r={radius}
              fill="none"
              stroke="#F3F4F6"
              strokeWidth="8"
            />
            {/* Progress Circle */}
            <circle
              cx="44"
              cy="44"
              r={radius}
              fill="none"
              stroke={color}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-700 ease-out"
            />
          </svg>
          {/* Center Content */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-lg font-bold text-gray-800">{percentage}%</span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1">
          <p className="text-sm text-gray-500 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {subtitle && (
            <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
          )}
          {trend && (
            <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${
              trend.isPositive ? "text-green-600" : "text-red-500"
            }`}>
              <svg 
                className={`w-3 h-3 ${!trend.isPositive && "rotate-180"}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
              <span>{trend.isPositive ? "+" : ""}{trend.value}%</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// UPCOMING BOOKING CARD
// ============================================

export interface UpcomingBooking {
  id: string;
  service: string;
  date: string;
  time: string;
  caregiver?: {
    name: string;
    avatar?: string;
  };
}

interface UpcomingBookingCardProps {
  booking: UpcomingBooking;
  onViewDetails?: (id: string) => void;
}

export function UpcomingBookingCard({ booking, onViewDetails }: UpcomingBookingCardProps) {
  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors group">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-linear-to-br from-primary-500/10 to-secondary-500/10 rounded-xl flex items-center justify-center">
          <svg className="w-6 h-6 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <div>
          <h4 className="font-semibold text-gray-900">{booking.service}</h4>
          <p className="text-sm text-gray-500">{booking.date}, {booking.time}</p>
        </div>
      </div>
      <button 
        onClick={() => onViewDetails?.(booking.id)}
        className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-primary-500 border border-gray-200 hover:border-primary-500 rounded-lg transition-all opacity-0 group-hover:opacity-100"
      >
        View Details
      </button>
    </div>
  );
}

// ============================================
// BOOKING HISTORY TABLE
// ============================================

export interface BookingHistoryItem {
  id: string;
  service: string;
  caregiver: {
    name: string;
    avatar?: string;
  };
  date: string;
  duration: string;
  status: "completed" | "cancelled" | "in_progress" | "pending";
}

interface BookingHistoryTableProps {
  bookings: BookingHistoryItem[];
  onViewBooking?: (id: string) => void;
}

export function BookingHistoryTable({ bookings, onViewBooking }: BookingHistoryTableProps) {
  const getStatusBadge = (status: BookingHistoryItem["status"]) => {
    const styles = {
      completed: "bg-green-100 text-green-700",
      cancelled: "bg-red-100 text-red-600",
      in_progress: "bg-blue-100 text-blue-700",
      pending: "bg-yellow-100 text-yellow-700",
    };

    const labels = {
      completed: "Completed",
      cancelled: "Cancelled",
      in_progress: "In Progress",
      pending: "Pending",
    };

    return (
      <span className={`px-3 py-1 text-xs font-medium rounded-full ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  return (
    <div className="overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="text-left py-4 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Service</th>
            <th className="text-left py-4 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Caregiver</th>
            <th className="text-left py-4 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
            <th className="text-left py-4 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Duration</th>
            <th className="text-left py-4 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {bookings.map((booking) => (
            <tr 
              key={booking.id} 
              className="hover:bg-gray-50 cursor-pointer transition-colors"
              onClick={() => onViewBooking?.(booking.id)}
            >
              <td className="py-4 px-4">
                <span className="font-medium text-gray-900">{booking.service}</span>
              </td>
              <td className="py-4 px-4">
                <div className="flex items-center gap-3">
                  {booking.caregiver.avatar ? (
                    <img 
                      src={booking.caregiver.avatar} 
                      alt={booking.caregiver.name}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 bg-linear-to-br from-primary-500 to-secondary-500 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                      {booking.caregiver.name.charAt(0)}
                    </div>
                  )}
                  <span className="text-gray-700">{booking.caregiver.name}</span>
                </div>
              </td>
              <td className="py-4 px-4 text-gray-600">{booking.date}</td>
              <td className="py-4 px-4 text-gray-600">{booking.duration}</td>
              <td className="py-4 px-4">{getStatusBadge(booking.status)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============================================
// INVOICE TABLE
// ============================================

export interface Invoice {
  id: string;
  invoiceId: string;
  dateIssued: string;
  amount: number;
  status: "paid" | "pending" | "overdue";
}

interface InvoiceTableProps {
  invoices: Invoice[];
  onView?: (id: string) => void;
  onPay?: (id: string) => void;
}

export function InvoiceTable({ invoices, onView, onPay }: InvoiceTableProps) {
  const getStatusBadge = (status: Invoice["status"]) => {
    const styles = {
      paid: "bg-green-100 text-green-700",
      pending: "bg-yellow-100 text-yellow-700",
      overdue: "bg-red-100 text-red-600",
    };

    return (
      <span className={`px-3 py-1 text-xs font-medium rounded-full ${styles[status]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  return (
    <div className="overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="text-left py-4 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Invoice ID</th>
            <th className="text-left py-4 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date Issued</th>
            <th className="text-left py-4 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
            <th className="text-left py-4 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
            <th className="text-right py-4 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {invoices.map((invoice) => (
            <tr key={invoice.id} className="hover:bg-gray-50 transition-colors">
              <td className="py-4 px-4">
                <span className="font-medium text-gray-900">{invoice.invoiceId}</span>
              </td>
              <td className="py-4 px-4 text-gray-600">{invoice.dateIssued}</td>
              <td className="py-4 px-4 font-semibold text-gray-900">${invoice.amount.toFixed(2)}</td>
              <td className="py-4 px-4">{getStatusBadge(invoice.status)}</td>
              <td className="py-4 px-4 text-right">
                {invoice.status === "overdue" || invoice.status === "pending" ? (
                  <button 
                    onClick={() => onPay?.(invoice.id)}
                    className="px-4 py-1.5 text-sm font-medium text-white bg-primary-500 hover:bg-[#3651E2] rounded-lg transition-colors"
                  >
                    Pay Now
                  </button>
                ) : (
                  <button 
                    onClick={() => onView?.(invoice.id)}
                    className="text-sm font-medium text-primary-500 hover:text-[#3651E2] transition-colors"
                  >
                    View
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============================================
// LIVE ACTIVITY FEED
// ============================================

export interface ActivityItem {
  id: string;
  user: {
    name: string;
    avatar?: string;
    initials?: string;
  };
  action: string;
  time: string;
  type: "booking" | "payment" | "review" | "message" | "system";
  amount?: number;
  isPositive?: boolean;
}

interface LiveActivityFeedProps {
  activities: ActivityItem[];
}

export function LiveActivityFeed({ activities }: LiveActivityFeedProps) {
  const getActivityColor = (type: ActivityItem["type"]) => {
    const colors = {
      booking: "from-blue-500 to-blue-600",
      payment: "from-green-500 to-green-600",
      review: "from-yellow-500 to-orange-500",
      message: "from-purple-500 to-purple-600",
      system: "from-gray-500 to-gray-600",
    };
    return colors[type];
  };

  return (
    <div className="space-y-4">
      {activities.map((activity) => (
        <div key={activity.id} className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
          {/* Avatar */}
          {activity.user.avatar ? (
            <img 
              src={activity.user.avatar} 
              alt={activity.user.name}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div className={`w-10 h-10 bg-linear-to-br ${getActivityColor(activity.type)} rounded-full flex items-center justify-center text-white text-sm font-semibold`}>
              {activity.user.initials || activity.user.name.split(" ").map(n => n[0]).join("")}
            </div>
          )}

          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className="text-sm">
              <span className="font-semibold text-gray-900">{activity.user.name}</span>{" "}
              <span className="text-gray-600">{activity.action}</span>
            </p>
            <p className="text-xs text-gray-400 mt-0.5">{activity.time}</p>
          </div>

          {/* Amount Badge */}
          {activity.amount !== undefined && (
            <span className={`text-sm font-semibold px-2 py-1 rounded-lg ${
              activity.isPositive 
                ? "bg-green-100 text-green-700" 
                : "bg-red-100 text-red-600"
            }`}>
              {activity.isPositive ? "+" : "-"}${Math.abs(activity.amount)}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

// ============================================
// SPENDING CHART (Bar Chart for Monthly Spending)
// ============================================

interface SpendingChartProps {
  data: {
    month: string;
    spending: number;
    bookings: number;
  }[];
  maxSpending?: number;
}

function SpendingChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ dataKey?: string; value?: number }>;
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const spendingValue = payload.find((item) => item.dataKey === "spending")?.value ?? 0;
  const bookingsValue = payload.find((item) => item.dataKey === "bookings")?.value ?? 0;

  return (
    <div className="min-w-44 rounded-xl border border-slate-100 bg-white/95 px-3 py-2.5 shadow-lg backdrop-blur-sm">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <div className="mt-2 space-y-1.5">
        <p className="flex items-center justify-between gap-4 text-xs text-slate-600">
          <span>Spending</span>
          <span className="font-semibold text-slate-900">
            Rs. {Number(spendingValue).toLocaleString()}
          </span>
        </p>
        <p className="flex items-center justify-between gap-4 text-xs text-slate-600">
          <span>Bookings</span>
          <span className="font-semibold text-slate-900">{Math.round(Number(bookingsValue))}</span>
        </p>
      </div>
    </div>
  );
}

export function SpendingChart({ data, maxSpending }: SpendingChartProps) {
  const chartData = data.map((item) => ({
    month: item.month,
    spending: Number(item.spending) || 0,
    bookings: Number(item.bookings) || 0,
  }));

  const peakSpending = Math.max(maxSpending || 0, ...chartData.map((d) => d.spending), 1);

  const spendingTick = (value: number) => {
    if (value >= 100000) {
      return `Rs.${Math.round(value / 1000)}k`;
    }
    if (value >= 1000) {
      return `Rs.${(value / 1000).toFixed(1)}k`;
    }
    return `Rs.${value}`;
  };

  const bookingsTick = (value: number) => `${Math.round(value)}`;

  if (chartData.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/70 text-sm text-slate-400">
        No spending activity yet
      </div>
    );
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: -14, bottom: 0 }}>
          <defs>
            <linearGradient id="careseekerSpendingArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#39B54A" stopOpacity={0.24} />
              <stop offset="100%" stopColor="#39B54A" stopOpacity={0.01} />
            </linearGradient>
            <linearGradient id="careseekerBookingsBar" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F6C453" stopOpacity={0.95} />
              <stop offset="100%" stopColor="#F59E0B" stopOpacity={0.92} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="4 4" stroke="#EDF2F7" vertical={false} />

          <XAxis
            dataKey="month"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: "#94A3B8" }}
          />

          <YAxis
            yAxisId="left"
            axisLine={false}
            tickLine={false}
            domain={[0, peakSpending]}
            tick={{ fontSize: 11, fill: "#94A3B8" }}
            tickFormatter={spendingTick}
          />

          <YAxis
            yAxisId="right"
            orientation="right"
            axisLine={false}
            tickLine={false}
            width={28}
            allowDecimals={false}
            tick={{ fontSize: 11, fill: "#94A3B8" }}
            tickFormatter={bookingsTick}
          />

          <Tooltip content={<SpendingChartTooltip />} cursor={{ fill: "rgba(148, 163, 184, 0.08)" }} />

          <Area
            yAxisId="left"
            type="monotone"
            dataKey="spending"
            stroke="#39B54A"
            strokeWidth={2.4}
            fill="url(#careseekerSpendingArea)"
            dot={false}
            activeDot={{ r: 4.5, fill: "#39B54A", stroke: "#ffffff", strokeWidth: 2 }}
          />

          <Bar
            yAxisId="right"
            dataKey="bookings"
            fill="url(#careseekerBookingsBar)"
            radius={[6, 6, 0, 0]}
            barSize={18}
            opacity={0.92}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

// ============================================
// CAREGIVER DISTRIBUTION (Donut Chart)
// ============================================

interface CaregiverDistributionProps {
  data: {
    type: string;
    count: number;
    color: string;
  }[];
}

function DistributionChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload?: { type?: string; count?: number; percentage?: number } }>;
}) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const row = payload[0].payload;
  if (!row) return null;

  return (
    <div className="rounded-xl border border-slate-100 bg-white/95 px-3 py-2.5 shadow-lg backdrop-blur-sm">
      <p className="text-xs font-medium text-slate-500">{row.type || "Service"}</p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{row.count || 0} bookings</p>
      <p className="text-xs text-slate-500">{row.percentage || 0}% share</p>
    </div>
  );
}

export function CaregiverDistribution({ data }: CaregiverDistributionProps) {
  const defaultColors = [
    "#39B54A",
    "#5BC26A",
    "#8BCF95",
    "#F6C453",
    "#46C0E8",
    "#7B8CFF",
  ];

  const chartData = data.map((item, index) => ({
    ...item,
    count: Number(item.count) || 0,
    color: item.color || defaultColors[index % defaultColors.length],
  }));

  const total = chartData.reduce((sum, item) => sum + item.count, 0);

  const legendItems = chartData.map((item) => {
    const percentage = total > 0 ? (item.count / total) * 100 : 0;
    return {
      ...item,
      percentage: Math.round(percentage * 100),
    };
  });

  if (legendItems.length === 0 || total === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/70 text-sm text-slate-400">
        No service distribution yet
      </div>
    );
  }

  return (
    <div className="flex items-center gap-6">
      {/* Donut Chart */}
      <div className="relative h-44 w-44 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={legendItems}
              dataKey="count"
              nameKey="type"
              cx="50%"
              cy="50%"
              innerRadius={56}
              outerRadius={78}
              strokeWidth={0}
              paddingAngle={3}
            >
              {legendItems.map((segment, index) => (
                <Cell
                  key={`${segment.type}-${index}`}
                  fill={segment.color}
                />
              ))}
            </Pie>
            <Tooltip content={<DistributionChartTooltip />} />
          </PieChart>
        </ResponsiveContainer>

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-2xl font-bold text-slate-900">{total}</p>
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
            Services
          </p>
        </div>
      </div>

      {/* Legend */}
      <div className="flex-1 space-y-3">
        {legendItems.map((segment, index) => (
          <div key={`${segment.type}-${index}`} className="flex items-center gap-3">
            <div 
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: segment.color }}
            />
            <div className="flex flex-1 items-center justify-between gap-3">
              <span className="text-sm text-gray-600">{segment.type}</span>
              <span className="text-sm font-semibold text-gray-900">{segment.percentage}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default {
  CircularProgressStat,
  UpcomingBookingCard,
  BookingHistoryTable,
  InvoiceTable,
  LiveActivityFeed,
  SpendingChart,
  CaregiverDistribution,
};
