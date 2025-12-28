// ============================================
// JOB DETAIL PAGE
// Admin view and management of individual job
// ============================================

"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import AdminLayout from "@/components/layout/AdminLayout";
import { jobService } from "@/services";
import type { Job, JobApplication } from "@/services";

// Status configurations
const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
  draft: { bg: "bg-gray-100", text: "text-gray-700", label: "Draft" },
  active: { bg: "bg-green-100", text: "text-green-700", label: "Active" },
  paused: { bg: "bg-yellow-100", text: "text-yellow-700", label: "Paused" },
  filled: { bg: "bg-blue-100", text: "text-blue-700", label: "Filled" },
  closed: { bg: "bg-red-100", text: "text-red-700", label: "Closed" },
  expired: { bg: "bg-orange-100", text: "text-orange-700", label: "Expired" },
};

const applicationStatusConfig: Record<string, { bg: string; text: string }> = {
  pending: { bg: "bg-gray-100", text: "text-gray-700" },
  reviewed: { bg: "bg-blue-100", text: "text-blue-700" },
  shortlisted: { bg: "bg-purple-100", text: "text-purple-700" },
  interview_scheduled: { bg: "bg-indigo-100", text: "text-indigo-700" },
  offered: { bg: "bg-green-100", text: "text-green-700" },
  hired: { bg: "bg-emerald-100", text: "text-emerald-700" },
  rejected: { bg: "bg-red-100", text: "text-red-700" },
  withdrawn: { bg: "bg-orange-100", text: "text-orange-700" },
};

interface PageParams {
  id: string;
}

export default function JobDetailPage({ params }: { params: Promise<PageParams> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [job, setJob] = useState<Job | null>(null);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"details" | "applications" | "analytics">("details");
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchJobData();
  }, [resolvedParams.id]);

  const fetchJobData = async () => {
    try {
      setLoading(true);
      const [jobData, applicationsData] = await Promise.all([
        jobService.getJob(resolvedParams.id),
        jobService.getJobApplications(resolvedParams.id),
      ]);
      setJob(jobData);
      setApplications(applicationsData.data || []);
    } catch (error) {
      console.error("Error fetching job data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (status: string) => {
    if (!job) return;
    try {
      setProcessing(true);
      switch (status) {
        case "active":
          await jobService.publishJob(job._id);
          break;
        case "paused":
          await jobService.pauseJob(job._id);
          break;
        case "closed":
          await jobService.closeJob(job._id);
          break;
        default:
          await jobService.changeJobStatus(job._id, status);
      }
      await fetchJobData();
      setShowStatusModal(false);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error("Error changing status:", errorMessage, error);
      // Could add user-facing error notification here
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (!job) return;
    try {
      setProcessing(true);
      await jobService.deleteJob(job._id);
      router.push("/admin/jobs");
    } catch (error) {
      console.error("Error deleting job:", error);
    } finally {
      setProcessing(false);
    }
  };

  const handleDuplicate = async () => {
    if (!job) return;
    try {
      setProcessing(true);
      const newJob = await jobService.duplicateJob(job._id);
      router.push(`/admin/jobs/${newJob._id}`);
    } catch (error) {
      console.error("Error duplicating job:", error);
    } finally {
      setProcessing(false);
    }
  };

  const handleApplicationAction = async (applicationId: string, action: string) => {
    try {
      switch (action) {
        case "shortlist":
          await jobService.shortlistApplication(applicationId);
          break;
        case "reject":
          await jobService.rejectApplication(applicationId, "Not a good fit");
          break;
        case "hire":
          await jobService.hireApplicant(applicationId);
          break;
      }
      await fetchJobData();
    } catch (error) {
      console.error("Error updating application:", error);
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

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-100">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-[#39B54A] rounded-full animate-spin"></div>
        </div>
      </AdminLayout>
    );
  }

  if (!job) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Job not found</h2>
          <p className="text-gray-500 mb-4">The job you&apos;re looking for doesn&apos;t exist.</p>
          <button
            onClick={() => router.push("/admin/jobs")}
            className="px-6 py-3 bg-[#39B54A] text-white rounded-xl hover:bg-primary-600 transition-colors"
          >
            Back to Jobs
          </button>
        </div>
      </AdminLayout>
    );
  }

  const config = statusConfig[job.status] || statusConfig.draft;

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push("/admin/jobs")}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Jobs
          </button>

          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-gray-900">{job.title}</h1>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${config.bg} ${config.text}`}>
                  {config.label}
                </span>
              </div>
              <div className="flex items-center gap-4 text-gray-500">
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {job.location?.city}, {job.location?.state}
                </span>
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Posted {formatDate(job.createdAt)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowStatusModal(true)}
                className="px-4 py-2 text-gray-600 hover:text-gray-900 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Change Status
              </button>
              <button
                onClick={handleDuplicate}
                disabled={processing}
                className="px-4 py-2 text-gray-600 hover:text-gray-900 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Duplicate
              </button>
              <button
                onClick={() => router.push(`/admin/jobs/${job._id}/edit`)}
                className="px-4 py-2 bg-[#39B54A] text-white rounded-xl hover:bg-primary-600 transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit
              </button>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="px-4 py-2 text-red-600 hover:text-red-700 border border-red-200 rounded-xl hover:bg-red-50 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <div className="flex gap-8">
            {["details", "applications", "analytics"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as typeof activeTab)}
                className={`pb-4 px-1 font-medium transition-colors relative ${
                  activeTab === tab
                    ? "text-[#39B54A]"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <span className="capitalize">{tab}</span>
                {tab === "applications" && applications.length > 0 && (
                  <span className="ml-2 px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">
                    {applications.length}
                  </span>
                )}
                {activeTab === tab && (
                  <motion.div
                    layoutId="jobDetailTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#39B54A]"
                  />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          {activeTab === "details" && (
            <motion.div
              key="details"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-6"
            >
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-6">
                {/* Description */}
                <div className="bg-white rounded-2xl border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Job Description</h3>
                  <div className="prose prose-gray max-w-none">
                    <p className="whitespace-pre-wrap text-gray-600">{job.description}</p>
                  </div>
                </div>

                {/* Requirements */}
                <div className="bg-white rounded-2xl border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Requirements</h3>
                  <div className="space-y-4">
                    {job.requirements?.minExperience !== undefined && (
                      <div>
                        <span className="text-sm text-gray-500">Minimum Experience</span>
                        <p className="text-gray-900">{job.requirements.minExperience} years</p>
                      </div>
                    )}
                    {job.requirements?.education && (
                      <div>
                        <span className="text-sm text-gray-500">Education</span>
                        <p className="text-gray-900">{job.requirements.education}</p>
                      </div>
                    )}
                    {job.requirements?.skills && job.requirements.skills.length > 0 && (
                      <div>
                        <span className="text-sm text-gray-500">Required Skills</span>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {job.requirements.skills.map((skill: string, index: number) => (
                            <span
                              key={index}
                              className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {job.requirements?.certifications && job.requirements.certifications.length > 0 && (
                      <div>
                        <span className="text-sm text-gray-500">Required Certifications</span>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {job.requirements.certifications.map((cert: string, index: number) => (
                            <span
                              key={index}
                              className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm"
                            >
                              {cert}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-4 pt-4 border-t border-gray-100">
                      {job.requirements?.backgroundCheck && (
                        <span className="flex items-center gap-2 text-sm text-gray-600">
                          <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Background check required
                        </span>
                      )}
                      {job.requirements?.drivingLicense && (
                        <span className="flex items-center gap-2 text-sm text-gray-600">
                          <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Driving license required
                        </span>
                      )}
                      {job.requirements?.ownTransport && (
                        <span className="flex items-center gap-2 text-sm text-gray-600">
                          <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Own transport required
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Benefits */}
                {job.benefits && job.benefits.length > 0 && (
                  <div className="bg-white rounded-2xl border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Benefits</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {job.benefits.map((benefit: string, index: number) => (
                        <div key={index} className="flex items-center gap-2 text-gray-600">
                          <svg className="w-5 h-5 text-[#39B54A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {benefit}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Quick Stats */}
                <div className="bg-white rounded-2xl border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Overview</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Category</span>
                      <span className="text-gray-900 font-medium capitalize">{job.category?.replace(/_/g, " ")}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Employment</span>
                      <span className="text-gray-900 font-medium capitalize">{job.employmentType?.replace(/_/g, " ")}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Salary</span>
                      <span className="text-gray-900 font-medium">
                        {formatCurrency(job.salary?.min || 0)}
                        {job.salary?.max ? ` - ${formatCurrency(job.salary.max)}` : ""}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Vacancies</span>
                      <span className="text-gray-900 font-medium">
                        {job.vacancies?.filled || 0} / {job.vacancies?.total || 0} filled
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Deadline</span>
                      <span className="text-gray-900 font-medium">
                        {job.applicationDeadline ? formatDate(job.applicationDeadline) : "No deadline"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Views & Applications */}
                <div className="bg-white rounded-2xl border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Total Views</span>
                      <span className="text-2xl font-bold text-gray-900">{job.analytics?.views || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Applications</span>
                      <span className="text-2xl font-bold text-gray-900">{job.analytics?.applications || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Conversion Rate</span>
                      <span className="text-2xl font-bold text-[#39B54A]">
                        {job.analytics?.views ? ((job.analytics.applications || 0) / job.analytics.views * 100).toFixed(1) : 0}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Tags */}
                {job.tags && job.tags.length > 0 && (
                  <div className="bg-white rounded-2xl border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Tags</h3>
                    <div className="flex flex-wrap gap-2">
                      {job.tags.map((tag: string, index: number) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === "applications" && (
            <motion.div
              key="applications"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {applications.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-2xl border border-gray-200">
                  <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">No applications yet</h3>
                  <p className="text-gray-500">Applications will appear here once caregivers apply</p>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Applicant</th>
                        <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Applied</th>
                        <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Status</th>
                        <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Match Score</th>
                        <th className="text-right px-6 py-4 text-sm font-medium text-gray-500">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {applications.map((app) => {
                        const appConfig = applicationStatusConfig[app.status] || applicationStatusConfig.pending;
                        return (
                          <tr key={app._id} className="hover:bg-gray-50">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-linear-to-br from-[#39B54A] to-primary-600 flex items-center justify-center text-white font-semibold">
                                  {typeof app.caregiver === "object" && app.caregiver?.user
                                    ? typeof app.caregiver.user === "object"
                                      ? ((app.caregiver.user as { fullName?: string; firstName?: string }).fullName?.[0] || (app.caregiver.user as { firstName?: string }).firstName?.[0] || "C")
                                      : "C"
                                    : "C"}
                                </div>
                                <div>
                                  <p className="font-medium text-gray-900">
                                    {typeof app.caregiver === "object" && app.caregiver?.user
                                      ? typeof app.caregiver.user === "object"
                                        ? ((app.caregiver.user as { fullName?: string }).fullName || "Caregiver")
                                        : "Caregiver"
                                      : "Caregiver"}
                                  </p>
                                  <p className="text-sm text-gray-500">
                                    {typeof app.caregiver === "object" && app.caregiver?.user
                                      ? typeof app.caregiver.user === "object"
                                        ? app.caregiver.user.email || ""
                                        : ""
                                      : ""}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-gray-600">{formatDate(app.createdAt)}</td>
                            <td className="px-6 py-4">
                              <span className={`px-3 py-1 rounded-full text-sm font-medium ${appConfig.bg} ${appConfig.text} capitalize`}>
                                {app.status.replace(/_/g, " ")}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-[#39B54A] rounded-full"
                                    style={{ width: `${app.matchScore || 0}%` }}
                                  />
                                </div>
                                <span className="text-sm text-gray-600">{app.matchScore || 0}%</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                {app.status === "pending" && (
                                  <>
                                    <button
                                      onClick={() => handleApplicationAction(app._id, "shortlist")}
                                      className="px-3 py-1 text-sm text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                                    >
                                      Shortlist
                                    </button>
                                    <button
                                      onClick={() => handleApplicationAction(app._id, "reject")}
                                      className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    >
                                      Reject
                                    </button>
                                  </>
                                )}
                                {app.status === "shortlisted" && (
                                  <button
                                    onClick={() => handleApplicationAction(app._id, "hire")}
                                    className="px-3 py-1 text-sm text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                  >
                                    Hire
                                  </button>
                                )}
                                <button
                                  onClick={() => router.push(`/admin/jobs/applications/${app._id}`)}
                                  className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                  View
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === "analytics" && (
            <motion.div
              key="analytics"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-white rounded-2xl border border-gray-200 p-8"
            >
              <div className="text-center py-12">
                <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Analytics Coming Soon</h3>
                <p className="text-gray-500">Detailed job performance analytics will be available here</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Status Change Modal */}
      <AnimatePresence>
        {showStatusModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowStatusModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl p-6 max-w-md w-full"
            >
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Change Job Status</h3>
              <div className="space-y-2">
                {Object.entries(statusConfig).map(([status, cfg]) => (
                  <button
                    key={status}
                    onClick={() => handleStatusChange(status)}
                    disabled={processing || job?.status === status}
                    className={`w-full text-left px-4 py-3 rounded-xl transition-colors flex items-center justify-between ${
                      job?.status === status
                        ? "bg-gray-100 opacity-50 cursor-not-allowed"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${cfg.bg} ${cfg.text}`}>
                      {cfg.label}
                    </span>
                    {job?.status === status && (
                      <span className="text-sm text-gray-400">Current</span>
                    )}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setShowStatusModal(false)}
                className="mt-4 w-full px-4 py-2 text-gray-600 hover:text-gray-900 border border-gray-200 rounded-xl"
              >
                Cancel
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowDeleteModal(false)}
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
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Delete Job?</h3>
                <p className="text-gray-500 mb-6">
                  This action cannot be undone. All applications for this job will also be deleted.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 px-4 py-2 text-gray-600 hover:text-gray-900 border border-gray-200 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={processing}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {processing ? "Deleting..." : "Delete"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AdminLayout>
  );
}
