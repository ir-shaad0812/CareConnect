"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { Logo } from "@/components/ui/Logo";
import { caregiverService, type Caregiver } from "@/services";
import { authService } from "@/modules/auth/services";
import { bookingService, CreateBookingData, ServiceType } from "@/modules/booking/services";
import { availabilityService, type TimeSlot, type AvailabilityCheckResult } from "@/services/api/availability.service";
import { AvailabilityCalendar } from "@/modules/booking/components/AvailabilityCalendar";
import { ReservationTimer } from "@/modules/booking/components/ReservationTimer";
import { useSocket } from "@/context/SocketContext";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import type { User } from "@/types";
import { extractStatusCode } from "@/types/errors.types";

type DurationType = "hourly" | "daily" | "weekly" | "monthly";

const SERVICE_TYPES: { value: ServiceType; label: string; icon: string }[] = [
  { value: "elderly_care", label: "Elderly Care", icon: "🧓" },
  { value: "child_care", label: "Child Care", icon: "🧒" },
  { value: "special_needs", label: "Special Needs", icon: "🌟" },
  { value: "disability_care", label: "Disability Care", icon: "♿" },
  { value: "post_surgery", label: "Post-Surgery", icon: "🏥" },
  { value: "companionship", label: "Companionship", icon: "🤝" },
  { value: "respite_care", label: "Respite Care", icon: "🌿" },
  { value: "palliative_care", label: "Palliative Care", icon: "❤️" },
];

// Duration types
const DURATION_TYPES: { value: DurationType; label: string; description: string }[] = [
  { value: "hourly", label: "Hourly", description: "Pay by the hour" },
  { value: "daily", label: "Daily", description: "Full day care" },
  { value: "weekly", label: "Weekly", description: "Week-long service" },
  { value: "monthly", label: "Monthly", description: "Long-term care" },
];

const RANGE_DAYS_BY_DURATION: Record<DurationType, number> = {
  hourly: 0,
  daily: 0,
  weekly: 6,
  monthly: 29,
};

function toLocalDateInput(value: string | Date): string {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDaysToDateInput(startDate: string, days: number): string {
  const date = new Date(`${startDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return startDate;
  }

  date.setDate(date.getDate() + days);
  return toLocalDateInput(date);
}

function resolveDefaultEndDate(startDate: string, durationType: DurationType): string {
  const dayOffset = RANGE_DAYS_BY_DURATION[durationType] ?? 0;
  return dayOffset > 0 ? addDaysToDateInput(startDate, dayOffset) : startDate;
}

function formatBookingDateLabel(dateInput: string): string {
  if (!dateInput) {
    return "";
  }

  return new Date(`${dateInput}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function parsePositiveNumber(value: unknown): number {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : Number.NaN;

  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function parseBookingDate(value: string): Date | null {
  if (!value) return null;

  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? `${value}T00:00:00`
    : value;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseTimeToMinutes(value: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;

  return hours * 60 + minutes;
}

function addMinutesToTime(value: string, minutesToAdd: number): string {
  const base = parseTimeToMinutes(value);
  if (base === null) return "17:00";

  const normalized = ((base + minutesToAdd) % (24 * 60) + 24 * 60) % (24 * 60);
  const hours = Math.floor(normalized / 60)
    .toString()
    .padStart(2, "0");
  const minutes = (normalized % 60).toString().padStart(2, "0");

  return `${hours}:${minutes}`;
}

function getApiErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === "object" && error !== null) {
    const apiError = error as {
      message?: string;
      errors?: Array<{ msg?: string; message?: string }>;
      response?: { data?: { message?: string } };
    };

    return (
      apiError.errors?.[0]?.msg ||
      apiError.errors?.[0]?.message ||
      apiError.message ||
      apiError.response?.data?.message ||
      fallback
    );
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

export default function BookCaregiverPage() {
  const params = useParams();
  const router = useRouter();
  const caregiverId = params.id as string;
  const { subscribeToAvailability, unsubscribeFromAvailability, onAvailabilityUpdated, onReservationExpired, onReservationExpiringSoon } = useSocket();

  const [caregiver, setCaregiver] = useState<Caregiver | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [currentStep, setCurrentStep] = useState(1);
  const [user, setUser] = useState<User | null>(null);

  // Reservation state
  const [reservationId, setReservationId] = useState<string | null>(null);
  const [reservationExpiry, setReservationExpiry] = useState<string | null>(null);
  const [availabilityCheck, setAvailabilityCheck] = useState<AvailabilityCheckResult | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    serviceType: "" as ServiceType | "",
    durationType: "hourly" as DurationType,
    startDate: "",
    endDate: "",
    startTime: "",
    endTime: "",
    // Care recipient
    recipientName: "",
    recipientAge: "",
    recipientRelationship: "",
    specialNeeds: "",
    medicalConditions: "",
    // Location
    address: "",
    city: "",
    state: "",
    zipCode: "",
    additionalInstructions: "",
    // Additional
    careInstructions: "",
    notes: "",
  });

  useEffect(() => {
    const storedUser = authService.getCurrentUser();
    if (!storedUser) {
      setIsLoading(false);
      router.push(`/login?redirect=/book/${caregiverId}`);
      return;
    }
    if (storedUser.role !== "careseeker") {
      setError("Only care seekers can book caregivers.");
      setIsLoading(false);
      return;
    }
    setUser(storedUser);

    const loadCaregiver = async () => {
      try {
        setIsLoading(true);
        const response = await caregiverService.getCaregiverProfile(caregiverId);
        if (response.success && response.data?.caregiver) {
          setCaregiver(response.data.caregiver);
        } else {
          setError("Caregiver not found");
        }
      } catch {
        setError("Failed to load caregiver details");
      } finally {
        setIsLoading(false);
      }
    };

    void loadCaregiver();
    
    // Pre-fill from timetable booking data
    const timetableData = sessionStorage.getItem("timetableBooking");
    if (timetableData) {
      try {
        const booking = JSON.parse(timetableData);
        if (booking && typeof booking === 'object') {
          const prefilledDate = toLocalDateInput(String(booking.selectedDate || ""));
          setSelectedDate(prefilledDate);
          setFormData(prev => ({
            ...prev,
            startDate: prefilledDate,
            startTime: booking.selectedTime || "",
            endTime: booking.endTime || "",
          }));
        }
        // Clear the session storage after using it
        sessionStorage.removeItem("timetableBooking");
      } catch (e) {
        console.error("Failed to parse timetable booking data:", e);
      }
    }
    
    // Also check URL params for pre-fill
    const urlParams = new URLSearchParams(window.location.search);
    const dateParam = urlParams.get('date');
    const timeParam = urlParams.get('time');
    if (dateParam) {
      const prefilledDate = toLocalDateInput(dateParam);
      setSelectedDate(prefilledDate);
      setFormData(prev => ({
        ...prev,
        startDate: prefilledDate,
        startTime: timeParam || prev.startTime,
      }));
    }
  }, [caregiverId, router]);

  // Socket subscriptions for real-time availability updates
  useEffect(() => {
    if (!caregiverId) return;

    subscribeToAvailability(caregiverId);

    const unsubAvailability = onAvailabilityUpdated((data) => {
      if (data.caregiverId === caregiverId) {
        // Refresh availability when it changes
        setAvailabilityCheck(null);
        setSelectedSlot(null);
      }
    });

    const unsubExpired = onReservationExpired((data) => {
      if (data.bookingId === reservationId) {
        setError("Your reservation has expired. Please select a new time slot.");
        setReservationId(null);
        setReservationExpiry(null);
        setCurrentStep(2);
      }
    });

    const unsubExpiringSoon = onReservationExpiringSoon((data) => {
      if (data.bookingId === reservationId) {
        // Timer component handles the warning display
      }
    });

    return () => {
      unsubscribeFromAvailability(caregiverId);
      unsubAvailability();
      unsubExpired();
      unsubExpiringSoon();
    };
  }, [caregiverId, reservationId, subscribeToAvailability, unsubscribeFromAvailability, onAvailabilityUpdated, onReservationExpired, onReservationExpiringSoon]);

  useEffect(() => {
    if (!formData.startDate) {
      return;
    }

    const defaultEndDate = resolveDefaultEndDate(
      formData.startDate,
      formData.durationType,
    );

    setFormData((prev) =>
      prev.endDate === defaultEndDate
        ? prev
        : {
            ...prev,
            endDate: defaultEndDate,
          },
    );
  }, [formData.startDate, formData.durationType]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const getNormalizedSchedule = useCallback(() => {
    const startDate = formData.startDate;
    const endDate = formData.endDate || formData.startDate;
    const startTime = formData.startTime || selectedSlot?.start || "09:00";

    let endTime = formData.endTime || selectedSlot?.end || "";
    if (!endTime || endTime === "00:00") {
      endTime =
        selectedSlot?.end && selectedSlot.end !== "00:00"
          ? selectedSlot.end
          : addMinutesToTime(startTime, 60);
    }

    const startMinutes = parseTimeToMinutes(startTime);
    const endMinutes = parseTimeToMinutes(endTime);

    // For same-day bookings, ensure endTime stays after startTime.
    if (
      startDate &&
      endDate &&
      startDate === endDate &&
      startMinutes !== null &&
      endMinutes !== null &&
      endMinutes <= startMinutes
    ) {
      endTime = addMinutesToTime(startTime, 60);
    }

    return {
      startDate,
      endDate,
      startTime,
      endTime,
    };
  }, [
    formData.startDate,
    formData.endDate,
    formData.startTime,
    formData.endTime,
    selectedSlot?.start,
    selectedSlot?.end,
  ]);

  const getCaregiverRates = () => {
    if (!caregiver) {
      return { hourly: 0, daily: 0, weekly: 0, monthly: 0 };
    }

    const caregiverAny = caregiver as Caregiver & {
      caregiverRates?: {
        hourly?: number | string;
        daily?: number | string;
        weekly?: number | string;
        monthly?: number | string;
      };
      rates?: {
        hourly?: number | string;
        daily?: number | string;
        weekly?: number | string;
        monthly?: number | string;
      };
      pricing?: {
        hourlyRate?: number | string;
        dailyRate?: number | string;
        weeklyRate?: number | string;
        monthlyRate?: number | string;
      };
    };

    return {
      hourly:
        parsePositiveNumber(caregiverAny.hourlyRate) ||
        parsePositiveNumber(caregiverAny.caregiverRates?.hourly) ||
        parsePositiveNumber(caregiverAny.rates?.hourly) ||
        parsePositiveNumber(caregiverAny.pricing?.hourlyRate),
      daily:
        parsePositiveNumber(caregiverAny.dailyRate) ||
        parsePositiveNumber(caregiverAny.caregiverRates?.daily) ||
        parsePositiveNumber(caregiverAny.rates?.daily) ||
        parsePositiveNumber(caregiverAny.pricing?.dailyRate),
      weekly:
        parsePositiveNumber(caregiverAny.weeklyRate) ||
        parsePositiveNumber(caregiverAny.caregiverRates?.weekly) ||
        parsePositiveNumber(caregiverAny.rates?.weekly) ||
        parsePositiveNumber(caregiverAny.pricing?.weeklyRate),
      monthly:
        parsePositiveNumber(caregiverAny.monthlyRate) ||
        parsePositiveNumber(caregiverAny.caregiverRates?.monthly) ||
        parsePositiveNumber(caregiverAny.rates?.monthly) ||
        parsePositiveNumber(caregiverAny.pricing?.monthlyRate),
    };
  };

  // Check if caregiver has any valid rate set
  const hasValidRate = () => {
    const rates = getCaregiverRates();
    return [rates.hourly, rates.daily, rates.weekly, rates.monthly].some(
      (rate) => rate > 0,
    );
  };

  // Get the effective rate for the selected duration type
  const getEffectiveRate = () => {
    const rates = getCaregiverRates();

    switch (formData.durationType) {
      case "hourly":
        return rates.hourly || (rates.daily ? Math.round(rates.daily / 8) : 0);
      case "daily":
        return rates.daily || (rates.hourly ? rates.hourly * 8 : 0);
      case "weekly":
        return (
          rates.weekly ||
          (rates.daily ? rates.daily * 7 : rates.hourly ? rates.hourly * 8 * 7 : 0)
        );
      case "monthly":
        return (
          rates.monthly ||
          (rates.daily ? rates.daily * 30 : rates.hourly ? rates.hourly * 8 * 30 : 0)
        );
      default:
        return rates.hourly;
    }
  };

  const calculateEstimatedPrice = () => {
    if (!caregiver || !formData.startDate) return 0;

    const start = parseBookingDate(formData.startDate);
    if (!start) return 0;

    const end = parseBookingDate(formData.endDate || formData.startDate) || start;
    const diffMs = Math.max(end.getTime() - start.getTime(), 0);
    const diffDays = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

    // Use effective rate which has fallback logic
    const effectiveRate = getEffectiveRate();

    switch (formData.durationType) {
      case "hourly":
        // Estimate 8 hours per day
        return effectiveRate * 8 * diffDays;
      case "daily":
        return effectiveRate * diffDays;
      case "weekly":
        return effectiveRate * Math.ceil(diffDays / 7);
      case "monthly":
        return effectiveRate * Math.ceil(diffDays / 30);
      default:
        return 0;
    }
  };

  // Handle slot selection from AvailabilityCalendar
  const handleDateRangeSelect = useCallback((startDate: string, endDate: string) => {
    setSelectedDate(startDate);
    setFormData((prev) => ({
      ...prev,
      startDate,
      endDate,
    }));
    setAvailabilityCheck(null);
    setError("");
  }, []);

  const handleSlotSelect = useCallback((date: string, slot: TimeSlot) => {
    setSelectedDate(date);
    setSelectedSlot(slot);
    setFormData((prev) => {
      const keepExistingRange =
        Boolean(prev.endDate) &&
        Boolean(prev.startDate) &&
        prev.endDate !== prev.startDate &&
        prev.startDate === date;

      return {
        ...prev,
        startDate: date,
        endDate: keepExistingRange
          ? prev.endDate
          : resolveDefaultEndDate(date, prev.durationType),
        startTime: slot.start,
        endTime: slot.end,
      };
    });
    setAvailabilityCheck(null); // Reset previous check
    setError("");
  }, []);

  // Check availability before proceeding
  const checkSlotAvailability = useCallback(async () => {
    const schedule = getNormalizedSchedule();
    if (!caregiverId || !schedule.startDate || !schedule.startTime) {
      return false;
    }

    setIsCheckingAvailability(true);
    setError("");

    try {
      const response = await availabilityService.checkAvailability(
        caregiverId,
        schedule,
      );

      if (response.success && response.data) {
        setAvailabilityCheck(response.data);
        if (!response.data.available) {
          const reasons = [];
          if (response.data.blockedDate) {
            reasons.push("This date is blocked by the caregiver");
          }
          if (response.data.conflicts && response.data.conflicts.length > 0) {
            reasons.push(`The caregiver has ${response.data.conflicts.length} conflicting booking(s)`);
          }
          if (response.data.reason) {
            reasons.push(response.data.reason);
          }
          setError(reasons.join(". ") || "This time slot is not available");
          return false;
        }
        return true;
      }
      return false;
    } catch (err) {
      const statusCode = extractStatusCode(err);
      if (statusCode === 401) {
        router.replace(`/login?redirect=/book/${caregiverId}`);
        return false;
      }

      if (statusCode === 403) {
        setError("Your account is not allowed to create bookings yet.");
        return false;
      }

      console.error("Availability check error:", err);
      setError(getApiErrorMessage(err, "Failed to check availability. Please try again."));
      return false;
    } finally {
      setIsCheckingAvailability(false);
    }
  }, [caregiverId, getNormalizedSchedule, router]);

  // Handle reservation expiry
  const handleReservationExpired = useCallback(() => {
    setError("Your reservation has expired. The time slot may no longer be available.");
    setReservationId(null);
    setReservationExpiry(null);
    setCurrentStep(2);
  }, []);

  // Handle reservation extension
  const handleExtendReservation = useCallback(async () => {
    if (!reservationId) return;

    try {
      const response = await bookingService.extendReservation(reservationId);
      if (response.success && response.data?.booking) {
        setReservationExpiry(response.data.booking.reservationExpiry ?? null);
      }
    } catch (err) {
      console.error("Failed to extend reservation:", err);
    }
  }, [reservationId]);

  const validateStep = (step: number) => {
    switch (step) {
      case 1:
        return !!formData.serviceType && !!formData.durationType;
      case 2:
        return !!formData.startDate && !!formData.startTime && !!formData.recipientName;
      case 3:
        return !!formData.address && !!formData.city && !!formData.state;
      default:
        return true;
    }
  };

  const handleNext = async () => {
    if (!validateStep(currentStep)) return;

    // Check availability before leaving step 2
    if (currentStep === 2) {
      const isAvailable = await checkSlotAvailability();
      if (!isAvailable) return;
    }

    setCurrentStep((prev) => Math.min(prev + 1, 4));
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !caregiver?._id || !formData.serviceType) return;

    setIsSubmitting(true);
    setError("");

    try {
      const parsedRecipientAge = formData.recipientAge ? parseInt(formData.recipientAge, 10) : undefined;
      const parsedMedicalConditions = formData.medicalConditions
        ? formData.medicalConditions.split(",").map((s) => s.trim())
        : undefined;

      const normalizedSchedule = getNormalizedSchedule();

      const bookingData: CreateBookingData = {
        caregiverId: caregiver._id,
        serviceType: formData.serviceType as ServiceType,
        durationType: formData.durationType as "hourly" | "daily" | "weekly" | "monthly",
        schedule: normalizedSchedule,
        location: {
          address: formData.address,
          city: formData.city,
          state: formData.state,
          zipCode: formData.zipCode,
          additionalInstructions: formData.additionalInstructions,
        },
        careRecipient: {
          name: formData.recipientName,
          relationship: formData.recipientRelationship,
          specialNeeds: formData.specialNeeds,
          ...(parsedRecipientAge !== undefined ? { age: parsedRecipientAge } : {}),
          ...(parsedMedicalConditions !== undefined ? { medicalConditions: parsedMedicalConditions } : {}),
        },
        careInstructions: formData.careInstructions,
        notes: formData.notes,
      };

      // Step 1: Create the reservation (status: reserved)
      const createResponse = await bookingService.createBooking(bookingData);

      if (!createResponse.success || !createResponse.data?.booking) {
        setError(createResponse.error || createResponse.message || "Failed to create booking. Please try again.");
        return;
      }

      const booking = createResponse.data.booking;
      const bookingId = booking._id;

      // If booking was created with reserved status, we need to submit it
      if (booking.status === 'reserved') {
        setReservationId(bookingId);
        setReservationExpiry(booking.reservationExpiry ?? null);

        // Step 2: Family-side agreement acceptance (mandatory before submit)
        const agreementAcceptResponse = await bookingService.acceptAgreement(bookingId);
        if (!agreementAcceptResponse.success) {
          setError(
            agreementAcceptResponse.error ||
              agreementAcceptResponse.message ||
              "Please accept the agreement before submitting your booking request.",
          );
          return;
        }

        // Step 3: Submit the reservation (converts to pending)
        const submitResponse = await bookingService.submitReservation(bookingId);

        if (submitResponse.success) {
          setSuccessMessage("Your booking request has been sent! The caregiver will respond shortly.");
          setTimeout(() => {
            router.push(`/dashboard/bookings?booked=${bookingId}`);
          }, 1500);
        } else {
          setError(submitResponse.error || submitResponse.message || "Failed to submit booking. Please try again.");
        }
      } else {
        // Booking was created directly (for backwards compatibility)
        setSuccessMessage("Your booking request has been sent! The caregiver will respond shortly.");
        setTimeout(() => {
          router.push(`/dashboard/bookings?booked=${bookingId}`);
        }, 1500);
      }
    } catch (err) {
      console.error("Booking error:", err);
      const statusCode = extractStatusCode(err);
      if (statusCode === 401) {
        router.replace(`/login?redirect=/book/${caregiverId}`);
        return;
      }

      setError(getApiErrorMessage(err, "An error occurred. Please try again."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatNPR = (amount: number): string => `NPR ${amount.toLocaleString()}`;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-50 via-blue-50/40 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400 font-medium">Loading caregiver details&hellip;</p>
        </div>
      </div>
    );
  }

  if (!caregiver) {
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-50 via-blue-50/40 to-indigo-50 flex items-center justify-center">
        <div className="text-center bg-white rounded-2xl p-10 shadow-xl border border-blue-100 max-w-sm mx-4">
          <div className="text-5xl mb-4">🔍</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Caregiver Not Found</h1>
          <p className="text-gray-400 mb-6 text-sm">This caregiver doesn&apos;t exist or is no longer available.</p>
          <Link href="/caregivers" className="inline-flex items-center gap-2 px-6 py-3 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-all font-semibold shadow-md">
            Browse Caregivers
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 via-blue-50/30 to-indigo-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200/60 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/home" className="flex items-center gap-2.5">
              <Logo variant="default" showText asLink={false} />
            </Link>
            <Link
              href={`/caregiver/${caregiverId}`}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary-500 transition-colors font-medium"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Profile
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 p-4 bg-green-100 border border-green-300 rounded-xl text-green-800 flex items-center gap-3">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {successMessage}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-300 rounded-xl text-red-800">
            {error}
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-[#E1E6EF]">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Book {caregiver.fullName}</h1>
              <p className="text-gray-600 mb-6">Complete the form below to request a booking</p>

              {/* Progress Steps */}
              <div className="flex items-center justify-between mb-8">
                {[1, 2, 3, 4].map((step) => (
                  <div key={step} className="flex items-center">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                        currentStep >= step
                          ? "bg-primary-500 text-white"
                          : "bg-gray-200 text-gray-500"
                      }`}
                    >
                      {currentStep > step ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        step
                      )}
                    </div>
                    {step < 4 && (
                      <div
                        className={`w-16 sm:w-24 h-1 mx-2 ${
                          currentStep > step ? "bg-primary-500" : "bg-gray-200"
                        }`}
                      />
                    )}
                  </div>
                ))}
              </div>

              <form onSubmit={handleSubmit}>
                {/* Step 1: Service Type */}
                {currentStep === 1 && (
                  <div className="space-y-6">
                    <h2 className="text-lg font-semibold text-gray-900">Select Service Type</h2>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {SERVICE_TYPES.map((service) => (
                        <button
                          key={service.value}
                          type="button"
                          onClick={() => setFormData((prev) => ({ ...prev, serviceType: service.value }))}
                          className={`p-4 rounded-xl border-2 text-left transition-all duration-200 ${
                            formData.serviceType === service.value
                              ? "border-primary-500 bg-blue-50/80 shadow-sm"
                              : "border-slate-200 hover:border-blue-200 hover:bg-slate-50/80"
                          }`}
                        >
                          <span className="text-2xl mb-2 block">{service.icon}</span>
                          <span className={`font-semibold text-sm leading-tight block ${formData.serviceType === service.value ? "text-primary-500" : "text-gray-700"}`}>{service.label}</span>
                        </button>
                      ))}
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-gray-900 mb-0.5">How long do you need care?</h3>
                      <p className="text-sm text-gray-400 mb-3">Choose the duration that fits your schedule</p>
                      <div className="grid grid-cols-2 gap-3">
                        {DURATION_TYPES.map((type) => (
                          <button
                            key={type.value}
                            type="button"
                            onClick={() => setFormData((prev) => ({ ...prev, durationType: type.value }))}
                            className={`p-4 rounded-xl border-2 text-left transition-all duration-200 ${
                              formData.durationType === type.value
                                ? "border-primary-500 bg-blue-50/80 shadow-sm"
                                : "border-slate-200 hover:border-blue-200 hover:bg-slate-50/80"
                            }`}
                          >
                            <span className={`font-bold text-base block mb-0.5 ${formData.durationType === type.value ? "text-primary-500" : "text-gray-800"}`}>{type.label}</span>
                            <span className="text-xs text-gray-400">{type.description}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 2: Schedule & Care Recipient */}
                {currentStep === 2 && (
                  <div className="space-y-6">
                    <h2 className="text-lg font-semibold text-gray-900">Schedule & Care Recipient</h2>

                    {/* Reservation Timer */}
                    {reservationExpiry && (
                      <ReservationTimer
                        expiresAt={reservationExpiry}
                        onExpired={handleReservationExpired}
                        onExtend={handleExtendReservation}
                        canExtend={true}
                      />
                    )}

                    {/* Availability Calendar */}
                    <div className="mb-6">
                      <AvailabilityCalendar
                        caregiverId={caregiverId}
                        onDateRangeSelect={handleDateRangeSelect}
                        onSlotSelect={handleSlotSelect}
                        selectedDate={selectedDate}
                        selectedEndDate={formData.endDate}
                        selectedSlot={selectedSlot}
                        slotDuration={60}
                      />
                    </div>

                    {/* Premium Date-Time Planner */}
                    <div className="rounded-2xl border border-indigo-100 bg-linear-to-br from-indigo-50 via-white to-blue-50 p-5 shadow-xs">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-sm font-bold text-indigo-900">Premium Date &amp; Time Planner</h3>
                          <p className="text-xs text-indigo-700/80 mt-0.5">Fine-tune your start/end window and service hours</p>
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200">
                          Live Schedule
                        </span>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-indigo-900 mb-1.5">Start Date</label>
                          <input
                            type="date"
                            name="startDate"
                            value={formData.startDate}
                            onChange={handleInputChange}
                            min={toLocalDateInput(new Date())}
                            className="w-full px-4 py-3 border border-indigo-200 rounded-xl bg-white text-sm focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-indigo-900 mb-1.5">End Date</label>
                          <input
                            type="date"
                            name="endDate"
                            value={formData.endDate}
                            onChange={handleInputChange}
                            min={formData.startDate || toLocalDateInput(new Date())}
                            className="w-full px-4 py-3 border border-indigo-200 rounded-xl bg-white text-sm focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-indigo-900 mb-1.5">Start Time</label>
                          <input
                            type="time"
                            name="startTime"
                            value={formData.startTime}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 border border-indigo-200 rounded-xl bg-white text-sm focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-indigo-900 mb-1.5">End Time</label>
                          <input
                            type="time"
                            name="endTime"
                            value={formData.endTime}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 border border-indigo-200 rounded-xl bg-white text-sm focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400"
                          />
                        </div>
                      </div>

                      {formData.startDate && (
                        <p className="mt-3 text-xs text-indigo-700">
                          Planned window: <span className="font-semibold">{formatBookingDateLabel(formData.startDate)}</span>
                          {formData.endDate && formData.endDate !== formData.startDate && (
                            <>
                              {" "}to <span className="font-semibold">{formatBookingDateLabel(formData.endDate)}</span>
                            </>
                          )}
                          {formData.startTime && (
                            <>
                              {" "}between <span className="font-semibold">{formData.startTime}</span>
                              {formData.endTime ? <span className="font-semibold"> - {formData.endTime}</span> : null}
                            </>
                          )}
                        </p>
                      )}
                    </div>

                    {/* Selected Slot Display */}
                    {selectedSlot && selectedDate && (
                      <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        <div>
                          <p className="font-medium text-emerald-800">Time Slot Selected</p>
                          <p className="text-sm text-emerald-600">
                            {new Date(`${selectedDate}T00:00:00`).toLocaleDateString("en-US", {
                              weekday: "long",
                              month: "long",
                              day: "numeric",
                            })}{" "}
                            at {selectedSlot.start} - {selectedSlot.end}
                          </p>
                        </div>
                      </div>
                    )}

                    {formData.startDate && formData.endDate && (
                      <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-xl border border-blue-200">
                        <CheckCircle2 className="w-5 h-5 text-blue-600 mt-0.5" />
                        <div>
                          <p className="font-medium text-blue-800">Booking Window</p>
                          <p className="text-sm text-blue-700">
                            {formatBookingDateLabel(formData.startDate)}
                            {formData.endDate !== formData.startDate && (
                              <>
                                {" "}to {formatBookingDateLabel(formData.endDate)}
                              </>
                            )}
                          </p>
                          <p className="text-xs text-blue-600 mt-1">
                            {formData.durationType === "weekly"
                              ? "Weekly bookings default to a 7-day range."
                              : formData.durationType === "monthly"
                                ? "Monthly bookings default to a 30-day range."
                                : "You can still adjust start/end dates manually below if needed."}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Availability Check Status */}
                    {isCheckingAvailability && (
                      <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl border border-blue-200">
                        <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                        <p className="text-blue-700 font-medium">Checking availability...</p>
                      </div>
                    )}

                    {availabilityCheck && !availabilityCheck.available && (
                      <div className="flex items-center gap-3 p-4 bg-red-50 rounded-xl border border-red-200">
                        <AlertCircle className="w-5 h-5 text-red-600" />
                        <div>
                          <p className="font-medium text-red-800">Time Slot Unavailable</p>
                          <p className="text-sm text-red-600">
                            {availabilityCheck.reason || "This time slot is not available. Please select another time."}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Manual Date/Time Inputs (Fallback) */}
                    <details className="group">
                      <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700 flex items-center gap-2">
                        <svg className="w-4 h-4 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                        Enter dates manually instead
                      </summary>
                      <div className="mt-4 grid sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Start Date <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="date"
                            name="startDate"
                            value={formData.startDate}
                            onChange={handleInputChange}
                            min={toLocalDateInput(new Date())}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            End Date
                          </label>
                          <input
                            type="date"
                            name="endDate"
                            value={formData.endDate}
                            onChange={handleInputChange}
                            min={formData.startDate || toLocalDateInput(new Date())}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Start Time <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="time"
                            name="startTime"
                            value={formData.startTime}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            End Time
                          </label>
                          <input
                            type="time"
                            name="endTime"
                            value={formData.endTime}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          />
                        </div>
                      </div>
                    </details>

                    <hr className="my-6" />

                    <h3 className="text-md font-semibold text-gray-900">Care Recipient Details</h3>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="recipientName"
                          value={formData.recipientName}
                          onChange={handleInputChange}
                          placeholder="Name of person receiving care"
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Age
                        </label>
                        <input
                          type="number"
                          name="recipientAge"
                          value={formData.recipientAge}
                          onChange={handleInputChange}
                          placeholder="Age"
                          min="0"
                          max="150"
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Relationship to You
                        </label>
                        <select
                          name="recipientRelationship"
                          value={formData.recipientRelationship}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        >
                          <option value="">Select relationship</option>
                          <option value="self">Self</option>
                          <option value="parent">Parent</option>
                          <option value="grandparent">Grandparent</option>
                          <option value="child">Child</option>
                          <option value="spouse">Spouse</option>
                          <option value="sibling">Sibling</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Special Needs or Conditions
                      </label>
                      <textarea
                        name="specialNeeds"
                        value={formData.specialNeeds}
                        onChange={handleInputChange}
                        placeholder="Describe any special needs, medical conditions, or important information"
                        rows={3}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                      />
                    </div>
                  </div>
                )}

                {/* Step 3: Location */}
                {currentStep === 3 && (
                  <div className="space-y-6">
                    <h2 className="text-lg font-semibold text-gray-900">Service Location</h2>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Street Address <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="address"
                        value={formData.address}
                        onChange={handleInputChange}
                        placeholder="123 Main Street, Apt 4B"
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        required
                      />
                    </div>

                    <div className="grid sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          City <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="city"
                          value={formData.city}
                          onChange={handleInputChange}
                          placeholder="City"
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Province <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="state"
                          value={formData.state}
                          onChange={handleInputChange}
                          placeholder="e.g. Bagmati"
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          ZIP Code
                        </label>
                        <input
                          type="text"
                          name="zipCode"
                          value={formData.zipCode}
                          onChange={handleInputChange}
                          placeholder="12345"
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Additional Instructions for Finding Location
                      </label>
                      <textarea
                        name="additionalInstructions"
                        value={formData.additionalInstructions}
                        onChange={handleInputChange}
                        placeholder="E.g., Gate code, parking instructions, building entrance details"
                        rows={3}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                      />
                    </div>
                  </div>
                )}

                {/* Step 4: Review & Submit */}
                {currentStep === 4 && (
                  <div className="space-y-6">
                    <h2 className="text-lg font-semibold text-gray-900">Review Your Booking</h2>

                    <div className="bg-primary-50 rounded-xl p-4 space-y-4">
                      <div>
                        <p className="text-sm text-gray-500">Service Type</p>
                        <p className="font-medium text-gray-900">
                          {SERVICE_TYPES.find((s) => s.value === formData.serviceType)?.label || formData.serviceType}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Schedule</p>
                        <p className="font-medium text-gray-900">
                          {new Date(`${formData.startDate}T00:00:00`).toLocaleDateString()}
                          {formData.endDate && formData.endDate !== formData.startDate && (
                            <> - {new Date(`${formData.endDate}T00:00:00`).toLocaleDateString()}</>
                          )}
                          {formData.startTime && <> at {formData.startTime}</>}
                          {formData.endTime && <> - {formData.endTime}</>}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Care Recipient</p>
                        <p className="font-medium text-gray-900">
                          {formData.recipientName}
                          {formData.recipientAge && `, ${formData.recipientAge} years old`}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Location</p>
                        <p className="font-medium text-gray-900">
                          {formData.address}, {formData.city}, {formData.state} {formData.zipCode}
                        </p>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Care Instructions (Optional)
                      </label>
                      <textarea
                        name="careInstructions"
                        value={formData.careInstructions}
                        onChange={handleInputChange}
                        placeholder="Any specific care instructions for the caregiver"
                        rows={3}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Additional Notes (Optional)
                      </label>
                      <textarea
                        name="notes"
                        value={formData.notes}
                        onChange={handleInputChange}
                        placeholder="Any other information you'd like to share"
                        rows={2}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                      />
                    </div>
                  </div>
                )}

                {/* Navigation Buttons */}
                <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
                  {currentStep > 1 ? (
                    <button
                      type="button"
                      onClick={handleBack}
                      className="px-6 py-3 text-gray-600 hover:text-gray-800 font-medium"
                    >
                      Back
                    </button>
                  ) : (
                    <div />
                  )}

                  {currentStep < 4 ? (
                    <button
                      type="button"
                      onClick={handleNext}
                      disabled={!validateStep(currentStep)}
                      className="px-8 py-3 bg-primary-500 text-white font-semibold rounded-xl hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Continue
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-8 py-3 bg-primary-500 text-white font-semibold rounded-xl hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        "Submit Booking Request"
                      )}
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-xl border border-slate-100 sticky top-24 overflow-hidden">
              {/* Gradient header */}
              <div className="bg-linear-to-br from-primary-500 to-[#6B7FFF] p-5">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center overflow-hidden shrink-0">
                    {caregiver.avatar ? (
                      <Image src={caregiver.avatar} alt={caregiver.fullName} width={48} height={48} className="object-cover w-full h-full" />
                    ) : (
                      <span className="text-xl font-bold text-white">{caregiver.fullName?.charAt(0)?.toUpperCase()}</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-white truncate">{caregiver.fullName}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <svg className="w-3 h-3 text-yellow-300 fill-current" viewBox="0 0 20 20"><path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" /></svg>
                      <span className="text-blue-100 text-xs">{caregiver.rating?.toFixed(1) || "N/A"} - {caregiver.totalReviews || 0} reviews</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-5 space-y-5">
                {/* Rates in NPR */}
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Rates (NPR)</p>
                  <div className="space-y-2 text-sm">
                    {caregiver.hourlyRate && (
                      <div className="flex justify-between items-center py-1.5 border-b border-slate-50">
                        <span className="text-gray-500">Per Hour</span>
                        <span className="font-bold text-primary-500">{formatNPR(caregiver.hourlyRate)}</span>
                      </div>
                    )}
                    {caregiver.dailyRate && (
                      <div className="flex justify-between items-center py-1.5 border-b border-slate-50">
                        <span className="text-gray-500">Per Day</span>
                        <span className="font-bold text-primary-500">{formatNPR(caregiver.dailyRate)}</span>
                      </div>
                    )}
                    {caregiver.weeklyRate && (
                      <div className="flex justify-between items-center py-1.5 border-b border-slate-50">
                        <span className="text-gray-500">Per Week</span>
                        <span className="font-bold text-primary-500">{formatNPR(caregiver.weeklyRate)}</span>
                      </div>
                    )}
                    {caregiver.monthlyRate && (
                      <div className="flex justify-between items-center py-1.5">
                        <span className="text-gray-500">Per Month</span>
                        <span className="font-bold text-primary-500">{formatNPR(caregiver.monthlyRate)}</span>
                      </div>
                    )}
                    {!caregiver.hourlyRate && !caregiver.dailyRate && !caregiver.weeklyRate && !caregiver.monthlyRate && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                        <p className="text-amber-800 text-sm font-medium">Warning: Rates not set</p>
                        <p className="text-amber-600 text-xs mt-1">This caregiver hasn&apos;t set their service rates. Please contact them before booking.</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Warning if rates not set */}
                {!hasValidRate() && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <p className="text-red-800 text-sm font-semibold flex items-center gap-2">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      Booking Unavailable
                    </p>
                    <p className="text-red-600 text-xs mt-1">This caregiver hasn&apos;t configured their pricing. Booking cannot proceed until rates are set.</p>
                  </div>
                )}

                {/* Estimated Total */}
                {formData.startDate && calculateEstimatedPrice() > 0 && (
                  <div className="bg-linear-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-semibold text-gray-600">Estimated Total</span>
                      <span className="text-lg font-extrabold text-primary-500">{formatNPR(calculateEstimatedPrice())}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Final amount may vary</p>
                  </div>
                )}

                {/* Secure Booking */}
                <div className="flex items-start gap-3 p-3.5 bg-emerald-50 rounded-xl border border-emerald-100">
                  <svg className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                  <div>
                    <p className="text-sm font-semibold text-emerald-800">Secure Booking</p>
                    <p className="text-xs text-emerald-600 mt-0.5 leading-relaxed">You won&apos;t be charged until the caregiver confirms your request.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
