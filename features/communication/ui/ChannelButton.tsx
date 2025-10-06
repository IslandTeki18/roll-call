import React from "react";
import { Pressable, View, Text } from "react-native";
import { MessageCircle, Phone, Video, AlertCircle } from "lucide-react-native";
import type { ChannelButtonProps } from "../types/communication.types";

const CHANNEL_ICONS = {
  sms: MessageCircle,
  call: Phone,
  facetime: Video,
} as const;

export const ChannelButton: React.FC<ChannelButtonProps> = ({
  channel,
  onPress,
  isSelected = false,
  disabled = false,
}) => {
  const isAvailable = channel.status === "available";
  const needsPermission = channel.status === "permission_needed";
  const isUnavailable =
    channel.status === "unavailable" || channel.status === "disabled";

  const isDisabled = disabled || isUnavailable;

  const IconComponent = CHANNEL_ICONS[channel.type];

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      className={`
        flex-1
        min-h-[120px]
        rounded-2xl
        border-2
        items-center
        justify-center
        px-4
        py-6
        ${isSelected && isAvailable ? "bg-blue-50 border-blue-500" : ""}
        ${!isSelected && isAvailable ? "bg-white border-gray-200" : ""}
        ${needsPermission ? "bg-amber-50 border-amber-300" : ""}
        ${isUnavailable ? "bg-gray-50 border-gray-200" : ""}
        ${isDisabled ? "opacity-50" : "active:opacity-70"}
      `}
    >
      {/* Icon Container */}
      <View
        className={`
          w-14
          h-14
          rounded-full
          items-center
          justify-center
          mb-3
          ${isSelected && isAvailable ? "bg-blue-500" : ""}
          ${!isSelected && isAvailable ? "bg-gray-100" : ""}
          ${needsPermission ? "bg-amber-400" : ""}
          ${isUnavailable ? "bg-gray-200" : ""}
        `}
      >
        {needsPermission ? (
          <AlertCircle size={28} color="#FFFFFF" strokeWidth={2} />
        ) : (
          <IconComponent
            size={28}
            color={
              isSelected && isAvailable
                ? "#FFFFFF"
                : isUnavailable
                  ? "#9CA3AF"
                  : "#374151"
            }
            strokeWidth={2}
          />
        )}
      </View>

      {/* Label */}
      <Text
        className={`
          text-base
          font-semibold
          text-center
          ${isSelected && isAvailable ? "text-blue-600" : ""}
          ${!isSelected && isAvailable ? "text-gray-900" : ""}
          ${needsPermission ? "text-amber-700" : ""}
          ${isUnavailable ? "text-gray-400" : ""}
        `}
      >
        {channel.label}
      </Text>

      {/* Permission/Unavailable Badge */}
      {needsPermission && (
        <View className="mt-1">
          <Text className="text-xs text-amber-600 font-medium">
            Permission needed
          </Text>
        </View>
      )}

      {isUnavailable && (
        <View className="mt-1">
          <Text className="text-xs text-gray-400 font-medium">N/A</Text>
        </View>
      )}
    </Pressable>
  );
};
