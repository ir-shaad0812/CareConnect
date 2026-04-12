// ============================================
// JOBS BROWSER PAGE
// Public caregiver-facing job marketplace
// ============================================

"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { jobService } from "@/services";
import type { Job } from "@/services";

// Job categories
const JOB_CATEGORIES = [
  { value: "all", label: "All Categories" },
  { value: "elderly_care", label: "Elderly Care" },
  { value: "child_care", label: "Child Care" },
  { value: "special_needs", label: "Special Needs" },
  { value: "medical_care", label: "Medical Care" },
  { value: "companion_care", label: "Companion Care" },
  { value: "respite_care", label: "Respite Care" },
  { value: "palliative_care", label: "Palliative Care" },
  { value: "post_operative_care", label: "Post-Operative Care" },
  { value: "disability_support", label: "Disability Support" },
  { value: "dementia_care", label: "Dementia Care" },
];

// Employment types
const EMPLOYMENT_TYPES = [
  { value: "all", label: "All Types" },
  { value: "full_time", label: "Full Time" },
  { value: "part_time", label: "Part Time" },
  { value: "contract", label: "Contract" },
  { value: "temporary", label: "Temporary" },
  { value: "live_in", label: "Live-In" },
];

// Salary ranges (NPR)
const SALARY_RANGES = [
  { value: "all", label: "Any Salary" },
  { value: "0-15000", label: "Below Rs. 15,000" },
  { value: "15000-30000", label: "Rs. 15,000 – 30,000" },
  { value: "30000-60000", label: "Rs. 30,000 – 60,000" },
  { value: "60000-100000", label: "Rs. 60,000 – 1,00,000" },
  { value: "100000+", label: "Above Rs. 1,00,000" },
];

// Nepal provinces
const STATES = [
  "All Provinces",
  "Koshi Province",
  "Madhesh Province",
  "Bagmati Province",
  "Gandaki Province",
  "Lumbini Province",
  "Karnali Province",
  "Sudurpashchim Province",
];

interface Filters {
  category: string;
  employmentType: string;
  salaryRange: string;
  state: string;
  search: string;
  sortBy: string;
}

export default function JobsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [featuredJobs, setFeaturedJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [savedJobs, setSavedJobs] = useState<Set<string>>(new Set());
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    total: 0,
  });
  const [filters, setFilters] = useState<Filters>({
    category: searchParams.get("category") || "all",
    employmentType: searchParams.get("type") || "all",
    salaryRange: searchParams.get("salary") || "all",
    state: searchParams.get("state") || "All States",
    search: searchParams.get("q") || "",
    sortBy: searchParams.get("sort") || "recent",
  });

  const fetchJobs = useCallback(async (page = 1) => {
    try {
      setLoading(true);

      // Build query params
      const params: Record<string, string | number | undefined> = {
        page,
        limit: 12,
        status: "active",
      };

      if (filters.category !== "all") params.category = filters.category;
      if (filters.employmentType !== "all") params.employmentType = filters.employmentType;
      if (filters.state !== "All States") params.state = filters.state;
      if (filters.search) params.search = filters.search;

      // Handle salary range
      if (filters.salaryRange !== "all") {
        const [min, max] = filters.salaryRange.split("-");
        if (min) params.salaryMin = parseInt(min);
        if (max && max !== "+") params.salaryMax = parseInt(max);
      }

      // Handle sorting
      switch (filters.sortBy) {
        case "recent":
          params.sort = "-createdAt";
          break;
        case "salary_high":
          params.sort = "-salary.max";
          break;
        case "salary_low":
          params.sort = "salary.min";
          break;
        case "deadline":
          params.sort = "applicationDeadline";
          break;
      }

      const response = await jobService.listJobs(params);
      setJobs(response.data || []);
      setPagination({
        page: response.pagination?.page || 1,
        totalPages: response.pagination?.pages || 1,
        total: response.pagination?.total || 0,
      });
    } catch (error) {
      console.error("Error fetching jobs:", error);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchJobs(1);
    fetchFeaturedJobs();
    fetchSavedJobs();
  }, [fetchJobs]);

  const fetchFeaturedJobs = async () => {
    try {
      const response = await jobService.getFeaturedJobs();
      setFeaturedJobs(response || []);
    } catch (error) {
      console.error("Error fetching featured jobs:", error);
    }
  };

  const fetchSavedJobs = async () => {
    try {
      const response = await jobService.getSavedJobs();
      setSavedJobs(new Set(response.data?.map((j: Job) => j._id) || []));
    } catch (error) {
      console.error("Error fetching saved jobs:", error);
    }
  };

  const handleFilterChange = (key: keyof Filters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchJobs(1);
  };

  const handleSaveJob = async (jobId: string) => {
    try {
      if (savedJobs.has(jobId)) {
        await jobService.unsaveJob(jobId);
        setSavedJobs((prev) => {
          const next = new Set(prev);
          next.delete(jobId);
          return next;
        });
      } else {
        await jobService.saveJob(jobId);
        setSavedJobs((prev) => new Set(prev).add(jobId));
      }
    } catch (error) {
      console.error("Error saving job:", error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ne-NP", {
      style: "currency",
      currency: "NPR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    return d.toLocaleDateString("en-NP", { month: "short", day: "numeric" });
  };

  const JobCard = ({ job, featured = false }: { job: Job; featured?: boolean }) => (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={`bg-white rounded-2xl border ${
        featured ? "border-[#39B54A] shadow-lg shadow-green-100" : "border-gray-200"
      } p-6 hover:shadow-lg transition-all cursor-pointer relative group`}
      onClick={() => router.push(`/jobs/${job._id}`)}
    >
      {/* Featured Badge */}
      {featured && (
        <div className="absolute -top-3 left-4 px-3 py-1 bg-linear-to-r from-[#39B54A] to-[#2d913c] text-white text-xs font-semibold rounded-full">
          Featured
        </div>
      )}

      {/* Urgent Badge */}
      {job.urgencyLevel === "urgent" || job.urgencyLevel === "critical" ? (
        <div className="absolute -top-3 right-4 px-3 py-1 bg-linear-to-r from-red-500 to-orange-500 text-white text-xs font-semibold rounded-full">
          Urgent
        </div>
      ) : null}

      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 group-hover:text-[#39B54A] transition-colors line-clamp-2">
            {job.title}
          </h3>
          <div className="flex items-center gap-2 mt-2 text-gray-500 text-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>{job.location?.city}, {job.location?.state}</span>
          </div>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            handleSaveJob(job._id);
          }}
          className={`p-2 rounded-full transition-colors ${
            savedJobs.has(job._id)
              ? "bg-[#39B54A] text-white"
              : "bg-gray-100 text-gray-400 hover:bg-gray-200"
          }`}
        >
          <svg className="w-5 h-5" fill={savedJobs.has(job._id) ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
        </button>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-2 mb-4">
        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium capitalize">
          {job.category?.replace(/_/g, " ")}
        </span>
        <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium capitalize">
          {job.employmentType?.replace(/_/g, " ")}
        </span>
        {job.location?.isRemote && (
          <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
            Remote
          </span>
        )}
      </div>

      {/* Short Description */}
      {job.shortDescription && (
        <p className="text-gray-600 text-sm line-clamp-2 mb-4">{job.shortDescription}</p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <div>
          <p className="text-[#39B54A] font-semibold">
            {formatCurrency(job.salary?.min || 0)}
            {job.salary?.max ? ` - ${formatCurrency(job.salary.max)}` : ""}
          </p>
          <p className="text-xs text-gray-400 capitalize">
            {job.salary?.type?.replace(/_/g, " ")}
            {job.salary?.negotiable && " • Negotiable"}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400">Posted {formatDate(job.createdAt)}</p>
          {job.applicationDeadline && (
            <p className="text-xs text-orange-500">
              Deadline: {new Date(job.applicationDeadline).toLocaleDateString("en-NP", { month: "short", day: "numeric" })}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-linear-to-br from-[#39B54A] via-[#2d913c] to-[#247a32] text-white">
        <div className="max-w-7xl mx-auto px-4 py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Find Your Next Caregiving Role
            </h1>
            <p className="text-lg text-green-100 max-w-2xl mx-auto">
              Browse opportunities from families across Nepal looking for dedicated caregivers like you
            </p>
          </motion.div>

          {/* Search Bar */}
          <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            onSubmit={handleSearch}
            className="max-w-3xl mx-auto"
          >
            <div className="bg-white rounded-2xl p-2 flex flex-col md:flex-row gap-2">
              <div className="flex-1 relative">
                <svg className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => handleFilterChange("search", e.target.value)}
                  placeholder="Search jobs..."
                  className="w-full pl-12 pr-4 py-3 text-gray-900 rounded-xl border-0 focus:outline-none focus:ring-2 focus:ring-[#39B54A] bg-gray-50"
                />
              </div>
              <select
                value={filters.state}
                onChange={(e) => handleFilterChange("state", e.target.value)}
                className="px-4 py-3 text-gray-900 rounded-xl border-0 focus:outline-none focus:ring-2 focus:ring-[#39B54A] bg-gray-50"
              >
                {STATES.map((state) => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </select>
              <button
                type="submit"
                className="px-8 py-3 bg-[#39B54A] text-white rounded-xl hover:bg-[#2d913c] transition-colors font-semibold"
              >
                Search
              </button>
            </div>
          </motion.form>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Featured Jobs */}
        {featuredJobs.length > 0 && (
          <motion.section
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mb-12"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Featured Opportunities</h2>
              <span className="text-sm text-gray-500">{featuredJobs.length} featured jobs</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredJobs.slice(0, 3).map((job) => (
                <JobCard key={job._id} job={job} featured />
              ))}
            </div>
          </motion.section>
        )}

        {/* Filters & Results */}
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters Sidebar */}
          <div className="lg:w-64 shrink-0">
            <div className="lg:hidden mb-4">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl flex items-center justify-between"
              >
                <span className="font-medium text-gray-700">Filters</span>
                <svg
                  className={`w-5 h-5 text-gray-400 transition-transform ${showFilters ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>

            <AnimatePresence>
              {(showFilters || typeof window !== "undefined" && window.innerWidth >= 1024) && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="bg-white rounded-2xl border border-gray-200 p-6 lg:sticky lg:top-4"
                >
                  <h3 className="font-semibold text-gray-900 mb-4">Filters</h3>

                  <div className="space-y-6">
                    {/* Category */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                      <select
                        value={filters.category}
                        onChange={(e) => handleFilterChange("category", e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#39B54A] focus:border-transparent"
                      >
                        {JOB_CATEGORIES.map((cat) => (
                          <option key={cat.value} value={cat.value}>{cat.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* Employment Type */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Employment Type</label>
                      <select
                        value={filters.employmentType}
                        onChange={(e) => handleFilterChange("employmentType", e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#39B54A] focus:border-transparent"
                      >
                        {EMPLOYMENT_TYPES.map((type) => (
                          <option key={type.value} value={type.value}>{type.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* Salary Range */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Salary Range</label>
                      <select
                        value={filters.salaryRange}
                        onChange={(e) => handleFilterChange("salaryRange", e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#39B54A] focus:border-transparent"
                      >
                        {SALARY_RANGES.map((range) => (
                          <option key={range.value} value={range.value}>{range.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* Sort By */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
                      <select
                        value={filters.sortBy}
                        onChange={(e) => handleFilterChange("sortBy", e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#39B54A] focus:border-transparent"
                      >
                        <option value="recent">Most Recent</option>
                        <option value="salary_high">Highest Salary</option>
                        <option value="salary_low">Lowest Salary</option>
                        <option value="deadline">Deadline Soon</option>
                      </select>
                    </div>

                    {/* Apply Button */}
                    <button
                      onClick={() => fetchJobs(1)}
                      className="w-full px-4 py-3 bg-[#39B54A] text-white rounded-xl hover:bg-[#2d913c] transition-colors font-medium"
                    >
                      Apply Filters
                    </button>

                    {/* Clear Button */}
                    <button
                      onClick={() => {
                        setFilters({
                          category: "all",
                          employmentType: "all",
                          salaryRange: "all",
                          state: "All Provinces",
                          search: "",
                          sortBy: "recent",
                        });
                      }}
                      className="w-full px-4 py-2 text-gray-500 hover:text-gray-700 transition-colors text-sm"
                    >
                      Clear All Filters
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Jobs Grid */}
          <div className="flex-1">
            {/* Results Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">All Jobs</h2>
                <p className="text-gray-500">{pagination.total} jobs found</p>
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => router.push("/jobs/saved")}
                  className="px-4 py-2 text-[#39B54A] hover:bg-green-50 border border-[#39B54A] rounded-xl transition-colors flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                  Saved ({savedJobs.size})
                </button>
              </div>
            </div>

            {/* Loading */}
            {loading && (
              <div className="flex items-center justify-center py-12">
                <div className="w-12 h-12 border-4 border-gray-200 border-t-[#39B54A] rounded-full animate-spin"></div>
              </div>
            )}

            {/* Jobs Grid */}
            {!loading && jobs.length > 0 && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {jobs.map((job) => (
                    <JobCard key={job._id} job={job} />
                  ))}
                </div>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-8">
                    <button
                      onClick={() => fetchJobs(pagination.page - 1)}
                      disabled={pagination.page === 1}
                      className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <span className="px-4 py-2 text-gray-600">
                      Page {pagination.page} of {pagination.totalPages}
                    </span>
                    <button
                      onClick={() => fetchJobs(pagination.page + 1)}
                      disabled={pagination.page === pagination.totalPages}
                      className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}

            {/* Empty State */}
            {!loading && jobs.length === 0 && (
              <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
                <svg className="w-20 h-20 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No jobs found</h3>
                <p className="text-gray-500 mb-6">Try adjusting your filters or search terms</p>
                <button
                  onClick={() => {
                    setFilters({
                      category: "all",
                      employmentType: "all",
                      salaryRange: "all",
                      state: "All Provinces",
                      search: "",
                      sortBy: "recent",
                    });
                  }}
                  className="px-6 py-3 bg-[#39B54A] text-white rounded-xl hover:bg-[#2d913c] transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
