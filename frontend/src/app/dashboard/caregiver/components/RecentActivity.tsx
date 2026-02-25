"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  UserCheck,
  Mail,
  CalendarPlus,
  Star,
  DollarSign,
  FileCheck,
  Bell,
  MessageSquare,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { useCaregiverRecentActivity } from "@/hooks/useDashboardData";

const ICON_MAP: Record<string, { icon: React.ElementType; bg: string; color: string }> = {
  booking_request: { icon: CalendarPlus, bg: "bg-blue-50", color: "text-blue-500" },
  booking_confirmed: { icon: CheckCircle, bg: "bg-green-50", color: "text-green-500" },
  booking_completed: { icon: CheckCircle, bg: "bg-emerald-50", color: "text-emerald-500" },
  booking_cancelled: { icon: AlertCircle, bg: "bg-red-50", color: "text-red-500" },
  review: { icon: Star, bg: "bg-amber-50", color: "text-amber-500" },
  new_review: { icon: Star, bg: "bg-amber-50", color: "text-amber-500" },
  payment: { icon: DollarSign, bg: "bg-emerald-50", color: "text-emerald-500" },
  payment_received: { icon: DollarSign, bg: "bg-emerald-50", color: "text-emerald-500" },
  profile: { icon: UserCheck, bg: "bg-purple-50", color: "text-purple-500" },
  document: { icon: FileCheck, bg: "bg-green-50", color: "text-green-500" },
  document_verified: { icon: FileCheck, bg: "bg-green-50", color: "text-green-500" },
  message: { icon: MessageSquare, bg: "bg-blue-50", color: "text-blue-500" },
  email: { icon: Mail, bg: "bg-indigo-50", color: "text-indigo-500" },
};

const DEFAULT_ICON = { icon: Bell, bg: "bg-gray-50", color: "text-gray-500" };

const timeAgo = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

export default function RecentActivity() {
  const { data: activities = [], isLoading: loading } = useCaregiverRecentActivity(8);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100/80 p-6">
        <div className="h-5 bg-gray-200 rounded w-32 mb-5 animate-pulse" />
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="flex items-center gap-3.5 p-3 animate-pulse">
              <div className="w-9 h-9 rounded-lg bg-gray-200" />
              <div className="flex-1">
                <div className="h-3.5 bg-gray-200 rounded w-36 mb-1.5" />
                <div className="h-3 bg-gray-100 rounded w-52" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.12, duration: 0.25 }}
      className="bg-white rounded-2xl border border-gray-100/80 p-6"
    >
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-base font-semibold text-gray-900">Recent Activity</h3>
        <Link
          href="/dashboard/activity"
          className="flex items-center gap-1.5 text-xs font-medium text-[#39B54A] hover:text-[#2d913c] transition-colors"
        >
          View All
          <ArrowRight size={12} />
        </Link>
      </div>

      {activities.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No recent activity</p>
        </div>
      ) : (
        <div className="space-y-1">
          {activities.map((activity, index) => {
            const iconConfig = ICON_MAP[activity.type] || DEFAULT_ICON;
            const Icon = iconConfig.icon;
            return (
              <motion.div
                key={activity._id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.02 * index, duration: 0.15 }}
                className={`flex items-center gap-3.5 p-3 rounded-xl hover:bg-gray-50/60 transition-colors group cursor-pointer ${
                  !activity.isRead ? "bg-blue-50/30" : ""
                }`}
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${iconConfig.bg}`}>
                  <Icon size={16} className={iconConfig.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 group-hover:text-[#39B54A] transition-colors truncate">
                    {activity.title}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{activity.message}</p>
                </div>
                <span className="text-[11px] text-gray-400 shrink-0">{timeAgo(activity.time)}</span>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
