import { useState, useMemo } from "react";
import { View, FlatList, Text, ActivityIndicator } from "react-native";
import SearchBar from "../ui/SearchBar";
import ContactListItem from "../ui/ContactListItem";
import PermissionBanner from "../ui/PermissionBanner";
import ContactActionsBar from "../ui/ContactActionsBar";
import EmptyState from "../ui/EmptyState";
import { MOCK_CONTACTS } from "../mock/contacts";
import { Contact } from "../types/contact.types";

export default function ContactsScreen() {
  const [query, setQuery] = useState("");
  const [isLoading] = useState(false); // Hook up to actual loading state later
  const [hasPermission] = useState(true); // Hook up to actual permission check later

  // Memoize filtered results for performance
  const filteredContacts = useMemo(() => {
    if (!query.trim()) return MOCK_CONTACTS as Contact[];

    const lowerQuery = query.toLowerCase();
    return (MOCK_CONTACTS as Contact[]).filter((contact) => {
      const searchableText = [
        contact.givenName,
        contact.familyName,
        contact.company,
        contact.email,
        contact.phone,
        ...(contact.tags || []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(lowerQuery);
    });
  }, [query]);

  // Sort contacts: Fresh first, then Pinned, then alphabetically
  const sortedContacts = useMemo(() => {
    return [...filteredContacts].sort((a, b) => {
      // Fresh contacts first
      if (a.isFresh && !b.isFresh) return -1;
      if (!a.isFresh && b.isFresh) return 1;

      // Then pinned contacts
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;

      // Then alphabetically by first name
      const aName = `${a.givenName} ${a.familyName || ""}`.trim();
      const bName = `${b.givenName} ${b.familyName || ""}`.trim();
      return aName.localeCompare(bName);
    });
  }, [filteredContacts]);

  // Wrap header in useMemo to prevent unnecessary re-renders
  const renderHeader = useMemo(
    () => (
      <>
        <View className="px-4 pt-12 pb-2">
          <Text className="text-3xl font-bold text-neutral-900">Contacts</Text>
          <Text className="mt-1 text-sm text-neutral-500">
            {MOCK_CONTACTS.length} contact
            {MOCK_CONTACTS.length !== 1 ? "s" : ""}
          </Text>
        </View>

        {!hasPermission && <PermissionBanner />}

        {/* Results summary */}
        {query.trim() && (
          <View className="px-4 pb-2 pt-2">
            <Text className="text-xs text-neutral-500">
              {sortedContacts.length} result
              {sortedContacts.length !== 1 ? "s" : ""}
            </Text>
          </View>
        )}
      </>
    ),
    [hasPermission, query, sortedContacts.length]
  );

  const renderEmpty = () => {
    if (isLoading) return null;

    if (query.trim() && sortedContacts.length === 0) {
      return (
        <View className="items-center justify-center px-6 py-16">
          <Text className="text-lg font-semibold text-neutral-900">
            No matches found
          </Text>
          <Text className="mt-2 text-center text-sm text-neutral-600">
            Try adjusting your search terms
          </Text>
        </View>
      );
    }

    if (!hasPermission || MOCK_CONTACTS.length === 0) {
      return <EmptyState />;
    }

    return null;
  };

  const renderSeparator = () => (
    <View className="ml-[68px] h-px bg-neutral-100" />
  );

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#171717" />
        <Text className="mt-4 text-sm text-neutral-500">
          Loading contacts...
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      {/* Search Bar - Outside FlatList to prevent re-renders */}
      <View className="px-4 pt-12 pb-2">
        <Text className="text-3xl font-bold text-neutral-900">Contacts</Text>
        <Text className="mt-1 text-sm text-neutral-500">
          {MOCK_CONTACTS.length} contact{MOCK_CONTACTS.length !== 1 ? "s" : ""}
        </Text>
      </View>

      {!hasPermission && <PermissionBanner />}

      <SearchBar value={query} onChangeText={setQuery} />

      {query.trim() && (
        <View className="px-4 pb-2">
          <Text className="text-xs text-neutral-500">
            {sortedContacts.length} result
            {sortedContacts.length !== 1 ? "s" : ""}
          </Text>
        </View>
      )}

      <FlatList
        data={sortedContacts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ContactListItem contact={item} />}
        ListEmptyComponent={renderEmpty}
        ItemSeparatorComponent={renderSeparator}
        contentContainerStyle={{
          paddingBottom: 100,
          flexGrow: 1,
        }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      />

      <ContactActionsBar />
    </View>
  );
}
