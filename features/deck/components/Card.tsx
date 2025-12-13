// features/deck/components/Card.tsx
import {
  Check,
  Clock,
  MessageSquare,
  Phone,
  Sparkles,
  Video,
} from "lucide-react-native";
import React, { useEffect } from "react";
import { Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { ChannelType, DeckCard } from "../types/deck.types";

interface CardProps {
  card: DeckCard;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  onTap: () => void;
}

const SWIPE_THRESHOLD = 120;

const channelIcons: Record<ChannelType, typeof Phone> = {
  sms: MessageSquare,
  call: Phone,
  facetime: Video,
  email: MessageSquare,
  slack: MessageSquare,
};

export default function Card({
  card,
  onSwipeLeft,
  onSwipeRight,
  onTap,
}: CardProps) {
  const translateX = useSharedValue(0);
  const isCompleted = card.status === "completed" || card.status === "skipped";

  // Reset position when card remounts (e.g., after closing draft picker)
  useEffect(() => {
    translateX.value = 0;
  }, []);

  const panGesture = Gesture.Pan()
    .enabled(!isCompleted)
    .onUpdate((event) => {
      translateX.value = event.translationX;
    })
    .onEnd((event) => {
      if (event.translationX > SWIPE_THRESHOLD) {
        // Swipe right - don't animate off screen, just trigger action
        translateX.value = withSpring(0);
        runOnJS(onSwipeRight)();
      } else if (event.translationX < -SWIPE_THRESHOLD) {
        // Swipe left - animate off screen then trigger action
        translateX.value = withSpring(-400, {}, () => {
          runOnJS(onSwipeLeft)();
        });
      } else {
        translateX.value = withSpring(0);
      }
    });

  const tapGesture = Gesture.Tap()
    .enabled(!isCompleted)
    .onEnd(() => {
      runOnJS(onTap)();
    });

  const composedGesture = Gesture.Race(panGesture, tapGesture);

  const animatedStyle = useAnimatedStyle(() => {
    const rotate = interpolate(translateX.value, [-200, 0, 200], [-15, 0, 15]);
    return {
      transform: [{ translateX: translateX.value }, { rotate: `${rotate}deg` }],
    };
  });

  const leftIndicatorStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, SWIPE_THRESHOLD], [0, 1]),
  }));

  const rightIndicatorStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [-SWIPE_THRESHOLD, 0], [1, 0]),
  }));

  const ChannelIcon = channelIcons[card.suggestedChannel];
  const initials =
    `${card.contact?.firstName?.charAt(0) || ""}${
      card.contact?.lastName?.charAt(0) || ""
    }`.toUpperCase() || "?";

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View
        style={animatedStyle}
        className={`bg-white rounded-2xl shadow-lg border border-gray-200 p-5 mx-4 ${
          isCompleted ? "opacity-50" : ""
        }`}
      >
        <Animated.View
          style={leftIndicatorStyle}
          className="absolute top-4 left-4 bg-green-500 px-3 py-1 rounded-full z-10"
        >
          <Text className="text-white font-semibold text-sm">REACH OUT</Text>
        </Animated.View>
        <Animated.View
          style={rightIndicatorStyle}
          className="absolute top-4 right-4 bg-orange-500 px-3 py-1 rounded-full z-10"
        >
          <Text className="text-white font-semibold text-sm">SKIP</Text>
        </Animated.View>

        {isCompleted && (
          <View className="absolute inset-0 items-center justify-center z-20">
            <View className="bg-green-500 rounded-full p-3">
              <Check size={32} color="white" />
            </View>
          </View>
        )}

        <View className="flex-row items-center mb-4">
          <View className="w-14 h-14 rounded-full bg-blue-100 items-center justify-center mr-3">
            <Text className="text-blue-600 text-xl font-bold">{initials}</Text>
          </View>
          <View className="flex-1">
            <View className="flex-row items-center gap-2">
              <Text className="text-lg font-semibold">
                {card.contact?.displayName}
              </Text>
              {card.isFresh && (
                <View className="bg-purple-100 px-2 py-0.5 rounded-full flex-row items-center gap-1">
                  <Sparkles size={12} color="#7C3AED" />
                  <Text className="text-purple-700 text-xs font-semibold">
                    NEW
                  </Text>
                </View>
              )}
            </View>
            {card.contact?.organization && (
              <Text className="text-gray-500 text-sm">
                {card.contact?.organization}
              </Text>
            )}
          </View>
          <View className="bg-gray-100 p-2 rounded-full">
            <ChannelIcon size={20} color="#6B7280" />
          </View>
        </View>

        <View className="flex-row items-center gap-2 mb-4 bg-amber-50 px-3 py-2 rounded-lg">
          <Clock size={16} color="#D97706" />
          <Text className="text-amber-800 text-sm flex-1">{card.reason}</Text>
        </View>

        <Text className="text-center text-gray-400 text-xs">
          Tap to draft • Swipe right to reach out • Swipe left to skip
        </Text>
      </Animated.View>
    </GestureDetector>
  );
}
