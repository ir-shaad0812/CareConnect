"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  User,
  Briefcase,
  CalendarDays,
  ClipboardList,
  AlertTriangle,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  X,
  Shield,
  Banknote,
  Eye,
} from "lucide-react";
import { userService } from "@/modules/user/services";
import { authService } from "@/modules/auth/services";
import { CaregiverLayout } from "@/app/dashboard/caregiver/components";
import AvatarUpload from "@/components/ui/AvatarUpload";
import {
  SKILL_OPTIONS,
  SERVICE_TYPE_OPTIONS,
  LANGUAGE_OPTIONS,
  WORK_PREFERENCES,
} from "@/lib/constants";
import { useAuthContext } from "@/context/AuthContext";
import { extractStatusCode } from "@/types/errors.types";

const WORK_PREFERENCE_OPTIONS = Object.entries(WORK_PREFERENCES).map(
  ([, value]) => ({ value, label: value.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) })
);

interface Certification {
  name: string;
  issuer: string;
  issueDate: string;
  expiryDate?: string;
  verified: boolean;
}

interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
  email?: string;
}

interface PreviousEmployer {
  name: string;
  duration: string;
  duties: string;
  reference?: string;
  contactPhone?: string;
}

interface UserProfile {
  _id: string;
  fullName: string;
  email: string;
  phone?: string;
  age?: number;
  gender?: string;
  avatar?: string;
  role: string;
  status: string;
  location?: {
    city?: string;
    state?: string;
    country?: string;
    address?: string;
    postalCode?: string;
  };
  bio?: string;
  experience?: number;
  hourlyRate?: number;
  dailyRate?: number;
  weeklyRate?: number;
  monthlyRate?: number;
  skills?: string[];
  certifications?: Certification[];
  serviceTypes?: string[];
  workPreferences?: string[];
  serviceRadius?: number;
  previousEmployers?: PreviousEmployer[];
  emergencyContact?: EmergencyContact;
  availability?: {
    days?: string[];
    hours?: { start?: string; end?: string };
  };
  languages?: string[];
  rating?: number;
  totalReviews?: number;
  completionPercentage?: number;
  backgroundCheck?: {
    status: string;
  };
  createdAt?: string;
  isEmailVerified?: boolean;
  isProfileComplete?: boolean;
}

// SERVICE_TYPES, SKILL_OPTIONS, LANGUAGE_OPTIONS, WORK_PREFERENCES
// imported from @/lib/constants (single source of truth)
const SERVICE_TYPES = SERVICE_TYPE_OPTIONS;

// Days of the week
const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function toDisplayDayLabel(day: string): string {
  const normalized = day.trim().toLowerCase();
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function toApiDayValue(day: string): string {
  return day.trim().toLowerCase();
}

type ActiveSection = "personal" | "professional" | "pricing" | "availability" | "experience" | "emergency" | null;

export default function CaregiverProfilePage() {
  const router = useRouter();
  const { user: authUser, isLoading: isAuthLoading } = useAuthContext();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<ActiveSection>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Form state
  const [formData, setFormData] = useState({
    // Personal
    fullName: "",
    phone: "",
    age: "",
    gender: "",
    bio: "",
    city: "",
    state: "",
    country: "",
    address: "",
    postalCode: "",
    languages: [] as string[],
    // Professional
    experience: "",
    hourlyRate: "",
    dailyRate: "",
    weeklyRate: "",
    monthlyRate: "",
    skills: [] as string[],
    serviceTypes: [] as string[],
    workPreferences: [] as string[],
    serviceRadius: 25,
    certifications: [] as Certification[],
    // Availability
    availableDays: [] as string[],
    availableHoursStart: "",
    availableHoursEnd: "",
    // Experience
    previousEmployers: [] as PreviousEmployer[],
    // Emergency
    emergencyContact: {
      name: "",
      relationship: "",
      phone: "",
      email: "",
    },
  });

  // New certification form
  const [newCertification, setNewCertification] = useState<Certification>({
    name: "",
    issuer: "",
    issueDate: "",
    expiryDate: "",
    verified: false,
  });

  // New employer form
  const [newEmployer, setNewEmployer] = useState<PreviousEmployer>({
    name: "",
    duration: "",
    duties: "",
    reference: "",
    contactPhone: "",
  });

  const fetchProfile = useCallback(async () => {
    try {
      setIsLoading(true);

      const response = await userService.getProfile();

      if (!response.success || !response.data) {
        throw new Error("Failed to fetch profile");
      }

      const user = response.data.user;
      
      // Check if user is a caregiver
      if (user.role !== "caregiver") {
        router.push(`/profile/${user.role}`);
        return;
      }

      setProfile(user as unknown as UserProfile);
      initializeFormData(user as unknown as UserProfile);
    } catch (err) {
      console.error("Error fetching profile:", err);
      const statusCode = extractStatusCode(err);
      if (statusCode === 401) {
        router.replace("/login?redirect=/profile/caregiver");
        return;
      }

      if (statusCode === 403) {
        if (authUser?.role === "caregiver") {
          router.replace("/dashboard/pending");
          return;
        }

        setError("You do not have permission to access this profile.");
        return;
      }

      setError("Failed to load profile. Please refresh and try again.");
    } finally {
      setIsLoading(false);
    }
  }, [router, authUser?.role]);

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    if (!authUser) {
      router.replace("/login?redirect=/profile/caregiver");
      return;
    }

    if (authUser.role && authUser.role !== "caregiver") {
      router.replace(`/profile/${authUser.role}`);
      return;
    }

    void fetchProfile();
  }, [isAuthLoading, authUser?._id, authUser?.role, router, fetchProfile]);

  const initializeFormData = (user: UserProfile) => {
    setFormData({
      fullName: user.fullName || "",
      phone: user.phone || "",
      age: user.age?.toString() || "",
      gender: user.gender || "",
      bio: user.bio || "",
      city: user.location?.city || "",
      state: user.location?.state || "",
      country: user.location?.country || "",
      address: user.location?.address || "",
      postalCode: user.location?.postalCode || "",
      languages: user.languages || [],
      experience: user.experience?.toString() || "",
      hourlyRate: user.hourlyRate?.toString() || "",
      dailyRate: user.dailyRate?.toString() || "",
      weeklyRate: user.weeklyRate?.toString() || "",
      monthlyRate: user.monthlyRate?.toString() || "",
      skills: user.skills || [],
      serviceTypes: user.serviceTypes || [],
      workPreferences: user.workPreferences || [],
      serviceRadius: user.serviceRadius || 25,
      certifications: user.certifications || [],
      availableDays: (user.availability?.days || []).map(toDisplayDayLabel),
      availableHoursStart: user.availability?.hours?.start || "",
      availableHoursEnd: user.availability?.hours?.end || "",
      previousEmployers: user.previousEmployers || [],
      emergencyContact: {
        name: user.emergencyContact?.name || "",
        relationship: user.emergencyContact?.relationship || "",
        phone: user.emergencyContact?.phone || "",
        email: user.emergencyContact?.email || "",
      },
    });
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError("");

      const updateData: Record<string, unknown> = {
        fullName: formData.fullName || undefined,
        phone: formData.phone || undefined,
        age: formData.age ? parseInt(formData.age) : undefined,
        gender: formData.gender || undefined,
        bio: formData.bio || undefined,
        languages: formData.languages,
        experience: formData.experience ? parseInt(formData.experience) : undefined,
        hourlyRate: formData.hourlyRate ? parseFloat(formData.hourlyRate) : undefined,
        dailyRate: formData.dailyRate ? parseFloat(formData.dailyRate) : undefined,
        weeklyRate: formData.weeklyRate ? parseFloat(formData.weeklyRate) : undefined,
        monthlyRate: formData.monthlyRate ? parseFloat(formData.monthlyRate) : undefined,
        skills: formData.skills,
        serviceTypes: formData.serviceTypes,
        workPreferences: formData.workPreferences,
        serviceRadius: formData.serviceRadius,
        certifications: formData.certifications,
        previousEmployers: formData.previousEmployers,
        location: {
          city: formData.city || undefined,
          state: formData.state || undefined,
          country: formData.country || undefined,
          address: formData.address || undefined,
          zipCode: formData.postalCode || undefined,
          postalCode: formData.postalCode || undefined,
        },
        availability: {
          days: formData.availableDays.map(toApiDayValue),
          hours: {
            start: formData.availableHoursStart || undefined,
            end: formData.availableHoursEnd || undefined,
          },
        },
        emergencyContact: (
          formData.emergencyContact.name ||
          formData.emergencyContact.phone
        ) ? formData.emergencyContact : undefined,
      };

      // Remove keys with undefined values to keep the payload clean
      Object.keys(updateData).forEach((key) => {
        if (updateData[key] === undefined) delete updateData[key];
      });

      const response = await userService.updateProfile(updateData as Parameters<typeof userService.updateProfile>[0]);

      if (!response.success || !response.data) {
        throw new Error("Failed to update profile");
      }

      setProfile(response.data.user as unknown as UserProfile);
      initializeFormData(response.data.user as unknown as UserProfile);
      setActiveSection(null);
      setSuccessMessage("Profile updated successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err: unknown) {
      // Handle different error types properly
      let msg = "Failed to update profile";
      
      if (err instanceof Error) {
        console.error("Error updating profile:", err.message);
        msg = err.message || msg;
      } else if (typeof err === 'object' && err !== null) {
        const apiError = err as { 
          message?: string; 
          statusCode?: number;
          errors?: { msg?: string; message?: string }[];
          response?: { data?: { message?: string; errors?: { msg: string }[] } };
        };
        console.error("Error updating profile:", JSON.stringify(apiError, null, 2));
        msg =
          apiError?.errors?.[0]?.msg ||
          apiError?.errors?.[0]?.message ||
          apiError?.message ||
          apiError?.response?.data?.errors?.[0]?.msg ||
          apiError?.response?.data?.message ||
          msg;
      } else {
        console.error("Error updating profile:", err);
      }
      
      setError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleArrayItem = (array: string[], item: string, setter: (val: string[]) => void) => {
    if (array.includes(item)) {
      setter(array.filter((i) => i !== item));
    } else {
      setter([...array, item]);
    }
  };

  const addCertification = () => {
    if (newCertification.name && newCertification.issuer) {
      setFormData((prev) => ({
        ...prev,
        certifications: [...prev.certifications, newCertification],
      }));
      setNewCertification({ name: "", issuer: "", issueDate: "", expiryDate: "", verified: false });
    }
  };

  const removeCertification = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      certifications: prev.certifications.filter((_, i) => i !== index),
    }));
  };

  const addEmployer = () => {
    if (newEmployer.name && newEmployer.duration) {
      setFormData((prev) => ({
        ...prev,
        previousEmployers: [...prev.previousEmployers, newEmployer],
      }));
      setNewEmployer({ name: "", duration: "", duties: "", reference: "", contactPhone: "" });
    }
  };

  const removeEmployer = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      previousEmployers: prev.previousEmployers.filter((_, i) => i !== index),
    }));
  };

  if (isLoading) {
    return (
      <CaregiverLayout pageTitle="Profile">
        <div className="flex items-center justify-center py-24">
          <div className="text-center">
            <div className="relative w-14 h-14 mx-auto mb-4">
              <div className="absolute inset-0 rounded-full border-[3px] border-gray-200" />
              <div className="absolute inset-0 rounded-full border-[3px] border-[#39B54A] border-t-transparent animate-spin" />
            </div>
            <p className="text-sm text-gray-500 font-medium">Loading profile...</p>
          </div>
        </div>
      </CaregiverLayout>
    );
  }

  return (
    <CaregiverLayout pageTitle="Profile">
      <div className="space-y-6 max-w-5xl">
        {/* Success/Error Messages */}
        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 p-4 bg-[#39B54A]/10 border border-[#39B54A]/20 rounded-xl text-[#39B54A]"
          >
            <CheckCircle2 size={18} />
            <span className="text-sm font-medium">{successMessage}</span>
          </motion.div>
        )}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600"
          >
            <AlertCircle size={18} />
            <span className="text-sm font-medium">{error}</span>
          </motion.div>
        )}

        {/* Profile Header Card */}
        <div className="bg-white rounded-xl border border-gray-100/80 overflow-hidden">
          {/* Cover Image */}
          <div className="h-32 bg-linear-to-r from-[#39B54A] to-[#81BC89]"></div>

          <div className="px-6 pb-6">
            {/* Avatar and Actions */}
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between -mt-12 mb-4 gap-4">
              {/* Left: Avatar + Name */}
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                {/* Avatar Upload Section */}
                <div className="flex-shrink-0">
                  <AvatarUpload
                    {...(profile?.avatar !== undefined ? { avatar: profile.avatar } : {})}
                    {...(profile?.fullName !== undefined ? { fullName: profile.fullName } : {})}
                    accentColor="#39B54A"
                    size={100}
                    onAvatarChange={(newUrl) => {
                      setProfile((prev) => prev ? { ...prev, avatar: newUrl } : prev);
                      const stored = authService.getCurrentUser();
                      if (stored) {
                        authService.updateStoredUser({ ...stored, avatar: newUrl });
                        window.dispatchEvent(new Event("userUpdated"));
                      }
                    }}
                  />
                </div>
                {/* Name & Role */}
                <div className="text-center sm:text-left pt-2 sm:pt-16">
                  <div className="flex items-center justify-center sm:justify-start gap-2">
                    <h1 className="text-2xl font-bold text-gray-900">{profile?.fullName}</h1>
                    {profile?.isEmailVerified && (
                      <Shield size={18} className="text-[#39B54A]" />
                    )}
                  </div>
                  <p className="text-gray-500">Caregiver</p>
                </div>
              </div>
              {/* Right: Action Buttons */}
              <div className="flex justify-center sm:justify-start lg:justify-end gap-2 pt-0 lg:pt-16">
                <Link
                  href="/dashboard/caregiver"
                  className="px-4 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-[#39B54A]/5 transition-colors"
                >
                  Dashboard
                </Link>
                <Link
                  href={`/caregiver/${profile?._id}`}
                  className="px-4 py-2.5 bg-white hover:bg-[#39B54A] text-[#39B54A] hover:text-white font-medium rounded-xl border border-[#39B54A]/40 hover:border-[#39B54A] transition-all shadow-sm"
                >
                  View Public Profile
                </Link>
              </div>
            </div>

            {/* Profile Completion */}
            <div className="bg-[#39B54A]/5 rounded-xl p-4 mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Profile Completion</span>
                <span className="text-sm font-bold text-[#39B54A]">{profile?.completionPercentage || 0}%</span>
              </div>
              <div className="w-full h-2 bg-[#39B54A]/5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#39B54A] rounded-full transition-all duration-500"
                  style={{ width: `${profile?.completionPercentage || 0}%` }}
                ></div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
              <div className="text-center p-4 bg-[#39B54A]/5 rounded-xl">
                <p className="text-2xl font-bold text-[#39B54A]">Rs. {(profile?.hourlyRate || 0).toLocaleString("en-NP")}</p>
                <p className="text-sm text-gray-500">Per Hour</p>
              </div>
              <div className="text-center p-4 bg-[#39B54A]/5 rounded-xl">
                <p className="text-2xl font-bold text-[#39B54A]">{profile?.experience || 0}</p>
                <p className="text-sm text-gray-500">Years Exp.</p>
              </div>
              <div className="text-center p-4 bg-[#39B54A]/5 rounded-xl">
                <p className="text-2xl font-bold text-[#39B54A]">{profile?.rating?.toFixed(1) || "N/A"}</p>
                <p className="text-sm text-gray-500">Rating</p>
              </div>
              <div className="text-center p-4 bg-[#39B54A]/5 rounded-xl">
                <p className="text-2xl font-bold text-[#39B54A]">{profile?.totalReviews || 0}</p>
                <p className="text-sm text-gray-500">Reviews</p>
              </div>
            </div>
          </div>
        </div>

        {/* Profile Sections */}
        <div className="space-y-6">
          {/* Personal Information Section */}
          <div className="bg-white rounded-xl border border-gray-100/80 overflow-hidden">
            <button
              onClick={() => setActiveSection(activeSection === "personal" ? null : "personal")}
              className="w-full flex items-center justify-between p-6 hover:bg-[#39B54A]/5 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#39B54A]/10 rounded-xl flex items-center justify-center ring-1 ring-[#39B54A]/20">
                  <User size={18} className="text-[#39B54A]" />
                </div>
                <div className="text-left">
                  <h2 className="text-base font-semibold text-gray-900">Personal Information</h2>
                  <p className="text-sm text-gray-500">Name, contact, location, and bio</p>
                </div>
              </div>
              <ChevronDown size={18} className={`text-gray-400 transition-transform ${activeSection === "personal" ? "rotate-180" : ""}`} />
            </button>

            {activeSection === "personal" && (
              <div className="px-6 pb-6 border-t border-gray-100 pt-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                    <input
                      type="text"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#39B54A]/20 focus:border-[#39B54A] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#39B54A]/20 focus:border-[#39B54A] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
                    <input
                      type="number"
                      value={formData.age}
                      onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#39B54A]/20 focus:border-[#39B54A] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                    <select
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#39B54A]/20 focus:border-[#39B54A] outline-none"
                    >
                      <option value="">Select</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                    <textarea
                      value={formData.bio}
                      onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                      rows={4}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#39B54A]/20 focus:border-[#39B54A] outline-none resize-none"
                      placeholder="Tell families about yourself..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#39B54A]/20 focus:border-[#39B54A] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#39B54A]/20 focus:border-[#39B54A] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">State/Province</label>
                    <input
                      type="text"
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#39B54A]/20 focus:border-[#39B54A] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                    <input
                      type="text"
                      value={formData.country}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#39B54A]/20 focus:border-[#39B54A] outline-none"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Languages Spoken</label>
                    <div className="flex flex-wrap gap-2">
                      {LANGUAGE_OPTIONS.map((lang) => (
                        <button
                          key={lang}
                          type="button"
                          onClick={() => toggleArrayItem(formData.languages, lang, (val) => setFormData({ ...formData, languages: val }))}
                          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                            formData.languages.includes(lang)
                              ? "bg-[#39B54A] text-white"
                              : "bg-gray-100 text-gray-600 hover:bg-gray-100"
                          }`}
                        >
                          {lang}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="mt-6 flex justify-end gap-3">
                  <button
                    onClick={() => { setActiveSection(null); initializeFormData(profile!); }}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl hover:bg-[#39B54A]/5"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="px-6 py-2 bg-[#39B54A] text-white rounded-xl hover:bg-[#2d913c] disabled:opacity-50"
                  >
                    {isSaving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Professional Information Section */}
          <div className="bg-white rounded-xl border border-gray-100/80 overflow-hidden">
            <button
              onClick={() => setActiveSection(activeSection === "professional" ? null : "professional")}
              className="w-full flex items-center justify-between p-6 hover:bg-[#39B54A]/5 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center ring-1 ring-blue-100">
                  <Briefcase size={18} className="text-blue-600" />
                </div>
                <div className="text-left">
                  <h2 className="text-base font-semibold text-gray-900">Professional Information</h2>
                  <p className="text-sm text-gray-500">Skills, service types, rates, and certifications</p>
                </div>
              </div>
              <ChevronDown size={18} className={`text-gray-400 transition-transform ${activeSection === "professional" ? "rotate-180" : ""}`} />
            </button>

            {activeSection === "professional" && (
              <div className="px-6 pb-6 border-t border-gray-100 pt-6">
                <div className="space-y-6">
                  {/* Service Types */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Service Types</label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {SERVICE_TYPES.map((type) => (
                        <button
                          key={type.value}
                          type="button"
                          onClick={() => toggleArrayItem(formData.serviceTypes, type.value, (val) => setFormData({ ...formData, serviceTypes: val }))}
                          className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                            formData.serviceTypes.includes(type.value)
                              ? "bg-[#39B54A] text-white"
                              : "bg-gray-100 text-gray-600 hover:bg-gray-100"
                          }`}
                        >
                          {type.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Work Preferences */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Work Preferences</label>
                    <div className="flex flex-wrap gap-2">
                      {WORK_PREFERENCE_OPTIONS.map((pref) => (
                        <button
                          key={pref.value}
                          type="button"
                          onClick={() => toggleArrayItem(formData.workPreferences, pref.value, (val) => setFormData({ ...formData, workPreferences: val }))}
                          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                            formData.workPreferences.includes(pref.value)
                              ? "bg-[#39B54A] text-white"
                              : "bg-gray-100 text-gray-600 hover:bg-gray-100"
                          }`}
                        >
                          {pref.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Skills */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Skills & Expertise</label>
                    <div className="flex flex-wrap gap-2">
                      {SKILL_OPTIONS.map((skill) => (
                        <button
                          key={skill}
                          type="button"
                          onClick={() => toggleArrayItem(formData.skills, skill, (val) => setFormData({ ...formData, skills: val }))}
                          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                            formData.skills.includes(skill)
                              ? "bg-[#39B54A] text-white"
                              : "bg-gray-100 text-gray-600 hover:bg-gray-100"
                          }`}
                        >
                          {skill}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Experience & Rates */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Years of Experience</label>
                      <input
                        type="number"
                        value={formData.experience}
                        onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#39B54A]/20 focus:border-[#39B54A] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Service Radius (km)</label>
                      <input
                        type="number"
                        value={formData.serviceRadius}
                        onChange={(e) => setFormData({ ...formData, serviceRadius: parseInt(e.target.value) || 25 })}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#39B54A]/20 focus:border-[#39B54A] outline-none"
                      />
                    </div>
                  </div>

                  {/* Certifications */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Certifications</label>
                    
                    {formData.certifications.length > 0 && (
                      <div className="space-y-2 mb-4">
                        {formData.certifications.map((cert, idx) => (
                          <div key={idx} className="flex items-center justify-between p-3 bg-[#39B54A]/5 rounded-xl">
                            <div>
                              <p className="font-medium text-gray-900">{cert.name}</p>
                              <p className="text-sm text-gray-500">{cert.issuer}</p>
                            </div>
                            <button
                              onClick={() => removeCertification(idx)}
                              className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="grid md:grid-cols-2 gap-3">
                      <input
                        type="text"
                        placeholder="Certification Name"
                        value={newCertification.name}
                        onChange={(e) => setNewCertification({ ...newCertification, name: e.target.value })}
                        className="px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#39B54A]/20 focus:border-[#39B54A] outline-none"
                      />
                      <input
                        type="text"
                        placeholder="Issuing Organization"
                        value={newCertification.issuer}
                        onChange={(e) => setNewCertification({ ...newCertification, issuer: e.target.value })}
                        className="px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#39B54A]/20 focus:border-[#39B54A] outline-none"
                      />
                      <input
                        type="date"
                        placeholder="Issue Date"
                        value={newCertification.issueDate}
                        onChange={(e) => setNewCertification({ ...newCertification, issueDate: e.target.value })}
                        className="px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#39B54A]/20 focus:border-[#39B54A] outline-none"
                      />
                      <button
                        onClick={addCertification}
                        className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 font-medium"
                      >
                        + Add Certification
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    onClick={() => { setActiveSection(null); initializeFormData(profile!); }}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl hover:bg-[#39B54A]/5"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="px-6 py-2 bg-[#39B54A] text-white rounded-xl hover:bg-[#2d913c] disabled:opacity-50"
                  >
                    {isSaving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Pricing & Rates Section */}
          <div className="rounded-xl overflow-hidden border border-[#39B54A]/30 shadow-sm">
            {/* Section header banner */}
            <div className="bg-linear-to-r from-[#39B54A] to-[#2d913c] px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
                  <Banknote size={18} className="text-white" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Manage Your Rates</h2>
                  <p className="text-xs text-white/75">Set competitive rates to attract more clients</p>
                </div>
              </div>
              <button
                onClick={() => setActiveSection(activeSection === "pricing" ? null : "pricing")}
                className="flex items-center gap-2 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-white text-xs font-semibold transition-colors"
              >
                {activeSection === "pricing" ? "Close" : "Edit Rates"}
                <ChevronDown size={14} className={`transition-transform ${activeSection === "pricing" ? "rotate-180" : ""}`} />
              </button>
            </div>
            {/* Quick preview when collapsed */}
            {activeSection !== "pricing" && profile?.hourlyRate && (
              <div className="bg-[#39B54A]/5 border-t border-[#39B54A]/10 px-6 py-3 flex items-center gap-6">
                {[
                  { label: "Per Hour", value: profile?.hourlyRate },
                  { label: "Per Day", value: (profile as { dailyRate?: number })?.dailyRate },
                  { label: "Per Week", value: (profile as { weeklyRate?: number })?.weeklyRate },
                  { label: "Per Month", value: (profile as { monthlyRate?: number })?.monthlyRate },
                ].filter(r => r.value).map(({ label, value }) => (
                  <div key={label} className="text-center">
                    <p className="text-sm font-bold text-[#39B54A]">Rs. {(value!).toLocaleString("en-NP")}</p>
                    <p className="text-xs text-gray-400">{label}</p>
                  </div>
                ))}
              </div>
            )}
            <div className="bg-white">

            {activeSection === "pricing" && (
              <div className="px-6 pb-6 border-t border-gray-100 pt-6">
                <div className="space-y-6">
                  {/* Info banner */}
                  <div className="p-4 bg-[#39B54A]/5 rounded-xl border border-[#39B54A]/10 flex items-start gap-3">
                    <Eye size={16} className="text-[#39B54A] mt-0.5 shrink-0" />
                    <p className="text-sm text-gray-600">
                      These rates are shown publicly on your profile. Care seekers use them to decide whether to book you —
                      competitive rates in NPR help build trust and attract more bookings.
                    </p>
                  </div>

                  {/* Rate inputs */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Hourly Rate <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-500">Rs.</span>
                        <input
                          type="number"
                          min="0"
                          value={formData.hourlyRate}
                          onChange={(e) => setFormData({ ...formData, hourlyRate: e.target.value })}
                          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#39B54A]/20 focus:border-[#39B54A] outline-none"
                          placeholder="800"
                        />
                      </div>
                      <p className="text-xs text-gray-400 mt-1">Typical range: Rs. 800 – 2,000 / hour</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Daily Rate</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-500">Rs.</span>
                        <input
                          type="number"
                          min="0"
                          value={formData.dailyRate}
                          onChange={(e) => setFormData({ ...formData, dailyRate: e.target.value })}
                          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#39B54A]/20 focus:border-[#39B54A] outline-none"
                          placeholder={formData.hourlyRate ? String(Number(formData.hourlyRate) * 8) : "6400"}
                        />
                      </div>
                      <p className="text-xs text-gray-400 mt-1">Suggested: 8 × hourly rate</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Weekly Rate</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-500">Rs.</span>
                        <input
                          type="number"
                          min="0"
                          value={formData.weeklyRate}
                          onChange={(e) => setFormData({ ...formData, weeklyRate: e.target.value })}
                          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#39B54A]/20 focus:border-[#39B54A] outline-none"
                          placeholder={formData.hourlyRate ? String(Number(formData.hourlyRate) * 40) : "32000"}
                        />
                      </div>
                      <p className="text-xs text-gray-400 mt-1">Suggested: 40 × hourly rate</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Rate</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-500">Rs.</span>
                        <input
                          type="number"
                          min="0"
                          value={formData.monthlyRate}
                          onChange={(e) => setFormData({ ...formData, monthlyRate: e.target.value })}
                          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#39B54A]/20 focus:border-[#39B54A] outline-none"
                          placeholder={formData.hourlyRate ? String(Number(formData.hourlyRate) * 160) : "128000"}
                        />
                      </div>
                      <p className="text-xs text-gray-400 mt-1">Suggested: 160 × hourly rate</p>
                    </div>
                  </div>

                  {/* Service Radius */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Service Radius (km)</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={formData.serviceRadius}
                      onChange={(e) => setFormData({ ...formData, serviceRadius: Number(e.target.value) })}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#39B54A]/20 focus:border-[#39B54A] outline-none"
                    />
                    <p className="text-xs text-gray-400 mt-1">Maximum distance you&apos;re willing to travel for care services</p>
                  </div>

                  {/* Live care-seeker preview */}
                  {formData.hourlyRate && (
                    <div className="p-4 bg-white border-2 border-[#39B54A]/20 rounded-xl">
                      <p className="text-xs font-semibold text-[#39B54A] uppercase tracking-wide mb-3 flex items-center gap-1.5">
                        <Eye size={13} /> Care Seeker Preview
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { label: "Per Hour", value: formData.hourlyRate },
                          { label: "Per Day", value: formData.dailyRate || String(Number(formData.hourlyRate) * 8) },
                          { label: "Per Week", value: formData.weeklyRate || String(Number(formData.hourlyRate) * 40) },
                          { label: "Per Month", value: formData.monthlyRate || String(Number(formData.hourlyRate) * 160) },
                        ].map(({ label, value }) => (
                          <div key={label} className="text-center p-3 bg-[#39B54A]/5 rounded-xl">
                            <p className="text-lg font-bold text-[#39B54A]">Rs. {Number(value).toLocaleString("en-NP")}</p>
                            <p className="text-xs text-gray-500">{label}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    onClick={() => { setActiveSection(null); initializeFormData(profile!); }}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl hover:bg-[#39B54A]/5"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="px-6 py-2 bg-[#39B54A] text-white rounded-xl hover:bg-[#2d913c] disabled:opacity-50"
                  >
                    {isSaving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </div>
            )}
            </div>
          </div>

          {/* Availability Section */}
          <div className="bg-white rounded-xl border border-gray-100/80 overflow-hidden">
            <button
              onClick={() => setActiveSection(activeSection === "availability" ? null : "availability")}
              className="w-full flex items-center justify-between p-6 hover:bg-[#39B54A]/5 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#39B54A]/10 rounded-xl flex items-center justify-center ring-1 ring-[#39B54A]/20">
                  <CalendarDays size={18} className="text-[#39B54A]" />
                </div>
                <div className="text-left">
                  <h2 className="text-base font-semibold text-gray-900">Availability</h2>
                  <p className="text-sm text-gray-500">Working days and hours</p>
                </div>
              </div>
              <ChevronDown size={18} className={`text-gray-400 transition-transform ${activeSection === "availability" ? "rotate-180" : ""}`} />
            </button>

            {activeSection === "availability" && (
              <div className="px-6 pb-6 border-t border-gray-100 pt-6">
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Available Days</label>
                    <div className="flex flex-wrap gap-2">
                      {DAYS_OF_WEEK.map((day) => (
                        <button
                          key={day}
                          type="button"
                          onClick={() => toggleArrayItem(formData.availableDays, day, (val) => setFormData({ ...formData, availableDays: val }))}
                          className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                            formData.availableDays.includes(day)
                              ? "bg-[#39B54A] text-white"
                              : "bg-gray-100 text-gray-600 hover:bg-gray-100"
                          }`}
                        >
                          {day}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                      <input
                        type="time"
                        value={formData.availableHoursStart}
                        onChange={(e) => setFormData({ ...formData, availableHoursStart: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#39B54A]/20 focus:border-[#39B54A] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                      <input
                        type="time"
                        value={formData.availableHoursEnd}
                        onChange={(e) => setFormData({ ...formData, availableHoursEnd: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#39B54A]/20 focus:border-[#39B54A] outline-none"
                      />
                    </div>
                  </div>

                  <div className="p-4 bg-[#39B54A]/5 rounded-xl border border-[#39B54A]/10">
                    <p className="text-sm text-gray-700 flex items-center gap-2">
                      <CalendarDays size={14} className="text-[#39B54A]" />
                      For advanced calendar management, visit your{" "}
                      <Link href="/dashboard/caregiver/availability" className="underline font-medium text-[#39B54A]">
                        Availability Dashboard
                      </Link>
                    </p>
                  </div>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    onClick={() => { setActiveSection(null); initializeFormData(profile!); }}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl hover:bg-[#39B54A]/5"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="px-6 py-2 bg-[#39B54A] text-white rounded-xl hover:bg-[#2d913c] disabled:opacity-50"
                  >
                    {isSaving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Work Experience Section */}
          <div className="bg-white rounded-xl border border-gray-100/80 overflow-hidden">
            <button
              onClick={() => setActiveSection(activeSection === "experience" ? null : "experience")}
              className="w-full flex items-center justify-between p-6 hover:bg-[#39B54A]/5 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center ring-1 ring-amber-100">
                  <ClipboardList size={18} className="text-amber-600" />
                </div>
                <div className="text-left">
                  <h2 className="text-base font-semibold text-gray-900">Work Experience</h2>
                  <p className="text-sm text-gray-500">Previous employers and references</p>
                </div>
              </div>
              <ChevronDown size={18} className={`text-gray-400 transition-transform ${activeSection === "experience" ? "rotate-180" : ""}`} />
            </button>

            {activeSection === "experience" && (
              <div className="px-6 pb-6 border-t border-gray-100 pt-6">
                {formData.previousEmployers.length > 0 && (
                  <div className="space-y-3 mb-6">
                    {formData.previousEmployers.map((emp, idx) => (
                      <div key={idx} className="p-4 bg-[#39B54A]/5 rounded-xl">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-gray-900">{emp.name}</p>
                            <p className="text-sm text-gray-500">{emp.duration}</p>
                            <p className="text-sm text-gray-600 mt-1">{emp.duties}</p>
                          </div>
                          <button
                            onClick={() => removeEmployer(idx)}
                            className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="space-y-3 p-4 border-2 border-dashed border-gray-200 rounded-xl">
                  <h4 className="font-medium text-gray-700">Add Previous Employer</h4>
                  <div className="grid md:grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="Employer Name"
                      value={newEmployer.name}
                      onChange={(e) => setNewEmployer({ ...newEmployer, name: e.target.value })}
                      className="px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#39B54A]/20 focus:border-[#39B54A] outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Duration (e.g., Jan 2020 - Dec 2022)"
                      value={newEmployer.duration}
                      onChange={(e) => setNewEmployer({ ...newEmployer, duration: e.target.value })}
                      className="px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#39B54A]/20 focus:border-[#39B54A] outline-none"
                    />
                  </div>
                  <textarea
                    placeholder="Duties and responsibilities"
                    value={newEmployer.duties}
                    onChange={(e) => setNewEmployer({ ...newEmployer, duties: e.target.value })}
                    rows={2}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#39B54A]/20 focus:border-[#39B54A] outline-none resize-none"
                  />
                  <div className="grid md:grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="Reference Name (Optional)"
                      value={newEmployer.reference}
                      onChange={(e) => setNewEmployer({ ...newEmployer, reference: e.target.value })}
                      className="px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#39B54A]/20 focus:border-[#39B54A] outline-none"
                    />
                    <input
                      type="tel"
                      placeholder="Reference Phone (Optional)"
                      value={newEmployer.contactPhone}
                      onChange={(e) => setNewEmployer({ ...newEmployer, contactPhone: e.target.value })}
                      className="px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#39B54A]/20 focus:border-[#39B54A] outline-none"
                    />
                  </div>
                  <button
                    onClick={addEmployer}
                    className="w-full py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 font-medium"
                  >
                    + Add Employer
                  </button>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    onClick={() => { setActiveSection(null); initializeFormData(profile!); }}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl hover:bg-[#39B54A]/5"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="px-6 py-2 bg-[#39B54A] text-white rounded-xl hover:bg-[#2d913c] disabled:opacity-50"
                  >
                    {isSaving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Emergency Contact Section */}
          <div className="bg-white rounded-xl border border-gray-100/80 overflow-hidden">
            <button
              onClick={() => setActiveSection(activeSection === "emergency" ? null : "emergency")}
              className="w-full flex items-center justify-between p-6 hover:bg-[#39B54A]/5 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center ring-1 ring-red-100">
                  <AlertTriangle size={18} className="text-red-500" />
                </div>
                <div className="text-left">
                  <h2 className="text-base font-semibold text-gray-900">Emergency Contact</h2>
                  <p className="text-sm text-gray-500">Contact in case of emergency</p>
                </div>
              </div>
              <ChevronDown size={18} className={`text-gray-400 transition-transform ${activeSection === "emergency" ? "rotate-180" : ""}`} />
            </button>

            {activeSection === "emergency" && (
              <div className="px-6 pb-6 border-t border-gray-100 pt-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Contact Name</label>
                    <input
                      type="text"
                      value={formData.emergencyContact.name}
                      onChange={(e) => setFormData({
                        ...formData,
                        emergencyContact: { ...formData.emergencyContact, name: e.target.value }
                      })}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#39B54A]/20 focus:border-[#39B54A] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Relationship</label>
                    <input
                      type="text"
                      value={formData.emergencyContact.relationship}
                      onChange={(e) => setFormData({
                        ...formData,
                        emergencyContact: { ...formData.emergencyContact, relationship: e.target.value }
                      })}
                      placeholder="e.g., Spouse, Parent, Sibling"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#39B54A]/20 focus:border-[#39B54A] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                    <input
                      type="tel"
                      value={formData.emergencyContact.phone}
                      onChange={(e) => setFormData({
                        ...formData,
                        emergencyContact: { ...formData.emergencyContact, phone: e.target.value }
                      })}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#39B54A]/20 focus:border-[#39B54A] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email (Optional)</label>
                    <input
                      type="email"
                      value={formData.emergencyContact.email}
                      onChange={(e) => setFormData({
                        ...formData,
                        emergencyContact: { ...formData.emergencyContact, email: e.target.value }
                      })}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#39B54A]/20 focus:border-[#39B54A] outline-none"
                    />
                  </div>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    onClick={() => { setActiveSection(null); initializeFormData(profile!); }}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl hover:bg-[#39B54A]/5"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="px-6 py-2 bg-[#39B54A] text-white rounded-xl hover:bg-[#2d913c] disabled:opacity-50"
                  >
                    {isSaving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </CaregiverLayout>
  );
}
