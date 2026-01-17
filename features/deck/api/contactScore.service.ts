/**
 * Contact Score Service
 *
 * Calculates Contact Score from action events within a 90-day rolling window.
 * Replaces RHS (Relationship Health Score) system with more sophisticated scoring.
 *
 * Score Calculation:
 * 1. Sum all finalPoints from action events (includes multipliers)
 * 2. Apply time decay (exponential decay after 14 days)
 * 3. Apply fatigue guard (penalty if contacted within 3 days)
 * 4. Clamp to 0-100 range
 */

import { ID, Query } from 'react-native-appwrite';
import { tablesDB } from '@/features/shared/lib/appwrite';
import { getActionEventsByContactAndDateRange } from './actionEvents.service';
import {
  getCachedScore,
  setCachedScore,
  invalidateContactScore,
} from './actionEvents.cache';
import {
  calculateScoreBreakdown,
  calculatePeakScore,
} from '../lib/scoreBreakdown';
import { calculateSystemEvents } from './systemEvents.service';
import type { ContactScore, DEFAULT_CONTACT_SCORE_CONFIG } from '../types/contactScore.types';
import type { ProfileContact } from '@/features/contacts/api/contacts.service';

const DATABASE_ID = process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID!;
const CONTACT_SCORES_TABLE_ID = process.env.EXPO_PUBLIC_APPWRITE_CONTACT_SCORES_TABLE_ID!;

/**
 * Get 90 days ago timestamp
 */
function get90DaysAgo(): string {
  const date = new Date();
  date.setDate(date.getDate() - 90);
  return date.toISOString();
}

/**
 * Calculate days since timestamp
 */
function daysSince(timestamp: string): number {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  return Math.floor((now - then) / (1000 * 60 * 60 * 24));
}

/**
 * Apply time decay to score
 * Decay starts at day 14, exponential decay with floor at 25% of peak
 *
 * @param rawScore - Raw score before decay
 * @param lastActionTimestamp - ISO timestamp of last action
 * @returns Decayed score
 */
function applyTimeDecay(rawScore: number, lastActionTimestamp: string): number {
  const daysSinceLastAction = daysSince(lastActionTimestamp);

  // No decay within 14 days
  if (daysSinceLastAction <= 14) {
    return rawScore;
  }

  // Exponential decay after 14 days
  const daysOverdue = daysSinceLastAction - 14;
  const decayRate = 0.01; // 1% per day
  const decayFloor = 0.25; // 25% floor

  // Exponential decay formula: score * (floor + (1 - floor) * e^(-rate * days))
  const decayMultiplier =
    decayFloor + (1 - decayFloor) * Math.exp(-decayRate * daysOverdue);
  const decayedScore = rawScore * decayMultiplier;

  return decayedScore;
}

/**
 * Apply fatigue guard penalty
 * Penalizes if contacted too recently (within 3 days)
 *
 * @param score - Score after decay
 * @param lastActionTimestamp - ISO timestamp of last action
 * @returns Score after fatigue penalty
 */
function applyFatigueGuard(score: number, lastActionTimestamp: string): number {
  const daysSinceLastAction = daysSince(lastActionTimestamp);

  // Fatigue penalty if contacted within 3 days
  if (daysSinceLastAction < 3) {
    const fatiguePenalty = 20;
    return score - fatiguePenalty;
  }

  return score;
}

/**
 * Calculate Contact Score for a contact
 *
 * @param userId - User ID
 * @param contactId - Contact ID
 * @returns Contact Score with breakdown
 */
export async function calculateContactScore(
  userId: string,
  contactId: string
): Promise<ContactScore> {
  // Check cache first
  const cached = getCachedScore(userId, contactId);
  if (cached) {
    return cached;
  }

  // Fetch action events within 90-day window
  const startDate = get90DaysAgo();
  const endDate = new Date().toISOString();
  const events = await getActionEventsByContactAndDateRange(
    userId,
    contactId,
    startDate,
    endDate,
    1000 // Max 1000 events
  );

  // Calculate base score (sum of finalPoints)
  let rawScore = events.reduce((sum, event) => sum + event.finalPoints, 0);

  // Calculate breakdown
  const breakdown = calculateScoreBreakdown(events);

  // Calculate peak score
  const peakScore = calculatePeakScore(events);

  // Get last action timestamp
  const lastActionTimestamp =
    events.length > 0 ? events[0].timestamp : new Date().toISOString();

  // Apply time decay
  const decayedScore = applyTimeDecay(rawScore, lastActionTimestamp);
  const decayPenalty = rawScore - decayedScore;

  // Apply fatigue guard
  const finalScore = applyFatigueGuard(decayedScore, lastActionTimestamp);

  // Clamp to 0-100
  const currentScore = Math.max(0, Math.min(100, finalScore));

  // Count positive and negative actions
  const positiveActions = events.filter((e) => e.finalPoints > 0).length;
  const negativeActions = events.filter((e) => e.finalPoints < 0).length;

  // Determine when decay started
  const decayStartedAt =
    daysSince(lastActionTimestamp) > 14 ? lastActionTimestamp : null;

  // Build ContactScore object
  const score: ContactScore = {
    $id: '', // Will be set when persisted
    userId,
    contactId,
    currentScore,
    peakScore,
    lastActionTimestamp,
    lastUpdated: new Date().toISOString(),
    decayStartedAt,
    totalActions: events.length,
    positiveActions,
    negativeActions,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Cache the result
  setCachedScore(userId, contactId, score);

  return score;
}

/**
 * Recalculate and persist Contact Score in background (non-blocking)
 *
 * Called after action events are emitted to keep scores up-to-date.
 * Also calculates and emits system events (H/K/L categories).
 *
 * @param userId - User ID
 * @param contactId - Contact ID
 * @param contact - Optional contact object (for system event calculations)
 */
export async function recalculateContactScoreBackground(
  userId: string,
  contactId: string,
  contact?: ProfileContact
): Promise<void> {
  try {
    // Invalidate cache to force fresh calculation
    invalidateContactScore(userId, contactId);

    // Calculate fresh score
    const score = await calculateContactScore(userId, contactId);

    // Upsert to ContactScores table
    await upsertContactScore(userId, contactId, score);

    // Calculate and emit system events (if contact object provided)
    if (contact) {
      const startDate = get90DaysAgo();
      const endDate = new Date().toISOString();
      const events = await getActionEventsByContactAndDateRange(
        userId,
        contactId,
        startDate,
        endDate,
        1000
      );

      // Calculate system events (H/K/L categories)
      await calculateSystemEvents(userId, contactId, contact, events);
    }
  } catch (error) {
    console.error('Failed to recalculate contact score:', error);
    // Don't throw - this is background operation
  }
}

/**
 * Upsert Contact Score to database
 *
 * @param userId - User ID
 * @param contactId - Contact ID
 * @param score - ContactScore object
 */
async function upsertContactScore(
  userId: string,
  contactId: string,
  score: ContactScore
): Promise<void> {
  try {
    // Check if score already exists
    const existing = await getPersistedContactScore(userId, contactId);

    const data = {
      userId,
      contactId,
      currentScore: score.currentScore,
      peakScore: score.peakScore,
      lastActionTimestamp: score.lastActionTimestamp,
      lastUpdated: new Date().toISOString(),
      decayStartedAt: score.decayStartedAt || '',
      totalActions: score.totalActions,
      positiveActions: score.positiveActions,
      negativeActions: score.negativeActions,
      updatedAt: new Date().toISOString(),
    };

    if (existing) {
      // Update existing score
      await tablesDB.updateRow({
        databaseId: DATABASE_ID,
        tableId: CONTACT_SCORES_TABLE_ID,
        rowId: existing.$id,
        data,
      });
    } else {
      // Create new score
      await tablesDB.createRow({
        databaseId: DATABASE_ID,
        tableId: CONTACT_SCORES_TABLE_ID,
        rowId: ID.unique(),
        data: {
          ...data,
          createdAt: new Date().toISOString(),
        },
      });
    }
  } catch (error) {
    console.error('Failed to upsert contact score:', error);
    throw error;
  }
}

/**
 * Get persisted Contact Score from database
 *
 * @param userId - User ID
 * @param contactId - Contact ID
 * @returns ContactScore or null if not found
 */
async function getPersistedContactScore(
  userId: string,
  contactId: string
): Promise<ContactScore | null> {
  try {
    const response = await tablesDB.listRows({
      databaseId: DATABASE_ID,
      tableId: CONTACT_SCORES_TABLE_ID,
      queries: [
        Query.equal('userId', userId),
        Query.equal('contactId', contactId),
        Query.limit(1),
      ],
    });

    return response.rows.length > 0
      ? (response.rows[0] as unknown as ContactScore)
      : null;
  } catch (error) {
    console.error('Failed to get persisted contact score:', error);
    return null;
  }
}

/**
 * Get Contact Scores for multiple contacts (for deck building)
 *
 * @param userId - User ID
 * @param contactIds - Array of contact IDs
 * @returns Map of contactId -> ContactScore
 */
export async function getBulkContactScores(
  userId: string,
  contactIds: string[]
): Promise<Map<string, ContactScore>> {
  const scores = new Map<string, ContactScore>();

  // Calculate scores in parallel (with batching for large sets)
  const batchSize = 10;
  for (let i = 0; i < contactIds.length; i += batchSize) {
    const batch = contactIds.slice(i, i + batchSize);
    const batchScores = await Promise.all(
      batch.map((contactId) => calculateContactScore(userId, contactId))
    );

    batchScores.forEach((score, index) => {
      scores.set(batch[index], score);
    });
  }

  return scores;
}
