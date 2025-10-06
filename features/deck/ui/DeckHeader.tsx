import { View, Text } from "react-native";
import { CheckCircle2 } from "lucide-react-native";

export default function DeckHeader({
  count,
  total,
}: {
  count: number;
  total: number;
}) {
  const isComplete = count === total;

  return (
    <View className="px-4 pt-12 pb-6">
      {/* Title with completion indicator */}
      <View className="flex-row items-center justify-between">
        <View>
          <Text className="text-3xl font-bold text-gray-900">Today's Deck</Text>
          <Text className="mt-1 text-sm text-gray-600">
            {isComplete ? (
              <Text className="text-emerald-600 font-medium">
                ✨ All done for today!
              </Text>
            ) : (
              `${count} of ${total} completed`
            )}
          </Text>
        </View>

        {isComplete && (
          <CheckCircle2 size={32} color="#10b981" strokeWidth={2} />
        )}
      </View>


      {/* Encouraging microcopy */}
      {!isComplete && count > 0 && (
        <Text className="mt-3 text-xs text-gray-500">
          Keep going! {total - count} {total - count === 1 ? "card" : "cards"}{" "}
          to go
        </Text>
      )}
    </View>
  );
}
