"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  Shield,
  Plus,
  Search,
  Filter,
  ChevronDown,
  ChevronRight,
  Clock,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Eye,
  MessageSquare,
  Calendar,
  Hash,
  ArrowLeft,
  Loader2,
  RefreshCw,
  CircleDot,
  FileText,
  Scale,
  X,
  Send,
  Paperclip,
  LayoutDashboard,
} from "lucide-react";
import { authService } from "@/modules/auth/services";
import { bookingService, Booking } from "@/modules/booking/services";
import disputeService, { Dispute, CreateDisputePayload } from "@/services/api/dispute.service";
import type { User } from "@/types";

// ============================================
// CONSTANTS & CONFIGS
// ============================================

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bgColor: string; borderColor: string; icon: React.ElementType }
> = {
  open: {
    label: "Open",
    color: "text-blue-700",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    icon: CircleDot,
  },
  investigating: {
    label: "Investigating",
    color: "text-amber-700",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
    icon: Eye,
  },
  awaiting_response: {
    label: "Awaiting Response",
    color: "text-purple-700",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200",
    icon: Clock,
  },
  resolved: {
    label: "Resolved",
    color: "text-emerald-700",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-200",
    icon: CheckCircle2,
  },
  dismissed: {
    label: "Dismissed",
    color: "text-gray-700",
    bgColor: "bg-gray-100",
    borderColor: "border-gray-200",
    icon: XCircle,
  },
  escalated: {
    label: "Escalated",
    color: "text-red-700",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    icon: AlertTriangle,
  },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  low: { label: "Low", color: "text-slate-600", bgColor: "bg-slate-100" },
  medium: { label: "Medium", color: "text-blue-600", bgColor: "bg-blue-100" },
  high: { label: "High", color: "text-orange-600", bgColor: "bg-orange-100" },
  critical: { label: "Critical", color: "text-red-600", bgColor: "bg-red-100" },
};

const CATEGORY_LABELS: Record<string, string> = {
  service_quality: "Service Quality",
  payment_issue: "Payment Issue",
  no_show: "No-Show",
  safety_concern: "Safety Concern",
  misconduct: "Misconduct",
  cancellation_dispute: "Cancellation",
  property_damage: "Property Damage",
  communication_issue: "Communication",
  schedule_dispute: "Scheduling",
  other: "Other",
};

const DISPUTE_CATEGORIES = [
  { id: "service_quality", label: "Service Quality", description: "Issues with the quality of care provided" },
  { id: "payment_issue", label: "Payment Issue", description: "Problems with payment, charges, or billing" },
  { id: "no_show", label: "No-Show", description: "Caregiver or client did not show up" },
  { id: "safety_concern", label: "Safety Concern", description: "Safety-related incidents or concerns" },
  { id: "misconduct", label: "Misconduct", description: "Inappropriate behavior or misconduct" },
  { id: "cancellation_dispute", label: "Cancellation", description: "Issues related to booking cancellation" },
  { id: "property_damage", label: "Property Damage", description: "Damage to property during service" },
  { id: "communication_issue", label: "Communication", description: "Lack of communication or unresponsiveness" },
  { id: "schedule_dispute", label: "Scheduling", description: "Problems with scheduling or timing" },
  { id: "other", label: "Other", description: "Other issues not listed above" },
];

const TIMELINE_ICONS: Record<string, React.ElementType> = {
  created: CircleDot,
  status_change: Eye,
  message_sent: MessageSquare,
  evidence_added: Paperclip,
  resolved: CheckCircle2,
  dismissed: XCircle,
  escalated: AlertTriangle,
};

// ============================================
// STATUS BADGE COMPONENT
// ============================================

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.open;
  const Icon = config.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${config.bgColor} ${config.color} border ${config.borderColor}`}
    >
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const config = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.low;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase ${config.bgColor} ${config.color}`}>
      {config.label}
    </span>
  );
}

// ============================================
// DISPUTE CARD COMPONENT
// ============================================

function DisputeCard({ dispute, onClick }: { dispute: Dispute; onClick: () => void }) {
  const createdDate = new Date(dispute.createdAt);
  const daysSinceCreated = Math.floor((Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24));

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.005, y: -2 }}
      onClick={onClick}
      className="bg-white rounded-xl border border-[#E1E6EF] p-5 cursor-pointer hover:shadow-lg hover:border-primary-200 transition-all group"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-[#7C3AED] flex items-center justify-center shadow-lg shadow-primary-500/20">
            <Scale className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-gray-500">{dispute.ticketNumber}</span>
              <PriorityBadge priority={dispute.priority} />
            </div>
            <h3 className="font-semibold text-gray-900 line-clamp-1">{dispute.subject}</h3>
          </div>
        </div>
        <StatusBadge status={dispute.status} />
      </div>

      {/* Description */}
      <p className="text-sm text-gray-600 line-clamp-2 mb-4">{dispute.description}</p>

      {/* Meta Info */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
        <span className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-lg">
          <Hash className="w-3 h-3" />
          {dispute.bookingId?.bookingNumber || "N/A"}
        </span>
        <span className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-lg">
          <FileText className="w-3 h-3" />
          {CATEGORY_LABELS[dispute.category] || dispute.category}
        </span>
        <span className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-lg">
          <Calendar className="w-3 h-3" />
          {daysSinceCreated === 0 ? "Today" : `${daysSinceCreated}d ago`}
        </span>
        {dispute.messages?.length > 0 && (
          <span className="flex items-center gap-1.5 bg-blue-50 text-blue-600 px-2 py-1 rounded-lg">
            <MessageSquare className="w-3 h-3" />
            {dispute.messages.length}
          </span>
        )}
      </div>

      {/* Against User */}
      <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-xs font-semibold text-gray-600">
            {(dispute.againstUser?.fullName || "?").charAt(0).toUpperCase()}
          </div>
          <span className="text-sm text-gray-600">
            Against: <span className="font-medium text-gray-900">{dispute.againstUser?.fullName || "Unknown"}</span>
          </span>
        </div>
        <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-primary-500 transition-colors" />
      </div>
    </motion.div>
  );
}

// ============================================
// EMPTY STATE COMPONENT
// ============================================

function EmptyState({ hasFilters, onClear, onCreate }: { hasFilters: boolean; onClear: () => void; onCreate: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="text-center py-16 bg-white rounded-2xl border border-[#E1E6EF]"
    >
      <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-primary-100 to-violet-100 rounded-2xl flex items-center justify-center">
        <Shield className="w-10 h-10 text-primary-500" />
      </div>
      <h3 className="text-xl font-bold text-gray-900 mb-2">
        {hasFilters ? "No disputes match your filters" : "No disputes filed"}
      </h3>
      <p className="text-gray-500 mb-6 max-w-sm mx-auto">
        {hasFilters
          ? "Try adjusting your filters to see more results."
          : "If you experience any issues with a booking, you can report a dispute here."}
      </p>
      {hasFilters ? (
        <button
          onClick={onClear}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-primary-600 bg-primary-50 rounded-xl hover:bg-primary-100 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Clear Filters
        </button>
      ) : (
        <button
          onClick={onCreate}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-primary-500 to-[#7C3AED] rounded-xl hover:shadow-lg transition-all"
        >
          <Plus className="w-4 h-4" />
          Report a Dispute
        </button>
      )}
    </motion.div>
  );
}

// ============================================
// CREATE DISPUTE MODAL
// ============================================

function CreateDisputeModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: (dispute: Dispute) => void;
}) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoadingBookings, setIsLoadingBookings] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [step, setStep] = useState(1);

  // Form state
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");

  const isFormValid = selectedBooking && selectedCategory && subject.trim() && description.trim().length >= 20;

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    setIsLoadingBookings(true);
    try {
      const response = await bookingService.getMyBookings({ limit: 50 });
      if (response.success && response.data) {
        const disputeableBookings = response.data.bookings.filter(
          (b: Booking) => ["completed", "cancelled", "in_progress", "confirmed"].includes(b.status)
        );
        setBookings(disputeableBookings);
      }
    } catch (err) {
      console.error("Failed to fetch bookings:", err);
    } finally {
      setIsLoadingBookings(false);
    }
  };

  const handleSubmit = async () => {
    if (!isFormValid || !selectedBooking) return;
    setIsSubmitting(true);
    setFormError(null);

    try {
      const payload: CreateDisputePayload = {
        bookingId: selectedBooking._id,
        category: selectedCategory,
        subject: subject.trim(),
        description: description.trim(),
      };

      const response = await disputeService.create(payload);
      if (response.success && response.data) {
        onSuccess(response.data.dispute || response.data);
        onClose();
        resetForm();
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Failed to create dispute";
      setFormError(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setSelectedBooking(null);
    setSelectedCategory("");
    setSubject("");
    setDescription("");
    setStep(1);
    setFormError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E1E6EF]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-[#7C3AED] flex items-center justify-center">
              <Scale className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Report a Dispute</h2>
              <p className="text-sm text-gray-500">Step {step} of 3</p>
            </div>
          </div>
          <button onClick={handleClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="h-1 bg-gray-100">
          <motion.div
            className="h-full bg-gradient-to-r from-primary-500 to-[#7C3AED]"
            initial={{ width: "33%" }}
            animate={{ width: `${(step / 3) * 100}%` }}
          />
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {formError && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-3">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p className="text-sm">{formError}</p>
            </div>
          )}

          <AnimatePresence mode="wait">
            {/* Step 1: Select Booking */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <h3 className="font-semibold text-gray-900">Select the booking you want to dispute</h3>
                {isLoadingBookings ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 text-primary-500 animate-spin" />
                  </div>
                ) : bookings.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No bookings available to dispute</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {bookings.map((booking) => (
                      <button
                        key={booking._id}
                        type="button"
                        onClick={() => setSelectedBooking(booking)}
                        className={`w-full flex items-center gap-3 p-4 rounded-xl border transition-all text-left ${
                          selectedBooking?._id === booking._id
                            ? "border-primary-500 bg-primary-50 ring-2 ring-primary-500/20"
                            : "border-[#E1E6EF] hover:border-primary-300 hover:bg-gray-50"
                        }`}
                      >
                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                          <Hash className="w-5 h-5 text-gray-500" />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">#{booking.bookingNumber}</p>
                          <p className="text-sm text-gray-500 capitalize">
                            {booking.serviceType?.replace(/_/g, " ")} · {booking.status}
                          </p>
                        </div>
                        {selectedBooking?._id === booking._id && (
                          <CheckCircle2 className="w-5 h-5 text-primary-500" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* Step 2: Category */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <h3 className="font-semibold text-gray-900">What type of issue are you experiencing?</h3>
                <div className="grid grid-cols-2 gap-3">
                  {DISPUTE_CATEGORIES.map((category) => (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => setSelectedCategory(category.id)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        selectedCategory === category.id
                          ? "border-primary-500 bg-primary-50 ring-2 ring-primary-500/20"
                          : "border-[#E1E6EF] hover:border-primary-300 hover:bg-gray-50"
                      }`}
                    >
                      <p className={`font-medium text-sm ${selectedCategory === category.id ? "text-primary-700" : "text-gray-900"}`}>
                        {category.label}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">{category.description}</p>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Step 3: Details */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <h3 className="font-semibold text-gray-900">Describe the issue in detail</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Brief summary of the issue"
                    className="w-full px-4 py-3 border border-[#E1E6EF] rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
                    maxLength={100}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Provide detailed information about the issue..."
                    rows={4}
                    className="w-full px-4 py-3 border border-[#E1E6EF] rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none resize-none"
                    minLength={20}
                  />
                  <p className={`text-xs mt-1 text-right ${description.length < 20 ? "text-amber-500" : "text-gray-400"}`}>
                    {description.length} characters (minimum 20)
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[#E1E6EF] bg-gray-50">
          <button
            onClick={() => step > 1 ? setStep(step - 1) : handleClose()}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            {step > 1 ? "Back" : "Cancel"}
          </button>
          <button
            onClick={() => {
              if (step === 1 && selectedBooking) setStep(2);
              else if (step === 2 && selectedCategory) setStep(3);
              else if (step === 3 && isFormValid) handleSubmit();
            }}
            disabled={
              (step === 1 && !selectedBooking) ||
              (step === 2 && !selectedCategory) ||
              (step === 3 && !isFormValid) ||
              isSubmitting
            }
            className="px-6 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-primary-500 to-[#7C3AED] rounded-xl hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Submitting...
              </>
            ) : step === 3 ? (
              "Submit Dispute"
            ) : (
              "Continue"
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ============================================
// DISPUTE DETAIL DRAWER
// ============================================

function DisputeDetailDrawer({
  dispute,
  currentUserId,
  onClose,
  onUpdate,
}: {
  dispute: Dispute | null;
  currentUserId: string;
  onClose: () => void;
  onUpdate: (updated: Dispute) => void;
}) {
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [activeTab, setActiveTab] = useState<"timeline" | "messages">("timeline");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (dispute && activeTab === "messages") {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [dispute?.messages, activeTab]);

  const handleSendMessage = async () => {
    if (!dispute || !newMessage.trim() || isSending) return;
    setIsSending(true);
    try {
      const response = await disputeService.addMessage(dispute._id, newMessage.trim());
      if (response.success && response.data) {
        onUpdate(response.data.dispute);
        setNewMessage("");
      }
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setIsSending(false);
    }
  };

  const formatRelativeTime = (dateString: string) => {
    const diff = Date.now() - new Date(dateString).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  if (!dispute) return null;

  const statusConfig = STATUS_CONFIG[dispute.status] || STATUS_CONFIG.open;
  const StatusIcon = statusConfig.icon;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="relative w-full max-w-lg bg-white shadow-2xl h-full overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E1E6EF] bg-gradient-to-r from-primary-50 to-violet-50">
          <div className="flex items-center justify-between mb-3">
            <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-white/50">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${statusConfig.bgColor} ${statusConfig.color} border ${statusConfig.borderColor}`}>
              <StatusIcon className="w-3.5 h-3.5" />
              {statusConfig.label}
            </span>
          </div>
          <div>
            <p className="text-xs font-mono text-gray-500 mb-1">{dispute.ticketNumber}</p>
            <h2 className="text-lg font-bold text-gray-900 line-clamp-2">{dispute.subject}</h2>
          </div>
        </div>

        {/* Details Card */}
        <div className="px-6 py-4 border-b border-[#E1E6EF] bg-gray-50/50 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Category</span>
            <span className="font-medium text-gray-900">{CATEGORY_LABELS[dispute.category] || dispute.category}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Booking</span>
            <span className="font-mono text-primary-600">#{dispute.bookingId?.bookingNumber || "N/A"}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Against</span>
            <span className="font-medium text-gray-900">
              {dispute.againstUser?.fullName || "Unknown"}
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#E1E6EF]">
          {[
            { id: "timeline", label: "Timeline", icon: Clock },
            { id: "messages", label: "Messages", icon: MessageSquare, count: dispute.messages?.length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "text-primary-600 border-b-2 border-primary-500"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-xs bg-gray-100">{tab.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === "timeline" ? (
            <div className="p-6 space-y-4">
              {dispute.timeline?.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No timeline events</p>
              ) : (
                dispute.timeline?.map((event, index) => {
                  const Icon = TIMELINE_ICONS[event.action] || CircleDot;
                  return (
                    <div key={event._id} className="flex gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        index === 0 ? "bg-primary-100" : "bg-gray-100"
                      }`}>
                        <Icon className={`w-4 h-4 ${index === 0 ? "text-primary-600" : "text-gray-500"}`} />
                      </div>
                      <div className="flex-1 pb-4">
                        <p className="text-sm font-medium text-gray-900 capitalize">{event.action.replace(/_/g, " ")}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{event.message}</p>
                        <p className="text-xs text-gray-400 mt-1">{formatRelativeTime(event.createdAt)}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            <div className="flex flex-col h-full">
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {dispute.messages?.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No messages yet</p>
                ) : (
                  dispute.messages?.map((msg) => {
                    const isOwnMessage = msg.sender?._id === currentUserId;
                    const isAdmin = msg.senderRole === "admin";
                    return (
                      <div key={msg._id} className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}>
                        <div className="max-w-[80%]">
                          {!isOwnMessage && (
                            <p className="text-xs text-gray-500 mb-1 ml-1">
                              {isAdmin ? "Admin" : (msg.sender?.fullName || "User")}
                            </p>
                          )}
                          <div className={`rounded-2xl px-4 py-2 ${
                            isOwnMessage
                              ? "bg-gradient-to-r from-primary-500 to-[#7C3AED] text-white"
                              : isAdmin
                              ? "bg-primary-50 border border-primary-100 text-gray-900"
                              : "bg-gray-100 text-gray-900"
                          }`}>
                            <p className="text-sm">{msg.content}</p>
                          </div>
                          <p className={`text-[10px] text-gray-400 mt-1 ${isOwnMessage ? "text-right mr-1" : "ml-1"}`}>
                            {formatRelativeTime(msg.createdAt)}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="p-4 border-t border-[#E1E6EF] bg-gray-50">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-2.5 text-sm border border-[#E1E6EF] rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() || isSending}
                    className="px-4 py-2.5 bg-gradient-to-r from-primary-500 to-[#7C3AED] text-white rounded-xl disabled:opacity-50"
                  >
                    {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Resolution Info */}
        {dispute.resolution && (
          <div className="px-6 py-4 border-t border-emerald-200 bg-emerald-50">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span className="font-semibold text-emerald-800">Resolved</span>
            </div>
            <p className="text-sm text-emerald-700">{dispute.resolution.description}</p>
            {dispute.resolution.refundAmount > 0 && (
              <p className="text-sm font-bold text-emerald-800 mt-1">
                Refund: Rs. {dispute.resolution.refundAmount.toLocaleString()}
              </p>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}

// ============================================
// MAIN PAGE COMPONENT
// ============================================

export default function UserDisputesPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 0 });

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);

  const userId = user?._id || user?.id || "";

  const fetchDisputes = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const disputeParams: { status?: string; page?: number; limit?: number } = {
        page: pagination.page,
        limit: 10,
      };
      if (statusFilter) disputeParams.status = statusFilter;
      const response = await disputeService.getMyDisputes(disputeParams);
      if (response.success && response.data) {
        setDisputes(response.data.disputes);
        setPagination(response.data.pagination);
      }
    } catch (err) {
      setError("Failed to load disputes");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, pagination.page]);

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      router.push("/login");
      return;
    }
    setUser(currentUser);
  }, [router]);

  useEffect(() => {
    if (user) {
      fetchDisputes();
    }
  }, [user, fetchDisputes]);

  // Filter disputes by search query (client-side)
  const filteredDisputes = disputes.filter((dispute) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      dispute.ticketNumber?.toLowerCase().includes(query) ||
      dispute.subject?.toLowerCase().includes(query) ||
      dispute.description?.toLowerCase().includes(query) ||
      dispute.bookingId?.bookingNumber?.toLowerCase().includes(query)
    );
  });

  const hasFilters = !!searchQuery || !!statusFilter;

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("");
    setPagination((p) => ({ ...p, page: 1 }));
  };

  // Status counts for quick filters
  const statusCounts = disputes.reduce((acc, d) => {
    acc[d.status] = (acc[d.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const dashboardPath = user?.role === "caregiver" ? "/dashboard/caregiver" : "/dashboard/careseeker";

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F0F5FF] via-white to-[#F8F5FF]">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-xl border-b border-[#E1E6EF]/60 sticky top-0 z-30 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs text-gray-400 mb-3">
            <Link href={dashboardPath} className="hover:text-[#4461F2] flex items-center gap-1 transition-colors">
              <LayoutDashboard className="w-3 h-3" />
              Dashboard
            </Link>
            <span>/</span>
            <span className="text-gray-600 font-medium">Disputes</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href={dashboardPath} className="p-2 text-gray-400 hover:text-[#4461F2] hover:bg-[#4461F2]/5 rounded-xl transition-all">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#4461F2] to-[#7C3AED] flex items-center justify-center shadow-lg shadow-[#4461F2]/25">
                <Scale className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-extrabold text-gray-900">Dispute Resolution</h1>
                <p className="text-sm text-gray-500">Report issues and track resolutions transparently</p>
              </div>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-[#4461F2] to-[#7C3AED] rounded-xl hover:shadow-lg hover:shadow-[#4461F2]/30 transition-all hover:-translate-y-0.5"
            >
              <Plus className="w-4 h-4" />
              Report Dispute
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Total Cases", value: pagination.total, color: "text-slate-700", bg: "bg-slate-50", border: "border-slate-200", icon: FileText },
            { label: "Open", value: statusCounts.open || 0, color: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200", icon: CircleDot },
            { label: "Investigating", value: statusCounts.investigating || 0, color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200", icon: Eye },
            { label: "Resolved", value: statusCounts.resolved || 0, color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200", icon: CheckCircle2 },
          ].map((stat, i) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`bg-white rounded-2xl border ${stat.border} p-4 hover:shadow-md transition-shadow`}
              >
                <div className={`w-9 h-9 rounded-xl ${stat.bg} flex items-center justify-center mb-3`}>
                  <Icon className={`w-4 h-4 ${stat.color}`} />
                </div>
                <p className="text-2xl font-extrabold text-gray-900">{stat.value}</p>
                <p className={`text-xs font-semibold mt-1 ${stat.color}`}>{stat.label}</p>
              </motion.div>
            );
          })}
        </div>

        {/* Search & Filters */}
        <div className="bg-white rounded-xl border border-[#E1E6EF] p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by ticket, subject, or booking..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-sm border border-[#E1E6EF] rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all"
              />
            </div>

            {/* Status Filter */}
            <div className="relative">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-50 border border-[#E1E6EF] rounded-xl hover:bg-gray-100 transition-colors"
              >
                <Filter className="w-4 h-4" />
                {statusFilter ? STATUS_CONFIG[statusFilter]?.label : "All Status"}
                <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? "rotate-180" : ""}`} />
              </button>

              <AnimatePresence>
                {showFilters && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-[#E1E6EF] p-2 z-20"
                  >
                    <button
                      onClick={() => { setStatusFilter(""); setShowFilters(false); }}
                      className={`w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-gray-50 ${!statusFilter ? "bg-primary-50 text-primary-700" : ""}`}
                    >
                      All Status
                    </button>
                    {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                      <button
                        key={key}
                        onClick={() => { setStatusFilter(key); setShowFilters(false); setPagination(p => ({ ...p, page: 1 })); }}
                        className={`w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-gray-50 flex items-center gap-2 ${statusFilter === key ? "bg-primary-50 text-primary-700" : ""}`}
                      >
                        <config.icon className="w-4 h-4" />
                        {config.label}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Refresh */}
            <button
              onClick={fetchDisputes}
              disabled={isLoading}
              className="p-2.5 text-gray-500 hover:text-primary-500 hover:bg-primary-50 rounded-xl transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 ${isLoading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-3"
            >
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p className="text-sm">{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
          </div>
        ) : filteredDisputes.length === 0 ? (
          <EmptyState hasFilters={hasFilters} onClear={clearFilters} onCreate={() => setShowCreateModal(true)} />
        ) : (
          <>
            {/* Disputes Grid */}
            <div className="grid gap-4 md:grid-cols-2">
              {filteredDisputes.map((dispute) => (
                <DisputeCard
                  key={dispute._id}
                  dispute={dispute}
                  onClick={() => setSelectedDispute(dispute)}
                />
              ))}
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <button
                  onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
                  disabled={pagination.page <= 1}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-[#E1E6EF] rounded-xl hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-600">
                  Page {pagination.page} of {pagination.pages}
                </span>
                <button
                  onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
                  disabled={pagination.page >= pagination.pages}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-[#E1E6EF] rounded-xl hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* Create Dispute Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <CreateDisputeModal
            onClose={() => setShowCreateModal(false)}
            onSuccess={(newDispute) => {
              setDisputes((prev) => [newDispute, ...prev]);
              setPagination((p) => ({ ...p, total: p.total + 1 }));
            }}
          />
        )}
      </AnimatePresence>

      {/* Dispute Detail Drawer */}
      <AnimatePresence>
        {selectedDispute && (
          <DisputeDetailDrawer
            dispute={selectedDispute}
            currentUserId={userId}
            onClose={() => setSelectedDispute(null)}
            onUpdate={(updated) => {
              setSelectedDispute(updated);
              setDisputes((prev) =>
                prev.map((d) => (d._id === updated._id ? updated : d))
              );
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
