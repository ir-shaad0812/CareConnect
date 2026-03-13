"use client";

import { useProfileCompletion } from "@/hooks/useProfileCompletion";
import { cn } from "@/lib/utils";

interface ProfileCompletionBarProps {
  /** Override percentage (for non-self profiles). If omitted, reads from socket/AuthContext. */
  pct?: number;
  showLabel?: boolean;
  size?: "sm" | "md";
  className?: string;
}

function getColor(pct: number) {
  if (pct >= 80) return "bg-green-500";
  if (pct >= 50) return "bg-amber-400";
  return "bg-red-400";
}

/**
 * ProfileCompletionBar — real-time profile % bar.
 *
 * Usage (self — reads live from socket):
 *   <ProfileCompletionBar showLabel />
 *
 * Usage (other user — pass pct directly):
 *   <ProfileCompletionBar pct={caregiver.completionPercentage} showLabel />
 */
export function ProfileCompletionBar({
  pct: externalPct,
  showLabel = true,
  size = "md",
  className,
}: ProfileCompletionBarProps) {
  const socketPct = useProfileCompletion();
  const pct = externalPct !== undefined ? externalPct : socketPct;

  return (
    <div className={cn("space-y-1", className)}>
      {showLabel && (
        <div className="flex items-center justify-between text-xs font-medium">
          <span className="text-gray-500">Profile completion</span>
          <span
            className={cn(
              "font-semibold",
              pct >= 80 ? "text-green-600" : pct >= 50 ? "text-amber-500" : "text-red-500",
            )}
          >
            {pct}%
          </span>
        </div>
      )}
      <div
        className={cn(
          "w-full rounded-full bg-gray-100 overflow-hidden",
          size === "sm" ? "h-1.5" : "h-2",
        )}
      >
        <div
          className={cn(
            "h-full rounded-full transition-all duration-700 ease-out",
            getColor(pct),
          )}
          style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
        />
      </div>
    </div>
  );
}
