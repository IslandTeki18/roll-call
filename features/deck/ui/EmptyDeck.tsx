import { View, Text } from "react-native";
export default function EmptyDeck() {
  return (
    <View className="flex-1 items-center justify-center">
      <Text className="text-lg font-semibold">Deck complete!</Text>
      <Text className="mt-2 text-sm text-neutral-500">
        Come back tomorrow for more cards.
      </Text>
    </View>
  );
}
