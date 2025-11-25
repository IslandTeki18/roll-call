import { Coffee, RefreshCw } from "lucide-react-native";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";

interface EmptyDeckProps {
  reason: "no_contacts" | "all_completed" | "generating";
  onImportContacts?: () => void;
  onRefresh?: () => void;
}

export default function EmptyDeck({
  reason,
  onImportContacts,
  onRefresh,
}: EmptyDeckProps) {
  if (reason === "generating") {
    return (
      <View className="flex-1 items-center justify-center px-6">
        <RefreshCw size={48} color="#3B82F6" className="animate-spin" />
        <Text className="text-lg font-semibold text-gray-900 mt-4">
          Building your deck...
        </Text>
        <Text className="text-gray-500 text-center mt-2">
          We&apos;re picking the best contacts for you to reach out to today.
        </Text>
      </View>
    );
  }

  if (reason === "no_contacts") {
    return (
      <View className="flex-1 items-center justify-center px-6">
        <View className="bg-gray-100 rounded-full p-6 mb-4">
          <Coffee size={48} color="#6B7280" />
        </View>
        <Text className="text-lg font-semibold text-gray-900 mt-4">
          No contacts yet
        </Text>
        <Text className="text-gray-500 text-center mt-2">
          Import your contacts to start building meaningful connections.
        </Text>
        {onImportContacts && (
          <TouchableOpacity
            onPress={onImportContacts}
            className="mt-6 bg-blue-600 px-6 py-3 rounded-xl active:bg-blue-700"
          >
            <Text className="text-white font-semibold">Import Contacts</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  // all_completed
  return (
    <View className="flex-1 items-center justify-center px-6">
      <View className="bg-green-100 rounded-full p-6 mb-4">
        <Coffee size={48} color="#10B981" />
      </View>
      <Text className="text-lg font-semibold text-gray-900 mt-4">
        You&apos;re all done!
      </Text>
      <Text className="text-gray-500 text-center mt-2">
        Come back tomorrow for a fresh deck of connections.
      </Text>
      {onRefresh && (
        <TouchableOpacity
          onPress={onRefresh}
          className="mt-6 flex-row items-center gap-2 px-6 py-3 border border-gray-300 rounded-xl active:bg-gray-50"
        >
          <RefreshCw size={18} color="#6B7280" />
          <Text className="text-gray-700 font-medium">Refresh</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
