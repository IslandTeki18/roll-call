import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { VoiceToTextButton } from "../ui/VoiceToTextButton";
import { TagChip } from "../ui/TagChip";
import { CreateNoteInput, NoteSource } from "../types/notes.type";

interface NoteEditorScreenProps {
  contactIds: string[]; // Pre-filled contact IDs
  contactNames?: string[]; // For display
  initialContent?: string;
  initialTags?: string[];
  initialIsPinned?: boolean;
  mode: "create" | "edit";
  noteId?: string; // Required for edit mode
  onSave: (note: CreateNoteInput) => void;
  onCancel: () => void;
}

export const NoteEditorScreen: React.FC<NoteEditorScreenProps> = ({
  contactIds,
  contactNames = [],
  initialContent = "",
  initialTags = [],
  initialIsPinned = false,
  mode = "create",
  noteId,
  onSave,
  onCancel,
}) => {
  const [content, setContent] = useState(initialContent);
  const [tags, setTags] = useState<string[]>(initialTags);
  const [isPinned, setIsPinned] = useState(initialIsPinned);
  const [newTag, setNewTag] = useState("");
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);

  const handleSave = () => {
    if (content.trim().length === 0) {
      Alert.alert("Empty Note", "Please add some content to your note.");
      return;
    }

    const noteData: CreateNoteInput = {
      content: content.trim(),
      contactIds,
      tags,
      isPinned,
      source: NoteSource.MANUAL,
    };

    onSave(noteData);
  };

  const handleAddTag = () => {
    const trimmedTag = newTag.trim().toLowerCase();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      setTags([...tags, trimmedTag]);
      setNewTag("");
      setIsAddingTag(false);
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  const handleVoicePress = () => {
    // UI-only for now - actual implementation later
    setIsRecording(!isRecording);
    if (!isRecording) {
      // Simulate recording
      Alert.alert("Voice Recording", "Voice-to-text will be implemented soon!");
    }
  };

  const canSave = content.trim().length > 0;

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      {/* Header */}
      <View className="px-4 py-3 border-b border-gray-200 flex-row items-center justify-between bg-white">
        <TouchableOpacity
          onPress={onCancel}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text className="text-base text-gray-600 font-medium">Cancel</Text>
        </TouchableOpacity>

        <Text className="text-lg font-semibold text-gray-900">
          {mode === "create" ? "New Note" : "Edit Note"}
        </Text>

        <TouchableOpacity
          onPress={handleSave}
          disabled={!canSave}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text
            className={`text-base font-semibold ${
              canSave ? "text-indigo-600" : "text-gray-400"
            }`}
          >
            Save
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Contact context */}
        {contactNames.length > 0 && (
          <View className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Note for
            </Text>
            <Text className="text-sm text-gray-900 font-medium">
              {contactNames.join(", ")}
            </Text>
          </View>
        )}

        {/* Content editor */}
        <View className="px-4 py-4">
          <TextInput
            className="text-base text-gray-900 leading-6 min-h-[200px]"
            value={content}
            onChangeText={setContent}
            placeholder="What do you want to remember about this conversation?"
            placeholderTextColor="#9CA3AF"
            multiline
            textAlignVertical="top"
            autoFocus={mode === "create"}
          />
        </View>

        {/* Voice to text section */}
        <View className="px-4 py-4 items-center border-t border-gray-100">
          <VoiceToTextButton
            variant="circular"
            size="md"
            onPress={handleVoicePress}
            isRecording={isRecording}
            duration={recordingDuration}
          />
        </View>

        {/* Tags section */}
        <View className="px-4 py-4 border-t border-gray-200">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-sm font-semibold text-gray-700">Tags</Text>
            {!isAddingTag && (
              <TouchableOpacity
                onPress={() => setIsAddingTag(true)}
                activeOpacity={0.7}
              >
                <Text className="text-sm text-indigo-600 font-semibold">
                  + Add Tag
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Tag input */}
          {isAddingTag && (
            <View className="flex-row items-center gap-2 mb-3">
              <TextInput
                className="flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-900"
                value={newTag}
                onChangeText={setNewTag}
                placeholder="Enter tag name..."
                placeholderTextColor="#9CA3AF"
                autoFocus
                autoCapitalize="none"
                onSubmitEditing={handleAddTag}
                returnKeyType="done"
              />
              <TouchableOpacity
                onPress={handleAddTag}
                disabled={newTag.trim().length === 0}
                activeOpacity={0.7}
                className={`px-4 py-2 rounded-lg ${
                  newTag.trim().length > 0 ? "bg-indigo-600" : "bg-gray-300"
                }`}
              >
                <Text className="text-sm text-white font-semibold">Add</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Tag chips */}
          {tags.length > 0 ? (
            <View className="flex-row flex-wrap gap-2">
              {tags.map((tag) => (
                <TagChip
                  key={tag}
                  tag={tag}
                  showRemove
                  onRemove={handleRemoveTag}
                />
              ))}
            </View>
          ) : (
            <Text className="text-sm text-gray-500 italic">
              No tags yet. Tags help you organize and find notes quickly.
            </Text>
          )}
        </View>

        {/* Pin section */}
        <View className="px-4 py-4 border-t border-gray-200">
          <TouchableOpacity
            className="flex-row items-center justify-between"
            onPress={() => setIsPinned(!isPinned)}
            activeOpacity={0.7}
          >
            <View className="flex-row items-center gap-3">
              <Text className="text-lg">{isPinned ? "📌" : "📍"}</Text>
              <View>
                <Text className="text-sm font-semibold text-gray-700">
                  Pin this note
                </Text>
                <Text className="text-xs text-gray-500">
                  Pinned notes appear at the top
                </Text>
              </View>
            </View>

            <View
              className={`w-12 h-7 rounded-full p-1 ${
                isPinned ? "bg-indigo-600" : "bg-gray-300"
              }`}
            >
              <View
                className={`w-5 h-5 rounded-full bg-white ${
                  isPinned ? "self-end" : "self-start"
                }`}
              />
            </View>
          </TouchableOpacity>
        </View>

        {/* Helper tips */}
        <View className="px-4 py-4 mx-4 bg-indigo-50 rounded-lg border border-indigo-100">
          <Text className="text-xs font-semibold text-indigo-900 mb-1">
            💡 Pro Tips
          </Text>
          <Text className="text-xs text-indigo-700 leading-4">
            • Use tags to categorize notes (work, personal, follow-up){"\n"}•
            Pin important notes to keep them at the top{"\n"}• AI will
            automatically extract key details after saving
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};
