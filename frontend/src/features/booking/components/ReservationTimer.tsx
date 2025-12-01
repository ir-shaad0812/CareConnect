"use client";

import { useState, useEffect, useCallback } from "react";
import { Clock, AlertTriangle, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ReservationTimerProps {
  expiresAt: string;
  onExpired: () => void;
  onExtend?: () => Promise<void>;
  canExtend?: boolean;
  extensionsUsed?: number;
  maxExtensions?: number;
}

export function ReservationTimer({
  expiresAt,
  onExpired,
  onExtend,
  canExtend = true,
  extensionsUsed = 0,
  maxExtensions = 2,
}: ReservationTimerProps) {
  const [remaining, setRemaining] = useState(0);
  const [isWarning, setIsWarning] = useState(false);
  const [isCritical, setIsCritical] = useState(false);
  const [isExtending, setIsExtending] = useState(false);
  const [hasExpired, setHasExpired] = useState(false);

  const WARNING_THRESHOLD = 120; // 2 minutes
  const CRITICAL_THRESHOLD = 60; // 1 minute

  useEffect(() => {
    const calculateRemaining = () => {
      const now = new Date().getTime();
      const expiry = new Date(expiresAt).getTime();
      return Math.max(0, Math.floor((expiry - now) / 1000));
    };

    // Initial calculation
    setRemaining(calculateRemaining());

    const timer = setInterval(() => {
      const diff = calculateRemaining();
      setRemaining(diff);
      setIsWarning(diff <= WARNING_THRESHOLD && diff > CRITICAL_THRESHOLD);
      setIsCritical(diff <= CRITICAL_THRESHOLD && diff > 0);

      if (diff === 0 && !hasExpired) {
        setHasExpired(true);
        clearInterval(timer);
        onExpired();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [expiresAt, onExpired, hasExpired]);

  const handleExtend = useCallback(async () => {
    if (!onExtend || isExtending) return;

    setIsExtending(true);
    try {
      await onExtend();
    } catch (error) {
      console.error("Failed to extend reservation:", error);
    } finally {
      setIsExtending(false);
    }
  }, [onExtend, isExtending]);

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;

  const canExtendNow = canExtend && extensionsUsed < maxExtensions && (isWarning || isCritical);

  if (hasExpired) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex items-center gap-3 p-4 rounded-xl bg-red-50 border border-red-200"
      >
        <AlertTriangle className="w-5 h-5 text-red-500" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-red-700">
            Reservation Expired
          </p>
          <p className="text-xs text-red-600">
            The time slot is no longer held. Please create a new booking.
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className={`flex items-center gap-3 p-4 rounded-xl transition-colors duration-300 ${
        isCritical
          ? "bg-red-50 border border-red-300"
          : isWarning
          ? "bg-amber-50 border border-amber-200"
          : "bg-blue-50 border border-blue-200"
      }`}
      animate={isCritical ? { scale: [1, 1.02, 1] } : {}}
      transition={{ repeat: isCritical ? Infinity : 0, duration: 1 }}
    >
      <div
        className={`p-2 rounded-full ${
          isCritical
            ? "bg-red-100"
            : isWarning
            ? "bg-amber-100"
            : "bg-blue-100"
        }`}
      >
        {isCritical ? (
          <AlertTriangle
            className={`w-5 h-5 ${
              isCritical ? "text-red-500" : "text-amber-500"
            }`}
          />
        ) : (
          <Clock
            className={`w-5 h-5 ${
              isWarning ? "text-amber-500" : "text-blue-500"
            }`}
          />
        )}
      </div>

      <div className="flex-1">
        <div className="flex items-center gap-2">
          <p
            className={`text-sm font-semibold ${
              isCritical
                ? "text-red-700"
                : isWarning
                ? "text-amber-700"
                : "text-blue-700"
            }`}
          >
            Reservation expires in
          </p>
          <span
            className={`text-lg font-mono font-bold ${
              isCritical
                ? "text-red-600"
                : isWarning
                ? "text-amber-600"
                : "text-blue-600"
            }`}
          >
            {minutes}:{seconds.toString().padStart(2, "0")}
          </span>
        </div>
        <p
          className={`text-xs ${
            isCritical
              ? "text-red-600"
              : isWarning
              ? "text-amber-600"
              : "text-blue-600"
          }`}
        >
          {isCritical
            ? "Hurry! Complete your booking before time runs out"
            : isWarning
            ? "Time is running low. Please complete your booking soon"
            : "Complete your booking to confirm the time slot"}
        </p>
      </div>

      <AnimatePresence>
        {canExtendNow && onExtend && (
          <motion.button
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            onClick={handleExtend}
            disabled={isExtending}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              isCritical
                ? "bg-red-100 text-red-700 hover:bg-red-200"
                : "bg-amber-100 text-amber-700 hover:bg-amber-200"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <RefreshCw
              className={`w-4 h-4 ${isExtending ? "animate-spin" : ""}`}
            />
            {isExtending ? "Extending..." : "Extend"}
          </motion.button>
        )}
      </AnimatePresence>

      {extensionsUsed > 0 && (
        <div className="text-xs text-gray-500">
          {extensionsUsed}/{maxExtensions} extensions used
        </div>
      )}
    </motion.div>
  );
}

export default ReservationTimer;
