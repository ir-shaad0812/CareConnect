"use client";

import { useState, useEffect } from "react";
import { ArrowUp } from "lucide-react";

interface BackToTopProps {
  size?: number;
  showThreshold?: number;
  bottomOffset?: number;
  rightOffset?: number;
}

function BackToTop({
  size = 56,
  showThreshold = 15,
  bottomOffset = 70,
  rightOffset = 35,
}: BackToTopProps) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const onScroll = () => {
      const scrollTop = window.scrollY;
      const windowHeight = window.innerHeight;
      const scrollable = document.documentElement.scrollHeight - windowHeight;
      const percent = scrollable > 0 ? (scrollTop / scrollable) * 100 : 0;
      setProgress(Math.min(percent, 100));
      const threshold = windowHeight * (showThreshold / 100);
      setVisible(scrollTop > threshold);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [showThreshold, mounted]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (!mounted || !visible) return null;

  const radius = size / 2 - 4.5;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <button
      onClick={scrollToTop}
      aria-label="Back to top"
      style={{
        position: "fixed",
        bottom: `${bottomOffset}px`,
        right: `${rightOffset}px`,
        width: `${size}px`,
        height: `${size}px`,
        zIndex: 50,
      }}
      className="rounded-full flex items-center justify-center bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 transition-all duration-300 shadow-md hover:shadow-lg hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-teal-500"
    >
      <svg
        style={{ position: "absolute", inset: 0 }}
        className="-rotate-90"
        width={size}
        height={size}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(0,0,0,0.08)"
          strokeWidth={2.5}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#14b8a6"
          strokeWidth={2.5}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 150ms" }}
        />
      </svg>
      <ArrowUp
        size={size * 0.4}
        strokeWidth={2.5}
        style={{ position: "relative", zIndex: 10 }}
      />
    </button>
  );
}

export { BackToTop };
export default BackToTop;
