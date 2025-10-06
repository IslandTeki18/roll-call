
import React from "react";
import { View } from "react-native";
import { ChannelButton } from "./ChannelButton";
import type { ChannelListProps } from "../types/communication.types";

export const ChannelList = ({
  channels,
  onChannelSelect,
  selectedChannel,
  layout = "row",
}) => {
  if (layout === "grid") {
    return (
      <View className="w-full">
        {/* Grid Layout - 2 columns */}
        <View className="flex-row flex-wrap gap-3">
          {channels.map((channel) => (
            <View key={channel.type} className="w-[48%]">
              <ChannelButton
                channel={channel}
                onPress={() => onChannelSelect(channel.type)}
                isSelected={selectedChannel === channel.type}
                disabled={
                  channel.status === "unavailable" ||
                  channel.status === "disabled"
                }
              />
            </View>
          ))}
        </View>
      </View>
    );
  }

  return (
    <View className="w-full">
      {/* Row Layout - Horizontal scroll */}
      <View className="flex-row gap-3">
        {channels.map((channel) => (
          <View key={channel.type} className="flex-1 min-w-[140px]">
            <ChannelButton
              channel={channel}
              onPress={() => onChannelSelect(channel.type)}
              isSelected={selectedChannel === channel.type}
              disabled={
                channel.status === "unavailable" ||
                channel.status === "disabled"
              }
            />
          </View>
        ))}
      </View>
    </View>
  );
};
