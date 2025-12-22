import {
  ProfileContact,
  isContactNew,
} from "@/features/contacts/api/contacts.service";
import {
  getEventsByContact,
  getLastEventForContact,
} from "@/features/messaging/api/engagement.service";
import {
  calculateEngagementFrequency,
  calculateOutcomeQualityScore,
} from "@/features/messaging/api/recommendations.service";
import { getOutcomeNotesByContact } from "@/features/outcomes/api/outcomeNotes.service";
import { RHSFactors, DEFAULT_RHS_CONFIG, RHSConfig } from "../types/rhs.types";

// Use config for configurable decay parameters
const config = DEFAULT_RHS_CONFIG;

export const calculateRHS = async (
  userId: string,
  contact: ProfileContact,
  customConfig?: Partial<RHSConfig>
): Promise<RHSFactors> => {
  const cfg = { ...config, ...customConfig };

  // Fetch engagement events for metadata
  // Reduced limits to minimize API data transfer - 20 events is sufficient for frequency/decay calculations
  const [lastEvent, allEvents, outcomes] = await Promise.all([
    getLastEventForContact(userId, contact.$id).catch(() => null),
    getEventsByContact(userId, contact.$id, 20).catch(() => []),
    getOutcomeNotesByContact(userId, contact.$id, 10).catch(() => []),
  ]);

  // Filter to meaningful engagements
  const meaningfulEvents = allEvents.filter((e) =>
    [
      "sms_sent",
      "call_made",
      "email_sent",
      "facetime_made",
      "slack_sent",
    ].includes(e.type)
  );

  // Calculate core scores
  const recencyScore = calculateRecencyScoreFromEvent(lastEvent, cfg);
  const freshnessBoost = calculateFreshnessBoost(contact, cfg);
  const fatigueGuardPenalty = calculateFatiguePenaltyFromEvent(lastEvent, cfg);

  // Calculate enhanced cadence scoring with metadata
  const cadenceResult = calculateEnhancedCadenceScoring(
    contact,
    lastEvent,
    meaningfulEvents,
    cfg
  );
  const cadenceWeight = cadenceResult.totalWeight;

  const engagementQualityBonus = await calculateEngagementQualityBonus(
    userId,
    contact.$id,
    cfg
  );

  const conversationDepthBonus = await calculateConversationDepthBonus(
    userId,
    contact.$id,
    cfg
  );

  // NEW: Calculate decay penalty
  const decayPenalty = calculateDecayPenalty(lastEvent, meaningfulEvents, cfg);

  const totalScore = Math.max(
    0,
    Math.min(
      100,
      recencyScore +
        freshnessBoost +
        cadenceWeight +
        engagementQualityBonus +
        conversationDepthBonus -
        fatigueGuardPenalty -
        decayPenalty // Apply decay penalty
    )
  );

  // Calculate metadata
  const daysSinceLastEngagement = lastEvent
    ? (Date.now() - new Date(lastEvent.timestamp).getTime()) /
      (1000 * 60 * 60 * 24)
    : null;

  const positiveOutcomes = outcomes.filter(
    (o) => o.userSentiment === "positive"
  ).length;

  const negativeOutcomes = outcomes.filter(
    (o) => o.userSentiment === "negative"
  ).length;

  const averageEngagementFrequency =
    calculateAverageFrequencyFromEvents(meaningfulEvents);

  return {
    recencyScore,
    freshnessBoost,
    fatigueGuardPenalty,
    cadenceWeight,
    engagementQualityBonus,
    conversationDepthBonus,
    decayPenalty,
    totalScore,
    daysSinceLastEngagement,
    totalEngagements: meaningfulEvents.length,
    positiveOutcomes,
    negativeOutcomes,
    averageEngagementFrequency,
    isOverdueByCadence: cadenceResult.isOverdue,
    daysOverdue: cadenceResult.daysOverdue,
    cadenceAdherenceScore: cadenceResult.adherenceScore,
    cadenceConsistencyScore: cadenceResult.consistencyScore,
    cadenceTrendScore: cadenceResult.trendScore,
    targetCadenceDays: cadenceResult.targetCadenceDays,
    actualAverageInterval: cadenceResult.actualAverageInterval,
  };
};

/**
 * NEW: Calculate decay penalty using exponential decay formula
 *
 * Decay increases exponentially after decayStartDays:
 * - 0 penalty before decayStartDays
 * - Exponential growth after decayStartDays
 * - Capped at decayMaxPenalty
 *
 * Formula: penalty = maxPenalty * (1 - e^(-rate * days_overdue))
 *
 * Examples with default config (start=30, max=40, rate=0.05):
 * - 30 days: 0 penalty
 * - 45 days: ~14 penalty (exponential growth begins)
 * - 60 days: ~26 penalty
 * - 90 days: ~37 penalty (approaching max)
 * - 120+ days: ~40 penalty (max reached)
 */
const calculateDecayPenalty = (
  lastEvent: { timestamp: string } | null,
  meaningfulEvents: any[],
  cfg: RHSConfig
): number => {
  // No penalty if contact is brand new (never engaged)
  if (!lastEvent) {
    return 0;
  }

  const daysSinceContact =
    (Date.now() - new Date(lastEvent.timestamp).getTime()) /
    (1000 * 60 * 60 * 24);

  // No penalty before decay start threshold
  if (daysSinceContact <= cfg.decayStartDays) {
    return 0;
  }

  // Calculate days beyond threshold
  const daysOverdue = daysSinceContact - cfg.decayStartDays;

  // Exponential decay formula: max * (1 - e^(-rate * days))
  // This creates smooth exponential growth from 0 to max
  const exponentialFactor =
    1 - Math.exp(-cfg.decayExponentialRate * daysOverdue);
  const penalty = cfg.decayMaxPenalty * exponentialFactor;

  // Account for engagement history - reduce penalty if strong history
  const engagementHistoryFactor =
    calculateEngagementHistoryFactor(meaningfulEvents);

  return Math.round(penalty * engagementHistoryFactor);
};

/**
 * Calculate factor to reduce decay penalty based on engagement history
 * Strong engagement history = lower decay penalty
 *
 * Returns 1.0 (full penalty) for weak history, down to 0.6 (40% reduction) for strong history
 */
const calculateEngagementHistoryFactor = (meaningfulEvents: any[]): number => {
  if (meaningfulEvents.length === 0) return 1.0;

  // Strong history (10+ engagements) reduces penalty by 40%
  if (meaningfulEvents.length >= 10) return 0.6;

  // Medium history (5-9 engagements) reduces penalty by 20%
  if (meaningfulEvents.length >= 5) return 0.8;

  // Weak history (1-4 engagements) reduces penalty by 10%
  if (meaningfulEvents.length >= 1) return 0.9;

  return 1.0;
};

async function calculateEngagementQualityBonus(
  userId: string,
  contactId: string,
  cfg: RHSConfig
): Promise<number> {
  try {
    const qualityScore = await calculateOutcomeQualityScore(userId, contactId);

    if (qualityScore >= 70) {
      return cfg.maxEngagementQualityBonus;
    } else if (qualityScore >= 50) {
      return (
        Math.round((qualityScore - 50) / 20) * cfg.maxEngagementQualityBonus
      );
    } else if (qualityScore < 30) {
      return -5;
    }

    return 0;
  } catch (error) {
    console.error("Failed to calculate engagement quality bonus:", error);
    return 0;
  }
}

async function calculateConversationDepthBonus(
  userId: string,
  contactId: string,
  cfg: RHSConfig
): Promise<number> {
  try {
    const avgFrequency = await calculateEngagementFrequency(userId, contactId);

    if (avgFrequency === 0) return 0;

    if (avgFrequency >= 7 && avgFrequency <= 30) {
      return cfg.maxConversationDepthBonus;
    }

    if (avgFrequency < 7) {
      return Math.round(cfg.maxConversationDepthBonus * 0.6);
    }

    if (avgFrequency > 30 && avgFrequency <= 90) {
      return Math.round(cfg.maxConversationDepthBonus * 0.3);
    }

    return 0;
  } catch (error) {
    console.error("Failed to calculate conversation depth bonus:", error);
    return 0;
  }
}

const calculateRecencyScoreFromEvent = (
  lastEvent: { timestamp: string } | null,
  cfg: RHSConfig
): number => {
  if (!lastEvent) {
    return cfg.maxRecencyScore;
  }

  const daysSinceContact =
    (Date.now() - new Date(lastEvent.timestamp).getTime()) /
    (1000 * 60 * 60 * 24);

  if (daysSinceContact <= cfg.recencyExcellent) return 20;
  if (daysSinceContact <= cfg.recencyGood) return 40;
  if (daysSinceContact <= cfg.recencyFair) return 60;
  if (daysSinceContact <= cfg.recencyPoor) return 80;
  return cfg.maxRecencyScore;
};

const calculateFreshnessBoost = (
  contact: ProfileContact,
  cfg: RHSConfig
): number => {
  if (!contact.firstSeenAt) return 0;

  const daysSinceFirstSeen =
    (Date.now() - new Date(contact.firstSeenAt).getTime()) /
    (1000 * 60 * 60 * 24);

  if (daysSinceFirstSeen >= cfg.freshnessDecayEnd) return 0;
  if (daysSinceFirstSeen >= cfg.freshnessDecayStart) {
    const decayProgress =
      (daysSinceFirstSeen - cfg.freshnessDecayStart) /
      (cfg.freshnessDecayEnd - cfg.freshnessDecayStart);
    return Math.round(cfg.maxFreshnessBoost * (1 - decayProgress));
  }
  return cfg.maxFreshnessBoost;
};

const calculateFatiguePenaltyFromEvent = (
  lastEvent: { timestamp: string } | null,
  cfg: RHSConfig
): number => {
  if (!lastEvent) return 0;

  const daysSinceContact =
    (Date.now() - new Date(lastEvent.timestamp).getTime()) /
    (1000 * 60 * 60 * 24);

  if (daysSinceContact < cfg.fatigueWindowDays) {
    return cfg.maxFatiguePenalty;
  }
  return 0;
};

/**
 * ENHANCED: Calculate comprehensive cadence scoring
 *
 * Compares actual engagement intervals against target cadence (explicit or global default)
 * Returns three independent scores:
 * 1. Adherence Score (0-40): How well current timing matches target cadence
 * 2. Consistency Score (0-20): How consistent the engagement pattern is over time
 * 3. Trend Score (-10 to +10): Whether engagement frequency is improving or worsening
 *
 * Total weight is the sum of all three scores, replacing the old simple cadenceWeight
 */
const calculateEnhancedCadenceScoring = (
  contact: ProfileContact,
  lastEvent: { timestamp: string } | null,
  meaningfulEvents: any[],
  cfg: RHSConfig
): {
  totalWeight: number;
  adherenceScore: number;
  consistencyScore: number;
  trendScore: number;
  isOverdue: boolean;
  daysOverdue: number;
  targetCadenceDays: number;
  actualAverageInterval: number;
} => {
  // Determine target cadence: use contact's explicit cadence or global default
  const targetCadenceDays = contact.cadenceDays && contact.cadenceDays > 0
    ? contact.cadenceDays
    : cfg.defaultCadenceDays;

  // Calculate actual engagement intervals from history
  const intervals = calculateEngagementIntervals(meaningfulEvents);
  const actualAverageInterval = intervals.length > 0
    ? intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length
    : 0;

  // 1. ADHERENCE SCORE: Compare current timing vs target
  const adherenceResult = calculateAdherenceScore(
    lastEvent,
    targetCadenceDays,
    cfg
  );

  // 2. CONSISTENCY SCORE: Measure engagement pattern variance
  const consistencyScore = calculateConsistencyScore(
    intervals,
    targetCadenceDays,
    cfg
  );

  // 3. TREND SCORE: Track if engagement frequency is improving
  const trendScore = calculateTrendScore(intervals, cfg);

  // Total weight is sum of all components
  const totalWeight = adherenceResult.score + consistencyScore + trendScore;

  return {
    totalWeight,
    adherenceScore: adherenceResult.score,
    consistencyScore,
    trendScore,
    isOverdue: adherenceResult.isOverdue,
    daysOverdue: adherenceResult.daysOverdue,
    targetCadenceDays,
    actualAverageInterval,
  };
};

/**
 * Calculate adherence score based on current timing vs target cadence
 * Replaces the old simple ratio-based calculation with more nuanced scoring
 */
const calculateAdherenceScore = (
  lastEvent: { timestamp: string } | null,
  targetCadenceDays: number,
  cfg: RHSConfig
): { score: number; isOverdue: boolean; daysOverdue: number } => {
  // Never contacted: maximum boost to encourage first contact
  if (!lastEvent) {
    return {
      score: cfg.cadenceAdherenceWeight,
      isOverdue: true,
      daysOverdue: targetCadenceDays,
    };
  }

  const daysSinceContact =
    (Date.now() - new Date(lastEvent.timestamp).getTime()) /
    (1000 * 60 * 60 * 24);

  const overdueRatio = daysSinceContact / targetCadenceDays;

  // Very overdue (>= 1.5x target): max boost
  if (overdueRatio >= cfg.cadenceOverdueMultiplier) {
    return {
      score: cfg.cadenceAdherenceWeight,
      isOverdue: true,
      daysOverdue: Math.round(daysSinceContact - targetCadenceDays),
    };
  }

  // Late (1.0x to 1.5x target): scaled boost from 0 to max
  if (overdueRatio >= 1.0) {
    const overdueProgress =
      (overdueRatio - 1.0) / (cfg.cadenceOverdueMultiplier - 1.0);
    return {
      score: Math.round(cfg.cadenceAdherenceWeight * overdueProgress),
      isOverdue: true,
      daysOverdue: Math.round(daysSinceContact - targetCadenceDays),
    };
  }

  // On-track (0.5x to 1.0x target): neutral score
  if (overdueRatio >= cfg.cadenceEarlyMultiplier) {
    return { score: 0, isOverdue: false, daysOverdue: 0 };
  }

  // Too early (< 0.5x target): small penalty
  const earlyProgress =
    (cfg.cadenceEarlyMultiplier - overdueRatio) / cfg.cadenceEarlyMultiplier;
  return {
    score: -Math.round(cfg.maxCadencePenalty * earlyProgress),
    isOverdue: false,
    daysOverdue: 0,
  };
};

/**
 * Calculate consistency score based on variance in engagement intervals
 * Rewards contacts with predictable, regular engagement patterns
 */
const calculateConsistencyScore = (
  intervals: number[],
  targetCadenceDays: number,
  cfg: RHSConfig
): number => {
  if (intervals.length < 2) return 0;

  // Calculate coefficient of variation (CV) = std dev / mean
  const mean = intervals.reduce((sum, val) => sum + val, 0) / intervals.length;
  if (mean === 0) return 0;

  const variance =
    intervals.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
    intervals.length;
  const stdDev = Math.sqrt(variance);
  const cv = stdDev / mean;

  // Low CV (< 0.3) = very consistent = max score
  // Medium CV (0.3-0.7) = moderately consistent = scaled score
  // High CV (> 0.7) = inconsistent = zero score
  if (cv < 0.3) {
    return cfg.cadenceConsistencyWeight;
  } else if (cv < 0.7) {
    const consistencyFactor = 1 - (cv - 0.3) / 0.4; // Scale from 1 to 0
    return Math.round(cfg.cadenceConsistencyWeight * consistencyFactor);
  }

  return 0;
};

/**
 * Calculate trend score based on whether intervals are improving (getting shorter)
 * Positive score for improving trends, negative for worsening trends
 */
const calculateTrendScore = (
  intervals: number[],
  cfg: RHSConfig
): number => {
  if (intervals.length < 3) return 0;

  // Compare first half vs second half of intervals
  const midpoint = Math.floor(intervals.length / 2);
  const firstHalf = intervals.slice(0, midpoint);
  const secondHalf = intervals.slice(midpoint);

  const avgFirstHalf =
    firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
  const avgSecondHalf =
    secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;

  // Improving trend = second half has shorter intervals than first half
  const improvement = avgFirstHalf - avgSecondHalf;
  const improvementRatio = improvement / avgFirstHalf;

  // > 20% improvement: max positive score
  // -20% to +20%: scaled score
  // < -20% decline: max negative score
  if (improvementRatio > 0.2) {
    return cfg.cadenceTrendWeight;
  } else if (improvementRatio < -0.2) {
    return -cfg.cadenceTrendWeight;
  } else {
    // Scale linearly from -10 to +10
    return Math.round((improvementRatio / 0.2) * cfg.cadenceTrendWeight);
  }
};

/**
 * Calculate intervals (in days) between consecutive engagement events
 * Returns array of gaps between events, sorted chronologically
 */
const calculateEngagementIntervals = (events: any[]): number[] => {
  if (events.length < 2) return [];

  const intervals: number[] = [];
  for (let i = 0; i < events.length - 1; i++) {
    const time1 = new Date(events[i].timestamp).getTime();
    const time2 = new Date(events[i + 1].timestamp).getTime();
    const daysDiff = Math.abs(time1 - time2) / (1000 * 60 * 60 * 24);
    intervals.push(daysDiff);
  }

  return intervals;
};

const calculateAverageFrequencyFromEvents = (events: any[]): number => {
  if (events.length < 2) return 0;

  const gaps: number[] = [];
  for (let i = 0; i < events.length - 1; i++) {
    const time1 = new Date(events[i].timestamp).getTime();
    const time2 = new Date(events[i + 1].timestamp).getTime();
    const daysDiff = (time1 - time2) / (1000 * 60 * 60 * 24);
    gaps.push(daysDiff);
  }

  return gaps.reduce((a, b) => a + b, 0) / gaps.length;
};

export const isFreshContact = isContactNew;
