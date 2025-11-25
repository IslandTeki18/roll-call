import { PartyPopper, Sparkles, Trophy } from "lucide-react-native";
import React from "react";
import { Modal, Text, TouchableOpacity, View } from "react-native";
import Animated, { FadeIn, ZoomIn } from "react-native-reanimated";

interface DeckCompleteModalProps {
  visible: boolean;
  onClose: () => void;
  completedCount: number;
  streak?: number;
}

export default function DeckCompleteModal({
  visible,
  onClose,
  completedCount,
  streak = 1,
}: DeckCompleteModalProps) {
  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/60 items-center justify-center px-6">
        <Animated.View
          entering={ZoomIn.duration(300).springify()}
          className="bg-white rounded-3xl w-full max-w-sm overflow-hidden"
        >
          {/* Confetti header */}
          <View className="bg-gradient-to-br from-purple-500 to-blue-500 py-8 items-center">
            <Animated.View entering={FadeIn.delay(200)}>
              <View className="bg-white/20 rounded-full p-4 mb-4">
                <PartyPopper size={48} color="white" />
              </View>
            </Animated.View>
            <Text className="text-white text-2xl font-bold">
              Deck Complete!
            </Text>
            <Text className="text-white/80 mt-1">
              You&apos;re all caught up for today
            </Text>
          </View>

          {/* Stats */}
          <View className="px-6 py-6">
            <View className="flex-row gap-4 mb-6">
              <View className="flex-1 bg-green-50 rounded-xl p-4 items-center">
                <Sparkles size={24} color="#10B981" />
                <Text className="text-2xl font-bold text-green-600 mt-2">
                  {completedCount}
                </Text>
                <Text className="text-sm text-green-700">Connections</Text>
              </View>
              <View className="flex-1 bg-orange-50 rounded-xl p-4 items-center">
                <Trophy size={24} color="#F97316" />
                <Text className="text-2xl font-bold text-orange-600 mt-2">
                  {streak}
                </Text>
                <Text className="text-sm text-orange-700">Day Streak</Text>
              </View>
            </View>

            <Text className="text-center text-gray-600 mb-6">
              Great job staying connected! Your relationships are getting
              stronger.
            </Text>

            <TouchableOpacity
              onPress={onClose}
              className="bg-blue-600 py-4 rounded-xl active:bg-blue-700"
            >
              <Text className="text-white text-center font-semibold text-base">
                Done
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}
