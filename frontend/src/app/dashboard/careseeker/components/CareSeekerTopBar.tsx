"use client";

import Link from "next/link";
import Image from "next/image";
import { Search, Sun } from "lucide-react";
import NotificationDropdown from "@/components/ui/NotificationDropdown";

interface TopBarProps {
  user?: {
    fullName?: string;
    email?: string;
    avatar?: string;
    role?: string;
  } | null;
}

export default function CareSeekerTopBar({ user }: TopBarProps) {
  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-xl border-b border-gray-100/80">
      <div className="flex items-center justify-between px-6 h-16">
        {/* Search */}
        <div className="relative flex-1 max-w-lg">
          <Search
            size={18}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Search caregivers, bookings, messages..."
            className="w-full pl-11 pr-4 py-2.5 bg-gray-50/80 border border-gray-200/60 rounded-xl text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:border-[#39B54A] focus:ring-2 focus:ring-[#39B54A]/15 transition-all"
          />
          <kbd className="hidden md:inline-flex absolute right-3.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[10px] font-medium text-gray-400 bg-gray-100 rounded border border-gray-200">
            ⌘K
          </kbd>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 ml-6">
          {/* Premium Notification Dropdown */}
          <NotificationDropdown />

          {/* Theme */}
          <button className="p-2.5 text-gray-500 hover:bg-gray-50 rounded-xl transition-colors">
            <Sun size={20} />
          </button>

          {/* Divider */}
          <div className="w-px h-8 bg-gray-200 mx-2" />

          {/* User Avatar */}
          <Link
            href="/profile"
            className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer"
          >
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-gray-900 leading-tight">
                {user?.fullName || "Care Seeker"}
              </p>
              <p className="text-[11px] text-gray-500 capitalize">
                {user?.role || "Care Seeker"}
              </p>
            </div>
            <div className="relative">
              {user?.avatar ? (
                <Image
                  src={user.avatar}
                  alt={user.fullName || "User"}
                  width={40}
                  height={40}
                  className="rounded-xl object-cover ring-2 ring-[#39B54A]/20"
                />
              ) : (
                <div className="w-10 h-10 bg-linear-to-br from-[#39B54A] to-[#59B966] rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-[#39B54A]/20">
                  {user?.fullName?.charAt(0)?.toUpperCase() || "S"}
                </div>
              )}
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
            </div>
          </Link>
        </div>
      </div>
    </header>
  );
}
