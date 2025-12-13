"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export type ActivityTimelineItem = {
  id: string;
  type: string;
  timestamp: string; // ISO
  title: string;
  subtitle?: string;
  status?: string;
  metadata?: Record<string, unknown>;
};

export type ActivityExplorerFilters = {
  type: "all" | "user_registration" | "document_submission";
  status: "all" | string;
  range: "all" | "7d" | "30d" | "90d";
  q: string; // simple advanced text filter
};

function formatDate(ts: string) {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusPill(status?: string) {
  const s = status ?? "unknown";
  const base = "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border";

  if (s === "active" || s === "verified" || s === "completed" || s === "confirmed") {
    return <span className={cn(base, "bg-emerald-50 border-emerald-200 text-emerald-800")}>{s}</span>;
  }
  if (s === "pending" || s === "pending_approval") {
    return <span className={cn(base, "bg-amber-50 border-amber-200 text-amber-800")}>{s}</span>;
  }
  if (s === "suspended" || s === "rejected" || s === "cancelled" || s === "deleted") {
    return <span className={cn(base, "bg-rose-50 border-rose-200 text-rose-800")}>{s}</span>;
  }
  return <span className={cn(base, "bg-slate-50 border-slate-200 text-slate-800")}>{s}</span>;
}

function computeRange(range: ActivityExplorerFilters["range"]) {
  if (range === "all") return null;
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  const now = Date.now();
  const from = new Date(now - days * 24 * 60 * 60 * 1000).toISOString();
  return { fromIso: from };
}

function matchesFilters(item: ActivityTimelineItem, filters: ActivityExplorerFilters) {
  if (filters.type !== "all" && item.type !== filters.type) return false;
  if (filters.status !== "all" && item.status !== filters.status) return false;
  const r = computeRange(filters.range);
  if (r) {
    const t = new Date(item.timestamp).getTime();
    const f = new Date(r.fromIso).getTime();
    if (Number.isNaN(t) || Number.isNaN(f)) return false;
    if (t < f) return false;
  }
  const q = filters.q.trim().toLowerCase();
  if (!q) return true;
  const hay = `${item.title} ${item.subtitle ?? ""} ${item.status ?? ""}`.toLowerCase();
  return hay.includes(q);
}

export default function ActivityTimeline({
  mode,
  items,
  title,
  initialFilters,
  isLoadingMore = false,
  hasMore = false,
  onLoadMore,
  className,
}: {
  mode: "drawer" | "explorer";
  items: ActivityTimelineItem[];
  title?: string;
  initialFilters?: Partial<ActivityExplorerFilters>;
  isLoadingMore?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => Promise<void> | void;
  className?: string;
}) {
  const [filters, setFilters] = React.useState<ActivityExplorerFilters>({
    type: "all",
    status: "all",
    range: "7d",
    q: "",
    ...(initialFilters ?? {}),
  });

  const [expanded, setExpanded] = React.useState<Record<string, boolean>>({});
  const sentinelRef = React.useRef<HTMLDivElement | null>(null);

  const filteredItems = React.useMemo(() => {
    if (mode !== "explorer") return items;
    return items.filter((it) => matchesFilters(it, filters));
  }, [items, mode, filters]);

  React.useEffect(() => {
    if (mode !== "explorer") return;
    if (!onLoadMore) return;
    if (!hasMore) return;

    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first?.isIntersecting) {
          void onLoadMore();
        }
      },
      { root: null, rootMargin: "200px", threshold: 0.01 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [mode, onLoadMore, hasMore, isLoadingMore]);

  return (
    <section className={cn("space-y-4", className)}>
      {mode === "explorer" ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">{title ?? "Activity Logs Explorer"}</h2>
              <p className="text-sm text-slate-500 mt-0.5">Infinite scroll + expandable JSON metadata</p>
            </div>
            <div className="text-xs text-slate-500 whitespace-nowrap">
              {filteredItems.length} shown
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-slate-500 mb-1 block">Search</label>
              <input
                value={filters.q}
                onChange={(e) => setFilters((p) => ({ ...p, q: e.target.value }))}
                placeholder="Try: approval, document, verified…"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#0F766E]/20 focus:border-[#0F766E]"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">Type</label>
              <select
                value={filters.type}
                onChange={(e) => setFilters((p) => ({ ...p, type: e.target.value as ActivityExplorerFilters["type"] }))}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#0F766E]/20 focus:border-[#0F766E]"
              >
                <option value="all">All</option>
                <option value="user_registration">User registrations</option>
                <option value="document_submission">Document submissions</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value }))}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#0F766E]/20 focus:border-[#0F766E]"
              >
                <option value="all">All</option>
                <option value="active">active</option>
                <option value="pending">pending</option>
                <option value="pending_approval">pending_approval</option>
                <option value="suspended">suspended</option>
                <option value="verified">verified</option>
                <option value="rejected">rejected</option>
                <option value="deleted">deleted</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">Range</label>
              <select
                value={filters.range}
                onChange={(e) => setFilters((p) => ({ ...p, range: e.target.value as ActivityExplorerFilters["range"] }))}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#0F766E]/20 focus:border-[#0F766E]"
              >
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
                <option value="all">All time</option>
              </select>
            </div>
          </div>
        </div>
      ) : null}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-slate-900">
                {mode === "drawer" ? title ?? "Activity Timeline" : "Timeline"}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {mode === "drawer" ? "Recent activity & key account events" : "Newest first"}
              </p>
            </div>
            {mode === "drawer" ? (
              <div className="text-xs text-slate-500">{items.length} events</div>
            ) : null}
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          <AnimatePresence initial={false}>
            {filteredItems.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <p className="text-sm font-medium text-slate-700">No activity found</p>
                <p className="text-xs text-slate-500 mt-1">Adjust filters to see more.</p>
              </div>
            ) : (
              filteredItems.map((it) => {
                const isExpanded = Boolean(expanded[it.id]);
                const hasMetadata = Boolean(it.metadata && Object.keys(it.metadata).length > 0);

                return (
                  <motion.div
                    key={it.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    {...(mode === "explorer" ? { whileHover: { y: -1 } } : {})}
                    className="p-5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              "w-9 h-9 rounded-2xl flex items-center justify-center border border-slate-200 bg-slate-50 shrink-0",
                              it.type === "user_registration" ? "text-emerald-700" : "text-cyan-700"
                            )}
                            aria-hidden="true"
                          >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              {it.type === "user_registration" ? (
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                              ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8V4H8l4-4 4 4h-4v4zM20 12v8H4v-8" />
                              )}
                            </svg>
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-900 truncate">{it.title}</p>
                            {it.subtitle ? (
                              <p className="text-xs text-slate-500 truncate mt-0.5">{it.subtitle}</p>
                            ) : null}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-end gap-3 shrink-0">
                        {it.status ? statusPill(it.status) : null}
                        <div className="text-xs text-slate-500 whitespace-nowrap">{formatDate(it.timestamp)}</div>
                      </div>
                    </div>

                    {mode === "explorer" && hasMetadata ? (
                      <div className="mt-3">
                        <button
                          type="button"
                          onClick={() => setExpanded((p) => ({ ...p, [it.id]: !p[it.id] }))}
                          className={cn(
                            "inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700",
                            "hover:border-[#0F766E]/30 hover:text-[#0F766E] transition"
                          )}
                        >
                          <svg className={cn("w-3.5 h-3.5 transition-transform", isExpanded ? "rotate-180" : "")} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                          </svg>
                          {isExpanded ? "Hide details" : "Show details"}
                        </button>
                        <AnimatePresence initial={false}>
                          {isExpanded ? (
                            <motion.pre
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.18 }}
                              className="mt-3 p-4 rounded-2xl bg-slate-50 border border-slate-200 overflow-auto text-[11px] leading-relaxed text-slate-700"
                            >
                              {JSON.stringify(it.metadata, null, 2)}
                            </motion.pre>
                          ) : null}
                        </AnimatePresence>
                      </div>
                    ) : null}
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </div>

        {mode === "explorer" ? (
          <div className="px-6 py-4 border-t border-slate-100">
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs text-slate-500">
                {hasMore ? "Loading more when you scroll…" : "You’ve reached the end."}
              </div>
              <div className="text-xs text-slate-500">
                {isLoadingMore ? "Loading…" : null}
              </div>
            </div>
            <div ref={sentinelRef} />
          </div>
        ) : null}
      </div>
    </section>
  );
}

