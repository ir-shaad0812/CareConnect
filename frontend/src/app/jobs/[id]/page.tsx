// ============================================
// JOB DETAIL PAGE (PUBLIC)
// Caregiver view of job with apply functionality
// ============================================

"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { jobService } from "@/services";
import type { Job } from "@/services";

interface PageParams {
  id: string;
}

export default function JobDetailPage({ params }: { params: Promise<PageParams> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [applied, setApplied] = useState(false);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [applying, setApplying] = useState(false);
  const [coverLetter, setCoverLetter] = useState("");
  const [expectedSalary, setExpectedSalary] = useState("");
  const [availability, setAvailability] = useState("");
  const [similarJobs, setSimilarJobs] = useState<Job[]>([]);

  useEffect(() => {
    fetchJob();
  }, [resolvedParams.id]);

  const fetchJob = async () => {
    try {
      setLoading(true);
      const jobData = await jobService.getJob(resolvedParams.id);
      setJob(jobData);
      
      // Check if already applied
      if (jobData.hasApplied) {
        setApplied(true);
      }
      
      // Check if saved
      if (jobData.isSaved) {
        setSaved(true);
      }

      // Fetch similar jobs
      const similar = await jobService.listJobs({
        category: jobData.category,
        limit: 3,
      });
      setSimilarJobs(similar.data?.filter((j: Job) => j._id !== jobData._id).slice(0, 3) || []);
    } catch (error) {
      console.error("Error fetching job:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    try {
      setApplying(true);
      await jobService.applyToJob(resolvedParams.id, {
        coverLetter,
        availability,
        ...(expectedSalary
          ? { expectedSalary: { amount: parseInt(expectedSalary, 10), period: "monthly" } }
          : {}),
      });
      setApplied(true);
      setShowApplyModal(false);
    } catch (error) {
      console.error("Error applying to job:", error);
    } finally {
      setApplying(false);
    }
  };

  const handleSave = async () => {
    try {
      if (saved) {
        await jobService.unsaveJob(resolvedParams.id);
        setSaved(false);
      } else {
        await jobService.saveJob(resolvedParams.id);
        setSaved(true);
      }
    } catch (error) {
      console.error("Error saving job:", error);
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
    return new Date(date).toLocaleDateString("en-NP", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getTimeAgo = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    return `${Math.floor(days / 30)} months ago`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-gray-200 border-t-[#39B54A] rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Job not found</h2>
          <p className="text-gray-500 mb-4">This job may have been removed or is no longer available.</p>
          <button
            onClick={() => router.push("/jobs")}
            className="px-6 py-3 bg-[#39B54A] text-white rounded-xl hover:bg-[#2d913c] transition-colors"
          >
            Browse Jobs
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Jobs
          </button>

          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                {job.monetization?.isFeatured && (
                  <span className="px-3 py-1 bg-linear-to-r from-[#39B54A] to-[#2d913c] text-white text-xs font-semibold rounded-full">
                    Featured
                  </span>
                )}
                {(job.urgencyLevel === "urgent" || job.urgencyLevel === "critical") && (
                  <span className="px-3 py-1 bg-linear-to-r from-red-500 to-orange-500 text-white text-xs font-semibold rounded-full">
                    Urgent Hiring
                  </span>
                )}
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-3">{job.title}</h1>
              <div className="flex flex-wrap items-center gap-4 text-gray-500">
                <span className="flex items-center gap-1">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {job.location?.city}, {job.location?.state}
                </span>
                <span className="flex items-center gap-1">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Posted {getTimeAgo(job.createdAt)}
                </span>
                <span className="flex items-center gap-1">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  {job.analytics?.applications || 0} applicants
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleSave}
                className={`p-3 rounded-xl border transition-colors ${
                  saved
                    ? "bg-[#39B54A] text-white border-[#39B54A]"
                    : "bg-white text-gray-600 border-gray-200 hover:border-[#39B54A] hover:text-[#39B54A]"
                }`}
              >
                <svg className="w-6 h-6" fill={saved ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
              </button>
              <button
                onClick={() => setShowApplyModal(true)}
                disabled={applied}
                className={`px-8 py-3 rounded-xl font-semibold transition-colors ${
                  applied
                    ? "bg-green-100 text-green-700 cursor-default"
                    : "bg-[#39B54A] text-white hover:bg-[#2d913c]"
                }`}
              >
                {applied ? (
                  <span className="flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Applied
                  </span>
                ) : (
                  "Apply Now"
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quick Info Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                <p className="text-xs text-gray-500 mb-1">Salary</p>
                <p className="text-lg font-bold text-[#39B54A]">
                  {formatCurrency(job.salary?.min || 0)}
                  {job.salary?.max && job.salary.max !== job.salary.min ? "+" : ""}
                </p>
                <p className="text-xs text-gray-400 capitalize">{job.salary?.type?.replace(/_/g, " ")}</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                <p className="text-xs text-gray-500 mb-1">Type</p>
                <p className="text-lg font-bold text-gray-900 capitalize">
                  {job.employmentType?.replace(/_/g, " ")}
                </p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                <p className="text-xs text-gray-500 mb-1">Experience</p>
                <p className="text-lg font-bold text-gray-900">
                  {job.requirements?.minExperience || 0}+ years
                </p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                <p className="text-xs text-gray-500 mb-1">Vacancies</p>
                <p className="text-lg font-bold text-gray-900">
                  {(job.vacancies?.total || 1) - (job.vacancies?.filled || 0)} open
                </p>
              </div>
            </div>

            {/* Description */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Job Description</h2>
              <div className="prose prose-gray max-w-none">
                <p className="text-gray-600 whitespace-pre-wrap">{job.description}</p>
              </div>
            </div>

            {/* Requirements */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Requirements</h2>
              <div className="space-y-4">
                {job.requirements?.minExperience !== undefined && (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Experience</p>
                      <p className="text-sm text-gray-500">Minimum {job.requirements.minExperience} years</p>
                    </div>
                  </div>
                )}

                {job.requirements?.education && (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                      <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d="M12 14l9-5-9-5-9 5 9 5z" />
                        <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Education</p>
                      <p className="text-sm text-gray-500">{job.requirements.education}</p>
                    </div>
                  </div>
                )}

                {job.requirements?.skills && job.requirements.skills.length > 0 && (
                  <div>
                    <p className="font-medium text-gray-900 mb-2">Required Skills</p>
                    <div className="flex flex-wrap gap-2">
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
                    <p className="font-medium text-gray-900 mb-2">Required Certifications</p>
                    <div className="flex flex-wrap gap-2">
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
                      <svg className="w-5 h-5 text-[#39B54A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                      Background check required
                    </span>
                  )}
                  {job.requirements?.drivingLicense && (
                    <span className="flex items-center gap-2 text-sm text-gray-600">
                      <svg className="w-5 h-5 text-[#39B54A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                      </svg>
                      Driving license required
                    </span>
                  )}
                  {job.requirements?.ownTransport && (
                    <span className="flex items-center gap-2 text-sm text-gray-600">
                      <svg className="w-5 h-5 text-[#39B54A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
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
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Benefits</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {job.benefits.map((benefit: string, index: number) => (
                    <div key={index} className="flex items-center gap-3 text-gray-600">
                      <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                        <svg className="w-4 h-4 text-[#39B54A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <span>{benefit}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Schedule */}
            {job.schedule && (
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Schedule</h2>
                <div className="space-y-3">
                  {job.schedule.hoursPerWeek && (
                    <div className="flex items-center gap-3">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-gray-600">{job.schedule.hoursPerWeek} hours per week</span>
                    </div>
                  )}
                  {job.schedule.startDate && (
                    <div className="flex items-center gap-3">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="text-gray-600">Start date: {formatDate(job.schedule.startDate)}</span>
                    </div>
                  )}
                  {job.schedule.shiftDetails && (
                    <div className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-gray-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      <span className="text-gray-600">{job.schedule.shiftDetails}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Application Deadline */}
            {job.applicationDeadline && (
              <div className="bg-orange-50 rounded-2xl border border-orange-200 p-6">
                <div className="flex items-center gap-3 mb-2">
                  <svg className="w-6 h-6 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h3 className="font-semibold text-orange-800">Application Deadline</h3>
                </div>
                <p className="text-orange-700 text-lg font-medium">{formatDate(job.applicationDeadline)}</p>
              </div>
            )}

            {/* Job Details Card */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Job Details</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Category</span>
                  <span className="text-gray-900 font-medium capitalize">{job.category?.replace(/_/g, " ")}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Location</span>
                  <span className="text-gray-900 font-medium">
                    {job.location?.isRemote ? "Remote" : `${job.location?.city}, ${job.location?.state}`}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Employment</span>
                  <span className="text-gray-900 font-medium capitalize">{job.employmentType?.replace(/_/g, " ")}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Posted</span>
                  <span className="text-gray-900 font-medium">{formatDate(job.createdAt)}</span>
                </div>
                {job.salary?.negotiable && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Salary</span>
                    <span className="text-[#39B54A] font-medium">Negotiable</span>
                  </div>
                )}
              </div>
            </div>

            {/* Apply CTA */}
            <div className="bg-linear-to-br from-[#39B54A] to-[#2d913c] rounded-2xl p-6 text-white">
              <h3 className="font-semibold text-xl mb-2">Interested in this job?</h3>
              <p className="text-green-100 mb-4">Submit your application and stand out to the employer.</p>
              <button
                onClick={() => setShowApplyModal(true)}
                disabled={applied}
                className={`w-full py-3 rounded-xl font-semibold transition-colors ${
                  applied
                    ? "bg-white/20 text-white/80 cursor-default"
                    : "bg-white text-[#39B54A] hover:bg-green-50"
                }`}
              >
                {applied ? "Already Applied" : "Apply Now"}
              </button>
            </div>

            {/* Tags */}
            {job.tags && job.tags.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Tags</h3>
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
        </div>

        {/* Similar Jobs */}
        {similarJobs.length > 0 && (
          <div className="mt-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Similar Jobs</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {similarJobs.map((similarJob) => (
                <motion.div
                  key={similarJob._id}
                  whileHover={{ y: -4 }}
                  className="bg-white rounded-2xl border border-gray-200 p-6 cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => router.push(`/jobs/${similarJob._id}`)}
                >
                  <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">{similarJob.title}</h3>
                  <p className="text-sm text-gray-500 mb-3">
                    {similarJob.location?.city}, {similarJob.location?.state}
                  </p>
                  <p className="text-[#39B54A] font-semibold">
                    {formatCurrency(similarJob.salary?.min || 0)}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Apply Modal */}
      <AnimatePresence>
        {showApplyModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowApplyModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto"
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Apply for this Job</h2>
              <p className="text-gray-500 mb-6">{job.title}</p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cover Letter *
                  </label>
                  <textarea
                    value={coverLetter}
                    onChange={(e) => setCoverLetter(e.target.value)}
                    placeholder="Tell the employer why you're a great fit for this position..."
                    rows={6}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#39B54A] focus:border-transparent resize-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Expected Salary (₦)
                  </label>
                  <input
                    type="number"
                    value={expectedSalary}
                    onChange={(e) => setExpectedSalary(e.target.value)}
                    placeholder="Enter your expected salary"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#39B54A] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Availability
                  </label>
                  <input
                    type="text"
                    value={availability}
                    onChange={(e) => setAvailability(e.target.value)}
                    placeholder="e.g., Available immediately, 2 weeks notice"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#39B54A] focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowApplyModal(false)}
                  className="flex-1 px-4 py-3 text-gray-600 hover:text-gray-900 border border-gray-200 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApply}
                  disabled={applying || !coverLetter.trim()}
                  className="flex-1 px-4 py-3 bg-[#39B54A] text-white rounded-xl hover:bg-[#2d913c] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {applying ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Applying...
                    </>
                  ) : (
                    "Submit Application"
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
