// ============================================
// ADMIN JOBS DASHBOARD PAGE
// Premium SaaS-style job marketplace management
// ============================================

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import AdminLayout from "@/components/layout/AdminLayout";
import { jobService } from "@/services";
import type { Job, JobDashboardStats, CareRequest, HiringFunnel } from "@/services";
import { DonutChart, ProgressBar } from "@/components/ui/Chart";

// Job status badge colors
const statusColors: Record<string, { bg: string; text: string; dot: string }> = {
  draft: { bg: "bg-gray-100", text: "text-gray-700", dot: "bg-gray-400" },
  active: { bg: "bg-green-100", text: "text-green-700", dot: "bg-green-500" },
  paused: { bg: "bg-yellow-100", text: "text-yellow-700", dot: "bg-yellow-500" },
  filled: { bg: "bg-blue-100", text: "text-blue-700", dot: "bg-blue-500" },
  closed: { bg: "bg-gray-100", text: "text-gray-600", dot: "bg-gray-400" },
  expired: { bg: "bg-red-100", text: "text-red-700", dot: "bg-red-500" },
  cancelled: { bg: "bg-red-100", text: "text-red-700", dot: "bg-red-400" },
};

// Urgency level colors
const urgencyColors: Record<string, string> = {
  low: "text-gray-500",
  normal: "text-blue-500",
  high: "text-orange-500",
  urgent: "text-red-500",
  critical: "text-red-700",
};

export default function AdminJobsDashboardPage() {
  const [stats, setStats] = useState<JobDashboardStats | null>(null);
  const [recentJobs, setRecentJobs] = useState<Job[]>([]);
  const [pendingRequests, setPendingRequests] = useState<CareRequest[]>([]);
  const [hiringFunnel, setHiringFunnel] = useState<HiringFunnel | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"overview" | "jobs" | "requests" | "analytics">("overview");

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      setError("");
      const [statsData, jobsData, requestsData, funnelData] = await Promise.all([
        jobService.getAdminDashboardStats(),
        jobService.getAdminJobs({ limit: 5, sortBy: "createdAt", sortOrder: "desc" }),
        jobService.getCareRequests({ status: "pending", limit: 5 }),
        jobService.getHiringFunnel(),
      ]);
      setStats(statsData);
      setRecentJobs(jobsData.data || []);
      setPendingRequests(requestsData.data || []);
      setHiringFunnel(funnelData);
    } catch (err: unknown) {
      const error = err as { message?: string };
      setError(error.message || "Failed to load dashboard data");
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatSalary = (salary: Job["salary"]) => {
    if (!salary) return "Not specified";
    const formatter = new Intl.NumberFormat("en-NP", {
      style: "currency",
      currency: salary.currency || "NPR",
      maximumFractionDigits: 0,
    });
    if (salary.min === salary.max) {
      return `${formatter.format(salary.min)}/${salary.type}`;
    }
    return `${formatter.format(salary.min)} - ${formatter.format(salary.max)}/${salary.type}`;
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <div className="animate-spin rounded-full h-14 w-14 border-4 border-[#E1E6EF] border-t-[#39B54A]"></div>
          <p className="text-gray-500 animate-pulse">Loading job marketplace...</p>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="bg-linear-to-br from-red-50 to-red-100 border border-red-200 rounded-2xl p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-red-600 font-medium mb-4">{error}</p>
          <button
            onClick={fetchDashboardData}
            className="px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all font-medium"
          >
            Try Again
          </button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Job Marketplace</h1>
            <p className="text-gray-500 mt-1">Manage job listings, applications, and care requests</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/admin/jobs/create"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-linear-to-r from-[#39B54A] to-[#2d913c] text-white rounded-xl hover:shadow-lg hover:shadow-green-200 transition-all font-medium"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Post New Job
            </Link>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-xl w-fit">
          {[
            { key: "overview", label: "Overview", icon: "M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" },
            { key: "jobs", label: "Jobs", icon: "M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" },
            { key: "requests", label: "Care Requests", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" },
            { key: "analytics", label: "Analytics", icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                activeTab === tab.key
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
              </svg>
              {tab.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {activeTab === "overview" && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Active Jobs */}
                <Link href="/admin/jobs/list?status=active">
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    className="bg-linear-to-br from-green-50 to-green-100 border border-green-200 rounded-2xl p-6 cursor-pointer hover:shadow-lg transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-green-600">Active Jobs</p>
                        <p className="text-3xl font-bold text-green-700 mt-1">
                          {stats?.jobs?.active || 0}
                        </p>
                        <p className="text-xs text-green-600 mt-2">
                          {stats?.jobs?.total || 0} total jobs
                        </p>
                      </div>
                      <div className="w-12 h-12 bg-green-200 rounded-xl flex items-center justify-center">
                        <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                    </div>
                  </motion.div>
                </Link>

                {/* Pending Applications */}
                <Link href="/admin/jobs/applications?status=pending">
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    className="bg-linear-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-2xl p-6 cursor-pointer hover:shadow-lg transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-blue-600">Pending Applications</p>
                        <p className="text-3xl font-bold text-blue-700 mt-1">
                          {stats?.applications?.pending || 0}
                        </p>
                        <p className="text-xs text-blue-600 mt-2">
                          {stats?.applications?.total || 0} total applications
                        </p>
                      </div>
                      <div className="w-12 h-12 bg-blue-200 rounded-xl flex items-center justify-center">
                        <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                    </div>
                  </motion.div>
                </Link>

                {/* Care Requests */}
                <Link href="/admin/jobs/care-requests">
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    className="bg-linear-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-2xl p-6 cursor-pointer hover:shadow-lg transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-orange-600">Care Requests</p>
                        <p className="text-3xl font-bold text-orange-700 mt-1">
                          {stats?.careRequests?.pending || 0}
                        </p>
                        <p className="text-xs text-orange-600 mt-2">
                          awaiting review
                        </p>
                      </div>
                      <div className="w-12 h-12 bg-orange-200 rounded-xl flex items-center justify-center">
                        <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                      </div>
                    </div>
                  </motion.div>
                </Link>

                {/* Hired This Month */}
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className="bg-linear-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-2xl p-6"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-purple-600">Hired This Month</p>
                      <p className="text-3xl font-bold text-purple-700 mt-1">
                        {stats?.applications?.hired || 0}
                      </p>
                      <p className="text-xs text-purple-600 mt-2">
                        {stats?.analytics?.conversionRate?.toFixed(1) || 0}% conversion
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-purple-200 rounded-xl flex items-center justify-center">
                      <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                      </svg>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Two Column Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Jobs */}
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                  <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900">Recent Jobs</h2>
                    <Link
                      href="/admin/jobs/list"
                      className="text-sm text-[#39B54A] hover:text-[#2d913c] font-medium"
                    >
                      View All
                    </Link>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {recentJobs.length === 0 ? (
                      <div className="p-8 text-center text-gray-500">
                        <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        <p>No jobs posted yet</p>
                        <Link href="/admin/jobs/create" className="text-[#39B54A] hover:underline text-sm mt-2 inline-block">
                          Post your first job
                        </Link>
                      </div>
                    ) : (
                      recentJobs.map((job) => (
                        <Link key={job._id} href={`/admin/jobs/${job._id}`}>
                          <div className="p-4 hover:bg-gray-50 transition-colors cursor-pointer">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <h3 className="font-medium text-gray-900 truncate">{job.title}</h3>
                                <p className="text-sm text-gray-500 mt-0.5">{job.location?.city}</p>
                                <div className="flex items-center gap-3 mt-2">
                                  <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${statusColors[job.status]?.bg} ${statusColors[job.status]?.text} px-2 py-1 rounded-full`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${statusColors[job.status]?.dot}`}></span>
                                    {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                                  </span>
                                  <span className="text-xs text-gray-400">
                                    {job.analytics?.applications || 0} applications
                                  </span>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-medium text-gray-900">{formatSalary(job.salary)}</p>
                                <p className="text-xs text-gray-500 mt-1">{formatDate(job.createdAt)}</p>
                              </div>
                            </div>
                          </div>
                        </Link>
                      ))
                    )}
                  </div>
                </div>

                {/* Pending Care Requests */}
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                  <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900">Care Requests</h2>
                    <Link
                      href="/admin/jobs/care-requests"
                      className="text-sm text-[#39B54A] hover:text-[#2d913c] font-medium"
                    >
                      View All
                    </Link>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {pendingRequests.length === 0 ? (
                      <div className="p-8 text-center text-gray-500">
                        <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p>No pending care requests</p>
                      </div>
                    ) : (
                      pendingRequests.map((request) => (
                        <Link key={request._id} href={`/admin/jobs/care-requests/${request._id}`}>
                          <div className="p-4 hover:bg-gray-50 transition-colors cursor-pointer">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <h3 className="font-medium text-gray-900 truncate">{request.title}</h3>
                                <p className="text-sm text-gray-500 mt-0.5">
                                  {request.requestedBy?.fullName || "Unknown"}
                                </p>
                                <div className="flex items-center gap-3 mt-2">
                                  <span className={`text-xs font-medium ${urgencyColors[request.urgencyLevel] || "text-gray-500"}`}>
                                    {request.urgencyLevel?.toUpperCase()}
                                  </span>
                                  <span className="text-xs text-gray-400">
                                    {request.location?.city}
                                  </span>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-xs text-gray-500">{formatDate(request.createdAt)}</p>
                                {request.budget && (
                                  <p className="text-sm font-medium text-gray-700 mt-1">
                                    Rs.{request.budget.min?.toLocaleString()} - Rs.{request.budget.max?.toLocaleString()}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        </Link>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Hiring Funnel */}
              {hiringFunnel && hiringFunnel.total > 0 && (
                <div className="bg-white rounded-2xl border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-6">Hiring Funnel</h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
                    {[
                      { label: "Applied", value: hiringFunnel.total, color: "bg-gray-500" },
                      { label: "Reviewed", value: hiringFunnel.underReview, color: "bg-blue-400" },
                      { label: "Shortlisted", value: hiringFunnel.shortlisted, color: "bg-blue-500" },
                      { label: "Interviewed", value: hiringFunnel.interviewed, color: "bg-indigo-500" },
                      { label: "Offer Sent", value: hiringFunnel.offerExtended, color: "bg-purple-500" },
                      { label: "Hired", value: hiringFunnel.hired, color: "bg-green-500" },
                      { label: "Rejected", value: hiringFunnel.rejected, color: "bg-red-400" },
                      { label: "Withdrawn", value: hiringFunnel.withdrawn, color: "bg-gray-400" },
                    ].map((stage) => (
                      <div key={stage.label} className="text-center">
                        <div className={`w-12 h-12 ${stage.color} rounded-xl flex items-center justify-center text-white font-bold text-lg mx-auto`}>
                          {stage.value}
                        </div>
                        <p className="text-xs text-gray-500 mt-2">{stage.label}</p>
                      </div>
                    ))}
                  </div>
                  {hiringFunnel.conversionRates && (
                    <div className="mt-6 pt-6 border-t border-gray-100">
                      <h3 className="text-sm font-medium text-gray-700 mb-4">Conversion Rates</h3>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        {Object.entries(hiringFunnel.conversionRates).map(([key, value]) => (
                          <div key={key}>
                            <ProgressBar
                              value={parseFloat(value as string)}
                              max={100}
                              color="#39B54A"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              {key.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase())}
                            </p>
                            <p className="text-sm font-medium text-gray-700">{value}%</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === "jobs" && (
            <motion.div
              key="jobs"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <JobsListContent />
            </motion.div>
          )}

          {activeTab === "requests" && (
            <motion.div
              key="requests"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <CareRequestsContent />
            </motion.div>
          )}

          {activeTab === "analytics" && (
            <motion.div
              key="analytics"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <AnalyticsContent stats={stats} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AdminLayout>
  );
}

// ============================================
// JOBS LIST CONTENT
// ============================================

function JobsListContent() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchJobs();
  }, [statusFilter, page]);

  const fetchJobs = async () => {
    try {
      setIsLoading(true);
      const params: Record<string, string | number> = { page, limit: 10 };
      if (statusFilter !== "all") params.status = statusFilter;
      const data = await jobService.getAdminJobs(params);
      setJobs(data.data || []);
      setTotalPages(data.pagination?.pages || 1);
    } catch (error) {
      console.error("Error fetching jobs:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatSalary = (salary: Job["salary"]) => {
    if (!salary) return "Not specified";
    const formatter = new Intl.NumberFormat("en-NP", {
      style: "currency",
      currency: salary.currency || "NPR",
      maximumFractionDigits: 0,
    });
    return `${formatter.format(salary.min)}/${salary.type}`;
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      {/* Filters */}
      <div className="p-4 border-b border-gray-100 flex flex-wrap items-center gap-3">
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#39B54A] focus:border-transparent"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="draft">Draft</option>
          <option value="paused">Paused</option>
          <option value="filled">Filled</option>
          <option value="closed">Closed</option>
        </select>
        <Link
          href="/admin/jobs/create"
          className="ml-auto inline-flex items-center gap-2 px-4 py-2 bg-[#39B54A] text-white rounded-lg hover:bg-[#2d913c] transition-colors text-sm font-medium"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Job
        </Link>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-200 border-t-[#39B54A] mx-auto"></div>
        </div>
      ) : jobs.length === 0 ? (
        <div className="p-8 text-center text-gray-500">
          No jobs found
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
                <tr>
                  <th className="px-6 py-3 text-left">Job</th>
                  <th className="px-6 py-3 text-left">Location</th>
                  <th className="px-6 py-3 text-left">Salary</th>
                  <th className="px-6 py-3 text-left">Applications</th>
                  <th className="px-6 py-3 text-left">Status</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {jobs.map((job) => (
                  <tr key={job._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900">{job.title}</p>
                        <p className="text-xs text-gray-500">{job.category}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{job.location?.city}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{formatSalary(job.salary)}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{job.analytics?.applications || 0}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${statusColors[job.status]?.bg} ${statusColors[job.status]?.text} px-2.5 py-1 rounded-full`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${statusColors[job.status]?.dot}`}></span>
                        {job.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/admin/jobs/${job._id}`}
                        className="text-[#39B54A] hover:text-[#2d913c] text-sm font-medium"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          <div className="p-4 border-t border-gray-100 flex items-center justify-between">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-sm text-gray-500">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ============================================
// CARE REQUESTS CONTENT
// ============================================

function CareRequestsContent() {
  const [requests, setRequests] = useState<CareRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      setIsLoading(true);
      const data = await jobService.getCareRequests({ limit: 20 });
      setRequests(data.data || []);
    } catch (error) {
      console.error("Error fetching care requests:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await jobService.approveCareRequest(id);
      fetchRequests();
    } catch (error) {
      console.error("Error approving request:", error);
    }
  };

  const handleConvert = async (id: string) => {
    // Navigate to convert page
    window.location.href = `/admin/jobs/care-requests/${id}/convert`;
  };

  const urgencyColors: Record<string, string> = {
    low: "text-gray-500 bg-gray-100",
    normal: "text-blue-600 bg-blue-100",
    high: "text-orange-600 bg-orange-100",
    urgent: "text-red-600 bg-red-100",
    critical: "text-red-700 bg-red-200",
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-200 border-t-[#39B54A] mx-auto"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div className="p-6 border-b border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900">Care Requests from Families</h2>
        <p className="text-sm text-gray-500 mt-1">Review and convert requests to job listings</p>
      </div>
      {requests.length === 0 ? (
        <div className="p-8 text-center text-gray-500">
          No care requests at the moment
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {requests.map((request) => (
            <div key={request._id} className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-gray-900">{request.title}</h3>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${urgencyColors[request.urgencyLevel] || urgencyColors.normal}`}>
                      {request.urgencyLevel}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-2 line-clamp-2">{request.description}</p>
                  <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      {request.requestedBy?.fullName}
                    </span>
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {request.location?.city}
                    </span>
                    {request.budget && (
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Rs.{request.budget.min?.toLocaleString()} - Rs.{request.budget.max?.toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleApprove(request._id)}
                    className="px-4 py-2 text-sm font-medium text-green-700 bg-green-100 rounded-lg hover:bg-green-200 transition-colors"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleConvert(request._id)}
                    className="px-4 py-2 text-sm font-medium text-white bg-[#39B54A] rounded-lg hover:bg-[#2d913c] transition-colors"
                  >
                    Convert to Job
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================
// ANALYTICS CONTENT
// ============================================

function AnalyticsContent({ stats }: { stats: JobDashboardStats | null }) {
  if (!stats) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center text-gray-500">
        No analytics data available
      </div>
    );
  }

  const jobStatusData = [
    { label: "Active", value: stats.jobs?.active || 0, color: "#39B54A" },
    { label: "Paused", value: stats.jobs?.paused || 0, color: "#F59E0B" },
    { label: "Draft", value: stats.jobs?.draft || 0, color: "#9CA3AF" },
    { label: "Filled", value: stats.jobs?.filled || 0, color: "#3B82F6" },
    { label: "Expired", value: stats.jobs?.expired || 0, color: "#EF4444" },
  ];

  const applicationStatusData = [
    { label: "Pending", value: stats.applications?.pending || 0, color: "#F59E0B" },
    { label: "Shortlisted", value: stats.applications?.shortlisted || 0, color: "#3B82F6" },
    { label: "Interviewed", value: stats.applications?.interviewed || 0, color: "#8B5CF6" },
    { label: "Hired", value: stats.applications?.hired || 0, color: "#39B54A" },
    { label: "Rejected", value: stats.applications?.rejected || 0, color: "#EF4444" },
  ];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-500">Average Time to Fill</h3>
          <p className="text-3xl font-bold text-gray-900 mt-2">
            {stats.analytics?.avgTimeToFill?.toFixed(0) || 0}
            <span className="text-lg font-normal text-gray-500 ml-1">days</span>
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-500">Conversion Rate</h3>
          <p className="text-3xl font-bold text-gray-900 mt-2">
            {stats.analytics?.conversionRate?.toFixed(1) || 0}
            <span className="text-lg font-normal text-gray-500 ml-1">%</span>
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-500">Total Job Views</h3>
          <p className="text-3xl font-bold text-gray-900 mt-2">
            {stats.analytics?.totalViews?.toLocaleString() || 0}
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Job Status Distribution</h3>
          <div className="flex items-center justify-center">
            <DonutChart data={jobStatusData} size={200} />
          </div>
          <div className="grid grid-cols-3 gap-4 mt-6">
            {jobStatusData.map((item) => (
              <div key={item.label} className="text-center">
                <div className="flex items-center justify-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                  <span className="text-sm text-gray-600">{item.label}</span>
                </div>
                <p className="text-lg font-semibold text-gray-900 mt-1">{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Application Status</h3>
          <div className="flex items-center justify-center">
            <DonutChart data={applicationStatusData} size={200} />
          </div>
          <div className="grid grid-cols-3 gap-4 mt-6">
            {applicationStatusData.map((item) => (
              <div key={item.label} className="text-center">
                <div className="flex items-center justify-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                  <span className="text-sm text-gray-600">{item.label}</span>
                </div>
                <p className="text-lg font-semibold text-gray-900 mt-1">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
