import { Text, View, ScrollView } from "react-native";
import React from "react";
import { SignOutButton } from "../../components/auth/SignOutButton";
import { SafeAreaView } from "react-native-safe-area-context";

export default function index() {
  return (
    <SafeAreaView className="flex-1">
      <ScrollView>
        <View className="flex-1 justify-center items-center p-6">
          <Text className="text-2xl font-bold mb-4">Home Screen</Text>
          <SignOutButton />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
