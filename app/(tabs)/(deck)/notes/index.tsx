import React from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { NotesListScreen } from "features/notes/screens/NotesListScreen";
import { Note } from "features/notes/types/notes.type";
import { SafeAreaView } from "react-native-safe-area-context";

export default function NotesIndex() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    contactId?: string;
    contactName?: string;
  }>();

  // TODO: Replace with actual data fetching hook
  // const { data: notes = [], isLoading, refetch } = useNotes({ contactId: params.contactId });
  const notes: Note[] = []; // Placeholder
  const isLoading = false;
  const availableTags: string[] = []; // TODO: Get from notes or separate query

  const handleNotePress = (noteId: string) => {
    router.push(`/notes/${noteId}`);
  };

  const handleAddNote = () => {
    router.push({
      pathname: "/notes/edit",
      params: {
        mode: "create",
        ...(params.contactId && { contactId: params.contactId }),
        ...(params.contactName && { contactName: params.contactName }),
      },
    });
  };

  const handleFilterChange = (filters: any) => {
    // TODO: Implement filter logic
    console.log("Filters changed:", filters);
  };

  const handleSortChange = (sortBy: any) => {
    // TODO: Implement sort logic
    console.log("Sort changed:", sortBy);
  };

  const handleRefresh = () => {
    // TODO: Implement refresh logic
    console.log("Refreshing notes...");
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <NotesListScreen
        contactId={params.contactId}
        contactName={params.contactName}
        notes={notes}
        isLoading={isLoading}
        onRefresh={handleRefresh}
        onNotePress={handleNotePress}
        onAddNote={handleAddNote}
        onFilterChange={handleFilterChange}
        onSortChange={handleSortChange}
        availableTags={availableTags}
        mode={params.contactId ? "contact" : "global"}
      />
    </SafeAreaView>
  );
}
