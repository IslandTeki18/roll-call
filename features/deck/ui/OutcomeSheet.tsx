import { View, Text } from "react-native";
export default function OutcomeSheet() {
  return (
    <View className="mt-6 rounded-2xl border border-neutral-200 bg-white p-4">
      <Text className="text-sm font-medium">Outcome</Text>
      <View className="mt-3 h-10 rounded-xl bg-neutral-100 items-center justify-center">
        <Text className="text-sm text-neutral-700">Mark as Done</Text>
      </View>
    </View>
  );
}
