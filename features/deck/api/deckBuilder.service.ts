import {
  ProfileContact,
  loadContacts,
  isContactNew,
} from "@/features/contacts/api/contacts.service";
import { getCachedRHS } from "./rhs.cache";
import { RHSFactors } from "../types/rhs.types";
import { DeckCard, ChannelType } from "../types/deck.types";
import { tablesDB } from "@/features/shared/lib/appwrite";
import { ID, Query } from "react-native-appwrite";
import { archiveOldDecks } from "./deckHistory.service";
import {
  shouldArchiveToday,
  markArchiveCompleted,
} from "./deckArchive.cache";

const DATABASE_ID = process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID!;
const DECK_CARDS_TABLE_ID =
  process.env.EXPO_PUBLIC_APPWRITE_DECK_CARDS_TABLE_ID!;

interface ScoredContact {
  contact: ProfileContact;
  rhs: RHSFactors;
  isFresh: boolean;
}

const FRESH_MIN = 1;
const FRESH_MAX = 2;
const BATCH_SIZE = 15; // Process contacts in batches of 15
const ENGAGEMENT_EVENTS_TABLE_ID = process.env.EXPO_PUBLIC_APPWRITE_ENGAGEMENT_EVENTS_TABLE_ID!;

/**
 * Check if user has any engagement history to determine if we should use fast path
 */
const hasEngagementHistory = async (userId: string): Promise<boolean> => {
  try {
    const events = await tablesDB.listRows({
      databaseId: DATABASE_ID,
      tableId: ENGAGEMENT_EVENTS_TABLE_ID,
      queries: [Query.equal("userId", userId), Query.limit(1)],
    });
    return events.rows.length > 0;
  } catch (error) {
    console.error("Failed to check engagement history:", error);
    return false; // Default to fast path if check fails
  }
};

/**
 * Fast path: Build deck without RHS calculations for new users
 * Simply shuffles contacts and prioritizes fresh contacts
 */
const buildDeckFastPath = async (
  contacts: ProfileContact[],
  maxCards: number
): Promise<ScoredContact[]> => {
  console.log("Using fast path - no engagement history detected");

  // Separate fresh vs regular contacts
  const freshContacts = contacts.filter((c) => isContactNew(c));
  const regularContacts = contacts.filter((c) => !isContactNew(c));

  // Shuffle both arrays for randomness
  shuffleArray(freshContacts);
  shuffleArray(regularContacts);

  const deck: ScoredContact[] = [];

  // Add fresh contacts (1-2)
  const freshCount = Math.min(
    Math.max(FRESH_MIN, Math.min(freshContacts.length, FRESH_MAX)),
    freshContacts.length
  );

  deck.push(
    ...freshContacts.slice(0, freshCount).map((contact) => ({
      contact,
      rhs: createDefaultRHS(true),
      isFresh: true,
    }))
  );

  // Fill remaining with regular contacts
  const remaining = maxCards - deck.length;
  deck.push(
    ...regularContacts.slice(0, remaining).map((contact) => ({
      contact,
      rhs: createDefaultRHS(false),
      isFresh: false,
    }))
  );

  return deck;
};

/**
 * Create a default "cold" RHS for contacts without engagement history
 */
const createDefaultRHS = (isFresh: boolean): RHSFactors => ({
  recencyScore: 100, // Max score since never contacted
  freshnessBoost: isFresh ? 30 : 0,
  fatigueGuardPenalty: 0,
  cadenceWeight: 40,
  engagementQualityBonus: 0,
  conversationDepthBonus: 0,
  decayPenalty: 0,
  totalScore: isFresh ? 70 : 40, // Fresh contacts score higher
  daysSinceLastEngagement: null,
  totalEngagements: 0,
  positiveOutcomes: 0,
  negativeOutcomes: 0,
  averageEngagementFrequency: 0,
  isOverdueByCadence: true,
  daysOverdue: 30,
  cadenceAdherenceScore: 40,
  cadenceConsistencyScore: 0,
  cadenceTrendScore: 0,
  targetCadenceDays: 30,
  actualAverageInterval: 0,
});

/**
 * Fisher-Yates shuffle algorithm for randomizing contact order
 */
const shuffleArray = <T>(array: T[]): void => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
};

/**
 * Process contacts in batches to avoid overwhelming Appwrite with parallel requests
 */
const batchProcessContacts = async (
  contacts: ProfileContact[],
  userId: string
): Promise<ScoredContact[]> => {
  const results: ScoredContact[] = [];

  // Process in batches of BATCH_SIZE
  for (let i = 0; i < contacts.length; i += BATCH_SIZE) {
    const batch = contacts.slice(i, i + BATCH_SIZE);

    const batchResults = await Promise.all(
      batch.map(async (contact) => ({
        contact,
        rhs: await getCachedRHS(userId, contact),
        isFresh: isContactNew(contact),
      }))
    );

    results.push(...batchResults);
  }

  return results;
};

const getContactReason = (rhs: RHSFactors): string => {
  // Priority order: freshness > cadence > recency
  if (rhs.freshnessBoost > 0) {
    return "New connection - reach out while it's fresh!";
  }

  if (rhs.isOverdueByCadence && rhs.daysOverdue > 7) {
    return `${rhs.daysOverdue} days overdue by your cadence`;
  }

  if (rhs.isOverdueByCadence) {
    return "Past your check-in cadence";
  }

  if (rhs.daysSinceLastEngagement === null) {
    return "You haven't connected yet";
  }

  if (rhs.daysSinceLastEngagement >= 60) {
    return "It's been over 2 months";
  }

  if (rhs.daysSinceLastEngagement >= 30) {
    return "It's been over a month";
  }

  if (rhs.daysSinceLastEngagement >= 21) {
    return "It's been 3 weeks";
  }

  if (rhs.daysSinceLastEngagement >= 14) {
    return "It's been 2 weeks";
  }

  return "Keep the momentum going";
};

export const buildDeck = async (
  userId: string,
  maxCards: number,
  isPremiumUser: boolean
): Promise<DeckCard[]> => {
  const todayDate = new Date().toISOString().split("T")[0];

  // Only archive old decks once per day to reduce API calls
  if (shouldArchiveToday(userId)) {
    try {
      const archiveResult = await archiveOldDecks(userId, isPremiumUser);
      if (archiveResult.archivedDates.length > 0) {
        console.log(
          `Archived ${archiveResult.archivedDates.length} old deck(s):`,
          archiveResult.archivedDates
        );
        markArchiveCompleted(userId);
      } else {
        // No decks to archive, still mark as completed to avoid checking again today
        markArchiveCompleted(userId);
      }
      if (archiveResult.errors.length > 0) {
        console.error("Archive errors:", archiveResult.errors);
      }
    } catch (error) {
      console.error("Failed to archive old decks:", error);
      // Don't mark as completed on error, allow retry
    }
  }

  const existingDeck = await tablesDB.listRows({
    databaseId: DATABASE_ID,
    tableId: DECK_CARDS_TABLE_ID,
    queries: [Query.equal("userId", userId), Query.equal("date", todayDate)],
  });

  if (existingDeck.rows.length > 0) {
    const existingCardCount = existingDeck.rows.length;

    if (maxCards > existingCardCount) {
      const contacts = await loadContacts(userId);
      const contactMap = new Map(contacts.map((c) => [c.$id, c]));

      const existingContactIds = new Set(
        existingDeck.rows.map((row: any) => row.contactId)
      );

      const availableContacts = contacts.filter(
        (c) => !existingContactIds.has(c.$id)
      );

      if (availableContacts.length > 0) {
        // Check if user has engagement history - use fast path if not
        const hasHistory = await hasEngagementHistory(userId);
        const scored = hasHistory
          ? await batchProcessContacts(availableContacts, userId)
          : await buildDeckFastPath(availableContacts, maxCards);

        const freshContacts = scored.filter((s) => s.isFresh);
        const regularContacts = scored.filter((s) => !s.isFresh);

        freshContacts.sort((a, b) => b.rhs.totalScore - a.rhs.totalScore);
        regularContacts.sort((a, b) => b.rhs.totalScore - a.rhs.totalScore);

        const additionalCardsNeeded = maxCards - existingCardCount;
        const additionalDeck: ScoredContact[] = [];

        const existingFreshCount = existingDeck.rows.filter(
          (row: any) => row.isFresh
        ).length;
        const freshSlotsAvailable = Math.max(0, FRESH_MAX - existingFreshCount);
        const freshToAdd = Math.min(
          freshSlotsAvailable,
          freshContacts.length,
          additionalCardsNeeded
        );

        additionalDeck.push(...freshContacts.slice(0, freshToAdd));

        const remainingSlots = additionalCardsNeeded - additionalDeck.length;
        additionalDeck.push(...regularContacts.slice(0, remainingSlots));

        const newCards: DeckCard[] = await Promise.all(
          additionalDeck.slice(0, additionalCardsNeeded).map(async (scored) => {
            const cardId = `${todayDate}-${scored.contact.$id}`;
            const suggestedChannel = getSuggestedChannel(scored.contact);

            const doc = await tablesDB.createRow({
              databaseId: DATABASE_ID,
              tableId: DECK_CARDS_TABLE_ID,
              rowId: ID.unique(),
              data: {
                userId,
                cardId,
                contactId: scored.contact.$id,
                date: todayDate,
                status: "pending",
                draftedAt: "",
                sentAt: "",
                completedAt: "",
                linkedEngagementEventId: "",
                linkedOutcomeId: "",
                suggestedChannel,
                reason: getContactReason(scored.rhs),
                rhsScore: scored.rhs.totalScore,
                isFresh: scored.isFresh,
              },
            });

            return {
              id: cardId,
              $id: doc.$id,
              userId,
              cardId,
              contactId: scored.contact.$id,
              date: todayDate,
              contact: scored.contact,
              status: "pending" as const,
              draftedAt: "",
              sentAt: "",
              isFresh: scored.isFresh,
              rhsScore: scored.rhs.totalScore,
              suggestedChannel,
              reason: getContactReason(scored.rhs),
              linkedOutcomeId: "",
              completedAt: "",
              linkedEngagementEventId: "",
              outcomeId: "",
            };
          })
        );

        const allCards = [
          ...existingDeck.rows.map((doc: any) => ({
            id: doc.cardId,
            $id: doc.$id,
            userId: doc.userId,
            cardId: doc.cardId,
            contactId: doc.contactId,
            date: doc.date,
            contact: contactMap.get(doc.contactId),
            status: doc.status,
            draftedAt: doc.draftedAt || "",
            sentAt: doc.sentAt || "",
            isFresh: doc.isFresh,
            rhsScore: doc.rhsScore,
            suggestedChannel: doc.suggestedChannel,
            reason: doc.reason,
            linkedOutcomeId: doc.linkedOutcomeId || "",
            completedAt: doc.completedAt || "",
            linkedEngagementEventId: doc.linkedEngagementEventId || "",
            outcomeId: doc.outcomeId || "",
          })),
          ...newCards,
        ];

        return allCards as DeckCard[];
      }
    }

    const contacts = await loadContacts(userId);
    const contactMap = new Map(contacts.map((c) => [c.$id, c]));

    return existingDeck.rows.map((doc: any) => ({
      id: doc.cardId,
      $id: doc.$id,
      userId: doc.userId,
      cardId: doc.cardId,
      contactId: doc.contactId,
      date: doc.date,
      contact: contactMap.get(doc.contactId),
      status: doc.status,
      draftedAt: doc.draftedAt || "",
      sentAt: doc.sentAt || "",
      isFresh: doc.isFresh,
      rhsScore: doc.rhsScore,
      suggestedChannel: doc.suggestedChannel,
      reason: doc.reason,
      linkedOutcomeId: doc.linkedOutcomeId || "",
      completedAt: doc.completedAt || "",
      linkedEngagementEventId: doc.linkedEngagementEventId || "",
      outcomeId: doc.outcomeId || "",
    })) as DeckCard[];
  }

  const contacts = await loadContacts(userId);

  if (contacts.length === 0) return [];

  // Check if user has engagement history - use fast path if not
  const hasHistory = await hasEngagementHistory(userId);
  const scored = hasHistory
    ? await batchProcessContacts(contacts, userId)
    : await buildDeckFastPath(contacts, maxCards);

  const freshContacts = scored.filter((s) => s.isFresh);
  const regularContacts = scored.filter((s) => !s.isFresh);

  freshContacts.sort((a, b) => b.rhs.totalScore - a.rhs.totalScore);
  regularContacts.sort((a, b) => b.rhs.totalScore - a.rhs.totalScore);

  const deck: ScoredContact[] = [];
  const freshCount = Math.min(
    Math.max(FRESH_MIN, Math.min(freshContacts.length, FRESH_MAX)),
    freshContacts.length
  );

  deck.push(...freshContacts.slice(0, freshCount));

  const remaining = maxCards - deck.length;
  deck.push(...regularContacts.slice(0, remaining));

  if (deck.length < maxCards && freshContacts.length > freshCount) {
    const extraFresh = maxCards - deck.length;
    deck.push(...freshContacts.slice(freshCount, freshCount + extraFresh));
  }

  const deckCards: DeckCard[] = await Promise.all(
    deck.slice(0, maxCards).map(async (scored) => {
      const cardId = `${todayDate}-${scored.contact.$id}`;
      const suggestedChannel = getSuggestedChannel(scored.contact);

      const doc = await tablesDB.createRow({
        databaseId: DATABASE_ID,
        tableId: DECK_CARDS_TABLE_ID,
        rowId: ID.unique(),
        data: {
          userId,
          cardId,
          contactId: scored.contact.$id,
          date: todayDate,
          status: "pending",
          draftedAt: "",
          sentAt: "",
          completedAt: "",
          linkedEngagementEventId: "",
          linkedOutcomeId: "",
          suggestedChannel,
          reason: getContactReason(scored.rhs),
          rhsScore: scored.rhs.totalScore,
          isFresh: scored.isFresh,
        },
      });

      return {
        id: cardId,
        $id: doc.$id,
        userId,
        cardId,
        contactId: scored.contact.$id,
        date: todayDate,
        contact: scored.contact,
        status: "pending" as const,
        draftedAt: "",
        sentAt: "",
        isFresh: scored.isFresh,
        rhsScore: scored.rhs.totalScore,
        suggestedChannel,
        reason: getContactReason(scored.rhs),
        linkedOutcomeId: "",
        completedAt: "",
        linkedEngagementEventId: "",
        outcomeId: "",
      };
    })
  );

  return deckCards as DeckCard[];
};

export const isDailyQuotaExhausted = async (
  userId: string
): Promise<boolean> => {
  const todayDate = new Date().toISOString().split("T")[0];

  const existingDeck = await tablesDB.listRows({
    databaseId: DATABASE_ID,
    tableId: DECK_CARDS_TABLE_ID,
    queries: [
      Query.equal("userId", userId),
      Query.equal("date", todayDate),
      Query.limit(1),
    ],
  });

  return existingDeck.rows.length > 0;
};

const getSuggestedChannel = (contact: ProfileContact): ChannelType => {
  const hasPhone = contact.phoneNumbers && contact.phoneNumbers.length > 0;
  const hasEmail = contact.emails && contact.emails.length > 0;
  if (hasPhone) return "sms";
  if (hasEmail) return "email";
  return "call";
};

