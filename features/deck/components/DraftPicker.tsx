import { calculateEditDistance } from "@/features/deck/api/editDistance.service";
import type { ActionId } from "@/features/deck/types/contactScore.types";
import { generateDraft } from "@/features/messaging/api/drafts.service";
import { getContactRecommendations } from "@/features/messaging/api/recommendations.service";
import { emitEvent } from "@/features/shared/utils/eventEmitter";
import { Send, X } from "lucide-react-native";
import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { usePremiumGate } from "../../auth/hooks/usePremiumGate";
import { useUserProfile } from "../../auth/hooks/useUserProfile";
import { ChannelType, DeckCard, Draft } from "../types/deck.types";
import Card from "./Card";
import CompactChannelSelector from "./CompactChannelSelector";
import GenerateAIButton from "./GenerateAIButton";
import SuggestedDraft from "./SuggestedDraft";

interface DraftPickerProps {
  visible: boolean;
  onClose: () => void;
  card: DeckCard | null;
  drafts: Draft[];
  loading: boolean;
  onSelectDraft: (draft: Draft) => void;
  onSend: (channel: ChannelType, message: string) => void;
  photoCache: Map<string, string | null>;
  contextTextMap: Map<string, string>;
}

export default function DraftPicker({
  visible,
  onClose,
  card,
  drafts,
  loading,
  onSelectDraft,
  onSend,
  photoCache,
  contextTextMap,
}: DraftPickerProps) {
  const { profile } = useUserProfile();
  const { isPremium, requirePremium } = usePremiumGate();

  const [selectedDraft, setSelectedDraft] = useState<Draft | null>(null);
  const [customMessage, setCustomMessage] = useState("");
  const [selectedChannel, setSelectedChannel] = useState<ChannelType>("sms");
  const [generatingDraft, setGeneratingDraft] = useState(false);
  const [suggestedDraft, setSuggestedDraft] = useState<string | null>(null);
  const [copyFeedbackVisible, setCopyFeedbackVisible] = useState(false);

  // Auto-generation logic: Premium users get suggested draft immediately
  React.useEffect(() => {
    if (!visible) {
      // Reset state when modal closes
      setSelectedDraft(null);
      setCustomMessage("");
      setSuggestedDraft(null);
      setCopyFeedbackVisible(false);
      setGeneratingDraft(false);
    } else if (card && isPremium && drafts.length > 0) {
      // Auto-set first draft as suggestion for premium users
      setSuggestedDraft(drafts[0].text);
      setSelectedDraft(drafts[0]);
    }
  }, [visible, card, isPremium, drafts]);

  // Set selected channel from card
  React.useEffect(() => {
    if (card) {
      setSelectedChannel(card.suggestedChannel);
    }
  }, [card]);

  const handleGenerateAI = async () => {
    if (!isPremium) {
      requirePremium("AI-powered drafts");
      return;
    }

    if (!profile || !card?.contact?.$id) return;

    setGeneratingDraft(true);
    try {
      const recommendations = await getContactRecommendations(
        profile.$id,
        card.contact.$id,
        card.contact,
      );

      const contextString = recommendations.conversationContext
        ? `Context: ${recommendations.conversationContext}. `
        : "";

      const draft = await generateDraft(
        profile.$id,
        card.contact.$id,
        `${contextString}Write a friendly, contextual message`,
      );

      setSuggestedDraft(draft);
      setSelectedDraft({
        id: "1",
        text: draft,
        tone: "casual",
        channel: selectedChannel,
      });

      // Emit analytics event
      emitEvent({
        userId: profile.$id,
        contactId: card.contact.$id,
        actionId: "generate_ai_draft",
        linkedCardId: card.$id,
        metadata: {
          contactName: card.contact.displayName,
        },
      });
    } catch (error) {
      console.error("Failed to generate draft:", error);
      Alert.alert("Error", "Failed to generate AI draft. Please try again.");
    } finally {
      setGeneratingDraft(false);
    }
  };

  const handleCopySuggestion = () => {
    if (!suggestedDraft || !profile || !card?.contact?.$id) return;

    setCustomMessage(suggestedDraft);
    setCopyFeedbackVisible(true);

    // Emit analytics event
    emitEvent({
      userId: profile.$id,
      contactId: card.contact.$id,
      actionId: "copy_suggested_draft",
      linkedCardId: card.$id,
      metadata: {
        draftLength: suggestedDraft.length,
      },
    });

    // Hide feedback after 1.5s
    setTimeout(() => {
      setCopyFeedbackVisible(false);
    }, 1500);
  };

  const handleSend = () => {
    if (!customMessage.trim() || !profile || !card?.contact?.$id) return;

    const finalMessage = customMessage.trim();

    // B-category: Calculate customization level and emit appropriate event
    let actionId: ActionId = "draft_custom";
    let customizationLevel: "untouched" | "light" | "heavy" | "custom" =
      "custom";

    if (selectedDraft) {
      // User selected an AI draft, calculate edit distance
      const editResult = calculateEditDistance(
        selectedDraft.text,
        finalMessage,
      );
      customizationLevel = editResult.customizationLevel;

      // Map customization level to action ID
      switch (editResult.customizationLevel) {
        case "untouched":
          actionId = "draft_ai_untouched";
          break;
        case "light":
          actionId = "draft_ai_light";
          break;
        case "heavy":
          actionId = "draft_ai_heavy";
          break;
      }
    }

    // Emit draft customization event (B1-B4)
    emitEvent({
      userId: profile.$id,
      contactId: card.contact.$id,
      actionId,
      linkedCardId: card.$id,
      channel: selectedChannel,
      customizationLevel,
      metadata: {
        originalDraft: selectedDraft?.text,
        finalMessage,
        tone: selectedDraft?.tone,
        messageLength: finalMessage.length,
        percentageChanged: selectedDraft
          ? calculateEditDistance(selectedDraft.text, finalMessage)
              .percentageChanged
          : undefined,
      },
    });

    // B6: pick_suggested_channel - Check if using recommended channel
    const suggestedChannel = card.suggestedChannel;
    if (suggestedChannel && selectedChannel === suggestedChannel) {
      emitEvent({
        userId: profile.$id,
        contactId: card.contact.$id,
        actionId: "pick_suggested_channel",
        linkedCardId: card.$id,
        channel: selectedChannel,
        metadata: {
          suggestedChannel,
          wasAccepted: true,
        },
      });
    }

    // Call parent handler to complete send
    onSend(selectedChannel, finalMessage);
  };

  if (!card) return null;

  const photoUri = photoCache.get(card.contact?.$id || "") || null;
  const contextText =
    contextTextMap.get(card.$id || "") || "Reach out to reconnect";

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <View className="flex-1">
          {/* Backdrop */}
          <TouchableOpacity
            className="absolute inset-0 bg-black/50"
            activeOpacity={1}
            onPress={onClose}
          />

          {/* Content Container */}
          <View className="bg-slate-900 rounded-t-3xl shadow-2xl mt-8 flex-1">
            <ScrollView keyboardShouldPersistTaps="handled">
              {/* Header */}
              <View className="flex-row items-center justify-between px-6 pt-6 pb-4 border-b border-gray-700">
                <Text className="text-lg font-bold text-white">Reach Out</Text>
                <TouchableOpacity onPress={onClose} className="p-2 -mr-2">
                  <X size={24} color="#9CA3AF" />
                </TouchableOpacity>
              </View>

              <View className="px-6 py-6">
                {/* Card Display - Static, Non-Interactive */}
                <View className="mb-6">
                  <Card
                    card={card}
                    photoUri={photoUri}
                    contextText={contextText}
                    onSwipeLeft={() => {}}
                    onSwipeRight={() => {}}
                    onTap={() => {}}
                    isInteractive={false}
                  />
                </View>

                {/* Generate AI Button */}
                <View className="mb-6">
                  <GenerateAIButton
                    onPress={handleGenerateAI}
                    loading={generatingDraft || loading}
                    isPremium={isPremium}
                  />
                </View>

                {/* Suggested Draft (if available) */}
                {suggestedDraft && !generatingDraft && (
                  <SuggestedDraft
                    draftText={suggestedDraft}
                    onCopy={handleCopySuggestion}
                    showFeedback={copyFeedbackVisible}
                  />
                )}

                {/* Channel Selector */}
                <CompactChannelSelector
                  selectedChannel={selectedChannel}
                  onSelectChannel={setSelectedChannel}
                  isPremium={isPremium}
                  onPremiumRequired={requirePremium}
                />

                {/* Your Message */}
                <View className="mb-6">
                  <Text className="text-sm font-semibold text-gray-300 mb-3">
                    Your Message
                  </Text>
                  <View className="relative">
                    <TextInput
                      value={customMessage}
                      onChangeText={setCustomMessage}
                      placeholder="Write your message..."
                      placeholderTextColor="#6B7280"
                      multiline
                      className="bg-slate-900 px-4 py-4 pr-16 rounded-xl text-base min-h-[120px] text-white border border-gray-700"
                      style={{ textAlignVertical: "top" }}
                    />
                    {/* Send Button - Absolute positioned bottom-right */}
                    <TouchableOpacity
                      onPress={handleSend}
                      disabled={!customMessage.trim()}
                      className={`absolute bottom-3 right-3 p-3 rounded-full ${
                        customMessage.trim() ? "bg-blue-600" : "bg-gray-600"
                      }`}
                    >
                      <Send size={20} color="white" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
