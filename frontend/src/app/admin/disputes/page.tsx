"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { AdminLayout } from "@/components";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  X,
  Send,
  Clock,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Eye,
  MessageSquare,
  FileText,
  User,
  Users,
  Calendar,
  ArrowUpRight,
  Loader2,
  RefreshCw,
  Gavel,
  StickyNote,
  DollarSign,
  Ban,
  Scale,
  HandCoins,
  CircleDot,
} from "lucide-react";
import disputeService, {
  Dispute,
  DisputeStats,
  DisputeTimeline,
  DisputeMessage,
} from "@/services/api/dispute.service";

// ============================================
// CONSTANTS & CONFIGS
// ============================================

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bgColor: string; borderColor: string; icon: React.ElementType }
> = {
  open: {
    label: "Open",
    color: "text-blue-700",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    icon: CircleDot,
  },
  investigating: {
    label: "Investigating",
    color: "text-amber-700",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
    icon: Eye,
  },
  awaiting_response: {
    label: "Awaiting Response",
    color: "text-purple-700",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200",
    icon: Clock,
  },
  resolved: {
    label: "Resolved",
    color: "text-emerald-700",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-200",
    icon: CheckCircle2,
  },
  dismissed: {
    label: "Dismissed",
    color: "text-gray-700",
    bgColor: "bg-gray-100",
    borderColor: "border-gray-200",
    icon: XCircle,
  },
  escalated: {
    label: "Escalated",
    color: "text-red-700",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    icon: AlertTriangle,
  },
};

const PRIORITY_CONFIG: Record<
  string,
  { label: string; color: string; bgColor: string; dotColor: string }
> = {
  low: { label: "Low", color: "text-gray-600", bgColor: "bg-gray-100", dotColor: "bg-gray-400" },
  medium: { label: "Medium", color: "text-blue-700", bgColor: "bg-blue-50", dotColor: "bg-blue-500" },
  high: { label: "High", color: "text-orange-700", bgColor: "bg-orange-50", dotColor: "bg-orange-500" },
  critical: { label: "Critical", color: "text-red-700", bgColor: "bg-red-50", dotColor: "bg-red-600" },
};

const CATEGORY_LABELS: Record<string, string> = {
  service_quality: "Service Quality",
  payment_issue: "Payment Issue",
  no_show: "No Show",
  safety_concern: "Safety Concern",
  harassment: "Harassment",
  property_damage: "Property Damage",
  cancellation: "Cancellation",
  overcharge: "Overcharge",
  late_arrival: "Late Arrival",
  unprofessional: "Unprofessional Conduct",
  other: "Other",
};

const RESOLUTION_TYPES: { value: string; label: string; icon: React.ElementType; description: string }[] = [
  { value: "refund", label: "Full Refund", icon: DollarSign, description: "Issue a complete refund to the filer" },
  { value: "partial_refund", label: "Partial Refund", icon: HandCoins, description: "Issue a partial refund amount" },
  { value: "warning", label: "Warning", icon: AlertTriangle, description: "Issue a formal warning to the offender" },
  { value: "ban", label: "Ban User", icon: Ban, description: "Permanently ban the offending user" },
  { value: "no_action", label: "No Action", icon: XCircle, description: "Close with no action taken" },
  { value: "mediation", label: "Mediation", icon: Scale, description: "Arrange mediation between parties" },
  { value: "compensation", label: "Compensation", icon: HandCoins, description: "Provide compensation or credits" },
];

const STATUS_TRANSITIONS: Record<string, string[]> = {
  open: ["investigating", "escalated", "dismissed"],
  investigating: ["awaiting_response", "resolved", "escalated", "dismissed"],
  awaiting_response: ["investigating", "resolved", "escalated", "dismissed"],
  escalated: ["investigating", "resolved", "dismissed"],
  resolved: [],
  dismissed: ["open"],
};

const TIMELINE_ACTION_CONFIG: Record<string, { color: string; icon: React.ElementType }> = {
  created: { color: "bg-blue-500", icon: FileText },
  status_changed: { color: "bg-amber-500", icon: RefreshCw },
  message_sent: { color: "bg-indigo-500", icon: MessageSquare },
  evidence_added: { color: "bg-teal-500", icon: FileText },
  resolved: { color: "bg-emerald-500", icon: CheckCircle2 },
  escalated: { color: "bg-red-500", icon: AlertTriangle },
  note_added: { color: "bg-gray-500", icon: StickyNote },
  assigned: { color: "bg-purple-500", icon: User },
};

// ============================================
// ANIMATION VARIANTS
// ============================================

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

const expandVariants = {
  hidden: { opacity: 0, height: 0 },
  visible: { opacity: 1, height: "auto", transition: { duration: 0.35, ease: "easeInOut" } },
  exit: { opacity: 0, height: 0, transition: { duration: 0.25, ease: "easeInOut" } },
};

// ============================================
// HELPER
// ============================================

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(dateStr);
}

function getUserName(user: { fullName?: string }): string {
  return user.fullName || "Unknown";
}

function msToReadable(ms: number): string {
  if (!ms || ms <= 0) return "N/A";
  const hours = Math.floor(ms / 3600000);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function AdminDisputesPage() {
  // Data state
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [stats, setStats] = useState<DisputeStats | null>(null);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filters & pagination
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [priorityFilter, setPriorityFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const limit = 15;

  // Expanded row
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedDispute, setExpandedDispute] = useState<Dispute | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Action states
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [messageContent, setMessageContent] = useState("");
  const [messageTarget, setMessageTarget] = useState<string>("");
  const [noteContent, setNoteContent] = useState("");
  const [showPriorityDropdown, setShowPriorityDropdown] = useState(false);

  // Resolution form
  const [resolutionType, setResolutionType] = useState("");
  const [resolutionDescription, setResolutionDescription] = useState("");
  const [refundAmount, setRefundAmount] = useState("");

  // Detail section tabs
  const [detailTab, setDetailTab] = useState<"timeline" | "messages" | "resolution" | "notes">("timeline");

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ============================================
  // DATA FETCHING
  // ============================================

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params: Record<string, unknown> = { page, limit };
      if (statusFilter) params.status = statusFilter;
      if (priorityFilter) params.priority = priorityFilter;
      if (searchQuery) params.search = searchQuery;

      const [listRes, statsRes] = await Promise.all([
        disputeService.adminGetAll(params as Parameters<typeof disputeService.adminGetAll>[0]),
        disputeService.adminGetStats(),
      ]);

      if (listRes.success && listRes.data) {
        setDisputes(listRes.data.disputes);
        setStatusCounts(listRes.data.statusCounts || {});
        setTotalPages(listRes.data.pagination?.pages || 1);
        setTotalCount(listRes.data.pagination?.total || 0);
      }
      if (statsRes.success && statsRes.data) {
        setStats(statsRes.data.stats);
      }
    } catch {
      setError("Failed to load disputes. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, statusFilter, priorityFilter, searchQuery]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-clear success messages
  useEffect(() => {
    if (!successMessage) return;
    const t = setTimeout(() => setSuccessMessage(null), 4000);
    return () => clearTimeout(t);
  }, [successMessage]);

  // Debounced search
  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setSearchQuery(value);
      setPage(1);
    }, 400);
  };

  // ============================================
  // DETAIL FETCH
  // ============================================

  const fetchDisputeDetail = useCallback(async (disputeId: string) => {
    setDetailLoading(true);
    try {
      const res = await disputeService.getById(disputeId);
      if (res.success && res.data) {
        setExpandedDispute(res.data.dispute);
      }
    } catch {
      setError("Failed to load dispute details.");
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const toggleExpand = (disputeId: string) => {
    if (expandedId === disputeId) {
      setExpandedId(null);
      setExpandedDispute(null);
      setDetailTab("timeline");
      setMessageContent("");
      setNoteContent("");
      setResolutionType("");
      setResolutionDescription("");
      setRefundAmount("");
    } else {
      setExpandedId(disputeId);
      setDetailTab("timeline");
      fetchDisputeDetail(disputeId);
    }
  };

  // ============================================
  // ACTIONS
  // ============================================

  const handleStatusChange = async (disputeId: string, newStatus: string) => {
    setActionLoading(`status-${disputeId}`);
    try {
      const res = await disputeService.adminUpdateStatus(disputeId, newStatus);
      if (res.success) {
        setSuccessMessage(`Status updated to ${STATUS_CONFIG[newStatus]?.label || newStatus}`);
        await fetchData();
        if (expandedId === disputeId) fetchDisputeDetail(disputeId);
      }
    } catch {
      setError("Failed to update status.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleSendMessage = async (disputeId: string) => {
    if (!messageContent.trim()) return;
    setActionLoading(`msg-${disputeId}`);
    try {
      const res = await disputeService.adminSendMessage(
        disputeId,
        messageContent.trim(),
        messageTarget || undefined
      );
      if (res.success) {
        setMessageContent("");
        setMessageTarget("");
        setSuccessMessage("Message sent successfully.");
        fetchDisputeDetail(disputeId);
      }
    } catch {
      setError("Failed to send message.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleAddNote = async (disputeId: string) => {
    if (!noteContent.trim()) return;
    setActionLoading(`note-${disputeId}`);
    try {
      const res = await disputeService.adminAddNote(disputeId, noteContent.trim());
      if (res.success) {
        setNoteContent("");
        setSuccessMessage("Note added successfully.");
        fetchDisputeDetail(disputeId);
      }
    } catch {
      setError("Failed to add note.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleResolve = async (disputeId: string) => {
    if (!resolutionType) return;
    setActionLoading(`resolve-${disputeId}`);
    try {
      const data: { type: string; description?: string; refundAmount?: number } = {
        type: resolutionType,
      };
      if (resolutionDescription.trim()) data.description = resolutionDescription.trim();
      if (refundAmount && parseFloat(refundAmount) > 0) data.refundAmount = parseFloat(refundAmount);

      const res = await disputeService.adminResolve(disputeId, data);
      if (res.success) {
        setResolutionType("");
        setResolutionDescription("");
        setRefundAmount("");
        setSuccessMessage("Dispute resolved successfully.");
        await fetchData();
        if (expandedId === disputeId) fetchDisputeDetail(disputeId);
      }
    } catch {
      setError("Failed to resolve dispute.");
    } finally {
      setActionLoading(null);
    }
  };

  // ============================================
  // COMPUTED
  // ============================================

  const openCount = statusCounts.open || stats?.statusCounts?.open || 0;
  const investigatingCount = statusCounts.investigating || stats?.statusCounts?.investigating || 0;
  const resolvedCount = statusCounts.resolved || stats?.statusCounts?.resolved || 0;
  const escalatedCount = statusCounts.escalated || stats?.statusCounts?.escalated || 0;
  const totalDisputes = stats?.total || totalCount || 0;

  const statCards = [
    {
      label: "Total Disputes",
      value: totalDisputes,
      icon: Shield,
      color: "from-slate-500 to-slate-700",
      textColor: "text-slate-700",
      lightBg: "bg-slate-50",
    },
    {
      label: "Open",
      value: openCount,
      icon: CircleDot,
      color: "from-blue-500 to-blue-700",
      textColor: "text-blue-700",
      lightBg: "bg-blue-50",
    },
    {
      label: "Investigating",
      value: investigatingCount,
      icon: Eye,
      color: "from-amber-500 to-amber-700",
      textColor: "text-amber-700",
      lightBg: "bg-amber-50",
    },
    {
      label: "Resolved",
      value: resolvedCount,
      icon: CheckCircle2,
      color: "from-emerald-500 to-emerald-700",
      textColor: "text-emerald-700",
      lightBg: "bg-emerald-50",
    },
  ];

  // ============================================
  // RENDER
  // ============================================

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        >
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-[#39B54A] to-[#2d913c] rounded-xl text-white shadow-lg shadow-[#39B54A]/20">
                <Shield className="w-6 h-6" />
              </div>
              Dispute Management
            </h1>
            <p className="text-gray-500 mt-1 text-sm">
              Review and resolve disputes between users
              {stats?.avgResolutionTimeMs ? (
                <span className="ml-3 text-xs bg-gray-100 px-2 py-0.5 rounded-full">
                  Avg resolution: {msToReadable(stats.avgResolutionTimeMs)}
                </span>
              ) : null}
            </p>
          </div>
          <button
            onClick={() => fetchData()}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </motion.div>

        {/* Success / Error Toasts */}
        <AnimatePresence>
          {successMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl text-sm"
            >
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              {successMessage}
              <button onClick={() => setSuccessMessage(null)} className="ml-auto">
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm"
            >
              <AlertCircle className="w-5 h-5 shrink-0" />
              {error}
              <button onClick={() => setError(null)} className="ml-auto">
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stats Cards */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {statCards.map((card) => {
            const Icon = card.icon;
            return (
              <motion.div
                key={card.label}
                variants={itemVariants}
                className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className={`p-2.5 rounded-xl ${card.lightBg}`}>
                    <Icon className={`w-5 h-5 ${card.textColor}`} />
                  </div>
                  {card.label === "Total Disputes" && escalatedCount > 0 && (
                    <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
                      {escalatedCount} escalated
                    </span>
                  )}
                </div>
                <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                <p className="text-xs text-gray-500 mt-1">{card.label}</p>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Filters Bar */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4"
        >
          {/* Status Tabs */}
          <div className="flex flex-wrap gap-2 mb-4">
            <button
              onClick={() => { setStatusFilter(""); setPage(1); }}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                !statusFilter
                  ? "bg-gradient-to-r from-[#39B54A] to-[#2d913c] text-white shadow-md shadow-[#39B54A]/20"
                  : "bg-gray-50 text-gray-600 hover:bg-gray-100"
              }`}
            >
              All
              <span className="ml-1.5 text-xs opacity-80">({totalDisputes})</span>
            </button>
            {Object.entries(STATUS_CONFIG).map(([key, config]) => {
              const Icon = config.icon;
              const count = statusCounts[key] || stats?.statusCounts?.[key] || 0;
              return (
                <button
                  key={key}
                  onClick={() => { setStatusFilter(statusFilter === key ? "" : key); setPage(1); }}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    statusFilter === key
                      ? `${config.bgColor} ${config.color} border ${config.borderColor}`
                      : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {config.label}
                  <span className="text-xs opacity-70">({count})</span>
                </button>
              );
            })}
          </div>

          {/* Search + Priority Filter */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search by ticket #, subject, or user name..."
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#39B54A] focus:ring-2 focus:ring-[#39B54A]/20 transition-all"
              />
              {searchInput && (
                <button
                  onClick={() => { setSearchInput(""); setSearchQuery(""); setPage(1); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Priority Filter */}
            <div className="relative">
              <button
                onClick={() => setShowPriorityDropdown(!showPriorityDropdown)}
                className={`flex items-center gap-2 px-4 py-2.5 border rounded-xl text-sm font-medium transition-all min-w-[150px] justify-between ${
                  priorityFilter
                    ? `${PRIORITY_CONFIG[priorityFilter]?.bgColor} ${PRIORITY_CONFIG[priorityFilter]?.color} border-current/20`
                    : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4" />
                  {priorityFilter ? PRIORITY_CONFIG[priorityFilter]?.label : "Priority"}
                </div>
                <ChevronDown className="w-4 h-4" />
              </button>
              <AnimatePresence>
                {showPriorityDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: -5, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -5, scale: 0.95 }}
                    className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 min-w-[160px] py-1 overflow-hidden"
                  >
                    <button
                      onClick={() => { setPriorityFilter(""); setShowPriorityDropdown(false); setPage(1); }}
                      className={`w-full px-4 py-2.5 text-sm text-left hover:bg-gray-50 transition-colors ${
                        !priorityFilter ? "bg-gray-50 font-medium" : ""
                      }`}
                    >
                      All Priorities
                    </button>
                    {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                      <button
                        key={key}
                        onClick={() => { setPriorityFilter(key); setShowPriorityDropdown(false); setPage(1); }}
                        className={`w-full px-4 py-2.5 text-sm text-left hover:bg-gray-50 transition-colors flex items-center gap-2 ${
                          priorityFilter === key ? "bg-gray-50 font-medium" : ""
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${config.dotColor}`} />
                        {config.label}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>

        {/* Close priority dropdown on outside click */}
        {showPriorityDropdown && (
          <div className="fixed inset-0 z-10" onClick={() => setShowPriorityDropdown(false)} />
        )}

        {/* Disputes List */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-gray-100">
            <Loader2 className="w-8 h-8 text-[#39B54A] animate-spin" />
            <p className="text-gray-500 mt-3 text-sm">Loading disputes...</p>
          </div>
        ) : disputes.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-gray-100"
          >
            <div className="p-4 bg-gray-100 rounded-2xl mb-4">
              <Shield className="w-10 h-10 text-gray-400" />
            </div>
            <p className="text-gray-600 font-medium">No disputes found</p>
            <p className="text-gray-400 text-sm mt-1">
              {searchQuery || statusFilter || priorityFilter
                ? "Try adjusting your filters"
                : "No disputes have been filed yet"}
            </p>
          </motion.div>
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-3"
          >
            {disputes.map((dispute) => (
              <motion.div
                key={dispute._id}
                variants={itemVariants}
                layout
                className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* Row Header */}
                <button
                  onClick={() => toggleExpand(dispute._id)}
                  className="w-full px-5 py-4 flex items-center gap-4 text-left group"
                >
                  {/* Priority Indicator */}
                  <div className={`w-1.5 h-12 rounded-full shrink-0 ${PRIORITY_CONFIG[dispute.priority]?.dotColor || "bg-gray-300"}`} />

                  {/* Ticket + Subject */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-gray-400 bg-gray-50 px-2 py-0.5 rounded">
                        {dispute.ticketNumber}
                      </span>
                      {/* Priority Badge */}
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_CONFIG[dispute.priority]?.bgColor} ${PRIORITY_CONFIG[dispute.priority]?.color}`}>
                        {PRIORITY_CONFIG[dispute.priority]?.label}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {dispute.subject}
                    </p>
                  </div>

                  {/* Filed By / Against */}
                  <div className="hidden md:flex items-center gap-6 shrink-0">
                    <div className="text-right">
                      <p className="text-xs text-gray-400">Filed by</p>
                      <p className="text-sm text-gray-700 font-medium truncate max-w-[120px]">
                        {dispute.filedBy ? getUserName(dispute.filedBy) : "Unknown"}
                      </p>
                    </div>
                    <div className="text-gray-300">
                      <ArrowUpRight className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Against</p>
                      <p className="text-sm text-gray-700 font-medium truncate max-w-[120px]">
                        {dispute.againstUser ? getUserName(dispute.againstUser) : "Unknown"}
                      </p>
                    </div>
                  </div>

                  {/* Category */}
                  <div className="hidden lg:block shrink-0">
                    <span className="text-xs text-gray-500 bg-gray-50 px-2.5 py-1 rounded-lg">
                      {CATEGORY_LABELS[dispute.category] || dispute.category}
                    </span>
                  </div>

                  {/* Status Badge */}
                  <div className="shrink-0">
                    {(() => {
                      const sc = STATUS_CONFIG[dispute.status];
                      if (!sc) return null;
                      const SIcon = sc.icon;
                      return (
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${sc.bgColor} ${sc.color} border ${sc.borderColor}`}>
                          <SIcon className="w-3.5 h-3.5" />
                          {sc.label}
                        </span>
                      );
                    })()}
                  </div>

                  {/* Date */}
                  <div className="hidden sm:block text-right shrink-0 min-w-[80px]">
                    <p className="text-xs text-gray-400">{timeAgo(dispute.createdAt)}</p>
                  </div>

                  {/* Expand Icon */}
                  <div className="shrink-0 text-gray-400 group-hover:text-[#39B54A] transition-colors">
                    {expandedId === dispute._id ? (
                      <ChevronUp className="w-5 h-5" />
                    ) : (
                      <ChevronDown className="w-5 h-5" />
                    )}
                  </div>
                </button>

                {/* Expanded Detail Panel */}
                <AnimatePresence>
                  {expandedId === dispute._id && (
                    <motion.div
                      variants={expandVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      className="overflow-hidden"
                    >
                      <div className="border-t border-gray-100 bg-gray-50/50">
                        {detailLoading ? (
                          <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-6 h-6 text-[#39B54A] animate-spin" />
                            <span className="ml-2 text-sm text-gray-500">Loading details...</span>
                          </div>
                        ) : expandedDispute ? (
                          <div className="p-5 space-y-5">
                            {/* Top: Booking Info + Parties */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                              {/* Booking Info */}
                              <div className="bg-white rounded-xl border border-gray-100 p-4">
                                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                  <Calendar className="w-3.5 h-3.5" />
                                  Booking Info
                                </h4>
                                {expandedDispute.bookingId ? (
                                  <div className="space-y-2">
                                    <div className="flex justify-between">
                                      <span className="text-xs text-gray-500">Booking #</span>
                                      <span className="text-xs font-mono font-medium text-gray-900">
                                        {expandedDispute.bookingId.bookingNumber || "N/A"}
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-xs text-gray-500">Service</span>
                                      <span className="text-xs font-medium text-gray-700">
                                        {expandedDispute.bookingId.serviceType?.replace(/_/g, " ") || "N/A"}
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-xs text-gray-500">Status</span>
                                      <span className="text-xs font-medium text-gray-700 capitalize">
                                        {expandedDispute.bookingId.status?.replace(/_/g, " ") || "N/A"}
                                      </span>
                                    </div>
                                    {expandedDispute.bookingId.pricing?.totalAmount && (
                                      <div className="flex justify-between">
                                        <span className="text-xs text-gray-500">Amount</span>
                                        <span className="text-xs font-semibold text-gray-900">
                                          Rs. {(expandedDispute.bookingId.pricing.totalAmount || expandedDispute.bookingId.pricing.total || 0).toLocaleString()}
                                        </span>
                                      </div>
                                    )}
                                    {expandedDispute.bookingId.schedule && (
                                      <>
                                        <div className="flex justify-between">
                                          <span className="text-xs text-gray-500">Start</span>
                                          <span className="text-xs text-gray-700">
                                            {formatDate(expandedDispute.bookingId.schedule.startDate)}
                                          </span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-xs text-gray-500">End</span>
                                          <span className="text-xs text-gray-700">
                                            {formatDate(expandedDispute.bookingId.schedule.endDate)}
                                          </span>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                ) : (
                                  <p className="text-xs text-gray-400">No booking data available</p>
                                )}
                              </div>

                              {/* Parties */}
                              <div className="bg-white rounded-xl border border-gray-100 p-4">
                                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                  <Users className="w-3.5 h-3.5" />
                                  Parties Involved
                                </h4>
                                <div className="space-y-3">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-bold">
                                      {(expandedDispute.filedBy?.fullName || "?").charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium text-gray-900 truncate">
                                        {expandedDispute.filedBy ? getUserName(expandedDispute.filedBy) : "Unknown"}
                                      </p>
                                      <p className="text-xs text-gray-400 capitalize">
                                        Filed by ({expandedDispute.filedByRole || expandedDispute.filedBy?.role || "user"})
                                      </p>
                                    </div>
                                  </div>
                                  <div className="border-t border-dashed border-gray-200" />
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center text-red-700 text-xs font-bold">
                                      {(expandedDispute.againstUser?.fullName || "?").charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium text-gray-900 truncate">
                                        {expandedDispute.againstUser ? getUserName(expandedDispute.againstUser) : "Unknown"}
                                      </p>
                                      <p className="text-xs text-gray-400 capitalize">
                                        Against ({expandedDispute.againstUser?.role || "user"})
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Description + Evidence */}
                              <div className="bg-white rounded-xl border border-gray-100 p-4">
                                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                  <FileText className="w-3.5 h-3.5" />
                                  Description
                                </h4>
                                <p className="text-sm text-gray-700 leading-relaxed line-clamp-4">
                                  {expandedDispute.description || "No description provided."}
                                </p>
                                {expandedDispute.evidence && expandedDispute.evidence.length > 0 && (
                                  <div className="mt-3 pt-3 border-t border-gray-100">
                                    <p className="text-xs text-gray-400 mb-2">Evidence ({expandedDispute.evidence.length})</p>
                                    <div className="flex flex-wrap gap-2">
                                      {expandedDispute.evidence.map((ev, idx) => (
                                        <a
                                          key={idx}
                                          href={ev.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-xs bg-gray-50 border border-gray-200 px-2.5 py-1.5 rounded-lg text-blue-600 hover:bg-blue-50 hover:border-blue-200 transition-colors flex items-center gap-1"
                                        >
                                          <FileText className="w-3 h-3" />
                                          {ev.name || `File ${idx + 1}`}
                                        </a>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Status Action Buttons */}
                            {STATUS_TRANSITIONS[expandedDispute.status] &&
                              STATUS_TRANSITIONS[expandedDispute.status].length > 0 && (
                              <div className="bg-white rounded-xl border border-gray-100 p-4">
                                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                                  Change Status
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                  {STATUS_TRANSITIONS[expandedDispute.status].map((newStatus) => {
                                    const sc = STATUS_CONFIG[newStatus];
                                    if (!sc) return null;
                                    const SIcon = sc.icon;
                                    return (
                                      <button
                                        key={newStatus}
                                        onClick={() => handleStatusChange(expandedDispute._id, newStatus)}
                                        disabled={actionLoading === `status-${expandedDispute._id}`}
                                        className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium border transition-all hover:shadow-sm disabled:opacity-50 ${sc.bgColor} ${sc.color} ${sc.borderColor}`}
                                      >
                                        {actionLoading === `status-${expandedDispute._id}` ? (
                                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        ) : (
                                          <SIcon className="w-3.5 h-3.5" />
                                        )}
                                        {sc.label}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* Tabbed Detail Sections */}
                            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                              {/* Tab Navigation */}
                              <div className="flex border-b border-gray-100 bg-gray-50/80">
                                {(
                                  [
                                    { key: "timeline", label: "Timeline", icon: Clock },
                                    { key: "messages", label: "Messages", icon: MessageSquare },
                                    { key: "resolution", label: "Resolution", icon: Gavel },
                                    { key: "notes", label: "Admin Notes", icon: StickyNote },
                                  ] as const
                                ).map((tab) => {
                                  const TIcon = tab.icon;
                                  const count =
                                    tab.key === "timeline"
                                      ? expandedDispute.timeline?.length
                                      : tab.key === "messages"
                                        ? expandedDispute.messages?.length
                                        : tab.key === "notes"
                                          ? (expandedDispute as Dispute & { adminNotes?: unknown[] }).adminNotes?.length
                                          : undefined;
                                  return (
                                    <button
                                      key={tab.key}
                                      onClick={() => setDetailTab(tab.key)}
                                      className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-all ${
                                        detailTab === tab.key
                                          ? "border-[#39B54A] text-[#39B54A] bg-white"
                                          : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-white/50"
                                      }`}
                                    >
                                      <TIcon className="w-4 h-4" />
                                      {tab.label}
                                      {count !== undefined && count > 0 && (
                                        <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">
                                          {count}
                                        </span>
                                      )}
                                    </button>
                                  );
                                })}
                              </div>

                              {/* Tab Content */}
                              <div className="p-5">
                                {/* Timeline Tab */}
                                {detailTab === "timeline" && (
                                  <TimelineView timeline={expandedDispute.timeline || []} />
                                )}

                                {/* Messages Tab */}
                                {detailTab === "messages" && (
                                  <div className="space-y-4">
                                    {/* Messages List */}
                                    <div className="max-h-[400px] overflow-y-auto space-y-3 pr-1">
                                      {expandedDispute.messages && expandedDispute.messages.length > 0 ? (
                                        expandedDispute.messages.map((msg) => (
                                          <MessageBubble key={msg._id} message={msg} />
                                        ))
                                      ) : (
                                        <div className="text-center py-8">
                                          <MessageSquare className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                          <p className="text-sm text-gray-400">No messages yet</p>
                                        </div>
                                      )}
                                    </div>

                                    {/* Send Message Form */}
                                    <div className="border-t border-gray-100 pt-4 space-y-3">
                                      <div className="flex gap-2">
                                        <select
                                          value={messageTarget}
                                          onChange={(e) => setMessageTarget(e.target.value)}
                                          className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#39B54A] focus:ring-2 focus:ring-[#39B54A]/20"
                                        >
                                          <option value="">Both Parties</option>
                                          <option value="caregiver">Caregiver Only</option>
                                          <option value="careseeker">Care Seeker Only</option>
                                        </select>
                                      </div>
                                      <div className="flex gap-2">
                                        <input
                                          type="text"
                                          value={messageContent}
                                          onChange={(e) => setMessageContent(e.target.value)}
                                          onKeyDown={(e) => {
                                            if (e.key === "Enter" && !e.shiftKey) {
                                              e.preventDefault();
                                              handleSendMessage(expandedDispute._id);
                                            }
                                          }}
                                          placeholder="Type a message..."
                                          className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#39B54A] focus:ring-2 focus:ring-[#39B54A]/20 transition-all"
                                        />
                                        <button
                                          onClick={() => handleSendMessage(expandedDispute._id)}
                                          disabled={!messageContent.trim() || actionLoading === `msg-${expandedDispute._id}`}
                                          className="px-4 py-2.5 bg-gradient-to-r from-[#39B54A] to-[#2d913c] text-white rounded-xl text-sm font-medium hover:shadow-md hover:shadow-[#39B54A]/20 transition-all disabled:opacity-50 disabled:hover:shadow-none flex items-center gap-2"
                                        >
                                          {actionLoading === `msg-${expandedDispute._id}` ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                          ) : (
                                            <Send className="w-4 h-4" />
                                          )}
                                          Send
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {/* Resolution Tab */}
                                {detailTab === "resolution" && (
                                  <div className="space-y-5">
                                    {/* Existing Resolution */}
                                    {expandedDispute.resolution && (
                                      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                                        <div className="flex items-center gap-2 mb-2">
                                          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                                          <span className="text-sm font-semibold text-emerald-700">Resolved</span>
                                          <span className="text-xs text-emerald-600 ml-auto">
                                            {expandedDispute.resolution.resolvedAt
                                              ? formatDateTime(expandedDispute.resolution.resolvedAt)
                                              : ""}
                                          </span>
                                        </div>
                                        <div className="space-y-1.5 text-sm text-emerald-800">
                                          <p>
                                            <span className="font-medium">Type:</span>{" "}
                                            {RESOLUTION_TYPES.find((r) => r.value === expandedDispute.resolution?.type)?.label ||
                                              expandedDispute.resolution.type}
                                          </p>
                                          {expandedDispute.resolution.description && (
                                            <p>
                                              <span className="font-medium">Details:</span>{" "}
                                              {expandedDispute.resolution.description}
                                            </p>
                                          )}
                                          {expandedDispute.resolution.refundAmount > 0 && (
                                            <p>
                                              <span className="font-medium">Refund:</span> Rs.{" "}
                                              {expandedDispute.resolution.refundAmount.toLocaleString()}
                                            </p>
                                          )}
                                          {expandedDispute.resolution.resolvedBy && (
                                            <p>
                                              <span className="font-medium">Resolved by:</span>{" "}
                                              {getUserName(expandedDispute.resolution.resolvedBy)}
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                    )}

                                    {/* Resolution Form (only if not resolved/dismissed) */}
                                    {expandedDispute.status !== "resolved" &&
                                      expandedDispute.status !== "dismissed" && (
                                      <div className="space-y-4">
                                        <h4 className="text-sm font-semibold text-gray-700">Resolve this dispute</h4>

                                        {/* Resolution Type Grid */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                          {RESOLUTION_TYPES.map((rt) => {
                                            const RIcon = rt.icon;
                                            return (
                                              <button
                                                key={rt.value}
                                                onClick={() => setResolutionType(rt.value)}
                                                className={`p-3 rounded-xl border text-left transition-all ${
                                                  resolutionType === rt.value
                                                    ? "border-[#39B54A] bg-[#39B54A]/5 ring-2 ring-[#39B54A]/20"
                                                    : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                                                }`}
                                              >
                                                <div className="flex items-center gap-2 mb-1">
                                                  <RIcon className={`w-4 h-4 ${resolutionType === rt.value ? "text-[#39B54A]" : "text-gray-500"}`} />
                                                  <span className={`text-sm font-medium ${resolutionType === rt.value ? "text-[#39B54A]" : "text-gray-700"}`}>
                                                    {rt.label}
                                                  </span>
                                                </div>
                                                <p className="text-xs text-gray-400">{rt.description}</p>
                                              </button>
                                            );
                                          })}
                                        </div>

                                        {/* Refund Amount (conditional) */}
                                        {(resolutionType === "refund" ||
                                          resolutionType === "partial_refund" ||
                                          resolutionType === "compensation") && (
                                          <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1.5">
                                              {resolutionType === "compensation" ? "Compensation Amount (Rs.)" : "Refund Amount (Rs.)"}
                                            </label>
                                            <div className="relative">
                                              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                              <input
                                                type="number"
                                                value={refundAmount}
                                                onChange={(e) => setRefundAmount(e.target.value)}
                                                placeholder="0.00"
                                                min="0"
                                                step="0.01"
                                                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#39B54A] focus:ring-2 focus:ring-[#39B54A]/20"
                                              />
                                            </div>
                                          </div>
                                        )}

                                        {/* Description */}
                                        <div>
                                          <label className="block text-xs font-medium text-gray-500 mb-1.5">
                                            Resolution Details (optional)
                                          </label>
                                          <textarea
                                            value={resolutionDescription}
                                            onChange={(e) => setResolutionDescription(e.target.value)}
                                            rows={3}
                                            placeholder="Describe the resolution details..."
                                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#39B54A] focus:ring-2 focus:ring-[#39B54A]/20 resize-none"
                                          />
                                        </div>

                                        {/* Submit */}
                                        <button
                                          onClick={() => handleResolve(expandedDispute._id)}
                                          disabled={!resolutionType || actionLoading === `resolve-${expandedDispute._id}`}
                                          className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-[#39B54A] to-[#2d913c] text-white rounded-xl text-sm font-semibold hover:shadow-lg hover:shadow-[#39B54A]/20 transition-all disabled:opacity-50 disabled:hover:shadow-none flex items-center justify-center gap-2"
                                        >
                                          {actionLoading === `resolve-${expandedDispute._id}` ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                          ) : (
                                            <Gavel className="w-4 h-4" />
                                          )}
                                          Resolve Dispute
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Admin Notes Tab */}
                                {detailTab === "notes" && (
                                  <div className="space-y-4">
                                    {/* Existing Notes */}
                                    <div className="max-h-[300px] overflow-y-auto space-y-3 pr-1">
                                      {(expandedDispute as Dispute & { adminNotes?: { _id: string; content: string; createdBy: { fullName?: string }; createdAt: string }[] }).adminNotes &&
                                      (expandedDispute as Dispute & { adminNotes?: { _id: string; content: string; createdBy: { fullName?: string }; createdAt: string }[] }).adminNotes!.length > 0 ? (
                                        (expandedDispute as Dispute & { adminNotes: { _id: string; content: string; createdBy: { fullName?: string }; createdAt: string }[] }).adminNotes.map((note) => (
                                          <div
                                            key={note._id}
                                            className="bg-amber-50/50 border border-amber-100 rounded-xl p-3"
                                          >
                                            <div className="flex items-center justify-between mb-1.5">
                                              <span className="text-xs font-medium text-amber-800">
                                                {note.createdBy ? getUserName(note.createdBy) : "Admin"}
                                              </span>
                                              <span className="text-xs text-amber-600">
                                                {formatDateTime(note.createdAt)}
                                              </span>
                                            </div>
                                            <p className="text-sm text-gray-700">{note.content}</p>
                                          </div>
                                        ))
                                      ) : (
                                        <div className="text-center py-8">
                                          <StickyNote className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                          <p className="text-sm text-gray-400">No admin notes yet</p>
                                        </div>
                                      )}
                                    </div>

                                    {/* Add Note Form */}
                                    <div className="border-t border-gray-100 pt-4">
                                      <div className="flex gap-2">
                                        <input
                                          type="text"
                                          value={noteContent}
                                          onChange={(e) => setNoteContent(e.target.value)}
                                          onKeyDown={(e) => {
                                            if (e.key === "Enter" && !e.shiftKey) {
                                              e.preventDefault();
                                              handleAddNote(expandedDispute._id);
                                            }
                                          }}
                                          placeholder="Add an internal note..."
                                          className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#39B54A] focus:ring-2 focus:ring-[#39B54A]/20 transition-all"
                                        />
                                        <button
                                          onClick={() => handleAddNote(expandedDispute._id)}
                                          disabled={!noteContent.trim() || actionLoading === `note-${expandedDispute._id}`}
                                          className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-medium transition-all disabled:opacity-50 flex items-center gap-2"
                                        >
                                          {actionLoading === `note-${expandedDispute._id}` ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                          ) : (
                                            <StickyNote className="w-4 h-4" />
                                          )}
                                          Add Note
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center justify-between bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4"
          >
            <p className="text-sm text-gray-500">
              Showing <span className="font-medium text-gray-700">{(page - 1) * limit + 1}</span>
              {" - "}
              <span className="font-medium text-gray-700">{Math.min(page * limit, totalCount)}</span>
              {" of "}
              <span className="font-medium text-gray-700">{totalCount}</span>
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-white transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (page <= 3) {
                  pageNum = i + 1;
                } else if (page >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = page - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`w-9 h-9 rounded-lg text-sm font-medium transition-all ${
                      page === pageNum
                        ? "bg-gradient-to-r from-[#39B54A] to-[#2d913c] text-white shadow-md shadow-[#39B54A]/20"
                        : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-white transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </AdminLayout>
  );
}

// ============================================
// TIMELINE COMPONENT
// ============================================

function TimelineView({ timeline }: { timeline: DisputeTimeline[] }) {
  if (!timeline || timeline.length === 0) {
    return (
      <div className="text-center py-8">
        <Clock className="w-8 h-8 text-gray-300 mx-auto mb-2" />
        <p className="text-sm text-gray-400">No timeline events</p>
      </div>
    );
  }

  const sorted = [...timeline].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div className="relative max-h-[400px] overflow-y-auto pr-1">
      {/* Vertical line */}
      <div className="absolute left-4 top-3 bottom-3 w-0.5 bg-gray-200" />

      <div className="space-y-4">
        {sorted.map((event, idx) => {
          const config = TIMELINE_ACTION_CONFIG[event.action] || {
            color: "bg-gray-400",
            icon: CircleDot,
          };
          const TIcon = config.icon;

          return (
            <motion.div
              key={event._id || idx}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.04 }}
              className="relative flex gap-4 pl-1"
            >
              {/* Dot */}
              <div
                className={`relative z-10 w-8 h-8 rounded-full ${config.color} flex items-center justify-center shrink-0 shadow-sm`}
              >
                <TIcon className="w-3.5 h-3.5 text-white" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 pb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-gray-900 capitalize">
                    {event.action.replace(/_/g, " ")}
                  </span>
                  {event.performedBy && (
                    <span className="text-xs text-gray-400">
                      by {getUserName(event.performedBy)}
                    </span>
                  )}
                  <span className="text-xs text-gray-400 ml-auto shrink-0">
                    {formatDateTime(event.createdAt)}
                  </span>
                </div>
                {event.message && (
                  <p className="text-sm text-gray-600 mt-0.5">{event.message}</p>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================
// MESSAGE BUBBLE COMPONENT
// ============================================

function MessageBubble({ message }: { message: DisputeMessage }) {
  const isAdmin = message.senderRole === "admin";

  return (
    <div className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-3 ${
          isAdmin
            ? "bg-gradient-to-r from-[#39B54A] to-[#2d913c] text-white rounded-br-md"
            : "bg-gray-100 text-gray-800 rounded-bl-md"
        }`}
      >
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-xs font-semibold ${isAdmin ? "text-white/80" : "text-gray-500"}`}>
            {message.sender ? getUserName(message.sender) : "Unknown"}
          </span>
          <span className={`text-xs capitalize ${isAdmin ? "text-white/60" : "text-gray-400"}`}>
            ({message.senderRole})
          </span>
        </div>
        <p className="text-sm leading-relaxed">{message.content}</p>
        <p className={`text-xs mt-1.5 ${isAdmin ? "text-white/50" : "text-gray-400"}`}>
          {formatDateTime(message.createdAt)}
        </p>
      </div>
    </div>
  );
}
