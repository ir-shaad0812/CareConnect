// ============================================
// VIEW TOGGLE COMPONENT
// Grid/List view toggle for caregiver discovery
// ============================================

"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { LayoutGrid, List, Map } from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────
export type ViewMode = "grid" | "list" | "map";

interface ViewToggleProps {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
  showMap?: boolean;
  className?: string;
}

// ─── Main Component ────────────────────────────────────────────────
export const ViewToggle = memo(function ViewToggle({
  value,
  onChange,
  showMap = false,
  className,
}: ViewToggleProps) {
  const options: { value: ViewMode; icon: typeof LayoutGrid; label: string }[] = [
    { value: "grid", icon: LayoutGrid, label: "Grid" },
    { value: "list", icon: List, label: "List" },
    ...(showMap ? [{ value: "map" as ViewMode, icon: Map, label: "Map" }] : []),
  ];

  return (
    <div
      className={cn(
        "inline-flex items-center p-1 bg-gray-100 rounded-xl",
        className
      )}
    >
      {options.map((option) => {
        const Icon = option.icon;
        const isActive = value === option.value;

        return (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className={cn(
              "relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
              isActive
                ? "text-gray-900"
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            {isActive && (
              <motion.div
                layoutId="view-toggle-active"
                className="absolute inset-0 bg-white rounded-lg shadow-sm"
                initial={false}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            )}
            <span className="relative flex items-center gap-1.5">
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{option.label}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
});

export default ViewToggle;
