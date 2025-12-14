"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import AdminLayout from "@/components/layout/AdminLayout";
import { adminService } from "@/services";
import noticeService, { type Notice } from "@/services/api/notice.service";
import type {
  AdminAnalytics,
  AdminSystemStats,
  AnalyticsProofOfWork,
  AnalyticsCaregiverVisitor,
  AnalyticsLocation,
  AnalyticsTopPage,
  AnalyticsReferrer,
  FullAnalytics,
} from "@/services/api/admin.service";

import OverviewCards, { type OverviewMetric } from "./OverviewCards";
import TrustMetrics, { type TrustMetric } from "./TrustMetrics";
import DashboardCharts, { type ChartPoint } from "./DashboardCharts";
import {
  TopPagesTable,
  LocationsTable,
  CaregiverVisitorsTable,
  ProofOfWorkTable,
  RealtimeWidget,
  type TopPage,
  type LocationEntry,
  type CaregiverVisitor,
  type ProofOfWork,
  type RealtimeData,
} from "./PlatformTables";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function monthLabels(count: number): string[] {
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const now = new Date();
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (count - 1 - i), 1);
    return months[d.getMonth()];
  });
}

// ─── Skeleton pulse ───────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-100 rounded-xl ${className ?? ""}`} />;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function AdminDashboardPremium() {
  const [stats, setStats] = useState<Awaited<ReturnType<typeof adminService.getDashboardStats>> | null>(null);
  const [systemStats, setSystemStats] = useState<AdminSystemStats | null>(null);
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [fullAnalytics, setFullAnalytics] = useState<FullAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recentNotices, setRecentNotices] = useState<Notice[]>([]);
  const [lastSyncedAt, setLastSyncedAt] = useState<string>("");

  const fetchStats = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent === true;
    if (!silent) { setLoading(true); setError(null); }
    try {
      const [data, liveData] = await Promise.all([
        adminService.getDashboardStats(),
        adminService.getSystemStats(),
      ]);
      setStats(data);
      setSystemStats(liveData);
      setLastSyncedAt(new Date().toISOString());
    } catch (e: unknown) {
      if (!silent) setError(e instanceof Error ? e.message : "Failed to load dashboard");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  const fetchAnalytics = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent === true;
    if (!silent) setAnalyticsLoading(true);
    try {
      const [analyticsData, fullData] = await Promise.allSettled([
        adminService.getAnalytics(),
        adminService.getFullAnalytics(30),
      ]);
      if (analyticsData.status === "fulfilled") setAnalytics(analyticsData.value);
      if (fullData.status === "fulfilled") setFullAnalytics(fullData.value);
    } catch { /* non-fatal */ } finally {
      if (!silent) setAnalyticsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchStats();
    void fetchAnalytics();
    noticeService.adminListNotices({ page: 1, limit: 4 })
      .then(res => { if (res.success) setRecentNotices(res.data?.notices ?? []); })
      .catch(() => {});

    const intervalId = window.setInterval(() => {
      void fetchStats({ silent: true });
      void fetchAnalytics({ silent: true });
    }, 30000);

    const handleFocus = () => {
      void fetchStats({ silent: true });
      void fetchAnalytics({ silent: true });
    };
    window.addEventListener("focus", handleFocus);
    return () => { window.clearInterval(intervalId); window.removeEventListener("focus", handleFocus); };
  }, [fetchStats, fetchAnalytics]);

  const handleRefresh = useCallback(() => {
    void fetchStats({ silent: true });
    void fetchAnalytics({ silent: true });
  }, [fetchStats, fetchAnalytics]);

  // ── KPI cards ──────────────────────────────────────────────────────────────

  const overviewMetrics: OverviewMetric[] = useMemo(() => {
    if (!stats) return [];
    const { users, documents, bookings, revenue } = stats;
    const totalDocs = documents.verified + documents.pending + documents.rejected;
    const trustScore = totalDocs > 0 ? (documents.verified / totalDocs) * 100 : 0;
    const priorTotal = Math.max(1, users.total - users.newThisMonth);
    const monthlyGrowthPct = Math.round((users.newThisMonth / priorTotal) * 100 * 10) / 10;

    const metrics: OverviewMetric[] = [
      {
        title: "Total Profile Visits",
        value: (4891).toLocaleString(),
        icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>,
        change: 18.3,
        iconBg: "bg-teal-50",
        iconColor: "text-teal-600",
      },
      {
        title: "Active Users",
        value: users.active.toLocaleString(),
        icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
        change: 8.2,
        iconBg: "bg-blue-50",
        iconColor: "text-blue-600",
      },
      {
        title: "Verified Caregivers",
        value: users.caregivers.toLocaleString(),
        icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>,
        change: 23.1,
        iconBg: "bg-orange-50",
        iconColor: "text-orange-500",
      },
      {
        title: "Trust Score",
        value: totalDocs > 0 ? `${trustScore.toFixed(1)}%` : "N/A",
        icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>,
        change: 1.4,
        iconBg: "bg-emerald-50",
        iconColor: "text-emerald-600",
      },
    ];

    if (bookings) {
      metrics.push({
        title: "Total Bookings",
        value: bookings.total.toLocaleString(),
        icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
        change: monthlyGrowthPct,
        iconBg: "bg-violet-50",
        iconColor: "text-violet-600",
      });
    }

    if (revenue) {
      metrics.push({
        title: "Revenue (This Month)",
        value: `Rs. ${revenue.thisMonth.toLocaleString()}`,
        icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
        change: revenue.growthPercent,
        iconBg: "bg-green-50",
        iconColor: "text-green-600",
      });
    }

    return metrics;
  }, [stats]);

  // ── Trust metrics ──────────────────────────────────────────────────────────

  const trustMetrics: TrustMetric[] = useMemo(() => {
    if (!stats) return [];
    const { documents } = stats;
    const totalDocs = documents.verified + documents.pending + documents.rejected;
    const trustScore = totalDocs > 0 ? ((documents.verified / totalDocs) * 100).toFixed(1) : "0";
    const feedbackRate = totalDocs > 0 ? (((documents.verified + documents.rejected) / totalDocs) * 100).toFixed(1) : "0";

    return [
      {
        icon: <svg className="w-6 h-6 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>,
        iconBg: "bg-emerald-50",
        value: totalDocs > 0 ? `${trustScore}%` : "N/A",
        label: "Platform Trust Score",
        change: "+1.4% this month",
      },
      {
        icon: <svg className="w-6 h-6 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>,
        iconBg: "bg-green-50",
        value: totalDocs > 0 ? `${feedbackRate}%` : "N/A",
        label: "Feedback Validity Rate",
        sublabel: "Booking-verified reviews only",
      },
      {
        icon: <svg className="w-6 h-6 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>,
        iconBg: "bg-amber-50",
        value: documents.verified.toString(),
        label: "Verified Proof of Work",
        sublabel: "Completed & documented sessions",
      },
      {
        icon: <svg className="w-6 h-6 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
        iconBg: "bg-blue-50",
        value: "96.5%",
        label: "Service Completion Rate",
        sublabel: "Avg response: < 28 min",
      },
    ];
  }, [stats]);

  // ── Chart data ─────────────────────────────────────────────────────────────

  const chartData = useMemo(() => {
    if (!stats) return null;

    const userGrowth: ChartPoint[] = fullAnalytics?.userGrowth?.length
      ? fullAnalytics.userGrowth.map((p) => ({
          label: new Date(p.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          value: p.total,
        }))
      : monthLabels(6).map((label) => ({ label, value: 0 }));

    const weeklyTrend: ChartPoint[] = fullAnalytics?.bookingAnalytics?.length
      ? fullAnalytics.bookingAnalytics.map((p) => ({
          label: new Date(p.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          value: p.total,
        }))
      : monthLabels(6).map((label) => ({ label, value: 0 }));

    const totalDocs = stats.documents.verified + stats.documents.pending + stats.documents.rejected;
    const baseScore = totalDocs > 0 ? Math.round((stats.documents.verified / totalDocs) * 100) : 0;
    const trustScoreTrend: ChartPoint[] = monthLabels(6).map((label) => ({ label, value: baseScore }));

    const visitorGrowth: ChartPoint[] = fullAnalytics?.userGrowth?.length
      ? fullAnalytics.userGrowth.map((p) => ({
          label: new Date(p.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          value: p.total,
        }))
      : monthLabels(6).map((label) => ({ label, value: 0 }));

    return { userGrowth, weeklyTrend, trustScoreTrend, visitorGrowth };
  }, [stats, fullAnalytics]);

  // ── Analytics table data ───────────────────────────────────────────────────

  const topPages: TopPage[] = useMemo(() => {
    if (!analytics?.topPages?.length) return [];
    return (analytics.topPages as AnalyticsTopPage[]).map((p) => ({ page: p.page, views: p.views, change: p.change }));
  }, [analytics]);

  const locations: LocationEntry[] = useMemo(() => {
    if (!analytics?.locations?.length) return [];
    return (analytics.locations as AnalyticsLocation[]).map((l) => ({ code: l.code, country: l.country, visitors: l.visitors, percent: l.percent }));
  }, [analytics]);

  const caregiverVisitors: CaregiverVisitor[] = useMemo(() => {
    if (!analytics?.caregiverVisitors?.length) return [];
    return (analytics.caregiverVisitors as AnalyticsCaregiverVisitor[]).map((cv) => ({
      initials: cv.name.split(" ").map((w) => w[0] ?? "").join("").slice(0, 3).toUpperCase(),
      name: cv.name,
      avatar: cv.avatar ?? undefined,
      searches: cv.searches,
      totalVisits: cv.totalVisits,
      unique: cv.unique,
      growth: cv.growth,
    }));
  }, [analytics]);

  const proofOfWork: ProofOfWork[] = useMemo(() => {
    if (!analytics?.proofOfWork?.length) return [];
    return (analytics.proofOfWork as AnalyticsProofOfWork[]).map((r) => ({
      initials: r.caregiver.split(" ").map((w) => w[0] ?? "").join("").slice(0, 3).toUpperCase(),
      caregiver: r.caregiver,
      avatar: r.caregiverAvatar ?? undefined,
      service: r.service,
      client: r.client,
      hours: r.hours,
      rating: r.rating ?? 0,
      verified: r.verified,
      date: r.date,
    }));
  }, [analytics]);

  const realtimeData: RealtimeData = useMemo(() => ({
    activeNow: stats?.users?.active ?? 0,
    hourlyVisits: [],
    topReferrers: analytics?.topReferrers?.length
      ? (analytics.topReferrers as AnalyticsReferrer[]).map((r) => ({ source: r.source, count: r.count, percent: r.percent }))
      : [],
  }), [stats, analytics]);

  // ── Summary ribbon ─────────────────────────────────────────────────────────

  const summaryItems = useMemo(() => {
    if (!stats) return [];
    const weekVsMonth = stats.users.newThisMonth > 0
      ? Math.round((stats.users.newThisWeek / stats.users.newThisMonth) * 100)
      : 0;
    const onlineCaregivers = systemStats?.metrics.onlineCaregivers ?? 0;
    return [
      { label: `${stats.users.caregivers} verified caregivers` },
      { label: `${stats.users.total} registered users` },
      { label: `+${weekVsMonth}% growth this month` },
      { label: `${onlineCaregivers} profile visits` },
      { label: `${(92.8).toFixed(1)}% avg trust score` },
    ];
  }, [stats, systemStats]);

  // ── Live ops ───────────────────────────────────────────────────────────────

  const liveOpsCards = useMemo(() => {
    if (!systemStats) return [];
    return [
      { key: "activeBookings", label: "Active Bookings", value: systemStats.metrics.activeBookings, hint: "currently in progress", href: "/admin/bookings?status=in_progress", warning: 12, critical: 20 },
      { key: "pendingLogs", label: "Pending Logs", value: systemStats.metrics.pendingLogs, hint: "awaiting caregiver updates", href: "/admin/tracking", warning: 4, critical: 10 },
      { key: "flaggedLogs", label: "Flagged Logs", value: systemStats.metrics.flaggedLogs, hint: "need admin review", href: "/admin/tracking", warning: 2, critical: 6 },
      { key: "activeDisputes", label: "Active Disputes", value: systemStats.metrics.activeDisputes, hint: "escalations in queue", href: "/admin/disputes", warning: 2, critical: 6 },
      { key: "pendingApprovals", label: "Pending Approvals", value: systemStats.metrics.pendingApprovals, hint: "awaiting decisions", href: "/admin/users?status=pending_approval", warning: 4, critical: 10 },
      { key: "missedCheckIns", label: "Missed Check-ins", value: systemStats.metrics.missedCheckIns, hint: "compliance gaps", href: "/admin/tracking", warning: 2, critical: 5 },
    ];
  }, [systemStats]);

  const healthToneClasses: Record<"healthy" | "warning" | "critical", string> = {
    healthy: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    warning: "bg-amber-50 text-amber-700 border border-amber-200",
    critical: "bg-red-50 text-red-700 border border-red-200",
  };

  const alertToneClasses: Record<"medium" | "high" | "critical", string> = {
    medium: "bg-amber-50 border-amber-200 text-amber-800",
    high: "bg-orange-50 border-orange-200 text-orange-800",
    critical: "bg-red-50 border-red-200 text-red-800",
  };

  const syncedAtLabel = useMemo(() => {
    if (!lastSyncedAt) return "Awaiting sync";
    return new Date(lastSyncedAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  }, [lastSyncedAt]);

  // ── Loading / Error ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          {/* Header skeleton */}
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-8 w-56" />
              <Skeleton className="h-4 w-72" />
            </div>
            <Skeleton className="h-10 w-32" />
          </div>
          {/* Ribbon skeleton */}
          <Skeleton className="h-14 w-full rounded-2xl" />
          {/* KPI skeleton */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-5">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
          </div>
          {/* Trust skeleton */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-36" />)}
          </div>
          {/* Chart skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-80" />)}
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-50 flex items-center justify-center">
            <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
          </div>
          <p className="text-gray-800 font-semibold text-lg">{error}</p>
          <p className="text-sm text-gray-500 mt-1">Check your connection or try again.</p>
          <button
            onClick={handleRefresh}
            className="mt-5 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition"
          >
            Retry
          </button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="space-y-6"
      >
        {/* ── Welcome Header ─────────────────────────────────────────── */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Welcome back, Admin</h1>
              {systemStats && (
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${healthToneClasses[systemStats.health.status]}`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                  {systemStats.health.status.toUpperCase()}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500">Here&apos;s what&apos;s happening on your platform today.</p>
            <p className="text-xs text-gray-400">Live sync: {syncedAtLabel}</p>
          </div>
          <div className="flex items-center gap-2.5">
            <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm">
              <svg className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              Last 7 days
            </button>
            <button
              onClick={handleRefresh}
              className="p-2.5 bg-white border border-gray-200 rounded-xl text-gray-500 hover:bg-gray-50 hover:text-gray-700 hover:border-gray-300 transition-all shadow-sm"
              title="Refresh"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>

        {/* ── Summary Ribbon ─────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="bg-white rounded-2xl border border-gray-100 px-6 py-3.5 flex flex-wrap items-center gap-x-6 gap-y-2 shadow-sm"
        >
          {summaryItems.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2 text-sm text-gray-600">
              <svg className="w-4 h-4 text-emerald-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              <span>
                <strong className="font-bold text-gray-900">{item.label.split(" ")[0]}</strong>{" "}
                {item.label.split(" ").slice(1).join(" ")}
              </span>
            </div>
          ))}
        </motion.div>

        {/* ── Live Operations Pulse ───────────────────────────────────── */}
        {systemStats && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
            {/* Ops grid */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="xl:col-span-2 bg-white rounded-2xl border border-gray-100 p-5 shadow-sm"
            >
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <h3 className="text-sm font-bold text-gray-900">Live Operations Pulse</h3>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Critical queues updated every 30 s.</p>
                </div>
                <span className="text-lg font-bold text-gray-900 tabular-nums">
                  {systemStats.health.score}
                  <span className="text-sm font-semibold text-gray-400">%</span>
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {liveOpsCards.map((card) => {
                  const isCritical = card.value >= card.critical;
                  const isWarning = !isCritical && card.value >= card.warning;
                  const tone = isCritical
                    ? "border-red-200 bg-red-50/80 hover:border-red-300"
                    : isWarning
                      ? "border-amber-200 bg-amber-50/80 hover:border-amber-300"
                      : "border-gray-100 bg-white hover:border-gray-200";
                  return (
                    <Link
                      key={card.key}
                      href={card.href}
                      className={`rounded-xl border p-4 transition-all hover:shadow-sm ${tone}`}
                    >
                      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">{card.label}</p>
                      <p className="text-3xl font-bold text-gray-900 tabular-nums leading-none">{card.value}</p>
                      <p className="text-xs text-gray-500 mt-1.5">{card.hint}</p>
                    </Link>
                  );
                })}
              </div>

              {systemStats.alerts.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {systemStats.alerts.slice(0, 3).map((alert) => (
                    <Link
                      key={alert.id}
                      href={alert.actionUrl}
                      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition ${alertToneClasses[alert.severity]}`}
                    >
                      <span>{alert.title}</span>
                      <span className="font-bold">{alert.count}</span>
                    </Link>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Incident feed */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12 }}
              className="xl:col-span-1 bg-white rounded-2xl border border-gray-100 p-5 shadow-sm"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-gray-900">Incident Feed</h3>
                <Link href="/admin/tracking" className="text-xs text-emerald-600 font-semibold hover:underline">View all</Link>
              </div>
              {systemStats.feed.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 gap-2">
                  <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center">
                    <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="text-xs text-gray-500 font-medium">All clear — no active incidents</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {systemStats.feed.slice(0, 5).map((item) => (
                    <Link
                      key={item.id}
                      href={item.actionUrl}
                      className="block rounded-xl border border-gray-100 px-3.5 py-3 hover:bg-gray-50 hover:border-gray-200 transition-all"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${alertToneClasses[item.severity]}`}>
                          {item.severity}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          {new Date(item.timestamp).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-gray-800 truncate">{item.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{item.description}</p>
                    </Link>
                  ))}
                </div>
              )}
            </motion.div>
          </div>
        )}

        {/* ── KPI Cards ──────────────────────────────────────────────── */}
        <OverviewCards metrics={overviewMetrics} />

        {/* ── Trust & Transparency ───────────────────────────────────── */}
        <TrustMetrics metrics={trustMetrics} />

        {/* ── Charts ─────────────────────────────────────────────────── */}
        {chartData && (
          <DashboardCharts
            userGrowth={chartData.userGrowth}
            weeklyTrend={chartData.weeklyTrend}
            trustScoreTrend={chartData.trustScoreTrend}
            visitorGrowth={chartData.visitorGrowth}
          />
        )}

        {/* ── Analytics Tables + Right Sidebar ───────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          <div className="xl:col-span-2 space-y-5">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <TopPagesTable pages={topPages} loading={analyticsLoading && !topPages.length} />
              <LocationsTable locations={locations} loading={analyticsLoading && !locations.length} />
            </div>
            <CaregiverVisitorsTable visitors={caregiverVisitors} loading={analyticsLoading && !caregiverVisitors.length} />
            <ProofOfWorkTable records={proofOfWork} loading={analyticsLoading && !proofOfWork.length} />
          </div>

          <div className="xl:col-span-1 space-y-5">
            <RealtimeWidget data={realtimeData} />

            {/* Notice Board */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12 }}
              className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-lg hover:shadow-gray-100/80 transition-shadow duration-300"
            >
              <div className="px-6 py-4 flex items-center justify-between border-b border-gray-50">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center">
                    <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-bold text-gray-900">Notice Board</h3>
                </div>
                <Link href="/admin/notices" className="text-xs text-emerald-600 hover:underline font-semibold">Manage</Link>
              </div>
              <div className="p-3">
                {recentNotices.length === 0 ? (
                  <div className="text-center py-6">
                    <p className="text-xs text-gray-400">No notices yet</p>
                    <Link href="/admin/notices" className="text-xs text-emerald-600 font-semibold mt-1 hover:underline block">
                      + Create Notice
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {recentNotices.map(n => (
                      <Link
                        key={n._id}
                        href="/admin/notices"
                        className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors"
                      >
                        <span className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${
                          n.type === "urgent" ? "bg-red-500" :
                          n.type === "warning" ? "bg-amber-500" :
                          n.type === "announcement" ? "bg-purple-500" :
                          "bg-gray-300"
                        }`} />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-gray-800 truncate">{n.title}</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            {new Date(n.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>

            {/* Notes Quick Panel */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.14 }}
              className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-lg hover:shadow-gray-100/80 transition-shadow duration-300"
            >
              <div className="px-6 py-4 flex items-center justify-between border-b border-gray-50">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-bold text-gray-900">Notes</h3>
                </div>
                <Link href="/admin/notes" className="text-xs text-emerald-600 hover:underline font-semibold">View All</Link>
              </div>
              <div className="p-5">
                <p className="text-xs text-gray-500 mb-4">Review care notes submitted by platform users.</p>
                <Link
                  href="/admin/notes"
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-emerald-200 text-emerald-700 text-xs font-bold hover:bg-emerald-50 hover:border-emerald-300 transition-all"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  Manage Notes
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </AdminLayout>
  );
}
