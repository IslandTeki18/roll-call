import React from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { NoteDetailScreen } from "features/notes/screens/NoteDetailScreen";
import {
  NoteWithContacts,
  NoteSource,
} from "features/notes/types/notes.type";

export default function NoteDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  // TODO: Replace with actual data fetching hook
  // const { data: note } = useNote(id);
  // Placeholder note with proper structure
  const note: NoteWithContacts = {
    id: id || "",
    content: "This is a sample note content...",
    createdAt: new Date(),
    updatedAt: new Date(),
    isPinned: false,
    tags: ["work", "follow-up"],
    contactIds: ["1"],
    contacts: [
      {
        id: "1",
        name: "John Doe",
        avatar: undefined,
      },
    ],
    source: NoteSource.MANUAL,
    aiSummary: "Sample AI summary of the note",
    aiEntities: [
      { type: "person", value: "John Doe" },
      { type: "date", value: "Next week" },
    ],
    aiNextCTA: {
      action: "Follow up on project discussion",
      suggestedDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      channel: "email",
    },
  };

  const handleEdit = (noteId: string) => {
    router.push({
      pathname: "/notes/edit",
      params: {
        mode: "edit",
        noteId,
      },
    });
  };

  const handleDelete = async (noteId: string) => {
    // TODO: Implement delete mutation
    console.log("Deleting note:", noteId);
    router.back();
  };

  const handleContactPress = (contactId: string) => {
    router.push(`/(tabs)/(contacts)/details/${contactId}`);
  };

  const handleBack = () => {
    router.back();
  };

  const handleRegenerateAI = (noteId: string) => {
    // TODO: Implement AI regeneration
    console.log("Regenerating AI for note:", noteId);
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <NoteDetailScreen
        note={note}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onContactPress={handleContactPress}
        onBack={handleBack}
        onRegenerateAI={handleRegenerateAI}
      />
    </SafeAreaView>
  );
}
