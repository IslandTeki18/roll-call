import Avatar from "@/features/shared/components/Avatar";
import { EnrichedInteraction } from "@/features/profile/types/profile.types";
import { Flame, MessageSquare, Phone, Mail, Video, Send } from "lucide-react-native";
import React from "react";
import { Pressable, Text, View } from "react-native";
import { formatDistanceToNow } from "date-fns";

interface InteractionCardProps {
  interaction: EnrichedInteraction;
  onPress: () => void;
}

const getEngagementIcon = (type: string) => {
  const iconProps = { size: 16, color: "#9ca3af" };
  switch (type) {
    case "sms_sent":
      return <MessageSquare {...iconProps} />;
    case "call_made":
      return <Phone {...iconProps} />;
    case "email_sent":
      return <Mail {...iconProps} />;
    case "facetime_made":
      return <Video {...iconProps} />;
    case "slack_sent":
      return <Send {...iconProps} />;
    default:
      return <MessageSquare {...iconProps} />;
  }
};

const getRelationshipText = (interaction: EnrichedInteraction): string => {
  const parts = [];
  if (interaction.jobTitle) parts.push(interaction.jobTitle);
  if (interaction.organization) parts.push(interaction.organization);

  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0];
  return `${parts[0]} at ${parts[1]}`;
};

export function InteractionCard({ interaction, onPress }: InteractionCardProps) {
  const relationshipText = getRelationshipText(interaction);
  const timeAgo = formatDistanceToNow(new Date(interaction.timestamp), { addSuffix: true });

  return (
    <Pressable
      onPress={onPress}
      style={{ backgroundColor: "#2E2E33" }}
      className="rounded-xl p-4 mb-3 flex-row items-center active:opacity-70"
    >
      <Avatar size={40} name={interaction.contactName} />

      <View className="flex-1 ml-3">
        <View className="flex-row items-center justify-between mb-1">
          <Text className="text-white font-semibold" numberOfLines={1}>
            {interaction.contactName}
          </Text>
          <View className="flex-row items-center gap-1">
            <Flame size={16} color="#ef4444" />
            <Text className="text-white font-bold">{Math.round(interaction.rhsScore)}</Text>
          </View>
        </View>

        {relationshipText ? (
          <Text className="text-gray-400 text-xs mb-1" numberOfLines={1}>
            {relationshipText}
          </Text>
        ) : null}

        <View className="flex-row items-center gap-2">
          {getEngagementIcon(interaction.engagementType)}
          <Text className="text-gray-500 text-xs">{timeAgo}</Text>
        </View>
      </View>
    </Pressable>
  );
}
