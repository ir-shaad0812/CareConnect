"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/ui/Logo";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Search,
  CalendarDays,
  MessageSquare,
  DollarSign,
  Star,
  ClipboardCheck,
  Settings,
  LogOut,
  ChevronLeft,
  HelpCircle,
  StickyNote,
  Bell,
  Wallet,
  AlertTriangle,
  Activity,
} from "lucide-react";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  user?: {
    fullName?: string;
    email?: string;
    avatar?: string;
    role?: string;
  } | null;
  onLogout: () => void;
  messageCount?: number;
}

interface NavItem {
  icon: React.ElementType;
  label: string;
  href: string;
  badge?: number | undefined;
}

const bottomNavItems: NavItem[] = [
  { icon: HelpCircle, label: "Help Center", href: "/dashboard/careseeker/support" },
  { icon: Settings, label: "Settings", href: "/profile" },
];

export default function CareSeekerSidebar({
  collapsed,
  onToggle,
  user,
  onLogout,
  messageCount,
}: SidebarProps) {
  const pathname = usePathname();

  const mainNavItems: NavItem[] = [
    {
      icon: LayoutDashboard,
      label: "Dashboard",
      href: "/dashboard/careseeker",
    },
    { icon: Search, label: "Find Caregivers", href: "/caregivers" },
    { icon: CalendarDays, label: "Bookings", href: "/dashboard/bookings" },
    {
      icon: ClipboardCheck,
      label: "Tracking Review",
      href: "/dashboard/careseeker/tracking",
    },
    {
      icon: MessageSquare,
      label: "Messages",
      href: "/messages",
      badge: messageCount,
    },
    { icon: Bell, label: "Notifications", href: "/dashboard/notifications" },
    { icon: AlertTriangle, label: "Disputes", href: "/dashboard/disputes" },
    { icon: DollarSign, label: "Payments", href: "/dashboard/payments" },
    { icon: Wallet, label: "Wallet", href: "/dashboard/careseeker/wallet" },
    { icon: Star, label: "Reviews", href: "/dashboard/careseeker/reviews" },
    { icon: StickyNote, label: "Notes", href: "/dashboard/careseeker/notes" },
    { icon: Bell, label: "Notice Board", href: "/notices" },
    { icon: Activity, label: "Activity", href: "/dashboard/activity" },
  ];

  const isActive = (href: string) => {
    if (href === "/dashboard/careseeker")
      return pathname === "/dashboard/careseeker";
    return pathname?.startsWith(href);
  };

  return (
    <aside
      className={`fixed left-0 top-0 h-full bg-white border-r border-gray-100/80 z-40 transition-all duration-300 flex flex-col shadow-sm ${
        collapsed ? "w-18" : "w-65"
      }`}
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-gray-100/80">
        <Logo variant="sidebar" href="/home" showText={!collapsed} />
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-thin">
        {!collapsed && (
          <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
            Main Menu
          </p>
        )}
        {mainNavItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);

          return (
            <Link
              key={`${item.href}-${item.label}`}
              href={item.href}
              className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${
                active
                  ? "bg-[#39B54A]/10 text-[#39B54A] font-semibold"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              {active && (
                <motion.div
                  layoutId="sidebar-active-cs"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-0.75 h-6 bg-[#39B54A] rounded-r-full"
                  transition={{ type: "spring", stiffness: 350, damping: 30 }}
                />
              )}
              <Icon
                size={20}
                className={`shrink-0 ${
                  active
                    ? "text-[#39B54A]"
                    : "text-gray-400 group-hover:text-gray-600"
                }`}
              />
              <AnimatePresence>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-sm whitespace-nowrap"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
              {item.badge != null && item.badge > 0 && !collapsed && (
                <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-500 text-white min-w-4.5 text-center">
                  {item.badge}
                </span>
              )}
              {item.badge != null && item.badge > 0 && collapsed && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Section */}
      <div className="px-3 py-3 border-t border-gray-100/80 space-y-1">
        {!collapsed && (
          <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
            Support
          </p>
        )}
        {bottomNavItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all duration-200"
            >
              <Icon size={20} className="text-gray-400 shrink-0" />
              {!collapsed && <span className="text-sm">{item.label}</span>}
            </Link>
          );
        })}

        {/* Logout */}
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-600 hover:bg-red-50 hover:text-red-600 transition-all duration-200"
        >
          <LogOut size={20} className="text-gray-400 shrink-0" />
          {!collapsed && <span className="text-sm">Logout</span>}
        </button>

        {/* Collapse Toggle */}
        <button
          onClick={onToggle}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-500 hover:bg-gray-50 transition-all duration-200"
        >
          <ChevronLeft
            size={20}
            className={`text-gray-400 transition-transform duration-300 shrink-0 ${
              collapsed ? "rotate-180" : ""
            }`}
          />
          {!collapsed && <span className="text-sm">Collapse</span>}
        </button>
      </div>

      {/* User Profile Mini */}
      {!collapsed && (
        <div className="px-3 pb-3">
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
            <div className="relative shrink-0">
              {user?.avatar ? (
                <Image
                  src={user.avatar}
                  alt={user.fullName || "User"}
                  width={36}
                  height={36}
                  className="rounded-lg object-cover"
                />
              ) : (
                <div className="w-9 h-9 bg-linear-to-br from-[#39B54A] to-[#59B966] rounded-lg flex items-center justify-center text-white font-semibold text-sm">
                  {user?.fullName?.charAt(0)?.toUpperCase() || "S"}
                </div>
              )}
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">
                {user?.fullName || "Care Seeker"}
              </p>
              <p className="text-[11px] text-gray-500 truncate">
                {user?.email}
              </p>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
