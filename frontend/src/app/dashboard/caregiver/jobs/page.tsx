"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  MapPin,
  Clock,
  Briefcase,
  CheckCircle2,
  Bookmark,
  Users,
  Search,
  ArrowLeft,
  SlidersHorizontal,
} from "lucide-react";
import { CaregiverSidebar, CaregiverTopBar } from "../components";
import { jobService, type Job as ApiJob } from "@/services";

interface Job {
  id: string;
  title: string;
  family: string;
  familyAvatar: string;
  location: string;
  distance: string;
  type: string;
  rate: string;
  rateType: string;
  posted: string;
  verified: boolean;
  tags: string[];
  urgency?: "urgent" | "standard";
  applicants: number;
  description?: string;
}

const JOB_TYPES = ["All", "Full-time", "Part-time", "Temporary"];
const SORT_OPTIONS = ["Newest", "Closest", "Highest Pay", "Most Urgent"];

export default function CaregiverJobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("All");
  const [sortBy, setSortBy] = useState("Newest");
  const [showFilters, setShowFilters] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    let isActive = true;

    const toRelativePosted = (isoDate: string) => {
      const created = new Date(isoDate).getTime();
      if (Number.isNaN(created)) return "Recently";
      const diffMs = Date.now() - created;
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      if (diffHours < 1) return "Just now";
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d ago`;
    };

    const mapJobs = (apiJobs: ApiJob[]): Job[] => {
      return apiJobs.map((job) => ({
        id: job._id,
        title: job.title,
        family: "CareConnect Family",
        familyAvatar: "C",
        location: [job.location?.city, job.location?.state].filter(Boolean).join(", ") || "Location not specified",
        distance: "Nearby",
        type: job.employmentType || "Part-time",
        rate: `$${job.salary?.min ?? 0}-${job.salary?.max ?? 0}`,
        rateType: `per ${job.salary?.type || "hour"}`,
        posted: toRelativePosted(job.createdAt),
        verified: true,
        tags: job.tags?.length ? job.tags : [job.careType || "Care"],
        urgency: job.urgencyLevel === "high" || job.urgencyLevel === "urgent" ? "urgent" : "standard",
        applicants: job.analytics?.applications ?? 0,
        description: job.shortDescription || job.description,
      }));
    };

    const loadJobs = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await jobService.listJobs({ page: 1, limit: 50, sortBy: "createdAt", sortOrder: "desc" });
        const mapped = mapJobs(response.data || []);
        if (isActive) {
          setJobs(mapped);
        }
      } catch (err) {
        if (isActive) {
          setError("Failed to load jobs. Please try again.");
          console.error("Failed to fetch jobs:", err);
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    loadJobs();

    return () => {
      isActive = false;
    };
  }, []);

  const filteredJobs = useMemo(() => jobs.filter((job) => {
    const matchesSearch =
      !searchQuery ||
      job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.family.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.tags.some((tag) =>
        tag.toLowerCase().includes(searchQuery.toLowerCase())
      ) ||
      job.location.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType =
      selectedType === "All" || job.type === selectedType;
    return matchesSearch && matchesType;
  }), [jobs, searchQuery, selectedType]);

  const displayedJobs = useMemo(() => {
    const sorted = [...filteredJobs];
    if (sortBy === "Newest") return sorted;
    if (sortBy === "Most Urgent") {
      return sorted.sort((a, b) => Number(b.urgency === "urgent") - Number(a.urgency === "urgent"));
    }
    if (sortBy === "Highest Pay") {
      return sorted.sort((a, b) => {
        const aMax = Number(a.rate.split("-")[1]?.replace("$", "") || 0);
        const bMax = Number(b.rate.split("-")[1]?.replace("$", "") || 0);
        return bMax - aMax;
      });
    }
    return sorted;
  }, [filteredJobs, sortBy]);

  return (
    <div className="min-h-screen bg-[#FAFBFC]">
      <CaregiverSidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        onLogout={() => {}}
      />

      {/* Main wrapper with left margin for sidebar */}
      <div className={`transition-all duration-300 ${sidebarCollapsed ? "ml-0 md:ml-18" : "ml-0 md:ml-65"}`}>
        <CaregiverTopBar />

        <main>
          <div className="max-w-6xl mx-auto px-6 py-6">
            {/* Header */}
            <div className="mb-6">
              <Link
                href="/dashboard/caregiver"
                className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors mb-4"
              >
              <ArrowLeft size={14} />
              Back to Dashboard
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">Find Jobs</h1>
            <p className="text-sm text-gray-500 mt-1">
              Browse available caregiving opportunities near you
            </p>
          </div>

          {/* Search & Filter Bar */}
          <div className="bg-white rounded-2xl border border-gray-100/80 p-4 mb-6">
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Search Input */}
              <div className="relative flex-1">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  placeholder="Search jobs by title, family, location, or tags..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#39B54A]/20 focus:border-[#39B54A] transition-all"
                />
              </div>

              {/* Filter Toggle */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl border transition-all ${
                  showFilters
                    ? "bg-[#39B54A]/5 border-[#39B54A]/30 text-[#39B54A]"
                    : "border-gray-200 text-gray-600 hover:border-gray-300"
                }`}
              >
                <SlidersHorizontal size={16} />
                Filters
              </button>
            </div>

            {/* Expanded Filters */}
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="mt-4 pt-4 border-t border-gray-100"
              >
                <div className="flex flex-wrap gap-6">
                  {/* Job Type Filter */}
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 block">
                      Job Type
                    </label>
                    <div className="flex gap-2">
                      {JOB_TYPES.map((type) => (
                        <button
                          key={type}
                          onClick={() => setSelectedType(type)}
                          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                            selectedType === type
                              ? "bg-[#39B54A] text-white shadow-sm"
                              : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Sort By */}
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 block">
                      Sort By
                    </label>
                    <div className="flex gap-2">
                      {SORT_OPTIONS.map((option) => (
                        <button
                          key={option}
                          onClick={() => setSortBy(option)}
                          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                            sortBy === option
                              ? "bg-[#39B54A] text-white shadow-sm"
                              : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                          }`}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Results Count */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-500">
              <span className="font-semibold text-gray-900">
                {displayedJobs.length}
              </span>{" "}
              jobs found
            </p>
            {isLoading && <p className="text-xs text-gray-400">Loading jobs...</p>}
          </div>

          {/* Error State */}
          {error && (
            <div className="bg-red-50 rounded-2xl border border-red-100 p-6 text-center mb-4">
              <p className="text-sm text-red-600 mb-3">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="text-sm text-red-700 font-medium hover:underline"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Loading State */}
          {isLoading ? (
            <div className="bg-white rounded-2xl border border-gray-100/80 p-12 text-center">
              <div className="w-12 h-12 rounded-full border-2 border-gray-200 border-t-[#39B54A] animate-spin mx-auto mb-4" />
              <p className="text-sm text-gray-500">Loading available jobs...</p>
            </div>
          ) : (
          /* Job Listings */
          <div className="space-y-3">
            {displayedJobs.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100/80 p-12 text-center">
                <Briefcase
                  size={48}
                  className="mx-auto text-gray-300 mb-4"
                />
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  No jobs available
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  {searchQuery || selectedType !== "All"
                    ? "Try adjusting your search or filters to find more opportunities."
                    : "New job opportunities will appear here. Check back soon!"}
                </p>
                {(searchQuery || selectedType !== "All") && (
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      setSelectedType("All");
                    }}
                    className="text-sm text-[#39B54A] font-medium hover:underline"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            ) : (
              displayedJobs.map((job, index) => (
                <motion.div
                  key={job.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * index, duration: 0.4 }}
                  className="group bg-white rounded-2xl border border-gray-100/80 p-5 hover:border-[#39B54A]/30 hover:shadow-md hover:shadow-[#39B54A]/5 transition-all duration-300"
                >
                  <div className="flex gap-4">
                    {/* Family Avatar */}
                    <div className="shrink-0">
                      <div className="w-12 h-12 rounded-xl bg-linear-to-br from-gray-100 to-gray-50 flex items-center justify-center text-gray-600 font-bold text-sm border border-gray-200/60">
                        {job.familyAvatar}
                      </div>
                    </div>

                    {/* Job Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-semibold text-gray-900 group-hover:text-[#39B54A] transition-colors">
                              {job.title}
                            </h4>
                            {job.urgency === "urgent" && (
                              <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase bg-red-50 text-red-600 rounded-md">
                                Urgent
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-xs text-gray-500">
                              {job.family}
                            </span>
                            {job.verified && (
                              <CheckCircle2
                                size={12}
                                className="text-blue-500"
                              />
                            )}
                          </div>
                        </div>
                        <button className="p-1.5 text-gray-300 hover:text-[#39B54A] transition-colors opacity-0 group-hover:opacity-100">
                          <Bookmark size={16} />
                        </button>
                      </div>

                      {/* Description */}
                      {job.description && (
                        <p className="text-xs text-gray-500 mt-2 line-clamp-2">
                          {job.description}
                        </p>
                      )}

                      {/* Meta */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2.5">
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <MapPin size={12} className="text-gray-400" />
                          {job.location}
                          <span className="text-gray-300">·</span>
                          {job.distance}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <Briefcase size={12} className="text-gray-400" />
                          {job.type}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <Clock size={12} className="text-gray-400" />
                          {job.posted}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <Users size={12} className="text-gray-400" />
                          {job.applicants} applicants
                        </span>
                      </div>

                      {/* Tags */}
                      <div className="flex flex-wrap gap-1.5 mt-2.5">
                        {job.tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 text-[11px] font-medium bg-gray-50 text-gray-600 rounded-md border border-gray-100"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Rate & Apply */}
                    <div className="shrink-0 text-right hidden sm:flex flex-col items-end justify-between">
                      <div>
                        <p className="text-base font-bold text-gray-900">
                          {job.rate}
                        </p>
                        <p className="text-[11px] text-gray-400">
                          {job.rateType}
                        </p>
                      </div>
                      <button className="px-4 py-2 bg-[#39B54A] text-white text-xs font-semibold rounded-lg hover:bg-primary-600 transition-colors shadow-sm shadow-[#39B54A]/20">
                        Apply Now
                      </button>
                    </div>
                  </div>

                  {/* Mobile Apply Button */}
                  <div className="mt-3 flex items-center justify-between sm:hidden">
                    <div>
                      <span className="text-sm font-bold text-gray-900">
                        {job.rate}
                      </span>
                      <span className="text-[11px] text-gray-400 ml-1">
                        {job.rateType}
                      </span>
                    </div>
                    <button className="px-4 py-2 bg-[#39B54A] text-white text-xs font-semibold rounded-lg hover:bg-primary-600 transition-colors shadow-sm shadow-[#39B54A]/20">
                      Apply Now
                    </button>
                  </div>
                </motion.div>
              ))
            )}
          </div>
          )}
        </div>
      </main>
      </div>
    </div>
  );
}
