import { usePremiumGate } from "@/features/auth/hooks/usePremiumGate";
import { useUserProfile } from "@/features/auth/hooks/useUserProfile";
import {
  loadContacts,
  ProfileContact,
} from "@/features/contacts/api/contacts.service";
import { emitEvent, emitEventBatch } from "@/features/shared/utils/eventEmitter";
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
import { processNoteWithProgress } from "../api/notesProcessing.service";
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
  const [analyzing, setAnalyzing] = useState(false); // Track AI analysis state
  const previousTagsRef = useRef<string[]>(tags); // Track previous tags for D4 event

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

  // D4: note_tag - Track when new tags are added
  useEffect(() => {
    if (profile && noteId && contactIds.length > 0) {
      const newTags = tags.filter((tag) => !previousTagsRef.current.includes(tag));

      if (newTags.length > 0) {
        newTags.forEach((tag) => {
          emitEvent({
            userId: profile.$id,
            contactId: contactIds[0],
            actionId: 'note_tag',
            metadata: {
              noteId,
              tag,
              totalTags: tags.length,
            },
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
        // D1: note_manual - Create manual note
        emitEvent({
          userId: profile.$id,
          contactId: primaryContactId,
          actionId: 'note_manual',
          metadata: {
            noteLength: rawText.length,
            linkedContacts: contactIds,
            tagCount: tags.length,
          },
        });

        // D2: note_group - Multi-contact note
        if (contactIds.length > 1) {
          emitEventBatch(
            contactIds.map((contactId) => ({
              userId: profile.$id,
              contactId,
              actionId: 'note_group' as const,
              isMultiContact: true,
              metadata: {
                noteId: note?.$id,
                contactCount: contactIds.length,
              },
            }))
          );
        }
      } else {
        // D6: note_edit - Edit existing note
        emitEvent({
          userId: profile.$id,
          contactId: primaryContactId,
          actionId: 'note_edit',
          metadata: {
            noteId: noteId,
            noteLength: rawText.length,
          },
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

  // Trigger AI analysis manually
  const handleAnalyze = async () => {
    if (!note?.$id) {
      Alert.alert("Save Required", "Please save the note before analyzing.");
      return;
    }

    if (!rawText.trim() || rawText.trim().length < 10) {
      Alert.alert("Insufficient Content", "Add more content to analyze.");
      return;
    }

    setAnalyzing(true);
    try {
      await processNoteWithProgress(note.$id, (status) => {
        if (status === "completed" || status === "failed") {
          setAnalyzing(false);
        }
      });
      // Close and reopen editor to refresh note data
      onBack();
    } catch (err) {
      setAnalyzing(false);
      Alert.alert("Analysis Failed", "Could not analyze the note.");
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-800">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      </SafeAreaView>
    );
  }

  const canAnalyze =
    note?.$id &&
    rawText.trim().length > 10 &&
    note.processingStatus !== "processing";
  const showAnalyzeButton =
    note?.processingStatus === "pending" ||
    note?.processingStatus === "failed" ||
    !note?.processingStatus;

  return (
    <SafeAreaView className="flex-1 bg-gray-800" edges={["top"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        {/* Header */}
        <View className="bg-gray-900 px-4 py-3 border-b border-gray-700 flex-row items-center justify-between">
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

                // D3: note_pin - Pin/unpin note
                if (profile && noteId && contactIds.length > 0) {
                  emitEvent({
                    userId: profile.$id,
                    contactId: contactIds[0],
                    actionId: newPinnedState ? 'note_pin' : 'note_pin', // Same event for both pin/unpin
                    metadata: {
                      noteId,
                      isPinned: newPinnedState,
                    },
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
          <View className="bg-gray-900 m-4 rounded-xl border border-gray-700">
            <TextInput
              value={rawText}
              onChangeText={updateRawText}
              placeholder="Write your note..."
              placeholderTextColor="#9CA3AF"
              multiline
              className="p-4 text-base text-white min-h-[200px]"
              style={{ textAlignVertical: "top" }}
            />
          </View>

          {/* AI Analyze Button */}
          {showAnalyzeButton && (
            <View className="mx-4 mb-4">
              <TouchableOpacity
                onPress={handleAnalyze}
                disabled={!canAnalyze || analyzing}
                className={`flex-row items-center justify-center gap-2 py-3 rounded-xl border ${
                  canAnalyze && !analyzing
                    ? "bg-purple-50 border-purple-200"
                    : "bg-gray-100 border-gray-200"
                }`}
              >
                {analyzing ? (
                  <>
                    <ActivityIndicator size="small" color="#7C3AED" />
                    <Text className="text-purple-700 font-semibold">
                      Analyzing...
                    </Text>
                  </>
                ) : (
                  <>
                    <Sparkles
                      size={18}
                      color={canAnalyze ? "#7C3AED" : "#9CA3AF"}
                    />
                    <Text
                      className={`font-semibold ${
                        canAnalyze ? "text-purple-700" : "text-gray-400"
                      }`}
                    >
                      Analyze with AI
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Linked contacts */}
          <View className="mx-4 mb-4">
            <TouchableOpacity
              onPress={() => setContactPickerVisible(true)}
              className="flex-row items-center gap-2 mb-2"
            >
              <Link2 size={16} color="#9CA3AF" />
              <Text className="text-sm font-semibold text-gray-300">
                Linked Contacts
              </Text>
              <View className="bg-gray-700 px-2 py-0.5 rounded-full">
                <Text className="text-xs text-gray-300">
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
                      className="bg-gray-700 px-3 py-2 rounded-lg flex-row items-center"
                    >
                      <View className="w-6 h-6 rounded-full bg-blue-200 items-center justify-center mr-2">
                        <Text className="text-blue-700 text-xs font-semibold">
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
                    className="bg-blue-900 px-3 py-2 rounded-lg"
                  >
                    <Text className="text-sm text-blue-300">+ Add</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            ) : (
              <TouchableOpacity
                onPress={() => setContactPickerVisible(true)}
                className="bg-gray-700 p-3 rounded-lg items-center"
              >
                <Text className="text-gray-400 text-sm">
                  Tap to link contacts
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Tags */}
          <View className="mx-4 mb-4">
            <View className="flex-row items-center gap-2 mb-2">
              <Tag size={16} color="#9CA3AF" />
              <Text className="text-sm font-semibold text-gray-300">Tags</Text>
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
                  AI Analysis
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
                <>
                  <Text className="text-xs font-semibold text-purple-700 mt-3 mb-1">
                    Topics & People
                  </Text>
                  <View className="flex-row flex-wrap gap-1">
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
                </>
              )}
            </View>
          )}

          {note?.processingStatus === "processing" && (
            <View className="mx-4 mb-4 bg-blue-50 p-4 rounded-xl flex-row items-center gap-2">
              <ActivityIndicator size="small" color="#3B82F6" />
              <Text className="text-blue-700 text-sm">Analyzing note...</Text>
            </View>
          )}

          {note?.processingStatus === "failed" && (
            <View className="mx-4 mb-4 bg-red-50 p-4 rounded-xl">
              <Text className="text-red-700 text-sm font-semibold mb-1">
                Analysis Failed
              </Text>
              <Text className="text-red-600 text-xs">
                {note.processingError || "Unknown error occurred"}
              </Text>
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
