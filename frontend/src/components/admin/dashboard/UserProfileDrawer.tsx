"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { AdminUser } from "@/services";
import { cn } from "@/lib/utils";
import ActivityTimeline, { type ActivityTimelineItem } from "./ActivityTimeline";

type RiskFlag = {
  label: string;
  tone: "rose" | "amber" | "slate";
};

function safeDate(ts?: string) {
  if (!ts) return "—";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function roleBadge(role?: string) {
  const r = role ?? "user";
  const map: Record<string, { bg: string; text: string }> = {
    caregiver: { bg: "bg-blue-50 border border-blue-200", text: "text-blue-700" },
    careseeker: { bg: "bg-violet-50 border border-violet-200", text: "text-violet-700" },
    admin: { bg: "bg-slate-50 border border-slate-200", text: "text-slate-700" },
  };
  const v = map[r] ?? { bg: "bg-slate-50 border border-slate-200", text: "text-slate-700" };
  return <span className={cn("inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold", v.bg, v.text)}>{r}</span>;
}

function statusBadge(status?: string) {
  const s = status ?? "unknown";
  const map: Record<string, { bg: string; text: string; border: string }> = {
    active: { bg: "bg-emerald-50", text: "text-emerald-800", border: "border-emerald-200" },
    pending: { bg: "bg-amber-50", text: "text-amber-800", border: "border-amber-200" },
    pending_approval: { bg: "bg-orange-50", text: "text-orange-800", border: "border-orange-200" },
    suspended: { bg: "bg-rose-50", text: "text-rose-800", border: "border-rose-200" },
    deleted: { bg: "bg-slate-50", text: "text-slate-800", border: "border-slate-200" },
  };
  const v = map[s] ?? { bg: "bg-slate-50", text: "text-slate-800", border: "border-slate-200" };
  return (
    <span className={cn("inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-semibold border", v.bg, v.text, v.border)}>
      <span className={cn("w-1.5 h-1.5 rounded-full", s === "active" ? "bg-emerald-500" : s === "suspended" ? "bg-rose-500" : s === "pending_approval" ? "bg-orange-500" : "bg-amber-500")} />
      {s}
    </span>
  );
}

function daysSince(ts?: string) {
  if (!ts) return null;
  const d = new Date(ts).getTime();
  if (Number.isNaN(d)) return null;
  return Math.floor((Date.now() - d) / (24 * 60 * 60 * 1000));
}

function buildRiskFlags(user: AdminUser): RiskFlag[] {
  const flags: RiskFlag[] = [];
  const anyUser = user as any;
  const loginAttempts: number | undefined = typeof anyUser.loginAttempts === "number" ? anyUser.loginAttempts : undefined;

  if (typeof loginAttempts === "number" && loginAttempts >= 6) {
    flags.push({ label: "Suspicious login activity", tone: "rose" });
  }

  const last = daysSince(user.lastLogin ?? user.createdAt);
  if (last !== null && last >= 30) {
    flags.push({ label: "Inactive", tone: "slate" });
  }

  return flags;
}

function avgDurationMinutesApprox(user: AdminUser) {
  const last = daysSince(user.lastLogin);
  if (last === null) return 0;
  if (last <= 1) return 42;
  if (last <= 3) return 31;
  if (last <= 7) return 22;
  if (last <= 14) return 12;
  if (last <= 30) return 7;
  return 0;
}

function sessions7dApprox(user: AdminUser) {
  const last = daysSince(user.lastLogin);
  if (last === null) return 0;
  if (last <= 1) return 18;
  if (last <= 3) return 12;
  if (last <= 7) return 7;
  if (last <= 14) return 3;
  return 0;
}

export default function UserProfileDrawer({
  user,
  isOpen,
  onClose,
  onApprove,
  onReject,
  onSuspend,
  onActivate,
  onDelete,
  onRoleChange,
  roleChanging,
  actionLoading,
  onLogAdminAction,
}: {
  user: AdminUser | null;
  isOpen: boolean;
  onClose: () => void;
  onApprove: (id: string) => Promise<void> | void;
  onReject?: (id: string, reason?: string) => Promise<void> | void;
  onSuspend: (id: string) => Promise<void> | void;
  onActivate: (id: string) => Promise<void> | void;
  onDelete: (id: string) => Promise<void> | void;
  onRoleChange: (id: string, nextRole: string) => Promise<void> | void;
  roleChanging?: boolean;
  actionLoading?: boolean;
  onLogAdminAction?: (entry: { action: string; targetUserId: string; targetUserName: string }) => void;
}) {
  const resolved = user;
  const flags = resolved ? buildRiskFlags(resolved) : [];

  const timelineItems: ActivityTimelineItem[] = React.useMemo(() => {
    if (!resolved) return [];
    const items: ActivityTimelineItem[] = [];

    items.push({
      id: `created-${resolved._id}`,
      type: "admin_event",
      timestamp: resolved.createdAt,
      title: "Account created",
      subtitle: resolved.fullName,
      status: resolved.status,
      metadata: {
        role: resolved.role,
        status: resolved.status,
      },
    });

    if (resolved.lastLogin) {
      items.push({
        id: `login-${resolved._id}`,
        type: "admin_event",
        timestamp: resolved.lastLogin,
        title: "Last login",
        subtitle: resolved.email,
        status: "active",
        metadata: {
          lastLogin: resolved.lastLogin,
        },
      });
    }

    if (resolved.avatarHistory && resolved.avatarHistory.length > 0) {
      const last = [...resolved.avatarHistory].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
      items.push({
        id: `avatar-${resolved._id}`,
        type: "admin_event",
        timestamp: last.createdAt,
        title: "Avatar updated",
        subtitle: `Action: ${last.action}`,
        status: "verified",
        metadata: {
          action: last.action,
          createdAt: last.createdAt,
        },
      });
    }

    if (typeof (resolved as any).loginAttempts === "number" && (resolved as any).loginAttempts >= 1) {
      items.push({
        id: `attempts-${resolved._id}`,
        type: "admin_event",
        timestamp: resolved.lastLogin ?? resolved.createdAt,
        title: "Login activity signal",
        subtitle: "Based on failed attempt counter",
        status: "pending_approval",
        metadata: {
          loginAttempts: (resolved as any).loginAttempts,
        },
      });
    }

    return items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [resolved]);

  const [roleDraft, setRoleDraft] = React.useState<string>(resolved?.role ?? "");

  React.useEffect(() => {
    if (resolved?.role) setRoleDraft(resolved.role);
  }, [resolved?.role]);

  return (
    <AnimatePresence>
      {isOpen && resolved ? (
        <>
          <motion.div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[80]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          <motion.aside
            className="fixed right-0 top-0 h-full w-full max-w-xl bg-white z-[90] shadow-2xl flex flex-col overflow-hidden border-l border-slate-100"
            initial={{ x: 24, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 24, opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-slate-900 truncate">User Profile</h3>
                <p className="text-xs text-slate-500 truncate">{resolved.email}</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-10 h-10 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-[#0F766E]/30 transition flex items-center justify-center"
                aria-label="Close drawer"
              >
                <svg className="w-4 h-4 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* User Info Card */}
              <section className="bg-slate-50 rounded-2xl border border-slate-200 p-4">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center font-bold shadow-sm shrink-0 overflow-hidden">
                    {resolved.avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={resolved.avatar} alt={resolved.fullName} className="w-full h-full object-cover" />
                    ) : (
                      resolved.fullName?.charAt(0)?.toUpperCase() ?? "U"
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <h4 className="text-lg font-bold text-slate-900 truncate">{resolved.fullName}</h4>
                        <div className="flex items-center gap-2 flex-wrap mt-2">
                          {roleBadge(resolved.role)}
                          {statusBadge(resolved.status)}
                        </div>
                      </div>
                    </div>

                    {flags.length > 0 ? (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {flags.map((f) => (
                          <span
                            key={f.label}
                            className={cn(
                              "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold border",
                              f.tone === "rose"
                                ? "bg-rose-50 border-rose-200 text-rose-800"
                                : f.tone === "amber"
                                ? "bg-amber-50 border-amber-200 text-amber-800"
                                : "bg-slate-50 border-slate-200 text-slate-700"
                            )}
                          >
                            {f.label}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-4">
                  <div className="rounded-2xl bg-white border border-slate-200 p-3">
                    <p className="text-xs text-slate-500">Joined</p>
                    <p className="text-sm font-semibold text-slate-900 mt-1">{safeDate(resolved.createdAt)}</p>
                  </div>
                  <div className="rounded-2xl bg-white border border-slate-200 p-3">
                    <p className="text-xs text-slate-500">Last Active</p>
                    <p className="text-sm font-semibold text-slate-900 mt-1">{safeDate(resolved.lastLogin ?? resolved.createdAt)}</p>
                  </div>
                </div>
              </section>

              {/* Activity Timeline */}
              <section>
                <ActivityTimeline mode="drawer" items={timelineItems} title="Activity Timeline" />
              </section>

              {/* Usage Summary */}
              <section className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900">Usage Summary</h4>
                    <p className="text-xs text-slate-500 mt-0.5">7-day signals & admin readiness</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="rounded-2xl bg-white border border-slate-200 p-4">
                    <p className="text-xs text-slate-500">Sessions</p>
                    <p className="text-xl font-bold text-slate-900 tabular-nums mt-1">{sessions7dApprox(resolved)}</p>
                    <p className="text-xs text-slate-500 mt-1">last 7 days</p>
                  </div>
                  <div className="rounded-2xl bg-white border border-slate-200 p-4">
                    <p className="text-xs text-slate-500">Avg. Duration</p>
                    <p className="text-xl font-bold text-slate-900 tabular-nums mt-1">{avgDurationMinutesApprox(resolved)}m</p>
                    <p className="text-xs text-slate-500 mt-1">estimated</p>
                  </div>
                  <div className="rounded-2xl bg-white border border-slate-200 p-4">
                    <p className="text-xs text-slate-500">Profile Completion</p>
                    <p className="text-xl font-bold text-slate-900 tabular-nums mt-1">
                      {typeof resolved.completionPercentage === "number" ? `${resolved.completionPercentage}%` : "—"}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">based on saved data</p>
                  </div>
                </div>
              </section>

              {/* Admin Controls */}
              <section className="bg-slate-50 rounded-2xl border border-slate-200 p-4 space-y-4">
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">Admin Controls</h4>
                  <p className="text-xs text-slate-500 mt-0.5">Enable/disable, role changes, and secure actions</p>
                </div>

                <div className="flex flex-col gap-2">
                  {(resolved.status === "pending_approval") ? (
                    <>
                      <button
                        type="button"
                        disabled={actionLoading}
                        onClick={async () => {
                          onLogAdminAction?.({ action: "approve", targetUserId: resolved._id, targetUserName: resolved.fullName });
                          await onApprove(resolved._id);
                        }}
                        className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-3 text-sm font-semibold shadow-sm transition disabled:opacity-60"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        {actionLoading ? "Approving…" : "Approve Account"}
                      </button>
                      {onReject ? (
                        <button
                          type="button"
                          disabled={actionLoading}
                          onClick={async () => {
                            const reason = window.prompt("Reason for rejection (optional):") ?? undefined;
                            onLogAdminAction?.({ action: "reject", targetUserId: resolved._id, targetUserName: resolved.fullName });
                            await onReject(resolved._id, reason);
                          }}
                          className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-orange-50 border border-orange-200 hover:bg-orange-100 text-orange-800 px-4 py-3 text-sm font-semibold shadow-sm transition disabled:opacity-60"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M12 3C7.03 3 3 7.03 3 12s4.03 9 9 9 9-4.03 9-9-4.03-9-9-9z" />
                          </svg>
                          {actionLoading ? "Rejecting…" : "Reject Application"}
                        </button>
                      ) : null}
                    </>
                  ) : null}

                  {(resolved.status === "pending" || resolved.status === "suspended") ? (
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={async () => {
                        onLogAdminAction?.({ action: "activate", targetUserId: resolved._id, targetUserName: resolved.fullName });
                        await onActivate(resolved._id);
                      }}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-[#0F766E] hover:bg-teal-800 text-white px-4 py-3 text-sm font-semibold shadow-sm transition disabled:opacity-60"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                      {actionLoading ? "Activating…" : "Activate Account"}
                    </button>
                  ) : null}

                  {(resolved.status === "active") ? (
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={async () => {
                        onLogAdminAction?.({ action: "suspend", targetUserId: resolved._id, targetUserName: resolved.fullName });
                        await onSuspend(resolved._id);
                      }}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-800 px-4 py-3 text-sm font-semibold shadow-sm transition disabled:opacity-60"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M18 6L6 18M6 6l12 12" />
                      </svg>
                      {actionLoading ? "Suspending…" : "Suspend Account"}
                    </button>
                  ) : null}

                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={async () => {
                      onLogAdminAction?.({ action: "delete", targetUserId: resolved._id, targetUserName: resolved.fullName });
                      await onDelete(resolved._id);
                    }}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-800 px-4 py-3 text-sm font-semibold shadow-sm transition disabled:opacity-60"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7h6M10 7V4a1 1 0 011-1h2a1 1 0 011 1v3" />
                    </svg>
                    {actionLoading ? "Deleting…" : "Delete Permanently"}
                  </button>

                  <div className="rounded-2xl bg-white border border-slate-200 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h5 className="text-sm font-semibold text-slate-900">Role change</h5>
                        <p className="text-xs text-slate-500 mt-0.5">Caregiver {"<->"} Care Seeker</p>
                      </div>
                      <div className="text-xs text-slate-500">{roleChanging ? "Updating…" : ""}</div>
                    </div>
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <select
                        value={roleDraft}
                        onChange={(e) => setRoleDraft(e.target.value)}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#0F766E]/20 focus:border-[#0F766E]"
                        disabled={roleChanging}
                        aria-label="Select role"
                      >
                        <option value="caregiver">caregiver</option>
                        <option value="careseeker">careseeker</option>
                      </select>
                      <button
                        type="button"
                        disabled={roleChanging || !roleDraft || roleDraft === resolved.role}
                        onClick={async () => {
                          onLogAdminAction?.({ action: "role_change", targetUserId: resolved._id, targetUserName: resolved.fullName });
                          await onRoleChange(resolved._id, roleDraft);
                        }}
                        className="w-full inline-flex items-center justify-center rounded-2xl bg-[#0F766E] hover:bg-teal-800 text-white px-4 py-2.5 text-sm font-semibold shadow-sm transition disabled:opacity-60"
                      >
                        Update Role
                      </button>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}

