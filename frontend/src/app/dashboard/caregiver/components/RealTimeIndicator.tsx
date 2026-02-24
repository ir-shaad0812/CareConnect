"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface RealTimeIndicatorProps {
  connected: boolean;
  lastEventType?: string;
  compact?: boolean;
}

const EVENT_LABELS: Record<string, string> = {
  "booking:created": "New booking",
  "booking:accepted": "Booking accepted",
  "booking:confirmed": "Booking confirmed",
  "booking:active": "Session started",
  "booking:completed": "Session completed",
  "booking:cancelled": "Booking cancelled",
  "tracking:submitted": "Log submitted",
  "tracking:flagged": "Log flagged",
  "tracking:missed": "Log missed",
  "dispute:created": "Dispute raised",
  "dispute:resolved": "Dispute resolved",
  "notification:created": "New notification",
};

export default function RealTimeIndicator({ connected, lastEventType, compact = false }: RealTimeIndicatorProps) {
  const [flash, setFlash] = useState(false);
  const [displayEvent, setDisplayEvent] = useState<string | null>(null);

  useEffect(() => {
    if (lastEventType) {
      setDisplayEvent(EVENT_LABELS[lastEventType] || "Update received");
      setFlash(true);
      const t1 = setTimeout(() => setFlash(false), 600);
      const t2 = setTimeout(() => setDisplayEvent(null), 3000);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
    return undefined;
  }, [lastEventType]);

  if (compact) {
    return (
      <div className="relative flex items-center justify-center w-5 h-5">
        <motion.div
          animate={connected ? { scale: [1, 1.4, 1], opacity: [0.6, 0.2, 0.6] } : {}}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className={`absolute w-4 h-4 rounded-full ${connected ? "bg-[#39B54A]/20" : "bg-gray-200/0"}`}
        />
        <div className={`w-2 h-2 rounded-full ${connected ? "bg-[#39B54A]" : "bg-gray-400"}`} />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="relative flex items-center justify-center w-5 h-5">
        {connected && (
          <motion.div
            animate={{ scale: [1, 1.6, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="absolute w-4 h-4 rounded-full bg-[#39B54A]/25"
          />
        )}
        <div className={`w-2 h-2 rounded-full ${connected ? "bg-[#39B54A]" : "bg-gray-400"}`} />
      </div>
      <div className="flex flex-col">
        <AnimatePresence mode="wait">
          {flash && displayEvent ? (
            <motion.span
              key="event"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              className="text-[10px] font-medium text-[#39B54A]"
            >
              {displayEvent}
            </motion.span>
          ) : (
            <motion.span
              key="status"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={`text-[10px] font-medium ${connected ? "text-[#39B54A]" : "text-gray-400"}`}
            >
              {connected ? "Live" : "Offline"}
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
