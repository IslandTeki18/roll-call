import { ProfileContact } from "@/features/contacts/api/contacts.service";
import { getLastEventForContact } from "@/features/messaging/api/engagement.service";

export interface RHSFactors {
  recencyScore: number;
  freshnessBoost: number;
  fatigueGuardPenalty: number;
  totalScore: number;
}

const FRESH_WINDOW_DAYS = 14;
const FRESH_DECAY_DAYS = 21;
const FRESH_BOOST_MAX = 25;
const RECENCY_DECAY_DAYS = 30;
const FATIGUE_WINDOW_DAYS = 3;
const FATIGUE_PENALTY = 20;

export const calculateRHS = async (
  userId: string,
  contact: ProfileContact
): Promise<RHSFactors> => {
  const recencyScore = await calculateRecencyScore(userId, contact.$id);
  const freshnessBoost = calculateFreshnessBoost(contact);
  const fatigueGuardPenalty = await calculateFatiguePenalty(
    userId,
    contact.$id
  );

  const totalScore = Math.max(
    0,
    Math.min(100, recencyScore + freshnessBoost - fatigueGuardPenalty)
  );

  return {
    recencyScore,
    freshnessBoost,
    fatigueGuardPenalty,
    totalScore,
  };
};

const calculateRecencyScore = async (
  userId: string,
  contactId: string
): Promise<number> => {
  try {
    const lastEvent = await getLastEventForContact(userId, contactId);

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
  } catch (error) {
    console.warn("Failed to get last event for contact:", contactId, error);
    return 100;
  }
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

const calculateFatiguePenalty = async (
  userId: string,
  contactId: string
): Promise<number> => {
  try {
    const lastEvent = await getLastEventForContact(userId, contactId);

    if (!lastEvent) return 0;

    const daysSinceContact =
      (Date.now() - new Date(lastEvent.timestamp).getTime()) /
      (1000 * 60 * 60 * 24);

    if (daysSinceContact < FATIGUE_WINDOW_DAYS) {
      return FATIGUE_PENALTY;
    }
    return 0;
  } catch (error) {
    console.warn("Failed to calculate fatigue penalty:", contactId, error);
    return 0;
  }
};

export const isFreshContact = (contact: ProfileContact): boolean => {
  if (!contact.firstSeenAt) return false;
  const daysSinceFirstSeen =
    (Date.now() - new Date(contact.firstSeenAt).getTime()) /
    (1000 * 60 * 60 * 24);
  return daysSinceFirstSeen < FRESH_WINDOW_DAYS;
};
