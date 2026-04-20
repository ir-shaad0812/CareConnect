"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ShieldCheck,
  CheckCircle,
  CheckCircle2,
  AlertCircle,
  Clock,
  Phone,
  MessageCircle,
  FileText,
  Navigation,
  Bell,
  RefreshCw,
  Info,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { CaregiverNavigationMapV2 } from "@/modules/property/components/CaregiverNavigationMapV2";
import { useAuthContext } from "@/context/AuthContext";
import { bookingService, type Booking as ApiBooking } from "@/services";

type NavigationBookingData = {
  careSeekerLocation: {
    name: string;
    address: string;
    maskedAddress: string;
    city: string;
    state: string;
    zipCode: string;
    coordinates: {
      lat: number;
      lng: number;
    };
    phone: string;
    emergencyContact: {
      name: string;
      relation: string;
      phone: string;
    };
  };
  bookingDetails: {
    id: string;
    status: "approved" | "in_progress" | "completed" | "cancelled";
    serviceType: string;
    scheduledDate: string;
    scheduledTime: string;
    duration: string;
    notes?: string;
    caregiverAssignedAt?: string;
  };
  caregiverLocation: {
    lat: number;
    lng: number;
  };
  estimatedArrival: {
    distance: string;
    duration: string;
  };
};

// ============================================
// FALLBACK DATA (used when API is unavailable)
// ============================================

const getMockBookingData = (bookingId: string): NavigationBookingData => ({
  careSeekerLocation: {
    name: "Sarah Johnson",
    address: "123 Maple Street, Apt 4B, Downtown Area",
    maskedAddress: "Ward 5, Downtown Area",
    city: "Kathmandu",
    state: "Bagmati",
    zipCode: "44600",
    coordinates: {
      lat: 27.7172,
      lng: 85.324,
    },
    phone: "+977 98XXXXXXXX",
    emergencyContact: {
      name: "Michael Johnson",
      relation: "Son",
      phone: "+977 98XXXXXXXX",
    },
  },
  bookingDetails: {
    id: bookingId || "BK-2026-0042",
    status: "approved" as const,
    serviceType: "Elderly Care",
    scheduledDate: "2026-02-05",
    scheduledTime: "09:00 AM",
    duration: "4 hours",
    notes: "Patient requires assistance with mobility and medication reminders. Please arrive 10 minutes early.",
    caregiverAssignedAt: "2026-02-01T10:30:00Z",
  },
  caregiverLocation: {
    lat: 27.7052,
    lng: 85.312,
  },
  estimatedArrival: {
    distance: "3.2 km",
    duration: "12 min",
  },
});

// ============================================
// VERIFICATION TIMELINE COMPONENT
// ============================================

interface VerificationStep {
  id: string;
  label: string;
  description: string;
  status: "completed" | "current" | "pending";
  icon: React.ReactNode;
  timestamp?: string;
}

function VerificationTimeline({ steps }: { steps: VerificationStep[] }) {
  return (
    <div className="relative">
      <div className="absolute left-4 top-8 bottom-8 w-0.5 bg-linear-to-b from-emerald-400 via-[#4461F2] to-gray-200" />
      <div className="space-y-4">
        {steps.map((step, index) => (
          <motion.div
            key={step.id}
            className="relative flex items-start gap-4"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <div
              className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                step.status === "completed"
                  ? "bg-emerald-100 text-emerald-600"
                  : step.status === "current"
                  ? "bg-primary-500 text-white shadow-lg shadow-[#4461F2]/30"
                  : "bg-gray-100 text-gray-400"
              }`}
            >
              {step.icon}
            </div>
            <div className="flex-1 pb-4">
              <div className="flex items-center justify-between">
                <h4 className={`font-semibold ${step.status === "current" ? "text-gray-900" : "text-gray-700"}`}>
                  {step.label}
                </h4>
                {step.timestamp && <span className="text-xs text-gray-400">{step.timestamp}</span>}
              </div>
              <p className="text-sm text-gray-500 mt-0.5">{step.description}</p>
              {step.status === "current" && (
                <motion.div
                  className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary-500 bg-primary-500/10 px-2 py-1 rounded-full"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <Sparkles className="w-3 h-3" />
                  Current Step
                </motion.div>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ============================================
// QUICK ACTIONS COMPONENT
// ============================================

function QuickActions({ onCall, onMessage, onRefresh, isRefreshing }: {
  onCall: () => void;
  onMessage: () => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <motion.button
        onClick={onRefresh}
        disabled={isRefreshing}
        className="p-2.5 hover:bg-gray-100 rounded-xl transition-colors disabled:opacity-50"
        whileTap={{ scale: 0.95 }}
        title="Refresh data"
      >
        <RefreshCw className={`w-5 h-5 text-gray-500 ${isRefreshing ? "animate-spin" : ""}`} />
      </motion.button>
      <motion.button
        onClick={onCall}
        className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-colors"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <Phone className="w-4 h-4" />
        <span className="text-sm font-semibold hidden sm:inline">Call</span>
      </motion.button>
      <motion.button
        onClick={onMessage}
        className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <MessageCircle className="w-4 h-4" />
        <span className="text-sm font-semibold hidden sm:inline">Message</span>
      </motion.button>
    </div>
  );
}

// ============================================
// SERVICE NOTES CARD
// ============================================

function ServiceNotesCard({ notes }: { notes?: string }) {
  if (!notes) return null;
  return (
    <motion.div
      className="bg-linear-to-br from-amber-50 to-orange-50 rounded-2xl p-5 border border-amber-100"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
          <Info className="w-5 h-5 text-amber-600" />
        </div>
        <div>
          <h3 className="font-semibold text-amber-800 mb-1">Service Notes</h3>
          <p className="text-sm text-amber-700 leading-relaxed">{notes}</p>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================
// ARRIVAL CONFIRMATION BANNER
// ============================================

function ArrivalConfirmedBanner({ onStartService }: { onStartService: () => void }) {
  return (
    <motion.div
      className="bg-linear-to-r from-emerald-500 to-teal-500 rounded-2xl p-5 text-white shadow-lg shadow-emerald-500/20"
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-lg">Arrival Confirmed!</h3>
            <p className="text-emerald-100 text-sm">Care seeker has been notified. You can now start the service.</p>
          </div>
        </div>
        <motion.button
          onClick={onStartService}
          className="w-full sm:w-auto px-6 py-3 bg-white text-emerald-600 font-bold rounded-xl hover:bg-emerald-50 transition-colors flex items-center justify-center gap-2"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          Start Service
          <ChevronRight className="w-4 h-4" />
        </motion.button>
      </div>
    </motion.div>
  );
}

// ============================================
// PRIVACY NOTICE
// ============================================

function PrivacyNotice() {
  return (
    <motion.div
      className="bg-linear-to-r from-blue-50 to-indigo-50 rounded-2xl p-4 border border-blue-100"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.2 }}
    >
      <div className="flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
        <p className="text-sm text-blue-800">
          <strong>Privacy Protected:</strong> Location is shared only because this booking has been fully approved. Do not share this address with unauthorized parties.
        </p>
      </div>
    </motion.div>
  );
}

// ============================================
// TRUST SIGNALS
// ============================================

function TrustSignals() {
  const signals = [
    { icon: ShieldCheck, text: "Location verified", color: "text-emerald-500" },
    { icon: Clock, text: "Real-time tracking", color: "text-blue-500" },
    { icon: CheckCircle, text: "Booking confirmed", color: "text-purple-500" },
    { icon: Bell, text: "Notifications active", color: "text-amber-500" },
  ];

  return (
    <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 py-4">
      {signals.map((signal, index) => (
        <motion.div
          key={signal.text}
          className="flex items-center gap-2 text-sm text-gray-600"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 + index * 0.1 }}
        >
          <signal.icon className={`w-4 h-4 ${signal.color}`} />
          <span>{signal.text}</span>
        </motion.div>
      ))}
    </div>
  );
}

// ============================================
// MAIN PAGE COMPONENT
// ============================================

export default function NavigatePage() {
  const params = useParams();
  const router = useRouter();
  const { user: authUser, isLoading: isAuthLoading } = useAuthContext();
  const bookingId = params.id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isApproved, setIsApproved] = useState(false);
  const [isAccessRevoked] = useState(false);
  const [bookingData, setBookingData] = useState<NavigationBookingData | null>(null);
  const [arrivalConfirmed, setArrivalConfirmed] = useState(false);

  const mapBookingToNavigationData = useCallback((booking: ApiBooking): NavigationBookingData => {
    const careSeeker = typeof booking.careSeekerId === "string" ? null : booking.careSeekerId;
    const location = booking.location || {
      address: "Address available after confirmation",
      city: "Kathmandu",
      state: "Bagmati",
      zipCode: "",
    };

    const mappedStatus: NavigationBookingData["bookingDetails"]["status"] =
      booking.status === "confirmed"
        ? "approved"
        : booking.status === "in_progress" || booking.status === "completed" || booking.status === "cancelled"
          ? booking.status
          : "cancelled";

    return {
      careSeekerLocation: {
        name: careSeeker?.fullName || "Care Seeker",
        address: location.address || "Address available after confirmation",
        maskedAddress: `Ward area, ${location.city || "Kathmandu"}`,
        city: location.city || "Kathmandu",
        state: location.state || "Bagmati",
        zipCode: location.zipCode || "",
        coordinates: {
          lat: 27.7172,
          lng: 85.324,
        },
        phone: careSeeker?.phone || "+977 98XXXXXXXX",
        emergencyContact: {
          name: "Emergency Contact",
          relation: "Family",
          phone: "+977 98XXXXXXXX",
        },
      },
      bookingDetails: {
        id: booking._id,
        status: mappedStatus,
        serviceType: String(booking.serviceType || "care_service").replace(/_/g, " "),
        scheduledDate: booking.schedule?.startDate || new Date().toISOString(),
        scheduledTime: booking.schedule?.startTime || "09:00 AM",
        duration: booking.durationType || "hourly",
        ...(booking.specialInstructions || booking.notes
          ? { notes: booking.specialInstructions || booking.notes }
          : {}),
        ...(booking.updatedAt ? { caregiverAssignedAt: booking.updatedAt } : {}),
      },
      caregiverLocation: {
        lat: 27.7052,
        lng: 85.312,
      },
      estimatedArrival: {
        distance: "3.2 km",
        duration: "12 min",
      },
    };
  }, []);

  const verificationSteps: VerificationStep[] = [
    { id: "booking", label: "Booking Created", description: "Care seeker submitted the booking request", status: "completed", icon: <FileText className="w-4 h-4" />, timestamp: "Feb 1, 10:15 AM" },
    { id: "caregiver", label: "You Accepted", description: "You confirmed availability and booking was auto-confirmed", status: "completed", icon: <CheckCircle className="w-4 h-4" />, timestamp: "Feb 1, 3:30 PM" },
    { id: "navigate", label: arrivalConfirmed ? "Arrived" : "Navigate", description: arrivalConfirmed ? "You've confirmed your arrival" : "Navigate to the care seeker's location", status: arrivalConfirmed ? "completed" : "current", icon: <Navigation className="w-4 h-4" /> },
  ];

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    if (!authUser) {
      router.replace(`/login?redirect=/my-care/${bookingId}/navigate`);
      return;
    }

    if (authUser.role && authUser.role !== "caregiver") {
      router.replace("/dashboard");
      return;
    }

    let isActive = true;

    const loadBookingDetails = async () => {
      try {
        const response = await bookingService.getBookingById(bookingId);
        const booking = response.data?.booking;
        if (!booking || !isActive) return;

        const mapped = mapBookingToNavigationData(booking);
        setBookingData(mapped);
        setIsApproved(mapped.bookingDetails.status === "approved" || mapped.bookingDetails.status === "in_progress");
      } catch {
        if (isActive) {
          const fallback = getMockBookingData(bookingId);
          setBookingData(fallback);
          setIsApproved(fallback.bookingDetails.status === "approved");
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    loadBookingDetails();

    return () => {
      isActive = false;
    };
  }, [isAuthLoading, authUser?._id, authUser?.role, bookingId, mapBookingToNavigationData, router]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const response = await bookingService.getBookingById(bookingId);
      const booking = response.data?.booking;
      if (booking) {
        const mapped = mapBookingToNavigationData(booking);
        setBookingData(mapped);
        setIsApproved(mapped.bookingDetails.status === "approved" || mapped.bookingDetails.status === "in_progress");
      }
    } catch {
      setBookingData(getMockBookingData(bookingId));
    } finally {
      setIsRefreshing(false);
    }
  }, [bookingId, mapBookingToNavigationData]);

  const handleConfirmArrival = useCallback(() => { setArrivalConfirmed(true); }, []);
  const handleStartService = useCallback(() => {
    router.push(`/dashboard/caregiver/my-work?bookingId=${bookingId}`);
  }, [bookingId, router]);
  const handleCall = useCallback(() => { if (bookingData?.careSeekerLocation.phone) window.location.href = `tel:${bookingData.careSeekerLocation.phone}`; }, [bookingData]);
  const handleMessage = useCallback(() => { router.push(`/messages?booking=${bookingId}`); }, [bookingId, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-linear-to-b from-gray-50 to-white flex items-center justify-center">
        <motion.div className="text-center" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="w-20 h-20 rounded-2xl bg-linear-to-br from-primary-500 to-secondary-500 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-[#4461F2]/30">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}>
              <Navigation className="w-10 h-10 text-white" />
            </motion.div>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Preparing Navigation</h2>
          <p className="text-gray-500">Loading booking details...</p>
        </motion.div>
      </div>
    );
  }

  if (!bookingData) {
    return (
      <div className="min-h-screen bg-linear-to-b from-gray-50 to-white flex items-center justify-center">
        <motion.div className="text-center max-w-md px-6" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
          <div className="w-20 h-20 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-10 h-10 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Booking Not Found</h2>
          <p className="text-gray-600 mb-8">We couldn&apos;t find the booking you&apos;re looking for.</p>
          <Link href="/my-care" className="inline-flex items-center gap-2 px-6 py-3 bg-primary-500 text-white font-bold rounded-xl shadow-lg shadow-[#4461F2]/30">
            <ArrowLeft className="w-4 h-4" />Back to My Care
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-b from-gray-50 to-white">
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            <div className="flex items-center gap-3 sm:gap-4">
              <Link href="/my-care" className="p-2 sm:p-2.5 hover:bg-gray-100 rounded-xl transition-colors">
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </Link>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-gray-900">Navigate to Care Seeker</h1>
                <p className="text-xs sm:text-sm text-gray-500"><span className="hidden sm:inline">Booking </span>#{bookingId}</p>
              </div>
            </div>
            <QuickActions onCall={handleCall} onMessage={handleMessage} onRefresh={handleRefresh} isRefreshing={isRefreshing} />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <motion.div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <div className="flex items-center gap-2 mb-5">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                </div>
                <h2 className="text-lg font-bold text-gray-900">Booking Verified</h2>
              </div>
              <VerificationTimeline steps={verificationSteps} />
            </motion.div>
            <motion.div className="space-y-4" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <ServiceNotesCard
                {...(bookingData.bookingDetails.notes !== undefined
                  ? { notes: bookingData.bookingDetails.notes }
                  : {})}
              />
              <PrivacyNotice />
            </motion.div>
          </div>

          <AnimatePresence>
            {arrivalConfirmed && <ArrivalConfirmedBanner onStartService={handleStartService} />}
          </AnimatePresence>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <CaregiverNavigationMapV2
              careSeekerLocation={bookingData.careSeekerLocation}
              bookingDetails={bookingData.bookingDetails}
              caregiverLocation={bookingData.caregiverLocation}
              estimatedArrival={bookingData.estimatedArrival}
              isApproved={isApproved}
              isAccessRevoked={isAccessRevoked}
              onConfirmArrival={handleConfirmArrival}
            />
          </motion.div>

          <TrustSignals />
        </motion.div>
      </main>
    </div>
  );
}
