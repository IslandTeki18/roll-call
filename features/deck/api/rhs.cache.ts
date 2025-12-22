import { ProfileContact } from "@/features/contacts/api/contacts.service";
import { calculateRHS } from "./rhs.service";
import { RHSFactors, RHSConfig } from "../types/rhs.types";

interface CachedRHS {
  factors: RHSFactors;
  cachedAt: number;
  contactLastEngagement: string | null;
}

// In-memory cache for RHS calculations
const rhsCache = new Map<string, CachedRHS>();

// Cache TTL: 5 minutes (in milliseconds)
const CACHE_TTL_MS = 5 * 60 * 1000;

// Maximum cache size to prevent memory issues
const MAX_CACHE_SIZE = 500;

/**
 * Get cache key for a contact's RHS calculation
 */
const getCacheKey = (userId: string, contactId: string): string => {
  return `${userId}:${contactId}`;
};

/**
 * Check if cached RHS is still valid
 */
const isCacheValid = (cached: CachedRHS, contact: ProfileContact): boolean => {
  const now = Date.now();
  const age = now - cached.cachedAt;

  // Cache expired
  if (age > CACHE_TTL_MS) {
    return false;
  }

  // Contact has new engagement since cache - invalidate
  if (contact.firstEngagementAt && contact.firstEngagementAt !== cached.contactLastEngagement) {
    return false;
  }

  return true;
};

/**
 * Get RHS with caching
 * Returns cached value if valid, otherwise calculates and caches
 */
export const getCachedRHS = async (
  userId: string,
  contact: ProfileContact,
  customConfig?: Partial<RHSConfig>
): Promise<RHSFactors> => {
  const cacheKey = getCacheKey(userId, contact.$id);
  const cached = rhsCache.get(cacheKey);

  // Return cached value if valid
  if (cached && isCacheValid(cached, contact)) {
    return cached.factors;
  }

  // Calculate fresh RHS
  const factors = await calculateRHS(userId, contact, customConfig);

  // Store in cache
  rhsCache.set(cacheKey, {
    factors,
    cachedAt: Date.now(),
    contactLastEngagement: contact.firstEngagementAt || null,
  });

  // Evict old entries if cache is too large
  if (rhsCache.size > MAX_CACHE_SIZE) {
    evictOldestEntries();
  }

  return factors;
};

/**
 * Invalidate cache for a specific contact
 * Call this when contact has a new engagement
 */
export const invalidateContactRHS = (userId: string, contactId: string): void => {
  const cacheKey = getCacheKey(userId, contactId);
  rhsCache.delete(cacheKey);
};

/**
 * Invalidate all RHS cache for a user
 */
export const invalidateUserRHS = (userId: string): void => {
  const keysToDelete: string[] = [];

  for (const key of rhsCache.keys()) {
    if (key.startsWith(`${userId}:`)) {
      keysToDelete.push(key);
    }
  }

  keysToDelete.forEach(key => rhsCache.delete(key));
};

/**
 * Clear entire RHS cache
 */
export const clearRHSCache = (): void => {
  rhsCache.clear();
};

/**
 * Evict oldest 20% of cache entries
 */
const evictOldestEntries = (): void => {
  const entries = Array.from(rhsCache.entries());

  // Sort by cachedAt timestamp (oldest first)
  entries.sort((a, b) => a[1].cachedAt - b[1].cachedAt);

  // Remove oldest 20%
  const removeCount = Math.floor(entries.length * 0.2);
  for (let i = 0; i < removeCount; i++) {
    rhsCache.delete(entries[i][0]);
  }
};

/**
 * Get cache statistics (for debugging)
 */
export const getRHSCacheStats = () => {
  const now = Date.now();
  let validCount = 0;
  let expiredCount = 0;

  for (const [_, cached] of rhsCache.entries()) {
    const age = now - cached.cachedAt;
    if (age > CACHE_TTL_MS) {
      expiredCount++;
    } else {
      validCount++;
    }
  }

  return {
    totalEntries: rhsCache.size,
    validEntries: validCount,
    expiredEntries: expiredCount,
    maxSize: MAX_CACHE_SIZE,
    ttlMinutes: CACHE_TTL_MS / (60 * 1000),
  };
};
