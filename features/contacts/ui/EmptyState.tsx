import { View, Text } from "react-native";
export default function EmptyState() {
  return (
    <View className="items-center justify-center px-6 py-16">
      <Text className="text-lg font-semibold">No contacts yet</Text>
      <Text className="mt-2 text-center text-sm text-neutral-600">
        Import your device contacts to get started.
      </Text>
    </View>
  );
}
