// ============================================
// PREMIUM REPORT & BLOCK MODALS
// Safety & moderation UI components
// ============================================

"use client";

import { useState, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Flag,
  AlertTriangle,
  Shield,
  UserX,
  MessageSquareOff,
  CheckCircle,
  Loader2,
} from "lucide-react";

// ============================================
// TYPES
// ============================================

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (reason: string, details: string) => Promise<void>;
  type: "message" | "user";
  targetName?: string;
}

interface BlockConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  userName: string;
}

interface SafetyNoticeProps {
  variant: "blocked" | "reported" | "warning";
  message?: string;
  onAction?: () => void;
  actionLabel?: string;
}

// ============================================
// ANIMATION VARIANTS
// ============================================

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const modalVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: "spring", stiffness: 400, damping: 30 },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 20,
    transition: { duration: 0.15 },
  },
};

// ============================================
// REPORT MODAL COMPONENT
// ============================================

export const ReportModal = memo<ReportModalProps>(({
  isOpen,
  onClose,
  onSubmit,
  type,
  targetName,
}) => {
  const [selectedReason, setSelectedReason] = useState("");
  const [details, setDetails] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const REPORT_REASONS = type === "message"
    ? [
        { id: "spam", label: "Spam or unwanted content" },
        { id: "harassment", label: "Harassment or bullying" },
        { id: "inappropriate", label: "Inappropriate content" },
        { id: "scam", label: "Scam or fraud" },
        { id: "impersonation", label: "Impersonation" },
        { id: "other", label: "Other" },
      ]
    : [
        { id: "harassment", label: "Harassment or bullying" },
        { id: "fake_profile", label: "Fake profile or impersonation" },
        { id: "inappropriate", label: "Inappropriate behavior" },
        { id: "scam", label: "Scam or fraud" },
        { id: "unprofessional", label: "Unprofessional conduct" },
        { id: "safety_concern", label: "Safety concern" },
        { id: "other", label: "Other" },
      ];

  const handleSubmit = async () => {
    if (!selectedReason) return;

    setIsSubmitting(true);
    try {
      await onSubmit(selectedReason, details);
      setSubmitted(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedReason("");
    setDetails("");
    setSubmitted(false);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={handleClose}
        >
          <motion.div
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                  <Flag className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Report {type === "message" ? "Message" : "User"}
                  </h2>
                  {targetName && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {targetName}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={handleClose}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              {submitted ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-8"
                >
                  <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Report Submitted
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    Thank you for helping keep CareConnect safe. Our team will review your report.
                  </p>
                  <button
                    onClick={handleClose}
                    className="px-6 py-2.5 bg-[#39B54A] text-white font-medium rounded-xl hover:bg-[#2d913c] transition-colors"
                  >
                    Done
                  </button>
                </motion.div>
              ) : (
                <>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Why are you reporting this {type}?
                  </p>

                  {/* Reason Selection */}
                  <div className="space-y-2 mb-4">
                    {REPORT_REASONS.map((reason) => (
                      <button
                        key={reason.id}
                        onClick={() => setSelectedReason(reason.id)}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${
                          selectedReason === reason.id
                            ? "border-[#39B54A] bg-[#39B54A]/5 text-[#39B54A]"
                            : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                        }`}
                      >
                        <span className={selectedReason === reason.id ? "font-medium" : "text-gray-700 dark:text-gray-300"}>
                          {reason.label}
                        </span>
                        {selectedReason === reason.id && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="w-5 h-5 bg-[#39B54A] rounded-full flex items-center justify-center"
                          >
                            <CheckCircle className="w-3.5 h-3.5 text-white" />
                          </motion.div>
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Additional Details */}
                  {selectedReason && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                    >
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Additional details (optional)
                      </label>
                      <textarea
                        value={details}
                        onChange={(e) => setDetails(e.target.value)}
                        placeholder="Provide any additional context..."
                        rows={3}
                        className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-800 border-0 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-[#39B54A]/30 focus:outline-none resize-none"
                      />
                    </motion.div>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            {!submitted && (
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                <button
                  onClick={handleClose}
                  className="px-4 py-2.5 text-gray-600 dark:text-gray-400 font-medium hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!selectedReason || isSubmitting}
                  className="px-6 py-2.5 bg-red-500 text-white font-medium rounded-xl hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Submit Report"
                  )}
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

ReportModal.displayName = "ReportModal";

// ============================================
// BLOCK CONFIRM MODAL COMPONENT
// ============================================

export const BlockConfirmModal = memo<BlockConfirmModalProps>(({
  isOpen,
  onClose,
  onConfirm,
  userName,
}) => {
  const [isBlocking, setIsBlocking] = useState(false);

  const handleConfirm = async () => {
    setIsBlocking(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setIsBlocking(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={onClose}
        >
          <motion.div
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <UserX className="w-8 h-8 text-red-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Block {userName}?
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                They won't be able to message you or see your profile. You can unblock them anytime from settings.
              </p>

              <div className="space-y-3">
                <button
                  onClick={handleConfirm}
                  disabled={isBlocking}
                  className="w-full py-3 bg-red-500 text-white font-medium rounded-xl hover:bg-red-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  {isBlocking ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Blocking...
                    </>
                  ) : (
                    "Block User"
                  )}
                </button>
                <button
                  onClick={onClose}
                  className="w-full py-3 text-gray-600 dark:text-gray-400 font-medium hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

BlockConfirmModal.displayName = "BlockConfirmModal";

// ============================================
// SAFETY NOTICE COMPONENT
// ============================================

export const SafetyNotice = memo<SafetyNoticeProps>(({
  variant,
  message,
  onAction,
  actionLabel,
}) => {
  const config = {
    blocked: {
      icon: MessageSquareOff,
      bgColor: "bg-red-50 dark:bg-red-900/10",
      borderColor: "border-red-200 dark:border-red-800",
      iconColor: "text-red-500",
      textColor: "text-red-700 dark:text-red-400",
      defaultMessage: "This user is blocked. You cannot send or receive messages.",
    },
    reported: {
      icon: Shield,
      bgColor: "bg-amber-50 dark:bg-amber-900/10",
      borderColor: "border-amber-200 dark:border-amber-800",
      iconColor: "text-amber-500",
      textColor: "text-amber-700 dark:text-amber-400",
      defaultMessage: "This content has been reported and is under review.",
    },
    warning: {
      icon: AlertTriangle,
      bgColor: "bg-orange-50 dark:bg-orange-900/10",
      borderColor: "border-orange-200 dark:border-orange-800",
      iconColor: "text-orange-500",
      textColor: "text-orange-700 dark:text-orange-400",
      defaultMessage: "Please be cautious when sharing personal information.",
    },
  };

  const { icon: Icon, bgColor, borderColor, iconColor, textColor, defaultMessage } = config[variant];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex items-center gap-3 px-4 py-3 ${bgColor} border ${borderColor} rounded-xl`}
    >
      <Icon className={`w-5 h-5 ${iconColor} shrink-0`} />
      <p className={`text-sm ${textColor} flex-1`}>
        {message || defaultMessage}
      </p>
      {onAction && actionLabel && (
        <button
          onClick={onAction}
          className={`text-sm font-medium ${textColor} hover:underline shrink-0`}
        >
          {actionLabel}
        </button>
      )}
    </motion.div>
  );
});

SafetyNotice.displayName = "SafetyNotice";

export default {
  ReportModal,
  BlockConfirmModal,
  SafetyNotice,
};
