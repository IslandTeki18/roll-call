import { Check } from "lucide-react-native";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";

interface SuggestedDraftProps {
  draftText: string;
  onCopy: () => void;
  showFeedback: boolean;
}

export default function SuggestedDraft({
  draftText,
  onCopy,
  showFeedback,
}: SuggestedDraftProps) {
  return (
    <View className="mb-6">
      <Text className="text-xs font-semibold text-gray-400 uppercase mb-2">
        Suggested
      </Text>
      <TouchableOpacity
        onPress={onCopy}
        className="bg-slate-900 p-4 rounded-xl border border-gray-700 relative"
        activeOpacity={0.7}
      >
        <Text className="text-gray-300 text-sm leading-5">{draftText}</Text>

        {/* Copy Feedback */}
        {showFeedback && (
          <View className="absolute top-2 right-2 bg-green-500 rounded-full p-1.5">
            <Check size={16} color="white" />
          </View>
        )}
      </TouchableOpacity>
      <Text className="text-xs text-gray-500 mt-2 text-center">
        Tap to copy
      </Text>
    </View>
  );
}
