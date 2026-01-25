import { getContactById } from "@/features/contacts/api/contacts.service";
import { calculateRHS } from "@/features/deck/api/rhs.service";
import { SearchBar } from "@/features/shared/components/SearchBar";
import { useUser } from "@clerk/clerk-expo";
import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import NoteCard from "../components/NoteCard";
import NoteEditor from "../components/NoteEditor";
import { useNotes } from "../hooks/useNotes";
import { Note } from "../types/notes.types";

export default function NotesListScreen() {
  const params = useLocalSearchParams();
  const { user } = useUser();
  const {
    notes,
    pinnedNotes,
    userTags,
    loading,
    error,
    loadNotes,
    search,
    remove,
  } = useNotes();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Note[] | null>(null);
  const [editorVisible, setEditorVisible] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | undefined>();
  const [refreshing, setRefreshing] = useState(false);
  const [preSelectedContactId, setPreSelectedContactId] = useState<
    string | undefined
  >();
  const [noteMetadata, setNoteMetadata] = useState<
    Map<string, { contactName: string; rhsScore: number }>
  >(new Map());

  // Handle params for note creation with pre-selected contact or note editing
  useEffect(() => {
    if (params.contactId && typeof params.contactId === "string") {
      setPreSelectedContactId(params.contactId);
      setEditorVisible(true);
    } else if (params.noteId && typeof params.noteId === "string") {
      setEditingNoteId(params.noteId);
      setEditorVisible(true);
    }
  }, [params.contactId, params.noteId]);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      const results = await search(query);
      setSearchResults(results);
    } else {
      setSearchResults(null);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadNotes();
    await fetchNoteMetadata(notes);
    setRefreshing(false);
  };

  // Fetch contact data and RHS scores for notes
  const fetchNoteMetadata = async (notesToProcess: Note[]) => {
    if (!user) return;

    const metadata = new Map<
      string,
      { contactName: string; rhsScore: number }
    >();

    for (const note of notesToProcess) {
      // Get first contact ID from the note
      const contactIds = note.contactIds?.split(",").filter(Boolean) || [];
      const firstContactId = contactIds[0];

      if (!firstContactId) {
        metadata.set(note.$id, { contactName: "Unknown Contact", rhsScore: 0 });
        continue;
      }

      try {
        // Fetch contact data
        const contact = await getContactById(firstContactId);
        if (!contact) {
          metadata.set(note.$id, {
            contactName: "Unknown Contact",
            rhsScore: 0,
          });
          continue;
        }

        // Calculate RHS score
        const rhsFactors = await calculateRHS(user.id, contact);

        metadata.set(note.$id, {
          contactName:
            contact.displayName ||
            `${contact.firstName} ${contact.lastName}`.trim(),
          rhsScore: rhsFactors.totalScore,
        });
      } catch (error) {
        console.error("Failed to fetch metadata for note:", note.$id, error);
        metadata.set(note.$id, { contactName: "Unknown Contact", rhsScore: 0 });
      }
    }

    setNoteMetadata(metadata);
  };

  // Fetch metadata when notes change
  useEffect(() => {
    if (notes.length > 0 && user) {
      fetchNoteMetadata(notes);
    }
  }, [notes, user]);

  const handleNotePress = (note: Note) => {
    setEditingNoteId(note.$id);
    setPreSelectedContactId(undefined);
    setEditorVisible(true);
  };

  const handleNewNote = () => {
    setEditingNoteId(undefined);
    setPreSelectedContactId(undefined);
    setEditorVisible(true);
  };

  const handleEditorClose = () => {
    setEditorVisible(false);
    setEditingNoteId(undefined);
    setPreSelectedContactId(undefined);
    loadNotes();
  };

  const handleDelete = async () => {
    if (editingNoteId) {
      await remove(editingNoteId);
    }
  };

  if (editorVisible) {
    return (
      <NoteEditor
        noteId={editingNoteId}
        preSelectedContactId={preSelectedContactId}
        onBack={handleEditorClose}
        onDelete={handleDelete}
        existingTags={userTags}
      />
    );
  }

  const displayNotes = searchResults ?? notes;
  const unpinnedNotes = displayNotes.filter((n) => !n.isPinned);

  return (
    <SafeAreaView className="flex-1 bg-darkBG">
      {/* Header */}
      <View className="px-4 pt-2 pb-4">
        {/* Search */}
        <SearchBar
          value={searchQuery}
          onChangeText={handleSearch}
          placeholder="Search notes..."
          iconSize={18}
        />
      </View>

      {/* Content */}
      {loading && !refreshing ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-red-600 text-center">{error}</Text>
          <TouchableOpacity onPress={loadNotes} className="mt-4">
            <Text className="text-blue-600 font-semibold">Retry</Text>
          </TouchableOpacity>
        </View>
      ) : displayNotes.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-gray-400 text-center mb-4">
            {searchQuery ? "No notes found" : "No notes yet"}
          </Text>
          {!searchQuery && (
            <TouchableOpacity
              onPress={handleNewNote}
              className="bg-blue-600 px-6 py-3 rounded-xl"
            >
              <Text className="text-white font-semibold">Create Note</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <ScrollView
          className="flex-1 px-4"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        >
          {/* Pinned section */}
          {!searchResults && pinnedNotes.length > 0 && (
            <View className="mb-4">
              <Text className="text-xs font-semibold text-gray-500 uppercase mb-2">
                Pinned
              </Text>
              {pinnedNotes.map((note) => {
                const meta = noteMetadata.get(note.$id);
                return (
                  <NoteCard
                    key={note.$id}
                    note={note}
                    contactName={meta?.contactName}
                    rhsScore={meta?.rhsScore}
                    onPress={() => handleNotePress(note)}
                  />
                );
              })}
            </View>
          )}

          {/* All notes */}
          <View>
            {!searchResults && pinnedNotes.length > 0 && (
              <Text className="text-xs font-semibold text-gray-500 uppercase mb-2">
                All Notes
              </Text>
            )}
            {unpinnedNotes.map((note) => {
              const meta = noteMetadata.get(note.$id);
              return (
                <NoteCard
                  key={note.$id}
                  note={note}
                  contactName={meta?.contactName}
                  rhsScore={meta?.rhsScore}
                  onPress={() => handleNotePress(note)}
                />
              );
            })}
          </View>

          <View className="h-8" />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
