import React from "react";
import { View, Text, Pressable } from "react-native";
import { MessageCircle, Phone, Video, Edit3 } from "lucide-react-native";
import type { ComposePreviewProps } from "../types/communication.types";

const CHANNEL_CONFIG = {
  sms: { icon: MessageCircle, label: "Message", color: "#3B82F6" },
  call: { icon: Phone, label: "Call", color: "#10B981" },
  facetime: { icon: Video, label: "FaceTime", color: "#8B5CF6" },
} as const;

export const ComposePreview: React.FC<ComposePreviewProps> = ({
  draft,
  contact,
  channel,
  onEdit,
}) => {
  const channelConfig = CHANNEL_CONFIG[channel];
  const ChannelIcon = channelConfig.icon;

  const hasMessage = !!draft?.text;
  const characterCount = draft?.characterCount || 0;
  const isNearLimit = characterCount > 120;
  const isOverLimit = characterCount > 140;

  return (
    <View className="w-full">
      {/* Preview Card */}
      <Pressable
        onPress={onEdit}
        disabled={!onEdit}
        className={`
          bg-white
          border-2
          rounded-2xl
          p-4
          min-h-[140px]
          ${hasMessage ? "border-gray-200" : "border-dashed border-gray-300"}
          ${onEdit ? "active:opacity-70" : ""}
        `}
      >
        {/* Header: Contact Name */}
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center flex-1">
            {/* Contact Avatar Circle */}
            <View className="w-8 h-8 rounded-full bg-gray-200 items-center justify-center mr-2">
              <Text className="text-sm font-semibold text-gray-600">
                {contact.name.charAt(0).toUpperCase()}
              </Text>
            </View>

            <View className="flex-1">
              <Text className="text-sm font-semibold text-gray-900">
                {contact.name}
              </Text>
              {contact.isFresh && (
                <View className="mt-0.5">
                  <View className="bg-emerald-100 px-2 py-0.5 rounded-full self-start">
                    <Text className="text-xs font-semibold text-emerald-700">
                      NEW
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </View>

          {/* Edit Icon */}
          {onEdit && hasMessage && (
            <View className="ml-2">
              <Edit3 size={18} color="#9CA3AF" strokeWidth={2} />
            </View>
          )}
        </View>

        {/* Message Preview or Placeholder */}
        <View className="flex-1 justify-center">
          {hasMessage ? (
            <Text className="text-base text-gray-900 leading-6">
              {draft.text}
            </Text>
          ) : (
            <Text className="text-base text-gray-400 italic">
              Type your message…
            </Text>
          )}
        </View>

        {/* Context/Source Info */}
        {draft?.context && (
          <View className="mt-3 pt-3 border-t border-gray-100">
            <Text className="text-xs text-gray-500">{draft.context}</Text>
          </View>
        )}
      </Pressable>

      {/* Indicators Row */}
      <View className="flex-row items-center justify-between mt-3 px-1">
        {/* Channel Indicator */}
        <View className="flex-row items-center">
          <View
            className="w-6 h-6 rounded-full items-center justify-center mr-2"
            style={{ backgroundColor: `${channelConfig.color}15` }}
          >
            <ChannelIcon
              size={14}
              color={channelConfig.color}
              strokeWidth={2.5}
            />
          </View>
          <Text className="text-sm font-medium text-gray-600">
            {channelConfig.label}
          </Text>
        </View>

        {/* Character Count - Only show for SMS */}
        {channel === "sms" && hasMessage && (
          <View className="flex-row items-center">
            <Text
              className={`
                text-sm
                font-medium
                ${isOverLimit ? "text-red-600" : ""}
                ${isNearLimit && !isOverLimit ? "text-amber-600" : ""}
                ${!isNearLimit ? "text-gray-500" : ""}
              `}
            >
              {characterCount}
            </Text>
            <Text className="text-sm text-gray-400 ml-1">/ 140</Text>
          </View>
        )}

        {/* Call/FaceTime Duration Placeholder */}
        {(channel === "call" || channel === "facetime") && (
          <Text className="text-sm text-gray-500">Tap to start</Text>
        )}
      </View>
    </View>
  );
};
