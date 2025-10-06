import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { ArrowLeft, User } from "lucide-react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ChannelList } from "../ui/ChannelList";
import { PermissionNotice } from "../ui/PermissionNotice";
import type {
  ChannelType,
  Channel,
  ContactCommInfo,
} from "../types/communication.types";
import {
  getMockChannels,
  getContactById,
} from "../mock/communications";

export default function ChannelPickerScreen() {
  const router = useRouter();
  const { contactId } = useLocalSearchParams<{ contactId: string }>();

  const [channels, setChannels] = useState<Channel[]>([]);
  const [contact, setContact] = useState<ContactCommInfo | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<ChannelType | null>(
    null
  );

  useEffect(() => {
    setChannels(getMockChannels());
    setContact(getContactById(contactId!) || null);
  }, [contactId]);

  const handleChannelSelect = (channel: ChannelType) => {
    setSelectedChannel(channel);
    // Navigate to compose screen with params
    router.push({
      pathname: "/(communications)/compose",
      params: { contactId: contactId!, channel },
    });
  };

  const availableChannels = channels.filter(
    (ch) => ch.status === "available" || ch.status === "permission_needed"
  );

  const permissionChannels = channels.filter(
    (ch) => ch.status === "permission_needed"
  );

  const hasNoAvailableChannels = availableChannels.length === 0;

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white border-b border-gray-200 px-4 py-3">
        <View className="flex-row items-center">
          {/* Back Button */}
          <Pressable
            onPress={() => router.back()}
            className="mr-3 active:opacity-70"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <ArrowLeft size={24} color="#374151" strokeWidth={2} />
          </Pressable>

          {/* Contact Info */}
          <View className="flex-1 flex-row items-center">
            {contact?.avatar ? (
              <View className="w-10 h-10 rounded-full bg-gray-200 mr-3 overflow-hidden">
                <View className="w-full h-full items-center justify-center">
                  <User size={20} color="#6B7280" strokeWidth={2} />
                </View>
              </View>
            ) : (
              <View className="w-10 h-10 rounded-full bg-gray-200 mr-3 items-center justify-center">
                <Text className="text-base font-semibold text-gray-600">
                  {contact?.name.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}

            <View className="flex-1">
              <Text className="text-lg font-semibold text-gray-900">
                {contact?.name || "Contact"}
              </Text>
              {contact?.isFresh && (
                <View className="flex-row items-center mt-0.5">
                  <View className="bg-emerald-100 px-2 py-0.5 rounded-full">
                    <Text className="text-xs font-semibold text-emerald-700">
                      NEW
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </View>
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="p-4">
        {/* Title */}
        <View className="mb-6">
          <Text className="text-2xl font-bold text-gray-900 mb-2">
            Choose a way to reach {contact?.name?.split(" ")[0] || "them"}
          </Text>
          <Text className="text-base text-gray-600">
            Select how you'd like to connect
          </Text>
        </View>

        {/* No Available Channels State */}
        {hasNoAvailableChannels ? (
          <View className="space-y-4">
            <PermissionNotice
              channel={
                channels[0] || {
                  type: "sms",
                  label: "Message",
                  icon: "message-circle",
                  status: "unavailable",
                  platform: "both",
                  permissionMessage:
                    "No communication channels are currently available",
                }
              }
            />

            <View className="bg-white rounded-xl p-6 items-center">
              <Text className="text-base text-gray-600 text-center">
                Please enable permissions or check your device settings to
                continue
              </Text>
            </View>
          </View>
        ) : (
          <>
            {/* Permission Notices */}
            {permissionChannels.length > 0 && (
              <View className="mb-4 space-y-3">
                {permissionChannels.map((channel) => (
                  <PermissionNotice
                    key={channel.type}
                    channel={channel}
                    onRequestPermission={() => {
                      console.log("Request permission for:", channel.type);
                    }}
                  />
                ))}
              </View>
            )}

            {/* Channel List */}
            <View className="mb-6">
              <ChannelList
                channels={availableChannels}
                onChannelSelect={handleChannelSelect}
                selectedChannel={selectedChannel}
                layout="grid"
              />
            </View>

            {/* Helper Text */}
            <View className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <Text className="text-sm text-blue-900 text-center">
                💡 Your message will be sent through your device's native app
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}
