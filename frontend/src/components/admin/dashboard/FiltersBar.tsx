"use client";

import { motion } from "framer-motion";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { cn } from "@/lib/utils";

export type UserTableFilters = {
  search: string;
  dateRange: "7d" | "30d" | "90d" | "all";
  activityType: "all" | "caregiver" | "careseeker";
  status: "all" | "active" | "pending" | "pending_approval" | "suspended" | "deleted";
};

export default function FiltersBar({
  filters,
  onChange,
  onReset,
}: {
  filters: UserTableFilters;
  onChange: (next: UserTableFilters) => void;
  onReset: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="bg-linear-to-br from-white via-slate-50/40 to-emerald-50/30 rounded-2xl shadow-sm border border-slate-200 p-4"
    >
      <form
        className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end"
        onSubmit={(e) => {
          e.preventDefault();
        }}
      >
        <div className="md:col-span-2">
          <label className="text-xs font-semibold text-slate-500 mb-1 block">Search</label>
          <div className="relative">
            <svg className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <Input
              placeholder="Name or email…"
              value={filters.search}
              onChange={(e: { target: { value: string } }) =>
                onChange({ ...filters, search: e.target.value })
              }
              className="pl-9 rounded-2xl border-slate-200 bg-white text-slate-600 placeholder:text-slate-400 focus:border-[#0F766E] focus:ring-[#0F766E]/15"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-500 mb-1 block">Date range</label>
          <Select
            value={filters.dateRange}
            onChange={(e) => onChange({ ...filters, dateRange: e.target.value as FiltersBarProps["filters"]["dateRange"] })}
            className={cn("rounded-2xl border-slate-200 bg-white text-slate-600 focus:border-[#0F766E] focus-visible:ring-[#0F766E]/25 focus-visible:ring-offset-0")}
          >
            <option value="all" className="text-slate-600">All time</option>
            <option value="7d" className="text-slate-600">Last 7 days</option>
            <option value="30d" className="text-slate-600">Last 30 days</option>
            <option value="90d" className="text-slate-600">Last 90 days</option>
          </Select>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-500 mb-1 block">Activity type</label>
          <Select
            value={filters.activityType}
            onChange={(e) =>
              onChange({
                ...filters,
                activityType: e.target.value as FiltersBarProps["filters"]["activityType"],
              })
            }
            className={cn("rounded-2xl border-slate-200 bg-white text-slate-600 focus:border-[#0F766E] focus-visible:ring-[#0F766E]/25 focus-visible:ring-offset-0")}
          >
            <option value="all" className="text-slate-600">All</option>
            <option value="caregiver" className="text-slate-600">Caregivers</option>
            <option value="careseeker" className="text-slate-600">Care Seekers</option>
          </Select>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-500 mb-1 block">Status</label>
          <Select
            value={filters.status}
            onChange={(e) =>
              onChange({
                ...filters,
                status: e.target.value as FiltersBarProps["filters"]["status"],
              })
            }
            className={cn("rounded-2xl border-slate-200 bg-white text-slate-600 focus:border-[#0F766E] focus-visible:ring-[#0F766E]/25 focus-visible:ring-offset-0")}
          >
            <option value="all" className="text-slate-600">All</option>
            <option value="active" className="text-slate-600">Active</option>
            <option value="pending" className="text-slate-600">Pending Email</option>
            <option value="pending_approval" className="text-slate-600">Pending Approval</option>
            <option value="suspended" className="text-slate-600">Suspended</option>
            <option value="deleted" className="text-slate-600">Deleted</option>
          </Select>
        </div>

        <div className="flex justify-end md:col-span-1">
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-[#0F766E] hover:border-[#0F766E]/30 hover:shadow-sm transition"
          >
            Reset
          </button>
        </div>
      </form>
    </motion.div>
  );
}

type FiltersBarProps = Parameters<typeof FiltersBar>[0];

