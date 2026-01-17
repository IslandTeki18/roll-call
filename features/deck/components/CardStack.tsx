import React, { useEffect, useRef } from "react";
import { Dimensions, View } from "react-native";
import Animated, { FadeIn, FadeOut, Layout } from "react-native-reanimated";
import { useUserProfile } from "@/features/auth/hooks/useUserProfile";
import { emitEvent } from "@/features/shared/utils/eventEmitter";
import { DeckCard } from "../types/deck.types";
import Card from "./Card";

interface CardStackProps {
  cards: DeckCard[];
  onSwipeLeft: (cardId: string) => void;
  onSwipeRight: (cardId: string) => void;
  onTap: (card: DeckCard) => void;
}

const { width } = Dimensions.get("window");

export default function CardStack({
  cards,
  onSwipeLeft,
  onSwipeRight,
  onTap,
}: CardStackProps) {
  const { profile } = useUserProfile();
  const lastViewedCardRef = useRef<string | null>(null);

  const pendingCards = cards.filter(
    (c) => c.status === "pending" || c.status === "active"
  );
  // Cards are already sorted by RHS priority (highest first)
  // Take first 3 for stacking, reverse for visual z-index layering
  // This ensures highest priority card is on top
  const visibleCards = pendingCards.slice(0, 3).reverse();

  // A1: card_view - Emit when top card changes
  useEffect(() => {
    if (visibleCards.length > 0 && profile) {
      const topCard = visibleCards[visibleCards.length - 1];
      const topCardId = topCard.$id;

      // Only emit if this is a new card (not already viewed)
      if (topCardId !== lastViewedCardRef.current && topCard.contact?.$id) {
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

  return (
    <View className="flex-1 items-center justify-center" style={{ width }}>
      {visibleCards.map((card, index) => {
        const isTop = index === visibleCards.length - 1;
        const scale = 1 - (visibleCards.length - 1 - index) * 0.05;
        const translateY = (visibleCards.length - 1 - index) * 8;
        return (
          <Animated.View
            key={`card-${card.contact?.$id}`}
            entering={FadeIn.duration(200)}
            exiting={FadeOut.duration(200)}
            layout={Layout.springify()}
            style={{
              position: "absolute",
              transform: [{ scale }, { translateY }],
              zIndex: index,
            }}
            pointerEvents={isTop ? "auto" : "none"}
          >
            <Card
              card={card}
              onSwipeLeft={() => onSwipeLeft(card.$id as string)}
              onSwipeRight={() => onSwipeRight(card.$id as string)}
              onTap={() => onTap(card)}
            />
          </Animated.View>
        );
      })}
    </View>
  );
}
