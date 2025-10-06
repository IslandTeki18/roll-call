import { View, Text, Image, Pressable } from "react-native";
import { ChevronRight } from "lucide-react-native";
import { DeckCard } from "../types/deck.types";

export default function CardItem({
  card,
  onPress,
}: {
  card: DeckCard;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="mx-4 my-2 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm active:bg-gray-50"
    >
      <View className="flex-row items-center justify-between">
        {/* Left: Avatar + Name + Badge */}
        <View className="flex-row items-center flex-1">
          {card.avatarUrl ? (
            <Image
              source={{ uri: card.avatarUrl }}
              className="h-12 w-12 rounded-full"
            />
          ) : (
            <View className="h-12 w-12 items-center justify-center rounded-full bg-gray-200">
              <Text className="font-semibold text-gray-700 text-lg">
                {card.contactName[0]}
              </Text>
            </View>
          )}

          <View className="ml-3 flex-1">
            <Text className="text-base font-semibold text-gray-900">
              {card.contactName}
            </Text>

            {card.isFresh && (
              <View className="mt-1">
                <View className="bg-emerald-100 px-2 py-0.5 rounded-full self-start">
                  <Text className="text-xs font-semibold text-emerald-700">
                    NEW
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Right: Chevron indicator */}
        <View className="ml-2">
          <ChevronRight size={20} color="#9CA3AF" strokeWidth={2} />
        </View>
      </View>
    </Pressable>
  );
}
