"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type TrendDirection = "up" | "down" | "neutral";

export type DashboardCardMetric = {
  title: string;
  value: string | number;
  icon: ReactNode;
  trend?: {
    direction: TrendDirection;
    value: number;
    label?: string;
  };
  href?: string;
  onClick?: () => void;
};

function TrendPill({ trend }: { trend: NonNullable<DashboardCardMetric["trend"]> }) {
  const styles =
    trend.direction === "up"
      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
      : trend.direction === "down"
      ? "bg-rose-50 text-rose-700 border border-rose-200"
      : "bg-slate-50 text-slate-700 border border-slate-200";

  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold", styles)}>
      {trend.direction === "up" ? (
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 14l4-4 4 4" />
        </svg>
      ) : trend.direction === "down" ? (
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 10l-4 4-4-4" />
        </svg>
      ) : (
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
        </svg>
      )}
      {trend.direction === "neutral" ? "" : trend.direction === "up" ? "+" : "-"}
      {Math.abs(trend.value)}%
      {trend.label ? <span className="opacity-70 ml-1">{trend.label}</span> : null}
    </span>
  );
}

function CardInner({ metric }: { metric: DashboardCardMetric }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      whileHover={{ y: -3 }}
      className={cn(
        "group bg-white rounded-2xl shadow-sm border border-slate-200",
        "hover:shadow-md transition-shadow duration-200"
      )}
    >
      <div className="p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-sm flex items-center justify-center shrink-0">
              {metric.icon}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-600 truncate">{metric.title}</p>
              {metric.trend ? (
                <div className="mt-2">
                  <TrendPill trend={metric.trend} />
                </div>
              ) : null}
            </div>
          </div>
        </div>
        <div className="flex items-end justify-between gap-4">
          <div className="text-3xl font-bold text-slate-900 tabular-nums">{metric.value}</div>
          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
            <svg className="w-4 h-4 text-emerald-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function DashboardCards({ metrics }: { metrics: DashboardCardMetric[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {metrics.map((metric, idx) => {
        const content = <CardInner key={`${metric.title}-${idx}`} metric={metric} />;
        if (metric.href) {
          return (
            <Link key={`${metric.title}-${idx}`} href={metric.href} aria-label={metric.title} className="block">
              {content}
            </Link>
          );
        }
        if (metric.onClick) {
          return (
            <button
              key={`${metric.title}-${idx}`}
              type="button"
              onClick={metric.onClick}
              className="block w-full text-left"
            >
              {content}
            </button>
          );
        }
        return content;
      })}
    </div>
  );
}

