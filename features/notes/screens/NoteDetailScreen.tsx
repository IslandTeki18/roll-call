import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Share,
  Alert,
} from "react-native";
import { NoteWithContacts, NoteSource } from "../types/notes.type";
import { AISummaryBox } from "../ui/AISummary";
import { TagChip } from "../ui/TagChip";

interface NoteDetailScreenProps {
  note: NoteWithContacts;
  onEdit: (noteId: string) => void;
  onDelete: (noteId: string) => void;
  onContactPress: (contactId: string) => void;
  onBack: () => void;
  onRegenerateAI?: (noteId: string) => void;
}

export const NoteDetailScreen: React.FC<NoteDetailScreenProps> = ({
  note,
  onEdit,
  onDelete,
  onContactPress,
  onBack,
  onRegenerateAI,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const getSourceLabel = (source: NoteSource) => {
    switch (source) {
      case NoteSource.AUTO_OUTCOME:
        return "Auto-created after touch";
      case NoteSource.VOICE:
        return "Voice note";
      case NoteSource.MANUAL:
        return "Manual note";
      default:
        return "Note";
    }
  };

  const handleShare = async () => {
    try {
      const message = `Note about ${note.contacts.map((c) => c.name).join(", ")}:\n\n${note.content}`;
      await Share.share({ message });
    } catch (error) {
      console.error("Share error:", error);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Note",
      "Are you sure you want to delete this note? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => onDelete(note.id),
        },
      ]
    );
  };

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white border-b border-gray-200">
        <View className="px-4 py-3 flex-row items-center justify-between">
          <TouchableOpacity
            onPress={onBack}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            className="flex-row items-center gap-2"
          >
            <Text className="text-lg text-indigo-600">‹</Text>
            <Text className="text-base text-indigo-600 font-medium">Back</Text>
          </TouchableOpacity>

          <View className="flex-row items-center gap-3">
            <TouchableOpacity
              onPress={() => onEdit(note.id)}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text className="text-base text-indigo-600 font-semibold">
                Edit
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setShowMenu(!showMenu)}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text className="text-xl text-gray-600">⋯</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Dropdown menu */}
        {showMenu && (
          <View className="absolute top-14 right-4 bg-white rounded-lg border border-gray-200 shadow-lg z-50 min-w-[160px]">
            <TouchableOpacity
              className="px-4 py-3 border-b border-gray-100"
              onPress={() => {
                setShowMenu(false);
                handleShare();
              }}
              activeOpacity={0.7}
            >
              <Text className="text-sm text-gray-700 font-medium">
                📤 Share
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="px-4 py-3"
              onPress={() => {
                setShowMenu(false);
                handleDelete();
              }}
              activeOpacity={0.7}
            >
              <Text className="text-sm text-red-600 font-medium">
                🗑️ Delete
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Pinned indicator */}
        {note.isPinned && (
          <View className="mx-4 mt-4 px-3 py-2 bg-yellow-100 border border-yellow-300 rounded-lg flex-row items-center gap-2">
            <Text className="text-base">📌</Text>
            <Text className="text-sm font-semibold text-yellow-900">
              Pinned Note
            </Text>
          </View>
        )}

        {/* Contacts */}
        <View className="px-4 py-4 bg-white mt-4 border-y border-gray-200">
          <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Related Contacts
          </Text>
          <View className="gap-2">
            {note.contacts.map((contact) => (
              <TouchableOpacity
                key={contact.id}
                className="flex-row items-center gap-3 py-2"
                onPress={() => onContactPress(contact.id)}
                activeOpacity={0.7}
              >
                {contact.avatar ? (
                  <View className="w-10 h-10 rounded-full bg-gray-200">
                    {/* Avatar image would go here */}
                  </View>
                ) : (
                  <View className="w-10 h-10 rounded-full bg-indigo-100 items-center justify-center">
                    <Text className="text-base font-semibold text-indigo-600">
                      {contact.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                <View className="flex-1">
                  <Text className="text-base font-medium text-gray-900">
                    {contact.name}
                  </Text>
                </View>
                <Text className="text-gray-400">›</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Note content */}
        <View className="px-4 py-6 bg-white mt-4 border-y border-gray-200">
          <Text className="text-base text-gray-900 leading-6">
            {note.content}
          </Text>
        </View>

        {/* Tags */}
        {note.tags.length > 0 && (
          <View className="px-4 py-4 bg-white mt-4 border-y border-gray-200">
            <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Tags
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {note.tags.map((tag) => (
                <TagChip key={tag} tag={tag} />
              ))}
            </View>
          </View>
        )}

        {/* AI Insights */}
        {(note.aiSummary || note.aiEntities || note.aiNextCTA) && (
          <View className="px-4 py-4">
            <AISummaryBox
              summary={note.aiSummary}
              entities={note.aiEntities}
              nextAction={note.aiNextCTA}
              onRegenerateRequest={
                onRegenerateAI ? () => onRegenerateAI(note.id) : undefined
              }
            />
          </View>
        )}

        {/* Metadata */}
        <View className="px-4 py-4 bg-white mt-4 border-y border-gray-200">
          <View className="gap-2">
            {/* Source */}
            <View className="flex-row items-center gap-2">
              <Text className="text-xs text-gray-500 font-medium w-20">
                Source:
              </Text>
              <Text className="text-xs text-gray-700">
                {getSourceLabel(note.source)}
              </Text>
            </View>

            {/* Voice note indicator */}
            {note.isVoiceNote && note.voiceDuration && (
              <View className="flex-row items-center gap-2">
                <Text className="text-xs text-gray-500 font-medium w-20">
                  Duration:
                </Text>
                <Text className="text-xs text-gray-700">
                  {Math.floor(note.voiceDuration / 60)}:
                  {(note.voiceDuration % 60).toString().padStart(2, "0")}
                </Text>
              </View>
            )}

            {/* Created */}
            <View className="flex-row items-center gap-2">
              <Text className="text-xs text-gray-500 font-medium w-20">
                Created:
              </Text>
              <Text className="text-xs text-gray-700">
                {formatDate(note.createdAt)}
              </Text>
            </View>

            {/* Updated (if different from created) */}
            {note.updatedAt.getTime() !== note.createdAt.getTime() && (
              <View className="flex-row items-center gap-2">
                <Text className="text-xs text-gray-500 font-medium w-20">
                  Updated:
                </Text>
                <Text className="text-xs text-gray-700">
                  {formatDate(note.updatedAt)}
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
};
