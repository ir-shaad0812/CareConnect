// ============================================
// SIMPLE IN-MEMORY CACHE
// Per-user cache for dashboard responses
// ============================================

class MemoryCache {
  constructor() {
    this.store = new Map();
    // Cleanup expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  /**
   * Get a cached value
   * @param {string} key
   * @returns {*} cached value or undefined
   */
  get(key) {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  /**
   * Set a cached value with TTL in seconds
   * @param {string} key
   * @param {*} value
   * @param {number} ttlSeconds - time to live in seconds (default: 60)
   */
  set(key, value, ttlSeconds = 60) {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  /**
   * Invalidate a specific key
   */
  del(key) {
    this.store.delete(key);
  }

  /**
   * Invalidate all keys matching a prefix
   */
  invalidatePrefix(prefix) {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Remove all expired entries
   */
  cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Clear all entries
   */
  clear() {
    this.store.clear();
  }
}

export const dashboardCache = new MemoryCache();
