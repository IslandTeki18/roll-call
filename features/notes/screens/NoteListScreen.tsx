import { Plus, Search, X } from "lucide-react-native";
import React, { useState, useEffect } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import NoteCard from "../components/NoteCard";
import NoteEditor from "../components/NoteEditor";
import { useNotes } from "../hooks/useNotes";
import { Note } from "../types/notes.types";

export default function NotesListScreen() {
  const params = useLocalSearchParams();
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
    setRefreshing(false);
  };

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
    <SafeAreaView className="flex-1">
      {/* Header */}
      <View className="px-4 pt-2 pb-4">
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-2xl font-bold">Notes</Text>
          <TouchableOpacity
            onPress={handleNewNote}
            className="bg-blue-600 p-3 rounded-full"
          >
            <Plus size={20} color="white" />
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View className="flex-row items-center bg-white rounded-xl px-4 py-3 border border-gray-200">
          <Search size={18} color="#9CA3AF" />
          <TextInput
            value={searchQuery}
            onChangeText={handleSearch}
            placeholder="Search notes..."
            placeholderTextColor="#9CA3AF"
            className="flex-1 ml-2 text-base text-gray-900"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch("")}>
              <X size={18} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
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
          <Text className="text-gray-500 text-center mb-4">
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
              {pinnedNotes.map((note) => (
                <NoteCard
                  key={note.$id}
                  note={note}
                  onPress={() => handleNotePress(note)}
                />
              ))}
            </View>
          )}

          {/* All notes */}
          <View>
            {!searchResults && pinnedNotes.length > 0 && (
              <Text className="text-xs font-semibold text-gray-500 uppercase mb-2">
                All Notes
              </Text>
            )}
            {unpinnedNotes.map((note) => (
              <NoteCard
                key={note.$id}
                note={note}
                onPress={() => handleNotePress(note)}
              />
            ))}
          </View>

          <View className="h-8" />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
