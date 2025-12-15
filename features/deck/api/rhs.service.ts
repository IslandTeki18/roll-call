import {
  ProfileContact,
  isContactNew,
} from "@/features/contacts/api/contacts.service";
import { getLastEventForContact } from "@/features/messaging/api/engagement.service";
import {
  calculateEngagementFrequency,
  calculateOutcomeQualityScore,
} from "@/features/messaging/api/recommendations.service";

export interface RHSFactors {
  recencyScore: number;
  freshnessBoost: number;
  fatigueGuardPenalty: number;
  cadenceWeight: number;
  engagementQualityBonus: number;
  conversationDepthBonus: number;
  totalScore: number;
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
  const lastEvent = await getLastEventForContact(userId, contact.$id).catch(
    () => null
  );

  const recencyScore = calculateRecencyScoreFromEvent(lastEvent);
  const freshnessBoost = calculateFreshnessBoost(contact);
  const fatigueGuardPenalty = calculateFatiguePenaltyFromEvent(lastEvent);
  const cadenceWeight = calculateCadenceWeight(contact, lastEvent);

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

  return {
    recencyScore,
    freshnessBoost,
    fatigueGuardPenalty,
    cadenceWeight,
    engagementQualityBonus,
    conversationDepthBonus,
    totalScore,
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

const calculateCadenceWeight = (
  contact: ProfileContact,
  lastEvent: { timestamp: string } | null
): number => {
  if (!contact.cadenceDays || contact.cadenceDays <= 0) {
    return 0;
  }

  if (!lastEvent) {
    return CADENCE_OVERDUE_BOOST_MAX;
  }

  const daysSinceContact =
    (Date.now() - new Date(lastEvent.timestamp).getTime()) /
    (1000 * 60 * 60 * 24);

  const cadenceDays = contact.cadenceDays;
  const overdueRatio = daysSinceContact / cadenceDays;

  if (overdueRatio >= 1.5) {
    return CADENCE_OVERDUE_BOOST_MAX;
  } else if (overdueRatio >= 1.0) {
    const overdueProgress = (overdueRatio - 1.0) / 0.5;
    return Math.round(CADENCE_OVERDUE_BOOST_MAX * overdueProgress);
  } else if (overdueRatio >= 0.5) {
    return 0;
  } else {
    const earlyProgress = (0.5 - overdueRatio) / 0.5;
    return -Math.round(CADENCE_EARLY_PENALTY_MAX * earlyProgress);
  }
};

// NEW: Updated to use centralized isContactNew function
export const isFreshContact = isContactNew;
