"use client";

import { useEffect, useState, useCallback } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import {
  getAdminConversations,
  getAdminReportedMessages,
  updateReportStatus,
  getConversationMessages,
  adminForceUnlockChat,
  adminRestrictChat,
} from "@/services/api/admin.service";
import { adminService } from "@/services";
import { format } from "date-fns";
import {
  MessageCircle,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Shield,
  Eye,
  CheckCircle,
  XCircle,
  Ban,
  FileText,
  Loader2,
  RefreshCw,
  Lock,
  Unlock,
  Gavel,
  Search,
  X,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

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
  lastMessage?: { content: string; createdAt: string; messageType: string };
  bookingId?: { _id: string; bookingNumber: string; status: string };
  createdAt: string;
  updatedAt: string;
}

interface ReportedMessage {
  _id: string;
  content: string;
  messageType: string;
  senderId: Participant;
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

interface ChatMessage {
  _id: string;
  content: string;
  messageType: string;
  senderId: Participant;
  createdAt: string;
}

interface DisputedBooking {
  _id: string;
  bookingNumber: string;
  status: string;
  careSeekerId: { _id: string; fullName: string; email: string; avatar?: string };
  caregiverId: { _id: string; fullName: string; email: string; avatar?: string };
  serviceType?: string;
  serviceTypes?: string[];
  dispute?: { reason?: string; raisedBy?: string; raisedAt?: string; resolution?: string };
  pricing?: { totalAmount?: number };
  schedule?: { startDate?: string };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  active:       { bg: "bg-emerald-100", text: "text-emerald-700", label: "Active" },
  archived:     { bg: "bg-gray-100",    text: "text-gray-600",    label: "Archived" },
  closed:       { bg: "bg-red-100",     text: "text-red-600",     label: "Closed" },
  pending:      { bg: "bg-amber-100",   text: "text-amber-700",   label: "Pending" },
  reviewed:     { bg: "bg-blue-100",    text: "text-blue-700",    label: "Reviewed" },
  dismissed:    { bg: "bg-gray-100",    text: "text-gray-600",    label: "Dismissed" },
  action_taken: { bg: "bg-purple-100",  text: "text-purple-700",  label: "Action Taken" },
  disputed:     { bg: "bg-orange-100",  text: "text-orange-700",  label: "Disputed" },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_BADGE[status] ?? { bg: "bg-gray-100", text: "text-gray-600", label: status };
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
      {cfg.label}
    </span>
  );
}

function Avatar({ name, src, size = 8 }: { name: string; src?: string | undefined; size?: number | undefined }) {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  if (src)
    return (
      <img
        src={src}
        alt={name}
        className={`w-${size} h-${size} rounded-full object-cover`}
      />
    );
  return (
    <div
      className={`w-${size} h-${size} rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-semibold text-xs`}
    >
      {initials}
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  color: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-4 shadow-sm">
      <div className={`p-3 rounded-xl ${color}`}>{icon}</div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-500 mt-0.5">{label}</p>
      </div>
    </div>
  );
}

// ─── Conversation Viewer Modal ────────────────────────────────────────────────

function ConversationModal({
  conversation,
  onClose,
  onForceUnlock,
  onRestrict,
}: {
  conversation: AdminConversation;
  onClose: () => void;
  onForceUnlock: (id: string) => void;
  onRestrict: (id: string) => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionNote, setActionNote] = useState("");
  const [actionLoading, setActionLoading] = useState<"unlock" | "restrict" | null>(null);

  useEffect(() => {
    getConversationMessages(conversation._id, { limit: 50 })
      .then((res) => {
        if (res.success && res.data) {
          const d = res.data as { messages?: ChatMessage[] };
          setMessages(d.messages ?? []);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [conversation._id]);

  const handleForceUnlock = async () => {
    if (!actionNote.trim()) return;
    setActionLoading("unlock");
    try {
      await adminForceUnlockChat(conversation._id, actionNote);
      onForceUnlock(conversation._id);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRestrict = async () => {
    if (!actionNote.trim()) return;
    setActionLoading("restrict");
    try {
      await adminRestrictChat(conversation._id, actionNote);
      onRestrict(conversation._id);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-xl">
              <MessageCircle className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Conversation</h3>
              <p className="text-xs text-gray-500">
                {conversation.participants.map((p) => p.fullName).join(" & ")}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-gray-50/40">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <MessageCircle className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No messages in this conversation</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg._id} className="flex items-start gap-3">
                <Avatar name={msg.senderId?.fullName ?? "?"} size={7} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-xs font-semibold text-gray-800">
                      {msg.senderId?.fullName ?? "Unknown"}
                    </span>
                    <span className="text-xs text-gray-400">
                      {format(new Date(msg.createdAt), "MMM d, h:mm a")}
                    </span>
                  </div>
                  <div className="bg-white rounded-xl rounded-tl-sm px-4 py-2.5 border border-gray-100 shadow-sm">
                    <p className="text-sm text-gray-700">{msg.content}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Admin actions */}
        <div className="px-6 py-4 border-t border-gray-100 space-y-3">
          <input
            value={actionNote}
            onChange={(e) => setActionNote(e.target.value)}
            placeholder="Reason for action (required)…"
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-indigo-300 focus:ring-2 focus:ring-indigo-50 focus:outline-none"
          />
          <div className="flex gap-2">
            <button
              onClick={handleForceUnlock}
              disabled={!actionNote.trim() || actionLoading !== null}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {actionLoading === "unlock" ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Unlock className="w-3.5 h-3.5" />
              )}
              Force Unlock
            </button>
            <button
              onClick={handleRestrict}
              disabled={!actionNote.trim() || actionLoading !== null}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-red-700 bg-red-100 hover:bg-red-200 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {actionLoading === "restrict" ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Lock className="w-3.5 h-3.5" />
              )}
              Restrict Chat
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminMessagesPage() {
  const [activeTab, setActiveTab] = useState<"conversations" | "reports" | "disputes">(
    "conversations"
  );

  // ─── Conversations ───────────────────────────────────────────────────────────
  const [conversations, setConversations] = useState<AdminConversation[]>([]);
  const [convLoading, setConvLoading] = useState(true);
  const [convPagination, setConvPagination] = useState({
    page: 1, limit: 20, totalPages: 1, totalCount: 0,
  });
  const [statusFilter, setStatusFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [hasReportsFilter, setHasReportsFilter] = useState(false);
  const [selectedConv, setSelectedConv] = useState<AdminConversation | null>(null);

  // ─── Reports ─────────────────────────────────────────────────────────────────
  const [reports, setReports] = useState<ReportedMessage[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportsPagination, setReportsPagination] = useState({
    page: 1, limit: 20, totalPages: 1, totalCount: 0,
  });
  const [expandedReport, setExpandedReport] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // ─── Disputes ────────────────────────────────────────────────────────────────
  const [disputes, setDisputes] = useState<DisputedBooking[]>([]);
  const [disputesLoading, setDisputesLoading] = useState(false);
  const [disputesPagination, setDisputesPagination] = useState({
    page: 1, limit: 10, total: 0, pages: 0,
  });
  const [selectedDispute, setSelectedDispute] = useState<DisputedBooking | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [resolutionDecision, setResolutionDecision] = useState<
    "refund_full" | "refund_partial" | "no_refund" | "other"
  >("no_refund");
  const [disputeActionLoading, setDisputeActionLoading] = useState(false);

  // ─── Load conversations ───────────────────────────────────────────────────────
  const loadConversations = useCallback(async () => {
    setConvLoading(true);
    try {
      const response = await getAdminConversations({
        page: convPagination.page,
        limit: convPagination.limit,
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(hasReportsFilter ? { hasReports: true } : {}),
      });
      if (response.success && response.data) {
        const d = response.data as {
          conversations: AdminConversation[];
          pagination: { page: number; limit: number; totalPages: number; totalCount: number };
        };
        setConversations(d.conversations ?? []);
        if (d.pagination) setConvPagination((p) => ({ ...p, ...d.pagination }));
      }
    } catch {}
    setConvLoading(false);
  }, [convPagination.page, convPagination.limit, statusFilter, hasReportsFilter]);

  // ─── Load reports ─────────────────────────────────────────────────────────────
  const loadReports = useCallback(async () => {
    setReportsLoading(true);
    try {
      const response = await getAdminReportedMessages({
        page: reportsPagination.page,
        limit: reportsPagination.limit,
      });
      if (response.success && response.data) {
        const d = response.data as {
          reports: ReportedMessage[];
          pagination: { page: number; limit: number; totalPages: number; totalCount: number };
        };
        setReports(d.reports ?? []);
        if (d.pagination) setReportsPagination((p) => ({ ...p, ...d.pagination }));
      }
    } catch {}
    setReportsLoading(false);
  }, [reportsPagination.page, reportsPagination.limit]);

  // ─── Load disputes ────────────────────────────────────────────────────────────
  const loadDisputes = useCallback(async () => {
    setDisputesLoading(true);
    try {
      const response = await adminService.getBookings({
        status: "disputed",
        page: disputesPagination.page,
        limit: disputesPagination.limit,
      });
      if (response.success && response.data) {
        const d = response.data as unknown as {
          bookings: DisputedBooking[];
          pagination: { page: number; limit: number; total: number; pages: number };
        };
        setDisputes(d.bookings ?? []);
        if (d.pagination) setDisputesPagination((p) => ({ ...p, ...d.pagination }));
      }
    } catch {}
    setDisputesLoading(false);
  }, [disputesPagination.page, disputesPagination.limit]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (activeTab === "reports") loadReports();
    if (activeTab === "disputes") loadDisputes();
  }, [activeTab, loadReports, loadDisputes]);

  // ─── Actions ──────────────────────────────────────────────────────────────────
  const handleUpdateReport = async (messageId: string, status: string) => {
    setActionLoading(messageId);
    try {
      await updateReportStatus(messageId, status, reviewNotes[messageId] ?? "");
      setReports((prev) =>
        prev.map((r) =>
          r._id === messageId
            ? { ...r, reported: { ...r.reported, status, adminNotes: reviewNotes[messageId], isReported: true } }
            : r
        )
      );
      setExpandedReport(null);
    } catch {}
    setActionLoading(null);
  };

  const handleResolveDispute = async () => {
    if (!selectedDispute) return;
    setDisputeActionLoading(true);
    try {
      await adminService.resolveDispute(selectedDispute._id, {
        decision: resolutionDecision,
        notes: resolutionNotes,
      });
      setDisputes((prev) => prev.filter((d) => d._id !== selectedDispute._id));
      setSelectedDispute(null);
      setResolutionNotes("");
    } catch {}
    setDisputeActionLoading(false);
  };

  const handleRefresh = () => {
    if (activeTab === "conversations") loadConversations();
    else if (activeTab === "reports") loadReports();
    else loadDisputes();
  };

  // filtered conversations (local search)
  const filteredConversations = searchQuery
    ? conversations.filter((c) =>
        c.participants.some((p) =>
          p.fullName.toLowerCase().includes(searchQuery.toLowerCase())
        )
      )
    : conversations;

  return (
    <AdminLayout>
      {selectedConv && (
        <ConversationModal
          conversation={selectedConv}
          onClose={() => setSelectedConv(null)}
          onForceUnlock={(id) => {
            setConversations((prev) =>
              prev.map((c) => (c._id === id ? { ...c, status: "active" } : c))
            );
            setSelectedConv(null);
          }}
          onRestrict={(id) => {
            setConversations((prev) =>
              prev.map((c) => (c._id === id ? { ...c, status: "closed" } : c))
            );
            setSelectedConv(null);
          }}
        />
      )}

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <div className="p-2.5 bg-indigo-100 rounded-xl">
                <MessageCircle className="w-6 h-6 text-indigo-600" />
              </div>
              Messages
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Monitor conversations, reports, and resolve booking disputes
            </p>
          </div>
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={<MessageCircle className="w-5 h-5 text-indigo-600" />}
            label="Total Conversations"
            value={convPagination.totalCount}
            color="bg-indigo-50"
          />
          <StatCard
            icon={<CheckCircle className="w-5 h-5 text-emerald-600" />}
            label="Active Chats"
            value={conversations.filter((c) => c.status === "active").length}
            color="bg-emerald-50"
          />
          <StatCard
            icon={<AlertTriangle className="w-5 h-5 text-red-500" />}
            label="Pending Reports"
            value={reportsPagination.totalCount}
            color="bg-red-50"
          />
          <StatCard
            icon={<Gavel className="w-5 h-5 text-orange-600" />}
            label="Active Disputes"
            value={disputesPagination.total}
            color="bg-orange-50"
          />
        </div>

        {/* Tabs */}
        <div className="flex items-center bg-white rounded-xl p-1.5 border border-gray-200 w-fit gap-1">
          {(
            [
              { id: "conversations", label: "Conversations", icon: MessageCircle, count: convPagination.totalCount, active: "bg-indigo-600", hover: "hover:bg-indigo-50 hover:text-indigo-600" },
              { id: "reports",       label: "Reports",       icon: AlertTriangle, count: reportsPagination.totalCount, active: "bg-red-600", hover: "hover:bg-red-50 hover:text-red-600" },
              { id: "disputes",      label: "Disputes",      icon: Gavel,         count: disputesPagination.total, active: "bg-orange-500", hover: "hover:bg-orange-50 hover:text-orange-600" },
            ] as const
          ).map(({ id, label, icon: Icon, count, active, hover }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as typeof activeTab)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                activeTab === id
                  ? `${active} text-white shadow-sm`
                  : `text-gray-600 ${hover}`
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
              <span
                className={`px-2 py-0.5 rounded-full text-xs ${
                  activeTab === id ? "bg-white/20 text-white" : "bg-gray-100 text-gray-600"
                }`}
              >
                {count}
              </span>
            </button>
          ))}
        </div>

        {/* ── Conversations Tab ─────────────────────────────────────────────────── */}
        {activeTab === "conversations" && (
          <div className="space-y-4">
            {/* Filters row */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name…"
                  className="pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:border-indigo-300 focus:ring-2 focus:ring-indigo-50 focus:outline-none w-56"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setConvPagination((p) => ({ ...p, page: 1 }));
                }}
                className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:border-indigo-300 focus:ring-2 focus:ring-indigo-50 focus:outline-none"
              >
                <option value="">All Statuses</option>
                <option value="active">Active</option>
                <option value="archived">Archived</option>
                <option value="closed">Closed</option>
              </select>
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer bg-white border border-gray-200 rounded-xl px-3 py-2.5">
                <input
                  type="checkbox"
                  checked={hasReportsFilter}
                  onChange={(e) => {
                    setHasReportsFilter(e.target.checked);
                    setConvPagination((p) => ({ ...p, page: 1 }));
                  }}
                  className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span>Has Reports</span>
              </label>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
              {convLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <MessageCircle className="w-12 h-12 text-gray-300 mb-3" />
                  <p className="text-gray-500 font-medium">No conversations found</p>
                  <p className="text-sm text-gray-400 mt-1">Try adjusting your filters</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50/60 border-b border-gray-100">
                        {["Participants", "Last Message", "Booking", "Status", "Label", "Updated", ""].map(
                          (h) => (
                            <th
                              key={h}
                              className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                            >
                              {h}
                            </th>
                          )
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filteredConversations.map((conv) => (
                        <tr
                          key={conv._id}
                          className="hover:bg-indigo-50/20 transition-colors group"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2.5">
                              <div className="flex -space-x-1.5">
                                {conv.participants?.slice(0, 2).map((p) => (
                                  <Avatar key={p._id} name={p.fullName} src={p.avatar} size={8} />
                                ))}
                              </div>
                              <div>
                                {conv.participants?.map((p, i) => (
                                  <span key={p._id}>
                                    <span className="font-medium text-gray-900 text-sm">{p.fullName}</span>
                                    <span className="text-xs text-gray-400 ml-1">({p.role})</span>
                                    {i < conv.participants.length - 1 && (
                                      <span className="text-gray-300 mx-1">&</span>
                                    )}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 max-w-[180px]">
                            <p className="text-sm text-gray-600 truncate">
                              {conv.lastMessage?.content ?? "No messages"}
                            </p>
                          </td>
                          <td className="px-6 py-4">
                            {conv.bookingId ? (
                              <span className="text-xs font-mono bg-gray-100 text-gray-700 px-2 py-1 rounded-md">
                                {conv.bookingId.bookingNumber}
                              </span>
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <StatusBadge status={conv.status} />
                          </td>
                          <td className="px-6 py-4">
                            {conv.label ? (
                              <span className="text-xs font-semibold capitalize text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md">
                                {conv.label}
                              </span>
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                            {format(new Date(conv.updatedAt), "MMM d, h:mm a")}
                          </td>
                          <td className="px-6 py-4">
                            <button
                              onClick={() => setSelectedConv(conv)}
                              className="opacity-0 group-hover:opacity-100 flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-all"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {convPagination.totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
                  <p className="text-sm text-gray-500">
                    Page {convPagination.page} of {convPagination.totalPages} (
                    {convPagination.totalCount} total)
                  </p>
                  <div className="flex gap-2">
                    <button
                      disabled={convPagination.page <= 1}
                      onClick={() => setConvPagination((p) => ({ ...p, page: p.page - 1 }))}
                      className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      disabled={convPagination.page >= convPagination.totalPages}
                      onClick={() => setConvPagination((p) => ({ ...p, page: p.page + 1 }))}
                      className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Reports Tab ───────────────────────────────────────────────────────── */}
        {activeTab === "reports" && (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
            {reportsLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
              </div>
            ) : reports.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <CheckCircle className="w-12 h-12 text-emerald-300 mb-3" />
                <p className="text-gray-500 font-medium">No reported messages</p>
                <p className="text-sm text-gray-400 mt-1">All clear — nothing to review.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {reports.map((report) => (
                  <div key={report._id} className="p-6 hover:bg-gray-50/50 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
                            <AlertTriangle className="w-5 h-5 text-red-600" />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 text-sm">
                              Message by {report.senderId?.fullName ?? "Unknown"}
                              <span className="text-xs text-gray-400 font-normal ml-2">
                                ({report.senderId?.role})
                              </span>
                            </p>
                            <p className="text-xs text-gray-500">
                              Reported{" "}
                              {report.reported?.reportedAt
                                ? format(new Date(report.reported.reportedAt), "MMM d, yyyy h:mm a")
                                : "recently"}
                            </p>
                          </div>
                        </div>

                        <div className="bg-gray-50 rounded-xl p-4 mb-3 border-l-4 border-red-300">
                          <p className="text-sm text-gray-700">{report.content}</p>
                          <p className="text-xs text-gray-400 mt-1.5">
                            {format(new Date(report.createdAt), "PPp")}
                          </p>
                        </div>

                        <div className="flex items-start gap-2 mb-3">
                          <FileText className="w-4 h-4 text-gray-400 mt-0.5" />
                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                              Reason
                            </p>
                            <p className="text-sm text-gray-700">
                              {report.reported?.reason ?? "No reason provided"}
                            </p>
                          </div>
                        </div>

                        <StatusBadge status={report.reported?.status ?? "pending"} />
                      </div>

                      <button
                        onClick={() =>
                          setExpandedReport(expandedReport === report._id ? null : report._id)
                        }
                        className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex-shrink-0"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Review
                      </button>
                    </div>

                    {expandedReport === report._id && (
                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">Admin Notes</h4>
                        <textarea
                          value={reviewNotes[report._id] ?? ""}
                          onChange={(e) =>
                            setReviewNotes((prev) => ({ ...prev, [report._id]: e.target.value }))
                          }
                          placeholder="Add notes about this report…"
                          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm resize-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-50 focus:outline-none"
                          rows={2}
                        />
                        <div className="flex flex-wrap gap-2 mt-3">
                          <button
                            onClick={() => handleUpdateReport(report._id, "reviewed")}
                            disabled={actionLoading === report._id}
                            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-lg transition-colors disabled:opacity-50"
                          >
                            {actionLoading === report._id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Eye className="w-3.5 h-3.5" />
                            )}
                            Mark Reviewed
                          </button>
                          <button
                            onClick={() => handleUpdateReport(report._id, "action_taken")}
                            disabled={actionLoading === report._id}
                            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-red-700 bg-red-100 hover:bg-red-200 rounded-lg transition-colors disabled:opacity-50"
                          >
                            {actionLoading === report._id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Ban className="w-3.5 h-3.5" />
                            )}
                            Take Action
                          </button>
                          <button
                            onClick={() => handleUpdateReport(report._id, "dismissed")}
                            disabled={actionLoading === report._id}
                            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
                          >
                            {actionLoading === report._id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <XCircle className="w-3.5 h-3.5" />
                            )}
                            Dismiss
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {reportsPagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
                <p className="text-sm text-gray-500">
                  Page {reportsPagination.page} of {reportsPagination.totalPages} (
                  {reportsPagination.totalCount} total)
                </p>
                <div className="flex gap-2">
                  <button
                    disabled={reportsPagination.page <= 1}
                    onClick={() => setReportsPagination((p) => ({ ...p, page: p.page - 1 }))}
                    className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    disabled={reportsPagination.page >= reportsPagination.totalPages}
                    onClick={() => setReportsPagination((p) => ({ ...p, page: p.page + 1 }))}
                    className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Disputes Tab ──────────────────────────────────────────────────────── */}
        {activeTab === "disputes" && (
          <div className="space-y-4">
            {/* Resolve modal */}
            {selectedDispute && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
                  <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-orange-100 rounded-xl">
                        <Gavel className="w-5 h-5 text-orange-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">Resolve Dispute</h3>
                        <p className="text-xs text-gray-500">{selectedDispute.bookingNumber}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedDispute(null)}
                      className="p-2 hover:bg-gray-100 rounded-xl"
                    >
                      <X className="w-5 h-5 text-gray-500" />
                    </button>
                  </div>

                  <div className="p-6 space-y-4">
                    {/* Parties */}
                    <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                      <div className="flex-1">
                        <p className="text-xs text-gray-500 mb-1">Care Seeker</p>
                        <div className="flex items-center gap-2">
                          <Avatar name={selectedDispute.careSeekerId.fullName} size={7} />
                          <span className="text-sm font-medium text-gray-900">
                            {selectedDispute.careSeekerId.fullName}
                          </span>
                        </div>
                      </div>
                      <span className="text-gray-300 text-lg font-bold">vs</span>
                      <div className="flex-1 text-right">
                        <p className="text-xs text-gray-500 mb-1">Caregiver</p>
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-sm font-medium text-gray-900">
                            {selectedDispute.caregiverId.fullName}
                          </span>
                          <Avatar name={selectedDispute.caregiverId.fullName} size={7} />
                        </div>
                      </div>
                    </div>

                    {selectedDispute.dispute?.reason && (
                      <div className="p-4 bg-orange-50 rounded-xl border-l-4 border-orange-300">
                        <p className="text-xs font-semibold text-orange-700 uppercase tracking-wide mb-1">
                          Dispute Reason
                        </p>
                        <p className="text-sm text-orange-800">{selectedDispute.dispute.reason}</p>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Resolution Decision
                      </label>
                      <select
                        value={resolutionDecision}
                        onChange={(e) =>
                          setResolutionDecision(
                            e.target.value as typeof resolutionDecision
                          )
                        }
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:border-orange-300 focus:ring-2 focus:ring-orange-50 focus:outline-none"
                      >
                        <option value="refund_full">Full Refund to Client</option>
                        <option value="refund_partial">Partial Refund</option>
                        <option value="no_refund">No Refund — Pay Caregiver</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Resolution Notes
                      </label>
                      <textarea
                        value={resolutionNotes}
                        onChange={(e) => setResolutionNotes(e.target.value)}
                        placeholder="Explain the resolution decision…"
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm resize-none focus:border-orange-300 focus:ring-2 focus:ring-orange-50 focus:outline-none"
                        rows={3}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/40">
                    <button
                      onClick={() => setSelectedDispute(null)}
                      className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleResolveDispute}
                      disabled={!resolutionNotes.trim() || disputeActionLoading}
                      className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                    >
                      {disputeActionLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Gavel className="w-4 h-4" />
                      )}
                      Resolve Dispute
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
              {disputesLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
                </div>
              ) : disputes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <Shield className="w-12 h-12 text-emerald-300 mb-3" />
                  <p className="text-gray-500 font-medium">No active disputes</p>
                  <p className="text-sm text-gray-400 mt-1">All bookings are running smoothly.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {disputes.map((d) => (
                    <div key={d._id} className="p-6 hover:bg-orange-50/20 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
                              <Gavel className="w-5 h-5 text-orange-600" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                                  {d.bookingNumber}
                                </span>
                                <StatusBadge status="disputed" />
                              </div>
                              <p className="text-xs text-gray-500 mt-1">
                                {d.schedule?.startDate
                                  ? format(new Date(d.schedule.startDate), "MMM d, yyyy")
                                  : "—"}
                                {d.pricing?.totalAmount != null &&
                                  ` · NPR ${d.pricing.totalAmount.toLocaleString()}`}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 mb-3">
                            <div className="flex items-center gap-2">
                              <Avatar name={d.careSeekerId.fullName} src={d.careSeekerId.avatar} size={7} />
                              <div>
                                <p className="text-xs text-gray-500">Care Seeker</p>
                                <p className="text-sm font-medium text-gray-900">
                                  {d.careSeekerId.fullName}
                                </p>
                              </div>
                            </div>
                            <span className="text-gray-300">vs</span>
                            <div className="flex items-center gap-2">
                              <Avatar name={d.caregiverId.fullName} src={d.caregiverId.avatar} size={7} />
                              <div>
                                <p className="text-xs text-gray-500">Caregiver</p>
                                <p className="text-sm font-medium text-gray-900">
                                  {d.caregiverId.fullName}
                                </p>
                              </div>
                            </div>
                          </div>

                          {d.dispute?.reason && (
                            <div className="bg-orange-50 rounded-lg px-4 py-2.5 border-l-4 border-orange-300 text-sm text-orange-800">
                              {d.dispute.reason}
                            </div>
                          )}
                        </div>

                        <button
                          onClick={() => {
                            setSelectedDispute(d);
                            setResolutionNotes("");
                            setResolutionDecision("no_refund");
                          }}
                          className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-orange-700 bg-orange-100 hover:bg-orange-200 rounded-xl transition-colors flex-shrink-0"
                        >
                          <Gavel className="w-3.5 h-3.5" />
                          Resolve
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {disputesPagination.pages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
                  <p className="text-sm text-gray-500">
                    Page {disputesPagination.page} of {disputesPagination.pages} (
                    {disputesPagination.total} total)
                  </p>
                  <div className="flex gap-2">
                    <button
                      disabled={disputesPagination.page <= 1}
                      onClick={() => setDisputesPagination((p) => ({ ...p, page: p.page - 1 }))}
                      className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      disabled={disputesPagination.page >= disputesPagination.pages}
                      onClick={() => setDisputesPagination((p) => ({ ...p, page: p.page + 1 }))}
                      className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-colors"
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
