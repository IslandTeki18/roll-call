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
import { contactPhotosService } from "@/features/contacts/api/contactPhotos.service";
import {
  generateContextText,
  calculateDaysSinceEngagement,
} from "../api/contextText.service";
import { getLastEventForContact } from "@/features/messaging/api/engagement.service";

export function useDeck() {
  const { profile } = useUserProfile();
  const { isPremium } = usePremiumGate();
  const [deck, setDeck] = useState<DeckState | null>(null);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [draftsLoading, setDraftsLoading] = useState(false);
  const [draftsError, setDraftsError] = useState<string | null>(null);
  const [quotaExhausted, setQuotaExhausted] = useState(false);
  const [photoCache, setPhotoCache] = useState<Map<string, string | null>>(
    new Map()
  );
  const [contextTextMap, setContextTextMap] = useState<Map<string, string>>(
    new Map()
  );

  useEffect(() => {
    if (profile) {
      loadDeck();
    }
  }, [profile]);

  // Load contact photos and generate context text when deck changes
  useEffect(() => {
    if (!deck || !profile) return;

    const loadPhotosAndContext = async () => {
      // Get all contacts from deck cards
      const contacts = deck.cards
        .map((c) => c.contact)
        .filter((c): c is NonNullable<typeof c> => !!c);

      if (contacts.length === 0) return;

      // Load photos in parallel
      const photos = await contactPhotosService.batchLoadPhotos(contacts);
      setPhotoCache(photos);

      // Generate context text for each card
      const contextMap = new Map<string, string>();

      await Promise.all(
        deck.cards.map(async (card) => {
          if (!card.contact?.$id || !card.$id) return;

          try {
            // Fetch last engagement event for this contact
            const lastEngagement = await getLastEventForContact(
              profile.$id,
              card.contact.$id
            );

            const daysSince = lastEngagement
              ? calculateDaysSinceEngagement(lastEngagement.timestamp)
              : 0;

            const contextText = generateContextText(
              card,
              lastEngagement,
              daysSince
            );

            contextMap.set(card.$id, contextText);
          } catch (error) {
            console.error(
              `Failed to generate context for card ${card.$id}:`,
              error
            );
            // Fallback context
            contextMap.set(
              card.$id,
              "Reach out to reconnect and strengthen your relationship"
            );
          }
        })
      );

      setContextTextMap(contextMap);
    };

    loadPhotosAndContext();
  }, [deck, profile]);

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

        const draft = await generateDraft(
          profile.$id,
          card.contact?.$id as string,
          `${contextString}Write a friendly, contextual message`
        );

        setDrafts([
          {
            id: "1",
            text: draft,
            tone: "casual",
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
    photoCache,
    contextTextMap,
    generateDraftsForCard,
    markCardSent,
    markCardCompleted,
    markCardSkipped,
    markCardSnoozed,
    refreshDeck: loadDeck,
  };
}
