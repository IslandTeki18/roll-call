import { Text, View, ScrollView } from "react-native";
import React from "react";
import { SignOutButton } from "../../components/auth/SignOutButton";

export default function index() {
  return (
    <ScrollView className="flex-1 bg-white">
      <View className="p-4">
        <Text className="text-2xl font-bold mb-4">Welcome to Roll Call</Text>
        <Text className="text-gray-600 mb-2">Select a tab to get started</Text>
      </View>
      <SignOutButton />
    </ScrollView>
  );
}
