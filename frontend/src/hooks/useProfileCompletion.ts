"use client";

import { useSocketContext } from "@/context/SocketContext";
import { useAuthContext } from "@/context/AuthContext";

/**
 * useProfileCompletion — returns the current user's profile completion %.
 *
 * Prefers the real-time socket value (updated after every profile save)
 * and falls back to the stored user value from AuthContext.
 */
export function useProfileCompletion(): number {
  const { profileCompletionPct } = useSocketContext();
  const { user } = useAuthContext();

  if (profileCompletionPct !== null) return profileCompletionPct;
  return (user as unknown as { completionPercentage?: number })?.completionPercentage ?? 0;
}
