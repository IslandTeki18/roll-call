import Avatar from "@/features/shared/components/Avatar";
import { Flame } from "lucide-react-native";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { Note } from "../types/notes.types";
import { BlurView } from "expo-blur";

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
    <BlurView
      intensity={80}
      tint="dark"
      className="flex-1 rounded-3xl overflow-hidden border-2 border-white/30 mb-3 "
      style={{
        shadowColor: "#1D1D1E33",
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
        elevation: 8,
      }}
    >
      <TouchableOpacity
        onPress={onPress}
        onLongPress={onLongPress}
        className="p-4 rounded-3xl backdrop-blur-xl"
        style={{
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.15,
          shadowRadius: 16,
          elevation: 4,
        }}
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
          <View
            className="flex-row items-center gap-1.5 bg-slate-900/80 px-3 py-1.5 rounded-full border border-orange-500/20"
            style={{
              shadowColor: "#F97316",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.3,
              shadowRadius: 6,
            }}
          >
            <Flame size={16} color="#F97316" fill="#F97316" />
            <Text className="text-white font-bold text-sm">
              {Math.round(rhsScore)}
            </Text>
          </View>
        </View>

        {/* Note Summary */}
        <Text className="text-gray-400 text-sm leading-5">{truncatedText}</Text>
      </TouchableOpacity>
    </BlurView>
  );
}
