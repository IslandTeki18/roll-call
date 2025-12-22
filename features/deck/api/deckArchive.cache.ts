/**
 * Cache for tracking when deck archiving was last performed
 * Prevents excessive archiving operations
 */

interface ArchiveCache {
  userId: string;
  lastArchiveDate: string; // ISO date string (YYYY-MM-DD)
  lastArchiveTimestamp: number;
}

// In-memory cache for archive operations
const archiveCache = new Map<string, ArchiveCache>();

/**
 * Check if archiving should be performed for a user today
 * Returns true if archiving hasn't been done today
 */
export const shouldArchiveToday = (userId: string): boolean => {
  const today = new Date().toISOString().split("T")[0];
  const cached = archiveCache.get(userId);

  // No cache entry or last archive was on a different day
  if (!cached || cached.lastArchiveDate !== today) {
    return true;
  }

  return false;
};

/**
 * Mark archiving as completed for today
 */
export const markArchiveCompleted = (userId: string): void => {
  const today = new Date().toISOString().split("T")[0];

  archiveCache.set(userId, {
    userId,
    lastArchiveDate: today,
    lastArchiveTimestamp: Date.now(),
  });
};

/**
 * Force reset archive cache for a user
 * Useful for testing or manual operations
 */
export const resetArchiveCache = (userId: string): void => {
  archiveCache.delete(userId);
};

/**
 * Clear all archive cache
 */
export const clearArchiveCache = (): void => {
  archiveCache.clear();
};

/**
 * Get archive cache stats for debugging
 */
export const getArchiveCacheStats = () => {
  const stats = Array.from(archiveCache.values()).map(cache => ({
    userId: cache.userId,
    lastArchiveDate: cache.lastArchiveDate,
    hoursAgo: (Date.now() - cache.lastArchiveTimestamp) / (1000 * 60 * 60),
  }));

  return {
    totalUsers: archiveCache.size,
    entries: stats,
  };
};
