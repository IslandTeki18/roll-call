import { View, Text } from "react-native";
export default function ContactActionsBar() {
  return (
    <View className="border-t border-neutral-200 bg-white p-4">
      <View className="flex-row justify-between">
        <View className="flex-1 rounded-2xl bg-neutral-900 px-4 py-3 mr-2">
          <Text className="text-center text-white text-sm">Import</Text>
        </View>
        <View className="flex-1 rounded-2xl bg-neutral-100 px-4 py-3 ml-2">
          <Text className="text-center text-sm text-neutral-900">Export</Text>
        </View>
      </View>
      <Text className="mt-2 text-center text-[11px] text-neutral-500">
        Device contacts only in free tier
      </Text>
    </View>
  );
}
