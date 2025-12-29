import { useRouter } from "expo-router";
import { Lock, HomeIcon, UsersIcon, ChevronRight } from "lucide-react-native";
import React from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { SignOutButton } from "../../features/auth/components/SignOutButton";
import { useUserProfile } from "../../features/auth/hooks/useUserProfile";

export default function Settings() {
  const { profile } = useUserProfile();
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView>
        <View className="p-4">
          <Text className="text-2xl font-bold mb-6">Settings</Text>

          {/* Account Section */}
          <View className="mb-6">
            <Text className="text-sm font-semibold text-gray-500 uppercase mb-3 px-1">
              Account
            </Text>
            <View className="bg-white rounded-xl p-4 mb-2">
              <Text className="text-sm text-gray-500 mb-1">Email</Text>
              <Text className="text-base">{profile?.email}</Text>
            </View>
          </View>

          {/* Navigation Section */}
          <View className="mb-6">
            <Text className="text-sm font-semibold text-gray-500 uppercase mb-3 px-1">
              Navigation
            </Text>
            <View className="bg-white rounded-xl overflow-hidden">
              <TouchableOpacity
                onPress={() => router.push("/(tabs)")}
                className="p-4 flex-row items-center justify-between border-b border-gray-100"
              >
                <View className="flex-row items-center gap-3">
                  <HomeIcon size={20} color="#3B82F6" />
                  <Text className="text-base font-medium">Home</Text>
                </View>
                <ChevronRight size={20} color="#9CA3AF" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.push("/(tabs)/contacts")}
                className="p-4 flex-row items-center justify-between"
              >
                <View className="flex-row items-center gap-3">
                  <UsersIcon size={20} color="#10B981" />
                  <Text className="text-base font-medium">Contacts</Text>
                </View>
                <ChevronRight size={20} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Premium Features Section */}
          <View className="mb-6">
            <Text className="text-sm font-semibold text-gray-500 uppercase mb-3 px-1">
              Premium Features
            </Text>
            <View className="bg-white rounded-xl overflow-hidden">
              <TouchableOpacity
                onPress={() => router.push("/reports")}
                className="p-4 flex-row items-center justify-between"
              >
                <View className="flex-row items-center gap-3">
                  <Text className="text-base font-medium">Reports</Text>
                  {!profile?.isPremiumUser && (
                    <Lock size={16} color="#9CA3AF" />
                  )}
                </View>
                <ChevronRight size={20} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
          </View>

          <SignOutButton />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
