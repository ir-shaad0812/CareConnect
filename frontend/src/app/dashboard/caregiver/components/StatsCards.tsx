"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Activity,
  ClipboardCheck,
  CalendarCheck,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
} from "lucide-react";

interface StatsCardsProps {
  actionMetrics?: {
    activeBookings: number;
    pendingApprovals: number;
    todaySchedule: number;
    alerts: number;
  } | null;
}

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.04, duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
};

export default function StatsCards({ actionMetrics }: StatsCardsProps) {
  const cards: Array<{
    title: string;
    value: string;
    change: string;
    trend: "up" | "down" | "flat";
    icon: React.ElementType;
    iconBg: string;
    iconColor: string;
    href: string;
    subtitle?: string;
  }> = [
    {
      title: "Active Bookings",
      value: String(actionMetrics?.activeBookings || 0),
      change: `${actionMetrics?.activeBookings || 0}`,
      trend: "up" as const,
      icon: Activity,
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-600",
      href: "/dashboard/caregiver/my-work",
      subtitle: "Live care sessions",
    },
    {
      title: "Pending Approvals",
      value: String(actionMetrics?.pendingApprovals || 0),
      subtitle: "Requests waiting",
      change: `${actionMetrics?.pendingApprovals || 0}`,
      trend: "up" as const,
      icon: ClipboardCheck,
      iconBg: "bg-amber-50",
      iconColor: "text-amber-500",
      href: "/dashboard/caregiver/bookings",
    },
    {
      title: "Today Schedule",
      value: String(actionMetrics?.todaySchedule || 0),
      subtitle: "Care windows today",
      change: `${actionMetrics?.todaySchedule || 0}`,
      trend: "up" as const,
      icon: CalendarCheck,
      iconBg: "bg-blue-50",
      iconColor: "text-blue-500",
      href: "/dashboard/caregiver/my-work",
    },
    {
      title: "Trust Alerts",
      value: String(actionMetrics?.alerts || 0),
      subtitle: "Missed logs or disputes",
      change: `${actionMetrics?.alerts || 0}`,
      trend: (actionMetrics?.alerts || 0) > 0 ? "down" : "flat",
      icon: AlertTriangle,
      iconBg: "bg-rose-50",
      iconColor: "text-rose-500",
      href: "/dashboard/disputes",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <Link href={card.href} key={card.title}>
          <motion.div
            custom={index}
            initial="hidden"
            animate="visible"
            variants={cardVariants}
            whileHover={{ y: -2, transition: { duration: 0.2 } }}
            className="group relative bg-white rounded-2xl border border-gray-100/80 p-5 hover:shadow-lg hover:shadow-gray-100/50 transition-shadow duration-300 cursor-pointer"
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`p-2.5 rounded-xl ${card.iconBg}`}>
                <Icon size={20} className={card.iconColor} />
              </div>
              <div
                className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
                  card.trend === "up"
                    ? "text-emerald-700 bg-emerald-50"
                    : card.trend === "down"
                    ? "text-red-600 bg-red-50"
                    : card.trend === "flat"
                    ? "text-gray-500 bg-gray-50"
                    : "text-gray-500 bg-gray-50"
                }`}
              >
                {card.trend === "up" ? (
                  <TrendingUp size={12} />
                ) : card.trend === "down" ? (
                  <TrendingDown size={12} />
                ) : card.trend === "flat" ? null : null}
                {card.change}
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900 tracking-tight">{card.value}</p>
            <p className="text-sm text-gray-500 mt-0.5">{card.title}</p>
            {card.subtitle && (
              <p className="text-xs text-gray-400 mt-1">{card.subtitle}</p>
            )}

            {/* Hover arrow */}
            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <ArrowUpRight size={16} className="text-gray-400" />
            </div>
          </motion.div>
          </Link>
        );
      })}
    </div>
  );
}
