import { useState } from "react";
import { View, FlatList, Text } from "react-native";
import SearchBar from "../ui/SearchBar";
import ContactListItem from "../ui/ContactListItem";
import PermissionBanner from "../ui/PermissionBanner";
import ContactActionsBar from "../ui/ContactActionsBar";
import EmptyState from "../ui/EmptyState";
import { MOCK_CONTACTS } from "../mock/contacts";
import { Contact } from "../types/contact.types";
import { useNavigation } from "expo-router";

export default function ContactsScreen() {
  const [query, setQuery] = useState("");
  const navigation = useNavigation();
  const hasPermission = true; // UI-only placeholder
  const data = (MOCK_CONTACTS as Contact[]).filter((c) => {
    const hay =
      `${c.givenName} ${c.familyName} ${c.company ?? ""} ${c.email ?? ""} ${c.phone ?? ""}`.toLowerCase();
    return hay.includes(query.toLowerCase());
  });

  return (
    <View className="flex-1 bg-white">
      <View className="px-4 pt-12 pb-4">
        <Text className="text-2xl font-bold">Contacts</Text>
        <Text className="mt-1 text-xs text-neutral-500">
          Import, browse, and manage
        </Text>
      </View>

      {!hasPermission ? <PermissionBanner /> : null}

      <SearchBar value={query} onChangeText={setQuery} />

      {data.length === 0 ? (
        <EmptyState />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ContactListItem
              contact={item}
              onPress={() => {
                navigation.navigate("(contacts)/details/[id]", { id: item.id });
              }}
            />
          )}
          ItemSeparatorComponent={() => (
            <View className="h-px bg-neutral-200 mx-4" />
          )}
          contentContainerStyle={{ paddingBottom: 88 }}
        />
      )}

      <ContactActionsBar />
    </View>
  );
}
