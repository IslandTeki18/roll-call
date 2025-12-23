import React from "react";
import { Dimensions, View } from "react-native";
import Animated, { FadeIn, FadeOut, Layout } from "react-native-reanimated";
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
  const pendingCards = cards.filter(
    (c) => c.status === "pending" || c.status === "active"
  );
  // Cards are already sorted by RHS priority (highest first)
  // Take first 3 for stacking, reverse for visual z-index layering
  // This ensures highest priority card is on top
  const visibleCards = pendingCards.slice(0, 3).reverse();

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
