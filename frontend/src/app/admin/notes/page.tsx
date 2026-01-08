"use client";

import { useEffect, useState, useCallback } from "react";
import { AdminLayout } from "@/components";
import { motion, AnimatePresence } from "framer-motion";
import {
  StickyNote,
  Search,
  Filter,
  Trash2,
  Eye,
  X,
  Tag,
  Calendar,
  User,
  FileText,
  AlertCircle,
  Clock,
  Heart,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import noteService, { Note } from "@/services/api/note.service";

const TAG_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: React.ElementType }> = {
  important: { label: "Important", color: "text-red-700", bgColor: "bg-red-50 border-red-200", icon: AlertCircle },
  "follow-up": { label: "Follow-up", color: "text-amber-700", bgColor: "bg-amber-50 border-amber-200", icon: Clock },
  medical: { label: "Medical", color: "text-emerald-700", bgColor: "bg-emerald-50 border-emerald-200", icon: Heart },
  general: { label: "General", color: "text-gray-700", bgColor: "bg-gray-50 border-gray-200", icon: FileText },
};

export default function AdminNotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTag, setActiveTag] = useState("all");
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0, limit: 15 });
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const fetchNotes = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, unknown> = {
        page: pagination.page,
        limit: pagination.limit,
      };
      if (activeTag !== "all") params.tag = activeTag;
      if (search) params.search = search;

      const response = await noteService.adminGetNotes(params as Parameters<typeof noteService.adminGetNotes>[0]);
      if (response.success && response.data) {
        setNotes(response.data.notes);
        setPagination(prev => ({
          ...prev,
          pages: response.data!.pagination.pages,
          total: response.data!.pagination.total,
        }));
      }
    } catch {
      console.error("Failed to fetch notes");
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, activeTag, search]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const handleDelete = async (noteId: string) => {
    try {
      await noteService.adminDeleteNote(noteId);
      setDeleteConfirm(null);
      fetchNotes();
    } catch {
      alert("Failed to delete note");
    }
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });

  const formatServiceType = (type: string) =>
    type?.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) || "";

  return (
    <AdminLayout>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <StickyNote className="w-7 h-7 text-indigo-600" />
            Notes Management
          </h1>
          <p className="text-gray-500 mt-1 text-sm">
            View and moderate all care notes across the platform ({pagination.total} total)
          </p>
        </div>

        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search notes by title or content..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPagination(prev => ({ ...prev, page: 1 }));
              }}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => { setActiveTag("all"); setPagination(prev => ({ ...prev, page: 1 })); }}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                activeTag === "all"
                  ? "bg-indigo-600 text-white"
                  : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
              }`}
            >
              <Filter size={14} className="inline mr-1.5" />
              All
            </button>
            {Object.entries(TAG_CONFIG).map(([key, config]) => {
              const Icon = config.icon;
              return (
                <button
                  key={key}
                  onClick={() => { setActiveTag(key); setPagination(prev => ({ ...prev, page: 1 })); }}
                  className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors border ${
                    activeTag === key
                      ? `${config.bgColor} ${config.color}`
                      : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <Icon size={14} className="inline mr-1.5" />
                  {config.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : notes.length === 0 ? (
            <div className="p-12 text-center">
              <StickyNote className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">{search ? "No notes match your search" : "No notes on the platform yet"}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Title</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tag</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Created By</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Shared With</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Booking</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {notes.map((note) => {
                    const tagConfig = TAG_CONFIG[note.tag] || TAG_CONFIG.general;
                    const TagIcon = tagConfig.icon;
                    return (
                      <tr key={note._id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="py-3 px-4">
                          <p className="text-sm font-medium text-gray-900 truncate max-w-48">{note.title}</p>
                          <p className="text-xs text-gray-500 truncate max-w-48">{note.content}</p>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${tagConfig.bgColor} ${tagConfig.color}`}>
                            <TagIcon size={10} />
                            {tagConfig.label}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 text-xs font-bold">
                              {(note.createdBy?.fullName || note.createdBy?.firstName)?.charAt(0) || "?"}
                            </div>
                            <div>
                              <p className="text-sm text-gray-900">{note.createdBy?.fullName || `${note.createdBy?.firstName || ''} ${note.createdBy?.lastName || ''}`.trim() || "Unknown"}</p>
                              <p className="text-[10px] text-gray-400 capitalize">{note.creatorRole}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <p className="text-sm text-gray-700">
                            {note.sharedWith?.fullName || `${note.sharedWith?.firstName || ''} ${note.sharedWith?.lastName || ''}`.trim() || "-"}
                          </p>
                          <p className="text-[10px] text-gray-400 capitalize">{note.sharedWith?.role}</p>
                        </td>
                        <td className="py-3 px-4">
                          {note.bookingId && typeof note.bookingId === "object" && (
                            <p className="text-xs text-gray-500">
                              {note.bookingId.bookingNumber}
                            </p>
                          )}
                        </td>
                        <td className="py-3 px-4 text-xs text-gray-500">
                          {formatDate(note.createdAt)}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex justify-end gap-1">
                            <button
                              onClick={() => setSelectedNote(note)}
                              className="p-1.5 rounded-lg hover:bg-indigo-50 text-gray-400 hover:text-indigo-600 transition-colors"
                              title="View"
                            >
                              <Eye size={15} />
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(note._id)}
                              className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                              title="Delete"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
              <p className="text-xs text-gray-500">
                Page {pagination.page} of {pagination.pages} ({pagination.total} notes)
              </p>
              <div className="flex gap-1">
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                  disabled={pagination.page === 1}
                  className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: Math.min(prev.pages, prev.page + 1) }))}
                  disabled={pagination.page === pagination.pages}
                  className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* View Note Modal */}
        <AnimatePresence>
          {selectedNote && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
              onClick={() => setSelectedNote(null)}
            >
              <motion.div
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.95 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto"
              >
                <div className="flex items-center justify-between p-5 border-b border-gray-100">
                  <h2 className="text-lg font-bold text-gray-900">Note Details</h2>
                  <button
                    onClick={() => setSelectedNote(null)}
                    className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"
                  >
                    <X size={18} />
                  </button>
                </div>
                <div className="p-5 space-y-4">
                  <div>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${TAG_CONFIG[selectedNote.tag]?.bgColor || ""} ${TAG_CONFIG[selectedNote.tag]?.color || ""}`}>
                      <Tag size={12} />
                      {TAG_CONFIG[selectedNote.tag]?.label || selectedNote.tag}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">{selectedNote.title}</h3>
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {selectedNote.content}
                  </p>
                  <div className="border-t border-gray-100 pt-4 space-y-2">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <User size={14} />
                      <span>Created by: {selectedNote.createdBy?.fullName || `${selectedNote.createdBy?.firstName || ''} ${selectedNote.createdBy?.lastName || ''}`.trim() || "Unknown"} ({selectedNote.creatorRole})</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <User size={14} />
                      <span>Shared with: {selectedNote.sharedWith?.fullName || `${selectedNote.sharedWith?.firstName || ''} ${selectedNote.sharedWith?.lastName || ''}`.trim() || "-"}</span>
                    </div>
                    {selectedNote.bookingId && typeof selectedNote.bookingId === "object" && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <FileText size={14} />
                        <span>Booking: {selectedNote.bookingId.bookingNumber} - {formatServiceType(selectedNote.bookingId.serviceType)}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar size={14} />
                      <span>{formatDate(selectedNote.createdAt)}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Delete Confirmation */}
        <AnimatePresence>
          {deleteConfirm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
              onClick={() => setDeleteConfirm(null)}
            >
              <motion.div
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.95 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm text-center"
              >
                <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trash2 className="w-6 h-6 text-red-500" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">Delete Note?</h3>
                <p className="text-sm text-gray-500 mb-6">This will permanently remove this note.</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setDeleteConfirm(null)}
                    className="flex-1 px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleDelete(deleteConfirm)}
                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-xl hover:bg-red-600 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AdminLayout>
  );
}
