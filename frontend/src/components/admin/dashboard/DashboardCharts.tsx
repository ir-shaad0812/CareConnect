"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

export interface ChartPoint {
  label: string;
  value: number;
  prev?: number;
}

interface DashboardChartsProps {
  userGrowth: ChartPoint[];
  weeklyTrend: ChartPoint[];
  trustScoreTrend: ChartPoint[];
  visitorGrowth: ChartPoint[];
}

// ─── Custom Tooltip ──────────────────────────────────────────────────────────

function ChartTooltip({
  active,
  payload,
  label,
  suffix,
}: {
  active?: boolean;
  payload?: Array<{ value: number; dataKey: string; color: string; name?: string }>;
  label?: string;
  suffix?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-xl px-4 py-3 min-w-35">
      <p className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">{label}</p>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: entry.color }} />
            <span className="text-xs text-gray-500">
              {entry.dataKey === "prev" ? "Previous" : "This period"}
            </span>
          </div>
          <span className="text-sm font-bold text-gray-900 tabular-nums">
            {typeof entry.value === "number" ? entry.value.toLocaleString() : entry.value}
            {suffix ?? ""}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Chart Card ──────────────────────────────────────────────────────────────

function ChartCard({
  title,
  subtitle,
  value,
  change,
  tabs,
  activeTab,
  onTabChange,
  children,
  badge,
}: {
  title: string;
  subtitle?: string;
  value?: string | undefined;
  change?: string | undefined;
  tabs?: string[];
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  children: React.ReactNode;
  badge?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg hover:shadow-gray-100/80 transition-shadow duration-300"
    >
      <div className="px-6 pt-5 pb-3 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
            {badge && (
              <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                {badge}
              </span>
            )}
          </div>
          {value && (
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-bold text-gray-900 tabular-nums leading-none">{value}</span>
              {change && (
                <span className="text-sm font-semibold text-emerald-600">{change}</span>
              )}
            </div>
          )}
          {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
        </div>
        {tabs && (
          <div className="flex bg-gray-100 rounded-lg p-0.5 shrink-0">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => onTabChange?.(tab)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all duration-200 ${
                  activeTab === tab
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="px-3 pb-5">{children}</div>
    </motion.div>
  );
}

// ─── Shared styling ──────────────────────────────────────────────────────────

const GRID = "#F1F5F9";
const TEAL = "#0F766E";
const TEAL_LIGHT = "#14B8A6";
const BLUE = "#3B82F6";
const AMBER = "#D97706";

const axisProps = {
  stroke: "transparent",
  tick: { fontSize: 11, fill: "#94A3B8", fontWeight: 500 },
  axisLine: false,
  tickLine: false,
} as const;

// ─── Main Component ──────────────────────────────────────────────────────────

export default function DashboardCharts({
  userGrowth,
  weeklyTrend,
  trustScoreTrend,
  visitorGrowth,
}: DashboardChartsProps) {
  const [trendTab, setTrendTab] = useState("Trend");

  const latestGrowth = userGrowth.length > 0 ? userGrowth[userGrowth.length - 1].value : 0;
  const firstGrowth = userGrowth.length > 0 ? userGrowth[0].value : 0;
  const growthPct =
    userGrowth.length > 1 && firstGrowth > 0
      ? `+${(((latestGrowth - firstGrowth) / firstGrowth) * 100).toFixed(1)}% this period`
      : undefined;

  return (
    <div className="space-y-5">
      {/* Row 1: User Growth + Traffic Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* User Growth */}
        <ChartCard
          title="User Growth"
          value={latestGrowth > 0 ? latestGrowth.toLocaleString() : undefined}
          change={growthPct}
        >
          <div className="h-55">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={userGrowth} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="ugFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={TEAL} stopOpacity={0.18} />
                    <stop offset="100%" stopColor={TEAL} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" {...axisProps} />
                <YAxis {...axisProps} />
                <Tooltip content={<ChartTooltip />} cursor={{ stroke: TEAL, strokeWidth: 1, strokeDasharray: "4 2" }} />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={TEAL}
                  strokeWidth={2.5}
                  fill="url(#ugFill)"
                  dot={{ r: 4, fill: TEAL, stroke: "#fff", strokeWidth: 2.5 }}
                  activeDot={{ r: 6, fill: TEAL, stroke: "#fff", strokeWidth: 2.5 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* Traffic Overview with Trend / Weekly toggle */}
        <ChartCard
          title="Traffic Overview"
          tabs={["Trend", "Weekly"]}
          activeTab={trendTab}
          onTabChange={setTrendTab}
        >
          <div className="h-55">
            <ResponsiveContainer width="100%" height="100%">
              {trendTab === "Trend" ? (
                <AreaChart data={weeklyTrend} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={TEAL} stopOpacity={0.14} />
                      <stop offset="100%" stopColor={TEAL} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" {...axisProps} />
                  <YAxis {...axisProps} />
                  <Tooltip content={<ChartTooltip />} cursor={{ stroke: TEAL, strokeWidth: 1, strokeDasharray: "4 2" }} />
                  <Area
                    type="monotone"
                    dataKey="prev"
                    stroke={AMBER}
                    strokeWidth={2}
                    strokeDasharray="6 4"
                    fill="none"
                    dot={false}
                    activeDot={{ r: 5, fill: AMBER, stroke: "#fff", strokeWidth: 2 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke={TEAL}
                    strokeWidth={2.5}
                    fill="url(#trendFill)"
                    dot={{ r: 3.5, fill: TEAL, stroke: "#fff", strokeWidth: 2 }}
                    activeDot={{ r: 6, fill: TEAL, stroke: "#fff", strokeWidth: 2.5 }}
                  />
                </AreaChart>
              ) : (
                <BarChart data={weeklyTrend} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" {...axisProps} />
                  <YAxis {...axisProps} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: "#F0FDF4" }} />
                  <Bar dataKey="value" fill={TEAL_LIGHT} radius={[6, 6, 0, 0]} maxBarSize={32} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      {/* Row 2: Trust Score Trend + Profile Visitor Growth */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ChartCard title="Trust Score Trend" subtitle="Platform-wide verification ratio over time">
          <div className="h-50">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trustScoreTrend} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" {...axisProps} />
                <YAxis {...axisProps} domain={["dataMin - 2", "dataMax + 2"]} />
                <Tooltip content={<ChartTooltip suffix="%" />} cursor={{ stroke: TEAL, strokeWidth: 1, strokeDasharray: "4 2" }} />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={TEAL}
                  strokeWidth={2.5}
                  dot={{ r: 4.5, fill: TEAL, stroke: "#fff", strokeWidth: 2.5 }}
                  activeDot={{ r: 6.5, fill: TEAL, stroke: "#fff", strokeWidth: 2.5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Profile Visitor Growth" subtitle="Unique caregiver profile views over time">
          <div className="h-50">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={visitorGrowth} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="vgFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={BLUE} stopOpacity={0.14} />
                    <stop offset="100%" stopColor={BLUE} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" {...axisProps} />
                <YAxis {...axisProps} />
                <Tooltip content={<ChartTooltip />} cursor={{ stroke: BLUE, strokeWidth: 1, strokeDasharray: "4 2" }} />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={BLUE}
                  strokeWidth={2.5}
                  fill="url(#vgFill)"
                  dot={{ r: 3.5, fill: BLUE, stroke: "#fff", strokeWidth: 2 }}
                  activeDot={{ r: 6, fill: BLUE, stroke: "#fff", strokeWidth: 2.5 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>
    </div>
  );
}
