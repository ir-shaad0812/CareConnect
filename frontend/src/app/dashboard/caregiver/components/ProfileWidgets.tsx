"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import SafeAvatar from "./SafeAvatar";
import {
  CheckCircle2,
  AlertCircle,
  Shield,
  Award,
  ExternalLink,
  ChevronRight,
  Calendar,
  Clock,
  Star,
  Zap,
  Bell,
  StickyNote,
  AlertTriangle,
  Info,
  Megaphone,
} from "lucide-react";
import {
  useRecentNotices,
  useRecentNotes,
  type CaregiverActionItem,
} from "@/hooks/useDashboardData";

interface ProfileWidgetProps {
  user?: {
    fullName?: string;
    email?: string;
    avatar?: string;
    hourlyRate?: number;
    dailyRate?: number;
    experience?: number;
    isEmailVerified?: boolean;
    serviceTypes?: string[];
  } | null;
  stats?: {
    completionPercentage: number;
    rating: number;
    totalReviews: number;
    featured: boolean;
    backgroundCheck: {
      status: string;
    };
    ratingBreakdown: {
      punctuality: number;
      professionalism: number;
      communication: number;
      qualityOfCare: number;
      valueForMoney: number;
    };
  } | null;
  realtimeConnected?: boolean;
}

export function ProfileCard({ user, stats, realtimeConnected = false }: ProfileWidgetProps) {
  const completion = stats?.completionPercentage || 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, duration: 0.25 }}
      className="bg-white rounded-2xl border border-gray-100/80 overflow-hidden"
    >
      {/* Green gradient header */}
      <div className="h-20 bg-linear-to-r from-[#39B54A] to-[#59B966] relative">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20viewBox%3D%220%200%2020%2020%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.05%22%3E%3Ccircle%20cx%3D%2210%22%20cy%3D%2210%22%20r%3D%222%22%2F%3E%3C%2Fg%3E%3C%2Fsvg%3E')]" />
      </div>

      {/* Profile Info */}
      <div className="px-5 pb-5 -mt-8 relative">
        <div className="relative inline-block">
          <SafeAvatar
            src={user?.avatar ?? null}
            name={user?.fullName || "Caregiver"}
            size={64}
            wrapperClassName="rounded-xl ring-4 ring-white shadow-md"
            fallbackClassName="bg-linear-to-br from-[#39B54A] to-primary-600 text-white text-xl font-bold rounded-xl"
          />
          {user?.isEmailVerified && (
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center ring-2 ring-white">
              <CheckCircle2 size={12} className="text-white" />
            </div>
          )}
        </div>

        <div className="mt-3">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-gray-900">{user?.fullName || "Caregiver"}</h3>
            {stats?.featured && (
              <span className="px-1.5 py-0.5 text-[10px] font-bold bg-amber-50 text-amber-600 rounded-md flex items-center gap-0.5">
                <Zap size={10} /> Featured
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-0.5">{user?.email}</p>
          <div
            className={`mt-1.5 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
              realtimeConnected
                ? "bg-emerald-50 text-emerald-700"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                realtimeConnected ? "bg-emerald-500" : "bg-gray-400"
              }`}
            />
            {realtimeConnected ? "Online" : "Offline"}
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-3 mt-4 py-3 border-y border-gray-100">
          <div className="text-center">
            <p className="text-sm font-bold text-gray-900">{stats?.rating?.toFixed(1) || "0.0"}</p>
            <p className="text-[10px] text-gray-500">Rating</p>
          </div>
          <div className="text-center border-x border-gray-100">
            <p className="text-sm font-bold text-gray-900">{user?.experience || 0}</p>
            <p className="text-[10px] text-gray-500">Yrs Exp</p>
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-gray-900">${user?.hourlyRate || 0}</p>
            <p className="text-[10px] text-gray-500">Per Hour</p>
          </div>
        </div>

        {/* Profile Completion */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-600">Profile Completion</span>
            <span className="text-xs font-bold text-gray-900">{completion}%</span>
          </div>
          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${completion}%` }}
              transition={{ delay: 0.2, duration: 0.25, ease: "easeOut" }}
              className={`h-full rounded-full ${
                completion >= 80
                  ? "bg-[#39B54A]"
                  : completion >= 50
                  ? "bg-amber-400"
                  : "bg-red-400"
              }`}
            />
          </div>
          {completion < 100 && (
            <p className="text-[11px] text-gray-400 mt-1.5">
              Complete your profile to get more bookings
            </p>
          )}
        </div>

        <Link
          href="/profile/caregiver"
          className="mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors text-sm font-medium"
        >
          Edit Profile
          <ExternalLink size={14} />
        </Link>
      </div>
    </motion.div>
  );
}

export function VerificationWidget({ stats }: { stats?: ProfileWidgetProps["stats"] }) {
  const bgStatus = stats?.backgroundCheck?.status || "not_started";

  const statusConfig: Record<string, { icon: React.ElementType; label: string; color: string; bg: string }> = {
    not_started: { icon: AlertCircle, label: "Not Started", color: "text-gray-500", bg: "bg-gray-50" },
    in_progress: { icon: Clock, label: "In Progress", color: "text-amber-600", bg: "bg-amber-50" },
    passed: { icon: Shield, label: "Verified", color: "text-emerald-600", bg: "bg-emerald-50" },
    failed: { icon: AlertCircle, label: "Failed", color: "text-red-600", bg: "bg-red-50" },
  };

  const current = statusConfig[bgStatus] || statusConfig.not_started;
  const StatusIcon = current.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.14, duration: 0.25 }}
      className="bg-white rounded-2xl border border-gray-100/80 p-5"
    >
      <h3 className="text-sm font-semibold text-gray-900 mb-3">Verification Status</h3>
      <div className="space-y-2.5">
        <div className={`flex items-center gap-3 p-3 rounded-xl ${current.bg}`}>
          <StatusIcon size={18} className={current.color} />
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900">Background Check</p>
            <p className={`text-xs ${current.color}`}>{current.label}</p>
          </div>
          <ChevronRight size={14} className="text-gray-400" />
        </div>

        <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50">
          <CheckCircle2 size={18} className="text-emerald-600" />
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900">Email Verified</p>
            <p className="text-xs text-emerald-600">Confirmed</p>
          </div>
        </div>

        <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
          <Award size={18} className="text-gray-400" />
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900">ID Verification</p>
            <p className="text-xs text-gray-500">Not started</p>
          </div>
          <ChevronRight size={14} className="text-gray-400" />
        </div>
      </div>
    </motion.div>
  );
}

export function UpcomingSchedule() {
  const scheduleItems = [
    { time: "9:00 AM", title: "Morning Care - Thompson", type: "Elderly Care", duration: "4h", color: "bg-[#39B54A]" },
    { time: "2:00 PM", title: "Child Pickup - Martinez", type: "Child Care", duration: "2h", color: "bg-blue-500" },
    { time: "5:00 PM", title: "Evening Care - Williams", type: "Special Needs", duration: "3h", color: "bg-purple-500" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.16, duration: 0.25 }}
      className="bg-white rounded-2xl border border-gray-100/80 p-5"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900">Today&apos;s Schedule</h3>
        <Link
          href="/dashboard/caregiver/availability"
          className="text-xs font-medium text-[#39B54A] hover:text-primary-600"
        >
          View Calendar
        </Link>
      </div>

      <div className="space-y-3">
        {scheduleItems.map((item, index) => (
          <div key={index} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
              {index < scheduleItems.length - 1 && (
                <div className="w-px h-full bg-gray-200 my-1" />
              )}
            </div>
            <div className="flex-1 pb-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">{item.time}</p>
                <span className="text-[10px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">{item.duration}</span>
              </div>
              <p className="text-sm font-semibold text-gray-900 mt-0.5">{item.title}</p>
              <p className="text-xs text-gray-500">{item.type}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-2 pt-3 border-t border-gray-100">
        <p className="text-[11px] text-gray-400 text-center">
          3 appointments today · 9 hours total
        </p>
      </div>
    </motion.div>
  );
}

const getSeverityStyles = (severity: CaregiverActionItem["severity"]) => {
  if (severity === "critical") {
    return "bg-red-50 border-red-100 text-red-700";
  }
  if (severity === "warning") {
    return "bg-amber-50 border-amber-100 text-amber-700";
  }
  return "bg-emerald-50 border-emerald-100 text-emerald-700";
};

const getActionHref = (item: CaregiverActionItem): string => {
  if (item.type === "pending_approval") {
    return "/dashboard/caregiver/bookings";
  }

  if (item.type === "dispute") {
    return `/dashboard/bookings/${item.bookingId}`;
  }

  return `/dashboard/caregiver/my-work?bookingId=${item.bookingId}`;
};

export function TodayTasksWidget({ items }: { items: CaregiverActionItem[] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.165, duration: 0.25 }}
      className="bg-white rounded-2xl border border-gray-100/80 p-5"
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900">Today&apos;s Tasks</h3>
        <Link
          href="/dashboard/caregiver/my-work"
          className="text-[11px] text-[#39B54A] hover:underline font-medium"
        >
          Open My Work
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100">
          <p className="text-xs font-medium text-emerald-700">No urgent task for today</p>
          <p className="text-[11px] text-emerald-600 mt-1">You are all caught up.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.slice(0, 4).map((item) => (
            <Link
              key={item.id}
              href={getActionHref(item)}
              className={`block p-3 rounded-xl border transition-colors hover:bg-gray-50 ${getSeverityStyles(item.severity)}`}
            >
              <p className="text-xs font-semibold">{item.title}</p>
              <p className="text-[11px] mt-0.5 opacity-85">{item.subtitle}</p>
            </Link>
          ))}
        </div>
      )}
    </motion.div>
  );
}

export function PendingActionsWidget({ items }: { items: CaregiverActionItem[] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.17, duration: 0.25 }}
      className="bg-white rounded-2xl border border-gray-100/80 p-5"
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900">Pending Actions</h3>
        <span className="text-[11px] text-gray-500">{items.length} open</span>
      </div>

      {items.length === 0 ? (
        <p className="text-xs text-gray-400 py-2">No pending actions</p>
      ) : (
        <div className="space-y-2">
          {items.slice(0, 5).map((item) => (
            <Link
              key={item.id}
              href={getActionHref(item)}
              className="block p-3 rounded-xl border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold text-gray-800">{item.title}</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">{item.subtitle}</p>
                </div>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    item.severity === "critical"
                      ? "bg-red-100 text-red-700"
                      : item.severity === "warning"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-emerald-100 text-emerald-700"
                  }`}
                >
                  {item.severity}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </motion.div>
  );
}

export function RatingBreakdown({ stats }: { stats?: ProfileWidgetProps["stats"] }) {
  if (!stats || (stats.totalReviews ?? 0) === 0) return null;

  const categories = [
    { label: "Punctuality", value: stats.ratingBreakdown?.punctuality || 0, icon: Clock },
    { label: "Professionalism", value: stats.ratingBreakdown?.professionalism || 0, icon: Award },
    { label: "Communication", value: stats.ratingBreakdown?.communication || 0, icon: Star },
    { label: "Quality of Care", value: stats.ratingBreakdown?.qualityOfCare || 0, icon: CheckCircle2 },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.18, duration: 0.25 }}
      className="bg-white rounded-2xl border border-gray-100/80 p-5"
    >
      <h3 className="text-sm font-semibold text-gray-900 mb-4">Performance Ratings</h3>
      <div className="space-y-3">
        {categories.map((cat) => {
          const Icon = cat.icon;
          const pct = (cat.value / 5) * 100;
          return (
            <div key={cat.label} className="flex items-center gap-3">
              <Icon size={14} className="text-gray-400 shrink-0" />
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-600">{cat.label}</span>
                  <span className="text-xs font-bold text-gray-900">{cat.value.toFixed(1)}</span>
                </div>
                <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ delay: 0.24, duration: 0.25 }}
                    className="h-full rounded-full bg-linear-to-r from-[#39B54A] to-[#59B966]"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────
// NOTICES WIDGET
// ─────────────────────────────────────────────

const NOTICE_ICON: Record<string, React.ElementType> = {
  urgent: AlertTriangle,
  warning: AlertTriangle,
  info: Info,
  announcement: Megaphone,
  normal: Bell,
};
const NOTICE_COLOR: Record<string, string> = {
  urgent: "text-red-600",
  warning: "text-amber-600",
  info: "text-blue-600",
  announcement: "text-purple-600",
  normal: "text-gray-500",
};

export function NoticesWidget() {
  const { data: notices = [], isLoading: loading } = useRecentNotices(4);

  const unreadCount = notices.filter(n => !n.isRead).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.22, duration: 0.25 }}
      className="bg-white rounded-2xl border border-gray-100/80 p-5"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Bell size={16} className="text-[#39B54A]" />
          <h3 className="text-sm font-semibold text-gray-900">Notice Board</h3>
          {unreadCount > 0 && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-500 text-white min-w-4 text-center">
              {unreadCount}
            </span>
          )}
        </div>
        <Link href="/notices" className="text-[11px] text-[#39B54A] hover:underline font-medium">View All</Link>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2].map(i => (
            <div key={i} className="animate-pulse h-10 bg-gray-100 rounded-lg" />
          ))}
        </div>
      ) : notices.length === 0 ? (
        <p className="text-xs text-gray-400 text-center py-4">No notices</p>
      ) : (
        <div className="space-y-2">
          {notices.slice(0, 3).map(n => {
            const Icon = NOTICE_ICON[n.type] ?? Bell;
            return (
              <Link
                key={n._id}
                href="/notices"
                className={`flex items-start gap-2 p-2.5 rounded-xl hover:bg-gray-50 transition-colors ${!n.isRead ? "bg-green-50/50" : ""}`}
              >
                <Icon size={14} className={`shrink-0 mt-0.5 ${NOTICE_COLOR[n.type] ?? "text-gray-400"}`} />
                <div className="min-w-0">
                  <p className={`text-xs leading-snug truncate ${!n.isRead ? "font-semibold text-gray-900" : "text-gray-700"}`}>
                    {n.title}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    {new Date(n.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </p>
                </div>
                {!n.isRead && <span className="w-1.5 h-1.5 rounded-full bg-[#39B54A] shrink-0 mt-1.5 ml-auto" />}
              </Link>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

// ─────────────────────────────────────────────
// NOTES WIDGET
// ─────────────────────────────────────────────

export function NotesWidget() {
  const { data: notes = [], isLoading: loading } = useRecentNotes(4);

  const TAG_COLOR: Record<string, string> = {
    important: "bg-red-50 text-red-600",
    medical: "bg-emerald-50 text-emerald-600",
    "follow-up": "bg-amber-50 text-amber-600",
    general: "bg-gray-50 text-gray-500",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.24, duration: 0.25 }}
      className="bg-white rounded-2xl border border-gray-100/80 p-5"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <StickyNote size={16} className="text-[#39B54A]" />
          <h3 className="text-sm font-semibold text-gray-900">My Notes</h3>
        </div>
        <Link href="/dashboard/caregiver/notes" className="text-[11px] text-[#39B54A] hover:underline font-medium">
          View All
        </Link>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2].map(i => <div key={i} className="animate-pulse h-10 bg-gray-100 rounded-lg" />)}
        </div>
      ) : notes.length === 0 ? (
        <Link
          href="/dashboard/caregiver/notes"
          className="flex flex-col items-center gap-1 py-4 text-center hover:bg-gray-50 rounded-xl transition-colors"
        >
          <StickyNote size={20} className="text-gray-300" />
          <p className="text-xs text-gray-400">No notes yet</p>
          <p className="text-[11px] text-[#39B54A] font-medium">+ Create Note</p>
        </Link>
      ) : (
        <div className="space-y-2">
          {notes.slice(0, 3).map(n => (
            <Link
              key={n._id}
              href="/dashboard/caregiver/notes"
              className="flex items-start gap-2 p-2.5 rounded-xl hover:bg-gray-50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-800 truncate">{n.title}</p>
                <p className="text-[10px] text-gray-400 mt-0.5 truncate">{n.content}</p>
              </div>
              {n.tag && (
                <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${TAG_COLOR[n.tag] ?? TAG_COLOR.general}`}>
                  {n.tag}
                </span>
              )}
            </Link>
          ))}
        </div>
      )}
    </motion.div>
  );
}

// ─────────────────────────────────────────────

export function QuickActions() {
  const actions = [
    { icon: Calendar, label: "Set Availability", href: "/dashboard/caregiver/availability", color: "bg-blue-50 text-blue-600" },
    { icon: Star, label: "Update Rates", href: "/dashboard/caregiver/rates", color: "bg-amber-50 text-amber-600" },
    { icon: Shield, label: "Upload Documents", href: "/dashboard/caregiver/documents", color: "bg-purple-50 text-purple-600" },
    { icon: Zap, label: "Boost Profile", href: "/profile/caregiver", color: "bg-emerald-50 text-emerald-600" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.25 }}
      className="bg-white rounded-2xl border border-gray-100/80 p-5"
    >
      <h3 className="text-sm font-semibold text-gray-900 mb-3">Quick Actions</h3>
      <div className="grid grid-cols-2 gap-2">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.label}
              href={action.href}
              className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-gray-50 transition-colors group"
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${action.color}`}>
                <Icon size={18} />
              </div>
              <span className="text-[11px] font-medium text-gray-600 group-hover:text-gray-900 text-center leading-tight">
                {action.label}
              </span>
            </Link>
          );
        })}
      </div>
    </motion.div>
  );
}
