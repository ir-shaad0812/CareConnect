// ============================================
// CREATE JOB PAGE
// Admin form for creating new job listings
// ============================================

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import AdminLayout from "@/components/layout/AdminLayout";
import { jobService } from "@/services";

// Job categories
const JOB_CATEGORIES = [
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
  { value: "full_time", label: "Full Time" },
  { value: "part_time", label: "Part Time" },
  { value: "contract", label: "Contract" },
  { value: "temporary", label: "Temporary" },
  { value: "live_in", label: "Live-In" },
];

// Urgency levels
const URGENCY_LEVELS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
  { value: "emergency", label: "Emergency" },
];

// Salary types — must match Job model period enum
const SALARY_TYPES = [
  { value: "hourly", label: "Per Hour" },
  { value: "daily", label: "Per Day" },
  { value: "weekly", label: "Per Week" },
  { value: "monthly", label: "Per Month" },
  { value: "yearly", label: "Per Year" },
  { value: "per_task", label: "Per Task" },
];

// Nepal provinces
const STATES = [
  "Koshi",
  "Madhesh",
  "Bagmati",
  "Gandaki",
  "Lumbini",
  "Karnali",
  "Sudurpashchim",
];

// Benefits — must match Job model benefits enum
const BENEFIT_OPTIONS = [
  { value: "health_insurance", label: "Health Insurance" },
  { value: "paid_leave", label: "Paid Leave" },
  { value: "accommodation", label: "Accommodation" },
  { value: "meals", label: "Meals" },
  { value: "transport", label: "Transport" },
  { value: "training", label: "Training" },
  { value: "bonus", label: "Bonus" },
  { value: "pension", label: "Pension" },
  { value: "flexible_hours", label: "Flexible Hours" },
  { value: "other", label: "Other" },
];

// Education levels — must match Job model requirements.education enum
const EDUCATION_OPTIONS = [
  { value: "", label: "No requirement" },
  { value: "none", label: "None" },
  { value: "high_school", label: "High School" },
  { value: "vocational", label: "Vocational Training" },
  { value: "associate", label: "Associate Degree" },
  { value: "bachelor", label: "Bachelor's Degree" },
  { value: "master", label: "Master's Degree" },
  { value: "doctorate", label: "Doctorate" },
];

interface FormData {
  title: string;
  description: string;
  shortDescription: string;
  category: string;
  careType: string;
  employmentType: string;
  urgencyLevel: string;
  location: {
    address: string;
    city: string;
    state: string;
    country: string;
    isRemote: boolean;
  };
  salary: {
    type: string;
    min: number;
    max: number;
    negotiable: boolean;
  };
  schedule: {
    type: string;
    hoursPerWeek: number;
    startDate: string;
    shiftDetails: string;
  };
  requirements: {
    minExperience: number;
    education: string;
    certifications: string[];
    skills: string[];
    languages: string[];
    backgroundCheck: boolean;
    drivingLicense: boolean;
    ownTransport: boolean;
  };
  benefits: string[];
  vacancies: {
    total: number;
  };
  applicationDeadline: string;
  tags: string[];
  status: string;
}

const initialFormData: FormData = {
  title: "",
  description: "",
  shortDescription: "",
  category: "elderly_care",
  careType: "full_time",
  employmentType: "full_time",
  urgencyLevel: "medium",
  location: {
    address: "",
    city: "",
    state: "Bagmati",
    country: "Nepal",
    isRemote: false,
  },
  salary: {
    type: "monthly",
    min: 0,
    max: 0,
    negotiable: true,
  },
  schedule: {
    type: "regular",
    hoursPerWeek: 40,
    startDate: "",
    shiftDetails: "",
  },
  requirements: {
    minExperience: 0,
    education: "",
    certifications: [],
    skills: [],
    languages: ["English"],
    backgroundCheck: true,
    drivingLicense: false,
    ownTransport: false,
  },
  benefits: [],
  vacancies: {
    total: 1,
  },
  applicationDeadline: "",
  tags: [],
  status: "draft",
};

export default function CreateJobPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [skillInput, setSkillInput] = useState("");
  const [certInput, setCertInput] = useState("");
  const [tagInput, setTagInput] = useState("");

  const totalSteps = 4;

  const handleChange = (
    field: string,
    value: string | number | boolean | string[]
  ) => {
    const keys = field.split(".");
    setFormData((prev) => {
      const updated = { ...prev };
      let current: Record<string, unknown> = updated;
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]] as Record<string, unknown>;
      }
      current[keys[keys.length - 1]] = value;
      return updated;
    });
  };

  const addToArray = (field: string, value: string, setInput: (v: string) => void) => {
    if (!value.trim()) return;
    const keys = field.split(".");
    let current: unknown = formData;
    for (const key of keys) {
      current = (current as Record<string, unknown>)[key];
    }
    const arr = current as string[];
    if (!arr.includes(value.trim())) {
      handleChange(field, [...arr, value.trim()]);
    }
    setInput("");
  };

  const removeFromArray = (field: string, index: number) => {
    const keys = field.split(".");
    let current: unknown = formData;
    for (const key of keys) {
      current = (current as Record<string, unknown>)[key];
    }
    const arr = (current as string[]).filter((_, i) => i !== index);
    handleChange(field, arr);
  };

  const handleSubmit = async (saveAsDraft: boolean = false) => {
    try {
      setIsSubmitting(true);
      setError("");

      const jobData = {
        title: formData.title,
        description: formData.description,
        shortDescription: formData.shortDescription,
        category: formData.category,
        careType: formData.careType,
        urgencyLevel: formData.urgencyLevel,
        status: saveAsDraft ? "draft" : "active",
        salary: {
          period: formData.salary.type,   // model uses "period" not "type"
          min: formData.salary.min,
          max: formData.salary.max > 0 ? formData.salary.max : formData.salary.min,
          currency: "NPR",
          isNegotiable: formData.salary.negotiable,  // model uses "isNegotiable"
        },
        location: {
          address: formData.location.address,
          city: formData.location.city || "Kathmandu",
          state: formData.location.state,
          country: "Nepal",
          isRemote: formData.location.isRemote,
        },
        schedule: {
          startDate: formData.schedule.startDate || undefined,
          isFlexible: formData.schedule.type === "flexible",
          // Transform shiftDetails to shiftsAvailable if provided
          ...(formData.schedule.shiftDetails ? { 
            shiftsAvailable: formData.schedule.shiftDetails.split(",").map(s => s.trim().toLowerCase()).filter(Boolean)
          } : {}),
        },
        requirements: {
          ...formData.requirements,
          // Only send education if it's a valid enum value
          education: ["none", "high_school", "vocational", "associate", "bachelor", "master", "doctorate"].includes(formData.requirements.education) 
            ? formData.requirements.education 
            : undefined,
        },
        benefits: formData.benefits,
        tags: formData.tags,
        ...(formData.applicationDeadline ? { applicationDeadline: formData.applicationDeadline } : {}),
        vacancies: {
          total: formData.vacancies.total || 1,
          filled: 0,
          remaining: formData.vacancies.total || 1,
        },
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const job = await (jobService.createJob as (data: any) => Promise<{ _id: string }>)(jobData);
      router.push(`/admin/jobs/${job._id}`);
    } catch (err: unknown) {
      const error = err as { message?: string };
      setError(error.message || "Failed to create job");
    } finally {
      setIsSubmitting(false);
    }
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return formData.title.length >= 5 && formData.description.length >= 50;
      case 2:
        return formData.location.city.length > 0 && formData.location.state.length > 0;
      case 3:
        return formData.salary.min > 0;
      case 4:
        return true;
      default:
        return false;
    }
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(Math.min(totalSteps, currentStep + 1));
    }
  };

  const prevStep = () => {
    setCurrentStep(Math.max(1, currentStep - 1));
  };

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Create New Job</h1>
          <p className="text-gray-500 mt-1">Fill in the details to post a new job listing</p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {["Basic Info", "Location", "Compensation", "Requirements"].map((label, index) => (
              <div key={label} className="flex items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-colors ${
                    currentStep > index + 1
                      ? "bg-[#39B54A] text-white"
                      : currentStep === index + 1
                      ? "bg-[#39B54A] text-white"
                      : "bg-gray-200 text-gray-500"
                  }`}
                >
                  {currentStep > index + 1 ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    index + 1
                  )}
                </div>
                <span className={`ml-3 hidden sm:block text-sm font-medium ${
                  currentStep >= index + 1 ? "text-gray-900" : "text-gray-400"
                }`}>
                  {label}
                </span>
                {index < 3 && (
                  <div className={`w-12 lg:w-24 h-1 mx-4 rounded ${
                    currentStep > index + 1 ? "bg-[#39B54A]" : "bg-gray-200"
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600">
            {error}
          </div>
        )}

        {/* Form Steps */}
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="bg-white rounded-2xl border border-gray-200 p-8"
        >
          {/* Step 1: Basic Info */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Basic Information</h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Job Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleChange("title", e.target.value)}
                  placeholder="e.g., Experienced Elderly Caregiver Needed"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#39B54A] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Short Description
                </label>
                <input
                  type="text"
                  value={formData.shortDescription}
                  onChange={(e) => handleChange("shortDescription", e.target.value)}
                  placeholder="Brief summary (max 200 characters)"
                  maxLength={200}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#39B54A] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Description *
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleChange("description", e.target.value)}
                  placeholder="Detailed job description including responsibilities, qualifications, and expectations..."
                  rows={6}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#39B54A] focus:border-transparent resize-none"
                />
                <p className="text-xs text-gray-500 mt-1">{formData.description.length}/5000 characters</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => handleChange("category", e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#39B54A] focus:border-transparent"
                  >
                    {JOB_CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Employment Type *
                  </label>
                  <select
                    value={formData.employmentType}
                    onChange={(e) => handleChange("employmentType", e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#39B54A] focus:border-transparent"
                  >
                    {EMPLOYMENT_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Urgency Level
                  </label>
                  <select
                    value={formData.urgencyLevel}
                    onChange={(e) => handleChange("urgencyLevel", e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#39B54A] focus:border-transparent"
                  >
                    {URGENCY_LEVELS.map((level) => (
                      <option key={level.value} value={level.value}>
                        {level.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Number of Vacancies
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={formData.vacancies.total}
                    onChange={(e) => handleChange("vacancies.total", parseInt(e.target.value) || 1)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#39B54A] focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Location */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Location Details</h2>

              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl mb-6">
                <input
                  type="checkbox"
                  id="isRemote"
                  checked={formData.location.isRemote}
                  onChange={(e) => handleChange("location.isRemote", e.target.checked)}
                  className="w-5 h-5 rounded border-gray-300 text-[#39B54A] focus:ring-[#39B54A]"
                />
                <label htmlFor="isRemote" className="text-gray-700">
                  This is a remote position
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Street Address
                </label>
                <input
                  type="text"
                  value={formData.location.address}
                  onChange={(e) => handleChange("location.address", e.target.value)}
                  placeholder="123 Main Street"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#39B54A] focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    City *
                  </label>
                  <input
                    type="text"
                    value={formData.location.city}
                    onChange={(e) => handleChange("location.city", e.target.value)}
                    placeholder="e.g., Kathmandu"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#39B54A] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Province *
                  </label>
                  <select
                    value={formData.location.state}
                    onChange={(e) => handleChange("location.state", e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#39B54A] focus:border-transparent"
                  >
                    {STATES.map((state) => (
                      <option key={state} value={state}>
                        {state}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Schedule Details
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Hours per Week</label>
                    <input
                      type="number"
                      min={1}
                      max={168}
                      value={formData.schedule.hoursPerWeek}
                      onChange={(e) => handleChange("schedule.hoursPerWeek", parseInt(e.target.value) || 40)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#39B54A] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={formData.schedule.startDate}
                      onChange={(e) => handleChange("schedule.startDate", e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#39B54A] focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Shift Details
                </label>
                <textarea
                  value={formData.schedule.shiftDetails}
                  onChange={(e) => handleChange("schedule.shiftDetails", e.target.value)}
                  placeholder="e.g., Monday to Friday, 8am to 5pm with occasional weekend coverage"
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#39B54A] focus:border-transparent resize-none"
                />
              </div>
            </div>
          )}

          {/* Step 3: Compensation */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Compensation & Benefits</h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Salary Type
                  </label>
                  <select
                    value={formData.salary.type}
                    onChange={(e) => handleChange("salary.type", e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#39B54A] focus:border-transparent"
                  >
                    {SALARY_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Minimum (Rs.) *
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={formData.salary.min || ""}
                    onChange={(e) => handleChange("salary.min", parseInt(e.target.value) || 0)}
                    placeholder="15000"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#39B54A] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Maximum (Rs.)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={formData.salary.max || ""}
                    onChange={(e) => handleChange("salary.max", parseInt(e.target.value) || 0)}
                    placeholder="30000"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#39B54A] focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="negotiable"
                  checked={formData.salary.negotiable}
                  onChange={(e) => handleChange("salary.negotiable", e.target.checked)}
                  className="w-5 h-5 rounded border-gray-300 text-[#39B54A] focus:ring-[#39B54A]"
                />
                <label htmlFor="negotiable" className="text-gray-700">
                  Salary is negotiable
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Benefits
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {BENEFIT_OPTIONS.map((opt) => {
                    const checked = formData.benefits.includes(opt.value);
                    return (
                      <label
                        key={opt.value}
                        className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-colors ${
                          checked
                            ? "border-[#39B54A] bg-green-50 text-green-800"
                            : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            const updated = checked
                              ? formData.benefits.filter(b => b !== opt.value)
                              : [...formData.benefits, opt.value];
                            handleChange("benefits", updated);
                          }}
                          className="w-4 h-4 rounded border-gray-300 text-[#39B54A] focus:ring-[#39B54A]"
                        />
                        <span className="text-sm font-medium">{opt.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Application Deadline
                </label>
                <input
                  type="date"
                  value={formData.applicationDeadline}
                  onChange={(e) => handleChange("applicationDeadline", e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#39B54A] focus:border-transparent"
                />
              </div>
            </div>
          )}

          {/* Step 4: Requirements */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Requirements & Skills</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Minimum Experience (years)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={formData.requirements.minExperience}
                    onChange={(e) => handleChange("requirements.minExperience", parseInt(e.target.value) || 0)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#39B54A] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Education Required
                  </label>
                  <select
                    value={formData.requirements.education}
                    onChange={(e) => handleChange("requirements.education", e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#39B54A] focus:border-transparent"
                  >
                    {EDUCATION_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Required Skills
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    placeholder="e.g., Medication management, First aid"
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addToArray("requirements.skills", skillInput, setSkillInput))}
                    className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#39B54A] focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => addToArray("requirements.skills", skillInput, setSkillInput)}
                    className="px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors"
                  >
                    Add
                  </button>
                </div>
                {formData.requirements.skills.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {formData.requirements.skills.map((skill, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                      >
                        {skill}
                        <button
                          onClick={() => removeFromArray("requirements.skills", index)}
                          className="hover:text-blue-900"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Required Certifications
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={certInput}
                    onChange={(e) => setCertInput(e.target.value)}
                    placeholder="e.g., CPR certification, Nursing license"
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addToArray("requirements.certifications", certInput, setCertInput))}
                    className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#39B54A] focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => addToArray("requirements.certifications", certInput, setCertInput)}
                    className="px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors"
                  >
                    Add
                  </button>
                </div>
                {formData.requirements.certifications.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {formData.requirements.certifications.map((cert, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm"
                      >
                        {cert}
                        <button
                          onClick={() => removeFromArray("requirements.certifications", index)}
                          className="hover:text-purple-900"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">
                  Additional Requirements
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="backgroundCheck"
                    checked={formData.requirements.backgroundCheck}
                    onChange={(e) => handleChange("requirements.backgroundCheck", e.target.checked)}
                    className="w-5 h-5 rounded border-gray-300 text-[#39B54A] focus:ring-[#39B54A]"
                  />
                  <label htmlFor="backgroundCheck" className="text-gray-700">
                    Background check required
                  </label>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="drivingLicense"
                    checked={formData.requirements.drivingLicense}
                    onChange={(e) => handleChange("requirements.drivingLicense", e.target.checked)}
                    className="w-5 h-5 rounded border-gray-300 text-[#39B54A] focus:ring-[#39B54A]"
                  />
                  <label htmlFor="drivingLicense" className="text-gray-700">
                    Driving license required
                  </label>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="ownTransport"
                    checked={formData.requirements.ownTransport}
                    onChange={(e) => handleChange("requirements.ownTransport", e.target.checked)}
                    className="w-5 h-5 rounded border-gray-300 text-[#39B54A] focus:ring-[#39B54A]"
                  />
                  <label htmlFor="ownTransport" className="text-gray-700">
                    Own transport required
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tags (for search)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    placeholder="e.g., night shift, weekend"
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addToArray("tags", tagInput, setTagInput))}
                    className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#39B54A] focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => addToArray("tags", tagInput, setTagInput)}
                    className="px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors"
                  >
                    Add
                  </button>
                </div>
                {formData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {formData.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                      >
                        #{tag}
                        <button
                          onClick={() => removeFromArray("tags", index)}
                          className="hover:text-gray-900"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-100">
            <button
              onClick={prevStep}
              disabled={currentStep === 1}
              className="px-6 py-3 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>

            <div className="flex items-center gap-3">
              {currentStep === totalSteps && (
                <button
                  onClick={() => handleSubmit(true)}
                  disabled={isSubmitting}
                  className="px-6 py-3 text-gray-600 hover:text-gray-900 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Save as Draft
                </button>
              )}

              {currentStep < totalSteps ? (
                <button
                  onClick={nextStep}
                  disabled={!validateStep(currentStep)}
                  className="px-6 py-3 bg-[#39B54A] text-white rounded-xl hover:bg-[#2d913c] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue
                </button>
              ) : (
                <button
                  onClick={() => handleSubmit(false)}
                  disabled={isSubmitting}
                  className="px-6 py-3 bg-[#39B54A] text-white rounded-xl hover:bg-[#2d913c] transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Publishing...
                    </>
                  ) : (
                    <>
                      Publish Job
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AdminLayout>
  );
}
