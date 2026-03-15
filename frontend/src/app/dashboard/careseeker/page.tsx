"use client";

import React, { useEffect, useState, useMemo } from "react";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { useProfileCompletion } from "@/hooks/useProfileCompletion";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import {
  Calendar,
  Users,
  CheckCircle,
  DollarSign,
  Search,
  HelpCircle,
  ArrowRight,
  ArrowUpRight,
  AlertTriangle,
  TrendingUp,
  ExternalLink,
  Bell,
  StickyNote,
  Info,
  Megaphone,
} from "lucide-react";
import { authService } from "@/modules/auth/services";
import { useAuthContext } from "@/context/AuthContext";
import type {
  Booking,
  BookingStatsResponse,
} from "@/modules/booking/services";
import type { ActivityItem as DashboardActivityItem } from "@/services/api/dashboard.service";
import {
  useCareseekerBookings,
  useCareseekerStats,
  useCareseekerSpending,
  useCareseekerServiceDistribution,
  useCareseekerRecentActivity,
  useRecentNotices,
  useRecentNotes,
} from "@/hooks/useDashboardData";
import { useRealtimeDashboard } from "@/hooks/useRealtimeBooking";
import {
  UpcomingBookingCard,
  BookingHistoryTable,
  LiveActivityFeed,
  SpendingChart,
  CaregiverDistribution,
  type UpcomingBooking,
  type BookingHistoryItem,
  type ActivityItem,
} from "@/components/ui";
import { CareSeekerSidebar, CareSeekerTopBar } from "./components";
import RealTimeIndicator from "../caregiver/components/RealTimeIndicator";

// ─── Dynamic imports for heavy components ─────────────────────────────────────
const CareCalendar = dynamic(
  () =>
    import("@/components/ui/CareCalendar").then((mod) => ({
      default: mod.CareCalendar,
    })),
  {
    loading: () => <div className="h-80 bg-white rounded-2xl animate-pulse" />,
  },
);

// ─── Animation variants ────────────────────────────────────────────────────────
const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.04,
      duration: 0.2,
      ease: [0.25, 0.46, 0.45, 0.94] as const,
    },
  }),
};

// ─── Helpers ───────────────────────────────────────────────────────────────────
const toSafeDate = (value?: string | number | Date | null): Date | null => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatServiceType = (type?: string): string => {
  const normalized =
    typeof type === "string" && type.trim().length > 0
      ? type
      : "care_service";

  return normalized
    .replace(/_/g, " ")
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
};

const formatDate = (dateString?: string): string => {
  const date = toSafeDate(dateString);
  if (!date) return "TBD";
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const formatTime = (dateString?: string): string => {
  const date = toSafeDate(dateString);
  if (!date) return "TBD";
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

// ─── Types ─────────────────────────────────────────────────────────────────────
interface UserProfile {
  _id: string;
  fullName: string;
  email: string;
  avatar?: string;
  role: string;
  completionPercentage?: number;
  isEmailVerified?: boolean;
  createdAt?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// WELCOME BANNER  (careseeker-specific)
// ─────────────────────────────────────────────────────────────────────────────
interface WelcomeBannerProps {
  userName?: string;
  completionPercentage?: number;
}

function CareSeekerWelcomeBanner({
  userName,
  completionPercentage: propPct = 0,
}: WelcomeBannerProps) {
  const firstName = userName?.split(" ")[0] || "there";
  const greeting = getGreeting();
  // Real-time profile completion — socket value takes precedence over prop
  const livePct = useProfileCompletion();
  const completionPercentage = livePct || propPct;
  const profileProgress = Math.max(0, Math.min(100, completionPercentage));

  return (
    <div className="space-y-4">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
          {greeting}, {firstName}! 👋
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Here&apos;s what&apos;s happening with your care services today.
        </p>
      </motion.div>

      {completionPercentage < 100 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05, duration: 0.2 }}
          className="rounded-2xl border border-[#DCEFE0] bg-white px-5 py-4 shadow-sm"
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-[#39B54A]">
                <AlertTriangle size={18} />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-semibold text-gray-900">
                  Complete your profile
                  <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-[#39B54A]">
                    {profileProgress}%
                  </span>
                </p>
                <p className="text-xs text-gray-600">
                  Complete profiles attract better caregivers faster.
                </p>
                <div className="h-2 w-full max-w-xs overflow-hidden rounded-full bg-gray-100">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${profileProgress}%` }}
                    transition={{ delay: 0.15, duration: 0.35, ease: "easeOut" }}
                    className="h-full rounded-full bg-linear-to-r from-[#39B54A] to-[#59B966]"
                  />
                </div>
              </div>
            </div>
            <div>
              <Link
                href="/profile"
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#39B54A] px-4 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-primary-600"
              >
                Complete Now
                <ArrowRight size={12} />
              </Link>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STATS CARDS  (4 cards — staggered animation matching caregiver StatsCards)
// ─────────────────────────────────────────────────────────────────────────────
interface StatsCardsProps {
  totalBookings: number;
  activeCaregiversCount: number;
  completionRate: number;
  totalSpent: number;
}

function CareSeekerStatsCards({
  totalBookings,
  activeCaregiversCount,
  completionRate,
  totalSpent,
}: StatsCardsProps) {
  const cards = [
    {
      title: "Total Bookings",
      value: String(totalBookings),
      displayValue: String(totalBookings),
      subtitle: "All time bookings",
      icon: Calendar,
      iconBg: "bg-blue-50",
      iconColor: "text-blue-600",
      href: "/dashboard/bookings",
    },
    {
      title: "Active Caregivers",
      value: String(activeCaregiversCount),
      displayValue: String(activeCaregiversCount),
      subtitle: "Currently engaged",
      icon: Users,
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-600",
      href: "/caregivers",
    },
    {
      title: "Completion Rate",
      value: `${completionRate}%`,
      displayValue: `${completionRate}%`,
      subtitle: "Successfully completed",
      icon: CheckCircle,
      iconBg: "bg-amber-50",
      iconColor: "text-amber-500",
      href: "/dashboard/bookings",
    },
    {
      title: "Total Spending",
      value: `Rs. ${totalSpent.toLocaleString()}`,
      displayValue: `Rs. ${totalSpent.toLocaleString()}`,
      subtitle: "Across all services",
      icon: DollarSign,
      iconBg: "bg-purple-50",
      iconColor: "text-purple-600",
      href: "/dashboard/payments",
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
              <div className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full text-emerald-700 bg-emerald-50">
                <TrendingUp size={12} />
                {card.value}
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900 tracking-tight">
              {card.displayValue}
            </p>
            <p className="text-sm text-gray-500 mt-0.5">{card.title}</p>
            <p className="text-xs text-gray-400 mt-1">{card.subtitle}</p>
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

// ─────────────────────────────────────────────────────────────────────────────
// CARESEEKER PROFILE CARD  (right sidebar)
// ─────────────────────────────────────────────────────────────────────────────
interface ProfileCardProps {
  user: UserProfile | null;
  totalBookings: number;
  totalSpent: number;
  activeCaregiversCount: number;
  realtimeConnected: boolean;
}

function CareSeekerProfileCard({
  user,
  totalBookings,
  totalSpent,
  activeCaregiversCount,
  realtimeConnected,
}: ProfileCardProps) {
  const completion = Math.max(0, Math.min(100, user?.completionPercentage ?? 0));

  const completionTone =
    completion >= 80
      ? {
          bar: "bg-linear-to-r from-[#39B54A] via-[#54C46A] to-[#6CD17E]",
          badge: "bg-emerald-50 text-emerald-700",
          hint: "Great profile strength",
        }
      : completion >= 50
        ? {
            bar: "bg-linear-to-r from-amber-400 to-amber-500",
            badge: "bg-amber-50 text-amber-700",
            hint: "Almost there",
          }
        : {
            bar: "bg-linear-to-r from-rose-400 to-rose-500",
            badge: "bg-rose-50 text-rose-700",
            hint: "Needs attention",
          };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, duration: 0.25 }}
      className="bg-white rounded-2xl border border-gray-100/80 overflow-hidden"
    >
      {/* Gradient header */}
      <div className="h-20 bg-linear-to-r from-[#39B54A] to-[#59B966] relative">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20viewBox%3D%220%200%2020%2020%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.05%22%3E%3Ccircle%20cx%3D%2210%22%20cy%3D%2210%22%20r%3D%222%22%2F%3E%3C%2Fg%3E%3C%2Fsvg%3E')]" />
      </div>

      {/* Profile body */}
      <div className="px-5 pb-5 -mt-8 relative">
        {/* Avatar */}
        <div className="relative inline-block">
          {user?.avatar ? (
            <Image
              src={user.avatar}
              alt={user.fullName || "User"}
              width={64}
              height={64}
              className="rounded-xl object-cover ring-4 ring-white shadow-md"
            />
          ) : (
            <div className="w-16 h-16 bg-linear-to-br from-[#39B54A] to-[#59B966] rounded-xl flex items-center justify-center text-white text-xl font-bold ring-4 ring-white shadow-md">
              {user?.fullName?.charAt(0)?.toUpperCase() ?? "S"}
            </div>
          )}
          {/* Realtime connection indicator */}
          <span
            className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 border-2 border-white rounded-full ${
              realtimeConnected ? "bg-emerald-500" : "bg-gray-300"
            }`}
          />
        </div>

        {/* Name + role */}
        <div className="mt-3">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base font-bold text-gray-900">
              {user?.fullName ?? "Care Seeker"}
            </h3>
            <span className="px-1.5 py-0.5 text-[10px] font-bold bg-blue-50 text-blue-600 rounded-md">
              Seeker
            </span>
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
          {user?.createdAt && (
            <p className="text-[11px] text-gray-400 mt-0.5">
              Member since{" "}
              {new Date(user.createdAt).toLocaleDateString("en-US", {
                month: "short",
                year: "numeric",
              })}
            </p>
          )}
        </div>

        {/* Quick stats row */}
        <div className="grid grid-cols-3 gap-3 mt-4 py-3 border-y border-gray-100">
          <div className="text-center">
            <p className="text-sm font-bold text-gray-900">{totalBookings}</p>
            <p className="text-[10px] text-gray-500">Bookings</p>
          </div>
          <div className="text-center border-x border-gray-100">
            <p className="text-sm font-bold text-gray-900 truncate">
              Rs.
              {totalSpent > 999
                ? `${(totalSpent / 1000).toFixed(1)}k`
                : totalSpent.toLocaleString()}
            </p>
            <p className="text-[10px] text-gray-500">Spent</p>
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-gray-900">
              {activeCaregiversCount}
            </p>
            <p className="text-[10px] text-gray-500">Active CGs</p>
          </div>
        </div>

        {/* Care Plan Completion progress */}
        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className="text-xs font-medium text-gray-600 tracking-wide">
              Care Plan Completion
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${completionTone.badge}`}
            >
              {completion}%
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${completion}%` }}
              transition={{ delay: 0.3, duration: 0.6, ease: "easeOut" }}
              className={`h-full rounded-full ${completionTone.bar}`}
            />
          </div>
          <p className="mt-1.5 text-[11px] text-gray-500">{completionTone.hint}</p>
          {completion < 100 && (
            <p className="text-[11px] text-gray-400 mt-1.5">
              Complete your profile to attract top caregivers
            </p>
          )}
        </div>

        <Link
          href="/profile"
          className="mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors text-sm font-medium"
        >
          View Profile
          <ExternalLink size={14} />
        </Link>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// UPCOMING SESSIONS WIDGET  (careseeker — shows next confirmed/pending bookings)
// ─────────────────────────────────────────────────────────────────────────────
interface ScheduleWidgetProps {
  bookings: Booking[];
}

const SERVICE_COLOR_MAP: Record<string, string> = {
  elderly_care: "bg-blue-500",
  child_care: "bg-purple-500",
  disability_care: "bg-amber-500",
  post_surgery: "bg-rose-500",
  companionship: "bg-cyan-500",
  special_needs: "bg-indigo-500",
};

function CareSeekerScheduleWidget({ bookings }: ScheduleWidgetProps) {
  const upcoming = bookings
    .filter(
      (b) =>
        Boolean(b.schedule?.startDate) &&
        (b.status === "confirmed" ||
          b.status === "pending" ||
          b.status === "in_progress"),
    )
    .slice(0, 3);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.14, duration: 0.25 }}
      className="bg-white rounded-2xl border border-gray-100/80 p-5"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900">
          Upcoming Sessions
        </h3>
        <Link
          href="/dashboard/bookings"
          className="text-xs font-medium text-[#39B54A] hover:text-primary-600"
        >
          View All
        </Link>
      </div>

      {upcoming.length === 0 ? (
        <div className="flex flex-col items-center gap-1.5 py-5 text-center">
          <Calendar size={22} className="text-gray-300" />
          <p className="text-xs text-gray-400">No upcoming sessions</p>
          <Link
            href="/caregivers"
            className="text-[11px] text-[#39B54A] font-medium hover:underline"
          >
            + Find a Caregiver
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {upcoming.map((b, index) => {
            const dotColor = SERVICE_COLOR_MAP[b.serviceType] ?? "bg-[#39B54A]";
            const cgName =
              b.caregiverId != null && typeof b.caregiverId === "object"
                ? b.caregiverId.fullName || "Caregiver"
                : "Caregiver";
            return (
              <div key={b._id} className="flex gap-3">
                <div className="flex flex-col items-center pt-1">
                  <div
                    className={`w-2.5 h-2.5 rounded-full shrink-0 ${dotColor}`}
                  />
                  {index < upcoming.length - 1 && (
                    <div className="w-px flex-1 bg-gray-200 my-1" />
                  )}
                </div>
                <div className="flex-1 pb-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                      {formatDate(b.schedule?.startDate)}
                    </p>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded bg-gray-50 capitalize ${
                        b.status === "in_progress"
                          ? "text-[#39B54A] font-semibold"
                          : "text-gray-400"
                      }`}
                    >
                      {b.status === "in_progress" ? "Active" : b.status}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-gray-900 mt-0.5">
                    {formatServiceType(b.serviceType)}
                  </p>
                  <p className="text-xs text-gray-500">{cgName}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {upcoming.length > 0 && (
        <div className="mt-1 pt-3 border-t border-gray-100">
          <p className="text-[11px] text-gray-400 text-center">
            {upcoming.length} session{upcoming.length !== 1 ? "s" : ""}{" "}
            scheduled
          </p>
        </div>
      )}
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// NOTICE BOARD WIDGET  (reuse caregiver NoticesWidget pattern, careseeker paths)
// ─────────────────────────────────────────────────────────────────────────────
const NOTICE_ICON_MAP: Record<string, React.ElementType> = {
  urgent: AlertTriangle,
  warning: AlertTriangle,
  info: Info,
  announcement: Megaphone,
  normal: Bell,
};

const NOTICE_COLOR_MAP: Record<string, string> = {
  urgent: "text-red-600",
  warning: "text-amber-600",
  info: "text-blue-600",
  announcement: "text-purple-600",
  normal: "text-gray-500",
};

function CareSeekerNoticesWidget() {
  const { data: notices = [], isLoading: loading } = useRecentNotices(4);
  const unreadCount = notices.filter((n) => !n.isRead).length;

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
        <Link
          href="/notices"
          className="text-[11px] text-[#39B54A] hover:underline font-medium"
        >
          View All
        </Link>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="animate-pulse h-10 bg-gray-100 rounded-lg"
            />
          ))}
        </div>
      ) : notices.length === 0 ? (
        <p className="text-xs text-gray-400 text-center py-4">No notices</p>
      ) : (
        <div className="space-y-2">
          {notices.slice(0, 3).map((n) => {
            const Icon = NOTICE_ICON_MAP[n.type] ?? Bell;
            return (
              <Link
                key={n._id}
                href="/notices"
                className={`flex items-start gap-2 p-2.5 rounded-xl hover:bg-gray-50 transition-colors ${
                  !n.isRead ? "bg-green-50/50" : ""
                }`}
              >
                <Icon
                  size={14}
                  className={`shrink-0 mt-0.5 ${
                    NOTICE_COLOR_MAP[n.type] ?? "text-gray-400"
                  }`}
                />
                <div className="min-w-0">
                  <p
                    className={`text-xs leading-snug truncate ${
                      !n.isRead
                        ? "font-semibold text-gray-900"
                        : "text-gray-700"
                    }`}
                  >
                    {n.title}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    {new Date(n.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>
                {!n.isRead && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#39B54A] shrink-0 mt-1.5 ml-auto" />
                )}
              </Link>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MY NOTES WIDGET  (reuse caregiver NotesWidget pattern, careseeker paths)
// ─────────────────────────────────────────────────────────────────────────────
const TAG_COLOR: Record<string, string> = {
  important: "bg-red-50 text-red-600",
  medical: "bg-emerald-50 text-emerald-600",
  "follow-up": "bg-amber-50 text-amber-600",
  general: "bg-gray-50 text-gray-500",
};

function CareSeekerNotesWidget() {
  const { data: notes = [], isLoading: loading } = useRecentNotes(4, "private");

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
        <Link
          href="/dashboard/careseeker/notes"
          className="text-[11px] text-[#39B54A] hover:underline font-medium"
        >
          View All
        </Link>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="animate-pulse h-10 bg-gray-100 rounded-lg"
            />
          ))}
        </div>
      ) : notes.length === 0 ? (
        <Link
          href="/dashboard/careseeker/notes"
          className="flex flex-col items-center gap-1 py-4 text-center hover:bg-gray-50 rounded-xl transition-colors"
        >
          <StickyNote size={20} className="text-gray-300" />
          <p className="text-xs text-gray-400">No notes yet</p>
          <p className="text-[11px] text-[#39B54A] font-medium">
            + Create Note
          </p>
        </Link>
      ) : (
        <div className="space-y-2">
          {notes.slice(0, 3).map((n) => (
            <Link
              key={n._id}
              href="/dashboard/careseeker/notes"
              className="flex items-start gap-2 p-2.5 rounded-xl hover:bg-gray-50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-800 truncate">
                  {n.title}
                </p>
                <p className="text-[10px] text-gray-400 mt-0.5 truncate">
                  {n.content}
                </p>
              </div>
              {n.tag && (
                <span
                  className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${
                    TAG_COLOR[n.tag] ?? TAG_COLOR.general
                  }`}
                >
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

// ─────────────────────────────────────────────────────────────────────────────
// QUICK ACTIONS  (careseeker — 4 actions)
// ─────────────────────────────────────────────────────────────────────────────
function CareSeekerQuickActions() {
  const actions = [
    {
      icon: Search,
      label: "Find Caregivers",
      href: "/caregivers",
      color: "bg-emerald-50 text-emerald-600",
    },
    {
      icon: Calendar,
      label: "My Bookings",
      href: "/dashboard/bookings",
      color: "bg-blue-50 text-blue-600",
    },
    {
      icon: DollarSign,
      label: "Payments",
      href: "/dashboard/payments",
      color: "bg-purple-50 text-purple-600",
    },
    {
      icon: HelpCircle,
      label: "Get Support",
      href: "/dashboard/careseeker/support",
      color: "bg-amber-50 text-amber-600",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.25 }}
      className="bg-white rounded-2xl border border-gray-100/80 p-5"
    >
      <h3 className="text-sm font-semibold text-gray-900 mb-3">
        Quick Actions
      </h3>
      <div className="grid grid-cols-2 gap-2">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.label}
              href={action.href}
              className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-gray-50 transition-colors group"
            >
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${action.color}`}
              >
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

// ─────────────────────────────────────────────────────────────────────────────
// PAGE LOADER  (used while hydrating / auth loading)
// ─────────────────────────────────────────────────────────────────────────────
function DashboardPageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFBFC]">
      <div className="text-center">
        <div className="relative w-16 h-16 mx-auto mb-4">
          <div className="absolute inset-0 rounded-full border-4 border-gray-200" />
          <div className="absolute inset-0 rounded-full border-4 border-[#39B54A] border-t-transparent animate-spin" />
        </div>
        <p className="text-gray-600 font-medium">Loading your dashboard…</p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SPENDING DATA SHAPE  (matches SpendingDataPoint from dashboard.service)
// ─────────────────────────────────────────────────────────────────────────────
interface SpendingPoint {
  month: string;
  spending: number;
  bookings: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────
export default function CareSeekerDashboardPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user: authUser, isLoading: isAuthLoading } = useAuthContext();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedTimeRange, setSelectedTimeRange] = useState<
    "week" | "month" | "year"
  >("month");
  const [isHydrated, setIsHydrated] = useState(false);
  const [lastEventType, setLastEventType] = useState<string | undefined>(
    undefined,
  );

  // Intentional hydration guard: delay client-only auth reads until after mount.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsHydrated(true);
  }, []);

  const cachedUser = authService.getCurrentUser();

  // canLoadDashboardData gates all React Query fetches behind the hydration guard
  const canLoadDashboardData =
    isHydrated &&
    (authUser?.role === "careseeker" || cachedUser?.role === "careseeker");

  // ── Auth redirect guard ──────────────────────────────────────────────────
  useEffect(() => {
    if (isAuthLoading) return;

    if (!authUser) {
      if (cachedUser?.role === "careseeker") {
        return;
      }

      router.replace("/login?redirect=/dashboard/careseeker");
      return;
    }

    if (authUser.role && authUser.role !== "careseeker") {
      const fallbackRoute = authService.getDashboardPathForRole(authUser.role);
      router.replace(fallbackRoute ?? "/dashboard");
    }
  }, [
    isAuthLoading,
    authUser,
    authUser?._id,
    authUser?.role,
    cachedUser?.role,
    router,
  ]);

  // ── React Query hooks — cached, deduped, background refresh ─────────────
  const { data: bookings = [] } = useCareseekerBookings(
    20,
    canLoadDashboardData,
  );
  const { data: stats = null } = useCareseekerStats(canLoadDashboardData) as {
    data: BookingStatsResponse | null;
  };
  const { data: spendingData = [] } = useCareseekerSpending(
    canLoadDashboardData,
    selectedTimeRange,
  );
  const { data: serviceDistribution = [] } =
    useCareseekerServiceDistribution(canLoadDashboardData);
  const { data: rawActivity = [] } = useCareseekerRecentActivity(
    8,
    canLoadDashboardData,
  );

  const safeBookings = useMemo(
    () => (Array.isArray(bookings) ? bookings : []),
    [bookings],
  );
  const safeSpendingData = useMemo(
    () => (Array.isArray(spendingData) ? spendingData : []),
    [spendingData],
  );
  const safeServiceDistribution = useMemo(
    () => (Array.isArray(serviceDistribution) ? serviceDistribution : []),
    [serviceDistribution],
  );
  const safeRawActivity = useMemo(
    () => (Array.isArray(rawActivity) ? rawActivity : []),
    [rawActivity],
  );

  // ── Real-time dashboard sync ─────────────────────────────────────────────
  const { connected: realtimeConnected } = useRealtimeDashboard({
    onBookingCreated: (payload) => {
      setLastEventType("booking:created");
      void queryClient.invalidateQueries({ queryKey: ["careseeker"] });
      console.info("[RT] BOOKING_CREATED", payload);
    },
    onBookingAccepted: (payload) => {
      setLastEventType("booking:accepted");
      void queryClient.invalidateQueries({ queryKey: ["careseeker"] });
      console.info("[RT] BOOKING_ACCEPTED", payload);
    },
    onTrackingFlagged: (payload) => {
      setLastEventType("tracking:flagged");
      void queryClient.invalidateQueries({ queryKey: ["careseeker"] });
      console.info("[RT] TRACKING_FLAGGED", payload);
    },
    onDisputeCreated: (payload) => {
      setLastEventType("dispute:created");
      void queryClient.invalidateQueries({ queryKey: ["careseeker"] });
      console.info("[RT] DISPUTE_CREATED", payload);
    },
    onStatsUpdated: () => {
      setLastEventType("system:stats_updated");
      void queryClient.invalidateQueries({
        queryKey: ["careseeker", "bookingStats"],
      });
    },
    onNotification: () => {
      setLastEventType("notification:created");
      void queryClient.invalidateQueries({ queryKey: ["careseeker"] });
    },
  });

  // ── Derive user object (fetched → context → cached) ─────────────────────
  const user = (authUser ?? cachedUser) as UserProfile | null;

  // ── Derived stats ────────────────────────────────────────────────────────
  const totalBookings = stats?.totalBookings ?? 0;
  const completedBookings = stats?.completedBookings ?? 0;
  const activeCaregiversCount = safeBookings.filter(
    (b) => b.status === "in_progress" || b.status === "confirmed",
  ).length;
  const totalSpent = stats?.totalSpent ?? 0;
  const completionRate =
    totalBookings > 0
      ? Math.round((completedBookings / totalBookings) * 100)
      : 0;

  // ── Process bookings for UI components ──────────────────────────────────
  const upcomingBookings: UpcomingBooking[] = safeBookings
    .filter((b) => Boolean(b.schedule?.startDate))
    .filter((b) => b.status === "confirmed" || b.status === "pending")
    .slice(0, 5)
    .map((b) => ({
      id: b._id,
      service: formatServiceType(b.serviceType),
      date: formatDate(b.schedule?.startDate),
      time: b.schedule?.startTime ?? formatTime(b.schedule?.startDate),
      caregiver: {
        name:
          b.caregiverId != null && typeof b.caregiverId === "object"
            ? (b.caregiverId.fullName ?? "Caregiver")
            : "Caregiver",
      },
    }));

  const bookingHistory: BookingHistoryItem[] = safeBookings
    .slice(0, 5)
    .map((b) => ({
      id: b._id,
      service: formatServiceType(b.serviceType),
      caregiver: {
        name:
          b.caregiverId != null && typeof b.caregiverId === "object"
            ? (b.caregiverId.fullName ?? "Caregiver")
            : "Caregiver",
        ...(b.caregiverId != null &&
        typeof b.caregiverId === "object" &&
        b.caregiverId.avatar !== undefined
          ? { avatar: b.caregiverId.avatar }
          : {}),
      },
      date: formatDate(b.schedule?.startDate),
      duration: b.pricing?.totalHours
        ? `${b.pricing.totalHours} hours`
        : b.pricing?.totalDays
          ? `${b.pricing.totalDays} days`
          : "N/A",
      status: b.status as BookingHistoryItem["status"],
    }));

  // ── Transform activity feed data ─────────────────────────────────────────
  const recentActivity: ActivityItem[] = useMemo(
    () =>
      safeRawActivity
        .filter((a: DashboardActivityItem) => a?._id)
        .map((a: DashboardActivityItem) => ({
          id: a._id,
          user: {
            name: a.title || "Activity",
            initials: (a.title || "AC").substring(0, 2).toUpperCase(),
          },
          action: a.message || "",
          time: (() => {
            const activityDate = toSafeDate(a.time);
            return activityDate
              ? activityDate.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })
              : "";
          })(),
          type: (["booking", "payment", "review", "message", "system"].includes(
            a.type,
          )
            ? a.type
            : "system") as ActivityItem["type"],
        })),
    [safeRawActivity],
  );

  // ── Calendar events ──────────────────────────────────────────────────────
  const calendarEvents = useMemo(
    () =>
      safeBookings
        .filter((b) => Boolean(toSafeDate(b.schedule?.startDate)))
        .map((b) => {
          const cgId =
            typeof b.caregiverId === "string"
              ? b.caregiverId
              : b.caregiverId?._id;
          return {
            id: b._id,
            title: formatServiceType(b.serviceType),
            date: toSafeDate(b.schedule?.startDate) || new Date(),
            type: "booking" as const,
            status: (b.status === "in_progress" ? "confirmed" : b.status) as
              | "confirmed"
              | "pending"
              | "completed"
              | "cancelled",
            caregiverName:
              b.caregiverId != null && typeof b.caregiverId === "object"
                ? (b.caregiverId.fullName ?? "Caregiver")
                : "Caregiver",
            ...(cgId ? { caregiverId: cgId } : {}),
          };
        }),
    [safeBookings],
  );

  const handleLogout = async () => {
    await authService.logout();
    router.push("/home");
  };

  // ── Spending totals for chart legend ────────────────────────────────────
  const spendingPoints = safeSpendingData as unknown as SpendingPoint[];
  const totalSpendingDisplayed = spendingPoints.reduce(
    (sum, d) => sum + (d.spending ?? 0),
    0,
  );
  const totalBookingsInRange = spendingPoints.reduce(
    (sum, d) => sum + (d.bookings ?? 0),
    0,
  );

  // ── Loading / guard states ───────────────────────────────────────────────
  if (isAuthLoading || !isHydrated) {
    return <DashboardPageLoader />;
  }

  if (!user) {
    return null;
  }

  // ────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#FAFBFC]">
      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <CareSeekerSidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        user={user}
        onLogout={handleLogout}
      />

      {/* ── Main wrapper: shifts right to clear sidebar ─────────────────── */}
      <div
        className={`transition-all duration-300 ${
          sidebarCollapsed ? "ml-18" : "ml-65"
        }`}
      >
        {/* ── Top Bar ───────────────────────────────────────────────────── */}
        <CareSeekerTopBar user={user} />

        {/* ── Main content area ─────────────────────────────────────────── */}
        <main>
          <div className="max-w-350 mx-auto px-6 py-6 space-y-6">
            {/* ── Welcome Banner + Real-time indicator ───────────────────── */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <CareSeekerWelcomeBanner
                  userName={user.fullName ?? ""}
                  completionPercentage={user.completionPercentage ?? 0}
                />
              </div>
              <div className="mt-1 shrink-0">
                <RealTimeIndicator
                  connected={realtimeConnected}
                  {...(lastEventType ? { lastEventType } : {})}
                />
              </div>
            </div>

            {/* ── Stats Cards ────────────────────────────────────────────── */}
            <CareSeekerStatsCards
              totalBookings={totalBookings}
              activeCaregiversCount={activeCaregiversCount}
              completionRate={completionRate}
              totalSpent={totalSpent}
            />

            {/* ── Main 12-column grid ────────────────────────────────────── */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
              {/* ────────────────────────────────────────────────────────────
                  LEFT COLUMN — 8 cols
              ──────────────────────────────────────────────────────────── */}
              <div className="xl:col-span-8 space-y-6">
                {/* ── Spending Overview ─────────────────────────────────── */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.08, duration: 0.25 }}
                  className="bg-white rounded-2xl border border-gray-100/80 p-6"
                >
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <h3 className="text-base font-semibold text-gray-900">
                        Spending Overview
                      </h3>
                      <p className="text-sm text-gray-500 mt-0.5">
                        Monthly spending and bookings
                      </p>
                    </div>
                    <div className="flex items-center bg-gray-50 rounded-lg p-1">
                      {(["week", "month", "year"] as const).map((range) => (
                        <button
                          key={range}
                          onClick={() => setSelectedTimeRange(range)}
                          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                            selectedTimeRange === range
                              ? "bg-white text-gray-900 shadow-sm"
                              : "text-gray-500 hover:text-gray-700"
                          }`}
                        >
                          {range.charAt(0).toUpperCase() + range.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Legend */}
                  <div className="flex items-center gap-6 mb-5">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-[#39B54A]" />
                      <span className="text-xs text-gray-500">Spending</span>
                      <span className="text-xs font-semibold text-gray-900">
                        Rs. {totalSpendingDisplayed.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-amber-400" />
                      <span className="text-xs text-gray-500">Bookings</span>
                      <span className="text-xs font-semibold text-gray-900">
                        {totalBookingsInRange}
                      </span>
                    </div>
                  </div>

                  <SpendingChart data={safeSpendingData} />
                </motion.div>

                {/* ── Service Distribution ──────────────────────────────── */}
                {safeServiceDistribution.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1, duration: 0.25 }}
                    className="bg-white rounded-2xl border border-gray-100/80 p-6"
                  >
                    <div className="flex items-center justify-between mb-5">
                      <div>
                        <h3 className="text-base font-semibold text-gray-900">
                          Service Types
                        </h3>
                        <p className="text-sm text-gray-500 mt-0.5">
                          Your booking distribution
                        </p>
                      </div>
                    </div>
                    <CaregiverDistribution data={safeServiceDistribution} />
                  </motion.div>
                )}

                {/* ── Trust & Tracking Banner ───────────────────────────── */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.14, duration: 0.25 }}
                  className="rounded-2xl border border-[#DCEFE0] bg-linear-to-r from-[#F4FBF5] to-[#F8FCFF] p-5"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-[#39B54A]">
                        Trust &amp; Tracking
                      </p>
                      <h2 className="text-base font-bold text-gray-900 mt-1">
                        Review daily work logs from your caregiver
                      </h2>
                      <p className="text-sm text-gray-600 mt-1">
                        Approve completed days or flag concerns with comments
                        and evidence context.
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="rounded-xl bg-white border border-[#DCEFE0] px-4 py-3 text-center">
                        <p className="text-[10px] uppercase tracking-wide text-gray-500">
                          Active Cases
                        </p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">
                          {
                            safeBookings.filter((b) =>
                              ["confirmed", "in_progress", "disputed"].includes(
                                b.status,
                              ),
                            ).length
                          }
                        </p>
                      </div>
                      <Link
                        href="/dashboard/careseeker/tracking"
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#39B54A] text-white text-sm font-medium hover:bg-primary-600 transition-colors"
                      >
                        Open Tracking Review
                      </Link>
                    </div>
                  </div>
                </motion.div>

                {/* ── Upcoming Bookings ─────────────────────────────────── */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.18, duration: 0.25 }}
                  className="bg-white rounded-2xl border border-gray-100/80 p-6"
                >
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <h3 className="text-base font-semibold text-gray-900">
                        Upcoming Bookings
                      </h3>
                      <p className="text-sm text-gray-500 mt-0.5">
                        Your scheduled care sessions
                      </p>
                    </div>
                    <Link
                      href="/dashboard/bookings"
                      className="flex items-center gap-1.5 text-xs font-medium text-[#39B54A] hover:text-primary-600 transition-colors"
                    >
                      View All
                      <ArrowRight size={12} />
                    </Link>
                  </div>

                  {upcomingBookings.length > 0 ? (
                    <div className="space-y-3">
                      {upcomingBookings.map((booking) => (
                        <UpcomingBookingCard
                          key={booking.id}
                          booking={booking}
                          onViewDetails={(id) =>
                            router.push(`/dashboard/bookings/${id}`)
                          }
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center py-10 text-center bg-gray-50/60 rounded-xl">
                      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                        <Calendar size={20} className="text-gray-400" />
                      </div>
                      <p className="text-sm font-medium text-gray-600 mb-1">
                        No upcoming bookings
                      </p>
                      <p className="text-xs text-gray-400 mb-4">
                        Find a caregiver to get started
                      </p>
                      <Link
                        href="/caregivers"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-[#39B54A] text-white rounded-lg text-xs font-medium hover:bg-primary-600 transition-colors"
                      >
                        <Search size={14} />
                        Find Caregivers
                      </Link>
                    </div>
                  )}
                </motion.div>

                {/* ── Booking History ───────────────────────────────────── */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.22, duration: 0.25 }}
                  className="bg-white rounded-2xl border border-gray-100/80 p-6"
                >
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <h3 className="text-base font-semibold text-gray-900">
                        Booking History
                      </h3>
                      <p className="text-sm text-gray-500 mt-0.5">
                        Your recent care sessions
                      </p>
                    </div>
                    <Link
                      href="/dashboard/bookings"
                      className="flex items-center gap-1.5 text-xs font-medium text-[#39B54A] hover:text-primary-600 transition-colors"
                    >
                      View All
                      <ArrowRight size={12} />
                    </Link>
                  </div>

                  {bookingHistory.length > 0 ? (
                    <BookingHistoryTable
                      bookings={bookingHistory}
                      onViewBooking={(id) =>
                        router.push(`/dashboard/bookings/${id}`)
                      }
                    />
                  ) : (
                    <div className="flex flex-col items-center py-10 bg-gray-50/60 rounded-xl">
                      <p className="text-sm text-gray-500">
                        No booking history yet
                      </p>
                    </div>
                  )}
                </motion.div>

                {/* ── Live Activity Feed ────────────────────────────────── */}
                {recentActivity.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.24, duration: 0.25 }}
                    className="bg-white rounded-2xl border border-gray-100/80 p-6"
                  >
                    <div className="flex items-center justify-between mb-5">
                      <div>
                        <h3 className="text-base font-semibold text-gray-900">
                          Recent Activity
                        </h3>
                        <p className="text-sm text-gray-500 mt-0.5">
                          Real-time updates from your account
                        </p>
                      </div>
                      <Link
                        href="/dashboard/activity"
                        className="flex items-center gap-1.5 text-xs font-medium text-[#39B54A] hover:text-primary-600 transition-colors"
                      >
                        View All
                        <ArrowRight size={12} />
                      </Link>
                    </div>
                    <LiveActivityFeed activities={recentActivity} />
                  </motion.div>
                )}

                {/* ── Care Calendar ─────────────────────────────────────── */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.26, duration: 0.25 }}
                >
                  <CareCalendar
                    events={calendarEvents}
                    onEventClick={(event) =>
                      router.push(`/dashboard/bookings/${event.id}`)
                    }
                    onDateClick={() => {}}
                    onAddEvent={() => router.push("/caregivers")}
                  />
                </motion.div>
              </div>

              {/* ────────────────────────────────────────────────────────────
                  RIGHT SIDEBAR — 4 cols
              ──────────────────────────────────────────────────────────── */}
              <div className="xl:col-span-4 space-y-5">
                {/* Profile Card */}
                <CareSeekerProfileCard
                  user={user}
                  totalBookings={totalBookings}
                  totalSpent={totalSpent}
                  activeCaregiversCount={activeCaregiversCount}
                  realtimeConnected={realtimeConnected}
                />

                {/* Upcoming Sessions */}
                <CareSeekerScheduleWidget bookings={safeBookings} />

                {/* Quick Actions */}
                <CareSeekerQuickActions />

                {/* Notice Board */}
                <CareSeekerNoticesWidget />

                {/* My Notes */}
                <CareSeekerNotesWidget />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
