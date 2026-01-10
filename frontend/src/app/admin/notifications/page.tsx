"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { AdminLayout } from "@/components";
import { useSocketContext } from "@/context/SocketContext";
import {
  notificationService,
  Notification,
  NotificationType,
  NotificationFilters,
} from "@/services/api/notification.service";

// Notification type labels with icons
const NOTIFICATION_CONFIG: Partial<Record<NotificationType, { label: string; icon: string; color: string; bgColor: string }>> = {
  // Booking workflow
  booking_request: { label: "Booking Request", icon: "📩", color: "text-blue-700", bgColor: "bg-blue-50" },
  booking_caregiver_accepted: { label: "Caregiver Accepted", icon: "✓", color: "text-emerald-700", bgColor: "bg-emerald-50" },
  booking_caregiver_rejected: { label: "Caregiver Declined", icon: "✗", color: "text-red-700", bgColor: "bg-red-50" },
  booking_confirmed: { label: "Confirmed", icon: "✅", color: "text-blue-700", bgColor: "bg-blue-50" },
  booking_cancelled: { label: "Cancelled", icon: "🚫", color: "text-gray-700", bgColor: "bg-gray-100" },
  // Document
  document_uploaded: { label: "Document Uploaded", icon: "📄", color: "text-amber-700", bgColor: "bg-amber-50" },
  document_verified: { label: "Document Verified", icon: "✓", color: "text-green-700", bgColor: "bg-green-50" },
  document_rejected: { label: "Document Rejected", icon: "✗", color: "text-red-700", bgColor: "bg-red-50" },
  // Profile
  profile_approved: { label: "Profile Approved", icon: "👤", color: "text-green-700", bgColor: "bg-green-50" },
  profile_update_required: { label: "Profile Update", icon: "⚠️", color: "text-amber-700", bgColor: "bg-amber-50" },
  // Dispute
  dispute_raised: { label: "Dispute Raised", icon: "⚠️", color: "text-orange-700", bgColor: "bg-orange-50" },
  dispute_resolved: { label: "Dispute Resolved", icon: "✓", color: "text-green-700", bgColor: "bg-green-50" },
  // System
  system_announcement: { label: "Announcement", icon: "📢", color: "text-blue-700", bgColor: "bg-blue-50" },
  welcome: { label: "Welcome", icon: "👋", color: "text-purple-700", bgColor: "bg-purple-50" },
};

const DEFAULT_CONFIG = { label: "Notification", icon: "🔔", color: "text-gray-700", bgColor: "bg-gray-50" };

export default function AdminNotificationsPage() {
  const router = useRouter();
  const { socket, isConnected } = useSocketContext();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 20,
    pages: 0,
  });
  const [unreadCount, setUnreadCount] = useState(0);
  const [filters, setFilters] = useState<NotificationFilters>({
    page: 1,
    limit: 20,
  });
  const [filterTab, setFilterTab] = useState<"all" | "unread">("all");
  const [isMarkingRead, setIsMarkingRead] = useState(false);
  const realtimeRefreshRef = useRef<number | null>(null);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await notificationService.getNotifications({
        ...filters,
        ...(filterTab === "unread" ? { read: false } : {}),
      });
      if (response.success && response.data) {
        setNotifications(response.data.notifications);
        setPagination(response.data.pagination);
        setUnreadCount(response.data.unreadCount || 0);
      }
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
      setError("Failed to load notifications");
    } finally {
      setIsLoading(false);
    }
  }, [filters, filterTab]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const scheduleRealtimeRefresh = useCallback(() => {
    if (realtimeRefreshRef.current) {
      window.clearTimeout(realtimeRefreshRef.current);
    }

    realtimeRefreshRef.current = window.setTimeout(() => {
      void fetchNotifications();
    }, 300);
  }, [fetchNotifications]);

  useEffect(() => {
    if (!socket) return;

    const realtimeEvents = [
      "notification:new",
      "admin:review:new",
      "admin:review:moderated",
      "booking:created",
      "booking:confirmed",
      "booking:payment_completed",
      "booking:completed",
      "system:stats_updated",
    ];

    realtimeEvents.forEach((eventName) => {
      socket.on(eventName, scheduleRealtimeRefresh);
    });

    return () => {
      realtimeEvents.forEach((eventName) => {
        socket.off(eventName, scheduleRealtimeRefresh);
      });

      if (realtimeRefreshRef.current) {
        window.clearTimeout(realtimeRefreshRef.current);
        realtimeRefreshRef.current = null;
      }
    };
  }, [scheduleRealtimeRefresh, socket]);

  // Format time ago
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 60) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  };

  // Mark notification as read
  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await notificationService.markAsRead(notificationId);
      setNotifications((prev) =>
        prev.map((n) =>
          n._id === notificationId ? { ...n, read: true } : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  };

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    setIsMarkingRead(true);
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    } finally {
      setIsMarkingRead(false);
    }
  };

  const normalizeAdminActionUrl = (raw: string) => {
    const trimmed = raw.trim();

    if (trimmed === "/bookings") {
      return "/admin/bookings";
    }

    const bookingMatch = trimmed.match(/^\/bookings\/([^/?#]+)$/);
    if (bookingMatch) {
      return `/admin/bookings/${bookingMatch[1]}`;
    }

    return trimmed;
  };

  // Handle notification click
  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read) {
      await handleMarkAsRead(notification._id);
    }
    
    // Navigate based on notification type
    if (notification.data?.actionUrl) {
      router.push(normalizeAdminActionUrl(notification.data.actionUrl as string));
    } else if (notification.data?.referenceType === "booking") {
      router.push(`/admin/bookings/${notification.data.referenceId}`);
    } else if (notification.data?.referenceType === "document") {
      router.push(`/admin/documents`);
    } else if (notification.data?.referenceType === "user") {
      router.push(`/admin/users/${notification.data.referenceId}`);
    }
  };

  // Get config for notification type
  const getConfig = (type: NotificationType) => {
    return NOTIFICATION_CONFIG[type] || DEFAULT_CONFIG;
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
            <p className="mt-1 text-sm text-gray-500 flex items-center gap-2">
              <span
                className={`inline-block w-2 h-2 rounded-full ${
                  isConnected ? "bg-emerald-500" : "bg-amber-500"
                }`}
              />
              {unreadCount > 0
                ? `${unreadCount} unread notification${unreadCount !== 1 ? "s" : ""}`
                : "All caught up!"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                disabled={isMarkingRead}
                className="px-4 py-2 text-sm font-medium text-[#9747FF] bg-[#9747FF]/10 rounded-lg hover:bg-[#9747FF]/20 transition-colors disabled:opacity-50"
              >
                {isMarkingRead ? "Marking..." : "Mark all as read"}
              </button>
            )}
            <button
              onClick={fetchNotifications}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex gap-2">
            <button
              onClick={() => {
                setFilterTab("all");
                setFilters((prev) => ({ ...prev, page: 1 }));
              }}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                filterTab === "all"
                  ? "bg-[#9747FF] text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              All
            </button>
            <button
              onClick={() => {
                setFilterTab("unread");
                setFilters((prev) => ({ ...prev, page: 1 }));
              }}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${
                filterTab === "unread"
                  ? "bg-[#9747FF] text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              Unread
              {unreadCount > 0 && (
                <span className={`min-w-5 h-5 flex items-center justify-center px-1.5 text-xs font-bold rounded-full ${
                  filterTab === "unread" ? "bg-white/20" : "bg-red-500 text-white"
                }`}>
                  {unreadCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center">
              <div className="w-10 h-10 mx-auto border-4 border-[#9747FF] border-t-transparent rounded-full animate-spin"></div>
              <p className="mt-4 text-gray-500">Loading notifications...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                {filterTab === "unread" ? "No unread notifications" : "No notifications yet"}
              </h3>
              <p className="text-gray-500">
                {filterTab === "unread"
                  ? "You're all caught up!"
                  : "Notifications will appear here when there's activity."}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {notifications.map((notification) => {
                const config = getConfig(notification.type);
                return (
                  <div
                    key={notification._id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`flex items-start gap-4 p-4 cursor-pointer transition-colors hover:bg-gray-50 ${
                      !notification.read ? "bg-[#9747FF]/5" : ""
                    }`}
                  >
                    {/* Icon */}
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${config.bgColor}`}>
                      <span className="text-lg">{config.icon}</span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${config.bgColor} ${config.color}`}>
                              {config.label}
                            </span>
                            {!notification.read && (
                              <span className="w-2 h-2 bg-[#9747FF] rounded-full"></span>
                            )}
                          </div>
                          <h3 className={`mt-1 text-sm ${!notification.read ? "font-semibold text-gray-900" : "font-medium text-gray-700"}`}>
                            {notification.title}
                          </h3>
                          <p className="mt-0.5 text-sm text-gray-500 line-clamp-2">
                            {notification.message}
                          </p>
                        </div>
                        <span className="text-xs text-gray-400 whitespace-nowrap shrink-0">
                          {formatTimeAgo(notification.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
              <p className="text-sm text-gray-600">
                Page {pagination.page} of {pagination.pages}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className="px-3 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page === pagination.pages}
                  className="px-3 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
