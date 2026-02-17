// ============================================
// NAVBAR COMPONENT
// Modern animated navigation bar with bubble effect
// ============================================

"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { authService } from "@/services/api/auth.service";
import { useLanguage } from "@/context/LanguageContext";
import { ChevronDown, Shield, HelpCircle, BookOpen, Calculator, Building2, Receipt } from "lucide-react";
import NotificationDropdown from "@/components/ui/NotificationDropdown";
import { Logo } from "@/components/ui/Logo";
import type { User } from "@/types";

interface NavLink {
  href: string;
  label: string;
  isDropdown?: boolean;
}

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { t, language, setLanguage, languages, currentLanguage } = useLanguage();
  
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  // Bubble navigation state
  const [activeIndex, setActiveIndex] = useState(0);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [bubbleStyle, setBubbleStyle] = useState({ left: 0, width: 0 });
  const [hoverBubbleStyle, setHoverBubbleStyle] = useState({ left: 0, width: 0, opacity: 0 });
  const navRef = useRef<HTMLDivElement>(null);
  const linkRefs = useRef<(HTMLElement | null)[]>([]);
  
  const langDropdownRef = useRef<HTMLDivElement>(null);
  const userDropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const resourcesRef = useRef<HTMLDivElement>(null);
  const [resourcesOpen, setResourcesOpen] = useState(false);

  // Resources dropdown items (care.com style)
  const resourcesItems = [
    { href: "/safety", label: "Safety Center", description: "Learn about our safety standards", icon: <Shield className="w-4 h-4 text-[#9747FF]" /> },
    { href: "/help", label: "Help Center", description: "Get answers to your questions", icon: <HelpCircle className="w-4 h-4 text-[#9747FF]" /> },
    { href: "/articles", label: "Articles & Guides", description: "Expert care advice and tips", icon: <BookOpen className="w-4 h-4 text-[#9747FF]" /> },
    { href: "/cost-calculator", label: "Cost of Care", description: "Estimate your care costs", icon: <Calculator className="w-4 h-4 text-[#9747FF]" /> },
    { href: "/employer-benefits", label: "Employer Benefits", description: "Care benefits for employees", icon: <Building2 className="w-4 h-4 text-[#9747FF]" /> },
    { href: "/payroll", label: "Payroll & Compliance", description: "Tax and payroll solutions", icon: <Receipt className="w-4 h-4 text-[#9747FF]" /> },
  ];

  // Dynamic nav links based on user role - memoized to prevent infinite re-renders
  const navLinks = useMemo((): NavLink[] => {
    const baseLinks: NavLink[] = [
      { href: "/home", label: t.nav.home || "Home" },
      { href: "/caregivers", label: t.nav.findCaregivers || "Find Caregivers" },
      { href: "/how-it-works", label: t.nav.howItWorks || "How It Works" },
      { href: "#resources", label: "Resources", isDropdown: true },
    ];
    
    // Add role-specific navigation links
    if (user?.role === "careseeker") {
      // Care seeker gets My Timetable to book caregivers
      baseLinks.splice(2, 0, { href: "/my-timetable", label: t.nav.myTimetable || "My Timetable" });
    }
    
    if (user?.role === "caregiver") {
      // Caregiver gets My Care (their assigned bookings)
      baseLinks.splice(2, 0, { href: "/my-care", label: t.nav.myCare || "My Care" });
    }
    
    if (user?.role === "admin") {
      baseLinks.push({ href: "/admin", label: "Admin" });
    }
    
    return baseLinks;
  }, [t, user?.role]);

  const isActive = useCallback((href: string) => {
    if (href === "/home") return pathname === "/home" || pathname === "/";
    return pathname.startsWith(href);
  }, [pathname]);

  // Calculate bubble position
  const updateBubblePosition = useCallback((index: number, isHover = false) => {
    const link = linkRefs.current[index];
    const nav = navRef.current;
    
    if (link && nav) {
      const navRect = nav.getBoundingClientRect();
      const linkRect = link.getBoundingClientRect();
      
      const style = {
        left: linkRect.left - navRect.left,
        width: linkRect.width,
      };
      
      if (isHover) {
        setHoverBubbleStyle({ ...style, opacity: 1 });
      } else {
        setBubbleStyle(style);
      }
    }
  }, []);

  // Set active index based on current path
  useEffect(() => {
    const index = navLinks.findIndex(link => isActive(link.href));
    if (index !== -1 && index !== activeIndex) {
      setActiveIndex(index);
    }
  }, [pathname, navLinks, isActive, activeIndex]);

  // Update bubble position when active index changes
  useEffect(() => {
    updateBubblePosition(activeIndex);
  }, [activeIndex, updateBubblePosition, navLinks]);

  // Update bubble position on window resize
  useEffect(() => {
    const handleResize = () => updateBubblePosition(activeIndex);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [activeIndex, updateBubblePosition]);

  useEffect(() => {
    const storedUser = authService.getCurrentUser();
    setUser(storedUser);
    setIsLoading(false);

    const handleUserUpdated = () => {
      const updated = authService.getCurrentUser();
      setUser(updated);
    };
    window.addEventListener("userUpdated", handleUserUpdated);
    return () => window.removeEventListener("userUpdated", handleUserUpdated);
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (langDropdownRef.current && !langDropdownRef.current.contains(event.target as Node)) {
        setLangDropdownOpen(false);
      }
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setSearchOpen(false);
      }
      if (resourcesRef.current && !resourcesRef.current.contains(event.target as Node)) {
        setResourcesOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchOpen]);

  const handleLogout = async () => {
    await authService.logout();
    setUser(null);
    setUserDropdownOpen(false);
    router.push("/home");
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchOpen(false);
      setSearchQuery("");
    }
  };

  const handleNavHover = (index: number) => {
    setHoverIndex(index);
    updateBubblePosition(index, true);
  };

  const handleNavLeave = () => {
    setHoverIndex(null);
    setHoverBubbleStyle(prev => ({ ...prev, opacity: 0 }));
  };

  const dashboardHref = user?.role === "admin" ? "/admin/dashboard" : "/dashboard";
  const profileHref = user?.role ? `/profile/${user.role}` : "/profile";

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <Logo
            variant="default"
            showText
            textClassName="font-bold text-xl text-gray-900 hidden sm:block"
            href="/home"
          />

          {/* Desktop Navigation - Bubble Style */}
          <div className="hidden lg:block">
            <div className="relative p-1 rounded-full bg-linear-to-b from-gray-100 to-gray-200/80 shadow-[inset_0_1px_1px_rgba(255,255,255,0.8),0_1px_3px_rgba(0,0,0,0.1)]">
              {/* Outer glow effect */}
              <div className="absolute -inset-px rounded-full bg-linear-to-b from-white/60 to-transparent -z-10" />
              
              <nav 
                ref={navRef}
                className="relative flex items-center gap-0.5 p-1"
                onMouseLeave={handleNavLeave}
              >
                {/* Active bubble - z-0 so links are clickable */}
                <div
                  className="absolute z-0 h-[calc(100%-8px)] top-1 rounded-full bg-linear-to-b from-white to-gray-50 shadow-[0_1px_3px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,1)] transition-all duration-300 ease-out pointer-events-none"
                  style={{
                    left: bubbleStyle.left,
                    width: bubbleStyle.width,
                  }}
                />
                
                {/* Hover bubble - z-0 so links are clickable */}
                <div
                  className="absolute z-0 h-[calc(100%-8px)] top-1 rounded-full bg-gray-200/50 transition-all duration-200 ease-out pointer-events-none"
                  style={{
                    left: hoverBubbleStyle.left,
                    width: hoverBubbleStyle.width,
                    opacity: hoverIndex !== null && hoverIndex !== activeIndex ? hoverBubbleStyle.opacity : 0,
                  }}
                />
                
                {navLinks.map((link, index) => {
                  if (link.isDropdown) {
                    return (
                      <div key={link.href} className="relative" ref={resourcesRef}>
                        <button
                          ref={(el) => { linkRefs.current[index] = el; }}
                          onClick={() => setResourcesOpen(!resourcesOpen)}
                          onMouseEnter={() => handleNavHover(index)}
                          className={`relative z-10 px-5 py-2.5 text-sm font-medium rounded-full transition-colors duration-200 whitespace-nowrap cursor-pointer flex items-center gap-1 ${
                            resourcesOpen
                              ? "text-[#9747FF]"
                              : "text-gray-600 hover:text-gray-900"
                          }`}
                        >
                          {link.label}
                          <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${resourcesOpen ? "rotate-180" : ""}`} />
                        </button>

                        {resourcesOpen && (
                          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-4 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                            <div className="px-4 py-2.5 border-b border-gray-100">
                              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Resources</p>
                            </div>
                            {resourcesItems.map((item) => (
                              <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => { setResourcesOpen(false); setMobileMenuOpen(false); }}
                                className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-[#F8F5FF] hover:text-[#9747FF] transition-colors group"
                              >
                                <div className="p-2 rounded-lg bg-gray-50 group-hover:bg-[#9747FF]/10 transition-colors">
                                  {item.icon}
                                </div>
                                <div>
                                  <p className="font-medium">{item.label}</p>
                                  <p className="text-xs text-gray-500">{item.description}</p>
                                </div>
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  }
                  return (
                    <Link
                      key={link.href}
                      ref={(el) => { linkRefs.current[index] = el; }}
                      href={link.href}
                      onClick={() => console.log('Navigating to:', link.href)}
                      onMouseEnter={() => handleNavHover(index)}
                      className={`relative z-10 px-5 py-2.5 text-sm font-medium rounded-full transition-colors duration-200 whitespace-nowrap cursor-pointer ${
                        isActive(link.href)
                          ? "text-[#9747FF]"
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      {link.label}
                    </Link>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Search Button */}
            <div className="relative" ref={searchRef}>
              {searchOpen ? (
                <form onSubmit={handleSearch} className="flex items-center animate-in fade-in slide-in-from-right-2 duration-200">
                  <div className="relative">
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search caregivers..."
                      className="w-44 sm:w-56 lg:w-64 pl-4 pr-10 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-[#9747FF]/20 focus:border-[#9747FF] transition-all"
                    />
                    <button
                      type="submit"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#9747FF] transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  onClick={() => setSearchOpen(true)}
                  className="p-2.5 text-gray-500 hover:text-[#9747FF] hover:bg-gray-100 rounded-full transition-all"
                  aria-label="Search"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
              )}
            </div>

            {/* Notification Dropdown */}
            {user && <NotificationDropdown />}

            {/* Divider */}
            <div className="hidden sm:block w-px h-8 bg-gray-200 mx-1" />

            {/* Language Switcher */}
            <div className="relative" ref={langDropdownRef}>
              <button
                onClick={() => setLangDropdownOpen(!langDropdownOpen)}
                className="flex items-center gap-1.5 px-2.5 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-all"
                aria-label="Select language"
              >
                <span className="text-base">{currentLanguage.flag}</span>
                <svg 
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${langDropdownOpen ? "rotate-180" : ""}`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {langDropdownOpen && (
                <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="px-3 py-2 border-b border-gray-100">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                      Language
                    </p>
                  </div>
                  {languages.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => {
                        setLanguage(lang.code as "en" | "ne" | "hi" | "es" | "ar" | "fr");
                        setLangDropdownOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-gray-50 transition-colors ${
                        language === lang.code ? "bg-[#F8F5FF] text-[#9747FF]" : "text-gray-700"
                      }`}
                    >
                      <span className="text-lg">{lang.flag}</span>
                      <span className="font-medium flex-1 text-left">{lang.name}</span>
                      {lang.rtl && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded font-medium">RTL</span>
                      )}
                      {language === lang.code && (
                        <svg className="w-4 h-4 text-[#9747FF]" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Auth Section */}
            {isLoading ? (
              <div className="w-9 h-9 border-2 border-[#9747FF] border-t-transparent rounded-full animate-spin" />
            ) : user ? (
              <div className="relative" ref={userDropdownRef}>
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2 p-1 rounded-full hover:bg-gray-100 transition-all group"
                  aria-label="User menu"
                >
                  <div className="w-9 h-9 bg-linear-to-br from-[#9747FF] to-[#7B2FF7] rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-lg shadow-[#9747FF]/25 ring-2 ring-white group-hover:ring-[#9747FF]/20 transition-all overflow-hidden">
                    {user.avatar ? (
                      <img src={user.avatar} alt={user.fullName ?? "Profile"} className="w-full h-full object-cover" />
                    ) : (
                      user.fullName?.charAt(0)?.toUpperCase() || "U"
                    )}
                  </div>
                </button>

                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    {/* Profile Header */}
                    <div className="px-4 py-4 bg-linear-to-br from-[#F8F5FF] via-white to-[#F0EBFF]">
                      <div className="flex items-center gap-3">
                        <div className="w-14 h-14 bg-linear-to-br from-[#9747FF] to-[#7B2FF7] rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-[#9747FF]/30 ring-4 ring-white overflow-hidden">
                          {user.avatar ? (
                            <img src={user.avatar} alt={user.fullName ?? "Profile"} className="w-full h-full object-cover" />
                          ) : (
                            user.fullName?.charAt(0)?.toUpperCase() || "U"
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 truncate">{user.fullName}</p>
                          <p className="text-sm text-[#9747FF] font-medium capitalize">
                            {user.role === "careseeker" ? "Care Seeker" : user.role === "caregiver" ? "Caregiver" : user.role}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    {/* User Details */}
                    <div className="px-4 py-3 space-y-2 border-b border-gray-100 bg-gray-50/50">
                      <div className="flex items-center gap-3 text-sm">
                        <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        <span className="text-gray-600 truncate">{user.email}</span>
                      </div>
                      {user.location?.city && (
                        <div className="flex items-center gap-3 text-sm">
                          <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span className="text-gray-600">{user.location.city}{user.location.state ? `, ${user.location.state}` : ""}</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Menu Items */}
                    <div className="py-2">
                      <Link
                        href={dashboardHref}
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-[#F8F5FF] hover:text-[#9747FF] transition-colors group"
                      >
                        <div className="p-1.5 rounded-lg bg-gray-100 group-hover:bg-[#9747FF]/10 transition-colors">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                          </svg>
                        </div>
                        {t.nav.dashboard}
                      </Link>
                      
                      <Link
                        href={profileHref}
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-[#F8F5FF] hover:text-[#9747FF] transition-colors group"
                      >
                        <div className="p-1.5 rounded-lg bg-gray-100 group-hover:bg-[#9747FF]/10 transition-colors">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                        {t.nav.profile}
                      </Link>
                      
                      {user.role !== "admin" && (
                        <>
                          <Link
                            href="/dashboard/bookings"
                            onClick={() => setUserDropdownOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-[#F8F5FF] hover:text-[#9747FF] transition-colors group"
                          >
                            <div className="p-1.5 rounded-lg bg-gray-100 group-hover:bg-[#9747FF]/10 transition-colors">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                            {t.nav.myTimetable || "My Bookings"}
                          </Link>
                          
                          <Link
                            href="/dashboard/notifications"
                            onClick={() => setUserDropdownOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-[#F8F5FF] hover:text-[#9747FF] transition-colors group"
                          >
                            <div className="p-1.5 rounded-lg bg-gray-100 group-hover:bg-[#9747FF]/10 transition-colors">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                              </svg>
                            </div>
                            Notifications
                          </Link>
                        </>
                      )}
                    </div>
                    
                    {/* Logout */}
                    <div className="border-t border-gray-100 py-2">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors group"
                      >
                        <div className="p-1.5 rounded-lg bg-red-50 group-hover:bg-red-100 transition-colors">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                        </div>
                        {t.nav.logout}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-[#9747FF] transition-colors"
                >
                  {t.nav.login}
                </Link>
                <Link
                  href="/register"
                  className="px-5 py-2.5 bg-linear-to-r from-[#9747FF] to-[#7B2FF7] hover:from-[#8035E8] hover:to-[#6B1FE7] text-white text-sm font-medium rounded-full transition-all shadow-lg shadow-[#9747FF]/25 hover:shadow-[#9747FF]/40 hover:scale-105"
                >
                  {t.nav.signUp}
                </Link>
              </div>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors ml-1"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-gray-100 py-4 animate-in slide-in-from-top duration-200">
            {/* Mobile Nav Pills */}
            <div className="mb-4 p-1 bg-linear-to-b from-gray-100 to-gray-200/80 rounded-2xl">
              <nav className="flex flex-col gap-1 p-1">
                {navLinks.map((link) => {
                  if (link.isDropdown) {
                    return (
                      <div key={link.href}>
                        <button
                          onClick={() => setResourcesOpen(!resourcesOpen)}
                          className={`w-full text-left px-4 py-3 text-sm font-medium rounded-xl transition-all flex items-center justify-between ${
                            resourcesOpen
                              ? "text-[#9747FF] bg-white shadow-sm"
                              : "text-gray-600 hover:text-gray-900 hover:bg-white/50"
                          }`}
                        >
                          {link.label}
                          <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${resourcesOpen ? "rotate-180" : ""}`} />
                        </button>
                        {resourcesOpen && (
                          <div className="mt-1 ml-4 space-y-1">
                            {resourcesItems.map((item) => (
                              <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => { setMobileMenuOpen(false); setResourcesOpen(false); }}
                                className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 hover:text-[#9747FF] hover:bg-white/50 rounded-xl transition-colors"
                              >
                                {item.icon}
                                <span>{item.label}</span>
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  }
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`px-4 py-3 text-sm font-medium rounded-xl transition-all ${
                        isActive(link.href)
                          ? "text-[#9747FF] bg-white shadow-sm"
                          : "text-gray-600 hover:text-gray-900 hover:bg-white/50"
                      }`}
                    >
                      {link.label}
                    </Link>
                  );
                })}
              </nav>
            </div>
            
            {user && (
              <div className="pt-4 border-t border-gray-100 space-y-1">
                <Link
                  href={dashboardHref}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-600 hover:text-[#9747FF] hover:bg-gray-50 rounded-xl"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                  {t.nav.dashboard}
                </Link>
                <Link
                  href={profileHref}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-600 hover:text-[#9747FF] hover:bg-gray-50 rounded-xl"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  {t.nav.profile}
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}

