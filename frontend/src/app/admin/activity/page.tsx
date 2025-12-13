"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import AdminLayout from "@/components/layout/AdminLayout";
import { adminService } from "@/services";

// ─── Types ────────────────────────────────────────────────────────────────────

type ActivityCategory = "all" | "auth" | "booking" | "message" | "note" | "document" | "profile" | "payment" | "job" | "dispute" | "review" | "system";
type StatusFilter = "all" | "success" | "failed" | "pending" | "active" | "pending_approval" | "suspended" | "verified" | "rejected" | "caregiver" | "careseeker";
type DateRange = "today" | "7d" | "30d" | "90d" | "all";
type UserRoleFilter = "all" | "admin" | "caregiver" | "careseeker";

interface ActivityItem {
  id: string;
  type: string;
  category: string;
  action: string;
  timestamp: string;
  title: string;
  subtitle: string;
  status: string;
  role?: string | undefined;
  documentType?: string | undefined;
  metadata?: Record<string, unknown>;
  raw: Record<string, unknown>;
}

// Activity action labels for display
const ACTION_LABELS: Record<string, string> = {
  // Auth
  login: "User logged in",
  logout: "User logged out",
  password_reset: "Password reset requested",
  password_change: "Password changed",
  account_verify: "Account verified",
  session_refresh: "Session refreshed",
  // Booking
  booking_create: "Booking created",
  booking_confirm: "Booking confirmed",
  booking_cancel: "Booking cancelled",
  booking_complete: "Booking completed",
  booking_reschedule: "Booking rescheduled",
  booking_view: "Viewed booking",
  // Message
  message_send: "Message sent",
  message_read: "Message read",
  conversation_start: "Started conversation",
  conversation_view: "Viewed conversation",
  // Note
  note_create: "Note created",
  note_update: "Note updated",
  note_delete: "Note deleted",
  note_share: "Note shared",
  note_view: "Viewed note",
  edit_request: "Edit requested",
  edit_approve: "Edit approved",
  edit_reject: "Edit rejected",
  // Document
  document_upload: "Document uploaded",
  document_verify: "Document verified",
  document_reject: "Document rejected",
  document_view: "Document viewed",
  // Profile
  profile_update: "Profile updated",
  avatar_change: "Avatar changed",
  availability_update: "Availability updated",
  rates_update: "Rates updated",
  // Payment
  payment_initiate: "Payment initiated",
  payment_complete: "Payment completed",
  payment_fail: "Payment failed",
  refund_request: "Refund requested",
  refund_complete: "Refund completed",
  // Job
  job_view: "Job viewed",
  job_apply: "Applied to job",
  job_save: "Job saved",
  job_create: "Job created",
  job_update: "Job updated",
  // Dispute
  dispute_create: "Dispute created",
  dispute_update: "Dispute updated",
  dispute_message: "Dispute message sent",
  dispute_resolve: "Dispute resolved",
  // Review
  review_submit: "Review submitted",
  review_view: "Review viewed",
  // System / Legacy
  user_registration: "User registered",
  document_submission: "Document submitted",
  session_start: "Session started",
  page_view: "Page viewed",
  search_perform: "Search performed",
  notification_click: "Notification clicked",
};

const CATEGORY_COLORS: Record<string, { bg: string; text: string; icon: string }> = {
  auth: { bg: "bg-blue-50", text: "text-blue-700", icon: "🔐" },
  booking: { bg: "bg-emerald-50", text: "text-emerald-700", icon: "📅" },
  message: { bg: "bg-purple-50", text: "text-purple-700", icon: "💬" },
  note: { bg: "bg-amber-50", text: "text-amber-700", icon: "📝" },
  document: { bg: "bg-cyan-50", text: "text-cyan-700", icon: "📄" },
  profile: { bg: "bg-pink-50", text: "text-pink-700", icon: "👤" },
  payment: { bg: "bg-green-50", text: "text-green-700", icon: "💰" },
  job: { bg: "bg-indigo-50", text: "text-indigo-700", icon: "💼" },
  dispute: { bg: "bg-red-50", text: "text-red-700", icon: "⚠️" },
  review: { bg: "bg-yellow-50", text: "text-yellow-700", icon: "⭐" },
  system: { bg: "bg-gray-50", text: "text-gray-700", icon: "⚙️" },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildId(item: Record<string, unknown>): string {
  const user = item.user as Record<string, string> | null;
  const key = user?.email ?? user?.fullName ?? "unknown";
  return `${item.type}-${key}-${item.timestamp}`;
}

function formatTimestamp(ts: string): string {
  const d = new Date(ts);
  const now = Date.now();
  const diff = now - d.getTime();
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 7 * 86_400_000) return `${Math.floor(diff / 86_400_000)}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700 border-emerald-100",
  pending: "bg-amber-50 text-amber-700 border-amber-100",
  pending_approval: "bg-blue-50 text-blue-700 border-blue-100",
  suspended: "bg-red-50 text-red-600 border-red-100",
  verified: "bg-emerald-50 text-emerald-700 border-emerald-100",
  rejected: "bg-red-50 text-red-600 border-red-100",
  caregiver: "bg-teal-50 text-teal-700 border-teal-100",
  careseeker: "bg-purple-50 text-purple-700 border-purple-100",
};

function StatusBadge({ status }: { status: string }) {
  const label = status.replace(/_/g, " ");
  const cls = STATUS_STYLES[status] ?? "bg-gray-50 text-gray-600 border-gray-100";
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize ${cls}`}>
      {label}
    </span>
  );
}

// ─── Category Icon ────────────────────────────────────────────────────────────

function CategoryIcon({ category }: { category: string }) {
  const config = CATEGORY_COLORS[category] || CATEGORY_COLORS.system;
  return (
    <div className={`w-9 h-9 rounded-xl ${config.bg} flex items-center justify-center shrink-0`}>
      <span className="text-base">{config.icon}</span>
    </div>
  );
}

// ─── Activity Row ─────────────────────────────────────────────────────────────

function ActivityRow({ item, expanded, onToggle }: { item: ActivityItem; expanded: boolean; onToggle: () => void }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="border-b border-gray-50 last:border-0"
    >
      <button
        onClick={onToggle}
        className="w-full text-left px-6 py-4 hover:bg-gray-50/50 transition-colors flex items-start gap-4"
      >
        <CategoryIcon category={item.category || "system"} />

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-0.5">
            <span className="text-sm font-semibold text-gray-900">{item.title}</span>
            <StatusBadge status={item.status} />
            {item.role && item.role !== item.status && <StatusBadge status={item.role} />}
          </div>
          <p className="text-xs text-gray-500 truncate">{item.subtitle}</p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs text-gray-400 whitespace-nowrap hidden sm:block">
            {formatTimestamp(item.timestamp)}
          </span>
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-4 pl-13">
              <div className="bg-gray-50 rounded-xl p-4 text-xs font-mono text-gray-600 overflow-x-auto">
                <pre className="whitespace-pre-wrap break-all">{JSON.stringify(item.raw, null, 2)}</pre>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                {new Date(item.timestamp).toLocaleString("en-US", {
                  weekday: "long", year: "numeric", month: "long",
                  day: "numeric", hour: "2-digit", minute: "2-digit",
                })}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Stats Bar ────────────────────────────────────────────────────────────────

function StatsBar({ items }: { items: ActivityItem[] }) {
  // Calculate category counts
  const authCount = items.filter((i) => i.category === "auth").length;
  const bookingCount = items.filter((i) => i.category === "booking").length;
  const messageCount = items.filter((i) => i.category === "message").length;
  const failedCount = items.filter((i) => i.status === "failed").length;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
      {[
        { label: "Total Activities", value: items.length, color: "text-gray-900", bg: "bg-gray-50" },
        { label: "🔐 Auth Events", value: authCount, color: "text-blue-700", bg: "bg-blue-50" },
        { label: "📅 Bookings", value: bookingCount, color: "text-emerald-700", bg: "bg-emerald-50" },
        { label: "💬 Messages", value: messageCount, color: "text-purple-700", bg: "bg-purple-50" },
        { label: "⚠️ Failed", value: failedCount, color: "text-red-700", bg: "bg-red-50" },
      ].map((stat) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`${stat.bg} rounded-xl px-4 py-3.5 border border-white`}
        >
          <p className={`text-2xl font-bold tabular-nums ${stat.color}`}>{stat.value}</p>
          <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
        </motion.div>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminActivityPage() {
  const [allItems, setAllItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<ActivityCategory>("all");
  const [roleFilter, setRoleFilter] = useState<UserRoleFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [dateRange, setDateRange] = useState<DateRange>("30d");

  const [expandedId, setExpandedId] = useState<string | null>(null);

  const sentinelRef = useRef<HTMLDivElement>(null);

  // ── Fetch ──────────────────────────────────────────────────────────

  const fetchActivities = useCallback(async (pageNum: number, append = false) => {
    if (!append) setLoading(true);
    setError(null);
    try {
      // Calculate date filters
      const now = new Date();
      let startDate: string | undefined;
      if (dateRange === "today") {
        startDate = new Date(now.setHours(0, 0, 0, 0)).toISOString();
      } else if (dateRange === "7d") {
        startDate = new Date(now.getTime() - 7 * 86_400_000).toISOString();
      } else if (dateRange === "30d") {
        startDate = new Date(now.getTime() - 30 * 86_400_000).toISOString();
      } else if (dateRange === "90d") {
        startDate = new Date(now.getTime() - 90 * 86_400_000).toISOString();
      }

      // Try new comprehensive API first, fall back to legacy
      let mapped: ActivityItem[];
      try {
        const params: {
          page: number;
          limit: number;
          category?: string;
          userRole?: string;
          startDate?: string;
          search?: string;
        } = {
          page: pageNum,
          limit: 50,
        };
        if (categoryFilter !== "all") params.category = categoryFilter;
        if (roleFilter !== "all") params.userRole = roleFilter;
        if (startDate) params.startDate = startDate;
        if (search.trim()) params.search = search.trim();

        const result = await adminService.getActivityTimeline(params);
        
        mapped = result.activities.map((it) => ({
          id: it._id,
          type: it.action,
          category: it.category,
          action: it.action,
          timestamp: it.createdAt,
          title: ACTION_LABELS[it.action] || formatActionLabel(it.action),
          subtitle: it.user ? `${it.user.fullName ?? "Unknown"} · ${it.user.email ?? ""}` : "Unknown user",
          status: it.status || "success",
          role: it.userRole || it.user?.role,
          metadata: it.metadata,
          raw: it as unknown as Record<string, unknown>,
        }));
        
        setHasMore(result.pagination.hasMore);
      } catch {
        // Fall back to legacy API
        const raw = await adminService.getRecentActivities(pageNum * 50);
        mapped = (raw as unknown as Record<string, unknown>[]).map((it) => {
          const user = it.user as Record<string, string> | null;
          const type = it.type as string;
          const category = type === "user_registration" ? "auth" : "document";
          return {
            id: buildId(it),
            type,
            category,
            action: type,
            timestamp: it.timestamp as string,
            title: ACTION_LABELS[type] || (type === "user_registration" 
              ? `New ${(it.role as string) ?? "user"} registered`
              : `Document submitted — ${(it.documentType as string) ?? "unknown"}`),
            subtitle: user
              ? `${user.fullName ?? "Unknown"} · ${user.email ?? ""}`
              : "Unknown user",
            status: (it.status as string) ?? "success",
            role: it.role as string | undefined,
            documentType: it.documentType as string | undefined,
            raw: it,
          };
        });
        setHasMore(raw.length >= 50);
      }

      if (append) {
        setAllItems(prev => [...prev, ...mapped]);
      } else {
        setAllItems(mapped);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load activities");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [categoryFilter, roleFilter, dateRange, search]);

  // Format action label from snake_case
  function formatActionLabel(action: string): string {
    return action.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
  }

  useEffect(() => { 
    setPage(1);
    void fetchActivities(1); 
  }, [fetchActivities]);

  // ── Infinite scroll ────────────────────────────────────────────────

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasMore && !loadingMore && !loading) {
          setLoadingMore(true);
          const nextPage = page + 1;
          setPage(nextPage);
          void fetchActivities(nextPage, true);
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loading, page, fetchActivities]);

  // ── Filtered list ──────────────────────────────────────────────────

  const filtered = useMemo(() => {
    return allItems.filter((item) => {
      // Category filter is already applied server-side, but keep for local filtering
      if (categoryFilter !== "all" && item.category !== categoryFilter) return false;
      if (statusFilter !== "all" && item.status !== statusFilter && item.role !== statusFilter) return false;
      // Date filter is already applied server-side
      if (search.trim()) {
        const q = search.toLowerCase();
        if (!item.title.toLowerCase().includes(q) && !item.subtitle.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [allItems, categoryFilter, statusFilter, search]);

  // ── Render ─────────────────────────────────────────────────────────

  return (
    <AdminLayout>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">

        {/* ── Header ─────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Activity Log</h1>
            <p className="text-sm text-gray-500 mt-1">Real-time audit trail of all platform events</p>
          </div>
          <button
            onClick={() => { setPage(1); void fetchActivities(1); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition self-start sm:self-auto"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>

        {/* ── Stats bar ──────────────────────────────────────────── */}
        {!loading && <StatsBar items={filtered} />}

        {/* ── Filters ────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
            {/* Search */}
            <div className="relative xl:col-span-1">
              <svg
                className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2"
                viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              >
                <circle cx="11" cy="11" r="8" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35" />
              </svg>
              <input
                type="text"
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 text-sm bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition"
              />
            </div>

            {/* Category */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as ActivityCategory)}
              className="py-2.5 px-3 text-sm bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 text-gray-700 transition"
            >
              <option value="all">All Categories</option>
              <option value="auth">🔐 Authentication</option>
              <option value="booking">📅 Bookings</option>
              <option value="message">💬 Messages</option>
              <option value="note">📝 Notes</option>
              <option value="document">📄 Documents</option>
              <option value="profile">👤 Profile</option>
              <option value="payment">💰 Payments</option>
              <option value="job">💼 Jobs</option>
              <option value="dispute">⚠️ Disputes</option>
              <option value="review">⭐ Reviews</option>
              <option value="system">⚙️ System</option>
            </select>

            {/* User Role */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as UserRoleFilter)}
              className="py-2.5 px-3 text-sm bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 text-gray-700 transition"
            >
              <option value="all">All Roles</option>
              <option value="admin">Admin</option>
              <option value="caregiver">Caregiver</option>
              <option value="careseeker">Care Seeker</option>
            </select>

            {/* Status */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="py-2.5 px-3 text-sm bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 text-gray-700 transition"
            >
              <option value="all">All Statuses</option>
              <option value="success">Success</option>
              <option value="failed">Failed</option>
              <option value="pending">Pending</option>
            </select>

            {/* Date range */}
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as DateRange)}
              className="py-2.5 px-3 text-sm bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 text-gray-700 transition"
            >
              <option value="today">Today</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="all">All time</option>
            </select>
          </div>

          {/* Active filter chips */}
          {(categoryFilter !== "all" || roleFilter !== "all" || statusFilter !== "all" || dateRange !== "30d" || search) && (
            <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-50">
              {search && (
                <span className="flex items-center gap-1.5 px-2.5 py-1 bg-teal-50 text-teal-700 text-xs font-medium rounded-full border border-teal-100">
                  Search: &ldquo;{search}&rdquo;
                  <button onClick={() => setSearch("")} className="hover:text-teal-900">×</button>
                </span>
              )}
              {categoryFilter !== "all" && (
                <span className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full border border-blue-100 capitalize">
                  {CATEGORY_COLORS[categoryFilter]?.icon} {categoryFilter}
                  <button onClick={() => setCategoryFilter("all")} className="hover:text-blue-900">×</button>
                </span>
              )}
              {roleFilter !== "all" && (
                <span className="flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 text-indigo-700 text-xs font-medium rounded-full border border-indigo-100 capitalize">
                  {roleFilter}
                  <button onClick={() => setRoleFilter("all")} className="hover:text-indigo-900">×</button>
                </span>
              )}
              {statusFilter !== "all" && (
                <span className="flex items-center gap-1.5 px-2.5 py-1 bg-purple-50 text-purple-700 text-xs font-medium rounded-full border border-purple-100 capitalize">
                  {statusFilter.replace(/_/g, " ")}
                  <button onClick={() => setStatusFilter("all")} className="hover:text-purple-900">×</button>
                </span>
              )}
              <button
                onClick={() => { setSearch(""); setCategoryFilter("all"); setRoleFilter("all"); setStatusFilter("all"); setDateRange("30d"); }}
                className="px-2.5 py-1 text-xs text-gray-500 hover:text-gray-700 transition"
              >
                Clear all
              </button>
            </div>
          )}
        </div>

        {/* ── Activity Feed ───────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {/* Table header */}
          <div className="px-6 py-3.5 border-b border-gray-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span className="text-sm font-semibold text-gray-900">Live Feed</span>
            </div>
            <span className="text-xs text-gray-400">
              {filtered.length} {filtered.length === 1 ? "event" : "events"}
            </span>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-10 h-10 border-[3px] border-emerald-100 border-t-emerald-500 rounded-full animate-spin" />
              <p className="text-sm text-gray-400">Loading activity feed...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <svg className="w-10 h-10 text-red-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01" />
              </svg>
              <p className="text-sm text-gray-500">{error}</p>
              <button
                onClick={() => void fetchActivities(page)}
                className="px-4 py-2 bg-emerald-600 text-white text-sm rounded-xl hover:bg-emerald-700 transition"
              >
                Retry
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <svg className="w-10 h-10 text-gray-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="text-sm text-gray-400">No activity matches your filters</p>
              <button
                onClick={() => { setSearch(""); setCategoryFilter("all"); setStatusFilter("all"); setDateRange("all"); setRoleFilter("all"); }}
                className="px-4 py-2 text-sm text-emerald-600 hover:underline"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div>
              {filtered.map((item) => (
                <ActivityRow
                  key={item.id}
                  item={item}
                  expanded={expandedId === item.id}
                  onToggle={() => setExpandedId((prev) => (prev === item.id ? null : item.id))}
                />
              ))}
            </div>
          )}

          {/* Load more sentinel */}
          <div ref={sentinelRef} className="h-1" />

          {/* Loading more indicator */}
          {loadingMore && (
            <div className="flex justify-center py-6">
              <div className="w-6 h-6 border-2 border-emerald-200 border-t-emerald-500 rounded-full animate-spin" />
            </div>
          )}

          {/* End of feed */}
          {!hasMore && filtered.length > 0 && (
            <div className="text-center py-6 text-xs text-gray-400 border-t border-gray-50">
              All {filtered.length} activities loaded
            </div>
          )}
        </div>
      </motion.div>
    </AdminLayout>
  );
}
