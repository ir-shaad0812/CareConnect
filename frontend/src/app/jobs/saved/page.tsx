// ============================================
// SAVED JOBS PAGE
// Caregiver's saved/bookmarked jobs
// ============================================

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { jobService } from "@/services";
import type { Job } from "@/services";

export default function SavedJobsPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSavedJobs();
  }, []);

  const fetchSavedJobs = async () => {
    try {
      setLoading(true);
      const response = await jobService.getSavedJobs();
      setJobs(response.data || []);
    } catch (error) {
      console.error("Error fetching saved jobs:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUnsave = async (jobId: string) => {
    try {
      await jobService.unsaveJob(jobId);
      setJobs((prev) => prev.filter((j) => j._id !== jobId));
    } catch (error) {
      console.error("Error unsaving job:", error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-NP", {
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
    return d.toLocaleDateString("en-NP", { month: "short", day: "numeric" });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <button
            onClick={() => router.push("/jobs")}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Jobs
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Saved Jobs</h1>
          <p className="text-gray-500 mt-1">
            {jobs.length} {jobs.length === 1 ? "job" : "jobs"} saved
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 py-8">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="w-12 h-12 border-4 border-gray-200 border-t-[#39B54A] rounded-full animate-spin"></div>
          </div>
        )}

        {!loading && jobs.length === 0 && (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
            <svg className="w-20 h-20 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No saved jobs yet</h3>
            <p className="text-gray-500 mb-6">Save jobs you&apos;re interested in to review them later</p>
            <button
              onClick={() => router.push("/jobs")}
              className="px-6 py-3 bg-[#39B54A] text-white rounded-xl hover:bg-[#2d913c] transition-colors"
            >
              Browse Jobs
            </button>
          </div>
        )}

        {!loading && jobs.length > 0 && (
          <AnimatePresence>
            <div className="space-y-4">
              {jobs.map((job) => (
                <motion.div
                  key={job._id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-lg transition-all cursor-pointer"
                  onClick={() => router.push(`/jobs/${job._id}`)}
                >
                  <div className="flex flex-col md:flex-row md:items-start gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900 hover:text-[#39B54A] transition-colors">
                          {job.title}
                        </h3>
                        {job.monetization?.isFeatured && (
                          <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                            Featured
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-gray-500 text-sm mb-3">
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          {job.location?.city}, {job.location?.state}
                        </span>
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Posted {formatDate(job.createdAt)}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium capitalize">
                          {job.category?.replace(/_/g, " ")}
                        </span>
                        <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium capitalize">
                          {job.employmentType?.replace(/_/g, " ")}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-3">
                      <div className="text-right">
                        <p className="text-[#39B54A] font-semibold text-lg">
                          {formatCurrency(job.salary?.min || 0)}
                        </p>
                        <p className="text-xs text-gray-400 capitalize">
                          {job.salary?.type?.replace(/_/g, " ")}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUnsave(job._id);
                          }}
                          className="px-4 py-2 text-red-600 hover:bg-red-50 border border-red-200 rounded-lg transition-colors text-sm"
                        >
                          Remove
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/jobs/${job._id}`);
                          }}
                          className="px-4 py-2 bg-[#39B54A] text-white rounded-lg hover:bg-[#2d913c] transition-colors text-sm"
                        >
                          View Job
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
