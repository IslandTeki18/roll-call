import { Text, View, ScrollView } from "react-native";
import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";

export default function index() {
  return (
    <SafeAreaView className="flex-1">
      <ScrollView>
        <View className="p-4">
          <Text className="text-2xl font-bold mb-4">Home</Text>
          <Text className="text-gray-600">Not available yet</Text>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
