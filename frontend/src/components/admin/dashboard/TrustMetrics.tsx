"use client";

import { motion } from "framer-motion";
import { type ReactNode } from "react";

export interface TrustMetric {
  icon: ReactNode;
  iconBg: string;
  value: string;
  label: string;
  sublabel?: string;
  change?: string;
}

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const item = {
  hidden: { opacity: 0, scale: 0.94, y: 10 },
  show: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
};

export default function TrustMetrics({ metrics }: { metrics: TrustMetric[] }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center">
          <svg className="w-4 h-4 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        <h3 className="text-base font-semibold text-gray-900">Trust & Transparency</h3>
      </div>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4"
      >
        {metrics.map((m) => (
          <motion.div
            key={m.label}
            variants={item}
            whileHover={{ y: -2, transition: { duration: 0.18 } }}
            className="relative bg-white rounded-2xl border border-gray-100 p-5 text-center hover:shadow-lg hover:shadow-gray-100 hover:border-gray-200 transition-all duration-300 overflow-hidden"
          >
            <div className={`w-12 h-12 rounded-xl ${m.iconBg} flex items-center justify-center mx-auto mb-3 shadow-sm`}>
              {m.icon}
            </div>
            <p className="text-2xl font-bold text-gray-900 tabular-nums leading-none mb-1">{m.value}</p>
            <p className="text-sm font-medium text-gray-600 mt-1">{m.label}</p>
            {m.sublabel && <p className="text-xs text-gray-400 mt-0.5">{m.sublabel}</p>}
            {m.change && (
              <p className="text-xs font-semibold text-emerald-600 mt-2.5 inline-flex items-center gap-1">
                <svg className="w-3 h-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 10l4-4 4 4" />
                </svg>
                {m.change}
              </p>
            )}
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
