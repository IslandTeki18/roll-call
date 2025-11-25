import { useUser } from "@clerk/clerk-expo";
import { useCallback, useEffect, useState } from "react";
import {
  loadContacts,
  ProfileContact,
} from "../services/contacts.service";
import { DeckCard, DeckState, Draft } from "../types/deck/deck.types";
import { useUserProfile } from "./useUserProfile";

export function useDeck() {
  const { user } = useUser();
  const { profile } = useUserProfile();
  const [deck, setDeck] = useState<DeckState | null>(null);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [draftsLoading, setDraftsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      loadDeck();
    }
  }, [user]);

  const loadDeck = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const contacts = await loadContacts(user.id);
      const maxCards = profile?.isPremiumUser ? 10 : 5;
      const todayDate = new Date().toISOString().split("T")[0];

      if (contacts.length === 0) {
        setDeck(null);
        return;
      }

      // Build deck cards from contacts (TODO: implement RHS scoring/ordering)
      const cards: DeckCard[] = contacts
        .slice(0, maxCards)
        .map((contact, index) => ({
          id: `${todayDate}-${contact.$id}`,
          contact,
          status: "pending",
          isFresh: isFreshContact(contact),
          rhsScore: 50, // TODO: calculate real RHS
          suggestedChannel: getSuggestedChannel(contact),
          reason: getContactReason(contact),
        }));

      setDeck({
        id: `deck-${user.id}-${todayDate}`,
        userId: user.id,
        date: todayDate,
        cards,
        maxCards,
        generatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Failed to load deck:", error);
      setDeck(null);
    } finally {
      setLoading(false);
    }
  };

  const generateDraftsForCard = useCallback(async (card: DeckCard) => {
    setDraftsLoading(true);
    setDrafts([]);

    // TODO: Call AI draft generation service
    setTimeout(() => {
      setDrafts([
        {
          id: "1",
          text: `Hey ${
            card.contact.firstName || "there"
          }! It's been a while - would love to catch up soon. How have you been?`,
          tone: "casual",
          channel: card.suggestedChannel,
        },
        {
          id: "2",
          text: `Hi ${
            card.contact.firstName || "there"
          }, hope you're doing well. I was thinking of you and wanted to reconnect. Let me know if you have time for a quick call.`,
          tone: "professional",
          channel: card.suggestedChannel,
        },
      ]);
      setDraftsLoading(false);
    }, 1500);
  }, []);

  const markCardCompleted = useCallback(
    async (cardId: string) => {
      if (!deck) return;
      setDeck({
        ...deck,
        cards: deck.cards.map((c) =>
          c.id === cardId
            ? {
                ...c,
                status: "completed",
                completedAt: new Date().toISOString(),
              }
            : c
        ),
      });
    },
    [deck]
  );

  const markCardSkipped = useCallback(
    async (cardId: string) => {
      if (!deck) return;
      setDeck({
        ...deck,
        cards: deck.cards.map((c) =>
          c.id === cardId
            ? { ...c, status: "skipped", completedAt: new Date().toISOString() }
            : c
        ),
      });
    },
    [deck]
  );

  return {
    deck,
    loading,
    drafts,
    draftsLoading,
    generateDraftsForCard,
    markCardCompleted,
    markCardSkipped,
    refreshDeck: loadDeck,
  };
}

// Helper: Check if contact is "fresh" (< 14 days since first seen)
function isFreshContact(contact: ProfileContact): boolean {
  if (!contact.firstSeenAt) return false;
  const firstSeen = new Date(contact.firstSeenAt);
  const daysSinceFirstSeen =
    (Date.now() - firstSeen.getTime()) / (1000 * 60 * 60 * 24);
  return daysSinceFirstSeen < 14;
}

// Helper: Determine suggested channel based on contact data
function getSuggestedChannel(
  contact: ProfileContact
): "sms" | "call" | "email" {
  const hasPhone = contact.phoneNumbers && contact.phoneNumbers.length > 0;
  const hasEmail = contact.emails && contact.emails.length > 0;
  if (hasPhone) return "sms";
  if (hasEmail) return "email";
  return "call";
}

// Helper: Generate reason string for card
function getContactReason(contact: ProfileContact): string {
  const firstSeen = new Date(contact.firstSeenAt);
  const daysSinceFirstSeen = Math.floor(
    (Date.now() - firstSeen.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysSinceFirstSeen < 14) {
    return "New connection - reach out while it's fresh!";
  }
  if (daysSinceFirstSeen < 30) {
    return "Added recently - time to follow up";
  }
  return "Haven't connected in a while";
}
