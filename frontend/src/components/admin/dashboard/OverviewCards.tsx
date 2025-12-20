"use client";

import { motion } from "framer-motion";
import { type ReactNode } from "react";

export interface OverviewMetric {
  title: string;
  value: string | number;
  icon: ReactNode;
  change: number;
  changeLabel?: string;
  iconBg: string;
  iconColor: string;
}

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
};

export default function OverviewCards({ metrics }: { metrics: OverviewMetric[] }) {
  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5"
    >
      {metrics.map((m) => (
        <motion.div
          key={m.title}
          variants={item}
          whileHover={{ y: -3, transition: { duration: 0.18 } }}
          className="group relative bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-xl hover:shadow-gray-100 hover:border-gray-200 transition-all duration-300 overflow-hidden"
        >
          {/* subtle top accent */}
          <div className="absolute inset-x-0 top-0 h-0.5 bg-linear-to-r from-transparent via-emerald-400/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

          <div className="flex items-start justify-between mb-5">
            <div className={`w-11 h-11 rounded-xl ${m.iconBg} flex items-center justify-center shadow-sm`}>
              <span className={m.iconColor}>{m.icon}</span>
            </div>
            <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${
              m.change >= 0
                ? "bg-emerald-50 text-emerald-700"
                : "bg-red-50 text-red-600"
            }`}>
              <svg
                className="w-3 h-3"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                {m.change >= 0 ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 10l4-4 4 4" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6l4 4 4-4" />
                )}
              </svg>
              <span>{m.change >= 0 ? "+" : ""}{m.change}%</span>
            </div>
          </div>

          <p className="text-sm text-gray-500 mb-1 font-medium">{m.title}</p>
          <p className="text-2xl font-bold text-gray-900 tabular-nums tracking-tight leading-none">
            {m.value}
          </p>
        </motion.div>
      ))}
    </motion.div>
  );
}
