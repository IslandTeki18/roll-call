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

// Enhanced interface with metadata
export interface RHSFactors {
  recencyScore: number;
  freshnessBoost: number;
  fatigueGuardPenalty: number;
  cadenceWeight: number;
  engagementQualityBonus: number;
  conversationDepthBonus: number;
  totalScore: number;

  // NEW: Metadata for debugging and analytics
  daysSinceLastEngagement: number | null;
  totalEngagements: number;
  positiveOutcomes: number;
  negativeOutcomes: number;
  averageEngagementFrequency: number;
  isOverdueByCadence: boolean;
  daysOverdue: number;
}

const FRESH_WINDOW_DAYS = 14;
const FRESH_DECAY_DAYS = 21;
const FRESH_BOOST_MAX = 25;
const RECENCY_DECAY_DAYS = 30;
const FATIGUE_WINDOW_DAYS = 3;
const FATIGUE_PENALTY = 20;
const CADENCE_OVERDUE_BOOST_MAX = 30;
const CADENCE_EARLY_PENALTY_MAX = 15;
const ENGAGEMENT_QUALITY_MAX = 20;
const CONVERSATION_DEPTH_MAX = 15;

export const calculateRHS = async (
  userId: string,
  contact: ProfileContact
): Promise<RHSFactors> => {
  // Fetch engagement events for metadata
  const [lastEvent, allEvents, outcomes] = await Promise.all([
    getLastEventForContact(userId, contact.$id).catch(() => null),
    getEventsByContact(userId, contact.$id, 50).catch(() => []),
    getOutcomeNotesByContact(userId, contact.$id, 20).catch(() => []),
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
  const recencyScore = calculateRecencyScoreFromEvent(lastEvent);
  const freshnessBoost = calculateFreshnessBoost(contact);
  const fatigueGuardPenalty = calculateFatiguePenaltyFromEvent(lastEvent);

  // Calculate cadence with metadata
  const cadenceResult = calculateCadenceWeightWithMetadata(contact, lastEvent);
  const cadenceWeight = cadenceResult.weight;

  const engagementQualityBonus = await calculateEngagementQualityBonus(
    userId,
    contact.$id
  );

  const conversationDepthBonus = await calculateConversationDepthBonus(
    userId,
    contact.$id
  );

  const totalScore = Math.max(
    0,
    Math.min(
      100,
      recencyScore +
        freshnessBoost +
        cadenceWeight +
        engagementQualityBonus +
        conversationDepthBonus -
        fatigueGuardPenalty
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

async function calculateEngagementQualityBonus(
  userId: string,
  contactId: string
): Promise<number> {
  try {
    const qualityScore = await calculateOutcomeQualityScore(userId, contactId);

    if (qualityScore >= 70) {
      return ENGAGEMENT_QUALITY_MAX;
    } else if (qualityScore >= 50) {
      return Math.round((qualityScore - 50) / 20) * ENGAGEMENT_QUALITY_MAX;
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
  contactId: string
): Promise<number> {
  try {
    const avgFrequency = await calculateEngagementFrequency(userId, contactId);

    if (avgFrequency === 0) return 0;

    if (avgFrequency >= 7 && avgFrequency <= 30) {
      return CONVERSATION_DEPTH_MAX;
    }

    if (avgFrequency < 7) {
      return Math.round(CONVERSATION_DEPTH_MAX * 0.6);
    }

    if (avgFrequency > 30 && avgFrequency <= 90) {
      return Math.round(CONVERSATION_DEPTH_MAX * 0.3);
    }

    return 0;
  } catch (error) {
    console.error("Failed to calculate conversation depth bonus:", error);
    return 0;
  }
}

const calculateRecencyScoreFromEvent = (
  lastEvent: { timestamp: string } | null
): number => {
  if (!lastEvent) {
    return 100;
  }

  const daysSinceContact =
    (Date.now() - new Date(lastEvent.timestamp).getTime()) /
    (1000 * 60 * 60 * 24);

  if (daysSinceContact <= 7) return 20;
  if (daysSinceContact <= 14) return 40;
  if (daysSinceContact <= 21) return 60;
  if (daysSinceContact <= RECENCY_DECAY_DAYS) return 80;
  return 100;
};

const calculateFreshnessBoost = (contact: ProfileContact): number => {
  if (!contact.firstSeenAt) return 0;

  const daysSinceFirstSeen =
    (Date.now() - new Date(contact.firstSeenAt).getTime()) /
    (1000 * 60 * 60 * 24);

  if (daysSinceFirstSeen >= FRESH_DECAY_DAYS) return 0;
  if (daysSinceFirstSeen >= FRESH_WINDOW_DAYS) {
    const decayProgress =
      (daysSinceFirstSeen - FRESH_WINDOW_DAYS) /
      (FRESH_DECAY_DAYS - FRESH_WINDOW_DAYS);
    return Math.round(FRESH_BOOST_MAX * (1 - decayProgress));
  }
  return FRESH_BOOST_MAX;
};

const calculateFatiguePenaltyFromEvent = (
  lastEvent: { timestamp: string } | null
): number => {
  if (!lastEvent) return 0;

  const daysSinceContact =
    (Date.now() - new Date(lastEvent.timestamp).getTime()) /
    (1000 * 60 * 60 * 24);

  if (daysSinceContact < FATIGUE_WINDOW_DAYS) {
    return FATIGUE_PENALTY;
  }
  return 0;
};

// NEW: Enhanced to return metadata
const calculateCadenceWeightWithMetadata = (
  contact: ProfileContact,
  lastEvent: { timestamp: string } | null
): { weight: number; isOverdue: boolean; daysOverdue: number } => {
  if (!contact.cadenceDays || contact.cadenceDays <= 0) {
    return { weight: 0, isOverdue: false, daysOverdue: 0 };
  }

  if (!lastEvent) {
    return {
      weight: CADENCE_OVERDUE_BOOST_MAX,
      isOverdue: true,
      daysOverdue: contact.cadenceDays,
    };
  }

  const daysSinceContact =
    (Date.now() - new Date(lastEvent.timestamp).getTime()) /
    (1000 * 60 * 60 * 24);

  const cadenceDays = contact.cadenceDays;
  const overdueRatio = daysSinceContact / cadenceDays;

  if (overdueRatio >= 1.5) {
    return {
      weight: CADENCE_OVERDUE_BOOST_MAX,
      isOverdue: true,
      daysOverdue: Math.round(daysSinceContact - cadenceDays),
    };
  } else if (overdueRatio >= 1.0) {
    const overdueProgress = (overdueRatio - 1.0) / 0.5;
    return {
      weight: Math.round(CADENCE_OVERDUE_BOOST_MAX * overdueProgress),
      isOverdue: true,
      daysOverdue: Math.round(daysSinceContact - cadenceDays),
    };
  } else if (overdueRatio >= 0.5) {
    return { weight: 0, isOverdue: false, daysOverdue: 0 };
  } else {
    const earlyProgress = (0.5 - overdueRatio) / 0.5;
    return {
      weight: -Math.round(CADENCE_EARLY_PENALTY_MAX * earlyProgress),
      isOverdue: false,
      daysOverdue: 0,
    };
  }
};

// Keep original function for backwards compatibility
const calculateCadenceWeight = (
  contact: ProfileContact,
  lastEvent: { timestamp: string } | null
): number => {
  return calculateCadenceWeightWithMetadata(contact, lastEvent).weight;
};

// NEW: Calculate average frequency from events array
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
