// ============================================
// ADMIN CHAT MONITORING PAGE
// Monitor conversations & handle reports
// ============================================

"use client";

import { useEffect, useState, useCallback } from "react";
import { AdminLayout } from "@/components";
import {
  getAdminConversations,
  getAdminReportedMessages,
  updateReportStatus,
} from "@/services/api/admin.service";
import {
  MessageCircle,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Shield,
  Eye,
  CheckCircle,
  XCircle,
  Users,
  Ban,
  FileText,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { format } from "date-fns";

// ============================================
// TYPES
// ============================================

interface Participant {
  _id: string;
  fullName: string;
  role: string;
  avatar?: string;
}

interface AdminConversation {
  _id: string;
  participants: Participant[];
  status: string;
  label?: string;
  lastMessage?: {
    content: string;
    createdAt: string;
    messageType: string;
  };
  bookingId?: {
    _id: string;
    bookingNumber: string;
    status: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface ReportedMessage {
  _id: string;
  content: string;
  messageType: string;
  senderId: Participant;
  receiverId?: Participant;
  conversationId: string;
  reported?: {
    isReported: boolean;
    reportedBy?: string;
    reason?: string;
    reportedAt?: string;
    status?: string;
    adminNotes?: string;
  };
  createdAt: string;
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function AdminChatMonitoringPage() {
  const [activeTab, setActiveTab] = useState<"conversations" | "reports">("conversations");
  
  // Conversations state
  const [conversations, setConversations] = useState<AdminConversation[]>([]);
  const [conversationsLoading, setConversationsLoading] = useState(true);
  const [conversationsPagination, setConversationsPagination] = useState({
    page: 1, limit: 20, totalPages: 1, totalCount: 0,
  });
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [hasReportsFilter, setHasReportsFilter] = useState(false);

  // Reports state
  const [reports, setReports] = useState<ReportedMessage[]>([]);
  const [reportsLoading, setReportsLoading] = useState(true);
  const [reportsPagination, setReportsPagination] = useState({
    page: 1, limit: 20, totalPages: 1, totalCount: 0,
  });

  // Action state
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [expandedReport, setExpandedReport] = useState<string | null>(null);

  // ============================================
  // DATA LOADING
  // ============================================

  const loadConversations = useCallback(async () => {
    setConversationsLoading(true);
    try {
      const response = await getAdminConversations({
        page: conversationsPagination.page,
        limit: conversationsPagination.limit,
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(hasReportsFilter ? { hasReports: true } : {}),
      });
      if (response.success && response.data) {
        const data = response.data as {
          conversations: AdminConversation[];
          pagination: { page: number; limit: number; totalPages: number; totalCount: number };
        };
        setConversations(data.conversations || []);
        if (data.pagination) {
          setConversationsPagination((prev) => ({ ...prev, ...data.pagination }));
        }
      }
    } catch (error) {
      console.error("Failed to load conversations:", error);
    } finally {
      setConversationsLoading(false);
    }
  }, [conversationsPagination.page, conversationsPagination.limit, statusFilter, hasReportsFilter]);

  const loadReports = useCallback(async () => {
    setReportsLoading(true);
    try {
      const response = await getAdminReportedMessages({
        page: reportsPagination.page,
        limit: reportsPagination.limit,
      });
      if (response.success && response.data) {
        const data = response.data as {
          reports: ReportedMessage[];
          pagination: { page: number; limit: number; totalPages: number; totalCount: number };
        };
        setReports(data.reports || []);
        if (data.pagination) {
          setReportsPagination((prev) => ({ ...prev, ...data.pagination }));
        }
      }
    } catch (error) {
      console.error("Failed to load reports:", error);
    } finally {
      setReportsLoading(false);
    }
  }, [reportsPagination.page, reportsPagination.limit]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (activeTab === "reports") {
      loadReports();
    }
  }, [activeTab, loadReports]);

  // ============================================
  // ACTIONS
  // ============================================

  const handleUpdateReportStatus = async (messageId: string, status: string) => {
    setActionLoading(messageId);
    try {
      await updateReportStatus(messageId, status, reviewNotes[messageId] || "");
      setReports((prev) =>
        prev.map((r) =>
          r._id === messageId
            ? { ...r, reported: { ...r.reported, status, adminNotes: reviewNotes[messageId], isReported: true } }
            : r
        )
      );
      setExpandedReport(null);
    } catch (error) {
      console.error("Failed to update report status:", error);
    } finally {
      setActionLoading(null);
    }
  };

  // ============================================
  // STATUS BADGES
  // ============================================

  const StatusBadge = ({ status }: { status: string }) => {
    const configs: Record<string, { bg: string; text: string; label: string }> = {
      active: { bg: "bg-green-100", text: "text-green-700", label: "Active" },
      archived: { bg: "bg-gray-100", text: "text-gray-600", label: "Archived" },
      closed: { bg: "bg-red-100", text: "text-red-600", label: "Closed" },
      pending: { bg: "bg-amber-100", text: "text-amber-700", label: "Pending" },
      reviewed: { bg: "bg-blue-100", text: "text-blue-700", label: "Reviewed" },
      dismissed: { bg: "bg-gray-100", text: "text-gray-600", label: "Dismissed" },
      action_taken: { bg: "bg-purple-100", text: "text-purple-700", label: "Action Taken" },
    };
    const config = configs[status] || { bg: "bg-gray-100", text: "text-gray-600", label: status };
    return (
      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  // ============================================
  // RENDER
  // ============================================

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <div className="p-2.5 bg-indigo-100 rounded-xl">
                <Shield className="w-6 h-6 text-indigo-600" />
              </div>
              Chat Monitoring
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Monitor conversations and manage reported messages
            </p>
          </div>
          <button
            onClick={() => activeTab === "conversations" ? loadConversations() : loadReports()}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-white rounded-xl p-1.5 border border-gray-200 w-fit">
          <button
            onClick={() => setActiveTab("conversations")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              activeTab === "conversations"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-gray-600 hover:text-indigo-600 hover:bg-indigo-50"
            }`}
          >
            <MessageCircle className="w-4 h-4" />
            Conversations
            <span className={`px-2 py-0.5 rounded-full text-xs ${
              activeTab === "conversations" ? "bg-indigo-500 text-white" : "bg-gray-100 text-gray-600"
            }`}>
              {conversationsPagination.totalCount}
            </span>
          </button>
          <button
            onClick={() => setActiveTab("reports")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              activeTab === "reports"
                ? "bg-red-600 text-white shadow-sm"
                : "text-gray-600 hover:text-red-600 hover:bg-red-50"
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            Reports
            <span className={`px-2 py-0.5 rounded-full text-xs ${
              activeTab === "reports" ? "bg-red-500 text-white" : "bg-gray-100 text-gray-600"
            }`}>
              {reportsPagination.totalCount}
            </span>
          </button>
        </div>

        {/* ═══════════════════════════════════════════
            CONVERSATIONS TAB
        ═══════════════════════════════════════════ */}
        {activeTab === "conversations" && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex items-center gap-3 flex-wrap">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setConversationsPagination((p) => ({ ...p, page: 1 }));
                }}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:border-indigo-300 focus:ring-2 focus:ring-indigo-50 focus:outline-none"
              >
                <option value="">All Statuses</option>
                <option value="active">Active</option>
                <option value="archived">Archived</option>
                <option value="closed">Closed</option>
              </select>
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasReportsFilter}
                  onChange={(e) => {
                    setHasReportsFilter(e.target.checked);
                    setConversationsPagination((p) => ({ ...p, page: 1 }));
                  }}
                  className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                Has Reports
              </label>
            </div>

            {/* Conversations Table */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              {conversationsLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                </div>
              ) : conversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <MessageCircle className="w-12 h-12 text-gray-300 mb-3" />
                  <p className="text-gray-500 font-medium">No conversations found</p>
                  <p className="text-sm text-gray-400 mt-1">Try adjusting your filters</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Participants</th>
                        <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Last Message</th>
                        <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Booking</th>
                        <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Label</th>
                        <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Updated</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {conversations.map((conv) => (
                        <tr key={conv._id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <Users className="w-4 h-4 text-gray-400" />
                              <div>
                                {conv.participants?.map((p, i) => (
                                  <span key={p._id}>
                                    <span className="font-medium text-gray-900 text-sm">{p.fullName}</span>
                                    <span className="text-xs text-gray-400 ml-1">({p.role})</span>
                                    {i < conv.participants.length - 1 && <span className="text-gray-300 mx-1">&</span>}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm text-gray-600 truncate max-w-[200px]">
                              {conv.lastMessage?.content || "No messages"}
                            </p>
                          </td>
                          <td className="px-6 py-4">
                            {conv.bookingId ? (
                              <span className="text-xs font-mono bg-gray-100 text-gray-700 px-2 py-1 rounded">
                                {conv.bookingId.bookingNumber}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400">—</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <StatusBadge status={conv.status} />
                          </td>
                          <td className="px-6 py-4">
                            {conv.label ? (
                              <span className="text-xs font-semibold capitalize text-indigo-600 bg-indigo-50 px-2 py-1 rounded">
                                {conv.label}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400">—</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {format(new Date(conv.updatedAt), "MMM d, h:mm a")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination */}
              {conversationsPagination.totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
                  <p className="text-sm text-gray-500">
                    Page {conversationsPagination.page} of {conversationsPagination.totalPages} ({conversationsPagination.totalCount} total)
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      disabled={conversationsPagination.page <= 1}
                      onClick={() => setConversationsPagination((p) => ({ ...p, page: p.page - 1 }))}
                      className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      disabled={conversationsPagination.page >= conversationsPagination.totalPages}
                      onClick={() => setConversationsPagination((p) => ({ ...p, page: p.page + 1 }))}
                      className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════
            REPORTS TAB
        ═══════════════════════════════════════════ */}
        {activeTab === "reports" && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              {reportsLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
                </div>
              ) : reports.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <CheckCircle className="w-12 h-12 text-green-300 mb-3" />
                  <p className="text-gray-500 font-medium">No reported messages</p>
                  <p className="text-sm text-gray-400 mt-1">All clear! No messages have been reported.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {reports.map((report) => (
                    <div key={report._id} className="p-6 hover:bg-gray-50/50 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          {/* Reporter & Sender info */}
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                              <AlertTriangle className="w-5 h-5 text-red-600" />
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900 text-sm">
                                Message by {report.senderId?.fullName || "Unknown"}
                                <span className="text-xs text-gray-400 font-normal ml-2">
                                  ({report.senderId?.role})
                                </span>
                              </p>
                              <p className="text-xs text-gray-500">
                                Reported {report.reported?.reportedAt ? format(new Date(report.reported.reportedAt), "MMM d, yyyy h:mm a") : "recently"}
                              </p>
                            </div>
                          </div>

                          {/* Reported message content */}
                          <div className="bg-gray-50 rounded-xl p-4 mb-3 border-l-4 border-red-300">
                            <p className="text-sm text-gray-700">{report.content}</p>
                            <p className="text-xs text-gray-400 mt-2">
                              {format(new Date(report.createdAt), "PPp")}
                            </p>
                          </div>

                          {/* Report reason */}
                          <div className="flex items-start gap-2 mb-3">
                            <FileText className="w-4 h-4 text-gray-400 mt-0.5" />
                            <div>
                              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Reason</p>
                              <p className="text-sm text-gray-700">{report.reported?.reason || "No reason provided"}</p>
                            </div>
                          </div>

                          {/* Current status */}
                          <div className="flex items-center gap-2">
                            <StatusBadge status={report.reported?.status || "pending"} />
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => setExpandedReport(expandedReport === report._id ? null : report._id)}
                            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Review
                          </button>
                        </div>
                      </div>

                      {/* Expanded review panel */}
                      {expandedReport === report._id && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <h4 className="text-sm font-semibold text-gray-700 mb-2">Admin Notes</h4>
                          <textarea
                            value={reviewNotes[report._id] || ""}
                            onChange={(e) => setReviewNotes((prev) => ({ ...prev, [report._id]: e.target.value }))}
                            placeholder="Add notes about this report..."
                            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm resize-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-50 focus:outline-none"
                            rows={2}
                          />
                          <div className="flex items-center gap-2 mt-3">
                            <button
                              onClick={() => handleUpdateReportStatus(report._id, "reviewed")}
                              disabled={actionLoading === report._id}
                              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-lg transition-colors disabled:opacity-50"
                            >
                              {actionLoading === report._id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
                              Mark Reviewed
                            </button>
                            <button
                              onClick={() => handleUpdateReportStatus(report._id, "action_taken")}
                              disabled={actionLoading === report._id}
                              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-red-700 bg-red-100 hover:bg-red-200 rounded-lg transition-colors disabled:opacity-50"
                            >
                              {actionLoading === report._id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Ban className="w-3.5 h-3.5" />}
                              Take Action
                            </button>
                            <button
                              onClick={() => handleUpdateReportStatus(report._id, "dismissed")}
                              disabled={actionLoading === report._id}
                              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
                            >
                              {actionLoading === report._id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                              Dismiss
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Pagination */}
              {reportsPagination.totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
                  <p className="text-sm text-gray-500">
                    Page {reportsPagination.page} of {reportsPagination.totalPages} ({reportsPagination.totalCount} total)
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      disabled={reportsPagination.page <= 1}
                      onClick={() => setReportsPagination((p) => ({ ...p, page: p.page - 1 }))}
                      className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      disabled={reportsPagination.page >= reportsPagination.totalPages}
                      onClick={() => setReportsPagination((p) => ({ ...p, page: p.page + 1 }))}
                      className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
