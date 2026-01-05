"use client";

// ============================================
// ADMIN LIVE LOGS PAGE
// Real-time log streaming via socket admin:log
// REST fallback: GET /api/admin/activity
// Export: CSV download
// ============================================

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import AdminLayout from "@/components/layout/AdminLayout";
import { useSocket } from "@/hooks/useSocket";
import { adminService } from "@/services";
import {
  Activity, Wifi, WifiOff, Download, Trash2, Pause, Play,
  RefreshCw, AlertTriangle, CheckCircle, Info, XCircle, Filter,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────

type LogLevel = "INFO" | "WARN" | "ERROR" | "DEBUG";
type LogCategory = "auth" | "booking" | "payment" | "review" | "note" | "message" | "system" | "call" | "admin";

interface LogEntry {
  id: string;
  level: LogLevel;
  category: LogCategory;
  action: string;
  userId?: string;
  userName?: string;
  userRole?: string;
  message: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
  isRealtime?: boolean;
}

// ── Helpers ────────────────────────────────────────────────────────────────

const LEVEL_CONFIG: Record<LogLevel, { icon: React.ReactNode; bg: string; text: string; dot: string }> = {
  INFO:  { icon: <Info  className="w-3.5 h-3.5" />, bg: "bg-sky-50",    text: "text-sky-700",   dot: "bg-sky-400"    },
  WARN:  { icon: <AlertTriangle className="w-3.5 h-3.5" />, bg: "bg-amber-50",  text: "text-amber-700", dot: "bg-amber-400"  },
  ERROR: { icon: <XCircle className="w-3.5 h-3.5" />, bg: "bg-rose-50",   text: "text-rose-700",  dot: "bg-rose-500"   },
  DEBUG: { icon: <CheckCircle className="w-3.5 h-3.5" />, bg: "bg-slate-50",  text: "text-slate-600", dot: "bg-slate-400"  },
};

const CATEGORY_COLORS: Record<LogCategory, string> = {
  auth:    "bg-violet-100 text-violet-700",
  booking: "bg-blue-100  text-blue-700",
  payment: "bg-emerald-100 text-emerald-700",
  review:  "bg-amber-100 text-amber-700",
  note:    "bg-teal-100  text-teal-700",
  message: "bg-pink-100  text-pink-700",
  system:  "bg-slate-100 text-slate-600",
  call:    "bg-indigo-100 text-indigo-700",
  admin:   "bg-red-100   text-red-700",
};

const ACTION_TO_LEVEL: Record<string, LogLevel> = {
  login: "INFO", logout: "INFO",
  booking_create: "INFO", booking_confirm: "INFO", booking_cancel: "WARN",
  payment_completed: "INFO", payment_failed: "ERROR", payment_refund: "WARN",
  review_submitted: "INFO",
  call_started: "INFO", call_failed: "WARN",
  message_send: "INFO",
  note_create: "INFO",
  error: "ERROR", crash: "ERROR",
};

const ACTION_TO_CATEGORY: Record<string, LogCategory> = {
  login: "auth", logout: "auth", password_reset: "auth",
  booking_create: "booking", booking_confirm: "booking", booking_cancel: "booking",
  payment_completed: "payment", payment_failed: "payment",
  review_submitted: "review",
  call_started: "call", call_failed: "call",
  message_send: "message",
  note_create: "note",
};

function normalizeLogEntry(raw: Record<string, unknown>, isRealtime = false): LogEntry {
  const action = String(raw.action || raw.event || "unknown");
  const level: LogLevel = ACTION_TO_LEVEL[action] || "INFO";
  const category: LogCategory = ACTION_TO_CATEGORY[action] || "system";
  const user = raw.user as { fullName?: string; role?: string } | undefined;

  return {
    id: String(raw._id || raw.id || `${Date.now()}-${Math.random()}`),
    level,
    category,
    action,
    userId: String(raw.userId || raw.user || ""),
    userName: user?.fullName || String(raw.userName || ""),
    userRole: user?.role || String(raw.userRole || ""),
    message: String(raw.description || raw.message || action.replace(/_/g, " ")),
    metadata: (raw.metadata as Record<string, unknown>) || {},
    timestamp: String(raw.timestamp || raw.createdAt || new Date().toISOString()),
    isRealtime,
  };
}

function formatTime(ts: string) {
  return new Date(ts).toLocaleTimeString("en-NP", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function downloadCSV(logs: LogEntry[]) {
  const header = "Timestamp,Level,Category,Action,User,Role,Message";
  const rows = logs.map((l) =>
    [l.timestamp, l.level, l.category, l.action, l.userName, l.userRole, `"${l.message}"`].join(",")
  );
  const csv = [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url; a.download = `careconnect-logs-${Date.now()}.csv`;
  a.click(); URL.revokeObjectURL(url);
}

// ── LogRow ─────────────────────────────────────────────────────────────────

function LogRow({ log, expand }: { log: LogEntry; expand: boolean }) {
  const cfg = LEVEL_CONFIG[log.level];
  const catCls = CATEGORY_COLORS[log.category] || "bg-slate-100 text-slate-600";

  return (
    <motion.div
      layout
      initial={log.isRealtime ? { opacity: 0, x: -8, backgroundColor: "#fffbeb" } : { opacity: 1 }}
      animate={{ opacity: 1, x: 0, backgroundColor: "#ffffff" }}
      transition={{ duration: 0.4 }}
      className={`border-b border-slate-100 last:border-0 ${log.isRealtime ? "ring-1 ring-amber-200/60" : ""}`}
    >
      <div className="flex items-start gap-3 px-4 py-3">
        {/* Level dot */}
        <span className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${cfg.dot}`} />

        {/* Timestamp */}
        <span className="text-xs text-slate-400 font-mono shrink-0 mt-0.5 w-20">
          {formatTime(log.timestamp)}
        </span>

        {/* Level badge */}
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5 shrink-0 ${cfg.bg} ${cfg.text}`}>
          {cfg.icon} {log.level}
        </span>

        {/* Category */}
        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 ${catCls}`}>
          {log.category}
        </span>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-slate-900">{log.message}</span>
            {log.isRealtime && (
              <span className="text-[9px] font-bold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded-full">LIVE</span>
            )}
          </div>
          {log.userName && (
            <p className="text-xs text-slate-500 mt-0.5">
              {log.userName} {log.userRole && <span className="text-slate-400">· {log.userRole}</span>}
            </p>
          )}
          {expand && log.metadata && Object.keys(log.metadata).length > 0 && (
            <pre className="mt-2 text-xs bg-slate-50 rounded-lg p-2 overflow-x-auto text-slate-600 border border-slate-100">
              {JSON.stringify(log.metadata, null, 2)}
            </pre>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

const CATEGORIES: Array<LogCategory | "all"> = ["all", "auth", "booking", "payment", "review", "note", "message", "call", "system", "admin"];
const LEVELS: Array<LogLevel | "all"> = ["all", "INFO", "WARN", "ERROR", "DEBUG"];
const MAX_LIVE_LOGS = 500;

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [paused, setPaused] = useState(false);
  const [expandAll, setExpandAll] = useState(false);
  const [filterCat, setFilterCat] = useState<LogCategory | "all">("all");
  const [filterLevel, setFilterLevel] = useState<LogLevel | "all">("all");
  const [search, setSearch] = useState("");
  const [liveCount, setLiveCount] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(false);
  const { on, connected } = useSocket();

  pausedRef.current = paused;

  // ── Fetch historical logs ──
  const loadHistorical = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminService.getActivityTimeline({ limit: 100 });
      const historical = (res.activities || []).map((r) =>
        normalizeLogEntry(r as unknown as Record<string, unknown>, false)
      );
      setLogs(historical);
    } catch { /* fallback gracefully */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadHistorical(); }, [loadHistorical]);

  // ── Real-time socket subscription ──
  useEffect(() => {
    on("admin:log", (raw) => {
      if (pausedRef.current) return;
      const entry = normalizeLogEntry(raw as Record<string, unknown>, true);
      setLogs((prev) => {
        const next = [entry, ...prev].slice(0, MAX_LIVE_LOGS);
        return next;
      });
      setLiveCount((c) => c + 1);
      // Auto-scroll to top (newest)
      setTimeout(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = 0;
      }, 50);
    });

    // Also listen for specific event types
    const events = ["admin:new_review", "booking:confirmed", "booking:active", "booking:cancelled", "wallet_update"];
    events.forEach((ev) => {
      on(ev, (raw) => {
        if (pausedRef.current) return;
        const entry = normalizeLogEntry(
          { ...(raw as Record<string, unknown>), action: ev.replace("admin:", "").replace(":", "_"), event: ev },
          true
        );
        setLogs((prev) => [entry, ...prev].slice(0, MAX_LIVE_LOGS));
        setLiveCount((c) => c + 1);
      });
    });
  }, [on]);

  // ── Filtered logs ──
  const filtered = logs.filter((l) => {
    if (filterCat !== "all" && l.category !== filterCat) return false;
    if (filterLevel !== "all" && l.level !== filterLevel) return false;
    if (search && !l.message.toLowerCase().includes(search.toLowerCase()) &&
        !l.action.toLowerCase().includes(search.toLowerCase()) &&
        !(l.userName ?? "").toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // ── Stats ──
  const errorCount = logs.filter((l) => l.level === "ERROR").length;
  const warnCount  = logs.filter((l) => l.level === "WARN").length;

  return (
    <AdminLayout>
      <div className="flex flex-col h-full max-h-[calc(100vh-80px)]">
        {/* Header */}
        <div className="shrink-0 bg-white border-b border-slate-200 px-6 py-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-slate-800 to-slate-600 flex items-center justify-center">
                <Activity className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Live Logs</h1>
                <p className="text-xs text-slate-500">Real-time system event stream</p>
              </div>
            </div>

            {/* Status badges */}
            <div className="flex items-center gap-3 flex-wrap">
              <span className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full ${
                connected ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
              }`}>
                {connected ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
                {connected ? "Live" : "Disconnected"}
              </span>
              {liveCount > 0 && (
                <span className="flex items-center gap-1 text-xs bg-amber-50 text-amber-700 px-3 py-1.5 rounded-full font-medium">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                  {liveCount} new
                </span>
              )}
              {errorCount > 0 && (
                <span className="text-xs bg-rose-50 text-rose-700 px-3 py-1.5 rounded-full font-medium">
                  {errorCount} errors
                </span>
              )}
              {warnCount > 0 && (
                <span className="text-xs bg-amber-50 text-amber-700 px-3 py-1.5 rounded-full font-medium">
                  {warnCount} warnings
                </span>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPaused((p) => !p)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                  paused
                    ? "border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {paused ? <><Play className="w-3.5 h-3.5" />Resume</> : <><Pause className="w-3.5 h-3.5" />Pause</>}
              </button>
              <button
                onClick={() => { setLogs([]); setLiveCount(0); }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />Clear
              </button>
              <button
                onClick={loadHistorical}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-all"
              >
                <RefreshCw className="w-3.5 h-3.5" />Refresh
              </button>
              <button
                onClick={() => downloadCSV(filtered)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-slate-900 text-white hover:bg-slate-700 transition-all"
              >
                <Download className="w-3.5 h-3.5" />Export CSV
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="mt-4 flex items-center gap-3 flex-wrap">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />

            {/* Search */}
            <input
              type="text"
              placeholder="Search logs…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-400 w-48"
            />

            {/* Category */}
            <select
              value={filterCat}
              onChange={(e) => setFilterCat(e.target.value as LogCategory | "all")}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-400 bg-white"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c === "all" ? "All Categories" : c}</option>
              ))}
            </select>

            {/* Level */}
            <select
              value={filterLevel}
              onChange={(e) => setFilterLevel(e.target.value as LogLevel | "all")}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-400 bg-white"
            >
              {LEVELS.map((l) => (
                <option key={l} value={l}>{l === "all" ? "All Levels" : l}</option>
              ))}
            </select>

            <button
              onClick={() => setExpandAll((e) => !e)}
              className="text-xs text-slate-500 hover:text-slate-700 underline ml-auto"
            >
              {expandAll ? "Collapse metadata" : "Expand metadata"}
            </button>

            <span className="text-xs text-slate-400 ml-2">{filtered.length} entries</span>
          </div>
        </div>

        {/* Log stream */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto bg-white"
        >
          {loading ? (
            <div className="flex items-center justify-center py-20 text-slate-400">
              <RefreshCw className="w-5 h-5 animate-spin mr-2" />Loading logs…
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <Activity className="w-10 h-10 mb-3 text-slate-200" />
              <p className="text-sm">No log entries{search || filterCat !== "all" || filterLevel !== "all" ? " matching filters" : ""}.</p>
              {connected && <p className="text-xs mt-1">Listening for new events…</p>}
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {filtered.map((log) => (
                <LogRow key={log.id} log={log} expand={expandAll} />
              ))}
            </AnimatePresence>
          )}
        </div>

        {/* Footer status */}
        {paused && (
          <div className="shrink-0 bg-amber-50 border-t border-amber-200 px-6 py-2 flex items-center gap-2 text-xs text-amber-700 font-medium">
            <Pause className="w-3.5 h-3.5" />
            Stream paused — new events are not displayed but are still recorded server-side.
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
