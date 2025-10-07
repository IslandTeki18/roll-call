import { View, Text, Pressable, Alert } from "react-native";

export default function ContactActionsBar() {
  const handleImport = () => {
    // TODO: Hook up to actual contact import logic
    Alert.alert(
      "Import Contacts",
      "This will request permission to access your device contacts.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Continue",
          onPress: () => console.log("Import contacts"),
        },
      ]
    );
  };

  const handleExport = () => {
    // TODO: Hook up to actual export logic
    Alert.alert(
      "Export Contacts",
      "Export your RollCall contacts as a CSV file.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Export",
          onPress: () => console.log("Export contacts"),
        },
      ]
    );
  };

  return (
    <View className="absolute bottom-0 left-0 right-0 border-t border-neutral-200 bg-white pb-8 pt-4 px-4">
      <View className="flex-row gap-3">
        {/* Import Button - Primary */}
        <Pressable
          onPress={handleImport}
          className="flex-1 rounded-2xl bg-neutral-900 px-4 py-3.5 active:opacity-80"
        >
          {({ pressed }) => (
            <View className="flex-row items-center justify-center">
              <Text className="mr-2 text-base">📥</Text>
              <Text className="text-center text-sm font-semibold text-white">
                Import
              </Text>
            </View>
          )}
        </Pressable>

        {/* Export Button - Secondary */}
        <Pressable
          onPress={handleExport}
          className="flex-1 rounded-2xl bg-neutral-100 px-4 py-3.5 active:bg-neutral-200"
        >
          {({ pressed }) => (
            <View className="flex-row items-center justify-center">
              <Text className="mr-2 text-base">📤</Text>
              <Text className="text-center text-sm font-semibold text-neutral-900">
                Export
              </Text>
            </View>
          )}
        </Pressable>
      </View>

      {/* Info Text */}
      <View className="mt-3 flex-row items-center justify-center">
        <Text className="text-[11px] text-neutral-400">
          Device contacts only
        </Text>
        <View className="mx-2 h-1 w-1 rounded-full bg-neutral-300" />
        <Pressable
          onPress={() =>
            Alert.alert(
              "Premium",
              "Upgrade to connect Google, Outlook, and Slack contacts."
            )
          }
          className="active:opacity-60"
        >
          <Text className="text-[11px] font-medium text-neutral-600">
            Upgrade for more
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
