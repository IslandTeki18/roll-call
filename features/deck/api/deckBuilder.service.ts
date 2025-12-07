import {
  ProfileContact,
  loadContacts,
} from "@/features/contacts/api/contacts.service";
import { calculateRHS, isFreshContact, RHSFactors } from "./rhs.service";
import { DeckCard, ChannelType } from "../types/deck.types";
import { databases } from "@/features/shared/lib/appwrite";
import { ID, Query } from "react-native-appwrite";

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
  maxCards: number
): Promise<DeckCard[]> => {
  const todayDate = new Date().toISOString().split("T")[0];

  // Check if deck already exists for today
  const existingDeck = await databases.listDocuments(
    DATABASE_ID,
    DECK_CARDS_TABLE_ID,
    [Query.equal("userId", userId), Query.equal("date", todayDate)]
  );

  if (existingDeck.documents.length > 0) {
    // Return existing deck cards
    return existingDeck.documents.map((doc: any) => ({
      id: doc.cardId,
      $id: doc.$id,
      userId: doc.userId,
      cardId: doc.cardId,
      contactId: doc.contactId,
      date: doc.date,
      contact: { $id: doc.contactId } as ProfileContact,
      status: doc.status,
      draftedAt: doc.draftedAt || undefined,
      sentAt: doc.sentAt || undefined,
      isFresh: doc.isFresh,
      rhsScore: doc.rhsScore,
      suggestedChannel: doc.suggestedChannel,
      reason: doc.reason,
      linkedOutcomeId: doc.linkedOutcomeId || undefined,
      completedAt: doc.completedAt || undefined,
      linkedEngagementEventId: doc.linkedEngagementEventId || undefined,
      outcomeId: doc.outcomeId || undefined,
    }));
  }

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

      const doc = await databases.createDocument(
        DATABASE_ID,
        DECK_CARDS_TABLE_ID,
        ID.unique(),
        {
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
        }
      );

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
