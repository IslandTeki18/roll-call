import { useUser } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import { Linking, Platform, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
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

export default function DeckScreen() {
  const { user } = useUser();
  const router = useRouter();
  const {
    deck,
    loading,
    drafts,
    draftsLoading,
    generateDraftsForCard,
    markCardCompleted,
    markCardSkipped,
  } = useDeck();

  const [selectedCard, setSelectedCard] = useState<DeckCard | null>(null);
  const [draftPickerVisible, setDraftPickerVisible] = useState(false);
  const [outcomeSheetVisible, setOutcomeSheetVisible] = useState(false);
  const [completedEngagementId, setCompletedEngagementId] = useState<
    string | undefined
  >();
  const [completeModalVisible, setCompleteModalVisible] = useState(false);

  const pendingCards = deck?.cards.filter((c: any) => c.status === "pending") || [];
  const completedCards =
    deck?.cards.filter(
      (c: DeckCard) => c.status === "completed" || c.status === "skipped"
    ) || [];
  const allCompleted =
    deck && pendingCards.length === 0 && completedCards.length > 0;

  const handleCardTap = useCallback(
    (card: DeckCard) => {
      setSelectedCard(card);
      generateDraftsForCard(card);
      setDraftPickerVisible(true);
    },
    [generateDraftsForCard]
  );

  const handleSwipeRight = useCallback(
    (cardId: string) => {
      const card = deck?.cards.find((c: DeckCard) => c.id === cardId);
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
      await markCardSkipped(cardId);
      checkDeckComplete();
    },
    [markCardSkipped]
  );

  const handleSend = useCallback(
    async (channel: ChannelType, message: string) => {
      if (!selectedCard || !user) return;

      const contact = selectedCard.contact;
      const phoneNumbers =
        contact.phoneNumbers?.split(",").filter(Boolean) || [];
      const emails = contact.emails?.split(",").filter(Boolean) || [];
      const primaryPhone = phoneNumbers[0];
      const primaryEmail = emails[0];

      // Open native app
      switch (channel) {
        case "sms":
          if (primaryPhone) {
            const smsUrl =
              Platform.OS === "ios"
                ? `sms:${primaryPhone}&body=${encodeURIComponent(message)}`
                : `sms:${primaryPhone}?body=${encodeURIComponent(message)}`;
            await Linking.openURL(smsUrl);
          }
          break;
        case "call":
          if (primaryPhone) {
            await Linking.openURL(`tel:${primaryPhone}`);
          }
          break;
        case "facetime":
          if (primaryPhone && Platform.OS === "ios") {
            await Linking.openURL(`facetime:${primaryPhone}`);
          }
          break;
        case "email":
          if (primaryEmail) {
            await Linking.openURL(
              `mailto:${primaryEmail}?body=${encodeURIComponent(message)}`
            );
          }
          break;
      }

      // Log engagement event
      const eventType: EngagementEventType =
        channel === "sms"
          ? "sms_sent"
          : channel === "call"
          ? "call_made"
          : "email_sent";
      const event = await createEngagementEvent(
        user.id,
        eventType,
        [contact.$id],
        selectedCard.id,
        { message }
      );

      setCompletedEngagementId(event.$id);
      setDraftPickerVisible(false);
      setOutcomeSheetVisible(true);
    },
    [selectedCard, user]
  );

  const handleOutcomeComplete = useCallback(async () => {
    if (selectedCard) {
      await markCardCompleted(selectedCard.id);
      setOutcomeSheetVisible(false);
      setSelectedCard(null);
      setCompletedEngagementId(undefined);
      checkDeckComplete();
    }
  }, [selectedCard, markCardCompleted]);

  const handleOutcomeClose = useCallback(async () => {
    if (selectedCard) {
      await markCardCompleted(selectedCard.id);
    }
    setOutcomeSheetVisible(false);
    setSelectedCard(null);
    setCompletedEngagementId(undefined);
    checkDeckComplete();
  }, [selectedCard, markCardCompleted]);

  const checkDeckComplete = useCallback(() => {
    if (deck) {
      const remaining = deck.cards.filter((c: DeckCard) => c.status === "pending").length;
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
        linkedCardId={selectedCard?.id}
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
