import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { ArrowLeft, Send } from "lucide-react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ComposePreview } from "../ui/ComposePreview";
import type {
  Draft,
  ContactCommInfo,
  ChannelType,
} from "../types/communication.types";
import {
  getContactById,
  getDraftsForContact,
} from "../mock/communications";

export default function ComposeScreen() {
  const router = useRouter();
  const { contactId, channel, draftId } = useLocalSearchParams<{
    contactId: string;
    channel: ChannelType;
    draftId?: string;
  }>();

  const [contact, setContact] = useState<ContactCommInfo | null>(null);
  const [selectedDraft, setSelectedDraft] = useState<Draft | null>(null);
  const [availableDrafts, setAvailableDrafts] = useState<Draft[]>([]);

  useEffect(() => {
    setContact(getContactById(contactId!) || null);
    const drafts = getDraftsForContact(contactId!);
    setAvailableDrafts(drafts);

    if (!draftId && drafts.length > 0) {
      setSelectedDraft(drafts[0]);
    } else if (draftId) {
      const foundDraft = drafts.find((d) => d.id === draftId);
      setSelectedDraft(foundDraft || drafts[0]);
    }
  }, [contactId, draftId]);

  const handleSend = () => {
    if (!contact || !selectedDraft) return;

    console.log("Send message:", {
      contactId: contact.id,
      channel,
      draft: selectedDraft,
    });

    // Future: Navigate to OutcomeSheet
    // router.push({
    //   pathname: '/(communications)/outcome',
    //   params: { contactId, channel, draftId: selectedDraft.id }
    // });

    // For now, go back
    router.back();
  };

  const canSend = !!contact && !!selectedDraft;
  const isCallChannel = channel === "call" || channel === "facetime";

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white border-b border-gray-200 px-4 py-3">
        <View className="flex-row items-center justify-between">
          {/* Back Button */}
          <Pressable
            onPress={() => router.back()}
            className="mr-3 active:opacity-70"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <ArrowLeft size={24} color="#374151" strokeWidth={2} />
          </Pressable>

          {/* Title */}
          <View className="flex-1">
            <Text className="text-lg font-semibold text-gray-900">
              {isCallChannel ? "Start Call" : "Send Message"}
            </Text>
            <Text className="text-sm text-gray-500">
              to {contact?.name || "Contact"}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="p-4">
        {/* Draft Selection */}
        {availableDrafts.length > 1 && channel === "sms" && (
          <View className="mb-4">
            <Text className="text-sm font-semibold text-gray-700 mb-3">
              Choose a message
            </Text>
            <View className="space-y-3">
              {availableDrafts.map((draftOption) => (
                <Pressable
                  key={draftOption.id}
                  onPress={() => setSelectedDraft(draftOption)}
                  className={`
                    bg-white
                    border-2
                    rounded-xl
                    p-3
                    active:opacity-70
                    ${selectedDraft?.id === draftOption.id ? "border-blue-500" : "border-gray-200"}
                  `}
                >
                  <Text className="text-sm text-gray-900 leading-5 mb-2">
                    {draftOption.text}
                  </Text>
                  {draftOption.context && (
                    <Text className="text-xs text-gray-500">
                      {draftOption.context}
                    </Text>
                  )}
                  {selectedDraft?.id === draftOption.id && (
                    <View className="absolute top-3 right-3">
                      <View className="w-5 h-5 rounded-full bg-blue-500 items-center justify-center">
                        <Text className="text-white text-xs">✓</Text>
                      </View>
                    </View>
                  )}
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* Compose Preview */}
        {contact && selectedDraft && (
          <View className="mb-6">
            <ComposePreview
              draft={selectedDraft}
              contact={contact}
              channel={channel!}
              onEdit={() => {
                console.log("Edit draft");
              }}
            />
          </View>
        )}

        {/* Call/FaceTime Info Card */}
        {isCallChannel && contact && (
          <View className="bg-purple-50 border border-purple-200 rounded-xl p-4 mb-6">
            <Text className="text-sm text-purple-900 text-center leading-5">
              {channel === "facetime"
                ? `📹 Tap Send to start a FaceTime call with ${contact.name.split(" ")[0]}`
                : `📞 Tap Send to start a phone call with ${contact.name.split(" ")[0]}`}
            </Text>
          </View>
        )}

        {/* Helper Info */}
        {channel === "sms" && (
          <View className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <Text className="text-sm text-blue-900 text-center">
              💡 Your message will open in your default messaging app
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Bottom Action Bar */}
      <View className="bg-white border-t border-gray-200 px-4 py-4">
        <Pressable
          onPress={handleSend}
          disabled={!canSend}
          className={`
            flex-row
            items-center
            justify-center
            rounded-xl
            py-4
            ${canSend ? "bg-blue-500 active:bg-blue-600" : "bg-gray-200"}
          `}
        >
          <Send
            size={20}
            color={canSend ? "#FFFFFF" : "#9CA3AF"}
            strokeWidth={2}
          />
          <Text
            className={`
              ml-2
              text-base
              font-semibold
              ${canSend ? "text-white" : "text-gray-400"}
            `}
          >
            {isCallChannel ? "Start Call" : "Send Message"}
          </Text>
        </Pressable>

        {/* Privacy Note */}
        <Text className="text-xs text-gray-500 text-center mt-3">
          RollCall doesn't send messages automatically. You'll confirm in your
          device's app.
        </Text>
      </View>
    </View>
  );
}
