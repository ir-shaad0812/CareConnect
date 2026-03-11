"use client";

// ============================================
// NOTIFICATION DROPDOWN
// Real-time notifications with socket.io,
// mark-as-read, mark-all-read + UNDO snackbar
// ============================================

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Check, CheckCheck, Trash2, X } from "lucide-react";
import notificationService from "@/services/api/notification.service";
import type { Notification } from "@/services/api/notification.service";
import { useSocket } from "@/context/SocketContext";
import { useAuthContext } from "@/context/AuthContext";

// ─── Icon map per notification type ──────────────────────────────────────────

const TYPE_ICON: Record<string, { emoji: string; color: string }> = {
  booking_request:       { emoji: "📋", color: "text-blue-500" },
  booking_confirmed:     { emoji: "✅", color: "text-green-500" },
  booking_cancelled:     { emoji: "❌", color: "text-red-500" },
  booking_completed:     { emoji: "🎉", color: "text-purple-500" },
  booking_reminder:      { emoji: "⏰", color: "text-yellow-500" },
  payment_received:      { emoji: "💰", color: "text-green-600" },
  payment_due:           { emoji: "⚠️",  color: "text-orange-500" },
  payment_pending:       { emoji: "🕐", color: "text-orange-400" },
  payment_failed:        { emoji: "🚨", color: "text-red-600" },
  refund_processed:      { emoji: "↩️", color: "text-blue-500" },
  payout_sent:           { emoji: "💸", color: "text-emerald-600" },
  new_notice:            { emoji: "📢", color: "text-violet-500" },
  new_message:           { emoji: "💬", color: "text-sky-500" },
  review_received:       { emoji: "⭐", color: "text-yellow-400" },
  document_verified:     { emoji: "📄", color: "text-green-500" },
  document_rejected:     { emoji: "📄", color: "text-red-500" },
  profile_viewed:        { emoji: "👁️", color: "text-indigo-400" },
  booking_started:       { emoji: "🏃", color: "text-blue-600" },
  check_in:              { emoji: "📍", color: "text-teal-500" },
  check_out:             { emoji: "🏁", color: "text-teal-600" },
  welcome:               { emoji: "👋", color: "text-purple-400" },
  system_update:         { emoji: "🔔", color: "text-gray-500" },
  deadline_reminder:     { emoji: "⏳", color: "text-amber-500" },
  emergency_alert:       { emoji: "🚨", color: "text-red-700" },
};

function getTypeInfo(type: string) {
  return TYPE_ICON[type] ?? { emoji: "🔔", color: "text-gray-500" };
}

function getWalletDestination(role?: string | null): string {
  if (role === "caregiver") {
    return "/dashboard/caregiver/wallet";
  }

  if (role === "careseeker") {
    return "/dashboard/careseeker/wallet";
  }

  return "/dashboard/payments";
}

// ─── Relative time helper ─────────────────────────────────────────────────────

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ─── Group by Today / Earlier ─────────────────────────────────────────────────

function groupNotifications(notifications: Notification[]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayGroup: Notification[] = [];
  const earlierGroup: Notification[] = [];

  notifications.forEach(n => {
    if (new Date(n.createdAt) >= today) todayGroup.push(n);
    else earlierGroup.push(n);
  });

  return { todayGroup, earlierGroup };
}

// ─── Action URL resolver ──────────────────────────────────────────────────────

function getReviewDestination(bookingId: string, role?: string | null): string {
  if (role === "careseeker") {
    return `/dashboard/careseeker/reviews?bookingId=${bookingId}`;
  }

  if (role === "caregiver") {
    return "/dashboard/caregiver/reviews";
  }

  return `/dashboard/reviews/write?bookingId=${bookingId}`;
}

function normalizeNotificationUrl(raw: string, role?: string | null): string {
  const trimmed = raw.trim();

  if (trimmed === "/bookings") {
    return "/dashboard/bookings";
  }

  const reviewMatch = trimmed.match(/^\/bookings\/([^/?#]+)\/review$/);
  if (reviewMatch) {
    return getReviewDestination(reviewMatch[1], role);
  }

  const bookingMatch = trimmed.match(/^\/bookings\/([^/?#]+)$/);
  if (bookingMatch) {
    return `/dashboard/bookings/${bookingMatch[1]}`;
  }

  const legacyBookingPaymentMatch = trimmed.match(/^\/dashboard\/bookings\/([^/?#]+)\/payment$/);
  if (legacyBookingPaymentMatch) {
    return `/booking/${legacyBookingPaymentMatch[1]}/payment`;
  }

  const legacyPaymentDetailMatch = trimmed.match(/^\/dashboard\/payments\/([^/?#]+)$/);
  if (legacyPaymentDetailMatch) {
    return getWalletDestination(role);
  }

  return trimmed;
}

function resolveUrl(n: Notification, role?: string | null): string | null {
  const data = (n.data || {}) as Record<string, unknown>;
  const rawActionUrl = data.actionUrl;

  if (typeof rawActionUrl === "string" && rawActionUrl.trim().length > 0) {
    return normalizeNotificationUrl(rawActionUrl, role);
  }

  const bookingRef = data.bookingId ?? data.referenceId;
  if (typeof bookingRef === "string" && bookingRef.trim().length > 0) {
    return `/dashboard/bookings/${bookingRef}`;
  }

  // Fallback mapping
  if (n.type.startsWith("booking")) return "/dashboard/bookings";
  if (n.type.startsWith("payment") || n.type.startsWith("refund") || n.type.startsWith("payout")) {
    return getWalletDestination(role);
  }
  if (n.type === "new_message") return "/messages";
  if ((n.type as string) === "new_notice") return "/notices";
  if (n.type.startsWith("document")) return "/profile";
  return null;
}

// ============================================================================

interface Props {
  /** Optional className for outer container */
  className?: string;
}

export default function NotificationDropdown({ className = "" }: Props) {
  const router = useRouter();
  const { socket } = useSocket();
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuthContext();

  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // UNDO snackbar state
  const [undoVisible, setUndoVisible] = useState(false);
  const [undoSnapshot, setUndoSnapshot] = useState<Notification[]>([]);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // ─── Fetch unread count on mount ───────────────────────────────────────────

  useEffect(() => {
    if (isAuthLoading || !isAuthenticated) {
      setUnreadCount(0);
      return;
    }

    notificationService.getUnreadCount().then(res => {
      if (res.success) setUnreadCount(res.data?.count ?? 0);
    }).catch(() => null);
  }, [isAuthLoading, isAuthenticated]);

  // ─── Real-time socket: notification:new ────────────────────────────────────

  useEffect(() => {
    if (isAuthLoading || !isAuthenticated || !socket) return;

    const handler = (notification: Notification) => {
      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(c => c + 1);
    };

    socket.on("notification:new", handler);
    return () => { socket.off("notification:new", handler); };
  }, [socket, isAuthLoading, isAuthenticated]);

  // ─── Click outside to close ───────────────────────────────────────────────

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ─── Load notifications when opening ─────────────────────────────────────

  const loadNotifications = useCallback(async (pageNum = 1) => {
    if (isAuthLoading || !isAuthenticated) return;

    setLoading(true);
    try {
      const res = await notificationService.getNotifications({ page: pageNum, limit: 15 });
      if (res.success && res.data) {
        const incoming = res.data.notifications;
        setNotifications(prev => pageNum === 1 ? incoming : [...prev, ...incoming]);
        setUnreadCount(res.data.unreadCount);
        setHasMore(pageNum < (res.data.pagination?.pages ?? 1));
        setPage(pageNum);
      }
    } catch { /* non-fatal */ }
    finally { setLoading(false); }
  }, [isAuthLoading, isAuthenticated]);

  const handleToggle = () => {
    if (isAuthLoading) return;
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    if (!open) {
      loadNotifications(1);
    }
    setOpen(o => !o);
  };

  const handleLoadMore = () => {
    if (!loading && hasMore) loadNotifications(page + 1);
  };

  // ─── Mark single notification as read ────────────────────────────────────

  const handleMarkRead = useCallback(async (n: Notification) => {
    const isRead = n.isRead || n.read;
    if (isRead) return;

    setNotifications(prev =>
      prev.map(x => x._id === n._id ? { ...x, isRead: true, read: true } : x)
    );
    setUnreadCount(c => Math.max(0, c - 1));

    notificationService.markAsRead(n._id).catch(() => {
      // rollback on error
      setNotifications(prev =>
        prev.map(x => x._id === n._id ? { ...x, isRead: false, read: false } : x)
      );
      setUnreadCount(c => c + 1);
    });
  }, []);

  // ─── Click on notification: mark read + navigate ──────────────────────────

  const handleNotificationClick = useCallback(async (n: Notification) => {
    await handleMarkRead(n);
    const url = resolveUrl(n, user?.role);
    if (url) {
      setOpen(false);
      router.push(url);
    }
  }, [handleMarkRead, router, user?.role]);

  // ─── Mark all as read ─────────────────────────────────────────────────────

  const handleMarkAllRead = useCallback(async () => {
    const unread = notifications.filter(n => !n.isRead && !n.read);
    if (unread.length === 0) return;

    // Save snapshot for UNDO
    setUndoSnapshot([...notifications]);
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true, read: true })));
    setUnreadCount(0);

    // Show UNDO snackbar for 5 seconds
    setUndoVisible(true);
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    undoTimerRef.current = setTimeout(() => {
      setUndoVisible(false);
      setUndoSnapshot([]);
    }, 5000);

    // Persist to server
    notificationService.markAllAsRead().catch(() => {
      // rollback on server error
      setNotifications(prev => prev); // already updated optimistically
    });
  }, [notifications]);

  // ─── UNDO mark-all-read ────────────────────────────────────────────────────

  const handleUndo = useCallback(() => {
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    setUndoVisible(false);
    // Restore snapshot
    const unreadCount = undoSnapshot.filter(n => !n.isRead && !n.read).length;
    setNotifications(undoSnapshot);
    setUnreadCount(unreadCount);
    setUndoSnapshot([]);
    // Re-load from server to be safe
    loadNotifications(1);
  }, [undoSnapshot, loadNotifications]);

  // ─── Delete notification ──────────────────────────────────────────────────

  const handleDelete = useCallback(async (e: React.MouseEvent, n: Notification) => {
    e.stopPropagation();
    const wasUnread = !n.isRead && !n.read;
    setNotifications(prev => prev.filter(x => x._id !== n._id));
    if (wasUnread) setUnreadCount(c => Math.max(0, c - 1));
    notificationService.deleteNotification(n._id).catch(() => null);
  }, []);

  const { todayGroup, earlierGroup } = groupNotifications(notifications);

  if (!isAuthenticated) {
    return null;
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Bell button */}
      <button
        onClick={handleToggle}
        className="relative p-2 rounded-full hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-[#9747FF]"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5 text-gray-600" />
        {unreadCount > 0 && (
          <motion.span
            key={unreadCount}
            initial={{ scale: 0.7 }}
            animate={{ scale: 1 }}
            className="absolute -top-0.5 -right-0.5 min-w-4.5 h-4.5 flex items-center justify-center rounded-full bg-[#9747FF] text-white text-[10px] font-bold px-1 leading-none"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </motion.span>
        )}
      </button>

      {/* Dropdown panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.18 }}
            className="absolute right-0 mt-2 w-95 max-h-135 bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden z-50"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-900">Notifications</span>
                {unreadCount > 0 && (
                  <span className="bg-[#9747FF] text-white text-xs font-bold rounded-full px-2 py-0.5">
                    {unreadCount}
                  </span>
                )}
              </div>
              <button
                onClick={handleMarkAllRead}
                disabled={unreadCount === 0}
                className="flex items-center gap-1 text-xs text-[#9747FF] hover:text-purple-700 disabled:opacity-40 disabled:cursor-default transition-colors"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all as read
              </button>
            </div>

            {/* Notification list */}
            <div className="overflow-y-auto flex-1">
              {loading && notifications.length === 0 ? (
                <div className="flex flex-col gap-3 p-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="animate-pulse flex gap-3">
                      <div className="w-9 h-9 rounded-full bg-gray-100" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 bg-gray-100 rounded w-3/4" />
                        <div className="h-2.5 bg-gray-100 rounded w-full" />
                        <div className="h-2 bg-gray-100 rounded w-1/3" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                  <Bell className="w-10 h-10 mb-2 opacity-30" />
                  <p className="text-sm">You&apos;re all caught up!</p>
                </div>
              ) : (
                <>
                  {todayGroup.length > 0 && (
                    <NotifGroup label="Today" items={todayGroup} onRead={handleNotificationClick} onDelete={handleDelete} />
                  )}
                  {earlierGroup.length > 0 && (
                    <NotifGroup label="Earlier" items={earlierGroup} onRead={handleNotificationClick} onDelete={handleDelete} />
                  )}

                  {hasMore && (
                    <div className="p-3 text-center">
                      <button
                        onClick={handleLoadMore}
                        disabled={loading}
                        className="text-xs text-[#9747FF] hover:underline disabled:opacity-50"
                      >
                        {loading ? "Loading…" : "Load more"}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* UNDO snackbar */}
      <AnimatePresence>
        {undoVisible && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-9999 flex items-center gap-3 bg-gray-900 text-white text-sm px-4 py-3 rounded-xl shadow-xl"
          >
            <Check className="w-4 h-4 text-green-400" />
            <span>All notifications marked as read</span>
            <button
              onClick={handleUndo}
              className="ml-2 text-[#c084fc] font-semibold hover:text-purple-300 transition-colors"
            >
              UNDO
            </button>
            <button onClick={() => setUndoVisible(false)} className="ml-1 text-gray-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Notification group ───────────────────────────────────────────────────────

interface GroupProps {
  label: string;
  items: Notification[];
  onRead: (n: Notification) => void;
  onDelete: (e: React.MouseEvent, n: Notification) => void;
}

function NotifGroup({ label, items, onRead, onDelete }: GroupProps) {
  return (
    <div>
      <p className="px-4 pt-3 pb-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
        {label}
      </p>
      {items.map(n => (
        <NotifItem key={n._id} notification={n} onRead={onRead} onDelete={onDelete} />
      ))}
    </div>
  );
}

// ─── Single notification item ─────────────────────────────────────────────────

interface ItemProps {
  notification: Notification;
  onRead: (n: Notification) => void;
  onDelete: (e: React.MouseEvent, n: Notification) => void;
}

function NotifItem({ notification: n, onRead, onDelete }: ItemProps) {
  const isRead = n.isRead || n.read;
  const { emoji, color } = getTypeInfo(n.type);

  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      onClick={() => onRead(n)}
      className={`group relative flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-gray-50 ${
        !isRead ? "bg-purple-50/40" : ""
      }`}
    >
      {/* Icon circle */}
      <div className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-lg ${
        !isRead ? "bg-white shadow-sm ring-1 ring-purple-100" : "bg-gray-50"
      }`}>
        <span className={color}>{emoji}</span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm leading-tight ${!isRead ? "font-semibold text-gray-900" : "font-normal text-gray-700"}`}>
          {n.title}
        </p>
        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
        <p className="text-[10px] text-gray-400 mt-1">{relativeTime(n.createdAt)}</p>
      </div>

      {/* Unread dot */}
      {!isRead && (
        <span className="shrink-0 mt-1.5 w-2 h-2 rounded-full bg-[#9747FF]" />
      )}

      {/* Delete button — shown on hover */}
      <button
        onClick={(e) => onDelete(e, n)}
        className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-gray-200"
        aria-label="Delete notification"
      >
        <Trash2 className="w-3 h-3 text-gray-400" />
      </button>
    </motion.div>
  );
}
