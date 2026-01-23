"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  StickyNote, Plus, Search, Filter, Edit3, Trash2, X, Tag, Calendar,
  User, FileText, AlertCircle, CheckCircle, Clock, Heart, Share2,
  Lock, Eye, MessageSquare, ArrowRight,
} from "lucide-react";
import noteService, {
  Note, NoteStats, NoteEditRequest, CreateNotePayload, UpdateNotePayload,
  CreateEditRequestPayload,
} from "@/services/api/note.service";
import { bookingService } from "@/modules/booking/services";
import { useSocket, SYSTEM_EVENTS } from "@/hooks/useSocket";

interface NotesPageProps {
  userRole: "caregiver" | "careseeker";
}

const TAG_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: React.ElementType }> = {
  routine: { label: "Routine", color: "text-blue-700", bgColor: "bg-blue-50 border-blue-200", icon: Clock },
  medical: { label: "Medical", color: "text-emerald-700", bgColor: "bg-emerald-50 border-emerald-200", icon: Heart },
  preferences: { label: "Preferences", color: "text-purple-700", bgColor: "bg-purple-50 border-purple-200", icon: User },
  important: { label: "Important", color: "text-red-700", bgColor: "bg-red-50 border-red-200", icon: AlertCircle },
  "follow-up": { label: "Follow-up", color: "text-amber-700", bgColor: "bg-amber-50 border-amber-200", icon: ArrowRight },
  general: { label: "General", color: "text-gray-700", bgColor: "bg-gray-50 border-gray-200", icon: FileText },
};

const TABS = [
  { key: "private", label: "Private Notes", icon: Lock },
  { key: "shared", label: "Shared Notes", icon: Share2 },
  { key: "edit-requests", label: "Edit Requests", icon: Edit3 },
] as const;

interface BookingOption {
  _id: string;
  bookingNumber: string;
  serviceType: string;
  status: string;
  otherParty: string;
}

export default function NotesPage({ userRole }: NotesPageProps) {
  const { socket, connected } = useSocket();
  const [notes, setNotes] = useState<Note[]>([]);
  const [stats, setStats] = useState<NoteStats | null>(null);
  const [editRequests, setEditRequests] = useState<NoteEditRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTag, setActiveTag] = useState("all");
  const [activeTab, setActiveTab] = useState<"private" | "shared" | "edit-requests">("private");
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit" | "share" | "edit-request">("create");
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [bookingOptions, setBookingOptions] = useState<BookingOption[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    bookingId: "",
    title: "",
    content: "",
    tag: "general",
    visibility: "private" as string,
  });

  // Edit request form
  const [editRequestForm, setEditRequestForm] = useState({
    noteId: "",
    proposedTitle: "",
    proposedContent: "",
    proposedTag: "",
    reason: "",
  });

  const fetchNotes = useCallback(async () => {
    try {
      setLoading(true);
      if (activeTab === "edit-requests") {
        const role = userRole === "careseeker" ? "owner" : "requester";
        const res = await noteService.getEditRequests({ role, page: pagination.page, limit: 12 });
        if (res.success && res.data) {
          setEditRequests(res.data.editRequests);
          setPagination(prev => ({ ...prev, pages: res.data!.pagination.pages, total: res.data!.pagination.total }));
        }
      } else {
        const params: Record<string, unknown> = {
          page: pagination.page,
          limit: 12,
          visibility: activeTab,
        };
        if (activeTag !== "all") params.tag = activeTag;
        if (search) params.search = search;

        const res = await noteService.getNotes(params as Parameters<typeof noteService.getNotes>[0]);
        if (res.success && res.data) {
          setNotes(res.data.notes);
          setPagination(prev => ({ ...prev, pages: res.data!.pagination.pages, total: res.data!.pagination.total }));
        }
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [pagination.page, activeTag, search, activeTab, userRole]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await noteService.getNoteStats();
      if (res.success && res.data) setStats(res.data.stats);
    } catch { /* */ }
  }, []);

  const fetchBookings = useCallback(async () => {
    try {
      const res = await bookingService.getMyBookings({ status: "active,in_progress,completed" as never, limit: 50 });
      if (res.success && res.data) {
        const bookings = res.data.bookings || [];
        type RawBooking = { _id: string; bookingNumber?: string; serviceType: string; status: string; paymentStatus?: string; caregiverId?: { firstName?: string; lastName?: string } | string; careSeekerId?: { firstName?: string; lastName?: string } | string };
        setBookingOptions(
          (bookings as unknown as RawBooking[])
            .filter((b) => b.paymentStatus === "partially_paid" || b.paymentStatus === "fully_paid")
            .map((b) => ({
              _id: b._id,
              bookingNumber: b.bookingNumber || b._id.slice(-6),
              serviceType: b.serviceType,
              status: b.status,
              otherParty: userRole === "careseeker"
                ? (typeof b.caregiverId === "object" ? ((b.caregiverId as { fullName?: string; firstName?: string; lastName?: string })?.fullName || `${(b.caregiverId as { firstName?: string })?.firstName || ""} ${(b.caregiverId as { lastName?: string })?.lastName || ""}`.trim() || "Caregiver") : "Caregiver")
                : (typeof b.careSeekerId === "object" ? ((b.careSeekerId as { fullName?: string; firstName?: string; lastName?: string })?.fullName || `${(b.careSeekerId as { firstName?: string })?.firstName || ""} ${(b.careSeekerId as { lastName?: string })?.lastName || ""}`.trim() || "Care Seeker") : "Care Seeker"),
            }))
        );
      }
    } catch { /* */ }
  }, [userRole]);

  useEffect(() => { fetchNotes(); }, [fetchNotes]);
  useEffect(() => { fetchStats(); fetchBookings(); }, [fetchStats, fetchBookings]);
  useEffect(() => {
    if (!socket || !connected) return;

    let refreshTimer: ReturnType<typeof setTimeout> | null = null;
    const handleRealtimeUpdate = () => {
      if (refreshTimer) return;
      refreshTimer = setTimeout(() => {
        refreshTimer = null;
        void fetchNotes();
        void fetchStats();
        void fetchBookings();
      }, 250);
    };

    const events = [
      SYSTEM_EVENTS.NOTE_CREATED,
      SYSTEM_EVENTS.NOTE_UPDATED,
      SYSTEM_EVENTS.NOTE_DELETED,
      SYSTEM_EVENTS.NOTE_SHARED,
      SYSTEM_EVENTS.NOTE_EDIT_REQUEST_CREATED,
      SYSTEM_EVENTS.NOTE_EDIT_REQUEST_APPROVED,
      SYSTEM_EVENTS.NOTE_EDIT_REQUEST_REJECTED,
    ];

    events.forEach((eventName) => socket.on(eventName, handleRealtimeUpdate));

    return () => {
      if (refreshTimer) {
        clearTimeout(refreshTimer);
      }
      events.forEach((eventName) => socket.off(eventName, handleRealtimeUpdate));
    };
  }, [socket, connected, fetchNotes, fetchStats, fetchBookings]);

  const handleCreateOrUpdate = async () => {
    try {
      if (editingNote) {
        const data: UpdateNotePayload = { title: formData.title, content: formData.content, tag: formData.tag };
        await noteService.updateNote(editingNote._id, data);
      } else {
        const data: CreateNotePayload = {
          title: formData.title,
          content: formData.content,
          tag: formData.tag,
          visibility: formData.visibility,
          ...(formData.bookingId ? { bookingId: formData.bookingId } : {}),
        };
        await noteService.createNote(data);
      }
      closeModal();
      fetchNotes();
      fetchStats();
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message || "Failed to save note";
      alert(msg);
    }
  };

  const handleShare = async (noteId: string) => {
    if (!formData.bookingId) { alert("Select a booking"); return; }
    try {
      await noteService.shareNote(noteId, formData.bookingId);
      closeModal();
      fetchNotes();
      fetchStats();
    } catch (err: unknown) {
      alert((err as { message?: string })?.message || "Failed to share");
    }
  };

  const handleEditRequest = async () => {
    try {
      const data: CreateEditRequestPayload = {
        noteId: editRequestForm.noteId,
        reason: editRequestForm.reason,
        ...(editRequestForm.proposedTitle ? { proposedTitle: editRequestForm.proposedTitle } : {}),
        ...(editRequestForm.proposedContent ? { proposedContent: editRequestForm.proposedContent } : {}),
        ...(editRequestForm.proposedTag ? { proposedTag: editRequestForm.proposedTag } : {}),
      };
      await noteService.createEditRequest(data);
      closeModal();
      fetchNotes();
      fetchStats();
    } catch (err: unknown) {
      alert((err as { message?: string })?.message || "Failed to submit edit request");
    }
  };

  const handleApprove = async (requestId: string) => {
    try {
      await noteService.approveEditRequest(requestId, "Approved");
      fetchNotes();
      fetchStats();
    } catch { alert("Failed to approve"); }
  };

  const handleReject = async (requestId: string) => {
    try {
      await noteService.rejectEditRequest(requestId, "Rejected");
      fetchNotes();
      fetchStats();
    } catch { alert("Failed to reject"); }
  };

  const handleDelete = async (noteId: string) => {
    try {
      await noteService.deleteNote(noteId);
      setDeleteConfirm(null);
      fetchNotes();
      fetchStats();
    } catch { alert("Failed to delete"); }
  };

  const openCreateModal = () => {
    setEditingNote(null);
    setModalMode("create");
    setFormData({ bookingId: "", title: "", content: "", tag: "general", visibility: activeTab === "shared" ? "shared" : "private" });
    setShowModal(true);
  };

  const openEditModal = (note: Note) => {
    setEditingNote(note);
    setModalMode("edit");
    setFormData({
      bookingId: typeof note.bookingId === "object" ? note.bookingId._id : note.bookingId || "",
      title: note.title,
      content: note.content,
      tag: note.tag,
      visibility: note.visibility,
    });
    setShowModal(true);
  };

  const openShareModal = (note: Note) => {
    setEditingNote(note);
    setModalMode("share");
    setFormData(prev => ({ ...prev, bookingId: "" }));
    setShowModal(true);
  };

  const openEditRequestModal = (note: Note) => {
    setModalMode("edit-request");
    setEditingNote(note);
    setEditRequestForm({
      noteId: note._id,
      proposedTitle: note.title,
      proposedContent: note.content,
      proposedTag: note.tag,
      reason: "",
    });
    setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setEditingNote(null); };

  const formatDate = (d: string) => new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  const formatServiceType = (t: string) => t?.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) || "";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <StickyNote className="w-6 h-6 text-[#39B54A]" />
            Notes
          </h1>
          <p className="text-gray-500 mt-1 text-sm">
            {userRole === "careseeker" ? "Manage care plans and share with caregivers" : "Private notes for your care management"}
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={openCreateModal}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#39B54A] text-white rounded-xl font-medium shadow-lg shadow-[#39B54A]/20 hover:bg-[#2DA03E] transition-colors"
        >
          <Plus size={18} />
          New Note
        </motion.button>
      </div>

      {/* Stats Bar - More compact grid */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <p className="text-2xl font-bold text-gray-900">{stats.totalNotes}</p>
            <p className="text-xs text-gray-500 mt-1">Total Notes</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <div className="flex items-center gap-2">
              <Lock size={14} className="text-gray-500" />
              <p className="text-2xl font-bold text-gray-900">{stats.visibility?.private || 0}</p>
            </div>
            <p className="text-xs text-gray-500 mt-1">Private</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <div className="flex items-center gap-2">
              <Share2 size={14} className="text-[#39B54A]" />
              <p className="text-2xl font-bold text-gray-900">{stats.visibility?.shared || 0}</p>
            </div>
            <p className="text-xs text-gray-500 mt-1">Shared</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <div className="flex items-center gap-2">
              <Edit3 size={14} className="text-amber-500" />
              <p className="text-2xl font-bold text-gray-900">{stats.editRequests?.pending || 0}</p>
            </div>
            <p className="text-xs text-gray-500 mt-1">Pending Edits</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const count = tab.key === "edit-requests" ? (stats?.editRequests?.pending || 0) : 0;
          return (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setPagination(p => ({ ...p, page: 1 })); }}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Icon size={16} />
              {tab.label}
              {count > 0 && (
                <span className="bg-[#39B54A] text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Search & Filter (only for notes tabs) */}
      {activeTab !== "edit-requests" && (
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search notes..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#39B54A]/20 focus:border-[#39B54A]"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => { setActiveTag("all"); setPagination(p => ({ ...p, page: 1 })); }}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                activeTag === "all" ? "bg-[#39B54A] text-white" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
              }`}
            >
              <Filter size={14} className="inline mr-1.5" />
              All Tags
            </button>
            {Object.entries(TAG_CONFIG).slice(0, 4).map(([key, config]) => {
              const Icon = config.icon;
              return (
                <button
                  key={key}
                  onClick={() => { setActiveTag(key); setPagination(p => ({ ...p, page: 1 })); }}
                  className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors border ${
                    activeTag === key ? `${config.bgColor} ${config.color}` : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <Icon size={14} className="inline mr-1.5" />
                  {config.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="bg-white rounded-2xl p-5 border border-gray-100 animate-pulse">
              <div className="h-5 bg-gray-200 rounded w-20 mb-4" />
              <div className="h-5 bg-gray-200 rounded w-3/4 mb-2" />
              <div className="h-4 bg-gray-100 rounded w-full mb-1" />
              <div className="h-4 bg-gray-100 rounded w-2/3 mb-4" />
              <div className="h-px bg-gray-100 mb-3" />
              <div className="flex justify-between"><div className="h-4 bg-gray-100 rounded w-24" /><div className="h-4 bg-gray-100 rounded w-16" /></div>
            </div>
          ))}
        </div>
      ) : activeTab === "edit-requests" ? (
        /* Edit Requests Tab */
        editRequests.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
            <Edit3 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-gray-900 mb-1">No edit requests</h3>
            <p className="text-sm text-gray-500">
              {userRole === "careseeker" ? "No caregivers have requested changes to your notes" : "You haven't requested any edits yet"}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {editRequests.map((req, idx) => (
                <motion.div
                  key={req._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="bg-white rounded-2xl p-5 border border-gray-100 hover:shadow-lg transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                          req.status === "pending" ? "bg-amber-50 text-amber-700 border border-amber-200"
                          : req.status === "approved" ? "bg-green-50 text-green-700 border border-green-200"
                          : "bg-red-50 text-red-700 border border-red-200"
                        }`}>
                          {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                        </span>
                        <span className="text-xs text-gray-400">{formatDate(req.createdAt)}</span>
                      </div>
                      <h3 className="font-semibold text-gray-900 mb-1">
                        Edit request for: {req.noteId?.title || "Note"}
                      </h3>
                      <p className="text-sm text-gray-600 mb-2">{req.reason}</p>
                      {req.proposedTitle && req.proposedTitle !== req.noteId?.title && (
                        <p className="text-xs text-gray-500">New title: <span className="font-medium">{req.proposedTitle}</span></p>
                      )}
                      <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                        <User size={12} />
                        <span>By {(req.requestedBy as { fullName?: string; firstName?: string; lastName?: string })?.fullName || `${(req.requestedBy as { firstName?: string })?.firstName || ""} ${(req.requestedBy as { lastName?: string })?.lastName || ""}`.trim() || "User"}</span>
                      </div>
                    </div>
                    {req.status === "pending" && userRole === "careseeker" && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApprove(req._id)}
                          className="px-4 py-2 bg-green-500 text-white rounded-xl text-sm font-medium hover:bg-green-600 transition-colors"
                        >
                          <CheckCircle size={14} className="inline mr-1" />
                          Approve
                        </button>
                        <button
                          onClick={() => handleReject(req._id)}
                          className="px-4 py-2 bg-red-50 text-red-600 rounded-xl text-sm font-medium hover:bg-red-100 transition-colors"
                        >
                          <X size={14} className="inline mr-1" />
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                  {req.responseMessage && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-xl text-sm text-gray-600">
                      <MessageSquare size={14} className="inline mr-1.5 text-gray-400" />
                      {req.responseMessage}
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )
      ) : notes.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <StickyNote className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-900 mb-1">No {activeTab} notes</h3>
          <p className="text-sm text-gray-500 mb-4">
            {search ? "No notes match your search" : activeTab === "private" ? "Create a private note to get started" : "Share private notes with your caregiver"}
          </p>
          {!search && (
            <button onClick={openCreateModal} className="px-5 py-2 bg-[#4461F2] text-white rounded-xl text-sm font-medium hover:bg-[#3651E2] transition-colors">
              <Plus size={16} className="inline mr-1" />
              Create Note
            </button>
          )}
        </div>
      ) : (
        /* Notes Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {notes.map((note, idx) => {
              const tagConfig = TAG_CONFIG[note.tag] || TAG_CONFIG.general;
              const TagIcon = tagConfig.icon;
              const isOwner = note.creatorRole === userRole;

              return (
                <motion.div
                  key={note._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: idx * 0.05 }}
                  className="bg-white rounded-2xl p-5 border border-gray-100 hover:shadow-lg hover:shadow-gray-100/50 transition-all duration-300 group relative"
                >
                  {/* Visibility badge */}
                  <div className="absolute top-3 right-3">
                    {note.visibility === "private" ? (
                      <Lock size={14} className="text-gray-400" />
                    ) : (
                      <Eye size={14} className="text-blue-400" />
                    )}
                  </div>

                  {/* Tag & Pending badge */}
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${tagConfig.bgColor} ${tagConfig.color}`}>
                      <TagIcon size={12} />
                      {tagConfig.label}
                    </span>
                    {note.hasPendingEditRequest && (
                      <span className="px-2 py-0.5 bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-medium rounded-full">
                        Edit Pending
                      </span>
                    )}
                  </div>

                  <h3 className="font-semibold text-gray-900 mb-2 line-clamp-1 pr-6">{note.title}</h3>
                  <p className="text-sm text-gray-600 mb-4 line-clamp-3 leading-relaxed">{note.content}</p>

                  {/* Actions */}
                  <div className="flex items-center gap-1 mb-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    {isOwner && (
                      <>
                        <button onClick={() => openEditModal(note)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors" title="Edit">
                          <Edit3 size={15} />
                        </button>
                        {note.visibility === "private" && userRole === "careseeker" && (
                          <button onClick={() => openShareModal(note)} className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors" title="Share">
                            <Share2 size={15} />
                          </button>
                        )}
                        <button onClick={() => setDeleteConfirm(note._id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors" title="Delete">
                          <Trash2 size={15} />
                        </button>
                      </>
                    )}
                    {!isOwner && note.visibility === "shared" && (
                      <button onClick={() => openEditRequestModal(note)} className="p-1.5 rounded-lg hover:bg-amber-50 text-gray-400 hover:text-amber-600 transition-colors" title="Request Edit">
                        <Edit3 size={15} />
                      </button>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="border-t border-gray-100 pt-3">
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <div className="flex items-center gap-1.5">
                        <User size={12} />
                        <span>{isOwner ? "You" : ((note.createdBy as { fullName?: string; firstName?: string; lastName?: string })?.fullName || `${(note.createdBy as { firstName?: string })?.firstName || ""} ${(note.createdBy as { lastName?: string })?.lastName || ""}`.trim() || "User")}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar size={12} />
                        <span>{formatDate(note.createdAt)}</span>
                      </div>
                    </div>
                    {note.bookingId && typeof note.bookingId === "object" && (
                      <div className="flex items-center gap-1.5 mt-2 text-xs text-gray-400">
                        <Tag size={12} />
                        <span>{note.bookingId.bookingNumber} &middot; {formatServiceType(note.bookingId.serviceType)}</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex justify-center gap-2 mt-8">
          {Array.from({ length: pagination.pages }, (_, i) => (
            <button
              key={i}
              onClick={() => setPagination(p => ({ ...p, page: i + 1 }))}
              className={`w-9 h-9 rounded-xl text-sm font-medium transition-colors ${
                pagination.page === i + 1 ? "bg-[#4461F2] text-white" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
            onClick={closeModal}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between p-5 border-b border-gray-100">
                <h2 className="text-lg font-bold text-gray-900">
                  {modalMode === "create" ? "New Note" : modalMode === "edit" ? "Edit Note" : modalMode === "share" ? "Share Note" : "Request Edit"}
                </h2>
                <button onClick={closeModal} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X size={18} /></button>
              </div>

              <div className="p-5 space-y-4">
                {/* Share modal */}
                {modalMode === "share" && (
                  <>
                    <p className="text-sm text-gray-600">Share &ldquo;{editingNote?.title}&rdquo; with a caregiver by selecting a started, paid booking.</p>
                    <select
                      value={formData.bookingId}
                      onChange={(e) => setFormData(p => ({ ...p, bookingId: e.target.value }))}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#4461F2]/20 focus:border-[#4461F2] bg-white"
                    >
                      <option value="">Select started booking...</option>
                      {bookingOptions.map(b => (
                        <option key={b._id} value={b._id}>{b.bookingNumber} - {formatServiceType(b.serviceType)} ({b.otherParty})</option>
                      ))}
                    </select>
                  </>
                )}

                {/* Edit request modal */}
                {modalMode === "edit-request" && (
                  <>
                    <p className="text-sm text-gray-600">Request changes to &ldquo;{editingNote?.title}&rdquo;</p>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Proposed Title</label>
                      <input
                        type="text"
                        value={editRequestForm.proposedTitle}
                        onChange={(e) => setEditRequestForm(p => ({ ...p, proposedTitle: e.target.value }))}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#4461F2]/20 focus:border-[#4461F2]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Proposed Content</label>
                      <textarea
                        value={editRequestForm.proposedContent}
                        onChange={(e) => setEditRequestForm(p => ({ ...p, proposedContent: e.target.value }))}
                        rows={4}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#4461F2]/20 focus:border-[#4461F2] resize-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Reason for Edit <span className="text-red-500">*</span></label>
                      <textarea
                        value={editRequestForm.reason}
                        onChange={(e) => setEditRequestForm(p => ({ ...p, reason: e.target.value }))}
                        rows={2}
                        placeholder="Why should this note be changed?"
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#4461F2]/20 focus:border-[#4461F2] resize-none"
                      />
                    </div>
                  </>
                )}

                {/* Create / Edit modal */}
                {(modalMode === "create" || modalMode === "edit") && (
                  <>
                    {modalMode === "create" && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Booking (optional for private notes)</label>
                        {bookingOptions.length === 0 ? (
                          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-700">
                            <AlertCircle size={14} className="inline mr-1.5" />
                            No started and paid bookings found. You can still create private notes.
                          </div>
                        ) : (
                          <select
                            value={formData.bookingId}
                            onChange={(e) => setFormData(p => ({ ...p, bookingId: e.target.value }))}
                            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#4461F2]/20 focus:border-[#4461F2] bg-white"
                          >
                            <option value="">No booking (private note)</option>
                            {bookingOptions.map(b => (
                              <option key={b._id} value={b._id}>{b.bookingNumber} - {formatServiceType(b.serviceType)} ({b.otherParty})</option>
                            ))}
                          </select>
                        )}
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Title</label>
                      <input
                        type="text"
                        value={formData.title}
                        onChange={(e) => setFormData(p => ({ ...p, title: e.target.value }))}
                        placeholder="Note title..."
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#4461F2]/20 focus:border-[#4461F2]"
                        maxLength={200}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Content</label>
                      <textarea
                        value={formData.content}
                        onChange={(e) => setFormData(p => ({ ...p, content: e.target.value }))}
                        placeholder="Write your note..."
                        rows={5}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#4461F2]/20 focus:border-[#4461F2] resize-none"
                        maxLength={5000}
                      />
                      <p className="text-xs text-gray-400 mt-1 text-right">{formData.content.length}/5000</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Tag</label>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(TAG_CONFIG).map(([key, config]) => {
                          const Icon = config.icon;
                          return (
                            <button
                              key={key}
                              onClick={() => setFormData(p => ({ ...p, tag: key }))}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium border transition-colors ${
                                formData.tag === key ? `${config.bgColor} ${config.color}` : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
                              }`}
                            >
                              <Icon size={14} />
                              {config.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {modalMode === "create" && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Visibility</label>
                        <div className="flex gap-3">
                          <button
                            onClick={() => setFormData(p => ({ ...p, visibility: "private" }))}
                            className={`flex-1 px-3 py-2 rounded-xl text-sm font-medium border transition-colors ${
                              formData.visibility === "private" ? "bg-gray-100 text-gray-700 border-gray-300" : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
                            }`}
                          >
                            <Lock size={14} className="inline mr-1.5" />
                            Private
                          </button>
                          <button
                            onClick={() => setFormData(p => ({ ...p, visibility: "shared" }))}
                            disabled={!formData.bookingId}
                            className={`flex-1 px-3 py-2 rounded-xl text-sm font-medium border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                              formData.visibility === "shared" ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
                            }`}
                          >
                            <Share2 size={14} className="inline mr-1.5" />
                            Shared
                          </button>
                        </div>
                        {!formData.bookingId && formData.visibility === "shared" && (
                          <p className="text-xs text-amber-600 mt-1">Select a booking to share notes</p>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="flex justify-end gap-3 p-5 border-t border-gray-100">
                <button onClick={closeModal} className="px-5 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">
                  Cancel
                </button>
                {modalMode === "share" ? (
                  <button
                    onClick={() => editingNote && handleShare(editingNote._id)}
                    disabled={!formData.bookingId}
                    className="px-5 py-2 text-sm font-medium text-white bg-[#4461F2] rounded-xl hover:bg-[#3651E2] transition-colors disabled:opacity-50"
                  >
                    <Share2 size={14} className="inline mr-1.5" />
                    Share Note
                  </button>
                ) : modalMode === "edit-request" ? (
                  <button
                    onClick={handleEditRequest}
                    disabled={!editRequestForm.reason}
                    className="px-5 py-2 text-sm font-medium text-white bg-amber-500 rounded-xl hover:bg-amber-600 transition-colors disabled:opacity-50"
                  >
                    <Edit3 size={14} className="inline mr-1.5" />
                    Submit Request
                  </button>
                ) : (
                  <button
                    onClick={handleCreateOrUpdate}
                    disabled={!formData.title || !formData.content}
                    className="px-5 py-2 text-sm font-medium text-white bg-[#4461F2] rounded-xl hover:bg-[#3651E2] transition-colors disabled:opacity-50"
                  >
                    <CheckCircle size={14} className="inline mr-1.5" />
                    {editingNote ? "Update Note" : "Create Note"}
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
            onClick={() => setDeleteConfirm(null)}
          >
            <motion.div
              initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm text-center"
            >
              <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-6 h-6 text-red-500" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">Delete Note?</h3>
              <p className="text-sm text-gray-500 mb-6">This action cannot be undone.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteConfirm(null)} className="flex-1 px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">Cancel</button>
                <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-xl hover:bg-red-600 transition-colors">Delete</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
