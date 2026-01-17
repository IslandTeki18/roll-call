/**
 * Action Events Cache Layer
 *
 * In-memory cache for Contact Score calculations to reduce database queries.
 * Similar pattern to rhs.cache.ts for consistency.
 *
 * Cache Strategy:
 * - 5-minute TTL (time-to-live)
 * - Max 500 entries (evicts oldest 20% when full)
 * - Invalidates on new action events
 */

import type { ContactScore } from '../types/contactScore.types';

interface CachedContactScore {
  score: ContactScore;
  cachedAt: number;
}

// In-memory cache for Contact Score calculations
const scoreCache = new Map<string, CachedContactScore>();

// Cache TTL: 5 minutes (in milliseconds)
const CACHE_TTL_MS = 5 * 60 * 1000;

// Maximum cache size to prevent memory issues
const MAX_CACHE_SIZE = 500;

/**
 * Get cache key for a contact's score
 */
const getCacheKey = (userId: string, contactId: string): string => {
  return `${userId}:${contactId}`;
};

/**
 * Check if cached score is still valid
 */
const isCacheValid = (cached: CachedContactScore): boolean => {
  const now = Date.now();
  const age = now - cached.cachedAt;

  // Cache expired
  if (age > CACHE_TTL_MS) {
    return false;
  }

  return true;
};

/**
 * Get cached Contact Score
 * Returns cached value if valid, otherwise returns null
 */
export const getCachedScore = (
  userId: string,
  contactId: string
): ContactScore | null => {
  const cacheKey = getCacheKey(userId, contactId);
  const cached = scoreCache.get(cacheKey);

  // Return cached value if valid
  if (cached && isCacheValid(cached)) {
    return cached.score;
  }

  // Cache miss or expired
  scoreCache.delete(cacheKey);
  return null;
};

/**
 * Store Contact Score in cache
 */
export const setCachedScore = (
  userId: string,
  contactId: string,
  score: ContactScore
): void => {
  const cacheKey = getCacheKey(userId, contactId);

  scoreCache.set(cacheKey, {
    score,
    cachedAt: Date.now(),
  });

  // Evict old entries if cache is too large
  if (scoreCache.size > MAX_CACHE_SIZE) {
    evictOldestEntries();
  }
};

/**
 * Invalidate cache for a specific contact
 * Call this when contact has a new action event
 */
export const invalidateContactScore = (
  userId: string,
  contactId: string
): void => {
  const cacheKey = getCacheKey(userId, contactId);
  scoreCache.delete(cacheKey);
};

/**
 * Invalidate all scores for a user
 */
export const invalidateUserScores = (userId: string): void => {
  const keysToDelete: string[] = [];

  for (const key of scoreCache.keys()) {
    if (key.startsWith(`${userId}:`)) {
      keysToDelete.push(key);
    }
  }

  keysToDelete.forEach((key) => scoreCache.delete(key));
};

/**
 * Clear entire score cache
 */
export const clearScoreCache = (): void => {
  scoreCache.clear();
};

/**
 * Evict oldest 20% of cache entries
 */
const evictOldestEntries = (): void => {
  const entries = Array.from(scoreCache.entries());

  // Sort by cachedAt timestamp (oldest first)
  entries.sort((a, b) => a[1].cachedAt - b[1].cachedAt);

  // Remove oldest 20%
  const removeCount = Math.floor(entries.length * 0.2);
  for (let i = 0; i < removeCount; i++) {
    scoreCache.delete(entries[i][0]);
  }
};

/**
 * Get cache statistics (for debugging)
 */
export const getScoreCacheStats = () => {
  const now = Date.now();
  let validCount = 0;
  let expiredCount = 0;

  for (const [_, cached] of scoreCache.entries()) {
    const age = now - cached.cachedAt;
    if (age > CACHE_TTL_MS) {
      expiredCount++;
    } else {
      validCount++;
    }
  }

  return {
    totalEntries: scoreCache.size,
    validEntries: validCount,
    expiredEntries: expiredCount,
    maxSize: MAX_CACHE_SIZE,
    ttlMinutes: CACHE_TTL_MS / (60 * 1000),
  };
};
