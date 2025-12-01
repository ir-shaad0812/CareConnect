"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/ui/Logo";
import { userService } from "@/modules/user/services";
import { authService } from "@/modules/auth/services";
import type { ProfileUpdateData } from "@/modules/user/types";
import { CARE_NEED_OPTIONS as CARE_NEED_OPTION_LIST } from "@/lib/constants";
import AvatarUpload from "@/components/ui/AvatarUpload";
import { extractStatusCode } from "@/types/errors.types";

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
  careNeeds?: string[];
  preferredSchedule?: {
    days?: string[];
    hours?: { start?: string; end?: string };
  };
  budget?: {
    min?: number;
    max?: number;
    type?: string;
  };
  familyMembers?: {
    name?: string;
    age?: number;
    relationship?: string;
    specialNeeds?: string;
  }[];
  createdAt?: string;
  isEmailVerified?: boolean;
  isProfileComplete?: boolean;
}

// Care need options — from shared constants
const CARE_NEED_OPTIONS = CARE_NEED_OPTION_LIST.map((opt) => opt.label);

// Days of the week
const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function CareseekerProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Form state
  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    age: "",
    gender: "",
    bio: "",
    careNeeds: [] as string[],
    city: "",
    state: "",
    country: "",
    address: "",
    postalCode: "",
    preferredDays: [] as string[],
    preferredHoursStart: "",
    preferredHoursEnd: "",
    budgetMin: "",
    budgetMax: "",
    budgetType: "hourly",
  });

  // Family members state
  const [familyMembers, setFamilyMembers] = useState<{
    name: string;
    age: string;
    relationship: string;
    specialNeeds: string;
  }[]>([]);

  const fetchProfile = useCallback(async () => {
    try {
      setIsLoading(true);
      setError("");

      const response = await userService.getProfile();

      if (!response.success || !response.data) {
        throw new Error("Failed to fetch profile");
      }

      const user = response.data.user;

      // Check if user is a careseeker
      if (user.role !== "careseeker") {
        const redirectPath = user.role
          ? `/profile/${user.role}`
          : authService.getDashboardPathForRole(user.role) ?? "/dashboard";
        router.replace(redirectPath);
        return;
      }

      setProfile(user as unknown as UserProfile);
      
      // Initialize form with profile data
      setFormData({
        fullName: user.fullName || "",
        phone: user.phone || "",
        age: user.age?.toString() || "",
        gender: user.gender || "",
        bio: user.bio || "",
        careNeeds: user.careNeeds || [],
        city: user.location?.city || "",
        state: user.location?.state || "",
        country: user.location?.country || "",
        address: user.location?.address || "",
        postalCode: user.location?.postalCode || "",
        preferredDays: user.preferredSchedule?.days || [],
        preferredHoursStart: user.preferredSchedule?.hours?.start || "",
        preferredHoursEnd: user.preferredSchedule?.hours?.end || "",
        budgetMin: user.budget?.min?.toString() || "",
        budgetMax: user.budget?.max?.toString() || "",
        budgetType: user.budget?.type || "hourly",
      });

      // Initialize family members
      setFamilyMembers(
        user.familyMembers?.map((m: { name?: string; age?: number; relationship?: string; specialNeeds?: string }) => ({
          name: m.name || "",
          age: m.age?.toString() || "",
          relationship: m.relationship || "",
          specialNeeds: m.specialNeeds || "",
        })) || []
      );
    } catch (err: unknown) {
      const statusCode = extractStatusCode(err);
      if (statusCode === 401 || statusCode === 403) {
        router.replace("/login?redirect=/profile/careseeker");
        return;
      }

      console.error("Error fetching profile:", err);
      setError("Failed to load profile");
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void fetchProfile();
  }, [fetchProfile]);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError("");

      const parsedAge = formData.age ? parseInt(formData.age, 10) : undefined;
      const parsedGender = formData.gender
        ? (formData.gender as "male" | "female" | "other")
        : undefined;
      const parsedBudgetMin = formData.budgetMin ? parseFloat(formData.budgetMin) : undefined;
      const parsedBudgetMax = formData.budgetMax ? parseFloat(formData.budgetMax) : undefined;

      const updateData = {
        fullName: formData.fullName,
        phone: formData.phone,
        ...(parsedAge !== undefined && { age: parsedAge }),
        ...(parsedGender !== undefined && { gender: parsedGender }),
        bio: formData.bio,
        careNeeds: formData.careNeeds,
        location: {
          city: formData.city,
          state: formData.state,
          country: formData.country,
          address: formData.address,
          postalCode: formData.postalCode,
        },
        preferredSchedule: {
          days: formData.preferredDays,
          hours: {
            start: formData.preferredHoursStart,
            end: formData.preferredHoursEnd,
          },
        },
        budget: {
          ...(parsedBudgetMin !== undefined && { min: parsedBudgetMin }),
          ...(parsedBudgetMax !== undefined && { max: parsedBudgetMax }),
          type: formData.budgetType as "hourly" | "daily" | "weekly" | "monthly",
        },
        familyMembers: familyMembers
          .filter((m) => m.name)
          .map((m) => ({
            name: m.name,
            ...(m.age ? { age: parseInt(m.age, 10) } : {}),
            relationship: m.relationship,
            specialNeeds: m.specialNeeds,
          })),
      } satisfies ProfileUpdateData;

      const response = await userService.updateProfile(updateData);

      if (!response.success || !response.data) {
        throw new Error("Failed to update profile");
      }

      setProfile(response.data.user as unknown as UserProfile);
      setIsEditing(false);
      setSuccessMessage("Profile updated successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      console.error("Error updating profile:", err);
      setError("Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  const toggleCareNeed = (need: string) => {
    setFormData((prev) => ({
      ...prev,
      careNeeds: prev.careNeeds.includes(need)
        ? prev.careNeeds.filter((n) => n !== need)
        : [...prev.careNeeds, need],
    }));
  };

  const toggleDay = (day: string) => {
    setFormData((prev) => ({
      ...prev,
      preferredDays: prev.preferredDays.includes(day)
        ? prev.preferredDays.filter((d) => d !== day)
        : [...prev.preferredDays, day],
    }));
  };

  const addFamilyMember = () => {
    setFamilyMembers((prev) => [
      ...prev,
      { name: "", age: "", relationship: "", specialNeeds: "" },
    ]);
  };

  const removeFamilyMember = (index: number) => {
    setFamilyMembers((prev) => prev.filter((_, i) => i !== index));
  };

  const updateFamilyMember = (index: number, field: string, value: string) => {
    setFamilyMembers((prev) =>
      prev.map((member, i) =>
        i === index ? { ...member, [field]: value } : member
      )
    );
  };

  const handleLogout = async () => {
    await authService.logout();
    router.push("/home");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F0F5FF] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F0F5FF]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-[#E1E6EF] shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Logo variant="default" showText href="/home" />

            <nav className="flex items-center gap-6">
              <Link href="/home" className="text-sm font-medium text-gray-600 hover:text-primary-500">Home</Link>
              <Link href="/dashboard" className="text-sm font-medium text-gray-600 hover:text-primary-500">Dashboard</Link>
              <Link href="/caregivers" className="text-sm font-medium text-gray-600 hover:text-primary-500">Find Caregivers</Link>
              <button
                onClick={handleLogout}
                className="text-sm font-medium text-gray-600 hover:text-gray-800"
              >
                Logout
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Success/Error Messages */}
        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm">
            {successMessage}
          </div>
        )}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Profile Header Card */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-6">
          {/* Cover Image */}
          <div className="h-32 bg-linear-to-r from-primary-500 to-secondary-500"></div>

          <div className="px-6 pb-6">
            {/* Avatar and Actions */}
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between -mt-12 mb-4 gap-4">
              {/* Left: Avatar + Name */}
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                {/* Avatar Upload Section */}
                <div className="shrink-0">
                  <AvatarUpload
                    {...(profile?.avatar !== undefined && { avatar: profile.avatar })}
                    {...(profile?.fullName !== undefined && { fullName: profile.fullName })}
                    accentColor="#3A5BDB"
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
                      <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <p className="text-gray-500">Care Seeker</p>
                </div>
              </div>
              {/* Right: Action Buttons */}
              <div className="flex justify-center sm:justify-start lg:justify-end pt-0 lg:pt-16">
                {!isEditing ? (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-6 py-2.5 bg-primary-500 hover:bg-[#2F4BDB] text-white font-medium rounded-xl transition-colors"
                  >
                    Edit Profile
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setIsEditing(false)}
                      className="px-4 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-[#F0F5FF] transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="px-6 py-2.5 bg-primary-500 hover:bg-[#2F4BDB] text-white font-medium rounded-xl transition-colors disabled:opacity-50"
                    >
                      {isSaving ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap gap-3 mt-6">
              <Link
                href="/caregivers"
                className="flex items-center gap-2 px-4 py-2.5 bg-[#F0F5FF] text-primary-500 font-medium rounded-xl hover:bg-[#E1E6EF] transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Find Caregivers
              </Link>
              <Link
                href="/dashboard/bookings"
                className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                My Bookings
              </Link>
            </div>
          </div>
        </div>

        {/* Profile Details */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Personal Information */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Full Name</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => setFormData((prev) => ({ ...prev, fullName: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-[#E1E6EF] rounded-xl focus:ring-2 focus:ring-[#4461F2]/20 focus:border-primary-500 outline-none"
                  />
                ) : (
                  <p className="text-gray-900">{profile?.fullName}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Email</label>
                <p className="text-gray-900">{profile?.email}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Phone</label>
                {isEditing ? (
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-[#E1E6EF] rounded-xl focus:ring-2 focus:ring-[#4461F2]/20 focus:border-primary-500 outline-none"
                  />
                ) : (
                  <p className="text-gray-900">{profile?.phone || "Not provided"}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Age</label>
                  {isEditing ? (
                    <input
                      type="number"
                      value={formData.age}
                      onChange={(e) => setFormData((prev) => ({ ...prev, age: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-[#E1E6EF] rounded-xl focus:ring-2 focus:ring-[#4461F2]/20 focus:border-primary-500 outline-none"
                    />
                  ) : (
                    <p className="text-gray-900">{profile?.age || "Not provided"}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Gender</label>
                  {isEditing ? (
                    <select
                      value={formData.gender}
                      onChange={(e) => setFormData((prev) => ({ ...prev, gender: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-[#E1E6EF] rounded-xl focus:ring-2 focus:ring-[#4461F2]/20 focus:border-primary-500 outline-none"
                    >
                      <option value="">Select</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  ) : (
                    <p className="text-gray-900 capitalize">{profile?.gender || "Not provided"}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Location</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Address</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-[#E1E6EF] rounded-xl focus:ring-2 focus:ring-[#4461F2]/20 focus:border-primary-500 outline-none"
                  />
                ) : (
                  <p className="text-gray-900">{profile?.location?.address || "Not provided"}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">City</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData((prev) => ({ ...prev, city: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-[#E1E6EF] rounded-xl focus:ring-2 focus:ring-[#4461F2]/20 focus:border-primary-500 outline-none"
                    />
                  ) : (
                    <p className="text-gray-900">{profile?.location?.city || "Not provided"}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">State</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.state}
                      onChange={(e) => setFormData((prev) => ({ ...prev, state: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-[#E1E6EF] rounded-xl focus:ring-2 focus:ring-[#4461F2]/20 focus:border-primary-500 outline-none"
                    />
                  ) : (
                    <p className="text-gray-900">{profile?.location?.state || "Not provided"}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Country</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.country}
                      onChange={(e) => setFormData((prev) => ({ ...prev, country: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-[#E1E6EF] rounded-xl focus:ring-2 focus:ring-[#4461F2]/20 focus:border-primary-500 outline-none"
                    />
                  ) : (
                    <p className="text-gray-900">{profile?.location?.country || "Not provided"}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Postal Code</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.postalCode}
                      onChange={(e) => setFormData((prev) => ({ ...prev, postalCode: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-[#E1E6EF] rounded-xl focus:ring-2 focus:ring-[#4461F2]/20 focus:border-primary-500 outline-none"
                    />
                  ) : (
                    <p className="text-gray-900">{profile?.location?.postalCode || "Not provided"}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* About / Bio */}
          <div className="bg-white rounded-2xl shadow-lg p-6 md:col-span-2">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">About My Care Needs</h2>
            
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Description</label>
              {isEditing ? (
                <textarea
                  value={formData.bio}
                  onChange={(e) => setFormData((prev) => ({ ...prev, bio: e.target.value }))}
                  rows={4}
                  className="w-full px-4 py-2.5 border border-[#E1E6EF] rounded-xl focus:ring-2 focus:ring-[#4461F2]/20 focus:border-primary-500 outline-none resize-none"
                  placeholder="Describe your care needs, preferences, and what you're looking for in a caregiver..."
                />
              ) : (
                <p className="text-gray-900">{profile?.bio || "No description provided yet."}</p>
              )}
            </div>
          </div>

          {/* Care Needs */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Care Needs</h2>
            
            {isEditing ? (
              <div className="flex flex-wrap gap-2">
                {CARE_NEED_OPTIONS.map((need) => (
                  <button
                    key={need}
                    type="button"
                    onClick={() => toggleCareNeed(need)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      formData.careNeeds.includes(need)
                        ? "bg-primary-500 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-[#E1E6EF]"
                    }`}
                  >
                    {need}
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {(profile?.careNeeds?.length || 0) > 0 ? (
                  profile?.careNeeds?.map((need) => (
                    <span
                      key={need}
                      className="px-3 py-1.5 bg-[#F0F5FF] text-primary-500 rounded-full text-sm font-medium"
                    >
                      {need}
                    </span>
                  ))
                ) : (
                  <p className="text-gray-500">No care needs specified yet.</p>
                )}
              </div>
            )}
          </div>

          {/* Preferred Schedule & Budget */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Schedule & Budget</h2>
            
            {isEditing ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">Preferred Days</label>
                  <div className="flex flex-wrap gap-2">
                    {DAYS_OF_WEEK.map((day) => (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleDay(day)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                          formData.preferredDays.includes(day)
                            ? "bg-primary-500 text-white"
                            : "bg-gray-100 text-gray-600 hover:bg-[#E1E6EF]"
                        }`}
                      >
                        {day.slice(0, 3)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Start Time</label>
                    <input
                      type="time"
                      value={formData.preferredHoursStart}
                      onChange={(e) => setFormData((prev) => ({ ...prev, preferredHoursStart: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-[#E1E6EF] rounded-xl focus:ring-2 focus:ring-[#4461F2]/20 focus:border-primary-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">End Time</label>
                    <input
                      type="time"
                      value={formData.preferredHoursEnd}
                      onChange={(e) => setFormData((prev) => ({ ...prev, preferredHoursEnd: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-[#E1E6EF] rounded-xl focus:ring-2 focus:ring-[#4461F2]/20 focus:border-primary-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">Budget Range</label>
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="number"
                      value={formData.budgetMin}
                      onChange={(e) => setFormData((prev) => ({ ...prev, budgetMin: e.target.value }))}
                      placeholder="Min ($)"
                      className="w-full px-4 py-2.5 border border-[#E1E6EF] rounded-xl focus:ring-2 focus:ring-[#4461F2]/20 focus:border-primary-500 outline-none"
                    />
                    <input
                      type="number"
                      value={formData.budgetMax}
                      onChange={(e) => setFormData((prev) => ({ ...prev, budgetMax: e.target.value }))}
                      placeholder="Max ($)"
                      className="w-full px-4 py-2.5 border border-[#E1E6EF] rounded-xl focus:ring-2 focus:ring-[#4461F2]/20 focus:border-primary-500 outline-none"
                    />
                    <select
                      value={formData.budgetType}
                      onChange={(e) => setFormData((prev) => ({ ...prev, budgetType: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-[#E1E6EF] rounded-xl focus:ring-2 focus:ring-[#4461F2]/20 focus:border-primary-500 outline-none"
                    >
                      <option value="hourly">Per Hour</option>
                      <option value="daily">Per Day</option>
                      <option value="weekly">Per Week</option>
                    </select>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <span className="text-sm text-gray-600">Preferred Days: </span>
                  <span className="text-gray-900">
                    {profile?.preferredSchedule?.days?.join(", ") || "Not specified"}
                  </span>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Preferred Hours: </span>
                  <span className="text-gray-900">
                    {profile?.preferredSchedule?.hours?.start && profile?.preferredSchedule?.hours?.end
                      ? `${profile.preferredSchedule.hours.start} - ${profile.preferredSchedule.hours.end}`
                      : "Not specified"}
                  </span>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Budget: </span>
                  <span className="text-gray-900">
                    {profile?.budget?.min || profile?.budget?.max
                      ? `Rs. ${Number(profile.budget.min || 0).toLocaleString("en-NP")} - Rs. ${Number(profile.budget.max || 0).toLocaleString("en-NP")} ${profile.budget.type || "hourly"}`
                      : "Not specified"}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Family Members */}
          <div className="bg-white rounded-2xl shadow-lg p-6 md:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Family Members Needing Care</h2>
              {isEditing && (
                <button
                  type="button"
                  onClick={addFamilyMember}
                  className="flex items-center gap-1 text-sm text-primary-500 hover:text-[#2F4BDB] font-medium"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add Member
                </button>
              )}
            </div>
            
            {isEditing ? (
              <div className="space-y-4">
                {familyMembers.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">
                    No family members added. Click &quot;Add Member&quot; to add someone who needs care.
                  </p>
                ) : (
                  familyMembers.map((member, index) => (
                    <div key={index} className="p-4 bg-[#F0F5FF] rounded-xl space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-700">Member {index + 1}</span>
                        <button
                          type="button"
                          onClick={() => removeFamilyMember(index)}
                          className="text-red-500 hover:text-red-600 text-sm"
                        >
                          Remove
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <input
                          type="text"
                          value={member.name}
                          onChange={(e) => updateFamilyMember(index, "name", e.target.value)}
                          placeholder="Name"
                          className="w-full px-4 py-2.5 border border-[#E1E6EF] rounded-xl focus:ring-2 focus:ring-[#4461F2]/20 focus:border-primary-500 outline-none"
                        />
                        <input
                          type="number"
                          value={member.age}
                          onChange={(e) => updateFamilyMember(index, "age", e.target.value)}
                          placeholder="Age"
                          className="w-full px-4 py-2.5 border border-[#E1E6EF] rounded-xl focus:ring-2 focus:ring-[#4461F2]/20 focus:border-primary-500 outline-none"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <select
                          value={member.relationship}
                          onChange={(e) => updateFamilyMember(index, "relationship", e.target.value)}
                          className="w-full px-4 py-2.5 border border-[#E1E6EF] rounded-xl focus:ring-2 focus:ring-[#4461F2]/20 focus:border-primary-500 outline-none"
                        >
                          <option value="">Relationship</option>
                          <option value="child">Child</option>
                          <option value="parent">Parent</option>
                          <option value="grandparent">Grandparent</option>
                          <option value="spouse">Spouse</option>
                          <option value="sibling">Sibling</option>
                          <option value="other">Other</option>
                        </select>
                        <input
                          type="text"
                          value={member.specialNeeds}
                          onChange={(e) => updateFamilyMember(index, "specialNeeds", e.target.value)}
                          placeholder="Special needs (optional)"
                          className="w-full px-4 py-2.5 border border-[#E1E6EF] rounded-xl focus:ring-2 focus:ring-[#4461F2]/20 focus:border-primary-500 outline-none"
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {(profile?.familyMembers?.length || 0) > 0 ? (
                  profile?.familyMembers?.map((member, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-[#F0F5FF] rounded-xl">
                      <div>
                        <p className="font-medium text-gray-900">{member.name}</p>
                        <p className="text-sm text-gray-500">
                          {member.relationship && `${member.relationship}, `}
                          {member.age && `${member.age} years old`}
                          {member.specialNeeds && ` • ${member.specialNeeds}`}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-4">No family members added yet.</p>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
