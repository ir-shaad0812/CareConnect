"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  BellOff,
  CheckCheck,
  Trash2,
  CalendarDays,
  CreditCard,
  FileText,
  MessageSquare,
  UserCheck,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Shield,
  Megaphone,
  Star,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { useAuthContext } from "@/context/AuthContext";
import {
  notificationService,
  Notification,
  NotificationType,
  NotificationFilters,
} from "@/services/api/notification.service";
import { CaregiverLayout } from "../caregiver/components";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useSocket } from "@/context/SocketContext";

const NOTIFICATION_TYPE_LABELS: Partial<Record<NotificationType, string>> = {
  booking_request: "Booking Request",
  booking_caregiver_accepted: "Booking Confirmed",
  booking_caregiver_rejected: "Caregiver Declined",
  booking_confirmed: "Booking Confirmed",
  booking_rejected: "Booking Rejected",
  booking_cancelled: "Booking Cancelled",
  booking_modified: "Booking Modified",
  booking_reminder: "Booking Reminder",
  booking_started: "Service Started",
  booking_completed: "Service Completed",
  check_in: "Caregiver Checked In",
  check_out: "Caregiver Checked Out",
  check_in_reminder: "Check-in Reminder",
  check_out_reminder: "Check-out Reminder",
  care_report_submitted: "Care Report",
  care_report_updated: "Care Report Updated",
  incident_reported: "Incident Reported",
  payment_received: "Payment Received",
  payment_released: "Payment Released",
  payment_pending: "Payment Pending",
  payment_failed: "Payment Failed",
  payment_due: "Payment Due",
  refund_processed: "Refund Processed",
  payout_sent: "Payout Sent",
  dispute_raised: "Dispute Raised",
  dispute_resolved: "Dispute Resolved",
  document_uploaded: "Document Uploaded",
  document_verified: "Document Verified",
  document_approved: "Document Approved",
  document_rejected: "Document Rejected",
  document_expiring: "Document Expiring",
  profile_viewed: "Profile Viewed",
  profile_approved: "Profile Approved",
  profile_update_required: "Profile Update Required",
  review_received: "Review Received",
  review_response: "Review Response",
  review_reminder: "Review Reminder",
  new_message: "New Message",
  message_received: "New Message",
  system_announcement: "System Announcement",
  system_update: "System Update",
  welcome: "Welcome",
  account_activated: "Account Activated",
  account_suspended: "Account Suspended",
};

const getNotificationIcon = (type: NotificationType): React.ElementType => {
  if (type.startsWith("booking_") || type === "check_in" || type === "check_out")
    return CalendarDays;
  if (type.startsWith("check_")) return Clock;
  if (type.startsWith("care_report") || type === "incident_reported") return FileText;
  if (type.startsWith("payment_") || type.startsWith("refund_") || type.startsWith("payout_") || type.startsWith("dispute_")) return CreditCard;
  if (type.startsWith("document_")) return FileText;
  if (type.startsWith("profile_")) return UserCheck;
  if (type.startsWith("review_")) return Star;
  if (type.startsWith("message") || type === "new_message") return MessageSquare;
  if (type.startsWith("system_")) return Megaphone;
  if (type === "welcome" || type === "account_activated") return CheckCircle2;
  if (type === "account_suspended") return Shield;
  return Bell;
};

const getNotificationIconColor = (type: NotificationType): { bg: string; text: string } => {
  if (type.includes("confirmed") || type.includes("approved") || type.includes("completed") || type.includes("activated") || type === "welcome")
    return { bg: "bg-[#39B54A]/10", text: "text-[#39B54A]" };
  if (type.includes("rejected") || type.includes("cancelled") || type.includes("failed") || type.includes("suspended"))
    return { bg: "bg-red-50", text: "text-red-500" };
  if (type.includes("pending") || type.includes("reminder") || type.includes("due"))
    return { bg: "bg-amber-50", text: "text-amber-500" };
  if (type.includes("payment") || type.includes("refund") || type.includes("payout") || type.includes("dispute"))
    return { bg: "bg-blue-50", text: "text-blue-500" };
  if (type.includes("message"))
    return { bg: "bg-violet-50", text: "text-violet-500" };
  return { bg: "bg-gray-50", text: "text-gray-500" };
};

const getWalletDestination = (role?: string | null): string => {
  if (role === "caregiver") {
    return "/dashboard/caregiver/wallet";
  }

  if (role === "careseeker") {
    return "/dashboard/careseeker/wallet";
  }

  return "/dashboard/payments";
};

export default function NotificationsPage() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuthContext();
  const { socket } = useSocket();
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
        setUnreadCount(response.data.unreadCount);
      }
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
      setError("Failed to load notifications");
    } finally {
      setIsLoading(false);
    }
  }, [filters, filterTab]);

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    if (!user) {
      router.push("/login?redirect=/dashboard/notifications");
      return;
    }

    fetchNotifications();
  }, [isAuthLoading, user, router, fetchNotifications]);

  // Real-time: prepend new notification when it arrives
  useEffect(() => {
    if (!socket) return;
    const handleNew = (notification: Notification) => {
      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(prev => prev + 1);
    };
    socket.on("notification:new", handleNew);
    return () => { socket.off("notification:new", handleNew); };
  }, [socket]);

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await notificationService.markAsRead(notificationId);
      setNotifications((prev) =>
        prev.map((n) => (n._id === notificationId ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Failed to mark as read:", err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  };

  const handleDelete = async (notificationId: string) => {
    try {
      await notificationService.deleteNotification(notificationId);
      setNotifications((prev) => prev.filter((n) => n._id !== notificationId));
    } catch (err) {
      console.error("Failed to delete notification:", err);
    }
  };

  const handlePageChange = (page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffDays === 0) {
      return date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      });
    } else if (diffDays === 1) {
      return "Yesterday";
    } else if (diffDays < 7) {
      return date.toLocaleDateString("en-US", { weekday: "long" });
    } else {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: diffDays > 365 ? "numeric" : undefined,
      });
    }
  };

  const getReviewActionUrl = (bookingId: string): string => {
    if (user?.role === "careseeker") {
      return `/dashboard/careseeker/reviews?bookingId=${bookingId}`;
    }

    if (user?.role === "caregiver") {
      return "/dashboard/caregiver/reviews";
    }

    return `/dashboard/reviews/write?bookingId=${bookingId}`;
  };

  const normalizeNotificationActionUrl = (raw: string): string => {
    const trimmed = raw.trim();

    if (trimmed === "/bookings") {
      return "/dashboard/bookings";
    }

    const reviewMatch = trimmed.match(/^\/bookings\/([^/?#]+)\/review$/);
    if (reviewMatch) {
      return getReviewActionUrl(reviewMatch[1]);
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
      return getWalletDestination(user?.role);
    }

    return trimmed;
  };

  const getActionUrl = (notification: Notification): string | null => {
    const data = (notification.data || {}) as Record<string, unknown>;

    if (typeof data.actionUrl === "string" && data.actionUrl.trim().length > 0) {
      return normalizeNotificationActionUrl(data.actionUrl);
    }

    const bookingRef = data.bookingId ?? data.referenceId;
    if (typeof bookingRef === "string" && bookingRef.trim().length > 0) {
      return `/dashboard/bookings/${bookingRef}`;
    }

    if (data.documentId) {
      return "/dashboard?tab=documents";
    }

    if (typeof data.referenceType === "string" && data.referenceType === "payment") {
      return getWalletDestination(user?.role);
    }

    if (typeof data.referenceType === "string" && data.referenceType === "transaction") {
      return getWalletDestination(user?.role);
    }

    return null;
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read) {
      await handleMarkAsRead(notification._id);
    }
    const actionUrl = getActionUrl(notification);
    if (actionUrl) {
      router.push(actionUrl);
    }
  };

  const pageContent = (
    <div className="space-y-6 max-w-4xl">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Notifications</h1>
            <p className="text-sm text-gray-500 mt-1">
              {unreadCount > 0
                ? `${unreadCount} unread notification${unreadCount !== 1 ? "s" : ""}`
                : "All caught up!"}
            </p>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#39B54A]/10 text-[#39B54A] rounded-xl text-sm font-medium hover:bg-[#39B54A]/20 transition-colors"
            >
              <CheckCheck size={16} />
              Mark All as Read
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl p-1 inline-flex border border-gray-100/80">
          <button
            onClick={() => {
              setFilterTab("all");
              setFilters((prev) => ({ ...prev, page: 1 }));
            }}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              filterTab === "all"
                ? "bg-[#39B54A] text-white shadow-sm"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
            }`}
          >
            All
          </button>
          <button
            onClick={() => {
              setFilterTab("unread");
              setFilters((prev) => ({ ...prev, page: 1 }));
            }}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              filterTab === "unread"
                ? "bg-[#39B54A] text-white shadow-sm"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
            }`}
          >
            Unread ({unreadCount})
          </button>
        </div>

        {/* Error */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600"
          >
            <AlertTriangle size={18} />
            <span className="text-sm font-medium">{error}</span>
          </motion.div>
        )}

        {/* Notifications List */}
        {isLoading ? (
          <div className="bg-white rounded-xl border border-gray-100/80 p-16">
            <div className="flex flex-col items-center justify-center">
              <div className="relative w-12 h-12 mb-4">
                <div className="absolute inset-0 rounded-full border-[3px] border-gray-200" />
                <div className="absolute inset-0 rounded-full border-[3px] border-[#39B54A] border-t-transparent animate-spin" />
              </div>
              <p className="text-sm text-gray-500">Loading notifications...</p>
            </div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100/80 p-16">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-4 ring-1 ring-gray-100">
                <BellOff size={28} className="text-gray-400" />
              </div>
              <h3 className="text-base font-semibold text-gray-900 mb-1">
                {filterTab === "unread" ? "No unread notifications" : "No notifications yet"}
              </h3>
              <p className="text-sm text-gray-500 max-w-sm">
                {filterTab === "unread"
                  ? "You've read all your notifications!"
                  : "We'll notify you when something important happens."}
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100/80 divide-y divide-gray-50 overflow-hidden">
            <AnimatePresence>
              {notifications.map((notification, i) => {
                const actionUrl = getActionUrl(notification);
                const Icon = getNotificationIcon(notification.type);
                const iconColor = getNotificationIconColor(notification.type);

                return (
                  <motion.div
                    key={notification._id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className={`p-4 hover:bg-gray-50/50 cursor-pointer transition-colors group ${
                      !notification.read ? "bg-[#39B54A]/2" : ""
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex gap-4">
                      <div
                        className={`w-10 h-10 ${iconColor.bg} rounded-xl flex items-center justify-center shrink-0 ring-1 ring-black/5`}
                      >
                        <Icon size={18} className={iconColor.text} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <p
                              className={`text-sm leading-snug ${
                                !notification.read
                                  ? "font-semibold text-gray-900"
                                  : "font-medium text-gray-700"
                              }`}
                            >
                              {notification.title}
                            </p>
                            <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">
                              {notification.message}
                            </p>
                            <div className="flex items-center gap-3 mt-2">
                              <span className="text-[11px] text-gray-400">
                                {formatDate(notification.createdAt)}
                              </span>
                              <span className="text-[11px] px-2 py-0.5 bg-gray-50 text-gray-500 rounded-md ring-1 ring-gray-100">
                                {NOTIFICATION_TYPE_LABELS[notification.type] || notification.type}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {!notification.read && (
                              <span className="w-2 h-2 bg-[#39B54A] rounded-full ring-2 ring-[#39B54A]/20" />
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(notification._id);
                              }}
                              className="p-1.5 text-gray-300 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                              title="Delete notification"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                        {actionUrl && (
                          <Link
                            href={actionUrl}
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 mt-2.5 text-xs text-[#39B54A] hover:text-primary-600 font-medium"
                          >
                            View Details
                            <ExternalLink size={11} />
                          </Link>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-6">
            <button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border border-gray-200 text-gray-600 disabled:opacity-40 hover:bg-gray-50 transition-colors"
            >
              <ChevronLeft size={14} />
              Previous
            </button>
            <span className="text-sm text-gray-500">
              Page {pagination.page} of {pagination.pages}
            </span>
            <button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.pages}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border border-gray-200 text-gray-600 disabled:opacity-40 hover:bg-gray-50 transition-colors"
            >
              Next
              <ChevronRight size={14} />
            </button>
          </div>
        )}
    </div>
  );

  if (isAuthLoading || !user) {
    return (
      <div className="min-h-screen bg-[#FAFBFC] flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-14 h-14 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full border-[3px] border-gray-200" />
            <div className="absolute inset-0 rounded-full border-[3px] border-[#39B54A] border-t-transparent animate-spin" />
          </div>
          <p className="text-sm text-gray-500 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (user.role === "caregiver") {
    return <CaregiverLayout pageTitle="Notifications">{pageContent}</CaregiverLayout>;
  }

  return <DashboardLayout user={user}>{pageContent}</DashboardLayout>;
}

