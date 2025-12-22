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
        const scored: ScoredContact[] = await Promise.all(
          availableContacts.map(async (contact) => ({
            contact,
            rhs: await getCachedRHS(userId, contact),
            isFresh: isContactNew(contact), // NEW: Use centralized function
          }))
        );

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

  const scored: ScoredContact[] = await Promise.all(
    contacts.map(async (contact) => ({
      contact,
      rhs: await getCachedRHS(userId, contact),
      isFresh: isContactNew(contact), // NEW: Use centralized function
    }))
  );

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

