import { useCallback, useEffect, useState } from "react";
import { useUserProfile } from "@/features/auth/hooks/useUserProfile"; // Changed import
import { usePremiumGate } from "@/features/auth/hooks/usePremiumGate";
import { DeckState, Draft, DeckCard } from "../types/deck.types";
import { buildDeck } from "../api/deckBuilder.service";
import { generateDraft } from "@/features/messaging/api/drafts.service";

export function useDeck() {
  const { profile } = useUserProfile(); // Changed from useUser
  const { isPremium } = usePremiumGate();
  const [deck, setDeck] = useState<DeckState | null>(null);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [draftsLoading, setDraftsLoading] = useState(false);
  const [draftsError, setDraftsError] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      // Changed from user
      loadDeck();
    }
  }, [profile]); // Changed dependency

  const loadDeck = async () => {
    if (!profile) return; // Changed from user

    setLoading(true);
    try {
      const maxCards = isPremium ? 10 : 5;
      const cards = await buildDeck(profile.clerkUserId, maxCards); // Changed from user.id
      const todayDate = new Date().toISOString().split("T")[0];

      if (cards.length === 0) {
        setDeck(null);
        return;
      }

      setDeck({
        id: `deck-${profile.clerkUserId}-${todayDate}`, // Changed from user.id
        userId: profile.clerkUserId, // Changed from user.id
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

  const generateDraftsForCard = useCallback(
    async (card: DeckCard) => {
      if (!profile) return; // Changed from user

      setDraftsLoading(true);
      setDraftsError(null);
      setDrafts([]);

      // AI draft generation is premium only - free users get static drafts
      if (!isPremium) {
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
        return;
      }

      try {
        const [casualDraft, professionalDraft] = await Promise.all([
          generateDraft(
            profile.clerkUserId,
            card.contact.$id,
            "casual friendly message"
          ), // Changed from user.id
          generateDraft(
            profile.clerkUserId,
            card.contact.$id,
            "professional follow-up"
          ), // Changed from user.id
        ]);

        setDrafts([
          {
            id: "1",
            text: casualDraft,
            tone: "casual",
            channel: card.suggestedChannel,
          },
          {
            id: "2",
            text: professionalDraft,
            tone: "professional",
            channel: card.suggestedChannel,
          },
        ]);
      } catch (error) {
        console.error("Failed to generate drafts:", error);
        setDraftsError("Failed to generate drafts");
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
      } finally {
        setDraftsLoading(false);
      }
    },
    [profile, isPremium] // Changed dependency
  );

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

  const markCardSnoozed = useCallback(
    async (cardId: string) => {
      if (!deck) return;
      setDeck({
        ...deck,
        cards: deck.cards.map((c) =>
          c.id === cardId
            ? { ...c, status: "snoozed", completedAt: new Date().toISOString() }
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
    draftsError,
    generateDraftsForCard,
    markCardCompleted,
    markCardSkipped,
    markCardSnoozed,
    refreshDeck: loadDeck,
  };
}
