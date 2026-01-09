"use client";

import { useState, useEffect, useCallback } from "react";
import { AdminLayout } from "@/components";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell, Plus, Search, Trash2, Eye, X, AlertTriangle,
  Info, Megaphone, Users, Calendar, CheckCircle2,
  ChevronLeft, ChevronRight, RefreshCw, Send,
} from "lucide-react";
import noticeService, { Notice } from "@/services/api/notice.service";

// ─── Config ──────────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<string, { label: string; color: string; dot: string; icon: React.ElementType }> = {
  urgent:       { label: "Urgent",       color: "bg-red-100 text-red-700 border-red-200",     dot: "bg-red-500",    icon: AlertTriangle },
  warning:      { label: "Warning",      color: "bg-amber-100 text-amber-700 border-amber-200", dot: "bg-amber-500",  icon: AlertTriangle },
  info:         { label: "Info",         color: "bg-blue-100 text-blue-700 border-blue-200",   dot: "bg-blue-500",   icon: Info },
  announcement: { label: "Announcement", color: "bg-purple-100 text-purple-700 border-purple-200", dot: "bg-purple-500", icon: Megaphone },
  normal:       { label: "Normal",       color: "bg-gray-100 text-gray-600 border-gray-200",   dot: "bg-gray-400",   icon: Bell },
};

const TARGET_ROLES = [
  { value: "all",        label: "Everyone" },
  { value: "caregiver",  label: "Caregivers" },
  { value: "careseeker", label: "Care Seekers" },
];

const emptyForm = {
  title: "",
  content: "",
  type: "normal" as Notice["type"],
  targetRoles: ["all"] as string[],
  allowResponse: false,
  expiryDate: "",
};

// ─── Page ────────────────────────────────────────────────────────────────────

export default function AdminNoticesPage() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [showCreate, setShowCreate] = useState(false);
  const [viewNotice, setViewNotice] = useState<Notice | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const fetchNotices = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { page: pagination.page, limit: 15 };
      if (typeFilter !== "all") params.type = typeFilter;
      const res = await noticeService.adminListNotices(params as Parameters<typeof noticeService.adminListNotices>[0]);
      if (res.success && res.data) {
        setNotices(res.data.notices);
        setPagination(prev => ({ ...prev, pages: res.data!.pagination.pages, total: res.data!.pagination.total }));
      }
    } catch { /* non-fatal */ }
    finally { setLoading(false); }
  }, [pagination.page, typeFilter]);

  useEffect(() => { fetchNotices(); }, [fetchNotices]);

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      setError("Title and content are required.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await noticeService.createNotice({
        title: form.title,
        content: form.content,
        type: form.type,
        targetRoles: form.targetRoles,
        allowResponse: form.allowResponse,
        ...(form.expiryDate ? { expiryDate: form.expiryDate } : {}),
      });
      setForm(emptyForm);
      setShowCreate(false);
      fetchNotices();
    } catch (e: unknown) {
      setError((e as { message?: string })?.message || "Failed to create notice");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (noticeId: string) => {
    if (!confirm("Delete this notice? This cannot be undone.")) return;
    try {
      await noticeService.deleteNotice(noticeId);
      setNotices(prev => prev.filter(n => n._id !== noticeId));
    } catch { /* non-fatal */ }
  };

  const filteredNotices = notices.filter(n =>
    !search || n.title.toLowerCase().includes(search.toLowerCase()) || n.content.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Bell className="w-7 h-7 text-[#4461F2]" />
              Notice Board
            </h1>
            <p className="text-gray-500 mt-1 text-sm">{pagination.total} notice{pagination.total !== 1 ? "s" : ""} — broadcast announcements to users</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={fetchNotices} className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors">
              <RefreshCw size={16} />
            </button>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#4461F2] text-white rounded-xl font-medium shadow-lg shadow-[#4461F2]/20 hover:bg-[#3651E2] transition-colors"
            >
              <Plus size={18} />
              New Notice
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search notices..."
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#4461F2]/20 focus:border-[#4461F2]"
            />
          </div>
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#4461F2]/20"
          >
            <option value="all">All Types</option>
            {Object.entries(TYPE_CONFIG).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>

        {/* Notices Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-gray-400">
              <div className="w-8 h-8 border-2 border-[#4461F2] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              Loading notices...
            </div>
          ) : filteredNotices.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              <Bell className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="font-medium text-gray-600">No notices found</p>
              <p className="text-sm mt-1">Create your first notice to broadcast to users.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {filteredNotices.map(notice => {
                const cfg = TYPE_CONFIG[notice.type] ?? TYPE_CONFIG.normal;
                const Icon = cfg.icon;
                return (
                  <motion.div
                    key={notice._id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.color}`}>
                      <Icon size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-gray-900 text-sm truncate">{notice.title}</p>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.color}`}>
                          {cfg.label}
                        </span>
                        {!notice.isActive && (
                          <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-500 border border-gray-200">Inactive</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 truncate">{notice.content}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Users size={11} />
                          {notice.targetRoles.join(", ")}
                        </span>
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Calendar size={11} />
                          {new Date(notice.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </span>
                        {notice.allowResponse && (
                          <span className="text-xs text-[#4461F2] flex items-center gap-1">
                            <CheckCircle2 size={11} />
                            Responses enabled
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => setViewNotice(notice)}
                        className="p-2 text-gray-400 hover:text-[#4461F2] hover:bg-[#4461F2]/10 rounded-lg transition-colors"
                        title="View"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(notice._id)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
              <span className="text-sm text-gray-500">Page {pagination.page} of {pagination.pages}</span>
              <div className="flex gap-2">
                <button
                  disabled={pagination.page <= 1}
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                  className="p-2 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition-colors"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  disabled={pagination.page >= pagination.pages}
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                  className="p-2 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition-colors"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Create Modal */}
        <AnimatePresence>
          {showCreate && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              onClick={e => e.target === e.currentTarget && setShowCreate(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6"
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <Bell className="w-5 h-5 text-[#4461F2]" />
                    Create Notice
                  </h2>
                  <button onClick={() => setShowCreate(false)} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg">
                    <X size={18} />
                  </button>
                </div>

                {error && (
                  <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                    {error}
                  </div>
                )}

                <div className="space-y-4">
                  {/* Title */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Title *</label>
                    <input
                      value={form.title}
                      onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Notice title..."
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#4461F2]/20 focus:border-[#4461F2]"
                    />
                  </div>

                  {/* Content */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Content *</label>
                    <textarea
                      value={form.content}
                      onChange={e => setForm(prev => ({ ...prev, content: e.target.value }))}
                      placeholder="Write your notice..."
                      rows={4}
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#4461F2]/20 focus:border-[#4461F2] resize-none"
                    />
                  </div>

                  {/* Type & Target */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Type</label>
                      <select
                        value={form.type}
                        onChange={e => setForm(prev => ({ ...prev, type: e.target.value as Notice["type"] }))}
                        className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#4461F2]/20"
                      >
                        {Object.entries(TYPE_CONFIG).map(([k, v]) => (
                          <option key={k} value={k}>{v.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Target Audience</label>
                      <select
                        value={form.targetRoles[0] || "all"}
                        onChange={e => setForm(prev => ({ ...prev, targetRoles: [e.target.value] }))}
                        className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#4461F2]/20"
                      >
                        {TARGET_ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Expiry */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Expiry Date (optional)</label>
                    <input
                      type="date"
                      value={form.expiryDate}
                      onChange={e => setForm(prev => ({ ...prev, expiryDate: e.target.value }))}
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#4461F2]/20"
                    />
                  </div>

                  {/* Allow Response */}
                  <label className="flex items-center gap-3 cursor-pointer">
                    <div
                      onClick={() => setForm(prev => ({ ...prev, allowResponse: !prev.allowResponse }))}
                      className={`relative w-10 h-6 rounded-full transition-colors ${form.allowResponse ? "bg-[#4461F2]" : "bg-gray-200"}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.allowResponse ? "translate-x-5" : "translate-x-1"}`} />
                    </div>
                    <span className="text-sm text-gray-700">Allow user responses</span>
                  </label>
                </div>

                <div className="flex gap-3 mt-6 pt-4 border-t border-gray-100">
                  <button
                    onClick={() => setShowCreate(false)}
                    className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="flex-1 py-2.5 rounded-xl bg-[#4461F2] text-white text-sm font-medium hover:bg-[#3651E2] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Send size={15} />
                    )}
                    {submitting ? "Publishing..." : "Publish Notice"}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* View Modal */}
        <AnimatePresence>
          {viewNotice && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              onClick={e => e.target === e.currentTarget && setViewNotice(null)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {(() => {
                        const cfg = TYPE_CONFIG[viewNotice.type] ?? TYPE_CONFIG.normal;
                        const Icon = cfg.icon;
                        return (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.color}`}>
                            <Icon size={11} /> {cfg.label}
                          </span>
                        );
                      })()}
                    </div>
                    <h2 className="text-lg font-bold text-gray-900">{viewNotice.title}</h2>
                    <p className="text-xs text-gray-400 mt-1">
                      By {viewNotice.createdBy?.fullName || "Admin"} · {new Date(viewNotice.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                    </p>
                  </div>
                  <button onClick={() => setViewNotice(null)} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg">
                    <X size={18} />
                  </button>
                </div>
                <div className="prose prose-sm max-w-none text-gray-700 bg-gray-50 rounded-xl p-4 mb-4 whitespace-pre-wrap text-sm leading-relaxed">
                  {viewNotice.content}
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><Users size={12} /> {viewNotice.targetRoles.join(", ")}</span>
                  {viewNotice.expiryDate && (
                    <span className="flex items-center gap-1"><Calendar size={12} /> Expires {new Date(viewNotice.expiryDate).toLocaleDateString()}</span>
                  )}
                  {viewNotice.allowResponse && <span className="flex items-center gap-1 text-[#4461F2]"><CheckCircle2 size={12} /> Responses enabled</span>}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AdminLayout>
  );
}
