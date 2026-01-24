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

interface CardProps {
  card: DeckCard;
  photoUri: string | null;
  contextText: string;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  onTap: () => void;
}

const SWIPE_THRESHOLD = 120;
const CARD_HEIGHT = 600;

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
        className="w-[90vw]"
        style={[
          animatedStyle,
          {
            marginBottom: 80,
            height: CARD_HEIGHT,
            borderRadius: 24,
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
        "rgba(0,0,0,0.0)",
        "rgba(0,0,0,0.0)",
        "rgba(0,0,0,0.4)",
        "rgba(0,0,0,0.8)",
      ]}
      locations={[0, 0.4, 0.7, 1]}
      style={{ flex: 1, padding: 28, justifyContent: "flex-end" }}
    >
      {/* Initials (only show if no photo) - centered in card */}
      {!hasPhoto && (
        <View className="absolute inset-0 items-center justify-center">
          <View className="w-40 h-40 rounded-full bg-white/20 items-center justify-center">
            <Text className="text-white text-6xl font-bold">{initials}</Text>
          </View>
        </View>
      )}

      {/* Bottom Section: All content */}
      <View>
        {/* Contact Name */}
        <Text
          className="text-white font-black text-5xl mb-1 uppercase"
          style={{
            textShadowColor: "rgba(0,0,0,0.8)",
            textShadowOffset: { width: 0, height: 2 },
            textShadowRadius: 10,
            letterSpacing: 1,
          }}
        >
          {card.contact?.displayName || "Unknown Contact"}
        </Text>

        {/* Organization Tag */}
        {card.contact?.organization && (
          <Text
            className="text-white/90 text-base mb-3 font-medium"
            style={{
              textShadowColor: "rgba(0,0,0,0.6)",
              textShadowOffset: { width: 0, height: 1 },
              textShadowRadius: 6,
            }}
          >
            {card.contact.organization}
          </Text>
        )}

        {/* RHS Badge and Context in row */}
        <View className="flex-row items-end justify-between">
          {/* Context Text */}
          <Text
            className="text-white/95 text-sm leading-5 flex-1 mr-3"
            style={{
              textShadowColor: "rgba(0,0,0,0.8)",
              textShadowOffset: { width: 0, height: 2 },
              textShadowRadius: 8,
            }}
          >
            {contextText}
          </Text>

          {/* RHS Badge */}
          <View className="flex-row items-center gap-1">
            <Flame size={20} color="#FFFFFF" />
            <Text
              className="text-white text-2xl font-bold"
              style={{
                textShadowColor: "rgba(0,0,0,0.6)",
                textShadowOffset: { width: 0, height: 1 },
                textShadowRadius: 6,
              }}
            >
              {Math.round(card.rhsScore)}
            </Text>
          </View>
        </View>
      </View>
    </LinearGradient>
  );
}
