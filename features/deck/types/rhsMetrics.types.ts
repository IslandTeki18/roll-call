/**
 * RHS Metrics Persistence Types
 *
 * Defines the structure for storing RHS (Relationship Health Score) metrics
 * in Appwrite. These metrics are computed on-demand and persisted to reduce
 * computation overhead and enable historical tracking.
 */

export interface RHSMetricsRecord {
  $id: string;
  userId: string;
  contactId: string;

  // Primary RHS score (0-100)
  rhsScore: number;

  // Score component breakdown
  recencyScore: number;
  freshnessBoost: number;
  fatigueGuardPenalty: number;
  cadenceWeight: number;
  engagementQualityBonus: number;
  conversationDepthBonus: number;
  decayPenalty: number;

  // Cadence scoring components
  cadenceAdherenceScore: number;
  cadenceConsistencyScore: number;
  cadenceTrendScore: number;
  targetCadenceDays: number;
  actualAverageInterval: number;

  // Engagement metadata
  daysSinceLastEngagement: number | null;
  totalEngagements: number;
  positiveOutcomes: number;
  negativeOutcomes: number;
  averageEngagementFrequency: number;
  isOverdueByCadence: boolean;
  daysOverdue: number;

  // Decay tracking
  decayStartDays: number;           // When decay penalty begins
  currentDecayPenalty: number;      // Current decay penalty value
  engagementHistoryFactor: number;  // 0.6-1.0 multiplier based on history

  // Timestamps
  calculatedAt: string;             // When this RHS was calculated
  lastEngagementAt: string | null;  // Timestamp of last engagement

  // Appwrite system fields
  $createdAt?: string;
  $updatedAt?: string;
}

/**
 * Input type for creating or updating RHS metrics
 */
export interface RHSMetricsInput {
  userId: string;
  contactId: string;
  rhsScore: number;
  recencyScore: number;
  freshnessBoost: number;
  fatigueGuardPenalty: number;
  cadenceWeight: number;
  engagementQualityBonus: number;
  conversationDepthBonus: number;
  decayPenalty: number;
  cadenceAdherenceScore: number;
  cadenceConsistencyScore: number;
  cadenceTrendScore: number;
  targetCadenceDays: number;
  actualAverageInterval: number;
  daysSinceLastEngagement: number | null;
  totalEngagements: number;
  positiveOutcomes: number;
  negativeOutcomes: number;
  averageEngagementFrequency: number;
  isOverdueByCadence: boolean;
  daysOverdue: number;
  decayStartDays: number;
  currentDecayPenalty: number;
  engagementHistoryFactor: number;
  lastEngagementAt: string | null;
}

/**
 * Query filters for RHS metrics
 */
export interface RHSMetricsQuery {
  userId: string;
  contactId?: string;
  minRhsScore?: number;
  maxRhsScore?: number;
  isOverdue?: boolean;
  calculatedAfter?: string;
  limit?: number;
}
