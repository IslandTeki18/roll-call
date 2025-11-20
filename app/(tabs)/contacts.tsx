import { Text, View, ScrollView } from "react-native";
import React from "react";

export default function contacts() {
  return (
    <ScrollView className="flex-1 bg-white">
      <View className="p-4">
        <Text className="text-2xl font-bold mb-4">Contacts</Text>
        <Text className="text-gray-600">No contacts yet</Text>
      </View>
    </ScrollView>
  );
}
