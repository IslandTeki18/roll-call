import React from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { NoteEditorScreen } from "features/notes/screens/NoteEditorScreen";
import { CreateNoteInput } from "features/notes/types/notes.type";
import { SafeAreaView } from "react-native-safe-area-context";

export default function NoteEdit() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    noteId?: string;
    contactId?: string;
    contactIds?: string; // JSON string of array
    contactName?: string;
    contactNames?: string; // JSON string of array
    mode?: "create" | "edit";
  }>();

  // TODO: If edit mode, fetch existing note
  // const { data: note } = useNote(params.noteId);

  // Parse contact IDs
  let contactIds: string[] = [];
  if (params.contactIds) {
    try {
      contactIds = JSON.parse(params.contactIds);
    } catch {
      contactIds = [];
    }
  } else if (params.contactId) {
    contactIds = [params.contactId];
  }

  // Parse contact names
  let contactNames: string[] = [];
  if (params.contactNames) {
    try {
      contactNames = JSON.parse(params.contactNames);
    } catch {
      contactNames = [];
    }
  } else if (params.contactName) {
    contactNames = [params.contactName];
  }

  const mode = (params.mode || "create") as "create" | "edit";

  // Placeholder initial values for edit mode
  const initialContent = mode === "edit" ? "Existing note content..." : "";
  const initialTags = mode === "edit" ? ["existing-tag"] : [];
  const initialIsPinned = mode === "edit" ? false : false;

  const handleSave = async (noteData: CreateNoteInput) => {
    if (mode === "edit" && params.noteId) {
      // TODO: Implement update mutation
      console.log("Updating note:", params.noteId, noteData);
    } else {
      // TODO: Implement create mutation
      console.log("Creating note:", noteData);
    }
    router.back();
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <NoteEditorScreen
        contactIds={contactIds}
        contactNames={contactNames}
        initialContent={initialContent}
        initialTags={initialTags}
        initialIsPinned={initialIsPinned}
        mode={mode}
        noteId={params.noteId}
        onSave={handleSave}
        onCancel={handleCancel}
      />
    </SafeAreaView>
  );
}
