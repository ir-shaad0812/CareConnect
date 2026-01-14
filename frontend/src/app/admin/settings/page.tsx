// ============================================
// ADMIN SETTINGS PAGE
// Admin profile and settings
// ============================================

"use client";

import { useState, useEffect } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { authService } from "@/services";
import type { User } from "@/types";

export default function AdminSettingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState("profile");

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    setUser(currentUser);
  }, []);

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-500">Manage your admin profile and preferences</p>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex gap-8">
            {[
              { id: "profile", name: "Profile" },
              { id: "security", name: "Security" },
              { id: "notifications", name: "Notifications" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`pb-4 text-sm font-medium transition border-b-2 ${
                  activeTab === tab.id
                    ? "border-primary-500 text-primary-500"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Profile Tab */}
        {activeTab === "profile" && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-6">Profile Information</h2>
            
            <div className="flex items-center gap-6 mb-8">
              <div className="w-24 h-24 bg-primary-500 rounded-full flex items-center justify-center">
                <span className="text-white text-3xl font-semibold">
                  {user?.fullName?.charAt(0)?.toUpperCase() || "A"}
                </span>
              </div>
              <div>
                <h3 className="text-xl font-semibold">{user?.fullName}</h3>
                <p className="text-gray-500">{user?.email}</p>
                <span className="inline-block mt-2 px-3 py-1 bg-[#F0F5FF] text-primary-500 text-sm font-medium rounded-full">
                  Administrator
                </span>
              </div>
            </div>

            <div className="grid gap-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={user?.fullName || ""}
                    readOnly
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={user?.email || ""}
                    readOnly
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Role
                  </label>
                  <input
                    type="text"
                    value="Administrator"
                    readOnly
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <input
                    type="text"
                    value="Active"
                    readOnly
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Security Tab */}
        {activeTab === "security" && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold mb-6">Change Password</h2>
              
              <form className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Current Password
                  </label>
                  <input
                    type="password"
                    placeholder="Enter current password"
                    className="w-full px-4 py-3 border border-[#E1E6EF] rounded-lg focus:ring-2 focus:ring-[#4461F2] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    New Password
                  </label>
                  <input
                    type="password"
                    placeholder="Enter new password"
                    className="w-full px-4 py-3 border border-[#E1E6EF] rounded-lg focus:ring-2 focus:ring-[#4461F2] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    placeholder="Confirm new password"
                    className="w-full px-4 py-3 border border-[#E1E6EF] rounded-lg focus:ring-2 focus:ring-[#4461F2] focus:border-transparent"
                  />
                </div>
                <button
                  type="submit"
                  className="px-6 py-3 bg-primary-500 text-white rounded-lg hover:bg-[#2F4BDB] transition"
                >
                  Update Password
                </button>
              </form>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold mb-4">Login Sessions</h2>
              <p className="text-gray-500 mb-4">
                Manage your active sessions across different devices.
              </p>
              
              <div className="border border-gray-200 rounded-lg p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium">Current Session</p>
                    <p className="text-sm text-gray-500">Windows • Chrome • Active now</p>
                  </div>
                </div>
                <span className="px-3 py-1 bg-green-100 text-green-700 text-sm rounded-full">
                  Active
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === "notifications" && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-6">Notification Preferences</h2>
            
            <div className="space-y-6">
              <div className="flex items-center justify-between py-4 border-b border-gray-100">
                <div>
                  <p className="font-medium">New User Registrations</p>
                  <p className="text-sm text-gray-500">Get notified when new users register</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" defaultChecked className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#4461F2]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
                </label>
              </div>

              <div className="flex items-center justify-between py-4 border-b border-gray-100">
                <div>
                  <p className="font-medium">Document Submissions</p>
                  <p className="text-sm text-gray-500">Get notified when documents are submitted for verification</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" defaultChecked className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#4461F2]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
                </label>
              </div>

              <div className="flex items-center justify-between py-4 border-b border-gray-100">
                <div>
                  <p className="font-medium">User Reports</p>
                  <p className="text-sm text-gray-500">Get notified when users report issues</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" defaultChecked className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#4461F2]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
                </label>
              </div>

              <div className="flex items-center justify-between py-4">
                <div>
                  <p className="font-medium">Email Notifications</p>
                  <p className="text-sm text-gray-500">Receive email summaries</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#4461F2]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Danger Zone */}
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-red-700 mb-2">Danger Zone</h2>
          <p className="text-red-600 text-sm mb-4">
            These actions are irreversible. Please proceed with caution.
          </p>
          <button
            className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-100 transition"
          >
            Deactivate Admin Account
          </button>
        </div>
      </div>
    </AdminLayout>
  );
}
