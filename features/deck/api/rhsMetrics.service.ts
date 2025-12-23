/**
 * RHS Metrics Persistence Service
 *
 * Manages the storage and retrieval of RHS (Relationship Health Score) metrics
 * in Appwrite. Provides automatic updates on user interactions.
 */

import { ID, Query } from "react-native-appwrite";
import { tablesDB } from "@/features/shared/lib/appwrite";
import { calculateRHS } from "./rhs.service";
import { invalidateContactRHS } from "./rhs.cache";
import type { ProfileContact } from "@/features/contacts/api/contacts.service";
import type { RHSFactors, RHSConfig } from "../types/rhs.types";
import type {
  RHSMetricsRecord,
  RHSMetricsInput,
  RHSMetricsQuery,
} from "../types/rhsMetrics.types";
import { DEFAULT_RHS_CONFIG } from "../types/rhs.types";

const DATABASE_ID = process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID!;

// NOTE: This table needs to be created in Appwrite
// Environment variable: EXPO_PUBLIC_APPWRITE_RHS_METRICS_TABLE_ID
const RHS_METRICS_TABLE_ID =
  process.env.EXPO_PUBLIC_APPWRITE_RHS_METRICS_TABLE_ID || "rhs_metrics";

/**
 * Convert RHSFactors to RHSMetricsInput
 */
const convertRHSFactorsToInput = (
  userId: string,
  contactId: string,
  factors: RHSFactors,
  config: RHSConfig = DEFAULT_RHS_CONFIG
): RHSMetricsInput => {
  return {
    userId,
    contactId,
    rhsScore: factors.totalScore,
    recencyScore: factors.recencyScore,
    freshnessBoost: factors.freshnessBoost,
    fatigueGuardPenalty: factors.fatigueGuardPenalty,
    cadenceWeight: factors.cadenceWeight,
    engagementQualityBonus: factors.engagementQualityBonus,
    conversationDepthBonus: factors.conversationDepthBonus,
    decayPenalty: factors.decayPenalty,
    cadenceAdherenceScore: factors.cadenceAdherenceScore,
    cadenceConsistencyScore: factors.cadenceConsistencyScore,
    cadenceTrendScore: factors.cadenceTrendScore,
    targetCadenceDays: factors.targetCadenceDays,
    actualAverageInterval: factors.actualAverageInterval,
    daysSinceLastEngagement: factors.daysSinceLastEngagement,
    totalEngagements: factors.totalEngagements,
    positiveOutcomes: factors.positiveOutcomes,
    negativeOutcomes: factors.negativeOutcomes,
    averageEngagementFrequency: factors.averageEngagementFrequency,
    isOverdueByCadence: factors.isOverdueByCadence,
    daysOverdue: factors.daysOverdue,
    decayStartDays: config.decayStartDays,
    currentDecayPenalty: factors.decayPenalty,
    engagementHistoryFactor: calculateEngagementHistoryFactor(
      factors.totalEngagements
    ),
    lastEngagementAt:
      factors.daysSinceLastEngagement !== null
        ? new Date(
            Date.now() - factors.daysSinceLastEngagement * 24 * 60 * 60 * 1000
          ).toISOString()
        : null,
  };
};

/**
 * Calculate engagement history factor (same as rhs.service.ts)
 */
const calculateEngagementHistoryFactor = (totalEngagements: number): number => {
  if (totalEngagements === 0) return 1.0;
  if (totalEngagements >= 10) return 0.6;
  if (totalEngagements >= 5) return 0.8;
  if (totalEngagements >= 1) return 0.9;
  return 1.0;
};

/**
 * Get RHS metrics for a contact from database
 */
export const getRHSMetrics = async (
  userId: string,
  contactId: string
): Promise<RHSMetricsRecord | null> => {
  try {
    const response = await tablesDB.listRows({
      databaseId: DATABASE_ID,
      tableId: RHS_METRICS_TABLE_ID,
      queries: [
        Query.equal("userId", userId),
        Query.equal("contactId", contactId),
        Query.orderDesc("calculatedAt"),
        Query.limit(1),
      ],
    });

    if (response.rows.length === 0) {
      return null;
    }

    return response.rows[0] as unknown as RHSMetricsRecord;
  } catch (error) {
    console.error("Failed to get RHS metrics:", error);
    return null;
  }
};

/**
 * Query RHS metrics with filters
 */
export const queryRHSMetrics = async (
  query: RHSMetricsQuery
): Promise<RHSMetricsRecord[]> => {
  try {
    const queries = [Query.equal("userId", query.userId)];

    if (query.contactId) {
      queries.push(Query.equal("contactId", query.contactId));
    }

    if (query.minRhsScore !== undefined) {
      queries.push(Query.greaterThanEqual("rhsScore", query.minRhsScore));
    }

    if (query.maxRhsScore !== undefined) {
      queries.push(Query.lessThanEqual("rhsScore", query.maxRhsScore));
    }

    if (query.isOverdue !== undefined) {
      queries.push(Query.equal("isOverdueByCadence", query.isOverdue));
    }

    if (query.calculatedAfter) {
      queries.push(
        Query.greaterThanEqual("calculatedAt", query.calculatedAfter)
      );
    }

    queries.push(Query.orderDesc("calculatedAt"));
    queries.push(Query.limit(query.limit || 100));

    const response = await tablesDB.listRows({
      databaseId: DATABASE_ID,
      tableId: RHS_METRICS_TABLE_ID,
      queries,
    });

    return response.rows as unknown as RHSMetricsRecord[];
  } catch (error) {
    console.error("Failed to query RHS metrics:", error);
    return [];
  }
};

/**
 * Save or update RHS metrics for a contact
 */
export const saveRHSMetrics = async (
  input: RHSMetricsInput
): Promise<RHSMetricsRecord> => {
  const calculatedAt = new Date().toISOString();

  const data = {
    userId: input.userId,
    contactId: input.contactId,
    rhsScore: input.rhsScore,
    recencyScore: input.recencyScore,
    freshnessBoost: input.freshnessBoost,
    fatigueGuardPenalty: input.fatigueGuardPenalty,
    cadenceWeight: input.cadenceWeight,
    engagementQualityBonus: input.engagementQualityBonus,
    conversationDepthBonus: input.conversationDepthBonus,
    decayPenalty: input.decayPenalty,
    cadenceAdherenceScore: input.cadenceAdherenceScore,
    cadenceConsistencyScore: input.cadenceConsistencyScore,
    cadenceTrendScore: input.cadenceTrendScore,
    targetCadenceDays: input.targetCadenceDays,
    actualAverageInterval: input.actualAverageInterval,
    daysSinceLastEngagement: input.daysSinceLastEngagement,
    totalEngagements: input.totalEngagements,
    positiveOutcomes: input.positiveOutcomes,
    negativeOutcomes: input.negativeOutcomes,
    averageEngagementFrequency: input.averageEngagementFrequency,
    isOverdueByCadence: input.isOverdueByCadence,
    daysOverdue: input.daysOverdue,
    decayStartDays: input.decayStartDays,
    currentDecayPenalty: input.currentDecayPenalty,
    engagementHistoryFactor: input.engagementHistoryFactor,
    lastEngagementAt: input.lastEngagementAt || "",
    calculatedAt,
  };

  try {
    // Try to find existing record
    const existing = await getRHSMetrics(input.userId, input.contactId);

    if (existing) {
      // Update existing record
      const updated = await tablesDB.updateRow({
        databaseId: DATABASE_ID,
        tableId: RHS_METRICS_TABLE_ID,
        rowId: existing.$id,
        data,
      });

      return updated as unknown as RHSMetricsRecord;
    } else {
      // Create new record
      const created = await tablesDB.createRow({
        databaseId: DATABASE_ID,
        tableId: RHS_METRICS_TABLE_ID,
        rowId: ID.unique(),
        data,
      });

      return created as unknown as RHSMetricsRecord;
    }
  } catch (error) {
    console.error("Failed to save RHS metrics:", error);
    throw error;
  }
};

/**
 * Calculate and persist RHS metrics for a contact
 *
 * This is the main entry point for updating RHS metrics.
 * Call this after any user interaction that affects relationship health.
 */
export const calculateAndPersistRHS = async (
  userId: string,
  contact: ProfileContact,
  config?: Partial<RHSConfig>
): Promise<RHSMetricsRecord> => {
  // Calculate RHS using the standard calculation
  const factors = await calculateRHS(userId, contact, config);

  // Convert to input format
  const input = convertRHSFactorsToInput(
    userId,
    contact.$id,
    factors,
    config ? { ...DEFAULT_RHS_CONFIG, ...config } : DEFAULT_RHS_CONFIG
  );

  // Save to database
  const record = await saveRHSMetrics(input);

  return record;
};

/**
 * Recalculate and persist RHS for a contact by ID
 *
 * Convenience method that fetches the contact and then persists.
 */
export const recalculateAndPersistRHS = async (
  userId: string,
  contactId: string,
  getContact: (contactId: string) => Promise<ProfileContact | null>
): Promise<RHSMetricsRecord | null> => {
  try {
    const contact = await getContact(contactId);

    if (!contact) {
      console.warn(`Contact ${contactId} not found for RHS recalculation`);
      return null;
    }

    return await calculateAndPersistRHS(userId, contact);
  } catch (error) {
    console.error("Failed to recalculate and persist RHS:", error);
    return null;
  }
};

/**
 * Batch calculate and persist RHS for multiple contacts
 */
export const batchCalculateAndPersistRHS = async (
  userId: string,
  contacts: ProfileContact[],
  config?: Partial<RHSConfig>
): Promise<RHSMetricsRecord[]> => {
  const results: RHSMetricsRecord[] = [];

  // Process in batches of 10 to avoid overwhelming the database
  const batchSize = 10;
  for (let i = 0; i < contacts.length; i += batchSize) {
    const batch = contacts.slice(i, i + batchSize);

    const batchResults = await Promise.all(
      batch.map((contact) =>
        calculateAndPersistRHS(userId, contact, config).catch((error) => {
          console.error(
            `Failed to persist RHS for contact ${contact.$id}:`,
            error
          );
          return null;
        })
      )
    );

    results.push(...batchResults.filter((r) => r !== null));
  }

  return results;
};

/**
 * Get RHS metrics for multiple contacts
 */
export const batchGetRHSMetrics = async (
  userId: string,
  contactIds: string[]
): Promise<Map<string, RHSMetricsRecord>> => {
  const metricsMap = new Map<string, RHSMetricsRecord>();

  try {
    // Query all metrics for user
    const response = await tablesDB.listRows({
      databaseId: DATABASE_ID,
      tableId: RHS_METRICS_TABLE_ID,
      queries: [
        Query.equal("userId", userId),
        Query.orderDesc("calculatedAt"),
        Query.limit(500), // Adjust based on expected contact count
      ],
    });

    const allMetrics = response.rows as unknown as RHSMetricsRecord[];

    // Filter to requested contact IDs and get most recent for each
    const contactIdSet = new Set(contactIds);
    const seenContacts = new Set<string>();

    for (const metric of allMetrics) {
      if (
        contactIdSet.has(metric.contactId) &&
        !seenContacts.has(metric.contactId)
      ) {
        metricsMap.set(metric.contactId, metric);
        seenContacts.add(metric.contactId);
      }

      // Early exit if we've found all requested contacts
      if (seenContacts.size === contactIds.length) {
        break;
      }
    }
  } catch (error) {
    console.error("Failed to batch get RHS metrics:", error);
  }

  return metricsMap;
};

/**
 * Delete RHS metrics for a contact
 */
export const deleteRHSMetrics = async (
  userId: string,
  contactId: string
): Promise<boolean> => {
  try {
    const existing = await getRHSMetrics(userId, contactId);

    if (existing) {
      await tablesDB.deleteRow({
        databaseId: DATABASE_ID,
        tableId: RHS_METRICS_TABLE_ID,
        rowId: existing.$id,
      });

      // Also invalidate cache
      invalidateContactRHS(userId, contactId);

      return true;
    }

    return false;
  } catch (error) {
    console.error("Failed to delete RHS metrics:", error);
    return false;
  }
};
