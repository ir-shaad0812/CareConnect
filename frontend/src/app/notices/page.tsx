"use client";

// ============================================
// NOTICE BOARD PAGE
// Tabs: Notice Board | Today's Tasks | Upcoming
// ============================================

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell, CheckSquare, Calendar, ChevronRight, Clock,
  AlertTriangle, Info, Megaphone, ExternalLink,
  Check,
} from "lucide-react";
import noticeService, { type Notice } from "@/services/api/notice.service";
import taskService, { type Task, type ScheduleEntry } from "@/services/api/task.service";
import { useSocketEvent, SYSTEM_EVENTS } from "@/hooks/useSocket";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import CaregiverLayout from "@/app/dashboard/caregiver/components/CaregiverLayout";
import { useAuthContext } from "@/context/AuthContext";
import { authService } from "@/modules/auth/services";

// ─── Tab definitions ──────────────────────────────────────────────────────────

const TABS = [
  { id: "notices",  label: "Notice Board",    icon: Bell },
  { id: "today",    label: "Today's Task",     icon: CheckSquare },
  { id: "upcoming", label: "Upcoming Tasks",   icon: Calendar },
] as const;

type TabId = (typeof TABS)[number]["id"];

// ─── Notice type helpers ──────────────────────────────────────────────────────

const NOTICE_TYPE_CONFIG = {
  urgent:       { label: "Urgent",       color: "bg-red-100 text-red-700 border-red-200",       icon: <AlertTriangle className="w-3.5 h-3.5" /> },
  warning:      { label: "Warning",      color: "bg-amber-100 text-amber-700 border-amber-200",  icon: <AlertTriangle className="w-3.5 h-3.5" /> },
  info:         { label: "Info",         color: "bg-blue-100 text-blue-700 border-blue-200",     icon: <Info className="w-3.5 h-3.5" /> },
  announcement: { label: "Announcement", color: "bg-purple-100 text-purple-700 border-purple-200", icon: <Megaphone className="w-3.5 h-3.5" /> },
  normal:       { label: "Notice",       color: "bg-gray-100 text-gray-600 border-gray-200",     icon: <Bell className="w-3.5 h-3.5" /> },
} as const;

function getNoticeConfig(type: string) {
  return NOTICE_TYPE_CONFIG[type as keyof typeof NOTICE_TYPE_CONFIG] ?? NOTICE_TYPE_CONFIG.normal;
}

// ─── Task priority colors ─────────────────────────────────────────────────────

const PRIORITY_COLOR = {
  high:   "bg-red-50 border-red-200 text-red-700",
  medium: "bg-amber-50 border-amber-200 text-amber-700",
  low:    "bg-gray-50 border-gray-200 text-gray-500",
};

function relativeDate(dateStr?: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const now = new Date();
  const diff = d.getTime() - now.getTime();
  if (diff < 0) return "Overdue";
  const hrs = Math.floor(diff / 3_600_000);
  if (hrs < 1) return "Due in < 1 hour";
  if (hrs < 24) return `Due in ${hrs}h`;
  return `Due ${d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}`;
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric",
  });
}
function formatTime(timeStr?: string): string {
  if (!timeStr) return "";
  const [h, m] = timeStr.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  return `${hour % 12 || 12}:${m} ${ampm}`;
}

// ============================================================================
// PAGE COMPONENT
// ============================================================================

export default function NoticesPage() {
  const router = useRouter();
  const { user: authUser } = useAuthContext();
  const [activeTab, setActiveTab] = useState<TabId>("notices");
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    if (authUser?.role) {
      setUserRole(authUser.role);
      return;
    }

    const cachedUser = authService.getCurrentUser();
    if (cachedUser?.role) {
      setUserRole(cachedUser.role);
      return;
    }

    try {
      const stored = localStorage.getItem("careconnect_user");
      if (stored) {
        const u = JSON.parse(stored);
        setUserRole(u?.role ?? null);
      }
    } catch { /* ignore */ }
  }, [authUser?.role]);

  // Notices state
  const [notices, setNotices] = useState<Notice[]>([]);
  const [noticesLoading, setNoticesLoading] = useState(false);
  const [expandedNoticeId, setExpandedNoticeId] = useState<string | null>(null);
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [responseText, setResponseText] = useState("");
  const [respondSubmitting, setRespondSubmitting] = useState(false);

  // Tasks state
  const [todayTasks, setTodayTasks] = useState<Task[]>([]);
  const [todayLoading, setTodayLoading] = useState(false);

  // Upcoming state
  const [upcomingTasks, setUpcomingTasks] = useState<Task[]>([]);
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
  const [upcomingLoading, setUpcomingLoading] = useState(false);

  // ─── Load data per tab ──────────────────────────────────────────────────────

  const loadNotices = useCallback(async () => {
    setNoticesLoading(true);
    try {
      const res = await noticeService.getNotices({ page: 1, limit: 20 });
      if (res.success) {
        setNotices(Array.isArray(res.data?.notices) ? res.data.notices : []);
      }
    } catch { /* non-fatal */ }
    finally { setNoticesLoading(false); }
  }, []);

  const loadTodayTasks = useCallback(async () => {
    setTodayLoading(true);
    try {
      const res = await taskService.getTodayTasks();
      if (res.success) {
        setTodayTasks(Array.isArray(res.data?.tasks) ? res.data.tasks : []);
      }
    } catch { /* non-fatal */ }
    finally { setTodayLoading(false); }
  }, []);

  const loadUpcoming = useCallback(async () => {
    setUpcomingLoading(true);
    try {
      const res = await taskService.getUpcomingTasks();
      if (res.success && res.data) {
        setUpcomingTasks(Array.isArray(res.data.tasks) ? res.data.tasks : []);
        setSchedule(Array.isArray(res.data.schedule) ? res.data.schedule : []);
      }
    } catch { /* non-fatal */ }
    finally { setUpcomingLoading(false); }
  }, []);

  useEffect(() => {
    if (activeTab === "notices") loadNotices();
    else if (activeTab === "today") loadTodayTasks();
    else if (activeTab === "upcoming") loadUpcoming();
  }, [activeTab, loadNotices, loadTodayTasks, loadUpcoming]);

  // Real-time: remove expired notices instantly when server broadcasts
  useSocketEvent(SYSTEM_EVENTS.NOTICE_EXPIRED, (payload: unknown) => {
    const { noticeId } = payload as { noticeId: string };
    if (noticeId) {
      setNotices(prev => prev.filter(n => n._id !== noticeId));
    }
  });

  // Real-time: add new notices when admin broadcasts one
  useSocketEvent(SYSTEM_EVENTS.NOTICE_CREATED, () => {
    if (activeTab === "notices") loadNotices();
  });

  // ─── Handlers ───────────────────────────────────────────────────────────────

  const handleNoticeClick = async (notice: Notice) => {
    setExpandedNoticeId(prev => prev === notice._id ? null : notice._id);
    if (!notice.isRead) {
      setNotices(prev => prev.map(n => n._id === notice._id ? { ...n, isRead: true } : n));
      noticeService.markRead(notice._id).catch(() => null);
    }
  };

  const handleRespond = async (noticeId: string) => {
    if (!responseText.trim()) return;
    setRespondSubmitting(true);
    try {
      await noticeService.respond(noticeId, responseText);
      setResponseText("");
      setRespondingId(null);
    } catch { /* non-fatal */ }
    finally { setRespondSubmitting(false); }
  };

  const handleCompleteTask = async (taskId: string) => {
    await taskService.completeTask(taskId).catch(() => null);
    setTodayTasks(prev => prev.filter(t => t._id !== taskId));
  };

  const handleDismissTask = async (taskId: string) => {
    await taskService.dismissTask(taskId).catch(() => null);
    setTodayTasks(prev => prev.filter(t => t._id !== taskId));
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  const content = (
    <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Page header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Notice Board</h1>
          <p className="text-gray-500 text-sm mt-1">Stay updated with announcements, tasks, and your schedule</p>
        </div>

        {/* Tab bar */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex border-b border-gray-100">
            {TABS.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-medium transition-colors relative ${
                    isActive
                      ? "text-[#9747FF]"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                  {isActive && (
                    <motion.div
                      layoutId="tab-indicator"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#9747FF]"
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Tab content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
              className="p-4 min-h-75"
            >
              {activeTab === "notices" && (
                <NoticeBoard
                  notices={notices}
                  loading={noticesLoading}
                  expandedId={expandedNoticeId}
                  respondingId={respondingId}
                  responseText={responseText}
                  respondSubmitting={respondSubmitting}
                  onNoticeClick={handleNoticeClick}
                  onStartRespond={setRespondingId}
                  onResponseChange={setResponseText}
                  onSubmitResponse={handleRespond}
                />
              )}

              {activeTab === "today" && (
                <TodayTasks
                  tasks={todayTasks}
                  loading={todayLoading}
                  onComplete={handleCompleteTask}
                  onDismiss={handleDismissTask}
                  onNavigate={(url) => router.push(url)}
                />
              )}

              {activeTab === "upcoming" && (
                <UpcomingView
                  tasks={upcomingTasks}
                  schedule={schedule}
                  loading={upcomingLoading}
                  onNavigate={(url) => router.push(url)}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
    </div>
  );

  if (userRole === "caregiver") {
    return <CaregiverLayout>{content}</CaregiverLayout>;
  }
  if (userRole === "careseeker") {
    return <DashboardLayout>{content}</DashboardLayout>;
  }
  // Fallback for non-authenticated or admin — render plain
  return <div className="min-h-screen bg-neutral-50 p-6">{content}</div>;
}

// ============================================================================
// NOTICE BOARD TAB
// ============================================================================

interface NoticeBoardProps {
  notices: Notice[];
  loading: boolean;
  expandedId: string | null;
  respondingId: string | null;
  responseText: string;
  respondSubmitting: boolean;
  onNoticeClick: (n: Notice) => void;
  onStartRespond: (id: string | null) => void;
  onResponseChange: (v: string) => void;
  onSubmitResponse: (id: string) => void;
}

function NoticeBoard({
  notices, loading, expandedId, respondingId,
  responseText, respondSubmitting,
  onNoticeClick, onStartRespond, onResponseChange, onSubmitResponse,
}: NoticeBoardProps) {
  if (loading) return <LoadingRows />;
  if (notices.length === 0) {
    return (
      <EmptyState icon={<Bell className="w-8 h-8" />} title="No notices yet" subtitle="New announcements from admin will appear here" />
    );
  }

  return (
    <div className="space-y-3">
      {notices.map(notice => {
        const cfg = getNoticeConfig(notice.type);
        const isExpanded = expandedId === notice._id;
        const isRead = notice.isRead;

        return (
          <div
            key={notice._id}
            className={`rounded-xl border transition-all ${
              !isRead ? "border-purple-100 bg-purple-50/30" : "border-gray-100 bg-white"
            }`}
          >
            {/* Header row */}
            <button
              className="w-full flex items-start gap-3 p-4 text-left"
              onClick={() => onNoticeClick(notice)}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center flex-wrap gap-2 mb-1">
                  <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${cfg.color}`}>
                    {cfg.icon}
                    {cfg.label}
                  </span>
                  {!isRead && (
                    <span className="w-2 h-2 rounded-full bg-[#9747FF]" />
                  )}
                </div>
                <p className={`text-sm leading-snug ${!isRead ? "font-semibold text-gray-900" : "font-medium text-gray-800"}`}>
                  {notice.title}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {notice.createdBy?.fullName} &middot; {formatDate(notice.createdAt)}
                  {notice.expiryDate && ` · Expires ${formatDate(notice.expiryDate)}`}
                </p>
              </div>
              <motion.div
                animate={{ rotate: isExpanded ? 90 : 0 }}
                transition={{ duration: 0.15 }}
                className="shrink-0 mt-0.5"
              >
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </motion.div>
            </button>

            {/* Expanded content */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-4 border-t border-gray-100 pt-3">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                      {notice.content}
                    </p>

                    {notice.attachments?.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {notice.attachments.map((a, i) => (
                          <a
                            key={i}
                            href={a.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-[#9747FF] underline hover:text-purple-700"
                          >
                            <ExternalLink className="w-3 h-3" />
                            {a.name}
                          </a>
                        ))}
                      </div>
                    )}

                    {notice.allowResponse && (
                      <div className="mt-3">
                        {respondingId === notice._id ? (
                          <div className="space-y-2">
                            <textarea
                              value={responseText}
                              onChange={e => onResponseChange(e.target.value)}
                              placeholder="Write your response…"
                              rows={3}
                              className="w-full text-sm border border-gray-200 rounded-lg p-2 resize-none focus:outline-none focus:ring-2 focus:ring-[#9747FF]/30"
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => onSubmitResponse(notice._id)}
                                disabled={respondSubmitting || !responseText.trim()}
                                className="px-3 py-1.5 text-xs bg-[#9747FF] text-white rounded-lg disabled:opacity-50"
                              >
                                {respondSubmitting ? "Sending…" : "Send Response"}
                              </button>
                              <button
                                onClick={() => onStartRespond(null)}
                                className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => onStartRespond(notice._id)}
                            className="text-xs text-[#9747FF] hover:text-purple-700 font-medium"
                          >
                            Reply to this notice →
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// TODAY'S TASKS TAB
// ============================================================================

interface TodayTasksProps {
  tasks: Task[];
  loading: boolean;
  onComplete: (id: string) => void;
  onDismiss: (id: string) => void;
  onNavigate: (url: string) => void;
}

function TodayTasks({ tasks, loading, onComplete, onDismiss, onNavigate }: TodayTasksProps) {
  const scheduled = tasks.filter(t => t.type === "schedule_upcoming");
  const assignments = tasks.filter(t => t.type !== "schedule_upcoming");

  if (loading) return <LoadingRows />;
  if (tasks.length === 0) {
    return <EmptyState icon={<CheckSquare className="w-8 h-8" />} title="Nothing due today" subtitle="Completed tasks and upcoming sessions will appear here" />;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Scheduled sessions */}
      <div>
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Scheduled Sessions ▾
        </h3>
        {scheduled.length === 0 ? (
          <p className="text-sm text-gray-400 italic">Nothing in your list right now</p>
        ) : (
          <div className="space-y-2">
            {scheduled.map(t => (
              <TaskCard key={t._id} task={t} onComplete={onComplete} onDismiss={onDismiss} onNavigate={onNavigate} />
            ))}
          </div>
        )}
      </div>

      {/* Assignments / actions */}
      <div>
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Assignments
        </h3>
        {assignments.length === 0 ? (
          <p className="text-sm text-gray-400 italic">No assignments for today</p>
        ) : (
          <div className="space-y-2">
            {assignments.map(t => (
              <TaskCard key={t._id} task={t} onComplete={onComplete} onDismiss={onDismiss} onNavigate={onNavigate} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// UPCOMING VIEW TAB
// ============================================================================

interface UpcomingViewProps {
  tasks: Task[];
  schedule: ScheduleEntry[];
  loading: boolean;
  onNavigate: (url: string) => void;
}

function UpcomingView({ tasks, schedule, loading, onNavigate }: UpcomingViewProps) {
  if (loading) return <LoadingRows />;

  const noData = tasks.length === 0 && schedule.length === 0;
  if (noData) {
    return <EmptyState icon={<Calendar className="w-8 h-8" />} title="Clear schedule" subtitle="Upcoming sessions and deadlines will appear here" />;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Scheduled sessions */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Scheduled Sessions (Next 7 Days)
          </h3>
          {schedule.length > 3 && (
            <button className="text-xs text-[#9747FF] hover:underline">View All</button>
          )}
        </div>
        {schedule.length === 0 ? (
          <p className="text-sm text-gray-400 italic">No upcoming sessions</p>
        ) : (
          <div className="space-y-2">
            {schedule.map(s => (
              <ScheduleCard key={s._id} entry={s} onNavigate={onNavigate} />
            ))}
          </div>
        )}
      </div>

      {/* schedule/ Tasks / deadlines */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Schedule/Tasks (Next 7 Days)
          </h3>
          {tasks.length > 3 && (
            <button className="text-xs text-[#9747FF] hover:underline">View All</button>
          )}
        </div>
        {tasks.length === 0 ? (
          <p className="text-sm text-gray-400 italic">No upcoming deadlines</p>
        ) : (
          <div className="space-y-2">
            {tasks.map(t => (
              <div
                key={t._id}
                className="bg-amber-50 border border-amber-100 rounded-xl p-3 cursor-pointer hover:bg-amber-100/60 transition-colors"
                onClick={() => t.actionUrl && onNavigate(t.actionUrl)}
              >
                <p className="text-sm font-medium text-gray-800">{t.title}</p>
                {t.dueDate && (
                  <p className="text-xs text-amber-700 mt-1 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Deadline: {new Date(t.dueDate).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                  </p>
                )}
                {t.actionUrl && (
                  <button className="text-xs text-[#9747FF] mt-1 font-medium hover:underline">
                    Jump to Page →
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Task Card ────────────────────────────────────────────────────────────────

interface TaskCardProps {
  task: Task;
  onComplete: (id: string) => void;
  onDismiss: (id: string) => void;
  onNavigate: (url: string) => void;
}

function TaskCard({ task, onComplete, onNavigate }: TaskCardProps) {
  const pColor = PRIORITY_COLOR[task.priority] ?? PRIORITY_COLOR.low;
  return (
    <div className={`rounded-xl border p-3 ${pColor} transition-all`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium leading-snug">{task.title}</p>
          {task.dueDate && (
            <p className="text-xs mt-1 flex items-center gap-1 opacity-80">
              <Clock className="w-3 h-3" />
              {relativeDate(task.dueDate)}
            </p>
          )}
        </div>
        <button
          onClick={() => onComplete(task._id)}
          className="shrink-0 w-6 h-6 rounded-full border-2 border-current flex items-center justify-center hover:bg-white/40 transition-colors"
          aria-label="Complete task"
        >
          <Check className="w-3 h-3" />
        </button>
      </div>
      {task.actionUrl && (
        <button
          onClick={() => onNavigate(task.actionUrl!)}
          className="mt-2 text-xs font-medium underline opacity-80 hover:opacity-100 flex items-center gap-1"
        >
          <ExternalLink className="w-3 h-3" />
          Jump to Page
        </button>
      )}
    </div>
  );
}

// ─── Schedule Card ────────────────────────────────────────────────────────────

function ScheduleCard({ entry, onNavigate }: { entry: ScheduleEntry; onNavigate: (url: string) => void }) {
  return (
    <div
      className="bg-white border border-gray-100 rounded-xl p-3 cursor-pointer hover:bg-gray-50 transition-colors"
      onClick={() => entry.actionUrl && onNavigate(entry.actionUrl)}
    >
      <p className="text-sm font-medium text-gray-800">{entry.title}</p>
      {entry.startDate && (
        <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          {formatDate(entry.startDate)}
          {entry.startTime && ` at ${formatTime(entry.startTime)}`}
          {entry.endTime && ` - ${formatTime(entry.endTime)}`}
        </p>
      )}
      {entry.actionUrl && (
        <span className="text-xs text-[#9747FF] mt-1 inline-flex items-center gap-1">
          <ExternalLink className="w-3 h-3" />
          View booking
        </span>
      )}
    </div>
  );
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function LoadingRows() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map(i => (
        <div key={i} className="animate-pulse rounded-xl border border-gray-100 bg-gray-50 p-4">
          <div className="h-3 bg-gray-200 rounded w-1/4 mb-2" />
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
          <div className="h-2.5 bg-gray-200 rounded w-1/3" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-center text-gray-400">
      <div className="mb-3 opacity-30">{icon}</div>
      <p className="font-medium text-gray-600">{title}</p>
      <p className="text-sm mt-1">{subtitle}</p>
    </div>
  );
}
