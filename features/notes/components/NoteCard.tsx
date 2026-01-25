import Avatar from "@/features/shared/components/Avatar";
import { Flame } from "lucide-react-native";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { Note } from "../types/notes.types";

interface NoteCardProps {
  note: Note;
  contactName?: string;
  rhsScore?: number;
  onPress: () => void;
  onLongPress?: () => void;
}

export default function NoteCard({
  note,
  contactName = "Unknown Contact",
  rhsScore = 0,
  onPress,
  onLongPress,
}: NoteCardProps) {
  const hasAISummary = note.processingStatus === "completed" && note.aiSummary;
  const displayText = hasAISummary ? note.aiSummary : note.rawText;
  const truncatedText =
    displayText.length > 120
      ? displayText.substring(0, 120) + "..."
      : displayText;

  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={onLongPress}
      className="bg-slate-900 p-4 rounded-2xl border border-gray-700 mb-3"
    >
      {/* Header: Avatar + Name + RHS Score */}
      <View className="flex-row items-center justify-between mb-3">
        {/* Left: Avatar + Name */}
        <View className="flex-row items-center gap-3 flex-1">
          <Avatar name={contactName} size={40} />
          <Text className="text-white font-bold text-base uppercase tracking-wide">
            {contactName}
          </Text>
        </View>

        {/* Right: RHS Score */}
        <View className="flex-row items-center gap-1.5 bg-slate-900 px-3 py-1.5 rounded-full">
          <Flame size={16} color="#F97316" fill="#F97316" />
          <Text className="text-white font-bold text-sm">
            {Math.round(rhsScore)}
          </Text>
        </View>
      </View>

      {/* Note Summary */}
      <Text className="text-gray-400 text-sm leading-5">{truncatedText}</Text>
    </TouchableOpacity>
  );
}
