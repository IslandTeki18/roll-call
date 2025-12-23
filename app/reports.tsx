import { Lock } from "lucide-react-native";
import React, { useEffect } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { usePremiumGate } from "../features/auth/hooks/usePremiumGate";

export default function Reports() {
  const { isPremium, requirePremium } = usePremiumGate();

  useEffect(() => {
    if (!isPremium) {
      requirePremium("Reports", () => {
        // TODO: Navigate to paywall
      });
    }
  }, [isPremium]);

  if (!isPremium) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-1 items-center justify-center px-6">
          <View className="bg-gray-200 rounded-full p-6 mb-4">
            <Lock size={48} color="#6B7280" />
          </View>
          <Text className="text-xl font-bold text-gray-900 mb-2">
            Premium Feature
          </Text>
          <Text className="text-gray-600 text-center mb-6">
            Unlock Reports to see your relationship health overview, overdue
            contacts, and streak tracking.
          </Text>
          <TouchableOpacity
            onPress={() => requirePremium("Reports")}
            className="bg-blue-600 px-8 py-4 rounded-xl active:bg-blue-700"
          >
            <Text className="text-white font-semibold">Upgrade to Premium</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1">
      <ScrollView>
        <View className="p-4">
          <Text className="text-2xl font-bold mb-4">Reports</Text>
          <Text className="text-gray-600">Coming soon</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
