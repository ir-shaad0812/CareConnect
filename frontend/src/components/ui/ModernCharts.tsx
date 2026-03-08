"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  LineChart as RechartsLineChart,
  Line,
  AreaChart as RechartsAreaChart,
  Area,
  BarChart as RechartsBarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
} from "recharts";
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================
// ANIMATED STAT CARD
// ============================================

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: React.ReactNode;
  trend?: "up" | "down";
  color?: string;
  delay?: number;
}

export function AnimatedStatCard({
  title,
  value,
  change,
  changeLabel,
  icon,
  trend = "up",
  color = "blue",
  delay = 0,
}: StatCardProps) {
  const colorClasses = {
    blue: "from-blue-500 to-blue-600",
    green: "from-green-500 to-green-600",
    purple: "from-purple-500 to-purple-600",
    orange: "from-orange-500 to-orange-600",
    red: "from-red-500 to-red-600",
    teal: "from-teal-500 to-teal-600",
  }[color];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-xl transition-shadow"
    >
      <div className="flex items-start justify-between mb-4">
        <div className={cn("w-12 h-12 rounded-xl bg-linear-to-br flex items-center justify-center shadow-lg", colorClasses)}>
          {icon}
        </div>
        {change !== undefined && (
          <div className={cn("flex items-center gap-1 text-sm font-medium px-2 py-1 rounded-lg", trend === "up" ? "text-green-600 bg-green-50" : "text-red-600 bg-red-50")}>
            {trend === "up" ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            {Math.abs(change)}%
          </div>
        )}
      </div>
      <h3 className="text-3xl font-bold text-gray-900 mb-1">{value}</h3>
      <p className="text-gray-500 text-sm">{title}</p>
      {changeLabel && <p className="text-xs text-gray-400 mt-2">{changeLabel}</p>}
    </motion.div>
  );
}

// ============================================
// MODERN LINE CHART
// ============================================

interface LineChartProps {
  data: { label: string; value: number; [key: string]: string | number }[];
  dataKeys?: string[];
  title?: string;
  height?: number;
  gradient?: boolean;
  colors?: string[];
}

export function ModernLineChart({ data, dataKeys = ["value"], title, height = 300, gradient = true, colors = ["#4461F2", "#8B54F7"] }: LineChartProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
    >
      {title && <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>}
      <ResponsiveContainer width="100%" height={height}>
        {gradient ? (
          <RechartsAreaChart data={data}>
            <defs>
              {colors.map((color, i) => (
                <linearGradient key={i} id={`gradient-${i}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
            <XAxis dataKey="label" stroke="#9CA3AF" tick={{ fontSize: 12 }} />
            <YAxis stroke="#9CA3AF" tick={{ fontSize: 12 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(255, 255, 255, 0.95)",
                border: "none",
                borderRadius: "12px",
                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
              }}
            />
            {dataKeys.map((key, i) => (
              <Area
                key={key}
                type="monotone"
                dataKey={key}
                stroke={colors[i % colors.length]}
                strokeWidth={2}
                fill={`url(#gradient-${i % colors.length})`}
                animationDuration={1500}
              />
            ))}
          </RechartsAreaChart>
        ) : (
          <RechartsLineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
            <XAxis dataKey="label" stroke="#9CA3AF" tick={{ fontSize: 12 }} />
            <YAxis stroke="#9CA3AF" tick={{ fontSize: 12 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(255, 255, 255, 0.95)",
                border: "none",
                borderRadius: "12px",
                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
              }}
            />
            {dataKeys.map((key, i) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={colors[i % colors.length]}
                strokeWidth={3}
                dot={{ r: 4, fill: colors[i % colors.length] }}
                activeDot={{ r: 6 }}
                animationDuration={1500}
              />
            ))}
          </RechartsLineChart>
        )}
      </ResponsiveContainer>
    </motion.div>
  );
}

// ============================================
// MODERN BAR CHART
// ============================================

interface BarChartProps {
  data: { label: string; value: number; [key: string]: string | number }[];
  dataKeys?: string[];
  title?: string;
  height?: number;
  colors?: string[];
}

export function ModernBarChart({ data, dataKeys = ["value"], title, height = 300, colors = ["#4461F2", "#8B54F7", "#3B82F6"] }: BarChartProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
    >
      {title && <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>}
      <ResponsiveContainer width="100%" height={height}>
        <RechartsBarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
          <XAxis dataKey="label" stroke="#9CA3AF" tick={{ fontSize: 12 }} />
          <YAxis stroke="#9CA3AF" tick={{ fontSize: 12 }} />
          <Tooltip
            contentStyle={{
              backgroundColor: "rgba(255, 255, 255, 0.95)",
              border: "none",
              borderRadius: "12px",
              boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
            }}
          />
          {dataKeys.map((key, i) => (
            <Bar key={key} dataKey={key} fill={colors[i % colors.length]} radius={[8, 8, 0, 0]} animationDuration={1500} />
          ))}
        </RechartsBarChart>
      </ResponsiveContainer>
    </motion.div>
  );
}

// ============================================
// MODERN DONUT CHART
// ============================================

interface DonutChartProps {
  data: { label: string; value: number; color: string }[];
  title?: string;
  height?: number;
  showLegend?: boolean;
}

export function ModernDonutChart({ data, title, height = 300, showLegend = true }: DonutChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
    >
      {title && <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>}
      <div className="flex items-center gap-6">
        <ResponsiveContainer width="50%" height={height}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={2}
              dataKey="value"
              animationDuration={1500}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(255, 255, 255, 0.95)",
                border: "none",
                borderRadius: "12px",
                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        {showLegend && (
          <div className="flex-1 space-y-3">
            {data.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-sm text-gray-600">{item.label}</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-gray-900">{item.value}</div>
                  <div className="text-xs text-gray-500">{((item.value / total) * 100).toFixed(1)}%</div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ============================================
// RADIAL PROGRESS CHART
// ============================================

interface RadialProgressProps {
  data: { name: string; value: number; fill: string }[];
  title?: string;
  height?: number;
}

export function RadialProgressChart({ data, title, height = 300 }: RadialProgressProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
    >
      {title && <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>}
      <ResponsiveContainer width="100%" height={height}>
        <RadialBarChart innerRadius="20%" outerRadius="90%" data={data} startAngle={90} endAngle={-270}>
          <RadialBar background dataKey="value" cornerRadius={10} animationDuration={1500} />
          <Legend iconSize={10} layout="vertical" verticalAlign="middle" align="right" />
          <Tooltip
            contentStyle={{
              backgroundColor: "rgba(255, 255, 255, 0.95)",
              border: "none",
              borderRadius: "12px",
              boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
            }}
          />
        </RadialBarChart>
      </ResponsiveContainer>
    </motion.div>
  );
}

// ============================================
// MINI STATS CARD WITH SPARKLINE
// ============================================

interface MiniStatCardProps {
  title: string;
  value: string | number;
  data: number[];
  color?: string;
  trend?: "up" | "down";
  change?: number;
}

export function MiniStatCard({ title, value, data, color = "#4461F2", trend = "up", change }: MiniStatCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="bg-white rounded-xl p-4 shadow-sm border border-gray-100"
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <h4 className="text-2xl font-bold text-gray-900 mt-1">{value}</h4>
        </div>
        {change !== undefined && (
          <div className={cn("flex items-center gap-1 text-xs font-medium", trend === "up" ? "text-green-600" : "text-red-600")}>
            {trend === "up" ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {Math.abs(change)}%
          </div>
        )}
      </div>
      <ResponsiveContainer width="100%" height={40}>
        <RechartsLineChart data={data.map((v) => ({ value: v }))}>
          <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={false} />
        </RechartsLineChart>
      </ResponsiveContainer>
    </motion.div>
  );
}
