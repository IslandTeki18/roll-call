import React from "react";
import { View, Text, Pressable, StyleSheet, Image } from "react-native";
import { DeckCard, UserPreferences } from "../model/deck.types";
import { CardOrderingService } from "../lib/cardOrder";

interface CardProps {
  card: DeckCard;
  isCompleted: boolean;
  onPress: () => void;
  showFreshBadge: boolean;
  position: number;
  userPreferences?: UserPreferences;
}

export const Card: React.FC<CardProps> = ({
  card,
  isCompleted,
  onPress,
  showFreshBadge,
  position,
  userPreferences,
}) => {
  const { contact, reason, lastTouchContext, suggestedChannels } = card;

  const isFresh = CardOrderingService.isFreshConnection(contact);
  const displayName =
    contact.displayName || `${contact.firstName} ${contact.lastName}`.trim();

  // Get primary channel for display
  const primaryChannel =
    suggestedChannels.find((c) => c.isAvailable) || suggestedChannels[0];

  // Get contact initials for avatar fallback
  const getInitials = (name: string): string => {
    return name
      .split(" ")
      .map((word) => word.charAt(0))
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const renderAvatar = () => {
    if (contact.avatar) {
      return (
        <Image
          source={{ uri: contact.avatar }}
          style={styles.avatar}
          resizeMode="cover"
        />
      );
    }

    return (
      <View style={[styles.avatar, styles.avatarFallback]}>
        <Text style={styles.avatarText}>{getInitials(displayName)}</Text>
      </View>
    );
  };

  const renderFreshBadge = () => {
    if (!isFresh || !showFreshBadge) return null;

    return (
      <View style={styles.freshBadge}>
        <Text style={styles.freshText}>NEW</Text>
      </View>
    );
  };

  const renderPriorityIndicator = () => {
    // Show priority for first 3 cards
    if (position >= 3) return null;

    const colors = ["#FF9500", "#34C759", "#007AFF"]; // Gold, Green, Blue
    const labels = ["High", "Medium", "Low"];

    return (
      <View
        style={[styles.priorityDot, { backgroundColor: colors[position] }]}
      />
    );
  };

  const renderTags = () => {
    if (!contact.tags || contact.tags.length === 0) return null;

    // Show max 2 tags
    const displayTags = contact.tags.slice(0, 2);

    return (
      <View style={styles.tagsContainer}>
        {displayTags.map((tag, index) => (
          <View key={index} style={styles.tag}>
            <Text style={styles.tagText}>{tag}</Text>
          </View>
        ))}
      </View>
    );
  };

  const renderChannelIcon = () => {
    if (!primaryChannel) return null;

    let icon = "📱"; // Default
    switch (primaryChannel.type) {
      case "sms":
        icon = "💬";
        break;
      case "call":
        icon = "📞";
        break;
      case "facetime":
        icon = "📹";
        break;
      case "email":
        icon = "✉️";
        break;
      case "slack":
        icon = "💬";
        break;
      case "whatsapp":
        icon = "📲";
        break;
      case "linkedin":
        icon = "💼";
        break;
    }

    return (
      <View style={styles.channelContainer}>
        <Text style={styles.channelIcon}>{icon}</Text>
        <Text style={styles.channelLabel}>{primaryChannel.label}</Text>
        {primaryChannel.isPremium && !userPreferences?.isPremium && (
          <View style={styles.premiumBadge}>
            <Text style={styles.premiumText}>PRO</Text>
          </View>
        )}
      </View>
    );
  };

  const renderLastTouch = () => {
    if (!lastTouchContext) return null;

    return <Text style={styles.lastTouch}>{lastTouchContext}</Text>;
  };

  const cardStyle = [
    styles.card,
    isCompleted && styles.completedCard,
    isFresh && styles.freshCard,
  ];

  return (
    <Pressable
      style={cardStyle}
      onPress={onPress}
      disabled={isCompleted}
      android_ripple={{ color: "#00000010" }}
    >
      {/* Priority indicator */}
      {renderPriorityIndicator()}

      {/* Fresh badge */}
      {renderFreshBadge()}

      {/* Completed overlay */}
      {isCompleted && (
        <View style={styles.completedOverlay}>
          <Text style={styles.completedIcon}>✓</Text>
        </View>
      )}

      <View style={styles.cardContent}>
        {/* Header */}
        <View style={styles.header}>
          {renderAvatar()}
          <View style={styles.headerText}>
            <Text style={styles.name} numberOfLines={1}>
              {displayName}
            </Text>
            {renderTags()}
          </View>
        </View>

        {/* Reason */}
        <Text style={styles.reason} numberOfLines={2}>
          {reason}
        </Text>

        {/* Context */}
        {renderLastTouch()}

        {/* Footer */}
        <View style={styles.footer}>
          {renderChannelIcon()}
          <View style={styles.rhsContainer}>
            <Text style={styles.rhsLabel}>RHS</Text>
            <Text style={styles.rhsScore}>{Math.round(card.rhsScore)}</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E5E7",
    position: "relative",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  completedCard: {
    opacity: 0.6,
    backgroundColor: "#F8F9FA",
  },
  freshCard: {
    borderColor: "#34C759",
    borderWidth: 2,
  },
  completedOverlay: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#34C759",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  completedIcon: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  freshBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "#34C759",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    zIndex: 2,
  },
  freshText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  priorityDot: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    zIndex: 1,
  },
  cardContent: {
    gap: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarFallback: {
    backgroundColor: "#007AFF",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  headerText: {
    flex: 1,
    gap: 4,
  },
  name: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1D1D1F",
  },
  tagsContainer: {
    flexDirection: "row",
    gap: 6,
  },
  tag: {
    backgroundColor: "#E8F4FD",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tagText: {
    fontSize: 10,
    color: "#007AFF",
    fontWeight: "500",
  },
  reason: {
    fontSize: 14,
    color: "#1D1D1F",
    lineHeight: 20,
  },
  lastTouch: {
    fontSize: 12,
    color: "#8E8E93",
    fontStyle: "italic",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  channelContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  channelIcon: {
    fontSize: 16,
  },
  channelLabel: {
    fontSize: 12,
    color: "#8E8E93",
    fontWeight: "500",
  },
  premiumBadge: {
    backgroundColor: "#FF9500",
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  premiumText: {
    fontSize: 8,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  rhsContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  rhsLabel: {
    fontSize: 10,
    color: "#8E8E93",
    fontWeight: "500",
  },
  rhsScore: {
    fontSize: 14,
    color: "#1D1D1F",
    fontWeight: "600",
  },
});
