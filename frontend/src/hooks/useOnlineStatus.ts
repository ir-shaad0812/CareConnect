"use client";

import { useEffect, useState, useCallback } from "react";
import { useSocketContext } from "@/context/SocketContext";

/**
 * useOnlineStatus — real-time online/offline tracking for one or more user IDs.
 *
 * Uses the SocketContext's onlineUsers Set (updated via USER_ONLINE / USER_OFFLINE
 * socket events) and fires GET_ONLINE_USERS on mount to hydrate initial state.
 */
export function useOnlineStatus(userIds: string | string[]): Map<string, boolean> {
  const { onlineUsers, checkOnlineStatus, isConnected } = useSocketContext();
  const ids = Array.isArray(userIds) ? userIds : [userIds];

  const [statusMap, setStatusMap] = useState<Map<string, boolean>>(() => {
    const m = new Map<string, boolean>();
    ids.forEach((id) => m.set(id, onlineUsers.has(id)));
    return m;
  });

  // Recompute whenever the global onlineUsers Set or ids change
  useEffect(() => {
    const m = new Map<string, boolean>();
    ids.forEach((id) => m.set(id, onlineUsers.has(id)));
    setStatusMap(m);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onlineUsers, userIds]);

  // Hydrate on connect / reconnect
  const hydrate = useCallback(() => {
    if (ids.length > 0) checkOnlineStatus(ids);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkOnlineStatus, userIds]);

  useEffect(() => {
    if (isConnected) hydrate();
  }, [isConnected, hydrate]);

  return statusMap;
}

/** Convenience single-user overload — returns boolean directly */
export function useIsOnline(userId: string | undefined | null): boolean {
  const { onlineUsers, checkOnlineStatus, isConnected } = useSocketContext();
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    if (!userId) { setIsOnline(false); return; }
    setIsOnline(onlineUsers.has(userId));
  }, [onlineUsers, userId]);

  useEffect(() => {
    if (isConnected && userId) checkOnlineStatus([userId]);
  }, [isConnected, userId, checkOnlineStatus]);

  return isOnline;
}
