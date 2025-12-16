"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type ChartPoint = { label: string; value: number };

type FeatureUsagePoint = { label: string; value: number; color?: string };

function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden"
    >
      <div className="px-6 py-5 border-b border-slate-100">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-slate-900 truncate">{title}</h3>
            {subtitle ? <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p> : null}
          </div>
        </div>
      </div>
      <div className="p-6">{children}</div>
    </motion.section>
  );
}

function TooltipCard({ active, payload, label }: { active?: boolean; payload?: Array<any>; label?: any }) {
  if (!active || !payload?.length) return null;
  const first = payload[0];
  const value = typeof first?.value === "number" ? first.value : Number(first?.value ?? 0);
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm px-3 py-2">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="text-sm font-semibold text-slate-900 tabular-nums">{value.toLocaleString()}</p>
    </div>
  );
}

export default function AnalyticsCharts({
  dailyActiveUsers,
  featureUsage,
  growth,
}: {
  dailyActiveUsers: ChartPoint[];
  featureUsage: FeatureUsagePoint[];
  growth: ChartPoint[];
}) {
  const teal = "#0F766E";
  const teal2 = "#0EA5A4";
  const grid = "#E2E8F0";

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <ChartCard title="Daily Active Users" subtitle="Last 7 days (trend)" >
        <div className="h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={dailyActiveUsers}>
              <defs>
                <linearGradient id="daU" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={teal} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={teal} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={grid} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" stroke="#94A3B8" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis stroke="#94A3B8" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip content={<TooltipCard />} />
              <Line
                type="monotone"
                dataKey="value"
                stroke={teal}
                strokeWidth={3}
                dot={{ r: 4, fill: teal, stroke: "#fff", strokeWidth: 2 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <ChartCard title="Feature Usage" subtitle="Top admin features" >
        <div className="h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={featureUsage.map((p) => ({ label: p.label, value: p.value }))}>
              <CartesianGrid stroke={grid} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" stroke="#94A3B8" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis stroke="#94A3B8" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip content={<TooltipCard />} />
              <Bar dataKey="value" radius={[10, 10, 0, 0]} fill={teal2} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <ChartCard title="Growth" subtitle="Revenue-ready metrics (simulated)" >
        <div className="h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={growth}>
              <defs>
                <linearGradient id="growthFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={teal2} stopOpacity={0.28} />
                  <stop offset="95%" stopColor={teal2} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={grid} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" stroke="#94A3B8" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis stroke="#94A3B8" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip content={<TooltipCard />} />
              <Area
                type="monotone"
                dataKey="value"
                stroke={teal2}
                strokeWidth={3}
                fill="url(#growthFill)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>
    </div>
  );
}

