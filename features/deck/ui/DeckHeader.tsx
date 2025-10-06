import { View, Text } from "react-native";
export default function DeckHeader({
  count,
  total,
}: {
  count: number;
  total: number;
}) {
  return (
    <View className="px-4 pt-12 pb-4">
      <Text className="text-2xl font-bold">Today’s Deck</Text>
      <Text className="mt-1 text-xs text-neutral-500">
        {count}/{total} cards completed
      </Text>
    </View>
  );
}
