import { useUserProfile } from "@/features/auth/hooks/useUserProfile";
import {
  loadContacts,
  ProfileContact,
} from "@/features/contacts/api/contacts.service";
import {
  emitEvent,
  emitEventBatch,
} from "@/features/shared/utils/eventEmitter";
import {
  ChevronLeft,
  Link2,
  Pin,
  PinOff,
  Save,
  Tag,
  Trash2,
} from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
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
  const {
    rawText,
    contactIds,
    tags,
    isPinned,
    loading,
    saving,
    isDirty,
    updateRawText,
    updateContactIds,
    updateTags,
    updatePinned,
    save,
  } = useNoteEditor(noteId);

  const [contactPickerVisible, setContactPickerVisible] = useState(false);
  const [linkedContacts, setLinkedContacts] = useState<ProfileContact[]>([]);
  const previousTagsRef = useRef<string[]>(tags);

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

  useEffect(() => {
    if (profile && noteId && contactIds.length > 0) {
      const newTags = tags.filter(
        (tag) => !previousTagsRef.current.includes(tag),
      );

      if (newTags.length > 0) {
        newTags.forEach((tag) => {
          emitEvent({
            userId: profile.$id,
            contactId: contactIds[0],
            actionId: "note_tag",
            metadata: { noteId, tag, totalTags: tags.length },
          });
        });
      }

      previousTagsRef.current = tags;
    }
  }, [tags, profile, noteId, contactIds]);

  const handleSave = async () => {
    const isNewNote = !noteId;
    const saved = await save();

    if (saved && profile && contactIds.length > 0) {
      const primaryContactId = contactIds[0];

      if (isNewNote) {
        emitEvent({
          userId: profile.$id,
          contactId: primaryContactId,
          actionId: "note_manual",
          metadata: {
            noteLength: rawText.length,
            linkedContacts: contactIds,
            tagCount: tags.length,
          },
        });

        if (contactIds.length > 1) {
          emitEventBatch(
            contactIds.map((contactId) => ({
              userId: profile.$id,
              contactId,
              actionId: "note_group" as const,
              isMultiContact: true,
              metadata: { contactCount: contactIds.length },
            })),
          );
        }
      } else {
        emitEvent({
          userId: profile.$id,
          contactId: primaryContactId,
          actionId: "note_edit",
          metadata: { noteId: noteId, noteLength: rawText.length },
        });
      }
    }

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
      <SafeAreaView className="flex-1 bg-darkBG">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-darkBG" edges={["top"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <View className="bg-darkBG px-4 py-3 border-b border-gray-700 flex-row items-center justify-between">
          <TouchableOpacity onPress={onBack} className="flex-row items-center">
            <ChevronLeft size={24} color="#FFF" />
            <Text className="text-base ml-1 text-white">Back</Text>
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
              onPress={() => {
                const newPinnedState = !isPinned;
                updatePinned(newPinnedState);

                if (profile && noteId && contactIds.length > 0) {
                  emitEvent({
                    userId: profile.$id,
                    contactId: contactIds[0],
                    actionId: "note_pin",
                    metadata: { noteId, isPinned: newPinnedState },
                  });
                }
              }}
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
                saving || !rawText.trim() ? "bg-gray-600" : "bg-blue-600"
              }`}
            >
              <Save size={18} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          className="flex-1"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 100 }}
        >
          <View className="bg-darkBG m-4 rounded-xl border border-gray-700">
            <TextInput
              value={rawText}
              onChangeText={updateRawText}
              placeholder="Write your note..."
              placeholderTextColor="#6B7280"
              multiline
              className="p-4 text-base text-white min-h-[200px]"
              style={{ textAlignVertical: "top" }}
              autoFocus
            />
          </View>

          <View className="mx-4 mb-4">
            <TouchableOpacity
              onPress={() => setContactPickerVisible(true)}
              className="flex-row items-center gap-2 mb-3"
            >
              <Link2 size={16} color="#9CA3AF" />
              <Text className="text-sm font-semibold text-gray-300">
                Linked Contacts ({contactIds.length})
              </Text>
            </TouchableOpacity>

            {linkedContacts.length > 0 ? (
              <View className="flex-row flex-wrap gap-2">
                {linkedContacts.map((contact) => (
                  <View
                    key={contact.$id}
                    style={{ backgroundColor: "#2E2E33" }}
                    className="px-3 py-2 rounded-lg flex-row items-center"
                  >
                    <View className="w-6 h-6 rounded-full bg-blue-600 items-center justify-center mr-2">
                      <Text className="text-white text-xs font-semibold">
                        {contact.firstName?.charAt(0) || "?"}
                      </Text>
                    </View>
                    <Text className="text-sm text-gray-300">
                      {contact.displayName}
                    </Text>
                  </View>
                ))}
                <TouchableOpacity
                  onPress={() => setContactPickerVisible(true)}
                  className="bg-blue-600 px-3 py-2 rounded-lg"
                >
                  <Text className="text-sm text-white">+ Add</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => setContactPickerVisible(true)}
                style={{ backgroundColor: "#2E2E33" }}
                className="p-3 rounded-lg items-center"
              >
                <Text className="text-gray-400 text-sm">
                  Tap to link contacts
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <View className="mx-4 mb-4">
            <View className="flex-row items-center gap-2 mb-3">
              <Tag size={16} color="#9CA3AF" />
              <Text className="text-sm font-semibold text-gray-300">Tags</Text>
            </View>
            <TagInput
              tags={tags}
              onTagsChange={updateTags}
              suggestions={existingTags}
            />
          </View>
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
