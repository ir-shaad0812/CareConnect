"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { AdminUser } from "@/services";
import FiltersBar, { type UserTableFilters } from "./FiltersBar";

type Pagination = {
  page: number;
  limit: number;
  total: number;
  pages: number;
};

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const t = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

function daysAgo(iso?: string) {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  const now = Date.now();
  return Math.floor((now - t) / (24 * 60 * 60 * 1000));
}

function formatLastActive(user: AdminUser) {
  const ts = user.lastLogin ?? user.createdAt;
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function statusBadge(status?: string) {
  const s = status ?? "unknown";
  const base = "inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-semibold border";
  const dot = (cls: string) => <span className={cn("w-1.5 h-1.5 rounded-full", cls)} aria-hidden="true" />;

  if (s === "active") return <span className={cn(base, "bg-emerald-50 border-emerald-200 text-emerald-800")}>{dot("bg-emerald-500")}Active</span>;
  if (s === "pending" || s === "pending_email") return <span className={cn(base, "bg-amber-50 border-amber-200 text-amber-800")}>{dot("bg-amber-500")}Pending</span>;
  if (s === "pending_approval") return <span className={cn(base, "bg-orange-50 border-orange-200 text-orange-800")}>{dot("bg-orange-500")}Pending Approval</span>;
  if (s === "suspended") return <span className={cn(base, "bg-rose-50 border-rose-200 text-rose-800")}>{dot("bg-rose-500")}Suspended</span>;
  if (s === "deleted") return <span className={cn(base, "bg-slate-50 border-slate-200 text-slate-800")}>{dot("bg-slate-500")}Deleted</span>;
  return <span className={cn(base, "bg-slate-50 border-slate-200 text-slate-800")}>{dot("bg-slate-500")}{s}</span>;
}

function approxSessions7d(user: AdminUser) {
  const d = daysAgo(user.lastLogin);
  if (d === null) return 0;
  if (d <= 1) return 18;
  if (d <= 3) return 12;
  if (d <= 7) return 7;
  if (d <= 14) return 3;
  return 0;
}

type AdminUserWithLoginAttempts = AdminUser & { loginAttempts?: number };

function getLoginAttempts(user: AdminUser): number | undefined {
  const candidate = user as AdminUserWithLoginAttempts;
  return typeof candidate.loginAttempts === "number" ? candidate.loginAttempts : undefined;
}

function suspiciousFlags(user: AdminUser) {
  // loginAttempts is select-false in backend schema; we include it in admin queries when needed.
  const loginAttempts = getLoginAttempts(user);
  const flags: string[] = [];
  if (typeof loginAttempts === "number" && loginAttempts >= 6) flags.push("Rapid login attempts");
  const last = user.lastLogin ? daysAgo(user.lastLogin) : null;
  if (last !== null && last >= 45) flags.push("Recently inactive");
  return flags;
}

export default function UserTable({
  users,
  pagination,
  loading,
  onFetchUsers,
  onSelectUser,
  onApproveUser,
  onRejectUser,
  onSuspendUser,
  onActivateUser,
  actionLoadingUserId,
  initialFilters,
  refreshToken,
}: {
  users: AdminUser[];
  pagination: Pagination;
  loading: boolean;
  onFetchUsers: (params: { page: number; filters: UserTableFilters }) => Promise<void> | void;
  onSelectUser: (user: AdminUser) => void;
  onApproveUser?: (userId: string) => Promise<void> | void;
  onRejectUser?: (userId: string, reason?: string) => Promise<void> | void;
  onSuspendUser?: (userId: string) => Promise<void> | void;
  onActivateUser?: (userId: string) => Promise<void> | void;
  actionLoadingUserId?: string | null;
  initialFilters?: Partial<UserTableFilters>;
  refreshToken?: number;
}) {
  const [filters, setFilters] = React.useState<UserTableFilters>({
    search: "",
    dateRange: "30d",
    activityType: "all",
    status: "all",
    ...(initialFilters ?? {}),
  });

  const [page, setPage] = React.useState(pagination.page);

  React.useEffect(() => setPage(pagination.page), [pagination.page]);

  const debouncedSearch = useDebouncedValue(filters.search, 450);

  React.useEffect(() => {
    setPage(1);
  }, [filters.dateRange, filters.activityType, filters.status]);

  React.useEffect(() => {
    void onFetchUsers({
      page: page,
      filters: { ...filters, search: debouncedSearch },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, debouncedSearch, filters.dateRange, filters.activityType, filters.status, refreshToken]);

  const activeUsersRank = React.useMemo(() => {
    const ranked = [...users]
      .map((u) => ({ id: u._id, user: u, last: u.lastLogin ?? u.createdAt }))
      .sort((a, b) => new Date(b.last).getTime() - new Date(a.last).getTime());
    return new Set(ranked.slice(0, 3).map((r) => r.id));
  }, [users]);

  const totalPages = Math.max(1, pagination.pages);

  const pageWindow = React.useMemo(() => {
    const windowSize = 5;
    const start = Math.max(1, pagination.page - Math.floor(windowSize / 2));
    const end = Math.min(totalPages, start + windowSize - 1);
    const adjustedStart = Math.max(1, end - windowSize + 1);

    return Array.from(
      { length: end - adjustedStart + 1 },
      (_, i) => adjustedStart + i,
    );
  }, [pagination.page, totalPages]);

  const renderActionButtons = (u: AdminUser, compact = false) => (
    <div
      className={cn(
        "flex items-center gap-2",
        compact ? "flex-wrap justify-end" : "justify-end whitespace-nowrap",
      )}
    >
      {onApproveUser && u.status === "pending_approval" ? (
        <button
          type="button"
          onClick={() => onApproveUser(u._id)}
          disabled={actionLoadingUserId === u._id}
          className="px-3 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition disabled:opacity-60"
        >
          Approve
        </button>
      ) : null}

      {onRejectUser && u.status === "pending_approval" ? (
        <button
          type="button"
          onClick={() => onRejectUser(u._id)}
          disabled={actionLoadingUserId === u._id}
          className="px-3 py-2 rounded-2xl bg-orange-50 border border-orange-200 hover:bg-orange-100 text-orange-800 text-xs font-semibold transition disabled:opacity-60"
        >
          Reject
        </button>
      ) : null}

      {onActivateUser && (u.status === "suspended" || u.status === "pending") ? (
        <button
          type="button"
          onClick={() => onActivateUser(u._id)}
          disabled={actionLoadingUserId === u._id}
          className="px-3 py-2 rounded-2xl bg-[#0F766E] hover:bg-teal-800 text-white text-xs font-semibold shadow-sm transition disabled:opacity-60"
        >
          Activate
        </button>
      ) : null}

      {onSuspendUser && u.status === "active" ? (
        <button
          type="button"
          onClick={() => onSuspendUser(u._id)}
          disabled={actionLoadingUserId === u._id}
          className="px-3 py-2 rounded-2xl bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-800 text-xs font-semibold transition disabled:opacity-60"
        >
          Suspend
        </button>
      ) : null}

      <button
        type="button"
        onClick={() => onSelectUser(u)}
        className={cn(
          "rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-[#0F766E]/30 transition flex items-center justify-center",
          compact ? "h-9 w-9" : "h-10 w-10",
        )}
        aria-label="View details"
      >
        <svg
          className="w-4 h-4 text-[#0F766E]"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m7-7H5" />
        </svg>
      </button>
    </div>
  );

  return (
    <div className="space-y-4">
      <FiltersBar
        filters={filters}
        onChange={(next) => setFilters(next)}
        onReset={() =>
          setFilters({
            search: "",
            dateRange: "30d",
            activityType: "all",
            status: "all",
          })
        }
      />

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-slate-900">Advanced User Table</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Search, filters, sticky header and server pagination
            </p>
          </div>
          <div className="text-xs text-slate-500 whitespace-nowrap">
            {pagination.total.toLocaleString()} users
          </div>
        </div>

        <div className="hidden lg:block max-h-[62vh] overflow-auto">
          <table className="w-full min-w-240 table-fixed border-separate border-spacing-0">
            <colgroup>
              <col className="w-[28%]" />
              <col className="w-[20%]" />
              <col className="w-[16%]" />
              <col className="w-[10%]" />
              <col className="w-[12%]" />
              <col className="w-[14%]" />
            </colgroup>
            <thead className="sticky top-0 z-10 bg-slate-50">
              <tr className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <th className="px-6 py-3 rounded-tl-2xl">User</th>
                <th className="px-6 py-3">Email</th>
                <th className="px-6 py-3">Last Active</th>
                <th className="px-6 py-3">Sessions</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 rounded-tr-2xl text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10">
                    <div className="flex items-center justify-center gap-3">
                      <div className="w-8 h-8 border-2 border-[#0F766E]/30 border-t-[#0F766E] rounded-full animate-spin" />
                      <p className="text-sm text-slate-500">Loading users…</p>
                    </div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10">
                    <div className="flex flex-col items-center justify-center gap-2 text-center">
                      <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center">
                        <svg className="w-6 h-6 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                      </div>
                      <p className="text-sm font-medium text-slate-700">No users match your filters</p>
                      <p className="text-xs text-slate-500">Try broadening date range or clearing search.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const d = daysAgo(u.lastLogin);
                  const inactive = d === null ? true : d >= 30;
                  const mostActive = activeUsersRank.has(u._id);
                  const sessions = approxSessions7d(u);
                  const flags = suspiciousFlags(u);
                  const showSuspicious = flags.length > 0 && typeof getLoginAttempts(u) === "number";

                  return (
                    <motion.tr key={u._id} whileHover={{ y: -1 }} className="group bg-white transition-colors">
                      <td className="px-6 py-4">
                        <button
                          type="button"
                          onClick={() => onSelectUser(u)}
                          className="flex items-center gap-3 text-left w-full"
                        >
                          <div className="w-10 h-10 rounded-2xl bg-linear-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center font-bold shrink-0 shadow-sm">
                            {u.avatar ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={u.avatar} alt={u.fullName} className="w-full h-full rounded-2xl object-cover" />
                            ) : (
                              <span>{u.fullName?.charAt(0)?.toUpperCase() ?? "U"}</span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 min-w-0">
                              <p className="text-sm font-semibold text-slate-900 truncate group-hover:text-[#0F766E] transition-colors">
                                {u.fullName}
                              </p>
                              {mostActive ? (
                                <span className="inline-flex items-center rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                                  Most active
                                </span>
                              ) : null}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="inline-flex items-center rounded-full bg-slate-50 border border-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-700 capitalize">
                                {u.role}
                              </span>
                              {inactive ? (
                                <span className="inline-flex items-center rounded-full bg-slate-50 border border-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                                  Inactive
                                </span>
                              ) : null}
                              {showSuspicious ? (
                                <span className="inline-flex items-center rounded-full bg-rose-50 border border-rose-200 px-2 py-0.5 text-[11px] font-semibold text-rose-800">
                                  Suspicious
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </button>
                      </td>

                      <td className="px-6 py-4">
                        <p className="text-sm text-slate-700 truncate">{u.email}</p>
                      </td>

                      <td className="px-6 py-4">
                        <p className="text-sm text-slate-700">{formatLastActive(u)}</p>
                        {d !== null && d <= 7 ? (
                          <p className="text-xs text-emerald-700 mt-1 font-semibold">Active recently</p>
                        ) : (
                          <p className="text-xs text-slate-500 mt-1">{d === null ? "—" : `${d}d ago`}</p>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-900 tabular-nums">{sessions}</span>
                          <span className="text-xs text-slate-500">/ 7d</span>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex flex-wrap items-center gap-2">
                          {statusBadge(u.status)}
                        </div>
                      </td>

                      <td className="px-6 py-4 text-right">
                        {renderActionButtons(u)}
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="lg:hidden divide-y divide-slate-100">
          {loading ? (
            <div className="p-6">
              <div className="flex items-center justify-center gap-3">
                <div className="w-8 h-8 border-2 border-[#0F766E]/30 border-t-[#0F766E] rounded-full animate-spin" />
                <p className="text-sm text-slate-500">Loading users…</p>
              </div>
            </div>
          ) : users.length === 0 ? (
            <div className="p-6">
              <div className="flex flex-col items-center justify-center gap-2 text-center">
                <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center">
                  <svg className="w-6 h-6 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-slate-700">No users match your filters</p>
                <p className="text-xs text-slate-500">Try broadening date range or clearing search.</p>
              </div>
            </div>
          ) : (
            users.map((u) => {
              const d = daysAgo(u.lastLogin);
              const inactive = d === null ? true : d >= 30;
              const mostActive = activeUsersRank.has(u._id);
              const sessions = approxSessions7d(u);
              const flags = suspiciousFlags(u);
              const showSuspicious =
                flags.length > 0 && typeof getLoginAttempts(u) === "number";

              return (
                <motion.article
                  key={u._id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 space-y-3"
                >
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      onClick={() => onSelectUser(u)}
                      className="min-w-0 flex-1 flex items-center gap-3 text-left"
                    >
                      <div className="w-10 h-10 rounded-2xl bg-linear-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center font-bold shrink-0 shadow-sm">
                        {u.avatar ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={u.avatar} alt={u.fullName} className="w-full h-full rounded-2xl object-cover" />
                        ) : (
                          <span>{u.fullName?.charAt(0)?.toUpperCase() ?? "U"}</span>
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-slate-900 truncate">{u.fullName}</p>
                          {mostActive ? (
                            <span className="inline-flex items-center rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                              Most active
                            </span>
                          ) : null}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <span className="inline-flex items-center rounded-full bg-slate-50 border border-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-700 capitalize">
                            {u.role}
                          </span>
                          {inactive ? (
                            <span className="inline-flex items-center rounded-full bg-slate-50 border border-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                              Inactive
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </button>

                    <div className="shrink-0">{statusBadge(u.status)}</div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2">
                      <p className="text-[11px] uppercase tracking-wide font-semibold text-slate-500">Email</p>
                      <p className="text-sm text-slate-700 truncate">{u.email}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2">
                      <p className="text-[11px] uppercase tracking-wide font-semibold text-slate-500">Last Active</p>
                      <p className="text-sm text-slate-700">{formatLastActive(u)}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2">
                      <p className="text-[11px] uppercase tracking-wide font-semibold text-slate-500">Sessions</p>
                      <p className="text-sm text-slate-700 tabular-nums">{sessions} / 7d</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2">
                      <p className="text-[11px] uppercase tracking-wide font-semibold text-slate-500">Activity</p>
                      <p className="text-sm text-slate-700">
                        {d !== null && d <= 7 ? "Active recently" : d === null ? "No recent data" : `${d}d ago`}
                      </p>
                    </div>
                  </div>

                  {showSuspicious ? (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2">
                      <p className="text-xs font-semibold text-rose-800">Suspicious signals</p>
                      <p className="text-xs text-rose-700 mt-0.5">{flags.join(" • ")}</p>
                    </div>
                  ) : null}

                  <div>{renderActionButtons(u, true)}</div>
                </motion.article>
              );
            })
          )}
        </div>

        <div className="px-4 sm:px-6 py-4 border-t border-slate-100 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs text-slate-500">
            {pagination.total === 0 ? (
              "0 results"
            ) : (
              <>
                Showing{" "}
                <span className="font-semibold text-slate-700">
                  {(pagination.page - 1) * pagination.limit + 1}
                </span>
                –{" "}
                <span className="font-semibold text-slate-700">
                  {Math.min(pagination.page * pagination.limit, pagination.total)}
                </span>{" "}
                of <span className="font-semibold text-slate-700">{pagination.total.toLocaleString()}</span>
              </>
            )}
          </div>

          <div className="w-full sm:w-auto flex items-center justify-between sm:justify-end gap-2">
            <button
              type="button"
              onClick={() => setPage(Math.max(1, pagination.page - 1))}
              disabled={pagination.page === 1 || loading}
              className="w-10 h-10 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center"
              aria-label="Previous page"
            >
              <svg className="w-4 h-4 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <div className="hidden sm:flex items-center gap-1">
              {pageWindow.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPage(p)}
                  className={cn(
                    "w-10 h-10 rounded-2xl border text-sm font-semibold transition",
                    p === pagination.page
                      ? "bg-[#0F766E] border-[#0F766E] text-white shadow-sm"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50",
                  )}
                  aria-label={`Page ${p}`}
                >
                  {p}
                </button>
              ))}
            </div>

            <div className="sm:hidden rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
              Page {pagination.page} / {totalPages}
            </div>

            <button
              type="button"
              onClick={() => setPage(Math.min(totalPages, pagination.page + 1))}
              disabled={pagination.page >= totalPages || loading}
              className="w-10 h-10 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center"
              aria-label="Next page"
            >
              <svg className="w-4 h-4 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

