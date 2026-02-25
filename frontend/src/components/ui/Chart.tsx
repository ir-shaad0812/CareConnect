// ============================================
// CHART COMPONENTS
// Lightweight, responsive chart components
// ============================================

"use client";

import React, { useMemo } from "react";

// ============================================
// LINE CHART
// ============================================

interface LineChartDataPoint {
  label: string;
  value: number;
}

interface LineChartProps {
  data: LineChartDataPoint[];
  height?: number;
  color?: string;
  showGrid?: boolean;
  showLabels?: boolean;
  showTooltip?: boolean;
  animate?: boolean;
}

export function LineChart({
  data,
  height = 200,
  color = "#4461F2",
  showGrid = true,
  showLabels = true,
  animate = true,
}: LineChartProps) {
  const chartData = useMemo(() => {
    if (!data.length) return { points: "", maxValue: 0, minValue: 0 };
    
    const values = data.map(d => d.value);
    const maxValue = Math.max(...values) * 1.1 || 1;
    const minValue = Math.min(...values, 0);
    const range = maxValue - minValue || 1;
    
    const width = 100;
    const pointWidth = width / (data.length - 1 || 1);
    
    const points = data.map((d, i) => {
      const x = i * pointWidth;
      const y = ((maxValue - d.value) / range) * 100;
      return `${x},${y}`;
    }).join(" ");

    const areaPoints = `0,100 ${points} 100,100`;
    
    return { points, areaPoints, maxValue, minValue };
  }, [data]);

  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        No data available
      </div>
    );
  }

  return (
    <div className="relative w-full" style={{ height }}>
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="w-full h-full"
      >
        {/* Grid Lines */}
        {showGrid && (
          <g className="text-gray-200">
            {[0, 25, 50, 75, 100].map((y) => (
              <line
                key={y}
                x1="0"
                y1={y}
                x2="100"
                y2={y}
                stroke="currentColor"
                strokeWidth="0.3"
                strokeDasharray="2,2"
              />
            ))}
          </g>
        )}

        {/* Area Fill */}
        <polygon
          points={chartData.areaPoints}
          fill={`url(#gradient-${color.replace("#", "")})`}
          opacity="0.3"
        />

        {/* Gradient Definition */}
        <defs>
          <linearGradient
            id={`gradient-${color.replace("#", "")}`}
            x1="0%"
            y1="0%"
            x2="0%"
            y2="100%"
          >
            <stop offset="0%" stopColor={color} stopOpacity="0.4" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Line */}
        <polyline
          points={chartData.points}
          fill="none"
          stroke={color}
          strokeWidth="0.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={animate ? "animate-draw-line" : ""}
        />

        {/* Data Points */}
        {data.map((d, i) => {
          const x = (i / (data.length - 1 || 1)) * 100;
          const y = ((chartData.maxValue - d.value) / (chartData.maxValue - chartData.minValue || 1)) * 100;
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r="1.5"
              fill={color}
              className="hover:r-2 transition-all"
            />
          );
        })}
      </svg>

      {/* X-axis Labels */}
      {showLabels && (
        <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-gray-400 mt-2 px-1">
          {data.filter((_, i) => i % Math.ceil(data.length / 6) === 0 || i === data.length - 1).map((d, i) => (
            <span key={i} className="truncate max-w-[60px]">{d.label}</span>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================
// BAR CHART
// ============================================

interface BarChartDataPoint {
  label: string;
  value: number;
  color?: string;
}

interface BarChartProps {
  data: BarChartDataPoint[];
  height?: number;
  color?: string;
  showLabels?: boolean;
  horizontal?: boolean;
  animate?: boolean;
}

export function BarChart({
  data,
  height = 200,
  color = "#4461F2",
  showLabels = true,
  horizontal = false,
  animate = true,
}: BarChartProps) {
  const maxValue = useMemo(() => {
    return Math.max(...data.map(d => d.value), 1);
  }, [data]);

  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        No data available
      </div>
    );
  }

  if (horizontal) {
    return (
      <div className="space-y-3" style={{ height }}>
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-3">
            {showLabels && (
              <span className="text-sm text-gray-600 w-20 truncate">{d.label}</span>
            )}
            <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
              <div
                className={`h-full rounded-full ${animate ? "transition-all duration-700 ease-out" : ""}`}
                style={{
                  width: `${(d.value / maxValue) * 100}%`,
                  backgroundColor: d.color || color,
                }}
              />
            </div>
            <span className="text-sm font-medium text-gray-900 w-12 text-right">
              {d.value}
            </span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex items-end justify-between gap-2 h-full" style={{ height }}>
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-2">
          <div className="w-full bg-gray-100 rounded-t-lg relative overflow-hidden" style={{ height: height - 30 }}>
            <div
              className={`absolute bottom-0 w-full rounded-t-lg ${animate ? "transition-all duration-700 ease-out" : ""}`}
              style={{
                height: `${(d.value / maxValue) * 100}%`,
                backgroundColor: d.color || color,
              }}
            />
          </div>
          {showLabels && (
            <span className="text-xs text-gray-500 truncate max-w-full">{d.label}</span>
          )}
        </div>
      ))}
    </div>
  );
}

// ============================================
// DONUT CHART
// ============================================

interface DonutChartDataPoint {
  label: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  data: DonutChartDataPoint[];
  size?: number;
  strokeWidth?: number;
  showLegend?: boolean;
  showTotal?: boolean;
  totalLabel?: string;
  animate?: boolean;
}

export function DonutChart({
  data,
  size = 180,
  strokeWidth = 24,
  showLegend = true,
  showTotal = true,
  totalLabel = "Total",
  animate = true,
}: DonutChartProps) {
  const total = useMemo(() => data.reduce((sum, d) => sum + d.value, 0), [data]);
  
  const chartData = useMemo(() => {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    let currentOffset = 0;

    return data.map((d) => {
      const percentage = total > 0 ? d.value / total : 0;
      const dashArray = percentage * circumference;
      const dashOffset = -currentOffset;
      currentOffset += dashArray;

      return {
        ...d,
        percentage,
        dashArray: `${dashArray} ${circumference}`,
        dashOffset,
        circumference,
      };
    });
  }, [data, size, strokeWidth, total]);

  const center = size / 2;
  const radius = (size - strokeWidth) / 2;

  if (!data.length || total === 0) {
    return (
      <div className="flex items-center justify-center text-gray-400" style={{ width: size, height: size }}>
        No data
      </div>
    );
  }

  return (
    <div className="flex items-center gap-6">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          {/* Background Circle */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="#f3f4f6"
            strokeWidth={strokeWidth}
          />
          
          {/* Data Segments */}
          {chartData.map((d, i) => (
            <circle
              key={i}
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke={d.color}
              strokeWidth={strokeWidth}
              strokeDasharray={d.dashArray}
              strokeDashoffset={d.dashOffset}
              strokeLinecap="round"
              className={animate ? "transition-all duration-700 ease-out" : ""}
            />
          ))}
        </svg>

        {/* Center Text */}
        {showTotal && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold text-gray-900">{total}</span>
            <span className="text-sm text-gray-500">{totalLabel}</span>
          </div>
        )}
      </div>

      {/* Legend */}
      {showLegend && (
        <div className="space-y-2">
          {data.map((d, i) => (
            <div key={i} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: d.color }}
              />
              <span className="text-sm text-gray-600">{d.label}</span>
              <span className="text-sm font-medium text-gray-900 ml-auto">
                {d.value}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================
// STAT CARD
// ============================================

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: React.ReactNode;
  color?: "purple" | "blue" | "green" | "orange" | "red" | "yellow";
  trend?: "up" | "down" | "neutral";
  onClick?: () => void;
}

export function StatCard({
  title,
  value,
  change,
  changeLabel = "vs last period",
  icon,
  color = "purple",
  trend,
  onClick,
}: StatCardProps) {
  const colorClasses = {
    purple: "from-primary-500 to-secondary-500 shadow-[#E1E6EF]",
    blue: "from-blue-500 to-blue-600 shadow-blue-200",
    green: "from-green-500 to-green-600 shadow-green-200",
    orange: "from-orange-500 to-orange-600 shadow-orange-200",
    red: "from-red-500 to-red-600 shadow-red-200",
    yellow: "from-yellow-500 to-yellow-600 shadow-yellow-200",
  };

  const trendIcon = trend === "up" ? (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
    </svg>
  ) : trend === "down" ? (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
    </svg>
  ) : null;

  return (
    <div
      className={`bg-white rounded-2xl shadow-sm p-6 border border-gray-100 hover:shadow-lg transition-all duration-300 ${onClick ? "cursor-pointer" : ""}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 bg-linear-to-br ${colorClasses[color]} rounded-xl flex items-center justify-center shadow-lg`}>
          {icon || (
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          )}
        </div>
        {typeof change === "number" && (
          <div className={`flex items-center gap-1 text-sm font-medium px-2 py-1 rounded-full ${
            change >= 0 ? "text-green-600 bg-green-50" : "text-red-600 bg-red-50"
          }`}>
            {trendIcon}
            {change >= 0 ? "+" : ""}{change}%
          </div>
        )}
      </div>
      <h3 className="text-3xl font-bold text-gray-900 mb-1">{value}</h3>
      <p className="text-gray-500 text-sm">{title}</p>
      {changeLabel && typeof change === "number" && (
        <p className="text-xs text-gray-400 mt-2">{changeLabel}</p>
      )}
    </div>
  );
}

// ============================================
// PROGRESS BAR
// ============================================

interface ProgressBarProps {
  value: number;
  max?: number;
  color?: string;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
  animate?: boolean;
}

export function ProgressBar({
  value,
  max = 100,
  color = "#4461F2",
  showLabel = true,
  size = "md",
  animate = true,
}: ProgressBarProps) {
  const percentage = Math.min((value / max) * 100, 100);
  const heights = { sm: "h-2", md: "h-3", lg: "h-4" };

  return (
    <div className="w-full">
      <div className={`w-full bg-gray-100 rounded-full overflow-hidden ${heights[size]}`}>
        <div
          className={`h-full rounded-full ${animate ? "transition-all duration-700 ease-out" : ""}`}
          style={{ width: `${percentage}%`, backgroundColor: color }}
        />
      </div>
      {showLabel && (
        <div className="flex justify-between mt-1 text-xs text-gray-500">
          <span>{value}</span>
          <span>{percentage.toFixed(0)}%</span>
        </div>
      )}
    </div>
  );
}

export default {
  LineChart,
  BarChart,
  DonutChart,
  StatCard,
  ProgressBar,
};
