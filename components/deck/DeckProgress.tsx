import { Check } from "lucide-react-native";
import React from "react";
import { Text, View } from "react-native";
import { DeckCard } from "../../types/deck/deck.types";

interface DeckProgressProps {
  cards: DeckCard[];
  maxCards: number;
}

export default function DeckProgress({ cards, maxCards }: DeckProgressProps) {
  const completedCount = cards.filter(
    (c) => c.status === "completed" || c.status === "skipped"
  ).length;

  return (
    <View className="px-6 py-4">
      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-gray-600 font-medium">Today&apos;s Progress</Text>
        <Text className="text-gray-900 font-semibold">
          {completedCount} / {maxCards}
        </Text>
      </View>
      <View className="flex-row gap-2">
        {Array.from({ length: maxCards }).map((_, index) => {
          const card = cards[index];
          const isCompleted =
            card && (card.status === "completed" || card.status === "skipped");
          const isActive = card && card.status === "active";
          const isPending = card && card.status === "pending";

          return (
            <View
              key={index}
              className={`flex-1 h-10 rounded-lg items-center justify-center ${
                isCompleted
                  ? "bg-green-500"
                  : isActive
                  ? "bg-blue-500"
                  : isPending
                  ? "bg-gray-200"
                  : "bg-gray-100 border border-dashed border-gray-300"
              }`}
            >
              {isCompleted && <Check size={18} color="white" />}
            </View>
          );
        })}
      </View>
    </View>
  );
}
