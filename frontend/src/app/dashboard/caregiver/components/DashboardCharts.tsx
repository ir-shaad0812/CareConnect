"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  useCaregiverEarnings,
  useCaregiverBookingsByType,
  useCaregiverWeeklyActivity,
} from "@/hooks/useDashboardData";

type TimeRange = "7d" | "30d" | "90d" | "1y";

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 backdrop-blur-sm shadow-lg rounded-xl px-4 py-3 border border-gray-100">
        <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
        <p className="text-sm font-bold text-gray-900">Rs. {payload[0].value.toLocaleString()}</p>
      </div>
    );
  }
  return null;
};

const DEFAULT_COLORS = ["#39B54A", "#59B966", "#81BC89", "#A7C5AB", "#8B5CF6", "#EC4899", "#06B6D4", "#84CC16"];

export default function DashboardCharts() {
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");
  const { data: earningsData = [] } = useCaregiverEarnings();
  const { data: bookingsByType = [] } = useCaregiverBookingsByType();
  const { data: weeklyActivity = [], isLoading: loading } = useCaregiverWeeklyActivity();

  const ranges: { label: string; value: TimeRange }[] = [
    { label: "7D", value: "7d" },
    { label: "30D", value: "30d" },
    { label: "90D", value: "90d" },
    { label: "1Y", value: "1y" },
  ];

  const totalWeeklyHours = weeklyActivity.reduce((sum, d) => sum + d.hours, 0);

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100/80 p-6 h-80 animate-pulse">
          <div className="h-5 bg-gray-200 rounded w-40 mb-2" />
          <div className="h-4 bg-gray-100 rounded w-56 mb-6" />
          <div className="h-52 bg-gray-50 rounded-xl" />
        </div>
        <div className="bg-white rounded-2xl border border-gray-100/80 p-6 animate-pulse">
          <div className="h-5 bg-gray-200 rounded w-32 mb-6" />
          <div className="h-40 bg-gray-50 rounded-xl" />
        </div>
        <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-100/80 p-6 h-56 animate-pulse">
          <div className="h-5 bg-gray-200 rounded w-40 mb-6" />
          <div className="h-36 bg-gray-50 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      {/* Earnings Chart - Spans 2 cols */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08, duration: 0.25 }}
        className="lg:col-span-2 bg-white rounded-2xl border border-gray-100/80 p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Earnings Overview</h3>
            <p className="text-sm text-gray-500 mt-0.5">Track your income over time</p>
          </div>
          <div className="flex items-center bg-gray-50 rounded-lg p-1">
            {ranges.map((r) => (
              <button
                key={r.value}
                onClick={() => setTimeRange(r.value)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  timeRange === r.value
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
        <div className="h-65">
          {earningsData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={earningsData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="earningsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#39B54A" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#39B54A" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: "#9ca3af" }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: "#9ca3af" }}
                  tickFormatter={(v) => `Rs.${v >= 1000 ? `${v / 1000}k` : v}`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="earnings"
                  stroke="#39B54A"
                  strokeWidth={2.5}
                  fill="url(#earningsGradient)"
                  dot={false}
                  activeDot={{
                    r: 5,
                    fill: "#39B54A",
                    stroke: "#fff",
                    strokeWidth: 2,
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400 text-sm">
              No earnings data yet
            </div>
          )}
        </div>
      </motion.div>

      {/* Booking Distribution */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12, duration: 0.25 }}
        className="bg-white rounded-2xl border border-gray-100/80 p-6"
      >
        <h3 className="text-base font-semibold text-gray-900 mb-1">Job Categories</h3>
        <p className="text-sm text-gray-500 mb-4">Distribution by care type</p>

        {bookingsByType.length > 0 ? (
          <>
            <div className="h-40 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={bookingsByType}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={72}
                    paddingAngle={3}
                    dataKey="count"
                    strokeWidth={0}
                  >
                    {bookingsByType.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-2.5 mt-3">
              {bookingsByType.map((item, index) => (
                <div key={item.type} className="flex items-center gap-3">
                  <div
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: item.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length] }}
                  />
                  <span className="text-sm text-gray-600 flex-1">{item.type}</span>
                  <span className="text-sm font-semibold text-gray-900">{item.percentage || 0}%</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
            No bookings yet
          </div>
        )}
      </motion.div>

      {/* Weekly Activity */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.16, duration: 0.25 }}
        className="lg:col-span-3 bg-white rounded-2xl border border-gray-100/80 p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Weekly Activity</h3>
            <p className="text-sm text-gray-500 mt-0.5">Hours worked per day this week</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#39B54A]" />
              <span className="text-xs text-gray-500">Hours</span>
            </div>
            <span className="text-sm font-semibold text-gray-900">{totalWeeklyHours}h total</span>
          </div>
        </div>
        <div className="h-45">
          {weeklyActivity.some(d => d.hours > 0) ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyActivity} margin={{ top: 5, right: 5, left: -30, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis
                  dataKey="day"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: "#9ca3af" }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: "#9ca3af" }}
                  tickFormatter={(v) => `${v}h`}
                />
                <Tooltip
                  contentStyle={{
                    background: "white",
                    border: "1px solid #f0f0f0",
                    borderRadius: "12px",
                    padding: "8px 12px",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                  }}
                  labelStyle={{ fontSize: "12px", color: "#9ca3af" }}
                />
                <Bar
                  dataKey="hours"
                  fill="#39B54A"
                  radius={[6, 6, 0, 0]}
                  barSize={32}
                  opacity={0.9}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400 text-sm">
              No activity this week
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
