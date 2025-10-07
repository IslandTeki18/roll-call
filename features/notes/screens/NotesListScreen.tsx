import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { NoteListItem } from "../ui/NoteListItem";
import { SearchBar } from "../ui/SearchBar";
import { TagChip } from "../ui/TagChip";
import { Note, NoteFilters, NoteSortBy } from "../types/notes.type";

interface NotesListScreenProps {
  contactId?: string; // If provided, shows notes for specific contact
  contactName?: string; // For header display
  notes: Note[];
  isLoading?: boolean;
  onRefresh?: () => void;
  onNotePress: (noteId: string) => void;
  onAddNote: () => void;
  onFilterChange?: (filters: NoteFilters) => void;
  onSortChange?: (sortBy: NoteSortBy) => void;
  availableTags?: string[];
  mode?: "contact" | "global"; // Contact view or all notes view
}

export const NotesListScreen: React.FC<NotesListScreenProps> = ({
  contactId,
  contactName,
  notes,
  isLoading = false,
  onRefresh,
  onNotePress,
  onAddNote,
  onFilterChange,
  onSortChange,
  availableTags = [],
  mode = "contact",
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showPinnedOnly, setShowPinnedOnly] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  // Separate pinned and unpinned notes
  const pinnedNotes = notes.filter((note) => note.isPinned);
  const unpinnedNotes = notes.filter((note) => !note.isPinned);

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    // Trigger filter change with debounce in real implementation
    onFilterChange?.({ searchQuery: text, tags: selectedTags });
  };

  const handleTagFilter = (tag: string) => {
    const newSelectedTags = selectedTags.includes(tag)
      ? selectedTags.filter((t) => t !== tag)
      : [...selectedTags, tag];

    setSelectedTags(newSelectedTags);
    onFilterChange?.({ tags: newSelectedTags, searchQuery });
  };

  const handleClearFilters = () => {
    setSearchQuery("");
    setSelectedTags([]);
    setShowPinnedOnly(false);
    onFilterChange?.({});
  };

  const hasActiveFilters =
    searchQuery.length > 0 || selectedTags.length > 0 || showPinnedOnly;

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white border-b border-gray-200">
        <View className="px-4 py-4">
          <View className="flex-row items-center justify-between mb-3">
            <View>
              <Text className="text-2xl font-bold text-gray-900">
                {mode === "contact" && contactName
                  ? `${contactName}'s Notes`
                  : "All Notes"}
              </Text>
              <Text className="text-sm text-gray-500 mt-0.5">
                {notes.length} {notes.length === 1 ? "note" : "notes"}
              </Text>
            </View>

            {/* Sort menu placeholder - can be expanded later */}
            <TouchableOpacity
              className="px-3 py-2 bg-gray-100 rounded-lg"
              onPress={() => {
                // Toggle sort options in real implementation
              }}
              activeOpacity={0.7}
            >
              <Text className="text-sm font-medium text-gray-700">⇅ Sort</Text>
            </TouchableOpacity>
          </View>

          {/* Search bar */}
          <SearchBar
            value={searchQuery}
            onChangeText={handleSearchChange}
            onFocus={() => setIsSearching(true)}
            onBlur={() => setIsSearching(false)}
            placeholder={
              mode === "contact"
                ? "Search this contact..."
                : "Search all notes..."
            }
            showCancel={isSearching}
            onCancel={() => {
              setSearchQuery("");
              setIsSearching(false);
            }}
          />
        </View>

        {/* Tag filters */}
        {availableTags.length > 0 && (
          <View className="px-4 pb-3">
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8 }}
            >
              {/* Pinned filter */}
              <TouchableOpacity
                onPress={() => {
                  setShowPinnedOnly(!showPinnedOnly);
                  onFilterChange?.({ isPinned: !showPinnedOnly });
                }}
                activeOpacity={0.7}
              >
                <View
                  className={`
                  px-3 py-1.5 rounded-lg border-2
                  ${showPinnedOnly ? "bg-yellow-100 border-yellow-400" : "bg-white border-gray-200"}
                `}
                >
                  <Text
                    className={`text-sm font-medium ${
                      showPinnedOnly ? "text-yellow-800" : "text-gray-600"
                    }`}
                  >
                    📌 Pinned
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Tag filters */}
              {availableTags.map((tag) => (
                <TagChip
                  key={tag}
                  tag={tag}
                  variant={selectedTags.includes(tag) ? "selected" : "outlined"}
                  onPress={handleTagFilter}
                />
              ))}
            </ScrollView>
          </View>
        )}

        {/* Active filters indicator */}
        {hasActiveFilters && (
          <View className="px-4 pb-3 flex-row items-center justify-between">
            <Text className="text-xs text-gray-600">
              {selectedTags.length > 0 &&
                `${selectedTags.length} tag filter(s)`}
              {showPinnedOnly && " • Pinned only"}
            </Text>
            <TouchableOpacity onPress={handleClearFilters} activeOpacity={0.7}>
              <Text className="text-xs text-indigo-600 font-semibold">
                Clear all
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Notes list */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16 }}
        refreshControl={
          onRefresh ? (
            <RefreshControl refreshing={isLoading} onRefresh={onRefresh} />
          ) : undefined
        }
      >
        {notes.length === 0 ? (
          // Empty state
          <View className="items-center justify-center py-20">
            <Text className="text-6xl mb-4">📝</Text>
            <Text className="text-lg font-semibold text-gray-900 mb-2">
              {hasActiveFilters ? "No notes found" : "No notes yet"}
            </Text>
            <Text className="text-sm text-gray-500 text-center px-8 mb-6">
              {hasActiveFilters
                ? "Try adjusting your filters or search terms"
                : mode === "contact"
                  ? `Start capturing context about ${contactName || "this contact"}`
                  : "Create your first note to get started"}
            </Text>
            {!hasActiveFilters && (
              <TouchableOpacity
                className="px-6 py-3 bg-indigo-600 rounded-xl"
                onPress={onAddNote}
                activeOpacity={0.8}
              >
                <Text className="text-base font-semibold text-white">
                  ✏️ Create First Note
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <>
            {/* Pinned notes section */}
            {pinnedNotes.length > 0 && (
              <View className="mb-4">
                <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 px-1">
                  Pinned
                </Text>
                {pinnedNotes.map((note) => (
                  <NoteListItem
                    key={note.id}
                    note={note}
                    onPress={onNotePress}
                    showContacts={mode === "global"}
                  />
                ))}
              </View>
            )}

            {/* Regular notes section */}
            {unpinnedNotes.length > 0 && (
              <View>
                {pinnedNotes.length > 0 && (
                  <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 px-1">
                    All Notes
                  </Text>
                )}
                {unpinnedNotes.map((note) => (
                  <NoteListItem
                    key={note.id}
                    note={note}
                    onPress={onNotePress}
                    showContacts={mode === "global"}
                  />
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Floating Add Note button */}
      <View className="absolute bottom-6 right-6">
        <TouchableOpacity
          className="w-14 h-14 bg-indigo-600 rounded-full items-center justify-center shadow-lg"
          onPress={onAddNote}
          activeOpacity={0.8}
        >
          <Text className="text-2xl text-white font-light">+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};
