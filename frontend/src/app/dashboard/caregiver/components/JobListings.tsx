"use client";

import { useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  MapPin,
  Clock,
  ArrowRight,
  Briefcase,
  Bookmark,
} from "lucide-react";
import { useCaregiverAvailableJobs } from "@/hooks/useDashboardData";
import { useSocket } from "@/context/SocketContext";
import SafeAvatar from "./SafeAvatar";

const formatServiceType = (type: string) =>
  type?.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) || "";

const timeAgo = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

export default function JobListings() {
  const { data: jobs = [], isLoading: loading, refetch } = useCaregiverAvailableJobs(4);
  const { socket } = useSocket();

  // Real-time: refresh job list when a new job is broadcast
  useEffect(() => {
    if (!socket) return;
    const handleNewJob = () => { refetch(); };
    socket.on("job:new", handleNewJob);
    return () => { socket.off("job:new", handleNewJob); };
  }, [socket, refetch]);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100/80 p-6">
        <div className="h-5 bg-gray-200 rounded w-40 mb-5 animate-pulse" />
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="p-4 rounded-xl border border-gray-100 animate-pulse">
              <div className="flex gap-4">
                <div className="w-11 h-11 rounded-xl bg-gray-200" />
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-48 mb-2" />
                  <div className="h-3 bg-gray-100 rounded w-32 mb-2" />
                  <div className="h-3 bg-gray-100 rounded w-64" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.12, duration: 0.25 }}
      className="bg-white rounded-2xl border border-gray-100/80 p-6"
    >
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Recommended Jobs</h3>
          <p className="text-sm text-gray-500 mt-0.5">Based on your profile & preferences</p>
        </div>
        <Link
          href="/dashboard/caregiver/jobs"
          className="flex items-center gap-1.5 text-sm font-medium text-[#39B54A] hover:text-primary-600 transition-colors"
        >
          View All
          <ArrowRight size={14} />
        </Link>
      </div>

      {jobs.length === 0 ? (
        <div className="text-center py-10 text-gray-400">
          <Briefcase className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No available jobs right now</p>
          <p className="text-xs mt-1">Check back later for new opportunities</p>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((job, index) => (
            <motion.div
              key={job._id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.04 * index, duration: 0.2 }}
              className="group relative p-4 rounded-xl border border-gray-100 hover:border-[#39B54A]/30 hover:shadow-md hover:shadow-[#39B54A]/5 transition-all duration-300"
            >
              <div className="flex gap-4">
                {/* Poster Avatar */}
                <div className="shrink-0">
                  <SafeAvatar
                    src={job.postedBy?.avatar ?? null}
                    name={job.postedBy?.fullName || job.postedBy?.firstName || "User"}
                    size={44}
                    wrapperClassName="rounded-xl border border-gray-200/60"
                    fallbackClassName="bg-linear-to-br from-gray-100 to-gray-50 text-gray-600 font-bold text-sm rounded-xl"
                  />
                </div>

                {/* Job Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 group-hover:text-[#39B54A] transition-colors">
                        {job.title}
                      </h4>
                      <span className="text-xs text-gray-500">
                        {job.postedBy?.fullName || `${job.postedBy?.firstName || ""} ${job.postedBy?.lastName || ""}`.trim() || "Admin"}
                      </span>
                    </div>
                    <button className="p-1.5 text-gray-300 hover:text-[#39B54A] transition-colors opacity-0 group-hover:opacity-100">
                      <Bookmark size={16} />
                    </button>
                  </div>

                  {/* Meta */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2.5">
                    {job.location && (
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <MapPin size={12} className="text-gray-400" />
                        {job.location.city}{job.location.state ? `, ${job.location.state}` : ""}
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <Briefcase size={12} className="text-gray-400" />
                      {formatServiceType(job.serviceType)}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <Clock size={12} className="text-gray-400" />
                      {timeAgo(job.createdAt)}
                    </span>
                  </div>

                  {/* Tags */}
                  {job.tags && job.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2.5">
                      {job.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 text-[11px] font-medium bg-gray-50 text-gray-600 rounded-md border border-gray-100"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Budget */}
                <div className="shrink-0 text-right hidden sm:block">
                  {job.budget && (
                    <>
                      <p className="text-base font-bold text-gray-900">
                        Rs. {job.budget.min?.toLocaleString()}-{job.budget.max?.toLocaleString()}
                      </p>
                      <p className="text-[11px] text-gray-400">{job.budget.type || "per project"}</p>
                    </>
                  )}
                  <Link
                    href={`/dashboard/caregiver/jobs?jobId=${job._id}`}
                    className="mt-3 inline-block px-3.5 py-1.5 bg-[#39B54A] text-white text-xs font-semibold rounded-lg hover:bg-primary-600 transition-colors shadow-sm shadow-[#39B54A]/20"
                  >
                    Apply
                  </Link>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
