import {
  Check,
  Flame,
} from "lucide-react-native";
import React, { useEffect } from "react";
import { Text, View, ImageBackground } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { DeckCard } from "../types/deck.types";

// Urgency tier definitions based on RHS score
type UrgencyTier = "critical" | "high" | "medium" | "low";

interface UrgencyConfig {
  tier: UrgencyTier;
  shadowColor: string;
  shadowRadius: number;
}

/**
 * Determines urgency tier and shadow glow based on RHS score
 * Higher RHS = More urgent (relationship needs attention)
 */
function getUrgencyConfig(rhsScore: number): UrgencyConfig {
  if (rhsScore >= 70) {
    return {
      tier: "critical",
      shadowColor: "#DC2626", // Red
      shadowRadius: 12,
    };
  }

  if (rhsScore >= 50) {
    return {
      tier: "high",
      shadowColor: "#EA580C", // Orange
      shadowRadius: 12,
    };
  }

  if (rhsScore >= 30) {
    return {
      tier: "medium",
      shadowColor: "#CA8A04", // Yellow
      shadowRadius: 12,
    };
  }

  return {
    tier: "low",
    shadowColor: "#16A34A", // Green
    shadowRadius: 12,
  };
}

interface CardProps {
  card: DeckCard;
  photoUri: string | null;
  contextText: string;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  onTap: () => void;
}

const SWIPE_THRESHOLD = 120;
const CARD_HEIGHT = 500;

export default function Card({
  card,
  photoUri,
  contextText,
  onSwipeLeft,
  onSwipeRight,
  onTap,
}: CardProps) {
  const translateX = useSharedValue(0);
  const isCompleted = card.status === "completed" || card.status === "skipped";

  // Get urgency configuration for shadow glow
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

  // Generate initials for fallback
  const initials =
    `${card.contact?.firstName?.charAt(0) || ""}${
      card.contact?.lastName?.charAt(0) || ""
    }`.toUpperCase() || "?";

  // Determine background source (photo or fallback gradient)
  const hasPhoto = !!photoUri;

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View
        style={[
          animatedStyle,
          {
            marginHorizontal: 16,
            height: CARD_HEIGHT,
            borderRadius: 24,
            shadowColor: urgencyConfig.shadowColor,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: urgencyConfig.shadowRadius,
            elevation: 8,
          },
          isCompleted && { opacity: 0.5 },
        ]}
      >
        {/* Swipe Indicators */}
        <Animated.View
          style={leftIndicatorStyle}
          className="absolute top-4 left-4 bg-green-500 px-3 py-1 rounded-full z-30"
        >
          <Text className="text-white font-semibold text-sm">REACH OUT</Text>
        </Animated.View>
        <Animated.View
          style={rightIndicatorStyle}
          className="absolute top-4 right-4 bg-orange-500 px-3 py-1 rounded-full z-30"
        >
          <Text className="text-white font-semibold text-sm">SKIP</Text>
        </Animated.View>

        {/* Completion Checkmark */}
        {isCompleted && (
          <View className="absolute inset-0 items-center justify-center z-40 rounded-3xl overflow-hidden">
            <View className="bg-green-500/80 rounded-full p-4">
              <Check size={48} color="white" />
            </View>
          </View>
        )}

        {/* Photo Background or Gradient Fallback */}
        {hasPhoto ? (
          <ImageBackground
            source={{ uri: photoUri }}
            style={{ flex: 1, borderRadius: 24, overflow: "hidden" }}
            imageStyle={{ borderRadius: 24 }}
          >
            <CardContent
              card={card}
              contextText={contextText}
              initials={initials}
              hasPhoto={hasPhoto}
            />
          </ImageBackground>
        ) : (
          <LinearGradient
            colors={["#3B82F6", "#8B5CF6", "#EC4899"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ flex: 1, borderRadius: 24 }}
          >
            <CardContent
              card={card}
              contextText={contextText}
              initials={initials}
              hasPhoto={hasPhoto}
            />
          </LinearGradient>
        )}
      </Animated.View>
    </GestureDetector>
  );
}

/**
 * Card content with gradient overlay and text
 */
function CardContent({
  card,
  contextText,
  initials,
  hasPhoto,
}: {
  card: DeckCard;
  contextText: string;
  initials: string;
  hasPhoto: boolean;
}) {
  return (
    <LinearGradient
      colors={[
        "rgba(0,0,0,0.6)",
        "rgba(0,0,0,0.3)",
        "rgba(0,0,0,0.1)",
        "rgba(0,0,0,0.4)",
      ]}
      locations={[0, 0.3, 0.6, 1]}
      style={{ flex: 1, padding: 24, justifyContent: "space-between" }}
    >
      {/* Top Section: Name and Organization */}
      <View>
        {/* Contact Name */}
        <Text
          className="text-white font-bold text-4xl mb-2"
          style={{
            textShadowColor: "rgba(0,0,0,0.8)",
            textShadowOffset: { width: 0, height: 2 },
            textShadowRadius: 8,
          }}
        >
          {card.contact?.displayName || "Unknown Contact"}
        </Text>

        {/* Organization Pill */}
        {card.contact?.organization && (
          <View className="bg-white/20 self-start px-3 py-1.5 rounded-full backdrop-blur-sm">
            <Text
              className="text-white text-sm font-medium"
              style={{
                textShadowColor: "rgba(0,0,0,0.5)",
                textShadowOffset: { width: 0, height: 1 },
                textShadowRadius: 4,
              }}
            >
              {card.contact.organization}
            </Text>
          </View>
        )}

        {/* Initials (only show if no photo) */}
        {!hasPhoto && (
          <View className="mt-8 w-32 h-32 rounded-full bg-white/20 items-center justify-center self-center">
            <Text className="text-white text-5xl font-bold">{initials}</Text>
          </View>
        )}
      </View>

      {/* Bottom Section: RHS Badge and Context */}
      <View>
        {/* RHS Badge (Bottom-Right) */}
        <View className="flex-row justify-end mb-3">
          <View className="bg-white/20 flex-row items-center gap-2 px-3 py-2 rounded-full backdrop-blur-sm">
            <Flame size={24} color="#FFFFFF" />
            <Text
              className="text-white text-lg font-bold"
              style={{
                textShadowColor: "rgba(0,0,0,0.5)",
                textShadowOffset: { width: 0, height: 1 },
                textShadowRadius: 4,
              }}
            >
              {Math.round(card.rhsScore)}
            </Text>
          </View>
        </View>

        {/* Context Text */}
        <Text
          className="text-white text-base leading-5"
          style={{
            textShadowColor: "rgba(0,0,0,0.8)",
            textShadowOffset: { width: 0, height: 2 },
            textShadowRadius: 8,
          }}
        >
          {contextText}
        </Text>

        {/* Instruction Text */}
        <Text
          className="text-white/60 text-xs text-center mt-4"
          style={{
            textShadowColor: "rgba(0,0,0,0.5)",
            textShadowOffset: { width: 0, height: 1 },
            textShadowRadius: 4,
          }}
        >
          Tap to draft • Swipe right to reach out • Swipe left to skip
        </Text>
      </View>
    </LinearGradient>
  );
}
