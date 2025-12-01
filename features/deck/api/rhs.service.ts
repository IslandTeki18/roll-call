import { ProfileContact } from "@/features/contacts/api/contacts.service";
import { getLastEventForContact } from "@/features/messaging/api/engagement.service";

export interface RHSFactors {
  recencyScore: number;
  freshnessBoost: number;
  fatigueGuardPenalty: number;
  cadenceWeight: number;
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

  const totalScore = Math.max(
    0,
    Math.min(
      100,
      recencyScore + freshnessBoost + cadenceWeight - fatigueGuardPenalty
    )
  );

  return {
    recencyScore,
    freshnessBoost,
    fatigueGuardPenalty,
    cadenceWeight,
    totalScore,
  };
};

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

/**
 * Cadence soft-weight: boosts overdue contacts, penalizes early contacts
 * Returns positive value if overdue, negative if contacted too recently relative to cadence
 */
const calculateCadenceWeight = (
  contact: ProfileContact,
  lastEvent: { timestamp: string } | null
): number => {
  // No cadence set = no weight applied
  if (!contact.cadenceDays || contact.cadenceDays <= 0) {
    return 0;
  }

  // Never contacted = treat as fully overdue
  if (!lastEvent) {
    return CADENCE_OVERDUE_BOOST_MAX;
  }

  const daysSinceContact =
    (Date.now() - new Date(lastEvent.timestamp).getTime()) /
    (1000 * 60 * 60 * 24);

  const cadenceDays = contact.cadenceDays;
  const overdueRatio = daysSinceContact / cadenceDays;

  if (overdueRatio >= 1.5) {
    // Significantly overdue: full boost
    return CADENCE_OVERDUE_BOOST_MAX;
  } else if (overdueRatio >= 1.0) {
    // Overdue: scaled boost (0 to max as ratio goes from 1.0 to 1.5)
    const overdueProgress = (overdueRatio - 1.0) / 0.5;
    return Math.round(CADENCE_OVERDUE_BOOST_MAX * overdueProgress);
  } else if (overdueRatio >= 0.5) {
    // On track: no weight adjustment
    return 0;
  } else {
    // Too early: apply penalty (scaled from 0 to max as ratio goes from 0.5 to 0)
    const earlyProgress = (0.5 - overdueRatio) / 0.5;
    return -Math.round(CADENCE_EARLY_PENALTY_MAX * earlyProgress);
  }
};

export const isFreshContact = (contact: ProfileContact): boolean => {
  if (!contact.firstSeenAt) return false;
  const daysSinceFirstSeen =
    (Date.now() - new Date(contact.firstSeenAt).getTime()) /
    (1000 * 60 * 60 * 24);
  return daysSinceFirstSeen < FRESH_WINDOW_DAYS;
};
