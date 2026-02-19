// ============================================
// USER CACHE UTILITY
// In-memory short-TTL cache to reduce DB hits
// in the authenticate middleware.
// ============================================

const cache = new Map();
const TTL_MS = 60_000; // 1 minute

/**
 * Retrieve a cached user document.
 * Returns null if not found or expired.
 */
export function getCachedUser(userId) {
  const key = userId.toString();
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.user;
}

/**
 * Store a user document in the cache.
 */
export function setCachedUser(userId, user) {
  cache.set(userId.toString(), {
    user,
    expiresAt: Date.now() + TTL_MS,
  });
}

/**
 * Remove a user from the cache immediately.
 * Call this on status change, password change, logout.
 */
export function invalidateCachedUser(userId) {
  cache.delete(userId.toString());
}

// Periodic cleanup to prevent unbounded growth (runs every 5 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of cache.entries()) {
    if (now > entry.expiresAt) {
      cache.delete(key);
    }
  }
}, 5 * 60_000);
