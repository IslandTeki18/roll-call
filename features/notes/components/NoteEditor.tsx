import { usePremiumGate } from "@/features/auth/hooks/usePremiumGate";
import { useUserProfile } from "@/features/auth/hooks/useUserProfile";
import {
  loadContacts,
  ProfileContact,
} from "@/features/contacts/api/contacts.service";
import {
  ChevronLeft,
  Link2,
  Pin,
  PinOff,
  Save,
  Sparkles,
  Tag,
  Trash2,
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNoteEditor } from "../hooks/useNotes";
import ContactPicker from "./ContactPicker";
import TagInput from "./TagInput";

interface NoteEditorProps {
  noteId?: string;
  preSelectedContactId?: string;
  onBack: () => void;
  onDelete?: () => void;
  existingTags?: string[];
}

export default function NoteEditor({
  noteId,
  preSelectedContactId,
  onBack,
  onDelete,
  existingTags = [],
}: NoteEditorProps) {
  const { profile } = useUserProfile();
  const { isPremium } = usePremiumGate();
  const {
    note,
    rawText,
    contactIds,
    tags,
    isPinned,
    loading,
    saving,
    error,
    isDirty,
    updateRawText,
    updateContactIds,
    updateTags,
    updatePinned,
    save,
  } = useNoteEditor(noteId);

  const [contactPickerVisible, setContactPickerVisible] = useState(false);
  const [linkedContacts, setLinkedContacts] = useState<ProfileContact[]>([]);

  // Handle pre-selected contact on mount
  useEffect(() => {
    if (preSelectedContactId && !noteId) {
      updateContactIds([preSelectedContactId]);
    }
  }, [preSelectedContactId, noteId]);

  useEffect(() => {
    if (profile && contactIds.length > 0) {
      loadContacts(profile.$id).then((allContacts) => {
        const linked = allContacts.filter((c) => contactIds.includes(c.$id));
        setLinkedContacts(linked);
      });
    } else {
      setLinkedContacts([]);
    }
  }, [profile, contactIds]);

  const handleSave = async () => {
    const saved = await save();
    if (saved && !noteId) {
      onBack();
    }
  };

  const handleDelete = () => {
    Alert.alert("Delete Note", "Are you sure you want to delete this note?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          onDelete?.();
          onBack();
        },
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        {/* Header */}
        <View className="bg-white px-4 py-3 border-b border-gray-200 flex-row items-center justify-between">
          <TouchableOpacity onPress={onBack} className="flex-row items-center">
            <ChevronLeft size={24} color="#000" />
            <Text className="text-base ml-1">Back</Text>
          </TouchableOpacity>

          <View className="flex-row items-center gap-3">
            {saving && (
              <View className="flex-row items-center gap-1">
                <ActivityIndicator size="small" color="#9CA3AF" />
                <Text className="text-xs text-gray-400">Saving...</Text>
              </View>
            )}
            {!saving && isDirty && (
              <Text className="text-xs text-amber-600">Unsaved</Text>
            )}

            <TouchableOpacity
              onPress={() => updatePinned(!isPinned)}
              className="p-2"
            >
              {isPinned ? (
                <Pin size={20} color="#3B82F6" fill="#3B82F6" />
              ) : (
                <PinOff size={20} color="#9CA3AF" />
              )}
            </TouchableOpacity>

            {noteId && (
              <TouchableOpacity onPress={handleDelete} className="p-2">
                <Trash2 size={20} color="#EF4444" />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={handleSave}
              disabled={saving || !rawText.trim()}
              className={`px-4 py-2 rounded-lg ${
                saving || !rawText.trim() ? "bg-gray-300" : "bg-blue-600"
              }`}
            >
              <Save size={18} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
          {/* Error */}
          {error && (
            <View className="mx-4 mt-4 p-3 bg-red-50 rounded-lg">
              <Text className="text-red-700 text-sm">{error}</Text>
            </View>
          )}

          {/* Main text input */}
          <View className="bg-white m-4 rounded-xl border border-gray-200">
            <TextInput
              value={rawText}
              onChangeText={updateRawText}
              placeholder="Write your note..."
              placeholderTextColor="#9CA3AF"
              multiline
              className="p-4 text-base text-gray-900 min-h-[200px]"
              style={{ textAlignVertical: "top" }}
            />
          </View>

          {/* Linked contacts */}
          <View className="mx-4 mb-4">
            <TouchableOpacity
              onPress={() => setContactPickerVisible(true)}
              className="flex-row items-center gap-2 mb-2"
            >
              <Link2 size={16} color="#6B7280" />
              <Text className="text-sm font-semibold text-gray-700">
                Linked Contacts
              </Text>
              <View className="bg-gray-200 px-2 py-0.5 rounded-full">
                <Text className="text-xs text-gray-600">
                  {contactIds.length}
                </Text>
              </View>
            </TouchableOpacity>

            {linkedContacts.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View className="flex-row gap-2">
                  {linkedContacts.map((contact) => (
                    <View
                      key={contact.$id}
                      className="bg-gray-100 px-3 py-2 rounded-lg flex-row items-center"
                    >
                      <View className="w-6 h-6 rounded-full bg-blue-200 items-center justify-center mr-2">
                        <Text className="text-blue-700 text-xs font-semibold">
                          {contact.firstName?.charAt(0) || "?"}
                        </Text>
                      </View>
                      <Text className="text-sm text-gray-700">
                        {contact.displayName}
                      </Text>
                    </View>
                  ))}
                  <TouchableOpacity
                    onPress={() => setContactPickerVisible(true)}
                    className="bg-blue-50 px-3 py-2 rounded-lg"
                  >
                    <Text className="text-sm text-blue-600">+ Add</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            ) : (
              <TouchableOpacity
                onPress={() => setContactPickerVisible(true)}
                className="bg-gray-100 p-3 rounded-lg items-center"
              >
                <Text className="text-gray-500 text-sm">
                  Tap to link contacts
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Tags */}
          <View className="mx-4 mb-4">
            <View className="flex-row items-center gap-2 mb-2">
              <Tag size={16} color="#6B7280" />
              <Text className="text-sm font-semibold text-gray-700">Tags</Text>
            </View>
            <TagInput
              tags={tags}
              onTagsChange={updateTags}
              suggestions={existingTags}
            />
          </View>

          {/* AI Summary (if processed) */}
          {note?.processingStatus === "completed" && note.aiSummary && (
            <View className="mx-4 mb-4 bg-purple-50 p-4 rounded-xl border border-purple-200">
              <View className="flex-row items-center gap-2 mb-2">
                <Sparkles size={16} color="#7C3AED" />
                <Text className="text-sm font-semibold text-purple-700">
                  AI Summary
                </Text>
              </View>
              <Text className="text-gray-700 text-sm mb-3">
                {note.aiSummary}
              </Text>

              {note.aiNextSteps && (
                <>
                  <Text className="text-xs font-semibold text-purple-700 mb-1">
                    Next Steps
                  </Text>
                  {note.aiNextSteps.split("|").map((step, idx) => (
                    <Text key={idx} className="text-gray-600 text-sm ml-2">
                      • {step}
                    </Text>
                  ))}
                </>
              )}

              {note.aiEntities && (
                <View className="flex-row flex-wrap gap-1 mt-2">
                  {note.aiEntities.split(",").map((entity, idx) => (
                    <View
                      key={idx}
                      className="bg-purple-200 px-2 py-0.5 rounded-full"
                    >
                      <Text className="text-xs text-purple-800">
                        {entity.trim()}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {note?.processingStatus === "processing" && (
            <View className="mx-4 mb-4 bg-blue-50 p-4 rounded-xl flex-row items-center gap-2">
              <ActivityIndicator size="small" color="#3B82F6" />
              <Text className="text-blue-700 text-sm">Analyzing note...</Text>
            </View>
          )}

          <View className="h-8" />
        </ScrollView>

        <ContactPicker
          visible={contactPickerVisible}
          onClose={() => setContactPickerVisible(false)}
          selectedIds={contactIds}
          onSelectionChange={updateContactIds}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
