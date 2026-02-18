"use client";

import Link from "next/link";
import { Search, Sun } from "lucide-react";
import NotificationDropdown from "@/components/ui/NotificationDropdown";
import SafeAvatar from "./SafeAvatar";

interface TopBarProps {
  user?: {
    fullName?: string;
    email?: string;
    avatar?: string;
    role?: string;
  } | null;
}

export default function CaregiverTopBar({ user }: TopBarProps) {
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
            placeholder="Search jobs, bookings, messages..."
            className="w-full pl-11 pr-4 py-2.5 bg-gray-50/80 border border-gray-200/60 rounded-xl text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:border-[#39B54A] focus:ring-2 focus:ring-[#39B54A]/15 transition-all"
          />
          <kbd className="hidden md:inline-flex absolute right-3.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[10px] font-medium text-gray-400 bg-gray-100 rounded border border-gray-200">
            ⌘K
          </kbd>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 ml-6">
          {/* Premium Notification Dropdown (matching care-seeker UI) */}
          <NotificationDropdown />

          {/* Theme */}
          <button className="p-2.5 text-gray-500 hover:bg-gray-50 rounded-xl transition-colors">
            <Sun size={20} />
          </button>

          {/* Divider */}
          <div className="w-px h-8 bg-gray-200 mx-2" />

          {/* User Avatar */}
          <Link href="/profile/caregiver" className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-gray-900 leading-tight">
                {user?.fullName || "Caregiver"}
              </p>
              <p className="text-[11px] text-gray-500 capitalize">
                {user?.role || "Caregiver"}
              </p>
            </div>
            <div className="relative">
              <SafeAvatar
                src={user?.avatar ?? null}
                name={user?.fullName || "Caregiver"}
                size={40}
                wrapperClassName="rounded-xl ring-2 ring-[#39B54A]/20 shadow-lg shadow-[#39B54A]/20"
                fallbackClassName="bg-linear-to-br from-[#39B54A] to-[#59B966] text-white font-bold rounded-xl"
              />
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
            </div>
          </Link>
        </div>
      </div>
    </header>
  );
}
