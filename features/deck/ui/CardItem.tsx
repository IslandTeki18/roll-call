import { View, Text, Image, Pressable } from "react-native";
import { ChevronRight, Sparkles } from "lucide-react-native";
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
      className="mx-4 my-2 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm active:scale-[0.98]"
      style={{
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
      }}
    >
      <View className="flex-row items-center justify-between">
        {/* Left: Avatar + Name + Metadata */}
        <View className="flex-row items-center flex-1">
          {/* Avatar with Fresh indicator */}
          <View className="relative">
            {card.avatarUrl ? (
              <Image
                source={{ uri: card.avatarUrl }}
                className="h-14 w-14 rounded-full"
              />
            ) : (
              <View className="h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-blue-600">
                <Text className="font-bold text-white text-xl">
                  {card.contactName[0]}
                </Text>
              </View>
            )}

            {/* Fresh sparkle indicator */}
            {card.isFresh && (
              <View className="absolute top-1 right-1 bg-emerald-500 rounded-full p-1">
                <Sparkles size={12} color="#FFFFFF" strokeWidth={3} />
              </View>
            )}
          </View>

          <View className="ml-4 flex-1">
            {/* Name */}
            <Text className="text-base font-semibold text-gray-900">
              {card.contactName}
            </Text>

            {/* Fresh Badge */}
            {card.isFresh && (
              <View className="mt-1.5 flex-row items-center">
                <View className="bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                  <Text className="text-xs font-bold text-emerald-700 tracking-wide">
                    NEW CONNECTION
                  </Text>
                </View>
              </View>
            )}

            {/* Last touch context (for non-fresh) */}
            {!card.isFresh && card.lastTouch && (
              <Text className="mt-1 text-xs text-gray-500">
                Last touch: {card.lastTouch}
              </Text>
            )}

            {/* Tags preview */}
            {card.tags && card.tags.length > 0 && (
              <View className="mt-1.5 flex-row items-center">
                <Text className="text-xs text-gray-400">
                  {card.tags.slice(0, 2).join(" · ")}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Right: Chevron with subtle background */}
        <View className="ml-3 bg-gray-50 rounded-full p-2">
          <ChevronRight size={20} color="#6B7280" strokeWidth={2.5} />
        </View>
      </View>
    </Pressable>
  );
}
