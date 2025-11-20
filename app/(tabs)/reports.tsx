import { Text, View, ScrollView } from "react-native";
import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Reports() {
  return (
    <SafeAreaView className="flex-1">
      <ScrollView>
        <View className="p-4">
          <Text className="text-2xl font-bold mb-4">Reports</Text>
          <Text className="text-gray-600 mb-2">Premium feature</Text>
          <Text className="text-sm text-gray-500">
            Unlock reports with Premium
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
