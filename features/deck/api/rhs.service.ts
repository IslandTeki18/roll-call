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

  // Calculate cadence with metadata
  const cadenceResult = calculateCadenceWeightWithMetadata(
    contact,
    lastEvent,
    cfg
  );
  const cadenceWeight = cadenceResult.weight;

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

const calculateCadenceWeightWithMetadata = (
  contact: ProfileContact,
  lastEvent: { timestamp: string } | null,
  cfg: RHSConfig
): { weight: number; isOverdue: boolean; daysOverdue: number } => {
  if (!contact.cadenceDays || contact.cadenceDays <= 0) {
    return { weight: 0, isOverdue: false, daysOverdue: 0 };
  }

  if (!lastEvent) {
    return {
      weight: cfg.maxCadenceBoost,
      isOverdue: true,
      daysOverdue: contact.cadenceDays,
    };
  }

  const daysSinceContact =
    (Date.now() - new Date(lastEvent.timestamp).getTime()) /
    (1000 * 60 * 60 * 24);

  const cadenceDays = contact.cadenceDays;
  const overdueRatio = daysSinceContact / cadenceDays;

  if (overdueRatio >= cfg.cadenceOverdueMultiplier) {
    return {
      weight: cfg.maxCadenceBoost,
      isOverdue: true,
      daysOverdue: Math.round(daysSinceContact - cadenceDays),
    };
  } else if (overdueRatio >= 1.0) {
    const overdueProgress =
      (overdueRatio - 1.0) / (cfg.cadenceOverdueMultiplier - 1.0);
    return {
      weight: Math.round(cfg.maxCadenceBoost * overdueProgress),
      isOverdue: true,
      daysOverdue: Math.round(daysSinceContact - cadenceDays),
    };
  } else if (overdueRatio >= cfg.cadenceEarlyMultiplier) {
    return { weight: 0, isOverdue: false, daysOverdue: 0 };
  } else {
    const earlyProgress =
      (cfg.cadenceEarlyMultiplier - overdueRatio) / cfg.cadenceEarlyMultiplier;
    return {
      weight: -Math.round(cfg.maxCadencePenalty * earlyProgress),
      isOverdue: false,
      daysOverdue: 0,
    };
  }
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
