// ============================================
// VIEW TOGGLE COMPONENT
// Toggle between grid and list views
// ============================================

"use client";

import { cn } from "@/lib/utils";
import { LayoutGrid, List } from "lucide-react";

interface ViewToggleProps {
  view: "grid" | "list";
  onViewChange: (view: "grid" | "list") => void;
  className?: string;
}

export default function ViewToggle({ view, onViewChange, className }: ViewToggleProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center p-1 bg-gray-100 dark:bg-gray-800 rounded-xl",
        className
      )}
    >
      <button
        onClick={() => onViewChange("grid")}
        className={cn(
          "flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200",
          view === "grid"
            ? "bg-white dark:bg-gray-700 text-[#39B54A] shadow-sm font-medium"
            : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
        )}
        aria-pressed={view === "grid"}
        aria-label="Grid view"
      >
        <LayoutGrid className="w-4 h-4" />
        <span className="text-sm">Grid</span>
      </button>
      <button
        onClick={() => onViewChange("list")}
        className={cn(
          "flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200",
          view === "list"
            ? "bg-white dark:bg-gray-700 text-[#39B54A] shadow-sm font-medium"
            : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
        )}
        aria-pressed={view === "list"}
        aria-label="List view"
      >
        <List className="w-4 h-4" />
        <span className="text-sm">List</span>
      </button>
    </div>
  );
}
