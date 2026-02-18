"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Calendar, 
  MessageSquare, 
  CreditCard, 
  Star, 
  Bell,
  UserCheck,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileText,
  ChevronDown,
  Filter,
  Search,
  CalendarDays
} from "lucide-react";

// ============================================
// TYPES
// ============================================

export type ActivityType = 
  | "booking_created" 
  | "booking_confirmed" 
  | "booking_completed" 
  | "booking_cancelled"
  | "booking_started"
  | "payment_received" 
  | "payment_sent"
  | "message_sent" 
  | "message_received"
  | "review_given" 
  | "review_received"
  | "profile_updated"
  | "document_verified"
  | "notification"
  | "system";

export interface Activity {
  id: string;
  type: ActivityType;
  title: string;
  description: string;
  timestamp: Date;
  metadata?: {
    caregiverName?: string;
    careSeekerName?: string;
    amount?: number;
    rating?: number;
    bookingId?: string;
    serviceType?: string;
    duration?: string;
  };
  isRead?: boolean;
}

export interface ActivityGroup {
  date: string;
  activities: Activity[];
}

// ============================================
// CONFIGURATION
// ============================================

const ACTIVITY_CONFIG: Record<ActivityType, { 
  icon: React.ElementType; 
  color: string; 
  bgColor: string;
  label: string;
}> = {
  booking_created: { 
    icon: Calendar, 
    color: "text-blue-600", 
    bgColor: "bg-blue-100",
    label: "Booking"
  },
  booking_confirmed: { 
    icon: CheckCircle2, 
    color: "text-green-600", 
    bgColor: "bg-green-100",
    label: "Booking"
  },
  booking_completed: { 
    icon: CheckCircle2, 
    color: "text-emerald-600", 
    bgColor: "bg-emerald-100",
    label: "Booking"
  },
  booking_cancelled: { 
    icon: XCircle, 
    color: "text-red-500", 
    bgColor: "bg-red-100",
    label: "Booking"
  },
  booking_started: { 
    icon: Clock, 
    color: "text-purple-600", 
    bgColor: "bg-purple-100",
    label: "Booking"
  },
  payment_received: { 
    icon: CreditCard, 
    color: "text-green-600", 
    bgColor: "bg-green-100",
    label: "Payment"
  },
  payment_sent: { 
    icon: CreditCard, 
    color: "text-amber-600", 
    bgColor: "bg-amber-100",
    label: "Payment"
  },
  message_sent: { 
    icon: MessageSquare, 
    color: "text-blue-500", 
    bgColor: "bg-blue-100",
    label: "Message"
  },
  message_received: { 
    icon: MessageSquare, 
    color: "text-indigo-500", 
    bgColor: "bg-indigo-100",
    label: "Message"
  },
  review_given: { 
    icon: Star, 
    color: "text-yellow-500", 
    bgColor: "bg-yellow-100",
    label: "Review"
  },
  review_received: { 
    icon: Star, 
    color: "text-yellow-500", 
    bgColor: "bg-yellow-100",
    label: "Review"
  },
  profile_updated: { 
    icon: UserCheck, 
    color: "text-teal-600", 
    bgColor: "bg-teal-100",
    label: "Profile"
  },
  document_verified: { 
    icon: FileText, 
    color: "text-cyan-600", 
    bgColor: "bg-cyan-100",
    label: "Document"
  },
  notification: { 
    icon: Bell, 
    color: "text-gray-600", 
    bgColor: "bg-gray-100",
    label: "Notification"
  },
  system: { 
    icon: AlertCircle, 
    color: "text-gray-500", 
    bgColor: "bg-gray-100",
    label: "System"
  },
};

// ============================================
// HELPER FUNCTIONS
// ============================================

const formatDate = (date: Date): string => {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return "Today";
  }
  if (date.toDateString() === yesterday.toDateString()) {
    return "Yesterday";
  }
  
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: date.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
  });
};

const formatTime = (date: Date): string => {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

const groupActivitiesByDate = (activities: Activity[]): ActivityGroup[] => {
  const groups: { [key: string]: Activity[] } = {};
  
  activities.forEach((activity) => {
    const dateKey = activity.timestamp.toDateString();
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(activity);
  });

  return Object.entries(groups)
    .map(([dateKey, activities]) => ({
      date: formatDate(new Date(dateKey)),
      activities: activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()),
    }))
    .sort((a, b) => {
      const dateA = new Date(a.activities[0].timestamp);
      const dateB = new Date(b.activities[0].timestamp);
      return dateB.getTime() - dateA.getTime();
    });
};

// ============================================
// ACTIVITY ITEM COMPONENT
// ============================================

interface ActivityItemProps {
  activity: Activity;
  isLast: boolean;
  viewMode: "simplified" | "detailed";
}

const ActivityItem = ({ activity, isLast, viewMode }: ActivityItemProps) => {
  const config = ACTIVITY_CONFIG[activity.type];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="relative flex gap-4 group"
    >
      {/* Timeline line */}
      {!isLast && (
        <div className="absolute left-5 top-12 w-0.5 h-[calc(100%-24px)] bg-linear-to-b from-gray-200 to-gray-100" />
      )}

      {/* Icon */}
      <div className={`relative z-10 shrink-0 w-10 h-10 rounded-full ${config.bgColor} flex items-center justify-center ring-4 ring-white`}>
        <Icon className={`w-5 h-5 ${config.color}`} />
      </div>

      {/* Content */}
      <div className={`flex-1 pb-6 ${viewMode === "detailed" ? "min-w-0" : ""}`}>
        {/* Badge & Time Row */}
        <div className="flex items-center gap-2 mb-1">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bgColor} ${config.color}`}>
            {config.label}
          </span>
          <span className="text-xs text-gray-400">
            {formatTime(activity.timestamp)}
          </span>
          {!activity.isRead && (
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          )}
        </div>

        {/* Title */}
        <h4 className="font-semibold text-gray-900 group-hover:text-primary-500 transition-colors">
          {activity.title}
        </h4>

        {/* Description - Only in detailed view */}
        {viewMode === "detailed" && (
          <p className="text-sm text-gray-500 mt-1">
            {activity.description}
          </p>
        )}

        {/* Metadata */}
        {viewMode === "detailed" && activity.metadata && (
          <div className="mt-3 flex flex-wrap items-center gap-3">
            {activity.metadata.caregiverName && (
              <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 px-3 py-1.5 rounded-full">
                <UserCheck className="w-4 h-4 text-gray-400" />
                {activity.metadata.caregiverName}
              </div>
            )}
            {activity.metadata.amount !== undefined && (
              <div className={`flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-full ${
                activity.type.includes("received") 
                  ? "bg-green-50 text-green-700" 
                  : "bg-amber-50 text-amber-700"
              }`}>
                <CreditCard className="w-4 h-4" />
                ${activity.metadata.amount.toFixed(2)}
              </div>
            )}
            {activity.metadata.rating && (
              <div className="flex items-center gap-1 text-sm text-yellow-600 bg-yellow-50 px-3 py-1.5 rounded-full">
                {[...Array(5)].map((_, i) => (
                  <Star 
                    key={i} 
                    className={`w-4 h-4 ${i < activity.metadata!.rating! ? "fill-yellow-400" : "fill-gray-200"}`} 
                  />
                ))}
              </div>
            )}
            {activity.metadata.serviceType && (
              <div className="text-sm text-gray-600 bg-gray-50 px-3 py-1.5 rounded-full">
                {activity.metadata.serviceType}
              </div>
            )}
            {activity.metadata.duration && (
              <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 px-3 py-1.5 rounded-full">
                <Clock className="w-4 h-4 text-gray-400" />
                {activity.metadata.duration}
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
};

// ============================================
// DATE GROUP COMPONENT
// ============================================

interface DateGroupProps {
  group: ActivityGroup;
  viewMode: "simplified" | "detailed";
}

const DateGroup = ({ group, viewMode }: DateGroupProps) => {
  return (
    <div className="relative">
      {/* Date Badge */}
      <div className="sticky top-0 z-20 mb-4">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-linear-to-r from-primary-500/10 to-secondary-500/10 backdrop-blur-sm rounded-full border border-primary-500/20"
        >
          <CalendarDays className="w-4 h-4 text-primary-500" />
          <span className="text-sm font-semibold text-gray-800">{group.date}</span>
        </motion.div>
      </div>

      {/* Activities */}
      <div className="ml-1">
        <AnimatePresence>
          {group.activities.map((activity, index) => (
            <ActivityItem
              key={activity.id}
              activity={activity}
              isLast={index === group.activities.length - 1}
              viewMode={viewMode}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

// ============================================
// FILTER DROPDOWN
// ============================================

interface FilterDropdownProps {
  selectedTypes: ActivityType[];
  onTypesChange: (types: ActivityType[]) => void;
}

const FilterDropdown = ({ selectedTypes, onTypesChange }: FilterDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const activityTypeOptions: { value: ActivityType; label: string }[] = [
    { value: "booking_created", label: "Bookings" },
    { value: "payment_received", label: "Payments" },
    { value: "message_received", label: "Messages" },
    { value: "review_received", label: "Reviews" },
    { value: "notification", label: "Notifications" },
  ];

  const toggleType = (type: ActivityType) => {
    if (selectedTypes.includes(type)) {
      onTypesChange(selectedTypes.filter(t => t !== type));
    } else {
      onTypesChange([...selectedTypes, type]);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:border-primary-500 hover:text-primary-500 transition-all"
      >
        <Filter className="w-4 h-4" />
        Activity Types
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute top-full left-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 p-2 z-30"
          >
            {activityTypeOptions.map((option) => (
              <label
                key={option.value}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={selectedTypes.length === 0 || selectedTypes.includes(option.value)}
                  onChange={() => toggleType(option.value)}
                  className="w-4 h-4 rounded border-gray-300 text-primary-500 focus:ring-[#4461F2]"
                />
                <span className="text-sm text-gray-700">{option.label}</span>
              </label>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ============================================
// MAIN ACTIVITY TIMELINE COMPONENT
// ============================================

export interface ActivityTimelineProps {
  activities: Activity[];
  title?: string;
  subtitle?: string;
  showFilters?: boolean;
  showDateFilters?: boolean;
  showSearch?: boolean;
  maxItems?: number;
  className?: string;
}

export function ActivityTimeline({
  activities,
  title = "All Activity",
  subtitle,
  showFilters = true,
  showDateFilters = true,
  showSearch = true,
  maxItems,
  className = "",
}: ActivityTimelineProps) {
  const [viewMode, setViewMode] = useState<"simplified" | "detailed">("detailed");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<ActivityType[]>([]);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // Filter activities
  const filteredActivities = activities.filter((activity) => {
    // Type filter
    if (selectedTypes.length > 0) {
      const typeMatch = selectedTypes.some(type => activity.type.includes(type.split("_")[0]));
      if (!typeMatch) return false;
    }

    // Search filter
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = 
        activity.title.toLowerCase().includes(searchLower) ||
        activity.description.toLowerCase().includes(searchLower) ||
        activity.metadata?.caregiverName?.toLowerCase().includes(searchLower);
      if (!matchesSearch) return false;
    }

    // Date filter
    if (startDate) {
      const activityDate = new Date(activity.timestamp);
      const filterStart = new Date(startDate);
      if (activityDate < filterStart) return false;
    }
    if (endDate) {
      const activityDate = new Date(activity.timestamp);
      const filterEnd = new Date(endDate);
      filterEnd.setHours(23, 59, 59, 999);
      if (activityDate > filterEnd) return false;
    }

    return true;
  });

  // Limit items if maxItems is set
  const limitedActivities = maxItems 
    ? filteredActivities.slice(0, maxItems)
    : filteredActivities;

  // Group by date
  const groupedActivities = groupActivitiesByDate(limitedActivities);

  const handleReset = () => {
    setSearchQuery("");
    setSelectedTypes([]);
    setStartDate("");
    setEndDate("");
  };

  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{title}</h2>
            {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-2 bg-gray-100 rounded-xl p-1">
            <button
              onClick={() => setViewMode("simplified")}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                viewMode === "simplified"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Simplified View
            </button>
            <button
              onClick={() => setViewMode("detailed")}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                viewMode === "detailed"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Detailed View
            </button>
          </div>
        </div>

        {/* Filters Row */}
        {(showFilters || showDateFilters || showSearch) && (
          <div className="flex flex-wrap items-center gap-3 mt-4">
            {/* Date Filters */}
            {showDateFilters && (
              <>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  placeholder="Start Date"
                  className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-[#4461F2]/20"
                />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  placeholder="End Date"
                  className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-[#4461F2]/20"
                />
              </>
            )}

            {/* Activity Type Filter */}
            {showFilters && (
              <FilterDropdown
                selectedTypes={selectedTypes}
                onTypesChange={setSelectedTypes}
              />
            )}

            {/* Search & Reset */}
            <div className="flex items-center gap-2 ml-auto">
              {showSearch && (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search activities..."
                    className="pl-10 pr-4 py-2.5 w-64 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 placeholder:text-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-[#4461F2]/20"
                  />
                </div>
              )}
              <button
                onClick={handleReset}
                className="px-4 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                Reset
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Timeline Content */}
      <div className="p-6 max-h-[600px] overflow-y-auto">
        {groupedActivities.length > 0 ? (
          <div className="space-y-8">
            {groupedActivities.map((group) => (
              <DateGroup key={group.date} group={group} viewMode={viewMode} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-600 font-medium">No activities found</p>
            <p className="text-sm text-gray-400 mt-1">Try adjusting your filters</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// EXPORT SAMPLE DATA GENERATOR
// ============================================

export const generateSampleActivities = (): Activity[] => {
  const today = new Date();
  const activities: Activity[] = [];

  // Today's activities
  activities.push({
    id: "1",
    type: "booking_confirmed",
    title: "Booking Confirmed",
    description: "Your booking with Sarah Johnson for elderly care has been confirmed.",
    timestamp: new Date(today.getTime() - 2 * 60 * 60 * 1000), // 2 hours ago
    metadata: {
      caregiverName: "Sarah Johnson",
      serviceType: "Elderly Care",
      duration: "4 hours",
    },
    isRead: false,
  });

  activities.push({
    id: "2",
    type: "payment_sent",
    title: "Payment Processed",
    description: "Payment of $120.00 has been processed for your elderly care session.",
    timestamp: new Date(today.getTime() - 4 * 60 * 60 * 1000), // 4 hours ago
    metadata: {
      amount: 120,
      caregiverName: "Sarah Johnson",
    },
    isRead: true,
  });

  activities.push({
    id: "3",
    type: "message_received",
    title: "New Message from Sarah Johnson",
    description: "Hi! I wanted to confirm our session tomorrow. Is 9 AM still good?",
    timestamp: new Date(today.getTime() - 6 * 60 * 60 * 1000), // 6 hours ago
    metadata: {
      caregiverName: "Sarah Johnson",
    },
    isRead: false,
  });

  // Yesterday's activities
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  activities.push({
    id: "4",
    type: "booking_completed",
    title: "Care Session Completed",
    description: "Your child care session with Michael Chen has been completed successfully.",
    timestamp: new Date(yesterday.getTime()),
    metadata: {
      caregiverName: "Michael Chen",
      serviceType: "Child Care",
      duration: "6 hours",
    },
    isRead: true,
  });

  activities.push({
    id: "5",
    type: "review_given",
    title: "Review Submitted",
    description: "You rated Michael Chen 5 stars for excellent child care service.",
    timestamp: new Date(yesterday.getTime() - 2 * 60 * 60 * 1000),
    metadata: {
      caregiverName: "Michael Chen",
      rating: 5,
    },
    isRead: true,
  });

  // Earlier activities
  const threeDaysAgo = new Date(today);
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  activities.push({
    id: "6",
    type: "booking_created",
    title: "Booking Request Sent",
    description: "Your booking request for special needs care has been sent to Emily Davis.",
    timestamp: threeDaysAgo,
    metadata: {
      caregiverName: "Emily Davis",
      serviceType: "Special Needs Care",
    },
    isRead: true,
  });

  activities.push({
    id: "7",
    type: "document_verified",
    title: "Document Verified",
    description: "Your ID proof has been successfully verified by our team.",
    timestamp: new Date(threeDaysAgo.getTime() - 3 * 60 * 60 * 1000),
    isRead: true,
  });

  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  activities.push({
    id: "8",
    type: "booking_cancelled",
    title: "Booking Cancelled",
    description: "Your booking with James Wilson has been cancelled as per your request.",
    timestamp: weekAgo,
    metadata: {
      caregiverName: "James Wilson",
      serviceType: "Elderly Care",
    },
    isRead: true,
  });

  activities.push({
    id: "9",
    type: "profile_updated",
    title: "Profile Updated",
    description: "Your care preferences and emergency contacts have been updated.",
    timestamp: new Date(weekAgo.getTime() - 24 * 60 * 60 * 1000),
    isRead: true,
  });

  return activities;
};
