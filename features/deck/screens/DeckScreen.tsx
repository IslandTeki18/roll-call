// DeckScreen.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Pressable,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useTodaysDeck, useUserPreferences } from "./deck.queries";
import { useCompleteCard, useSkipCard, useRefreshDeck } from "./deck.mutations";
import { CardList } from "./CardList";
import { OutcomeSheet } from "./OutcomeSheet";
import { DeckCard, Outcome } from "./deck.types";

export const DeckScreen: React.FC = () => {
  const [selectedCard, setSelectedCard] = useState<DeckCard | null>(null);
  const [showOutcomeSheet, setShowOutcomeSheet] = useState(false);

  const { data: deckState, isLoading, error, refetch } = useTodaysDeck();
  const { data: userPreferences } = useUserPreferences();
  const completeCardMutation = useCompleteCard();
  const skipCardMutation = useSkipCard();
  const refreshDeckMutation = useRefreshDeck();

  const handleCardPress = (card: DeckCard) => {
    if (deckState?.completedCards.includes(card.id)) {
      return; // Don't allow interaction with completed cards
    }
    setSelectedCard(card);
    setShowOutcomeSheet(true);
  };

  const handleOutcomeComplete = (outcome: Outcome) => {
    completeCardMutation.mutate(outcome, {
      onSuccess: () => {
        setShowOutcomeSheet(false);
        setSelectedCard(null);
      },
      onError: (error) => {
        Alert.alert("Error", "Failed to complete card. Please try again.");
        console.error("Complete card error:", error);
      },
    });
  };

  const handleSkipCard = (cardId: string) => {
    skipCardMutation.mutate(
      { cardId },
      {
        onSuccess: () => {
          setShowOutcomeSheet(false);
          setSelectedCard(null);
        },
        onError: (error) => {
          Alert.alert("Error", "Failed to skip card. Please try again.");
          console.error("Skip card error:", error);
        },
      }
    );
  };

  const handleRefreshDeck = () => {
    refreshDeckMutation.mutate(undefined, {
      onError: (error) => {
        Alert.alert("Error", "Failed to refresh deck. Please try again.");
        console.error("Refresh deck error:", error);
      },
    });
  };

  const renderHeader = () => {
    const today = new Date().toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });

    const completedCount = deckState?.completedCards.length || 0;
    const totalCount = deckState?.cards.length || 0;
    const progress = totalCount > 0 ? completedCount / totalCount : 0;

    return (
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.dateText}>{today}</Text>
          <Pressable
            onPress={handleRefreshDeck}
            style={styles.refreshButton}
            disabled={refreshDeckMutation.isPending}
          >
            {refreshDeckMutation.isPending ? (
              <ActivityIndicator size="small" color="#007AFF" />
            ) : (
              <Text style={styles.refreshText}>↻</Text>
            )}
          </Pressable>
        </View>

        <Text style={styles.deckTitle}>Your Daily Deck</Text>

        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View
              style={[styles.progressFill, { width: `${progress * 100}%` }]}
            />
          </View>
          <Text style={styles.progressText}>
            {completedCount} of {totalCount} completed
          </Text>
        </View>

        {deckState?.isComplete && (
          <View style={styles.completeBadge}>
            <Text style={styles.completeText}>🎉 Deck Complete!</Text>
          </View>
        )}
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyTitle}>No cards today</Text>
      <Text style={styles.emptySubtitle}>
        Your deck is empty. Check back tomorrow or refresh to see if there are
        new contacts to reach out to.
      </Text>
      <Pressable
        onPress={handleRefreshDeck}
        style={styles.refreshEmptyButton}
        disabled={refreshDeckMutation.isPending}
      >
        <Text style={styles.refreshEmptyText}>
          {refreshDeckMutation.isPending ? "Refreshing..." : "Refresh Deck"}
        </Text>
      </Pressable>
    </View>
  );

  const renderError = () => (
    <View style={styles.errorState}>
      <Text style={styles.errorTitle}>Unable to load deck</Text>
      <Text style={styles.errorSubtitle}>
        {error?.message || "Something went wrong. Please try again."}
      </Text>
      <Pressable onPress={() => refetch()} style={styles.retryButton}>
        <Text style={styles.retryText}>Try Again</Text>
      </Pressable>
    </View>
  );

  const renderUpgradePrompt = () => {
    if (userPreferences?.isPremium) return null;

    const completedCount = deckState?.completedCards.length || 0;
    const maxCards = deckState?.maxCards || 5;

    // Show upgrade prompt when user completes all free cards
    if (completedCount >= maxCards && deckState?.isComplete) {
      return (
        <View style={styles.upgradePrompt}>
          <Text style={styles.upgradeTitle}>Great job! 🎯</Text>
          <Text style={styles.upgradeSubtitle}>
            You've completed your daily deck. Upgrade to Premium for 10 cards
            per day plus email and Slack sending.
          </Text>
          <Pressable style={styles.upgradeButton}>
            <Text style={styles.upgradeButtonText}>Upgrade to Premium</Text>
          </Pressable>
        </View>
      );
    }

    return null;
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#F8F9FA" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading your deck...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#F8F9FA" />
        {renderError()}
      </SafeAreaView>
    );
  }

  const hasCards = deckState?.cards && deckState.cards.length > 0;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8F9FA" />

      {renderHeader()}

      {!hasCards ? (
        renderEmptyState()
      ) : (
        <>
          <CardList
            cards={deckState.cards}
            completedCards={deckState.completedCards}
            onCardPress={handleCardPress}
            userPreferences={userPreferences}
          />

          {renderUpgradePrompt()}
        </>
      )}

      {selectedCard && (
        <OutcomeSheet
          card={selectedCard}
          visible={showOutcomeSheet}
          onComplete={handleOutcomeComplete}
          onSkip={() => handleSkipCard(selectedCard.id)}
          onClose={() => {
            setShowOutcomeSheet(false);
            setSelectedCard(null);
          }}
          userPreferences={userPreferences}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  header: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E7",
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  dateText: {
    fontSize: 14,
    color: "#8E8E93",
    fontWeight: "500",
  },
  refreshButton: {
    padding: 8,
  },
  refreshText: {
    fontSize: 18,
    color: "#007AFF",
    fontWeight: "600",
  },
  deckTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1D1D1F",
    marginBottom: 12,
  },
  progressContainer: {
    marginBottom: 8,
  },
  progressBar: {
    height: 4,
    backgroundColor: "#E5E5E7",
    borderRadius: 2,
    marginBottom: 6,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#34C759",
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    color: "#8E8E93",
    fontWeight: "500",
  },
  completeBadge: {
    backgroundColor: "#E8F5E8",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: "flex-start",
    marginTop: 8,
  },
  completeText: {
    fontSize: 14,
    color: "#30A14E",
    fontWeight: "600",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  loadingText: {
    fontSize: 16,
    color: "#8E8E93",
    marginTop: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
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
    marginBottom: 24,
  },
  refreshEmptyButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  refreshEmptyText: {
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  errorState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#FF3B30",
    marginBottom: 8,
  },
  errorSubtitle: {
    fontSize: 16,
    color: "#8E8E93",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: "#FF3B30",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  upgradePrompt: {
    backgroundColor: "#FFFFFF",
    margin: 20,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E5E7",
  },
  upgradeTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1D1D1F",
    marginBottom: 8,
  },
  upgradeSubtitle: {
    fontSize: 14,
    color: "#8E8E93",
    lineHeight: 20,
    marginBottom: 16,
  },
  upgradeButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  upgradeButtonText: {
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "600",
  },
});
