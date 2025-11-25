import {
  Mail,
  MessageSquare,
  Phone,
  Send,
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
  const [selectedDraft, setSelectedDraft] = useState<Draft | null>(null);
  const [customMessage, setCustomMessage] = useState("");
  const [selectedChannel, setSelectedChannel] = useState<ChannelType>("sms");

  React.useEffect(() => {
    if (!visible) {
      setSelectedDraft(null);
      setCustomMessage("");
    } else if (card) {
      setSelectedChannel(card.suggestedChannel);
    }
  }, [visible, card]);

  const handleSelectDraft = (draft: Draft) => {
    setSelectedDraft(draft);
    setCustomMessage(draft.text);
    onSelectDraft(draft);
  };

  const handleSend = () => {
    if (customMessage.trim()) {
      onSend(selectedChannel, customMessage.trim());
    }
  };

  if (!card) return null;

  const initials =
    `${card.contact.firstName?.charAt(0) || ""}${
      card.contact.lastName?.charAt(0) || ""
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

          <View className="bg-white rounded-t-3xl shadow-2xl max-h-[85vh]">
            <ScrollView keyboardShouldPersistTaps="handled">
              {/* Header */}
              <View className="flex-row items-center justify-between px-6 pt-6 pb-4 border-b border-gray-200">
                <View className="flex-row items-center flex-1">
                  <View className="w-12 h-12 rounded-full bg-blue-100 items-center justify-center mr-3">
                    <Text className="text-blue-600 text-lg font-bold">
                      {initials}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-lg font-bold">
                      {card.contact.displayName}
                    </Text>
                    <Text className="text-sm text-gray-500">{card.reason}</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={onClose} className="p-2 -mr-2">
                  <X size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <View className="px-6 py-6">
                {/* Channel selector */}
                <View className="mb-6">
                  <Text className="text-sm font-semibold text-gray-700 mb-3">
                    Send via
                  </Text>
                  <View className="flex-row gap-2">
                    {(["sms", "call", "email"] as ChannelType[]).map(
                      (channel) => {
                        const config = channelConfig[channel];
                        const Icon = config.icon;
                        const isSelected = selectedChannel === channel;
                        return (
                          <TouchableOpacity
                            key={channel}
                            onPress={() => setSelectedChannel(channel)}
                            className={`flex-1 items-center py-3 rounded-xl border-2 ${
                              isSelected
                                ? "border-blue-500 bg-blue-50"
                                : "border-gray-200"
                            }`}
                          >
                            <Icon
                              size={24}
                              color={isSelected ? config.color : "#9CA3AF"}
                            />
                            <Text
                              className={`text-xs font-medium mt-1 ${
                                isSelected ? "text-gray-900" : "text-gray-500"
                              }`}
                            >
                              {config.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      }
                    )}
                  </View>
                </View>

                {/* Draft options */}
                <View className="mb-6">
                  <Text className="text-sm font-semibold text-gray-700 mb-3">
                    Pick a draft
                  </Text>
                  {loading ? (
                    <View className="py-8 items-center">
                      <ActivityIndicator size="large" color="#3B82F6" />
                      <Text className="text-gray-500 mt-2">
                        Generating drafts...
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
                              ? "border-blue-500 bg-blue-50"
                              : "border-gray-200 bg-gray-50"
                          }`}
                        >
                          <View className="flex-row items-center justify-between mb-2">
                            <Text
                              className={`text-xs font-semibold uppercase ${
                                selectedDraft?.id === draft.id
                                  ? "text-blue-600"
                                  : "text-gray-500"
                              }`}
                            >
                              {draft.tone}
                            </Text>
                          </View>
                          <Text className="text-gray-800 text-sm leading-5">
                            {draft.text}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>

                {/* Custom message */}
                <View className="mb-6">
                  <Text className="text-sm font-semibold text-gray-700 mb-3">
                    Or customize
                  </Text>
                  <TextInput
                    value={customMessage}
                    onChangeText={setCustomMessage}
                    placeholder="Write your own message..."
                    placeholderTextColor="#9CA3AF"
                    multiline
                    className="bg-gray-50 px-4 py-4 rounded-xl text-base min-h-[100px] text-gray-900 border border-gray-200"
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
