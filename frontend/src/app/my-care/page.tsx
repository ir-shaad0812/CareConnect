"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Calendar,
  Clock,
  MapPin,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Navigation,
  Phone,
  MessageCircle,
  Search,
  Shield,
  Heart,
  Briefcase,
} from "lucide-react";
import { useAuthContext } from "@/context/AuthContext";
import { bookingService, type Booking as ApiBooking } from "@/services";

// ============================================
// TYPES
// ============================================

type BookingStatus = "pending" | "approved" | "in_progress" | "completed" | "cancelled";

interface Assignment {
  id: string;
  careSeekerName: string;
  careSeekerAvatar?: string;
  serviceType: string;
  scheduledDate: string;
  scheduledTime: string;
  duration: string;
  address: {
    masked: string;
    city: string;
    state: string;
  };
  status: BookingStatus;
  phone?: string;
  notes?: string;
}

// ============================================
// STATUS CONFIG
// ============================================

const STATUS_CONFIG: Record<BookingStatus, { bg: string; text: string; label: string; dot: string }> = {
  pending: { bg: "bg-amber-50", text: "text-amber-700", label: "Pending Approval", dot: "bg-amber-500" },
  approved: { bg: "bg-emerald-50", text: "text-emerald-700", label: "Ready to Start", dot: "bg-emerald-500" },
  in_progress: { bg: "bg-blue-50", text: "text-blue-700", label: "In Progress", dot: "bg-blue-500" },
  completed: { bg: "bg-gray-50", text: "text-gray-700", label: "Completed", dot: "bg-gray-500" },
  cancelled: { bg: "bg-red-50", text: "text-red-700", label: "Cancelled", dot: "bg-red-500" },
};

// ============================================
// ASSIGNMENT CARD
// ============================================

interface AssignmentCardProps {
  assignment: Assignment;
  onNavigate: () => void;
  onCall: () => void;
  onMessage: () => void;
}

function AssignmentCard({ assignment, onNavigate, onCall, onMessage }: AssignmentCardProps) {
  const statusConfig = STATUS_CONFIG[assignment.status];
  const canNavigate = assignment.status === "approved" || assignment.status === "in_progress";

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) return "Today";
    if (date.toDateString() === tomorrow.toDateString()) return "Tomorrow";

    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <motion.div
      className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
    >
      {/* Header */}
      <div className="p-5 border-b border-gray-100">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-linear-to-br from-primary-500 to-secondary-500 flex items-center justify-center text-white font-semibold">
              {assignment.careSeekerName.charAt(0)}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{assignment.careSeekerName}</h3>
              <p className="text-sm text-gray-500">{assignment.serviceType}</p>
            </div>
          </div>
          <div className={`px-3 py-1 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.text}`}>
            <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${statusConfig.dot}`} />
            {statusConfig.label}
          </div>
        </div>

        {/* Details */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2 text-gray-600">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span>{formatDate(assignment.scheduledDate)}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <Clock className="w-4 h-4 text-gray-400" />
            <span>{assignment.scheduledTime}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600 col-span-2">
            <MapPin className="w-4 h-4 text-gray-400" />
            <span>
              {assignment.address.masked}, {assignment.address.city}
            </span>
          </div>
        </div>

        {assignment.notes && (
          <p className="mt-3 text-sm text-gray-500 bg-gray-50 rounded-lg p-2">{assignment.notes}</p>
        )}
      </div>

      {/* Actions */}
      <div className="p-4 bg-gray-50 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {assignment.phone && (
            <>
              <button
                onClick={onCall}
                className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                title="Call care seeker"
              >
                <Phone className="w-4 h-4 text-gray-600" />
              </button>
              <button
                onClick={onMessage}
                className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                title="Send message"
              >
                <MessageCircle className="w-4 h-4 text-gray-600" />
              </button>
            </>
          )}
        </div>

        {canNavigate ? (
          <motion.button
            onClick={onNavigate}
            className="flex items-center gap-2 px-4 py-2 bg-linear-to-r from-primary-500 to-secondary-500 text-white font-medium rounded-xl shadow-md shadow-[#4461F2]/25"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Navigation className="w-4 h-4" />
            Navigate
            <ArrowRight className="w-4 h-4" />
          </motion.button>
        ) : assignment.status === "pending" ? (
          <span className="text-sm text-amber-600 font-medium">Awaiting caregiver response</span>
        ) : (
          <Link
            href={`/my-care/${assignment.id}`}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
          >
            View Details
            <ArrowRight className="w-4 h-4" />
          </Link>
        )}
      </div>
    </motion.div>
  );
}

// ============================================
// FILTER TABS
// ============================================

interface FilterTabsProps {
  activeFilter: string;
  onFilterChange: (filter: string) => void;
  counts: Record<string, number>;
}

function FilterTabs({ activeFilter, onFilterChange, counts }: FilterTabsProps) {
  const filters = [
    { value: "all", label: "All" },
    { value: "approved", label: "Ready" },
    { value: "in_progress", label: "In Progress" },
    { value: "pending", label: "Pending" },
    { value: "completed", label: "Completed" },
  ];

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2">
      {filters.map((filter) => (
        <button
          key={filter.value}
          onClick={() => onFilterChange(filter.value)}
          className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
            activeFilter === filter.value
              ? "bg-primary-500 text-white shadow-md shadow-[#4461F2]/25"
              : "bg-white text-gray-600 hover:bg-gray-100"
          }`}
        >
          {filter.label}
          {counts[filter.value] > 0 && (
            <span
              className={`ml-2 px-1.5 py-0.5 rounded-full text-xs ${
                activeFilter === filter.value ? "bg-white/20" : "bg-gray-200"
              }`}
            >
              {counts[filter.value]}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

// ============================================
// MAIN PAGE
// ============================================

export default function MyCarePage() {
  const router = useRouter();
  const { user: authUser, isLoading: isAuthLoading } = useAuthContext();
  const [isLoading, setIsLoading] = useState(true);
  const [, setError] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [activeFilter, setActiveFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    if (!authUser) {
      router.replace("/login?redirect=/my-care");
      return;
    }

    if (authUser.role && authUser.role !== "caregiver") {
      router.replace("/dashboard");
      return;
    }

    let isActive = true;

    const mapStatus = (status: string): BookingStatus => {
      if (status === "confirmed") return "approved";
      if (status === "in_progress") return "in_progress";
      if (status === "completed") return "completed";
      if (status === "cancelled") return "cancelled";
      return "pending";
    };

    const mapBookingsToAssignments = (bookings: ApiBooking[]): Assignment[] => {
      return bookings.map((booking) => {
        const careSeeker = typeof booking.careSeekerId === "string" ? null : booking.careSeekerId;
        const fullName = careSeeker?.fullName || "Care Seeker";
        const location = booking.location || ({} as Assignment["address"]);

        return {
          id: booking._id,
          careSeekerName: fullName,
          serviceType: String(booking.serviceType || "care_service").replace(/_/g, " "),
          scheduledDate: booking.schedule?.startDate || new Date().toISOString(),
          scheduledTime: booking.schedule?.startTime || "09:00 AM",
          duration: booking.durationType || "hourly",
          address: {
            masked: location.address || "Address available after confirmation",
            city: location.city || "",
            state: location.state || "",
          },
          status: mapStatus(booking.status),
          ...(careSeeker?.phone !== undefined ? { phone: careSeeker.phone } : {}),
          ...((booking.specialInstructions || booking.notes) !== undefined
            ? { notes: booking.specialInstructions || booking.notes }
            : {}),
        };
      });
    };

    const loadAssignments = async () => {
      setError(null);
      try {
        const response = await bookingService.getMyBookings({
          page: 1,
          limit: 50,
          sortBy: "createdAt",
          sortOrder: "desc",
        });
        const bookings = response.data?.bookings || [];
        const mapped = mapBookingsToAssignments(bookings);
        if (isActive) {
          setAssignments(mapped);
        }
      } catch (err) {
        if (isActive) {
          setError("Failed to load assignments. Please try again.");
          console.error("Failed to load assignments:", err);
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    loadAssignments();

    return () => {
      isActive = false;
    };
  }, [isAuthLoading, authUser?._id, authUser?.role, router]);

  // Filter assignments
  const filteredAssignments = assignments.filter((assignment) => {
    const matchesFilter = activeFilter === "all" || assignment.status === activeFilter;
    const matchesSearch =
      !searchQuery ||
      assignment.careSeekerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      assignment.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  // Count by status
  const counts = {
    all: assignments.length,
    approved: assignments.filter((a) => a.status === "approved").length,
    in_progress: assignments.filter((a) => a.status === "in_progress").length,
    pending: assignments.filter((a) => a.status === "pending").length,
    completed: assignments.filter((a) => a.status === "completed").length,
  };

  const handleNavigate = (assignmentId: string) => {
    router.push(`/my-care/${assignmentId}/navigate`);
  };

  const handleCall = (phone?: string) => {
    if (phone) window.location.assign(`tel:${phone}`);
  };

  const handleMessage = (assignmentId: string) => {
    router.push(`/messages?booking=${assignmentId}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-primary-500/10 flex items-center justify-center mx-auto mb-4">
            <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="text-gray-600">Loading your care assignments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-b from-gray-50 to-white">
      {/* Hero Header */}
      <section className="relative overflow-hidden bg-linear-to-br from-primary-500 to-secondary-500 text-white">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl"
          >
            <div className="flex items-center gap-2 mb-4">
              <Heart className="w-5 h-5" />
              <span className="text-sm font-medium text-white/80">Verified Caregiver Portal</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold mb-3">My Care</h1>
            <p className="text-lg text-white/80">
              Manage your assigned care sessions. View bookings, navigate to care seekers, and track your caregiving schedule.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 -mt-6 relative z-10">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Assignments", value: counts.all, color: "bg-gray-500", icon: Briefcase },
            { label: "Ready to Start", value: counts.approved, color: "bg-emerald-500", icon: CheckCircle },
            { label: "In Progress", value: counts.in_progress, color: "bg-blue-500", icon: Clock },
            { label: "Pending", value: counts.pending, color: "bg-amber-500", icon: AlertCircle },
          ].map((stat) => (
            <motion.div
              key={stat.label}
              className="bg-white rounded-xl p-4 shadow-sm"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <div className="flex items-center gap-2 mb-1">
                <div className={`w-8 h-8 rounded-lg ${stat.color}/10 flex items-center justify-center`}>
                  <stat.icon className={`w-4 h-4 ${stat.color.replace('bg-', 'text-')}`} />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              <span className="text-xs text-gray-500">{stat.label}</span>
            </motion.div>
          ))}
        </div>

        {/* Search & Filters */}
        <div className="bg-white rounded-2xl shadow-sm p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-4">
            {/* Search */}
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name or booking ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4461F2]/20 focus:border-primary-500"
              />
            </div>
          </div>

          {/* Filter Tabs */}
          <FilterTabs activeFilter={activeFilter} onFilterChange={setActiveFilter} counts={counts} />
        </div>

        {/* Assignments List */}
        {filteredAssignments.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No care assignments found</h3>
            <p className="text-gray-500 mb-6">
              {activeFilter !== "all"
                ? `You have no ${activeFilter.replace("_", " ")} assignments.`
                : "You don't have any care assignments yet."}
            </p>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary-500 text-white font-semibold rounded-xl"
            >
              Go to Dashboard
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {filteredAssignments.map((assignment) => (
              <AssignmentCard
                key={assignment.id}
                assignment={assignment}
                onNavigate={() => handleNavigate(assignment.id)}
                onCall={() => handleCall(assignment.phone)}
                onMessage={() => handleMessage(assignment.id)}
              />
            ))}
          </div>
        )}

        {/* Trust Footer */}
        <div className="mt-12 text-center">
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-500" />
              <span>Privacy protected</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-blue-500" />
              <span>Verified bookings</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-purple-500" />
              <span>Secure navigation</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
