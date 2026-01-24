import { Lock, Settings } from "lucide-react-native";
import React from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";

interface GenerateAIButtonProps {
  onPress: () => void;
  loading: boolean;
  isPremium: boolean;
}

export default function GenerateAIButton({
  onPress,
  loading,
  isPremium,
}: GenerateAIButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={loading}
      className={`flex-row items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 ${
        loading
          ? "border-gray-700 bg-gray-800"
          : "border-blue-500 bg-blue-900"
      }`}
    >
      {loading ? (
        <>
          <ActivityIndicator size="small" color="#3B82F6" />
          <Text className="text-blue-400 font-medium">Generating...</Text>
        </>
      ) : (
        <>
          <Settings size={18} color="#3B82F6" />
          <Text className="text-blue-400 font-medium">Generate with AI</Text>
          {!isPremium && (
            <View className="bg-gray-200 rounded-full p-1">
              <Lock size={12} color="#9CA3AF" />
            </View>
          )}
        </>
      )}
    </TouchableOpacity>
  );
}
