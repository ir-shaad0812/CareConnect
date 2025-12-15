"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wifi, WifiOff } from "lucide-react";
import AdminLayout from "@/components/layout/AdminLayout";
import { adminService, authService, type AdminUser } from "@/services";
import { useSocket } from "@/hooks/useSocket";
import UserTable from "./UserTable";
import UserProfileDrawer from "./UserProfileDrawer";
import type { UserTableFilters } from "./FiltersBar";

type Pagination = { page: number; limit: number; total: number; pages: number };

type AuditLogEntry = {
  id: string;
  timestamp: string;
  adminName: string;
  action: "approve" | "activate" | "suspend" | "delete" | "role_change" | "reject";
  targetUserId: string;
  targetUserName: string;
  notes?: string;
};

type RealtimeStatusPayload = {
  userId: string;
  status: string;
  action: "approve" | "reject" | "suspend";
  reason?: string;
  user?: AdminUser;
};

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

function formatTS(ts: string) {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, { month: "short", day: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function adminDisplayName() {
  try {
    const u = authService.getCurrentUser();
    return u?.fullName ?? u?.email ?? "Admin";
  } catch {
    return "Admin";
  }
}

export default function AdminUsersPremium() {
  const [users, setUsers] = React.useState<AdminUser[]>([]);
  const [pagination, setPagination] = React.useState<Pagination>({ page: 1, limit: 20, total: 0, pages: 0 });
  const [loading, setLoading] = React.useState(true);

  const [selectedUser, setSelectedUser] = React.useState<AdminUser | null>(null);
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [actionLoadingUserId, setActionLoadingUserId] = React.useState<string | null>(null);
  const [roleChanging, setRoleChanging] = React.useState(false);
  const [refreshToken, setRefreshToken] = React.useState(0);

  const [toast, setToast] = React.useState<{ type: "success" | "error"; message: string } | null>(null);
  const toastTimer = React.useRef<number | null>(null);

  const [auditLogs, setAuditLogs] = React.useState<AuditLogEntry[]>([]);
  const [auditAction, setAuditAction] = React.useState<"all" | AuditLogEntry["action"]>("all");
  const [auditView, setAuditView] = React.useState<"timeline" | "table">("timeline");

  const adminName = React.useMemo(() => adminDisplayName(), []);

  // Real-time socket subscription for admin user status changes
  const { connected: socketConnected, on: socketOn } = useSocket();

  const showToast = React.useCallback((type: "success" | "error", message: string) => {
    setToast({ type, message });
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 3500);
  }, []);

  // Subscribe to real-time admin user status events from the server.
  // When another admin (or the same admin via the backend) changes a user's status,
  // update the local list immediately without waiting for a full refetch.
  React.useEffect(() => {
    socketOn("admin:user_status_changed", (raw) => {
      const payload = raw as RealtimeStatusPayload;
      if (!payload?.userId) return;

      setUsers((prev) =>
        prev.map((u) =>
          u._id === payload.userId
            ? { ...u, status: payload.status as AdminUser["status"], ...(payload.user ?? {}) }
            : u
        )
      );

      // Also refresh the open drawer if it's showing this user
      setSelectedUser((prev) =>
        prev && prev._id === payload.userId
          ? { ...prev, status: payload.status as AdminUser["status"], ...(payload.user ?? {}) }
          : prev
      );

      const actionLabels: Record<string, string> = {
        approve: "approved",
        reject: "rejected",
        suspend: "suspended",
      };
      const label = actionLabels[payload.action] ?? payload.action;
      showToast("success", `User ${label} (real-time update)`);
    });
  }, [socketOn, showToast]);

  const logAdminAction = React.useCallback((entry: { action: AuditLogEntry["action"]; targetUserId: string; targetUserName: string }) => {
    setAuditLogs((prev) => [
      {
        id: uid("audit"),
        timestamp: new Date().toISOString(),
        adminName,
        action: entry.action,
        targetUserId: entry.targetUserId,
        targetUserName: entry.targetUserName,
      },
      ...prev,
    ]);
  }, [adminName]);

  const fetchUsers = React.useCallback(
    async ({ page, filters }: { page: number; filters: UserTableFilters }) => {
      setLoading(true);
      try {
        const now = Date.now();
        const toIso = new Date(now).toISOString();

        const rangeMs =
          filters.dateRange === "7d"
            ? 7 * 24 * 60 * 60 * 1000
            : filters.dateRange === "30d"
            ? 30 * 24 * 60 * 60 * 1000
            : filters.dateRange === "90d"
            ? 90 * 24 * 60 * 60 * 1000
            : null;

        const fromIso = rangeMs ? new Date(now - rangeMs).toISOString() : undefined;

        const role =
          filters.activityType === "caregiver" ? "caregiver" : filters.activityType === "careseeker" ? "careseeker" : undefined;

        const data = await adminService.getUsers({
          page,
          limit: pagination.limit,
          role,
          status: filters.status === "all" ? undefined : filters.status,
          search: filters.search || undefined,
          sortBy: "lastLogin",
          sortOrder: "desc",
          // backend supports lastLogin filtering
          lastActiveFrom: fromIso,
          lastActiveTo: fromIso ? toIso : undefined,
        } as any);

        setUsers(data.users);
        setPagination(data.pagination as Pagination);
      } catch (e: any) {
        const msg = typeof e?.message === "string" ? e.message : "Failed to load users";
        showToast("error", msg);
      } finally {
        setLoading(false);
      }
    },
    [pagination.limit, showToast]
  );

  const approveUserApi = React.useCallback(
    async (id: string) => {
      setActionLoadingUserId(id);
      try {
        await adminService.approveUser(id);
        showToast("success", "User approved");
      } finally {
        setActionLoadingUserId(null);
        setRefreshToken((t) => t + 1);
      }
    },
    [showToast]
  );

  const activateUserApi = React.useCallback(
    async (id: string) => {
      setActionLoadingUserId(id);
      try {
        await adminService.updateUserStatus(id, "active");
        showToast("success", "User activated");
      } finally {
        setActionLoadingUserId(null);
        setRefreshToken((t) => t + 1);
      }
    },
    [showToast]
  );

  const suspendUserApi = React.useCallback(
    async (id: string) => {
      setActionLoadingUserId(id);
      try {
        await adminService.suspendUser(id, "Suspended by admin");
        showToast("success", "User suspended");
      } finally {
        setActionLoadingUserId(null);
        setRefreshToken((t) => t + 1);
      }
    },
    [showToast]
  );

  const rejectUserApi = React.useCallback(
    async (id: string, reason?: string) => {
      setActionLoadingUserId(id);
      try {
        await adminService.rejectUser(id, reason);
        showToast("success", "User rejected");
      } catch (e: any) {
        showToast("error", e?.message ?? "Failed to reject user");
      } finally {
        setActionLoadingUserId(null);
        setRefreshToken((t) => t + 1);
      }
    },
    [showToast]
  );

  const deleteUserApi = React.useCallback(
    async (id: string) => {
      setActionLoadingUserId(id);
      try {
        await adminService.deleteUser(id);
        showToast("success", "User deleted");
      } finally {
        setActionLoadingUserId(null);
        setRefreshToken((t) => t + 1);
      }
    },
    [showToast]
  );

  const roleChangeApi = React.useCallback(
    async (id: string, nextRole: string) => {
      setRoleChanging(true);
      setActionLoadingUserId(id);
      try {
        await adminService.updateUserRole(id, nextRole);
        showToast("success", "Role updated");
      } finally {
        setRoleChanging(false);
        setActionLoadingUserId(null);
        setRefreshToken((t) => t + 1);
      }
    },
    [showToast]
  );

  const approveFromTable = React.useCallback(
    async (id: string) => {
      logAdminAction({
        action: "approve",
        targetUserId: id,
        targetUserName: users.find((u) => u._id === id)?.fullName ?? "User",
      });
      await approveUserApi(id);
    },
    [approveUserApi, logAdminAction, users]
  );

  const activateFromTable = React.useCallback(
    async (id: string) => {
      logAdminAction({
        action: "activate",
        targetUserId: id,
        targetUserName: users.find((u) => u._id === id)?.fullName ?? "User",
      });
      await activateUserApi(id);
    },
    [activateUserApi, logAdminAction, users]
  );

  const suspendFromTable = React.useCallback(
    async (id: string) => {
      logAdminAction({
        action: "suspend",
        targetUserId: id,
        targetUserName: users.find((u) => u._id === id)?.fullName ?? "User",
      });
      await suspendUserApi(id);
    },
    [logAdminAction, suspendUserApi, users]
  );

  const rejectFromTable = React.useCallback(
    async (id: string, reason?: string) => {
      logAdminAction({
        action: "reject",
        targetUserId: id,
        targetUserName: users.find((u) => u._id === id)?.fullName ?? "User",
      });
      await rejectUserApi(id, reason);
    },
    [logAdminAction, rejectUserApi, users]
  );

  return (
    <AdminLayout>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="space-y-6">
        {/* Real-time connection status indicator */}
        <div className="flex items-center gap-2">
          {socketConnected ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1">
              <Wifi className="w-3.5 h-3.5" /> Live updates active
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-3 py-1">
              <WifiOff className="w-3.5 h-3.5" /> Connecting to live updates…
            </span>
          )}
        </div>

        {toast ? (
          <div
            className={`
              fixed top-4 right-4 z-[120] px-4 py-3 rounded-2xl shadow-sm border
              ${toast.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-rose-50 border-rose-200 text-rose-800"}
            `}
          >
            <div className="text-sm font-semibold">{toast.message}</div>
          </div>
        ) : null}

        <UserTable
          users={users}
          pagination={pagination}
          loading={loading}
          onFetchUsers={fetchUsers as any}
          onSelectUser={(u) => {
            setSelectedUser(u);
            setDrawerOpen(true);
          }}
          onApproveUser={approveFromTable}
          onActivateUser={activateFromTable}
          onSuspendUser={suspendFromTable}
          onRejectUser={rejectFromTable}
          actionLoadingUserId={actionLoadingUserId}
          refreshToken={refreshToken}
        />

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-slate-900 truncate">Admin Audit Logs</h3>
              <p className="text-sm text-slate-500 mt-0.5">Timeline/table view of admin actions</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={auditAction}
                onChange={(e) => setAuditAction(e.target.value as any)}
                className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0F766E]/20 focus:border-[#0F766E]"
                aria-label="Filter by action"
              >
                <option value="all">All actions</option>
                <option value="approve">approve</option>
                <option value="activate">activate</option>
                <option value="reject">reject</option>
                <option value="suspend">suspend</option>
                <option value="delete">delete</option>
                <option value="role_change">role_change</option>
              </select>

              <button
                type="button"
                onClick={() => setAuditView((p) => (p === "timeline" ? "table" : "timeline"))}
                className="rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 transition"
              >
                {auditView === "timeline" ? "Table view" : "Timeline view"}
              </button>
            </div>
          </div>

          <div className="p-6">
            {auditLogs.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm font-medium text-slate-700">No audit logs yet</p>
                <p className="text-xs text-slate-500 mt-1">Perform an admin action to populate this panel.</p>
              </div>
            ) : (
              (() => {
                const visible = auditLogs.filter((l) => (auditAction === "all" ? true : l.action === auditAction));
                if (auditView === "table") {
                  return (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[700px] border-separate border-spacing-0">
                        <thead className="bg-slate-50 sticky top-0 z-10">
                          <tr className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            <th className="px-4 py-3">Time</th>
                            <th className="px-4 py-3">Admin</th>
                            <th className="px-4 py-3">Action</th>
                            <th className="px-4 py-3">Target</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          <AnimatePresence initial={false}>
                            {visible.map((l) => (
                              <motion.tr
                                key={l.id}
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                whileHover={{ y: -1 }}
                                className="bg-white"
                              >
                                <td className="px-4 py-3 text-sm text-slate-700">{formatTS(l.timestamp)}</td>
                                <td className="px-4 py-3 text-sm text-slate-700">{l.adminName}</td>
                                <td className="px-4 py-3 text-sm text-slate-700 font-semibold capitalize">{l.action}</td>
                                <td className="px-4 py-3 text-sm text-slate-700">
                                  <span className="font-semibold">{l.targetUserName}</span>
                                </td>
                              </motion.tr>
                            ))}
                          </AnimatePresence>
                        </tbody>
                      </table>
                    </div>
                  );
                }

                return (
                  <div className="space-y-3">
                    {visible.map((l) => (
                      <motion.div
                        key={l.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        whileHover={{ y: -1 }}
                        className="bg-white border border-slate-200 rounded-2xl p-4"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-900">
                              {l.action.replace("_", " ")}{" "}
                              <span className="text-slate-500 font-medium">• {l.targetUserName}</span>
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                              {l.adminName} • {formatTS(l.timestamp)}
                            </p>
                          </div>
                          <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                            Admin action
                          </span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                );
              })()
            )}
          </div>
        </div>

        <UserProfileDrawer
          user={selectedUser}
          isOpen={drawerOpen}
          onClose={() => {
            setDrawerOpen(false);
            setSelectedUser(null);
          }}
          onApprove={async (id) => approveUserApi(id)}
          onReject={async (id, reason) => rejectUserApi(id, reason)}
          onSuspend={async (id) => suspendUserApi(id)}
          onActivate={async (id) => activateUserApi(id)}
          onDelete={async (id) => deleteUserApi(id)}
          onRoleChange={async (id, nextRole) => {
            await roleChangeApi(id, nextRole);
          }}
          roleChanging={roleChanging}
          actionLoading={Boolean(actionLoadingUserId)}
          onLogAdminAction={(entry) => logAdminAction({ action: entry.action as any, targetUserId: entry.targetUserId, targetUserName: entry.targetUserName })}
        />
      </motion.div>
    </AdminLayout>
  );
}

