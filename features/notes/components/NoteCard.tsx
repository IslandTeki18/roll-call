import { Link2, Pin, Sparkles } from "lucide-react-native";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { Note } from "../types/notes.types";

interface NoteCardProps {
  note: Note;
  onPress: () => void;
  onLongPress?: () => void;
}

export default function NoteCard({
  note,
  onPress,
  onLongPress,
}: NoteCardProps) {
  const contactCount = note.contactIds
    ? note.contactIds.split(",").filter(Boolean).length
    : 0;
  const tags = note.tags ? note.tags.split(",").filter(Boolean) : [];
  const hasAISummary = note.processingStatus === "completed" && note.aiSummary;

  const displayText = hasAISummary ? note.aiSummary : note.rawText;
  const truncatedText =
    displayText.length > 120
      ? displayText.substring(0, 120) + "..."
      : displayText;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={onLongPress}
      className="bg-gray-900 p-4 rounded-xl border border-gray-700 mb-3"
    >
      {/* Header row */}
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center gap-2">
          {note.isPinned && <Pin size={14} color="#60A5FA" fill="#60A5FA" />}
          {hasAISummary && <Sparkles size={14} color="#A78BFA" />}
          {contactCount > 0 && (
            <View className="flex-row items-center gap-1">
              <Link2 size={12} color="#9CA3AF" />
              <Text className="text-xs text-gray-400">{contactCount}</Text>
            </View>
          )}
        </View>
        <Text className="text-xs text-gray-500">
          {formatDate(note.$updatedAt)}
        </Text>
      </View>

      {/* Content */}
      <Text className="text-gray-300 text-sm leading-5 mb-2">
        {truncatedText}
      </Text>

      {/* Tags */}
      {tags.length > 0 && (
        <View className="flex-row flex-wrap gap-1">
          {tags.slice(0, 3).map((tag) => (
            <View key={tag} className="bg-gray-700 px-2 py-0.5 rounded-full">
              <Text className="text-xs text-gray-300">#{tag}</Text>
            </View>
          ))}
          {tags.length > 3 && (
            <Text className="text-xs text-gray-500">+{tags.length - 3}</Text>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}
