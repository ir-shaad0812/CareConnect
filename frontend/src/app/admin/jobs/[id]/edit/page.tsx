// ============================================
// ADMIN JOB EDIT PAGE
// Edit existing job posting with premium UI
// ============================================

"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { jobService } from "@/services";
import type { Job } from "@/services";

const JOB_CATEGORIES = [
  { value: "elderly_care", label: "Elderly Care" },
  { value: "child_care", label: "Child Care" },
  { value: "special_needs", label: "Special Needs Care" },
  { value: "medical_care", label: "Medical Care" },
  { value: "companion_care", label: "Companion Care" },
  { value: "respite_care", label: "Respite Care" },
  { value: "palliative_care", label: "Palliative Care" },
  { value: "post_operative_care", label: "Post-Operative Care" },
  { value: "disability_support", label: "Disability Support" },
  { value: "dementia_care", label: "Dementia Care" },
];

const EMPLOYMENT_TYPES = [
  { value: "full_time", label: "Full Time" },
  { value: "part_time", label: "Part Time" },
  { value: "contract", label: "Contract" },
  { value: "temporary", label: "Temporary" },
  { value: "live_in", label: "Live-In" },
];

const EXPERIENCE_LEVELS = [
  { value: "entry", label: "Entry Level (0-1 years)" },
  { value: "intermediate", label: "Intermediate (2-4 years)" },
  { value: "experienced", label: "Experienced (5-7 years)" },
  { value: "senior", label: "Senior (8+ years)" },
];

const NIGERIAN_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue",
  "Borno", "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT",
  "Gombe", "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi",
  "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo",
  "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara"
];

interface FormData {
  title: string;
  description: string;
  category: string;
  employmentType: string;
  experienceLevel: string;
  state: string;
  city: string;
  address: string;
  isRemote: boolean;
  salaryMin: number;
  salaryMax: number;
  salaryPeriod: string;
  isNegotiable: boolean;
  skills: string[];
  certifications: string[];
  benefits: string[];
  workingDays: string[];
  shiftStart: string;
  shiftEnd: string;
  vacanciesTotal: number;
  applicationDeadline: string;
  status: string;
}

export default function EditJobPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [job, setJob] = useState<Job | null>(null);
  const [formData, setFormData] = useState<FormData>({
    title: "",
    description: "",
    category: "",
    employmentType: "",
    experienceLevel: "",
    state: "",
    city: "",
    address: "",
    isRemote: false,
    salaryMin: 0,
    salaryMax: 0,
    salaryPeriod: "monthly",
    isNegotiable: false,
    skills: [],
    certifications: [],
    benefits: [],
    workingDays: [],
    shiftStart: "",
    shiftEnd: "",
    vacanciesTotal: 1,
    applicationDeadline: "",
    status: "active",
  });
  const [skillInput, setSkillInput] = useState("");
  const [certInput, setCertInput] = useState("");
  const [benefitInput, setBenefitInput] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  useEffect(() => {
    fetchJob();
  }, [resolvedParams.id]);

  const fetchJob = async () => {
    try {
      setLoading(true);
      const jobData = await jobService.getJob(resolvedParams.id);
      setJob(jobData);
      
      // Populate form with existing data
      setFormData({
        title: jobData.title || "",
        description: jobData.description || "",
        category: jobData.category || "",
        employmentType: jobData.employmentType || "",
        experienceLevel: String(jobData.requirements?.minExperience || ""),
        state: jobData.location?.state || "",
        city: jobData.location?.city || "",
        address: jobData.location?.address || "",
        isRemote: jobData.location?.isRemote || false,
        salaryMin: jobData.salary?.min || 0,
        salaryMax: jobData.salary?.max || 0,
        salaryPeriod: jobData.salary?.type || "monthly",
        isNegotiable: jobData.salary?.negotiable || false,
        skills: jobData.requirements?.skills || [],
        certifications: jobData.requirements?.certifications || [],
        benefits: jobData.benefits || [],
        workingDays: jobData.schedule?.workingDays || [],
        shiftStart: jobData.schedule?.shiftStart || "",
        shiftEnd: jobData.schedule?.shiftEnd || "",
        vacanciesTotal: jobData.vacancies?.total || 1,
        applicationDeadline: jobData.applicationDeadline 
          ? new Date(jobData.applicationDeadline).toISOString().split("T")[0] 
          : "",
        status: jobData.status || "active",
      });
    } catch (error) {
      console.error("Error fetching job:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const addTag = (type: "skills" | "certifications" | "benefits", value: string) => {
    if (value.trim() && !formData[type].includes(value.trim())) {
      setFormData((prev) => ({
        ...prev,
        [type]: [...prev[type], value.trim()],
      }));
    }
    if (type === "skills") setSkillInput("");
    if (type === "certifications") setCertInput("");
    if (type === "benefits") setBenefitInput("");
  };

  const removeTag = (type: "skills" | "certifications" | "benefits", index: number) => {
    setFormData((prev) => ({
      ...prev,
      [type]: prev[type].filter((_, i) => i !== index),
    }));
  };

  const toggleWorkingDay = (day: string) => {
    setFormData((prev) => ({
      ...prev,
      workingDays: prev.workingDays.includes(day)
        ? prev.workingDays.filter((d) => d !== day)
        : [...prev.workingDays, day],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const updateData: Partial<Job> = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        employmentType: formData.employmentType,
        location: {
          type: job?.location?.type || "Point",
          state: formData.state,
          city: formData.city,
          address: formData.address,
          country: job?.location?.country || "",
          isRemote: formData.isRemote,
        },
        salary: {
          type: formData.salaryPeriod,
          min: Number(formData.salaryMin),
          max: Number(formData.salaryMax),
          currency: job?.salary?.currency || "NPR",
          negotiable: formData.isNegotiable,
        },
        requirements: {
          minExperience: Number(formData.experienceLevel) || 0,
          skills: formData.skills,
          certifications: formData.certifications,
          languages: job?.requirements?.languages || [],
          backgroundCheck: job?.requirements?.backgroundCheck || false,
          drivingLicense: job?.requirements?.drivingLicense || false,
          ownTransport: job?.requirements?.ownTransport || false,
        },
        benefits: formData.benefits,
        schedule: {
          type: job?.schedule?.type || "full_time",
          workingDays: formData.workingDays,
          shiftStart: formData.shiftStart,
          shiftEnd: formData.shiftEnd,
        },
        vacancies: {
          total: Number(formData.vacanciesTotal),
          filled: job?.vacancies?.filled || 0,
          remaining: Number(formData.vacanciesTotal) - (job?.vacancies?.filled || 0),
        },
        ...(formData.applicationDeadline ? { applicationDeadline: formData.applicationDeadline } : {}),
        status: formData.status,
      };

      await jobService.updateJob(resolvedParams.id, updateData);
      setShowSuccessModal(true);
    } catch (error) {
      console.error("Error updating job:", error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-gray-200 border-t-[#39B54A] rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">Loading job details...</p>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Job Not Found</h2>
          <p className="text-gray-500 mb-4">The job you&apos;re looking for doesn&apos;t exist.</p>
          <button
            onClick={() => router.push("/admin/jobs")}
            className="px-6 py-2 bg-[#39B54A] text-white rounded-xl"
          >
            Back to Jobs
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push(`/admin/jobs/${resolvedParams.id}`)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Edit Job</h1>
                <p className="text-sm text-gray-500">{job.title}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push(`/admin/jobs/${resolvedParams.id}`)}
                className="px-4 py-2 text-gray-600 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="px-6 py-2 bg-[#39B54A] text-white rounded-xl hover:bg-[#2d913c] transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {saving && (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                )}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Form Content */}
      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {/* Basic Information */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl border border-gray-200 p-6"
        >
          <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <span className="w-8 h-8 bg-[#39B54A]/10 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-[#39B54A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
            Basic Information
          </h2>

          <div className="grid gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Job Title</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#39B54A]/20 focus:border-[#39B54A]"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={5}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#39B54A]/20 focus:border-[#39B54A] resize-none"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#39B54A]/20 focus:border-[#39B54A]"
                  required
                >
                  <option value="">Select category</option>
                  {JOB_CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Employment Type</label>
                <select
                  name="employmentType"
                  value={formData.employmentType}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#39B54A]/20 focus:border-[#39B54A]"
                  required
                >
                  <option value="">Select type</option>
                  {EMPLOYMENT_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Experience Level</label>
                <select
                  name="experienceLevel"
                  value={formData.experienceLevel}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#39B54A]/20 focus:border-[#39B54A]"
                  required
                >
                  <option value="">Select level</option>
                  {EXPERIENCE_LEVELS.map((level) => (
                    <option key={level.value} value={level.value}>{level.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#39B54A]/20 focus:border-[#39B54A]"
                >
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="filled">Filled</option>
                  <option value="closed">Closed</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Vacancies</label>
                <input
                  type="number"
                  name="vacanciesTotal"
                  value={formData.vacanciesTotal}
                  onChange={handleChange}
                  min="1"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#39B54A]/20 focus:border-[#39B54A]"
                />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Location */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl border border-gray-200 p-6"
        >
          <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <span className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              </svg>
            </span>
            Location
          </h2>

          <div className="grid gap-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
                <select
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#39B54A]/20 focus:border-[#39B54A]"
                  required
                >
                  <option value="">Select state</option>
                  {NIGERIAN_STATES.map((state) => (
                    <option key={state} value={state}>{state}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#39B54A]/20 focus:border-[#39B54A]"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#39B54A]/20 focus:border-[#39B54A]"
              />
            </div>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="isRemote"
                checked={formData.isRemote}
                onChange={handleChange}
                className="w-5 h-5 rounded border-gray-300 text-[#39B54A] focus:ring-[#39B54A]"
              />
              <span className="text-gray-700">This is a remote position</span>
            </label>
          </div>
        </motion.div>

        {/* Compensation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl border border-gray-200 p-6"
        >
          <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <span className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
            Compensation
          </h2>

          <div className="grid gap-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Minimum Salary (₦)</label>
                <input
                  type="number"
                  name="salaryMin"
                  value={formData.salaryMin}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#39B54A]/20 focus:border-[#39B54A]"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Maximum Salary (₦)</label>
                <input
                  type="number"
                  name="salaryMax"
                  value={formData.salaryMax}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#39B54A]/20 focus:border-[#39B54A]"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Pay Period</label>
                <select
                  name="salaryPeriod"
                  value={formData.salaryPeriod}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#39B54A]/20 focus:border-[#39B54A]"
                >
                  <option value="hourly">Hourly</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
            </div>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="isNegotiable"
                checked={formData.isNegotiable}
                onChange={handleChange}
                className="w-5 h-5 rounded border-gray-300 text-[#39B54A] focus:ring-[#39B54A]"
              />
              <span className="text-gray-700">Salary is negotiable</span>
            </label>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Application Deadline</label>
              <input
                type="date"
                name="applicationDeadline"
                value={formData.applicationDeadline}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#39B54A]/20 focus:border-[#39B54A]"
              />
            </div>
          </div>
        </motion.div>

        {/* Schedule */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl border border-gray-200 p-6"
        >
          <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <span className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
            Schedule
          </h2>

          <div className="grid gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Working Days</label>
              <div className="flex flex-wrap gap-2">
                {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleWorkingDay(day)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      formData.workingDays.includes(day)
                        ? "bg-[#39B54A] text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {day.slice(0, 3)}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Shift Start</label>
                <input
                  type="time"
                  name="shiftStart"
                  value={formData.shiftStart}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#39B54A]/20 focus:border-[#39B54A]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Shift End</label>
                <input
                  type="time"
                  name="shiftEnd"
                  value={formData.shiftEnd}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#39B54A]/20 focus:border-[#39B54A]"
                />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Requirements & Benefits */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-2xl border border-gray-200 p-6"
        >
          <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <span className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
            </span>
            Requirements & Benefits
          </h2>

          <div className="grid gap-6">
            {/* Skills */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Required Skills</label>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag("skills", skillInput))}
                  placeholder="Add a skill"
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#39B54A]/20 focus:border-[#39B54A]"
                />
                <button
                  type="button"
                  onClick={() => addTag("skills", skillInput)}
                  className="px-4 py-2 bg-[#39B54A] text-white rounded-xl hover:bg-[#2d913c]"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.skills.map((skill, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm flex items-center gap-2"
                  >
                    {skill}
                    <button
                      type="button"
                      onClick={() => removeTag("skills", index)}
                      className="text-gray-400 hover:text-red-500"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Certifications */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Required Certifications</label>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={certInput}
                  onChange={(e) => setCertInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag("certifications", certInput))}
                  placeholder="Add a certification"
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#39B54A]/20 focus:border-[#39B54A]"
                />
                <button
                  type="button"
                  onClick={() => addTag("certifications", certInput)}
                  className="px-4 py-2 bg-[#39B54A] text-white rounded-xl hover:bg-[#2d913c]"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.certifications.map((cert, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm flex items-center gap-2"
                  >
                    {cert}
                    <button
                      type="button"
                      onClick={() => removeTag("certifications", index)}
                      className="text-blue-400 hover:text-red-500"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Benefits */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Benefits</label>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={benefitInput}
                  onChange={(e) => setBenefitInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag("benefits", benefitInput))}
                  placeholder="Add a benefit"
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#39B54A]/20 focus:border-[#39B54A]"
                />
                <button
                  type="button"
                  onClick={() => addTag("benefits", benefitInput)}
                  className="px-4 py-2 bg-[#39B54A] text-white rounded-xl hover:bg-[#2d913c]"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.benefits.map((benefit, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm flex items-center gap-2"
                  >
                    {benefit}
                    <button
                      type="button"
                      onClick={() => removeTag("benefits", index)}
                      className="text-green-400 hover:text-red-500"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </form>

      {/* Success Modal */}
      <AnimatePresence>
        {showSuccessModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl p-6 max-w-md w-full text-center"
            >
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Changes Saved!</h3>
              <p className="text-gray-500 mb-6">Your job listing has been updated successfully.</p>
              <button
                onClick={() => router.push(`/admin/jobs/${resolvedParams.id}`)}
                className="w-full px-6 py-3 bg-[#39B54A] text-white rounded-xl hover:bg-[#2d913c] transition-colors"
              >
                View Job
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
