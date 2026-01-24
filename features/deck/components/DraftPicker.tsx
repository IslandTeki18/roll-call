import {
  ContactRecommendation,
  getContactRecommendations,
} from "@/features/messaging/api/recommendations.service";
import { calculateEditDistance } from "@/features/deck/api/editDistance.service";
import { emitEvent } from "@/features/shared/utils/eventEmitter";
import type { ActionId } from "@/features/deck/types/contactScore.types";
import {
  Lightbulb,
  Lock,
  Mail,
  MessageSquare,
  Phone,
  Send,
  Sparkles,
  Video,
  X,
} from "lucide-react-native";
import React, { useState } from "react";
import {
  ActivityIndicator,
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

interface DraftPickerProps {
  visible: boolean;
  onClose: () => void;
  card: DeckCard | null;
  drafts: Draft[];
  loading: boolean;
  onSelectDraft: (draft: Draft) => void;
  onSend: (channel: ChannelType, message: string) => void;
}

const channelConfig: Record<
  ChannelType,
  { icon: typeof Phone; label: string; color: string }
> = {
  sms: { icon: MessageSquare, label: "Message", color: "#10B981" },
  call: { icon: Phone, label: "Call", color: "#3B82F6" },
  facetime: { icon: Video, label: "FaceTime", color: "#6366F1" },
  email: { icon: Mail, label: "Email", color: "#8B5CF6" },
  slack: { icon: MessageSquare, label: "Slack", color: "#E11D48" },
};

export default function DraftPicker({
  visible,
  onClose,
  card,
  drafts,
  loading,
  onSelectDraft,
  onSend,
}: DraftPickerProps) {
  const { profile } = useUserProfile();
  const [selectedDraft, setSelectedDraft] = useState<Draft | null>(null);
  const [customMessage, setCustomMessage] = useState("");
  const [selectedChannel, setSelectedChannel] = useState<ChannelType>("sms");
  const { isPremium, requirePremium } = usePremiumGate();

  // NEW: Recommendations state
  const [recommendations, setRecommendations] =
    useState<ContactRecommendation | null>(null);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);

  const freeChannels: ChannelType[] = ["sms", "call"];
  const premiumChannels: ChannelType[] = ["email", "slack"];

  React.useEffect(() => {
    if (!visible) {
      setSelectedDraft(null);
      setCustomMessage("");
      setRecommendations(null);
    } else if (card) {
      setSelectedChannel(card.suggestedChannel);
      // NEW: Load recommendations when card is opened
      loadRecommendations();
    }
  }, [visible, card]);

  // NEW: Load contact recommendations
  const loadRecommendations = async () => {
    if (!profile || !card) return;

    setLoadingRecommendations(true);
    try {
      const recs = await getContactRecommendations(
        profile.$id,
        card.contact?.$id as string,
        card.contact
      );
      setRecommendations(recs);
    } catch (error) {
      console.error("Failed to load recommendations:", error);
    } finally {
      setLoadingRecommendations(false);
    }
  };

  const handleSelectDraft = (draft: Draft) => {
    setSelectedDraft(draft);
    setCustomMessage(draft.text);
    onSelectDraft(draft);
  };

  const handleSend = () => {
    if (!customMessage.trim() || !profile || !card?.contact?.$id) return;

    const finalMessage = customMessage.trim();

    // B-category: Calculate customization level and emit appropriate event
    let actionId: ActionId = 'draft_custom';
    let customizationLevel: 'untouched' | 'light' | 'heavy' | 'custom' = 'custom';

    if (selectedDraft) {
      // User selected an AI draft, calculate edit distance
      const editResult = calculateEditDistance(selectedDraft.text, finalMessage);
      customizationLevel = editResult.customizationLevel;

      // Map customization level to action ID
      switch (editResult.customizationLevel) {
        case 'untouched':
          actionId = 'draft_ai_untouched';
          break;
        case 'light':
          actionId = 'draft_ai_light';
          break;
        case 'heavy':
          actionId = 'draft_ai_heavy';
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
          ? calculateEditDistance(selectedDraft.text, finalMessage).percentageChanged
          : undefined,
      },
    });

    // B6: pick_suggested_channel - Check if using recommended channel
    const suggestedChannel = card.suggestedChannel;
    if (suggestedChannel && selectedChannel === suggestedChannel) {
      emitEvent({
        userId: profile.$id,
        contactId: card.contact.$id,
        actionId: 'pick_suggested_channel',
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

  const initials =
    `${card.contact?.firstName?.charAt(0) || ""}${
      card.contact?.lastName?.charAt(0) || ""
    }`.toUpperCase() || "?";

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
        <View className="flex-1 justify-end">
          <TouchableOpacity
            className="flex-1 bg-black/50"
            activeOpacity={1}
            onPress={onClose}
          />

          <View className="bg-gray-900 rounded-t-3xl shadow-2xl max-h-[85vh]">
            <ScrollView keyboardShouldPersistTaps="handled">
              {/* Header */}
              <View className="flex-row items-center justify-between px-6 pt-6 pb-4 border-b border-gray-700">
                <View className="flex-row items-center flex-1">
                  <View className="w-12 h-12 rounded-full bg-blue-900 items-center justify-center mr-3">
                    <Text className="text-blue-300 text-lg font-bold">
                      {initials}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-lg font-bold text-white">
                      {card.contact?.displayName}
                    </Text>
                    <Text className="text-sm text-gray-400">{card.reason}</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={onClose} className="p-2 -mr-2">
                  <X size={24} color="#9CA3AF" />
                </TouchableOpacity>
              </View>

              <View className="px-6 py-6">
                {/* NEW: Recommendations banner */}
                {loadingRecommendations && (
                  <View className="mb-4 p-3 bg-blue-50 rounded-lg flex-row items-center gap-2">
                    <ActivityIndicator size="small" color="#3B82F6" />
                    <Text className="text-sm text-blue-700">
                      Analyzing conversation history...
                    </Text>
                  </View>
                )}

                {recommendations && !loadingRecommendations && (
                  <View className="mb-4 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl border border-purple-200">
                    <View className="flex-row items-center gap-2 mb-2">
                      <Lightbulb size={18} color="#7C3AED" />
                      <Text className="text-sm font-semibold text-purple-900">
                        Smart Insights
                      </Text>
                    </View>

                    <Text className="text-sm text-gray-700 mb-2">
                      {recommendations.reasoning}
                    </Text>

                    {recommendations.recentTopics.length > 0 && (
                      <View className="flex-row flex-wrap gap-1 mt-2">
                        {recommendations.recentTopics.map((topic, idx) => (
                          <View
                            key={idx}
                            className="bg-purple-100 px-2 py-1 rounded-full"
                          >
                            <Text className="text-xs text-purple-700">
                              {topic}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}

                    {recommendations.conversationContext && (
                      <Text className="text-xs text-gray-600 mt-2 italic">
                        💬 {recommendations.conversationContext}
                      </Text>
                    )}
                  </View>
                )}

                {/* Channel selector */}
                <View className="mb-6">
                  <Text className="text-sm font-semibold text-gray-300 mb-3">
                    Send via
                  </Text>
                  <View className="flex-row gap-2">
                    {freeChannels.map((channel) => {
                      const config = channelConfig[channel];
                      const Icon = config.icon;
                      const isSelected = selectedChannel === channel;
                      return (
                        <TouchableOpacity
                          key={channel}
                          onPress={() => setSelectedChannel(channel)}
                          className={`flex-1 items-center py-3 rounded-xl border-2 ${
                            isSelected
                              ? "border-blue-500 bg-blue-900"
                              : "border-gray-700"
                          }`}
                        >
                          <Icon
                            size={24}
                            color={isSelected ? config.color : "#9CA3AF"}
                          />
                          <Text
                            className={`text-xs font-medium mt-1 ${
                              isSelected ? "text-white" : "text-gray-400"
                            }`}
                          >
                            {config.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                    {premiumChannels.map((channel) => {
                      const config = channelConfig[channel];
                      const Icon = config.icon;
                      const isSelected = selectedChannel === channel;

                      if (isPremium) {
                        return (
                          <TouchableOpacity
                            key={channel}
                            onPress={() => setSelectedChannel(channel)}
                            className={`flex-1 items-center py-3 rounded-xl border-2 ${
                              isSelected
                                ? "border-blue-500 bg-blue-900"
                                : "border-gray-700"
                            }`}
                          >
                            <Icon
                              size={24}
                              color={isSelected ? config.color : "#9CA3AF"}
                            />
                            <Text
                              className={`text-xs font-medium mt-1 ${
                                isSelected ? "text-white" : "text-gray-400"
                              }`}
                            >
                              {config.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      }

                      return (
                        <TouchableOpacity
                          key={channel}
                          onPress={() =>
                            requirePremium(`${config.label} sends`)
                          }
                          className="flex-1 items-center py-3 rounded-xl border-2 border-dashed border-gray-700"
                        >
                          <View className="relative">
                            <Icon size={24} color="#D1D5DB" />
                            <View className="absolute -bottom-1 -right-1 bg-gray-200 rounded-full p-0.5">
                              <Lock size={10} color="#9CA3AF" />
                            </View>
                          </View>
                          <Text className="text-xs text-gray-400 mt-1">
                            {config.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Draft options */}
                <View className="mb-6">
                  <View className="flex-row items-center justify-between mb-3">
                    <Text className="text-sm font-semibold text-gray-300">
                      Pick a draft
                    </Text>
                    {isPremium ? (
                      <View className="flex-row items-center gap-1 bg-purple-100 px-2 py-1 rounded-full">
                        <Sparkles size={12} color="#7C3AED" />
                        <Text className="text-xs text-purple-700 font-medium">
                          AI Generated
                        </Text>
                      </View>
                    ) : (
                      <Text className="text-xs text-gray-400">Templates</Text>
                    )}
                  </View>
                  {loading ? (
                    <View className="py-8 items-center">
                      <ActivityIndicator size="large" color="#3B82F6" />
                      <Text className="text-gray-500 mt-2">
                        {isPremium
                          ? "Generating drafts..."
                          : "Loading drafts..."}
                      </Text>
                    </View>
                  ) : (
                    <View className="gap-3">
                      {drafts.map((draft) => (
                        <TouchableOpacity
                          key={draft.id}
                          onPress={() => handleSelectDraft(draft)}
                          className={`p-4 rounded-xl border-2 ${
                            selectedDraft?.id === draft.id
                              ? "border-blue-500 bg-blue-900"
                              : "border-gray-700 bg-gray-800"
                          }`}
                        >
                          <View className="flex-row items-center justify-between mb-2">
                            <Text
                              className={`text-xs font-semibold uppercase ${
                                selectedDraft?.id === draft.id
                                  ? "text-blue-400"
                                  : "text-gray-400"
                              }`}
                            >
                              {draft.tone}
                            </Text>
                          </View>
                          <Text className="text-gray-300 text-sm leading-5">
                            {draft.text}
                          </Text>
                        </TouchableOpacity>
                      ))}
                      {!isPremium && (
                        <TouchableOpacity
                          onPress={() => requirePremium("AI-powered drafts")}
                          className="p-4 rounded-xl border-2 border-dashed border-purple-200 bg-purple-50/50 flex-row items-center justify-center gap-2"
                        >
                          <Sparkles size={16} color="#7C3AED" />
                          <Text className="text-sm text-purple-700 font-medium">
                            Unlock AI-powered drafts
                          </Text>
                          <Lock size={14} color="#7C3AED" />
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </View>

                {/* Custom message */}
                <View className="mb-6">
                  <Text className="text-sm font-semibold text-gray-300 mb-3">
                    Or customize
                  </Text>
                  <TextInput
                    value={customMessage}
                    onChangeText={setCustomMessage}
                    placeholder="Write your own message..."
                    placeholderTextColor="#6B7280"
                    multiline
                    className="bg-gray-800 px-4 py-4 rounded-xl text-base min-h-[100px] text-white border border-gray-700"
                    style={{ textAlignVertical: "top" }}
                  />
                </View>

                {/* Send button */}
                <TouchableOpacity
                  onPress={handleSend}
                  disabled={!customMessage.trim()}
                  className={`flex-row items-center justify-center gap-2 py-4 rounded-xl ${
                    customMessage.trim()
                      ? "bg-blue-600 active:bg-blue-700"
                      : "bg-gray-300"
                  }`}
                >
                  <Send size={20} color="white" />
                  <Text className="text-white font-semibold text-base">
                    Send {channelConfig[selectedChannel].label}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
