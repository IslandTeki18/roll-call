import { useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import { Alert, Linking, Platform, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { usePremiumGate } from "../../auth/hooks/usePremiumGate";
import { useUserProfile } from "../../auth/hooks/useUserProfile";
import OutcomeSheet from "../../outcomes/components/OutcomeSheet";

import {
  createEngagementEvent,
  EngagementEventType,
} from "@/features/messaging/api/engagement.service";
import CardStack from "../components/CardStack";
import DeckCompleteModal from "../components/DeckCompleteModal";
import DeckProgress from "../components/DeckProgress";
import DraftPicker from "../components/DraftPicker";
import EmptyDeck from "../components/EmptyDeck";
import { useDeck } from "../hooks/useDeck";
import { ChannelType, DeckCard } from "../types/deck.types";
import { markCardDrafted, markCardSent } from "../api/deck.mutations";

export default function DeckScreen() {
  const { profile } = useUserProfile();
  const router = useRouter();
  const { isPremium, requirePremium } = usePremiumGate();
  const {
    deck,
    loading,
    drafts,
    draftsLoading,
    generateDraftsForCard,
    markCardCompleted,
    markCardSkipped,
    markCardSnoozed,
  } = useDeck();

  const [selectedCard, setSelectedCard] = useState<DeckCard | null>(null);
  const [draftPickerVisible, setDraftPickerVisible] = useState(false);
  const [outcomeSheetVisible, setOutcomeSheetVisible] = useState(false);
  const [completedEngagementId, setCompletedEngagementId] = useState<
    string | undefined
  >();
  const [completeModalVisible, setCompleteModalVisible] = useState(false);

  const pendingCards =
    deck?.cards.filter((c: any) => c.status === "pending") || [];
  const completedCards =
    deck?.cards.filter(
      (c: DeckCard) => c.status === "completed" || c.status === "skipped"
    ) || [];
  const allCompleted =
    deck && pendingCards.length === 0 && completedCards.length > 0;

  const handleCardTap = useCallback(
    (card: DeckCard) => {
      console.log("Card tapped:", JSON.stringify(card, null, 2)); // Debugging line
      setSelectedCard(card);
      generateDraftsForCard(card);
      markCardDrafted(profile?.$id as string, card.$id, card.contact.$id, card.$createdAt as string);
      setDraftPickerVisible(true);
    },
    [generateDraftsForCard, profile?.$id]
  );

  const handleSwipeRight = useCallback(
    (cardId: string) => {
      const card = deck?.cards.find((c: DeckCard) => c.$id === cardId);
      if (card) {
        setSelectedCard(card);
        generateDraftsForCard(card);
        setDraftPickerVisible(true);
      }
    },
    [deck, generateDraftsForCard]
  );

  const handleSwipeLeft = useCallback(
    async (cardId: string) => {
      if (!profile) return;
      const card = deck?.cards.find((c: DeckCard) => c.$id === cardId);
      if (card) {
        // Log card_dismissed engagement event
        await createEngagementEvent(
          profile.$id,
          "card_dismissed",
          [card.contact.$id],
          cardId
        );
      }
      await markCardSkipped(cardId);
      checkDeckComplete();
    },
    [profile, deck, markCardSkipped]
  );

  const handleSnooze = useCallback(
    async (cardId: string) => {
      if (!profile) return;
      const card = deck?.cards.find((c: DeckCard) => c.$id === cardId);
      if (card) {
        await createEngagementEvent(
          profile.$id,
          "card_snoozed",
          [card.contact.$id],
          cardId
        );
        await markCardSnoozed(cardId);
      }
    },
    [profile, deck, markCardSnoozed]
  );

  const handleSend = useCallback(
    async (channel: ChannelType, message: string) => {
      if (!selectedCard || !profile) return;

      // Gate premium channels
      const premiumChannels: ChannelType[] = ["email", "slack"];
      if (premiumChannels.includes(channel) && !isPremium) {
        requirePremium(`${channel === "email" ? "Email" : "Slack"} sends`);
        return;
      }

      const contact = selectedCard.contact;
      const phoneNumbers =
        contact.phoneNumbers?.split(",").filter(Boolean) || [];
      const emails = contact.emails?.split(",").filter(Boolean) || [];
      const primaryPhone = phoneNumbers[0];
      const primaryEmail = emails[0];

      // Determine event type based on channel
      let eventType: EngagementEventType;
      switch (channel) {
        case "sms":
          eventType = "sms_sent";
          if (primaryPhone) {
            const smsUrl =
              Platform.OS === "ios"
                ? `sms:${primaryPhone}&body=${encodeURIComponent(message)}`
                : `sms:${primaryPhone}?body=${encodeURIComponent(message)}`;
            await Linking.openURL(smsUrl);
          }
          break;
        case "call":
          eventType = "call_made";
          if (primaryPhone) {
            await Linking.openURL(`tel:${primaryPhone}`);
          }
          break;
        case "facetime":
          eventType = "facetime_made";
          if (primaryPhone && Platform.OS === "ios") {
            await Linking.openURL(`facetime:${primaryPhone}`);
          }
          break;
        case "email":
          eventType = "email_sent";
          if (primaryEmail) {
            await Linking.openURL(
              `mailto:${primaryEmail}?body=${encodeURIComponent(message)}`
            );
          }
          break;
        case "slack":
          eventType = "slack_sent";
          Alert.alert("Coming Soon", "Slack direct messaging coming soon");
          return;
        default:
          eventType = "sms_sent";
      }

      // Log engagement event
      const event = await createEngagementEvent(
        profile.$id,
        eventType,
        [contact.$id],
        selectedCard.$id,
        { message, channel }
      );

      // Persist sent_at timestamp
      await markCardSent(selectedCard.$id, event.$id);

      setCompletedEngagementId(event.$id);
      setDraftPickerVisible(false);
      setOutcomeSheetVisible(true);
    },
    [selectedCard, profile, isPremium, requirePremium, markCardSent]
  );

  const handleOutcomeComplete = useCallback(async () => {
    if (selectedCard) {
      await markCardCompleted(selectedCard.$id);
      setOutcomeSheetVisible(false);
      setSelectedCard(null);
      setCompletedEngagementId(undefined);
      checkDeckComplete();
    }
  }, [selectedCard, markCardCompleted]);

  const handleOutcomeClose = useCallback(async () => {
    if (selectedCard) {
      await markCardCompleted(selectedCard.$id);
    }
    setOutcomeSheetVisible(false);
    setSelectedCard(null);
    setCompletedEngagementId(undefined);
    checkDeckComplete();
  }, [selectedCard, markCardCompleted]);

  const checkDeckComplete = useCallback(() => {
    if (deck) {
      const remaining = deck.cards.filter(
        (c: DeckCard) => c.status === "pending"
      ).length;
      if (remaining === 0) {
        setTimeout(() => setCompleteModalVisible(true), 500);
      }
    }
  }, [deck]);

  const handleImportContacts = useCallback(() => {
    router.push("/(tabs)/contacts");
  }, [router]);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <EmptyDeck reason="generating" />
      </SafeAreaView>
    );
  }

  if (!deck || deck.cards.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="px-6 pt-4">
          <Text className="text-2xl font-bold">Daily Deck</Text>
        </View>
        <EmptyDeck
          reason="no_contacts"
          onImportContacts={handleImportContacts}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="px-6 pt-4 pb-2">
        <Text className="text-2xl font-bold">Daily Deck</Text>
      </View>

      {/* Progress */}
      <DeckProgress cards={deck.cards} maxCards={deck.maxCards} />

      {/* Card Stack or Empty State */}
      {allCompleted ? (
        <EmptyDeck reason="all_completed" />
      ) : (
        <CardStack
          cards={deck.cards}
          onSwipeLeft={handleSwipeLeft}
          onSwipeRight={handleSwipeRight}
          onTap={handleCardTap}
        />
      )}

      {/* Draft Picker Bottom Sheet */}
      <DraftPicker
        visible={draftPickerVisible}
        onClose={() => setDraftPickerVisible(false)}
        card={selectedCard}
        drafts={drafts}
        loading={draftsLoading}
        onSelectDraft={() => {}}
        onSend={handleSend}
      />

      {/* Outcome Sheet */}
      <OutcomeSheet
        visible={outcomeSheetVisible}
        onClose={handleOutcomeClose}
        contactIds={selectedCard ? [selectedCard.contact.$id] : []}
        contactNames={selectedCard ? [selectedCard.contact.displayName] : []}
        linkedCardId={selectedCard?.$id}
        linkedEngagementEventId={completedEngagementId}
        engagementType="sms_sent"
        onComplete={handleOutcomeComplete}
      />

      {/* Deck Complete Modal */}
      <DeckCompleteModal
        visible={completeModalVisible}
        onClose={() => setCompleteModalVisible(false)}
        completedCount={completedCards.length}
        streak={1}
      />
    </SafeAreaView>
  );
}
