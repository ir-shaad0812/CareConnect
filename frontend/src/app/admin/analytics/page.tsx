"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import AdminLayout from "@/components/layout/AdminLayout";
import { adminService, type FullAnalytics } from "@/services/api/admin.service";
import { authService } from "@/modules/auth/services";
import { useSocketContext } from "@/context/SocketContext";
import {
  AreaChart, Area, BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  Users, UserPlus, Briefcase, DollarSign, TrendingUp, TrendingDown,
  Activity, StickyNote, MapPin, BarChart3, RefreshCw, Calendar,
} from "lucide-react";

// Colors
const COLORS = ["#4461F2", "#22C55E", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#06B6D4", "#84CC16"];
const axisProps = { stroke: "#94A3B8", tick: { fontSize: 11, fill: "#94A3B8" }, axisLine: false, tickLine: false } as const;

function Tip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; color: string; name?: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-3.5 py-2.5">
      <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
      {payload.map((e, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: e.color }} />
          <span className="text-xs text-gray-500">{e.name || ""}</span>
          <span className="text-sm font-semibold text-gray-900 tabular-nums">
            {typeof e.value === "number" ? e.value.toLocaleString() : e.value}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const router = useRouter();
  const { socket, isConnected } = useSocketContext();
  const [analytics, setAnalytics] = useState<FullAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);
  const [lastSyncedAt, setLastSyncedAt] = useState<string>("");
  const realtimeRefreshRef = useRef<number | null>(null);

  const fetchData = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent === true;
    if (!silent) {
      setLoading(true);
    }
    try {
      const data = await adminService.getFullAnalytics(days);
      setAnalytics(data);
      setLastSyncedAt(new Date().toISOString());
    } catch {
      // show empty state
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [days]);

  useEffect(() => {
    const user = authService.getCurrentUser();
    if (!user || user.role !== "admin") { router.push("/admin/login"); return; }
    void fetchData();

    const intervalId = window.setInterval(() => {
      void fetchData({ silent: true });
    }, 30000);

    const handleWindowFocus = () => {
      void fetchData({ silent: true });
    };

    window.addEventListener("focus", handleWindowFocus);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleWindowFocus);
    };
  }, [fetchData, router]);

  useEffect(() => {
    if (!socket) return;

    const scheduleRealtimeRefresh = () => {
      if (realtimeRefreshRef.current) {
        window.clearTimeout(realtimeRefreshRef.current);
      }

      realtimeRefreshRef.current = window.setTimeout(() => {
        void fetchData({ silent: true });
      }, 400);
    };

    const realtimeEvents = [
      "booking:created",
      "booking:confirmed",
      "booking:payment_completed",
      "booking:active",
      "booking:completed",
      "booking:cancelled",
      "review:new",
      "review:changed",
      "admin:review:new",
      "admin:review:moderated",
      "wallet:updated",
      "system:stats_updated",
      "notification:new",
    ];

    realtimeEvents.forEach((eventName) => {
      socket.on(eventName, scheduleRealtimeRefresh);
    });

    return () => {
      realtimeEvents.forEach((eventName) => {
        socket.off(eventName, scheduleRealtimeRefresh);
      });

      if (realtimeRefreshRef.current) {
        window.clearTimeout(realtimeRefreshRef.current);
        realtimeRefreshRef.current = null;
      }
    };
  }, [fetchData, socket]);

  const syncedAtLabel = lastSyncedAt
    ? new Date(lastSyncedAt).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : "Awaiting sync";

  const o = analytics?.overview;

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <RefreshCw className="w-8 h-8 text-gray-400 animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <BarChart3 className="w-7 h-7 text-[#4461F2]" />
              Analytics Dashboard
            </h1>
            <p className="text-gray-500 text-sm mt-1">Real-time insights from your platform</p>
            <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-2">
              <span
                className={`inline-block w-2 h-2 rounded-full ${
                  isConnected ? "bg-emerald-500" : "bg-amber-500"
                }`}
              />
              Live sync: {syncedAtLabel}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => void fetchData({ silent: true })}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-50 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </button>

            <div className="flex items-center gap-2 bg-gray-100 rounded-xl p-1">
              {[7, 30, 90].map(d => (
                <button
                  key={d}
                  onClick={() => setDays(d)}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                    days === d ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {d}d
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { label: "Total Users", value: o?.totalUsers || 0, icon: Users, color: "#4461F2", change: o?.userChange || 0 },
            { label: "Caregivers", value: o?.activeCaregivers || 0, icon: UserPlus, color: "#22C55E", change: 0 },
            { label: "Families", value: o?.activeFamilies || 0, icon: Users, color: "#8B5CF6", change: 0 },
            { label: "Bookings", value: o?.totalBookings || 0, icon: Briefcase, color: "#F59E0B", change: 0 },
            { label: "Revenue", value: `Rs.${((o?.revenue || 0) / 1000).toFixed(1)}k`, icon: DollarSign, color: "#10B981", change: o?.revenueChange || 0 },
            { label: "Completion", value: `${o?.completionRate || 0}%`, icon: Activity, color: "#EC4899", change: 0 },
          ].map((stat, i) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-white rounded-2xl border border-gray-100 p-5"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${stat.color}15` }}>
                    <Icon className="w-5 h-5" style={{ color: stat.color }} />
                  </div>
                  {stat.change !== 0 && (
                    <span className={`text-xs font-semibold flex items-center gap-0.5 ${stat.change >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                      {stat.change >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                      {stat.change > 0 ? "+" : ""}{stat.change}%
                    </span>
                  )}
                </div>
                <p className="text-2xl font-bold text-gray-900 tabular-nums">{stat.value}</p>
                <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
              </motion.div>
            );
          })}
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* User Growth Chart */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">User Growth</h3>
                <p className="text-xs text-gray-400">New registrations over time</p>
              </div>
              <Calendar size={16} className="text-gray-400" />
            </div>
            <div className="h-64">
              {analytics?.userGrowth && analytics.userGrowth.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analytics.userGrowth}>
                    <defs>
                      <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4461F2" stopOpacity={0.1} />
                        <stop offset="95%" stopColor="#4461F2" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="label" {...axisProps} interval={Math.floor(analytics.userGrowth.length / 6)} />
                    <YAxis {...axisProps} />
                    <Tooltip content={<Tip />} />
                    <Area type="monotone" dataKey="total" name="Total" stroke="#4461F2" fill="url(#colorUsers)" strokeWidth={2} />
                    <Area type="monotone" dataKey="caregivers" name="Caregivers" stroke="#22C55E" fill="none" strokeWidth={1.5} strokeDasharray="4 4" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-400 text-sm">No data yet</div>
              )}
            </div>
          </motion.div>

          {/* Booking Analytics Chart */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Booking Analytics</h3>
                <p className="text-xs text-gray-400">Daily bookings breakdown</p>
              </div>
              <Briefcase size={16} className="text-gray-400" />
            </div>
            <div className="h-64">
              {analytics?.bookingAnalytics && analytics.bookingAnalytics.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.bookingAnalytics}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="label" {...axisProps} interval={Math.floor(analytics.bookingAnalytics.length / 6)} />
                    <YAxis {...axisProps} />
                    <Tooltip content={<Tip />} />
                    <Bar dataKey="completed" name="Completed" fill="#22C55E" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="confirmed" name="Confirmed" fill="#4461F2" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="cancelled" name="Cancelled" fill="#EF4444" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-400 text-sm">No data yet</div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Revenue Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Revenue Chart */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Revenue Insights</h3>
                <p className="text-xs text-gray-400">Monthly earnings trend</p>
              </div>
              <DollarSign size={16} className="text-gray-400" />
            </div>
            <div className="h-64">
              {analytics?.revenueInsights?.monthly && analytics.revenueInsights.monthly.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analytics.revenueInsights.monthly}>
                    <defs>
                      <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.1} />
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="label" {...axisProps} />
                    <YAxis {...axisProps} />
                    <Tooltip content={<Tip />} />
                    <Legend />
                    <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#10B981" fill="url(#colorRev)" strokeWidth={2} />
                    <Area type="monotone" dataKey="platformFee" name="Platform Fee" stroke="#F59E0B" fill="none" strokeWidth={1.5} strokeDasharray="4 4" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-400 text-sm">No revenue data yet</div>
              )}
            </div>
          </motion.div>

          {/* Top Earners */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white rounded-2xl border border-gray-100 p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-1">Top Earners</h3>
            <p className="text-xs text-gray-400 mb-4">Highest earning caregivers</p>
            <div className="space-y-3">
              {analytics?.revenueInsights?.topEarners?.length ? (
                analytics.revenueInsights.topEarners.map((earner, i) => (
                  <div key={earner._id} className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{earner.user?.fullName || "Unknown"}</p>
                      <p className="text-xs text-gray-400">{earner.bookings} bookings</p>
                    </div>
                    <span className="text-sm font-bold text-emerald-600">Rs.{earner.totalEarnings.toLocaleString()}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-400 text-center py-6">No data yet</p>
              )}
            </div>
          </motion.div>
        </div>

        {/* Notes + Location Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Notes Insights */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-4">
              <StickyNote size={16} className="text-[#4461F2]" />
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Notes Insights</h3>
                <p className="text-xs text-gray-400">Engagement and usage</p>
              </div>
            </div>
            {analytics?.notesInsights ? (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-gray-50 rounded-xl p-3 text-center">
                    <p className="text-xl font-bold text-gray-900">{analytics.notesInsights.totalNotes}</p>
                    <p className="text-[10px] text-gray-500">Total Notes</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3 text-center">
                    <p className="text-xl font-bold text-gray-900">{analytics.notesInsights.avgNotesPerBooking.toFixed(1)}</p>
                    <p className="text-[10px] text-gray-500">Per Booking</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3 text-center">
                    <p className="text-xl font-bold text-gray-900">{analytics.notesInsights.bookingsWithNotes}</p>
                    <p className="text-[10px] text-gray-500">With Notes</p>
                  </div>
                </div>
                {/* Tags breakdown as mini pie */}
                <div className="h-40">
                  {Object.keys(analytics.notesInsights.tags).length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={Object.entries(analytics.notesInsights.tags).map(([name, value]) => ({ name, value }))}
                          cx="50%" cy="50%"
                          innerRadius={40} outerRadius={65}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {Object.keys(analytics.notesInsights.tags).map((_, i) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-gray-400 text-sm">No tags data</div>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-8">No notes data</p>
            )}
          </motion.div>

          {/* Location Analytics */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-4">
              <MapPin size={16} className="text-[#EF4444]" />
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Location Analytics</h3>
                <p className="text-xs text-gray-400">High-demand areas</p>
              </div>
            </div>
            {analytics?.locationAnalytics ? (
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-2 uppercase">By City</p>
                  <div className="space-y-2">
                    {analytics.locationAnalytics.byCity.length > 0 ? (
                      analytics.locationAnalytics.byCity.slice(0, 6).map((city, i) => {
                        const maxCount = analytics.locationAnalytics.byCity[0]?.count || 1;
                        const pct = Math.round((city.count / maxCount) * 100);
                        return (
                          <div key={city._id || i}>
                            <div className="flex justify-between mb-1">
                              <span className="text-sm text-gray-600">{city._id}{city.state ? `, ${city.state}` : ""}</span>
                              <span className="text-sm font-semibold text-gray-900">{city.count}</span>
                            </div>
                            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${pct}%` }}
                                transition={{ duration: 0.6, delay: i * 0.05 }}
                                className="h-full rounded-full"
                                style={{ background: COLORS[i % COLORS.length] }}
                              />
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-sm text-gray-400">No location data yet</p>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-2 uppercase">By Country</p>
                  <div className="flex flex-wrap gap-2">
                    {analytics.locationAnalytics.byCountry.map((country, i) => (
                      <span key={country._id || i} className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-full text-xs font-medium text-gray-700">
                        {country._id} <span className="text-gray-400">({country.count})</span>
                      </span>
                    ))}
                    {analytics.locationAnalytics.byCountry.length === 0 && (
                      <p className="text-sm text-gray-400">No data yet</p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-8">No location data</p>
            )}
          </motion.div>
        </div>
      </div>
    </AdminLayout>
  );
}
