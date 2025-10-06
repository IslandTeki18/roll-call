import { View, Text } from "react-native";
export default function PermissionBanner() {
  return (
    <View className="m-4 rounded-2xl border border-neutral-300 bg-neutral-50 p-4">
      <Text className="text-sm font-medium">Contacts permission needed</Text>
      <Text className="mt-1 text-xs text-neutral-600">
        Enable access in system settings to import your device contacts.
      </Text>
      <View className="mt-3 rounded-xl bg-neutral-200 px-4 py-2">
        <Text className="text-center text-sm text-neutral-600">
          Request Permission
        </Text>
      </View>
    </View>
  );
}
