import React, { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { ExtractedEntity, SuggestedNextAction } from "../types/notes.type";

interface AISummaryBoxProps {
  summary?: string;
  entities?: ExtractedEntity[];
  nextAction?: SuggestedNextAction;
  isProcessing?: boolean;
  onRegenerateRequest?: () => void;
}

export const AISummaryBox: React.FC<AISummaryBoxProps> = ({
  summary,
  entities = [],
  nextAction,
  isProcessing = false,
  onRegenerateRequest,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  // Don't render if no AI data and not processing
  if (!summary && !nextAction && entities.length === 0 && !isProcessing) {
    return null;
  }

  const formatDate = (date: Date) => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) return "Today";
    if (date.toDateString() === tomorrow.toDateString()) return "Tomorrow";

    const diffDays = Math.floor(
      (date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (diffDays <= 7) return `In ${diffDays} days`;

    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const getEntityIcon = (type: string) => {
    switch (type) {
      case "person":
        return "👤";
      case "organization":
        return "🏢";
      case "date":
        return "📅";
      case "location":
        return "📍";
      case "project":
        return "📋";
      case "topic":
        return "💡";
      default:
        return "🔖";
    }
  };

  return (
    <View className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <TouchableOpacity
        className="flex-row items-center justify-between px-4 py-3 bg-white"
        onPress={() => setIsExpanded(!isExpanded)}
        activeOpacity={0.7}
      >
        <View className="flex-row items-center gap-2">
          <Text className="text-base">✨</Text>
          <Text className="text-base font-semibold text-gray-900">
            AI Insights
          </Text>
        </View>
        <Text className="text-xs text-gray-500">{isExpanded ? "▼" : "▶"}</Text>
      </TouchableOpacity>

      {/* Content (collapsible) */}
      {isExpanded && (
        <View className="p-4 gap-4">
          {/* Processing state */}
          {isProcessing && (
            <View className="py-5 items-center">
              <Text className="text-sm text-gray-500 italic">
                Analyzing note...
              </Text>
            </View>
          )}

          {/* Summary */}
          {summary && !isProcessing && (
            <View className="gap-2">
              <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Summary
              </Text>
              <Text className="text-sm leading-5 text-gray-700">{summary}</Text>
            </View>
          )}

          {/* Entities */}
          {entities.length > 0 && !isProcessing && (
            <View className="gap-2">
              <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Key Info
              </Text>
              <View className="flex-row flex-wrap gap-2 items-center">
                {entities.slice(0, 5).map((entity, index) => (
                  <View
                    key={index}
                    className="flex-row items-center bg-white rounded-lg px-2.5 py-1.5 gap-1.5 border border-gray-200"
                  >
                    <Text className="text-xs">
                      {getEntityIcon(entity.type)}
                    </Text>
                    <Text className="text-sm text-gray-700 font-medium">
                      {entity.value}
                    </Text>
                  </View>
                ))}
                {entities.length > 5 && (
                  <Text className="text-xs text-gray-400 italic">
                    +{entities.length - 5} more
                  </Text>
                )}
              </View>
            </View>
          )}

          {/* Next Action */}
          {nextAction && !isProcessing && (
            <View className="gap-2">
              <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Suggested Next Step
              </Text>
              <View className="bg-indigo-50 rounded-lg p-3 border-l-4 border-indigo-600">
                <View className="flex-row items-start justify-between gap-2 mb-1">
                  <Text className="flex-1 text-sm leading-5 text-gray-800 font-medium">
                    {nextAction.action}
                  </Text>
                  {nextAction.channel && (
                    <View className="bg-indigo-600 rounded px-1.5 py-0.5">
                      <Text className="text-xs text-white font-semibold capitalize">
                        {nextAction.channel}
                      </Text>
                    </View>
                  )}
                </View>
                {nextAction.suggestedDate && (
                  <Text className="text-xs text-indigo-600 font-semibold">
                    {formatDate(nextAction.suggestedDate)}
                  </Text>
                )}
              </View>
            </View>
          )}

          {/* Regenerate button */}
          {!isProcessing && onRegenerateRequest && (summary || nextAction) && (
            <TouchableOpacity
              className="self-start px-3 py-1.5 rounded-md bg-white border border-gray-200"
              onPress={onRegenerateRequest}
              activeOpacity={0.7}
            >
              <Text className="text-sm text-gray-600 font-medium">
                🔄 Regenerate
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};
