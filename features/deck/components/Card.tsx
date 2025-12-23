import {
  AlertCircle,
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
import { isContactNew } from "@/features/contacts/api/contacts.service";

// Urgency tier definitions based on RHS score
type UrgencyTier = "critical" | "high" | "medium" | "low";

interface UrgencyConfig {
  tier: UrgencyTier;
  label: string;
  borderColor: string;
  bgColor: string;
  textColor: string;
  badgeBgColor: string;
  badgeTextColor: string;
  iconColor: string;
}

/**
 * Determines urgency tier and visual styling based on RHS score
 * Higher RHS = More urgent (relationship needs attention)
 */
function getUrgencyConfig(rhsScore: number): UrgencyConfig {
  if (rhsScore >= 70) {
    return {
      tier: "critical",
      label: "URGENT",
      borderColor: "border-red-500",
      bgColor: "bg-red-50",
      textColor: "text-red-700",
      badgeBgColor: "bg-red-500",
      badgeTextColor: "text-white",
      iconColor: "#DC2626",
    };
  }

  if (rhsScore >= 50) {
    return {
      tier: "high",
      label: "HIGH",
      borderColor: "border-orange-500",
      bgColor: "bg-orange-50",
      textColor: "text-orange-700",
      badgeBgColor: "bg-orange-500",
      badgeTextColor: "text-white",
      iconColor: "#EA580C",
    };
  }

  if (rhsScore >= 30) {
    return {
      tier: "medium",
      label: "MEDIUM",
      borderColor: "border-yellow-500",
      bgColor: "bg-yellow-50",
      textColor: "text-yellow-700",
      badgeBgColor: "bg-yellow-500",
      badgeTextColor: "text-white",
      iconColor: "#CA8A04",
    };
  }

  return {
    tier: "low",
    label: "LOW",
    borderColor: "border-green-500",
    bgColor: "bg-green-50",
    textColor: "text-green-700",
    badgeBgColor: "bg-green-500",
    badgeTextColor: "text-white",
    iconColor: "#16A34A",
  };
}

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

  // NEW: Check if contact is still "new" based on engagement state
  const showNewPill = card.contact ? isContactNew(card.contact) : false;

  // Get urgency configuration based on RHS score
  const urgencyConfig = getUrgencyConfig(card.rhsScore);

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
        translateX.value = withSpring(0);
        runOnJS(onSwipeRight)();
      } else if (event.translationX < -SWIPE_THRESHOLD) {
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
        className={`bg-white rounded-2xl shadow-lg border-l-4 ${urgencyConfig.borderColor} ${urgencyConfig.bgColor} p-5 mx-4 ${
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

        {/* Urgency Badge - Top Right Corner */}
        <View className="absolute top-3 right-3 z-10">
          <View
            className={`${urgencyConfig.badgeBgColor} px-2 py-1 rounded-full flex-row items-center gap-1`}
          >
            {urgencyConfig.tier === "critical" && (
              <AlertCircle size={12} color={urgencyConfig.badgeTextColor} />
            )}
            <Text
              className={`${urgencyConfig.badgeTextColor} text-xs font-bold`}
            >
              {urgencyConfig.label}
            </Text>
          </View>
        </View>

        <View className="flex-row items-center mb-4">
          <View className="w-14 h-14 rounded-full bg-blue-100 items-center justify-center mr-3">
            <Text className="text-blue-600 text-xl font-bold">{initials}</Text>
          </View>
          <View className="flex-1">
            <View className="flex-row items-center gap-2 flex-wrap">
              <Text className="text-lg font-semibold">
                {card.contact?.displayName}
              </Text>
              {/* NEW: Show pill only if contact passes isContactNew check */}
              {showNewPill && (
                <View className="bg-purple-100 px-2 py-0.5 rounded-full flex-row items-center gap-1">
                  <Sparkles size={12} color="#7C3AED" />
                  <Text className="text-purple-700 text-xs font-semibold">
                    NEW
                  </Text>
                </View>
              )}
              {/* RHS Score Badge */}
              <View className="bg-gray-200 px-2 py-0.5 rounded-full">
                <Text className="text-gray-700 text-xs font-semibold">
                  RHS: {Math.round(card.rhsScore)}
                </Text>
              </View>
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
