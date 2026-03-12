"use client";

import { useIsOnline } from "@/hooks/useOnlineStatus";
import { cn } from "@/lib/utils";

interface OnlineStatusBadgeProps {
  userId: string | undefined | null;
  /** Where to anchor the dot relative to the avatar/parent */
  position?: "bottom-right" | "bottom-left" | "top-right" | "top-left";
  size?: "xs" | "sm" | "md";
  /** Show "Online" / "Offline" text label next to the dot */
  showLabel?: boolean;
  className?: string;
}

const POSITION_CLASSES: Record<NonNullable<OnlineStatusBadgeProps["position"]>, string> = {
  "bottom-right": "bottom-0 right-0 translate-x-0.5 translate-y-0.5",
  "bottom-left": "bottom-0 left-0 -translate-x-0.5 translate-y-0.5",
  "top-right": "top-0 right-0 translate-x-0.5 -translate-y-0.5",
  "top-left": "top-0 left-0 -translate-x-0.5 -translate-y-0.5",
};

const DOT_SIZE: Record<NonNullable<OnlineStatusBadgeProps["size"]>, string> = {
  xs: "w-2 h-2 border",
  sm: "w-2.5 h-2.5 border-2",
  md: "w-3.5 h-3.5 border-2",
};

/**
 * OnlineStatusBadge — renders a green/gray dot (+ optional label)
 * driven by real-time socket presence events.
 *
 * Usage (avatar overlay):
 *   <div className="relative">
 *     <Avatar ... />
 *     <OnlineStatusBadge userId={user._id} position="bottom-right" size="sm" />
 *   </div>
 *
 * Usage (inline label):
 *   <OnlineStatusBadge userId={user._id} showLabel />
 */
export function OnlineStatusBadge({
  userId,
  position = "bottom-right",
  size = "sm",
  showLabel = false,
  className,
}: OnlineStatusBadgeProps) {
  const isOnline = useIsOnline(userId);

  if (showLabel) {
    return (
      <span className={cn("inline-flex items-center gap-1.5", className)}>
        <span
          className={cn(
            "rounded-full shrink-0",
            DOT_SIZE[size],
            isOnline
              ? "bg-green-500 border-white shadow-sm shadow-green-300"
              : "bg-gray-300 border-white",
          )}
        />
        <span
          className={cn(
            "text-xs font-medium",
            isOnline ? "text-green-600" : "text-gray-400",
          )}
        >
          {isOnline ? "Online" : "Offline"}
        </span>
      </span>
    );
  }

  return (
    <span
      title={isOnline ? "Online" : "Offline"}
      className={cn(
        "absolute rounded-full border-white shrink-0 pointer-events-none",
        DOT_SIZE[size],
        POSITION_CLASSES[position],
        isOnline
          ? "bg-green-500 border-white shadow-sm shadow-green-300"
          : "bg-gray-300 border-white",
        className,
      )}
    />
  );
}

/** Standalone dot — no absolute positioning, for use in lists/cards */
export function OnlineDot({
  userId,
  size = "sm",
  className,
}: {
  userId: string | undefined | null;
  size?: OnlineStatusBadgeProps["size"];
  className?: string;
}) {
  const isOnline = useIsOnline(userId);
  return (
    <span
      title={isOnline ? "Online" : "Offline"}
      className={cn(
        "inline-block rounded-full shrink-0",
        DOT_SIZE[size],
        isOnline ? "bg-green-500" : "bg-gray-300",
        className,
      )}
    />
  );
}
