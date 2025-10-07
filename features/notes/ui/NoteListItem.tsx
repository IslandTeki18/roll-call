import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Note, NoteWithContacts } from "./note.types";

interface NoteListItemProps {
  note: Note | NoteWithContacts;
  onPress: (noteId: string) => void;
  showContacts?: boolean; // Whether to show contact names (for global view)
}

export const NoteListItem: React.FC<NoteListItemProps> = ({
  note,
  onPress,
  showContacts = false,
}) => {
  // Format date to relative time
  const formatDate = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  // Truncate content to first 2 lines (approximately 80 chars)
  const truncateContent = (text: string) => {
    const maxLength = 80;
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + "...";
  };

  // Type guard to check if note has contacts data
  const hasContactsData = (
    n: Note | NoteWithContacts
  ): n is NoteWithContacts => {
    return "contacts" in n && Array.isArray(n.contacts);
  };

  const contactNames = hasContactsData(note)
    ? note.contacts.map((c) => c.name).join(", ")
    : null;

  return (
    <TouchableOpacity
      className={`
        bg-white rounded-xl p-4 mb-3 border
        ${note.isPinned ? "border-2 border-yellow-300 bg-yellow-50" : "border-gray-200"}
        shadow-sm
      `}
      onPress={() => onPress(note.id)}
      activeOpacity={0.7}
    >
      {/* Header row with pin, voice indicator, and date */}
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center gap-1.5">
          {note.isPinned && (
            <View className="mr-1">
              <Text className="text-sm">📌</Text>
            </View>
          )}
          {note.isVoiceNote && (
            <View className="mr-1">
              <Text className="text-sm">🎤</Text>
            </View>
          )}
        </View>
        <Text className="text-xs text-gray-500 font-medium">
          {formatDate(note.createdAt)}
        </Text>
      </View>

      {/* Contact names (if showing and available) */}
      {showContacts && contactNames && (
        <Text
          className="text-sm text-gray-600 font-semibold mb-1.5"
          numberOfLines={1}
        >
          {contactNames}
        </Text>
      )}

      {/* Note content preview */}
      <Text
        className="text-base text-gray-900 leading-5 mb-2"
        numberOfLines={2}
      >
        {truncateContent(note.content)}
      </Text>

      {/* AI Summary indicator (if exists) */}
      {note.aiSummary && (
        <View className="bg-purple-100 rounded-md px-2 py-1 self-start mb-2">
          <Text className="text-xs text-purple-700 font-semibold">
            ✨ AI Summary available
          </Text>
        </View>
      )}

      {/* Tags row */}
      {note.tags.length > 0 && (
        <View className="flex-row flex-wrap gap-1.5 items-center">
          {note.tags.slice(0, 3).map((tag, index) => (
            <View key={index} className="bg-indigo-50 rounded-md px-2 py-1">
              <Text className="text-xs text-indigo-600 font-medium">{tag}</Text>
            </View>
          ))}
          {note.tags.length > 3 && (
            <Text className="text-xs text-gray-400 font-medium">
              +{note.tags.length - 3} more
            </Text>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};
