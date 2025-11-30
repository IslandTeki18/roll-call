import {
  ProfileContact,
  loadContacts,
} from "@/features/contacts/api/contacts.service";
import { calculateRHS, isFreshContact, RHSFactors } from "./rhs.service";
import { DeckCard } from "../types/deck.types";

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

  const contacts = await loadContacts(userId);

  if (contacts.length === 0) return [];

  // Score all contacts
  const scored: ScoredContact[] = await Promise.all(
    contacts.map(async (contact) => ({
      contact,
      rhs: await calculateRHS(userId, contact),
      isFresh: isFreshContact(contact),
    }))
  );

  // Separate fresh and non-fresh
  const freshContacts = scored.filter((s) => s.isFresh);
  const regularContacts = scored.filter((s) => !s.isFresh);

  // Sort by RHS score descending
  freshContacts.sort((a, b) => b.rhs.totalScore - a.rhs.totalScore);
  regularContacts.sort((a, b) => b.rhs.totalScore - a.rhs.totalScore);

  // Build deck with fresh constraints
  const deck: ScoredContact[] = [];
  const freshCount = Math.min(
    Math.max(FRESH_MIN, Math.min(freshContacts.length, FRESH_MAX)),
    freshContacts.length
  );

  // Add fresh contacts first
  deck.push(...freshContacts.slice(0, freshCount));

  // Fill remaining with regular contacts
  const remaining = maxCards - deck.length;
  deck.push(...regularContacts.slice(0, remaining));

  // If not enough regular, add more fresh
  if (deck.length < maxCards && freshContacts.length > freshCount) {
    const extraFresh = maxCards - deck.length;
    deck.push(...freshContacts.slice(freshCount, freshCount + extraFresh));
  }

  const todayDate = new Date().toISOString().split("T")[0];

  return deck.slice(0, maxCards).map((scored) => ({
    id: `${todayDate}-${scored.contact.$id}`,
    contact: scored.contact,
    status: "pending",
    isFresh: scored.isFresh,
    rhsScore: scored.rhs.totalScore,
    suggestedChannel: getSuggestedChannel(scored.contact),
    reason: getContactReason(scored.contact, scored.rhs),
  }));
};

const getSuggestedChannel = (
  contact: ProfileContact
): "sms" | "call" | "email" => {
  const hasPhone = contact.phoneNumbers && contact.phoneNumbers.length > 0;
  const hasEmail = contact.emails && contact.emails.length > 0;
  if (hasPhone) return "sms";
  if (hasEmail) return "email";
  return "call";
};

const getContactReason = (contact: ProfileContact, rhs: RHSFactors): string => {
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
