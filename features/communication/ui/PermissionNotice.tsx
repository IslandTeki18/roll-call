import React from "react";
import { View, Text, Pressable } from "react-native";
import { AlertCircle, ShieldAlert, X, ChevronRight } from "lucide-react-native";
import type { PermissionNoticeProps } from "../types/communication.types";

export const PermissionNotice: React.FC<PermissionNoticeProps> = ({
  channel,
  onRequestPermission,
  onDismiss,
}) => {
  const isPermissionNeeded = channel.status === "permission_needed";
  const isUnavailable = channel.status === "unavailable";

  // Determine banner style based on status
  const bannerStyle = isPermissionNeeded
    ? {
        bg: "bg-amber-50",
        border: "border-amber-200",
        iconBg: "bg-amber-100",
        iconColor: "#F59E0B",
        textColor: "text-amber-900",
        subTextColor: "text-amber-700",
      }
    : {
        bg: "bg-gray-50",
        border: "border-gray-200",
        iconBg: "bg-gray-100",
        iconColor: "#6B7280",
        textColor: "text-gray-900",
        subTextColor: "text-gray-600",
      };

  return (
    <View
      className={`
        w-full
        ${bannerStyle.bg}
        ${bannerStyle.border}
        border
        rounded-xl
        p-4
        flex-row
        items-start
      `}
    >
      {/* Icon */}
      <View
        className={`
          w-10
          h-10
          ${bannerStyle.iconBg}
          rounded-full
          items-center
          justify-center
          mr-3
          flex-shrink-0
        `}
      >
        {isPermissionNeeded ? (
          <ShieldAlert
            size={20}
            color={bannerStyle.iconColor}
            strokeWidth={2}
          />
        ) : (
          <AlertCircle
            size={20}
            color={bannerStyle.iconColor}
            strokeWidth={2}
          />
        )}
      </View>

      {/* Content */}
      <View className="flex-1 mr-2">
        {/* Title */}
        <Text className={`text-sm font-semibold ${bannerStyle.textColor} mb-1`}>
          {isPermissionNeeded
            ? `${channel.label} Permission Needed`
            : `${channel.label} Unavailable`}
        </Text>

        {/* Message */}
        <Text className={`text-sm ${bannerStyle.subTextColor} leading-5`}>
          {channel.permissionMessage ||
            (isPermissionNeeded
              ? `RollCall needs permission to use ${channel.label.toLowerCase()}`
              : `${channel.label} is not available on this device`)}
        </Text>

        {/* Action Button (if permission can be requested) */}
        {isPermissionNeeded && onRequestPermission && (
          <Pressable
            onPress={onRequestPermission}
            className="flex-row items-center mt-3 active:opacity-70"
          >
            <Text className="text-sm font-semibold text-amber-700 mr-1">
              Grant Permission
            </Text>
            <ChevronRight size={16} color="#B45309" strokeWidth={2.5} />
          </Pressable>
        )}
      </View>

      {/* Dismiss Button (optional) */}
      {onDismiss && (
        <Pressable
          onPress={onDismiss}
          className="w-8 h-8 items-center justify-center active:opacity-70 flex-shrink-0"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <X size={18} color={bannerStyle.iconColor} strokeWidth={2} />
        </Pressable>
      )}
    </View>
  );
};
