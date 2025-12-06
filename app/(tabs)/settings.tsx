import { useRouter } from "expo-router";
import { Lock } from "lucide-react-native";
import React from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { SignOutButton } from "../../features/auth/components/SignOutButton";
import { useUserProfile } from "../../features/auth/hooks/useUserProfile";

export default function Settings() {
  const { profile } = useUserProfile();
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1">
      <ScrollView>
        <View className="p-4">
          <Text className="text-2xl font-bold mb-4">Settings</Text>

          <View className="bg-white rounded-xl p-4 mb-4">
            <Text className="text-sm text-gray-500 mb-1">Email</Text>
            <Text className="text-base">{profile?.email}</Text>
          </View>

          <TouchableOpacity
            onPress={() => router.push("/reports")}
            className="bg-white rounded-xl p-4 mb-4 flex-row items-center justify-between"
          >
            <Text className="text-base font-medium">Reports</Text>
            {!profile?.isPremiumUser && <Lock size={16} color="#9CA3AF" />}
          </TouchableOpacity>

          <SignOutButton />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
