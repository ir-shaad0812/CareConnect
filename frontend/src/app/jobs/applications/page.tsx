// ============================================
// MY APPLICATIONS PAGE
// Caregiver's job applications tracker
// ============================================

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { jobService } from "@/services";
import type { JobApplication, Job } from "@/services";

const statusConfig: Record<string, { bg: string; text: string; label: string; icon: string }> = {
  pending: {
    bg: "bg-gray-100",
    text: "text-gray-700",
    label: "Pending Review",
    icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
  },
  reviewed: {
    bg: "bg-blue-100",
    text: "text-blue-700",
    label: "Under Review",
    icon: "M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z",
  },
  shortlisted: {
    bg: "bg-purple-100",
    text: "text-purple-700",
    label: "Shortlisted",
    icon: "M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z",
  },
  interview_scheduled: {
    bg: "bg-indigo-100",
    text: "text-indigo-700",
    label: "Interview Scheduled",
    icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
  },
  offered: {
    bg: "bg-green-100",
    text: "text-green-700",
    label: "Offer Received",
    icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
  },
  hired: {
    bg: "bg-emerald-100",
    text: "text-emerald-700",
    label: "Hired",
    icon: "M5 13l4 4L19 7",
  },
  rejected: {
    bg: "bg-red-100",
    text: "text-red-700",
    label: "Not Selected",
    icon: "M6 18L18 6M6 6l12 12",
  },
  withdrawn: {
    bg: "bg-orange-100",
    text: "text-orange-700",
    label: "Withdrawn",
    icon: "M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636",
  },
};

export default function MyApplicationsPage() {
  const router = useRouter();
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [showWithdrawModal, setShowWithdrawModal] = useState<string | null>(null);
  const [showOfferModal, setShowOfferModal] = useState<JobApplication | null>(null);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const response = await jobService.getMyApplications();
      setApplications(response.data || []);
    } catch (error) {
      console.error("Error fetching applications:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async (applicationId: string) => {
    try {
      await jobService.withdrawApplication(applicationId);
      setApplications((prev) =>
        prev.map((app) =>
          app._id === applicationId ? { ...app, status: "withdrawn" } : app
        )
      );
      setShowWithdrawModal(null);
    } catch (error) {
      console.error("Error withdrawing application:", error);
    }
  };

  const handleOfferResponse = async (applicationId: string, accept: boolean) => {
    try {
      if (accept) {
        await jobService.acceptOffer(applicationId);
      } else {
        await jobService.declineOffer(applicationId);
      }
      await fetchApplications();
      setShowOfferModal(null);
    } catch (error) {
      console.error("Error responding to offer:", error);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-NP", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-NP", {
      style: "currency",
      currency: "NPR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const filteredApplications = filter === "all"
    ? applications
    : applications.filter((app) => app.status === filter);

  const statusCounts = applications.reduce((acc, app) => {
    acc[app.status] = (acc[app.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

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
          <h1 className="text-3xl font-bold text-gray-900">My Applications</h1>
          <p className="text-gray-500 mt-1">Track your job applications and their status</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-3xl font-bold text-gray-900">{applications.length}</p>
            <p className="text-sm text-gray-500">Total Applications</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-3xl font-bold text-purple-600">{statusCounts.shortlisted || 0}</p>
            <p className="text-sm text-gray-500">Shortlisted</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-3xl font-bold text-green-600">{statusCounts.offered || 0}</p>
            <p className="text-sm text-gray-500">Offers</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-3xl font-bold text-emerald-600">{statusCounts.hired || 0}</p>
            <p className="text-sm text-gray-500">Hired</p>
          </div>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              filter === "all"
                ? "bg-[#39B54A] text-white"
                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            All ({applications.length})
          </button>
          {Object.entries(statusConfig).map(([status, config]) => {
            const count = statusCounts[status] || 0;
            if (count === 0) return null;
            return (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  filter === status
                    ? "bg-[#39B54A] text-white"
                    : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                }`}
              >
                {config.label} ({count})
              </button>
            );
          })}
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="w-12 h-12 border-4 border-gray-200 border-t-[#39B54A] rounded-full animate-spin"></div>
          </div>
        )}

        {/* Empty State */}
        {!loading && applications.length === 0 && (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
            <svg className="w-20 h-20 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No applications yet</h3>
            <p className="text-gray-500 mb-6">Start applying to jobs to track them here</p>
            <button
              onClick={() => router.push("/jobs")}
              className="px-6 py-3 bg-[#39B54A] text-white rounded-xl hover:bg-[#2d913c] transition-colors"
            >
              Browse Jobs
            </button>
          </div>
        )}

        {/* Applications List */}
        {!loading && filteredApplications.length > 0 && (
          <AnimatePresence>
            <div className="space-y-4">
              {filteredApplications.map((application) => {
                const job = application.job as Job;
                const config = statusConfig[application.status] || statusConfig.pending;

                return (
                  <motion.div
                    key={application._id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="bg-white rounded-2xl border border-gray-200 p-6"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                      <div className="flex-1">
                        <div className="flex items-start gap-4">
                          <div className={`w-12 h-12 rounded-xl ${config.bg} flex items-center justify-center shrink-0`}>
                            <svg className={`w-6 h-6 ${config.text}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={config.icon} />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3
                              className="text-lg font-semibold text-gray-900 hover:text-[#39B54A] cursor-pointer truncate"
                              onClick={() => router.push(`/jobs/${job._id}`)}
                            >
                              {job.title}
                            </h3>
                            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 mt-1">
                              <span className="flex items-center gap-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                </svg>
                                {job.location?.city}, {job.location?.state}
                              </span>
                              <span>Applied {formatDate(application.appliedAt)}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-3">
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
                                {config.label}
                              </span>
                              {job.salary && (
                                <span className="text-sm text-[#39B54A] font-medium">
                                  {formatCurrency(job.salary.min)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Interview Info */}
                        {application.interview?.scheduledAt && application.status === "interview_scheduled" && (
                          <div className="mt-4 p-4 bg-indigo-50 rounded-xl">
                            <p className="text-sm font-medium text-indigo-800 mb-1">Interview Scheduled</p>
                            <p className="text-indigo-600">
                              {formatDate(application.interview.scheduledAt)}
                              {application.interview.type && ` - ${application.interview.type}`}
                            </p>
                            {application.interview.location && (
                              <p className="text-sm text-indigo-500 mt-1">{application.interview.location}</p>
                            )}
                          </div>
                        )}

                        {/* Offer Info */}
                        {application.offer && application.status === "offered" && (
                          <div className="mt-4 p-4 bg-green-50 rounded-xl">
                            <p className="text-sm font-medium text-green-800 mb-1">Offer Details</p>
                            <p className="text-green-600 font-semibold">
                              {formatCurrency(application.offer.salary)} / {application.offer.salaryPeriod}
                            </p>
                            {application.offer.startDate && (
                              <p className="text-sm text-green-500 mt-1">
                                Start: {formatDate(application.offer.startDate)}
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        {application.status === "offered" && (
                          <>
                            <button
                              onClick={() => setShowOfferModal(application)}
                              className="px-4 py-2 bg-[#39B54A] text-white rounded-lg hover:bg-[#2d913c] transition-colors text-sm"
                            >
                              Respond to Offer
                            </button>
                          </>
                        )}
                        {["pending", "reviewed"].includes(application.status) && (
                          <button
                            onClick={() => setShowWithdrawModal(application._id)}
                            className="px-4 py-2 text-red-600 hover:bg-red-50 border border-red-200 rounded-lg transition-colors text-sm"
                          >
                            Withdraw
                          </button>
                        )}
                        <button
                          onClick={() => router.push(`/jobs/${job._id}`)}
                          className="px-4 py-2 text-gray-600 hover:bg-gray-50 border border-gray-200 rounded-lg transition-colors text-sm"
                        >
                          View Job
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </AnimatePresence>
        )}
      </div>

      {/* Withdraw Modal */}
      <AnimatePresence>
        {showWithdrawModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowWithdrawModal(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl p-6 max-w-md w-full"
            >
              <div className="text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Withdraw Application?</h3>
                <p className="text-gray-500 mb-6">
                  This action cannot be undone. You won&apos;t be able to re-apply to this job.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowWithdrawModal(null)}
                  className="flex-1 px-4 py-2 text-gray-600 hover:text-gray-900 border border-gray-200 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleWithdraw(showWithdrawModal)}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors"
                >
                  Withdraw
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Offer Response Modal */}
      <AnimatePresence>
        {showOfferModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowOfferModal(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl p-6 max-w-md w-full"
            >
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                Respond to Job Offer
              </h3>
              <div className="bg-gray-50 rounded-xl p-4 mb-6">
                <p className="font-medium text-gray-900">
                  {(showOfferModal.job as Job).title}
                </p>
                {showOfferModal.offer && (
                  <p className="text-[#39B54A] font-semibold mt-2">
                    {formatCurrency(showOfferModal.offer.salary)} / {showOfferModal.offer.salaryPeriod}
                  </p>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => handleOfferResponse(showOfferModal._id, false)}
                  className="flex-1 px-4 py-3 text-red-600 hover:bg-red-50 border border-red-200 rounded-xl"
                >
                  Decline
                </button>
                <button
                  onClick={() => handleOfferResponse(showOfferModal._id, true)}
                  className="flex-1 px-4 py-3 bg-[#39B54A] text-white rounded-xl hover:bg-[#2d913c] transition-colors"
                >
                  Accept Offer
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
