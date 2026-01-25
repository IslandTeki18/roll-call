import { useRouter } from "expo-router";
import { Crown, Search, X } from "lucide-react-native";
import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Linking,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { usePremiumGate } from "../../auth/hooks/usePremiumGate";
import { useUserProfile } from "../../auth/hooks/useUserProfile";
import OutcomeSheet from "../../outcomes/components/OutcomeSheet";

import {
  createEngagementEvent,
  EngagementEventType,
} from "@/features/messaging/api/engagement.service";
import { emitEvent } from "@/features/shared/utils/eventEmitter";
import { markCardDrafted, markCardSent } from "../api/deck.mutations";
import CardStack from "../components/CardStack";
import DeckCompleteModal from "../components/DeckCompleteModal";
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
    photoCache,
    contextTextMap,
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
  const [searchQuery, setSearchQuery] = useState("");

  const pendingCards =
    deck?.cards.filter((c: DeckCard) => c.status === "pending") || [];
  const completedCards =
    deck?.cards.filter(
      (c: DeckCard) => c.status === "completed" || c.status === "skipped",
    ) || [];
  const allCompleted =
    deck && pendingCards.length === 0 && completedCards.length > 0;

  // Filter cards based on search query
  const filteredCards = useMemo(() => {
    if (!deck) return [];
    if (!searchQuery.trim()) return deck.cards;

    const query = searchQuery.toLowerCase();
    return deck.cards.filter(
      (card) =>
        card.contact?.displayName.toLowerCase().includes(query) ||
        card.contact?.organization?.toLowerCase().includes(query),
    );
  }, [deck, searchQuery]);

  const handleCardTap = useCallback(
    (card: DeckCard) => {
      // A5: open_more_context - User tapped card to expand
      if (profile && card.contact?.$id) {
        emitEvent({
          userId: profile.$id,
          contactId: card.contact.$id,
          actionId: "open_more_context",
          linkedCardId: card.$id,
          metadata: {
            contactName: card.contact.displayName,
          },
        });
      }

      setSelectedCard(card);
      generateDraftsForCard(card);
      markCardDrafted(card.$id as string);
      setDraftPickerVisible(true);
    },
    [generateDraftsForCard, profile, deck],
  );

  const handleSwipeRight = useCallback(
    (cardId: string) => {
      const card = deck?.cards.find((c: DeckCard) => c.$id === cardId);
      if (card) {
        // A2: swipe_ping - User swiped right to engage
        if (profile && card.contact?.$id) {
          emitEvent({
            userId: profile.$id,
            contactId: card.contact.$id,
            actionId: "swipe_ping",
            linkedCardId: cardId,
            metadata: {
              contactName: card.contact.displayName,
            },
          });
        }

        setSelectedCard(card);
        generateDraftsForCard(card);
        setDraftPickerVisible(true);
      }
    },
    [deck, generateDraftsForCard, profile],
  );

  const handleSwipeLeft = useCallback(
    async (cardId: string) => {
      if (!profile) return;
      const card = deck?.cards.find((c: DeckCard) => c.$id === cardId);
      if (card) {
        // Keep legacy engagement event for parallel run
        await createEngagementEvent(
          profile.$id,
          "card_dismissed",
          [card.contact?.$id as string],
          cardId,
        );

        // A3: swipe_defer - User swiped left to skip
        if (card.contact?.$id) {
          emitEvent({
            userId: profile.$id,
            contactId: card.contact.$id,
            actionId: "swipe_defer",
            linkedCardId: cardId,
            metadata: {
              contactName: card.contact.displayName,
            },
          });
        }
      }
      await markCardSkipped(cardId);
    },
    [profile, deck, markCardSkipped],
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
          // C1: composer_opened - SMS composer opened
          emitEvent({
            userId: profile.$id,
            contactId: contact?.$id as string,
            actionId: "composer_opened",
            linkedCardId: selectedCard.$id,
            channel: "sms",
            metadata: {
              messageLength: message.length,
            },
          });
          if (primaryPhone) {
            const smsUrl = `sms:${primaryPhone}?body=${encodeURIComponent(message)}`;
            await Linking.openURL(smsUrl);
          }
          break;
        case "call":
          eventType = "call_made";
          // C4: call_placed
          emitEvent({
            userId: profile.$id,
            contactId: contact?.$id as string,
            actionId: "call_placed",
            linkedCardId: selectedCard.$id,
            channel: "call",
          });
          if (primaryPhone) {
            await Linking.openURL(`tel:${primaryPhone}`);
          }
          break;
        case "facetime":
          eventType = "facetime_made";
          // C5: facetime_started
          emitEvent({
            userId: profile.$id,
            contactId: contact?.$id as string,
            actionId: "facetime_started",
            linkedCardId: selectedCard.$id,
            channel: "facetime",
          });
          if (primaryPhone && Platform.OS === "ios") {
            await Linking.openURL(`facetime:${primaryPhone}`);
          }
          break;
        case "email":
          eventType = "email_sent";
          // C2: send_email (premium)
          emitEvent({
            userId: profile.$id,
            contactId: contact?.$id as string,
            actionId: "send_email",
            linkedCardId: selectedCard.$id,
            channel: "email",
            metadata: {
              messageLength: message.length,
              recipient: primaryEmail,
            },
          });
          if (primaryEmail) {
            await Linking.openURL(
              `mailto:${primaryEmail}?body=${encodeURIComponent(message)}`,
            );
          }
          break;
        case "slack":
          eventType = "slack_sent";
          // C3: send_slack (premium)
          emitEvent({
            userId: profile.$id,
            contactId: contact?.$id as string,
            actionId: "send_slack",
            linkedCardId: selectedCard.$id,
            channel: "slack",
            metadata: {
              messageLength: message.length,
            },
          });
          Alert.alert("Coming Soon", "Slack direct messaging coming soon");
          return;
        default:
          eventType = "sms_sent";
      }

      // Keep legacy engagement event for parallel run
      const event = await createEngagementEvent(
        profile.$id,
        eventType,
        [contact?.$id as string],
        selectedCard.$id,
        { message, channel },
      );

      await markCardSent(selectedCard.$id as string, event.$id);

      setCompletedEngagementId(event.$id);
      setDraftPickerVisible(false);
      setOutcomeSheetVisible(true);
    },
    [selectedCard, profile, isPremium, requirePremium],
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
      <SafeAreaView className="flex-1 bg-slate-900">
        <EmptyDeck reason="generating" />
      </SafeAreaView>
    );
  }

  if (!deck || deck.cards.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-slate-900">
        <View className="px-6 pt-4">
          <Text className="text-2xl font-bold text-white">Daily Deck</Text>
        </View>
        <EmptyDeck
          reason="no_contacts"
          onImportContacts={handleImportContacts}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-900">
      {/* Search Bar Header */}
      <View className="px-6 pt-4 pb-2">
        <View className="flex-row items-center gap-3 mb-3">
          {/* Search Bar */}
          <View className="flex-1 flex-row items-center bg-slate-900 rounded-full px-4 py-3 border border-gray-800">
            <Search size={20} color="#6B7280" />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search Contacts"
              placeholderTextColor="#6B7280"
              className="flex-1 ml-2 text-white"
            />
            {searchQuery && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <X size={20} color="#6B7280" />
              </TouchableOpacity>
            )}
          </View>

          {/* Premium Button */}
          <TouchableOpacity
            onPress={() => router.push("/(tabs)/settings")}
            className="bg-transparent p-3 rounded-full"
          >
            <Crown size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {allCompleted ? (
        <EmptyDeck reason="all_completed" />
      ) : (
        <CardStack
          key={cardStackKey}
          cards={filteredCards}
          photoCache={photoCache}
          contextTextMap={contextTextMap}
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
        photoCache={photoCache}
        contextTextMap={contextTextMap}
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
