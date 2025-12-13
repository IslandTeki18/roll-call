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
import { markCardDrafted, markCardSent } from "../api/deck.mutations";
import CardStack from "../components/CardStack";
import DeckCompleteModal from "../components/DeckCompleteModal";
import DeckProgress from "../components/DeckProgress";
import DraftPicker from "../components/DraftPicker";
import EmptyDeck from "../components/EmptyDeck";
import { useDeck } from "../hooks/useDeck";
import { ChannelType, DeckCard } from "../types/deck.types";

export default function DeckScreen() {
  const { profile } = useUserProfile();
  const router = useRouter();
  const { isPremium, requirePremium } = usePremiumGate();
  const {
    deck,
    loading,
    drafts,
    draftsLoading,
    quotaExhausted,
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
  const [cardStackKey, setCardStackKey] = useState(0);

  const pendingCards =
    deck?.cards.filter((c: DeckCard) => c.status === "pending") || [];
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
      markCardDrafted(card.$id as string);
      setDraftPickerVisible(true);
    },
    [generateDraftsForCard]
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
        await createEngagementEvent(
          profile.$id,
          "card_dismissed",
          [card.contact?.$id as string],
          cardId
        );
      }
      await markCardSkipped(cardId);
    },
    [profile, deck, markCardSkipped]
  );

  const handleDraftPickerClose = useCallback(() => {
    setDraftPickerVisible(false);
    setSelectedCard(null);
    setCardStackKey((prev) => prev + 1);
  }, []);

  const handleSend = useCallback(
    async (channel: ChannelType, message: string) => {
      if (!selectedCard || !profile) return;

      const premiumChannels: ChannelType[] = ["email", "slack"];
      if (premiumChannels.includes(channel) && !isPremium) {
        requirePremium(`${channel === "email" ? "Email" : "Slack"} sends`);
        return;
      }

      const contact = selectedCard.contact;
      const phoneNumbers =
        contact?.phoneNumbers?.split(",").filter(Boolean) || [];
      const emails = contact?.emails?.split(",").filter(Boolean) || [];
      const primaryPhone = phoneNumbers[0];
      const primaryEmail = emails[0];

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

      const event = await createEngagementEvent(
        profile.$id,
        eventType,
        [contact?.$id as string],
        selectedCard.$id,
        { message, channel }
      );

      await markCardSent(selectedCard.$id as string, event.$id);

      setCompletedEngagementId(event.$id);
      setDraftPickerVisible(false);
      setOutcomeSheetVisible(true);
    },
    [selectedCard, profile, isPremium, requirePremium]
  );

  const handleOutcomeComplete = useCallback(async () => {
    if (selectedCard) {
      await markCardCompleted(selectedCard.$id as string);
      setOutcomeSheetVisible(false);
      setSelectedCard(null);
      setCompletedEngagementId(undefined);
    }
  }, [selectedCard, markCardCompleted]);

  const handleOutcomeClose = useCallback(async () => {
    if (selectedCard) {
      await markCardCompleted(selectedCard.$id as string);
    }
    setOutcomeSheetVisible(false);
    setSelectedCard(null);
    setCompletedEngagementId(undefined);
  }, [selectedCard, markCardCompleted]);

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
      <View className="px-6 pt-4 pb-2">
        <View className="flex-row items-center justify-between">
          <Text className="text-2xl font-bold">Daily Deck</Text>
          {quotaExhausted && (
            <View className="bg-green-100 px-3 py-1 rounded-full">
              <Text className="text-green-700 text-xs font-semibold">
                Today&apos;s Deck
              </Text>
            </View>
          )}
        </View>
      </View>

      <DeckProgress cards={deck.cards} maxCards={deck.maxCards} />

      {allCompleted ? (
        <EmptyDeck reason="all_completed" />
      ) : (
        <CardStack
          key={cardStackKey}
          cards={deck.cards}
          onSwipeLeft={handleSwipeLeft}
          onSwipeRight={handleSwipeRight}
          onTap={handleCardTap}
        />
      )}

      <DraftPicker
        visible={draftPickerVisible}
        onClose={handleDraftPickerClose}
        card={selectedCard}
        drafts={drafts}
        loading={draftsLoading}
        onSelectDraft={() => {}}
        onSend={handleSend}
      />

      <OutcomeSheet
        visible={outcomeSheetVisible}
        onClose={handleOutcomeClose}
        contactIds={selectedCard ? [selectedCard.contact?.$id as string] : []}
        contactNames={
          selectedCard ? [selectedCard.contact?.displayName as string] : []
        }
        linkedCardId={selectedCard?.$id}
        linkedEngagementEventId={completedEngagementId}
        engagementType="sms_sent"
        onComplete={handleOutcomeComplete}
      />

      <DeckCompleteModal
        visible={completeModalVisible}
        onClose={() => setCompleteModalVisible(false)}
        completedCount={completedCards.length}
        streak={1}
      />
    </SafeAreaView>
  );
}
