import React, { useEffect, useRef } from "react";
import { Dimensions, View, Text } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { useUserProfile } from "@/features/auth/hooks/useUserProfile";
import { emitEvent } from "@/features/shared/utils/eventEmitter";
import { emitImpressionEvent } from "@/features/deck/api/systemEvents.service";
import { DeckCard } from "../types/deck.types";
import Card from "./Card";

interface CardStackProps {
  cards: DeckCard[];
  photoCache: Map<string, string | null>;
  contextTextMap: Map<string, string>;
  onSwipeLeft: (cardId: string) => void;
  onSwipeRight: (cardId: string) => void;
  onTap: (card: DeckCard) => void;
}

const { width } = Dimensions.get("window");

export default function CardStack({
  cards,
  photoCache,
  contextTextMap,
  onSwipeLeft,
  onSwipeRight,
  onTap,
}: CardStackProps) {
  const { profile } = useUserProfile();
  const lastViewedCardRef = useRef<string | null>(null);
  const impressedCardsRef = useRef<Set<string>>(new Set());

  const pendingCards = cards.filter(
    (c) => c.status === "pending" || c.status === "active"
  );
  // Display only the top card (highest RHS priority)
  const visibleCards = pendingCards.slice(0, 1);

  // A1: card_view - Emit when top card changes
  useEffect(() => {
    if (visibleCards.length > 0 && profile) {
      const topCard = visibleCards[0]; // Single card, no need for array index
      const topCardId = topCard.$id;

      // Only emit if this is a new card (not already viewed)
      if (topCardId && topCardId !== lastViewedCardRef.current && topCard.contact?.$id) {
        lastViewedCardRef.current = topCardId;

        emitEvent({
          userId: profile.$id,
          contactId: topCard.contact.$id,
          actionId: 'card_view',
          linkedCardId: topCardId,
          metadata: {
            cardPosition: pendingCards.findIndex((c) => c.$id === topCardId) + 1,
            totalPending: pendingCards.length,
            contactName: topCard.contact.displayName,
          },
        });
      }
    }
  }, [visibleCards, pendingCards, profile]);

  // L1: impression - Emit for visible card (passive exposure)
  useEffect(() => {
    if (visibleCards.length > 0 && profile) {
      const card = visibleCards[0];
      const cardId = card.$id;
      const contactId = card.contact?.$id;

      // Only emit if this card hasn't been impressed yet
      if (cardId && contactId && card.contact && !impressedCardsRef.current.has(cardId)) {
        impressedCardsRef.current.add(cardId);

        // Emit impression event (non-blocking)
        emitImpressionEvent(profile.$id, contactId, cardId, {
          stackPosition: 1, // Always position 1 (only one card visible)
          totalVisible: 1,
          totalPending: pendingCards.length,
          contactName: card.contact.displayName,
        });
      }
    }
  }, [visibleCards, pendingCards, profile]);

  // Get the top card (if any)
  const topCard = visibleCards[0];

  if (!topCard) {
    return (
      <View className="flex-1 items-center justify-center">
        <View className="items-center">
          <Text className="text-gray-500 text-lg">No cards available</Text>
        </View>
      </View>
    );
  }

  const contactId = topCard.contact?.$id || "";
  const photoUri = photoCache.get(contactId) || null;
  const contextText = contextTextMap.get(topCard.$id || "") || "";

  return (
    <View className="flex-1 items-center justify-center">
      <Animated.View
        key={`card-${topCard.$id}`}
        entering={FadeIn.duration(300)}
        exiting={FadeOut.duration(300)}
      >
        <Card
          card={topCard}
          photoUri={photoUri}
          contextText={contextText}
          onSwipeLeft={() => onSwipeLeft(topCard.$id as string)}
          onSwipeRight={() => onSwipeRight(topCard.$id as string)}
          onTap={() => onTap(topCard)}
        />
      </Animated.View>
    </View>
  );
}
