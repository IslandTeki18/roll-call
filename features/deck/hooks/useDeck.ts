import { usePremiumGate } from "@/features/auth/hooks/usePremiumGate";
import { useUserProfile } from "@/features/auth/hooks/useUserProfile";
import { generateDraft } from "@/features/messaging/api/drafts.service";
import { useCallback, useEffect, useState } from "react";
import { buildDeck, isDailyQuotaExhausted } from "../api/deckBuilder.service";
import {
  markCardDrafted as persistCardDrafted,
  markCardSent as persistCardSent,
  markCardCompleted as persistCardCompleted,
  markCardSkipped as persistCardSkipped,
} from "../api/deck.mutations";
import { DeckCard, DeckState, Draft } from "../types/deck.types";
import { getContactRecommendations } from "@/features/messaging/api/recommendations.service";

export function useDeck() {
  const { profile } = useUserProfile();
  const { isPremium } = usePremiumGate();
  const [deck, setDeck] = useState<DeckState | null>(null);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [draftsLoading, setDraftsLoading] = useState(false);
  const [draftsError, setDraftsError] = useState<string | null>(null);
  const [quotaExhausted, setQuotaExhausted] = useState(false);

  useEffect(() => {
    if (profile) {
      loadDeck();
    }
  }, [profile]);

  const loadDeck = async () => {
    if (!profile) return;

    setLoading(true);
    try {
      const maxCards = profile.isPremiumUser ? 10 : 5;

      const exhausted = await isDailyQuotaExhausted(profile.$id);
      setQuotaExhausted(exhausted);

      const cards = await buildDeck(
        profile.$id,
        maxCards,
        profile.isPremiumUser
      );
      const todayDate = new Date().toISOString().split("T")[0];

      if (cards.length === 0) {
        setDeck(null);
        return;
      }

      setDeck({
        userId: profile.$id,
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
      if (!profile) return;

      setDraftsLoading(true);
      setDraftsError(null);
      setDrafts([]);

      try {
        await persistCardDrafted(card.$id as string);
      } catch (error) {
        console.error("Failed to persist drafted timestamp:", error);
      }

      if (!isPremium) {
        setDrafts([
          {
            id: "1",
            text: `Hey ${
              (card.contact?.firstName as string) || "there"
            }! It's been a while - would love to catch up soon. How have you been?`,
            tone: "casual",
            channel: card.suggestedChannel,
          },
          {
            id: "2",
            text: `Hi ${
              (card.contact?.firstName as string) || "there"
            }, hope you're doing well. I was thinking of you and wanted to reconnect. Let me know if you have time for a quick call.`,
            tone: "professional",
            channel: card.suggestedChannel,
          },
        ]);
        setDraftsLoading(false);
        return;
      }

      try {
        const recommendations = await getContactRecommendations(
          profile.$id,
          card.contact?.$id as string,
          card.contact
        );

        const contextString = recommendations.conversationContext
          ? `Context: ${recommendations.conversationContext}. `
          : "";

        const [casualDraft, professionalDraft] = await Promise.all([
          generateDraft(
            profile.$id,
            card.contact?.$id as string,
            `${contextString}Write a casual, friendly message`
          ),
          generateDraft(
            profile.$id,
            card.contact?.$id as string,
            `${contextString}Write a professional follow-up message`
          ),
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
              (card.contact?.firstName as string) || "there"
            }! It's been a while - would love to catch up soon. How have you been?`,
            tone: "casual",
            channel: card.suggestedChannel,
          },
          {
            id: "2",
            text: `Hi ${
              (card.contact?.firstName as string) || "there"
            }, hope you're doing well. I was thinking of you and wanted to reconnect. Let me know if you have time for a quick call.`,
            tone: "professional",
            channel: card.suggestedChannel,
          },
        ]);
      } finally {
        setDraftsLoading(false);
      }
    },
    [profile, isPremium]
  );

  const markCardSent = useCallback(
    async (cardId: string, engagementEventId: string) => {
      try {
        await persistCardSent(cardId, engagementEventId);
      } catch (error) {
        console.error("Failed to persist sent timestamp:", error);
      }
    },
    []
  );

  const markCardCompleted = useCallback(
    async (cardId: string, outcomeId?: string) => {
      if (!deck) return;

      try {
        await persistCardCompleted(cardId, outcomeId);
      } catch (error) {
        console.error("Failed to persist completed timestamp:", error);
      }

      setDeck({
        ...deck,
        cards: deck.cards.map((c) =>
          c.$id === cardId
            ? {
                ...c,
                status: "completed",
                completedAt: new Date().toISOString(),
                outcomeId,
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

      try {
        await persistCardSkipped(cardId);
      } catch (error) {
        console.error("Failed to persist skipped timestamp:", error);
      }

      setDeck({
        ...deck,
        cards: deck.cards.map((c) =>
          c.$id === cardId
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
          c.$id === cardId
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
    quotaExhausted,
    generateDraftsForCard,
    markCardSent,
    markCardCompleted,
    markCardSkipped,
    markCardSnoozed,
    refreshDeck: loadDeck,
  };
}
