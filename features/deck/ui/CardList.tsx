// CardList.tsx
import React from "react";
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  RefreshControl,
} from "react-native";
import { DeckCard, UserPreferences } from "../model/deck.types";
import { Card } from "./Card";
import { CardOrderingService } from "../lib/cardOrder";

interface CardListProps {
  cards: DeckCard[];
  completedCards: string[];
  onCardPress: (card: DeckCard) => void;
  userPreferences?: UserPreferences;
  refreshing?: boolean;
  onRefresh?: () => void;
}

export const CardList: React.FC<CardListProps> = ({
  cards,
  completedCards,
  onCardPress,
  userPreferences,
  refreshing = false,
  onRefresh,
}) => {
  const freshCards = cards.filter((card) =>
    CardOrderingService.isFreshConnection(card.contact)
  );

  const regularCards = cards.filter(
    (card) => !CardOrderingService.isFreshConnection(card.contact)
  );

  const renderSectionHeader = (title: string, count: number) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.countBadge}>
        <Text style={styles.countText}>{count}</Text>
      </View>
    </View>
  );

  const renderFreshSection = () => {
    if (freshCards.length === 0) return null;

    return (
      <View style={styles.section}>
        {renderSectionHeader("Fresh Connections", freshCards.length)}
        <Text style={styles.sectionSubtitle}>
          New contacts - reach out while they remember you! 🌟
        </Text>
        <View style={styles.cardContainer}>
          {freshCards.map((card, index) => (
            <Card
              key={card.id}
              card={card}
              isCompleted={completedCards.includes(card.id)}
              onPress={() => onCardPress(card)}
              showFreshBadge={true}
              position={index}
              userPreferences={userPreferences}
            />
          ))}
        </View>
      </View>
    );
  };

  const renderRegularSection = () => {
    if (regularCards.length === 0) return null;

    return (
      <View style={styles.section}>
        {renderSectionHeader("Your Network", regularCards.length)}
        <Text style={styles.sectionSubtitle}>
          Time to reach out to these contacts
        </Text>
        <View style={styles.cardContainer}>
          {regularCards.map((card, index) => (
            <Card
              key={card.id}
              card={card}
              isCompleted={completedCards.includes(card.id)}
              onPress={() => onCardPress(card)}
              showFreshBadge={false}
              position={index + freshCards.length}
              userPreferences={userPreferences}
            />
          ))}
        </View>
      </View>
    );
  };

  const renderCompletionState = () => {
    const completedCount = completedCards.length;
    const totalCount = cards.length;

    if (completedCount === totalCount && totalCount > 0) {
      return (
        <View style={styles.completionState}>
          <Text style={styles.completionEmoji}>🎉</Text>
          <Text style={styles.completionTitle}>Deck Complete!</Text>
          <Text style={styles.completionSubtitle}>
            Great job staying connected with your network today.
          </Text>

          {!userPreferences?.isPremium && (
            <View style={styles.upgradeHint}>
              <Text style={styles.upgradeHintText}>
                💡 Upgrade to Premium for 10 cards per day
              </Text>
            </View>
          )}
        </View>
      );
    }

    return null;
  };

  const renderDeckInfo = () => {
    const maxCards = userPreferences?.deckSize || 5;
    const tierLabel = userPreferences?.isPremium ? "Premium" : "Free";

    return (
      <View style={styles.deckInfo}>
        <Text style={styles.deckInfoText}>
          {tierLabel} • {cards.length} of {maxCards} cards today
        </Text>
      </View>
    );
  };

  if (cards.length === 0) {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.emptyContainer}
        refreshControl={
          onRefresh ? (
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          ) : undefined
        }
      >
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>✨</Text>
          <Text style={styles.emptyTitle}>No cards today</Text>
          <Text style={styles.emptySubtitle}>
            Your deck is empty. Pull down to refresh or check back tomorrow for
            new contacts to reach out to.
          </Text>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        ) : undefined
      }
      showsVerticalScrollIndicator={false}
    >
      {renderDeckInfo()}
      {renderFreshSection()}
      {renderRegularSection()}
      {renderCompletionState()}

      {/* Bottom padding for safe scrolling */}
      <View style={styles.bottomPadding} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  scrollContent: {
    paddingTop: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyState: {
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1D1D1F",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: "#8E8E93",
    textAlign: "center",
    lineHeight: 22,
  },
  deckInfo: {
    alignItems: "center",
    paddingVertical: 8,
    marginBottom: 8,
  },
  deckInfoText: {
    fontSize: 12,
    color: "#8E8E93",
    fontWeight: "500",
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1D1D1F",
  },
  countBadge: {
    backgroundColor: "#E5E5E7",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    alignItems: "center",
  },
  countText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1D1D1F",
  },
  sectionSubtitle: {
    fontSize: 14,
    color: "#8E8E93",
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  cardContainer: {
    paddingHorizontal: 20,
    gap: 12,
  },
  completionState: {
    alignItems: "center",
    paddingVertical: 32,
    paddingHorizontal: 40,
    marginTop: 16,
  },
  completionEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  completionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1D1D1F",
    marginBottom: 8,
  },
  completionSubtitle: {
    fontSize: 16,
    color: "#8E8E93",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 20,
  },
  upgradeHint: {
    backgroundColor: "#E8F4FD",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  upgradeHintText: {
    fontSize: 14,
    color: "#007AFF",
    fontWeight: "500",
  },
  bottomPadding: {
    height: 32,
  },
});
