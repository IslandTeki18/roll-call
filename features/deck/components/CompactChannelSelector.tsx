import { Lock, Mail, MessageSquare, Phone, Video } from "lucide-react-native";
import React from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { ChannelType } from "../types/deck.types";

interface CompactChannelSelectorProps {
  selectedChannel: ChannelType;
  onSelectChannel: (channel: ChannelType) => void;
  isPremium: boolean;
  onPremiumRequired: (feature: string) => void;
}

const channelConfig: Record<
  ChannelType,
  { icon: typeof Phone; label: string; color: string; isPremium: boolean }
> = {
  sms: {
    icon: MessageSquare,
    label: "SMS",
    color: "#10B981",
    isPremium: false,
  },
  call: { icon: Phone, label: "Call", color: "#3B82F6", isPremium: false },
  facetime: {
    icon: Video,
    label: "FaceTime",
    color: "#6366F1",
    isPremium: false,
  },
  email: { icon: Mail, label: "Email", color: "#8B5CF6", isPremium: true },
  slack: {
    icon: MessageSquare,
    label: "Slack",
    color: "#E11D48",
    isPremium: true,
  },
};

export default function CompactChannelSelector({
  selectedChannel,
  onSelectChannel,
  isPremium,
  onPremiumRequired,
}: CompactChannelSelectorProps) {
  return (
    <View className="mb-6">
      <Text className="text-sm font-semibold text-gray-300 mb-3">Send via</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="flex-row gap-2"
      >
        {(Object.keys(channelConfig) as ChannelType[]).map((channel) => {
          const config = channelConfig[channel];
          const Icon = config.icon;
          const isSelected = selectedChannel === channel;
          const isLocked = config.isPremium && !isPremium;

          return (
            <TouchableOpacity
              key={channel}
              onPress={() => {
                if (isLocked) {
                  onPremiumRequired(`${config.label} sends`);
                } else {
                  onSelectChannel(channel);
                }
              }}
              className={`flex-row items-center gap-2 px-4 py-2.5 rounded-full border-2 ${
                isSelected
                  ? "border-blue-500 bg-blue-900"
                  : isLocked
                    ? "border-dashed border-gray-700"
                    : "border-gray-700"
              }`}
            >
              <View className="relative">
                <Icon
                  size={18}
                  color={isSelected ? config.color : isLocked ? "#D1D5DB" : "#9CA3AF"}
                />
                {isLocked && (
                  <View className="absolute -bottom-1 -right-1 bg-gray-200 rounded-full p-0.5">
                    <Lock size={8} color="#9CA3AF" />
                  </View>
                )}
              </View>
              <Text
                className={`text-sm font-medium ${
                  isSelected
                    ? "text-white"
                    : isLocked
                      ? "text-gray-400"
                      : "text-gray-400"
                }`}
              >
                {config.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}
