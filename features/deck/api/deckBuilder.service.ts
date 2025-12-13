import {
  ProfileContact,
  loadContacts,
} from "@/features/contacts/api/contacts.service";
import { calculateRHS, isFreshContact, RHSFactors } from "./rhs.service";
import { DeckCard, ChannelType } from "../types/deck.types";
import { tablesDB } from "@/features/shared/lib/appwrite";
import { ID, Query } from "react-native-appwrite";
import { archiveOldDecks } from "./deckHistory.service";

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

export const buildDeck = async (
  userId: string,
  maxCards: number,
  isPremiumUser: boolean
): Promise<DeckCard[]> => {
  const todayDate = new Date().toISOString().split("T")[0];

  // CRITICAL: Archive old decks before checking/building today's deck
  try {
    const archiveResult = await archiveOldDecks(userId, isPremiumUser);
    if (archiveResult.archivedDates.length > 0) {
      console.log(
        `Archived ${archiveResult.archivedDates.length} old deck(s):`,
        archiveResult.archivedDates
      );
    }
    if (archiveResult.errors.length > 0) {
      console.error("Archive errors:", archiveResult.errors);
    }
  } catch (error) {
    console.error("Failed to archive old decks:", error);
    // Continue building deck even if archive fails
  }

  // Check if deck already exists for today
  const existingDeck = await tablesDB.listRows({
    databaseId: DATABASE_ID,
    tableId: DECK_CARDS_TABLE_ID,
    queries: [Query.equal("userId", userId), Query.equal("date", todayDate)],
  });

  if (existingDeck.rows.length > 0) {
    const existingCardCount = existingDeck.rows.length;

    // If user now has access to more cards (e.g., upgraded to premium), generate additional cards
    if (maxCards > existingCardCount) {
      const contacts = await loadContacts(userId);
      const contactMap = new Map(contacts.map((c) => [c.$id, c]));

      // Get IDs of contacts already in today's deck
      const existingContactIds = new Set(
        existingDeck.rows.map((row: any) => row.contactId)
      );

      // Filter out contacts already in deck
      const availableContacts = contacts.filter(
        (c) => !existingContactIds.has(c.$id)
      );

      if (availableContacts.length > 0) {
        // Score and rank available contacts
        const scored: ScoredContact[] = await Promise.all(
          availableContacts.map(async (contact) => ({
            contact,
            rhs: await calculateRHS(userId, contact),
            isFresh: isFreshContact(contact),
          }))
        );

        const freshContacts = scored.filter((s) => s.isFresh);
        const regularContacts = scored.filter((s) => !s.isFresh);

        freshContacts.sort((a, b) => b.rhs.totalScore - a.rhs.totalScore);
        regularContacts.sort((a, b) => b.rhs.totalScore - a.rhs.totalScore);

        // Determine how many additional cards to generate
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

        // Fill remaining slots with regular contacts
        const remainingSlots = additionalCardsNeeded - additionalDeck.length;
        additionalDeck.push(...regularContacts.slice(0, remainingSlots));

        // Create additional deck cards
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

    // Return existing deck with hydrated contact data (no additional cards needed or available)
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

  // No existing deck - build fresh deck
  const contacts = await loadContacts(userId);

  if (contacts.length === 0) return [];

  const scored: ScoredContact[] = await Promise.all(
    contacts.map(async (contact) => ({
      contact,
      rhs: await calculateRHS(userId, contact),
      isFresh: isFreshContact(contact),
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

/**
 * Check if user has exhausted their daily deck quota
 * Returns true if deck exists and user should not be able to regenerate
 */
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

  // Quota is exhausted if any deck exists for today
  return existingDeck.rows.length > 0;
};

const getSuggestedChannel = (contact: ProfileContact): ChannelType => {
  const hasPhone = contact.phoneNumbers && contact.phoneNumbers.length > 0;
  const hasEmail = contact.emails && contact.emails.length > 0;
  if (hasPhone) return "sms";
  if (hasEmail) return "email";
  return "call";
};

const getContactReason = (rhs: RHSFactors): string => {
  if (rhs.freshnessBoost > 0) {
    return "New connection - reach out while it's fresh!";
  }
  if (rhs.recencyScore >= 100) {
    return "You haven't connected yet";
  }
  if (rhs.recencyScore >= 80) {
    return "It's been over 3 weeks";
  }
  if (rhs.recencyScore >= 60) {
    return "Time to reconnect";
  }
  return "Keep the momentum going";
};
