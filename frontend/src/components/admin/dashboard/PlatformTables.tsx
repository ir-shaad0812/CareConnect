"use client";

import { useState } from "react";
import { motion } from "framer-motion";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TopPage {
  page: string;
  views: number;
  change: number;
}

export interface LocationEntry {
  code: string;
  country: string;
  visitors: number;
  percent: number;
}

export interface CaregiverVisitor {
  id?: string;
  initials: string;
  name: string;
  avatar?: string | undefined;
  searches: number;
  totalVisits: number;
  unique: number;
  growth: number;
}

export interface ProofOfWork {
  initials: string;
  caregiver: string;
  avatar?: string | undefined;
  service: string;
  client: string;
  hours: string;
  rating: number;
  verified: boolean;
  date?: string | undefined;
}

export interface RealtimeData {
  activeNow: number;
  hourlyVisits: { time: string; visits: number }[];
  topReferrers: { source: string; count: number; percent: number }[];
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-100 rounded-lg ${className ?? ""}`} />;
}

// ─── Section Card Wrapper ────────────────────────────────────────────────────

function Section({
  icon,
  title,
  badge,
  actions,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  badge?: string | undefined;
  actions?: React.ReactNode | undefined;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg hover:shadow-gray-100/80 transition-shadow duration-300"
    >
      <div className="px-6 py-4 flex items-center justify-between border-b border-gray-50">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400">
            {icon}
          </div>
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
          {badge && (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              badge === "LIVE"
                ? "bg-emerald-50 text-emerald-700 border border-emerald-100 animate-pulse"
                : "bg-emerald-50 text-emerald-700 border border-emerald-100"
            }`}>
              {badge}
            </span>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      <div>{children}</div>
    </motion.div>
  );
}

// ─── Top Pages Table ─────────────────────────────────────────────────────────

export function TopPagesTable({ pages, loading }: { pages: TopPage[]; loading?: boolean }) {
  const placeholders = Array.from({ length: 5 });

  return (
    <Section
      icon={
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      }
      title="Top Pages"
    >
      <table className="w-full text-sm">
        <thead>
          <tr className="text-[11px] text-gray-400 uppercase tracking-widest border-b border-gray-50">
            <th className="text-left px-6 py-3 font-semibold">Page</th>
            <th className="text-right px-6 py-3 font-semibold">Views</th>
            <th className="text-right px-6 py-3 font-semibold">Change</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {loading
            ? placeholders.map((_, i) => (
                <tr key={i}>
                  <td className="px-6 py-3.5"><Skeleton className="h-4 w-28" /></td>
                  <td className="px-6 py-3.5 text-right"><Skeleton className="h-4 w-12 ml-auto" /></td>
                  <td className="px-6 py-3.5 text-right"><Skeleton className="h-4 w-10 ml-auto" /></td>
                </tr>
              ))
            : pages.length === 0
            ? (
                <tr>
                  <td colSpan={3} className="px-6 py-10 text-center text-sm text-gray-400">
                    No page activity recorded yet
                  </td>
                </tr>
              )
            : pages.map((p) => (
                <tr key={p.page} className="hover:bg-gray-50/60 transition-colors group">
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-5 h-5 rounded-md bg-gray-100 flex items-center justify-center group-hover:bg-emerald-50 transition-colors">
                        <svg className="w-3 h-3 text-gray-400 group-hover:text-emerald-600 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </div>
                      <span className="font-medium text-gray-700 truncate max-w-37.5">{p.page}</span>
                    </div>
                  </td>
                  <td className="px-6 py-3.5 text-right font-bold text-gray-900 tabular-nums">
                    {p.views.toLocaleString()}
                  </td>
                  <td className="px-6 py-3.5 text-right">
                    <span className={`inline-flex items-center gap-0.5 text-xs font-bold px-2 py-0.5 rounded-full ${
                      p.change >= 0
                        ? "text-emerald-700 bg-emerald-50"
                        : "text-red-600 bg-red-50"
                    }`}>
                      {p.change >= 0 ? "+" : ""}{p.change}%
                    </span>
                  </td>
                </tr>
              ))}
        </tbody>
      </table>
    </Section>
  );
}

// ─── Locations Table ─────────────────────────────────────────────────────────

export function LocationsTable({ locations, loading }: { locations: LocationEntry[]; loading?: boolean }) {
  const [view, setView] = useState<"Country" | "Region" | "City">("Country");
  const placeholders = Array.from({ length: 5 });

  return (
    <Section
      icon={
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
        </svg>
      }
      title="Locations"
      actions={
        <div className="flex bg-gray-100 rounded-lg p-0.5">
          {(["Country", "Region", "City"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setView(tab)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                view === tab
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      }
    >
      <table className="w-full text-sm">
        <thead>
          <tr className="text-[11px] text-gray-400 uppercase tracking-widest border-b border-gray-50">
            <th className="text-left px-6 py-3 font-semibold">{view}</th>
            <th className="text-right px-6 py-3 font-semibold">Visitors</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {loading
            ? placeholders.map((_, i) => (
                <tr key={i}>
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-5 w-8 rounded-md" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                  </td>
                  <td className="px-6 py-3.5">
                    <div className="flex flex-col items-end gap-1.5">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-1.5 w-24 rounded-full" />
                    </div>
                  </td>
                </tr>
              ))
            : locations.length === 0
            ? (
                <tr>
                  <td colSpan={2} className="px-6 py-10 text-center text-sm text-gray-400">
                    No location data available yet
                  </td>
                </tr>
              )
            : locations.map((l) => (
                <tr key={l.code} className="hover:bg-gray-50/60 transition-colors">
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 w-8 h-5 flex items-center justify-center rounded-md shrink-0 tracking-wide">
                        {l.code}
                      </span>
                      <span className="text-gray-800 font-medium truncate">{l.country}</span>
                    </div>
                  </td>
                  <td className="px-6 py-3.5">
                    <div className="flex flex-col items-end gap-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900 tabular-nums">{l.visitors.toLocaleString()}</span>
                        <span className="text-xs text-gray-400 tabular-nums">({l.percent}%)</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden w-28">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(l.percent * 2, 100)}%` }}
                          transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
                          className="h-full bg-emerald-500 rounded-full"
                        />
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
        </tbody>
      </table>
    </Section>
  );
}

// ─── Caregiver Visitors Table ─────────────────────────────────────────────────

export function CaregiverVisitorsTable({ visitors, loading }: { visitors: CaregiverVisitor[]; loading?: boolean }) {
  const placeholders = Array.from({ length: 4 });

  return (
    <Section
      icon={
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      }
      title="Caregiver Profile Visitors"
      badge="Live Data"
    >
      <table className="w-full text-sm">
        <thead>
          <tr className="text-[11px] text-gray-400 uppercase tracking-widest border-b border-gray-50">
            <th className="text-left px-6 py-3 font-semibold">Caregiver</th>
            <th className="text-right px-6 py-3 font-semibold">Total Visits</th>
            <th className="text-right px-6 py-3 font-semibold hidden sm:table-cell">Unique</th>
            <th className="text-right px-6 py-3 font-semibold hidden md:table-cell">Growth</th>
            <th className="text-right px-6 py-3 font-semibold hidden lg:table-cell">Trend</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {loading
            ? placeholders.map((_, i) => (
                <tr key={i}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <Skeleton className="w-9 h-9 rounded-xl shrink-0" />
                      <div className="space-y-1.5">
                        <Skeleton className="h-3.5 w-28" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right"><Skeleton className="h-4 w-14 ml-auto" /></td>
                  <td className="px-6 py-4 text-right hidden sm:table-cell"><Skeleton className="h-4 w-12 ml-auto" /></td>
                  <td className="px-6 py-4 text-right hidden md:table-cell"><Skeleton className="h-4 w-10 ml-auto" /></td>
                  <td className="px-6 py-4 hidden lg:table-cell"><Skeleton className="h-5 w-16 ml-auto" /></td>
                </tr>
              ))
            : visitors.length === 0
            ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-sm text-gray-400">
                    No profile interaction data yet
                  </td>
                </tr>
              )
            : visitors.map((v, idx) => (
                <tr key={v.id ?? `${v.name}-${idx}`} className="hover:bg-gray-50/60 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {v.avatar ? (
                        <img src={v.avatar} alt={v.name} className="w-9 h-9 rounded-xl object-cover shrink-0 ring-2 ring-white shadow-sm" />
                      ) : (
                        <div className="w-9 h-9 rounded-xl bg-linear-to-br from-emerald-100 to-teal-200 flex items-center justify-center text-xs font-bold text-emerald-700 shrink-0 ring-2 ring-white shadow-sm">
                          {v.initials}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{v.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">Searches: {v.searches}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right font-bold text-gray-900 tabular-nums">
                    {v.totalVisits.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-right text-gray-600 tabular-nums hidden sm:table-cell">
                    {v.unique.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-right hidden md:table-cell">
                    {v.growth !== 0 ? (
                      <span className={`inline-flex items-center gap-0.5 text-xs font-bold px-2 py-0.5 rounded-full ${
                        v.growth >= 0 ? "text-emerald-700 bg-emerald-50" : "text-red-600 bg-red-50"
                      }`}>
                        {v.growth >= 0 ? "+" : ""}{v.growth}%
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 hidden lg:table-cell">
                    <div className="inline-flex items-end gap-0.5 h-5 float-right">
                      {[0.4, 0.65, 0.85, 0.55, 0.9, 0.75, 1].map((h, i) => (
                        <div
                          key={i}
                          className="w-1.5 bg-emerald-400 group-hover:bg-emerald-500 rounded-full transition-colors"
                          style={{ height: `${h * 100}%` }}
                        />
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
        </tbody>
      </table>
    </Section>
  );
}

// ─── Star Rating ─────────────────────────────────────────────────────────────

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <svg
          key={i}
          className={`w-3.5 h-3.5 ${i < Math.round(rating) ? "text-amber-400 fill-amber-400" : "text-gray-200 fill-gray-200"}`}
          viewBox="0 0 24 24"
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
      {rating > 0 && <span className="ml-1 text-xs font-bold text-amber-600">{rating}</span>}
    </div>
  );
}

function formatDate(dateStr?: string) {
  if (!dateStr) return "";
  try {
    return new Date(dateStr).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return "";
  }
}

// ─── Proof of Work Table ──────────────────────────────────────────────────────

export function ProofOfWorkTable({ records, loading }: { records: ProofOfWork[]; loading?: boolean }) {
  const placeholders = Array.from({ length: 4 });
  const verifiedCount = records.filter((r) => r.verified).length;

  return (
    <Section
      icon={
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
        </svg>
      }
      title="Recent Proof of Work"
      badge={!loading && verifiedCount > 0 ? `${verifiedCount} verified` : undefined}
    >
      {loading ? (
        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {placeholders.map((_, i) => (
            <div key={i} className="rounded-xl border border-gray-100 p-4 space-y-3">
              <div className="flex items-center gap-3">
                <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="h-3.5 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
              <Skeleton className="h-6 w-24 rounded-lg" />
              <div className="flex justify-between">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          ))}
        </div>
      ) : records.length === 0 ? (
        <div className="px-6 py-12 text-center">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-amber-50 flex items-center justify-center">
            <svg className="w-6 h-6 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-gray-700">No completed sessions yet</p>
          <p className="text-xs text-gray-400 mt-1">Verified proof of work will appear once bookings complete</p>
        </div>
      ) : (
        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {records.map((r, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="group relative rounded-xl border border-gray-100 bg-gray-50/30 hover:bg-white hover:border-emerald-100 hover:shadow-md transition-all duration-200 p-4 overflow-hidden"
            >
              {r.verified && (
                <div className="absolute top-0 right-0 w-14 h-14 bg-emerald-400/5 rounded-bl-3xl pointer-events-none" />
              )}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  {r.avatar ? (
                    <img src={r.avatar} alt={r.caregiver} className="w-9 h-9 rounded-xl object-cover shrink-0 ring-2 ring-white shadow-sm" />
                  ) : (
                    <div className="w-9 h-9 rounded-xl bg-linear-to-br from-amber-100 to-amber-200 flex items-center justify-center text-xs font-bold text-amber-700 shrink-0 ring-2 ring-white shadow-sm">
                      {r.initials}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate leading-tight">{r.caregiver}</p>
                    <p className="text-xs text-gray-400 truncate mt-0.5">for {r.client}</p>
                  </div>
                </div>
                {r.verified ? (
                  <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
                    <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    Verified
                  </span>
                ) : (
                  <span className="shrink-0 text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full">
                    Pending
                  </span>
                )}
              </div>
              <div className="mb-3">
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-lg">
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  {r.service}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <svg className="w-3.5 h-3.5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2" />
                    </svg>
                    <span className="text-xs font-bold text-gray-700 tabular-nums">{r.hours}</span>
                  </div>
                  {r.rating > 0 && <StarRating rating={r.rating} />}
                </div>
                {r.date && <span className="text-[10px] text-gray-400 shrink-0">{formatDate(r.date)}</span>}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </Section>
  );
}

// ─── Realtime Widget ─────────────────────────────────────────────────────────

export function RealtimeWidget({ data }: { data: RealtimeData }) {
  const maxVisits = Math.max(...data.hourlyVisits.map((v) => v.visits), 1);
  const totalReferrers = data.topReferrers.reduce((s, r) => s + r.count, 0);

  return (
    <div className="space-y-5">
      {/* Realtime Visitors */}
      <Section
        icon={
          <svg className="w-4 h-4 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        }
        title="Realtime Visitors"
        badge="LIVE"
      >
        <div className="px-6 py-5">
          <div className="flex items-center gap-3 mb-5">
            <span className="text-4xl font-bold text-gray-900 tabular-nums leading-none">{data.activeNow}</span>
            <div>
              <p className="text-sm font-medium text-gray-600">active right now</p>
              {data.activeNow > 0 && (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 mt-0.5">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                  Online
                </span>
              )}
            </div>
          </div>
          <div className="flex items-end gap-1 h-16">
            {data.hourlyVisits.map((h, i) => {
              const pct = (h.visits / maxVisits) * 100;
              return (
                <div
                  key={i}
                  title={`${h.time}: ${h.visits}`}
                  className="flex-1 bg-emerald-400 hover:bg-emerald-500 rounded-t transition-colors cursor-default"
                  style={{ height: `${Math.max(pct, 5)}%` }}
                />
              );
            })}
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-[10px] text-gray-400">{data.hourlyVisits[0]?.time}</span>
            <span className="text-[10px] text-gray-400">{data.hourlyVisits[data.hourlyVisits.length - 1]?.time}</span>
          </div>
        </div>
      </Section>

      {/* Top Referrers */}
      <Section
        icon={
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        }
        title="Top Referrers"
      >
        {totalReferrers === 0 ? (
          <div className="px-6 py-7 text-center">
            <p className="text-xs text-gray-400">Referrer tracking not yet enabled.</p>
            <p className="text-xs text-gray-400 mt-0.5">All counts will appear here automatically.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {data.topReferrers.map((r) => (
              <div key={r.source} className="px-6 py-3.5 hover:bg-gray-50/60 transition-colors">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-semibold text-gray-800">{r.source}</span>
                  <span className="text-sm font-bold text-gray-900 tabular-nums">{r.count.toLocaleString()}</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${r.percent}%` }}
                    transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
                    className="h-full bg-emerald-500 rounded-full"
                  />
                </div>
                <p className="text-[10px] text-gray-400 mt-1">{r.percent}% of traffic</p>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}
