import { View, Text, ScrollView } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { MOCK_CONTACTS } from "../mock/contacts";


export default function ContactDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const contact = MOCK_CONTACTS.find(c => c.id === id);

  if (!contact) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text>Contact not found</Text>
      </View>
    );
  }
  return (
    <ScrollView className="flex-1 bg-white">
      <View className="px-4 pt-12 pb-4">
        <Text className="text-2xl font-bold">
          {contact.givenName} {contact.familyName}
        </Text>
        <Text className="mt-1 text-xs text-neutral-500">
          {contact.company ?? contact.email ?? contact.phone ?? "No details"}
        </Text>
      </View>

      <View className="px-4">
        <View className="rounded-2xl border border-neutral-200 p-4">
          <Text className="text-sm font-medium">Details</Text>
          <Text className="mt-2 text-sm text-neutral-700">
            Phone: {contact.phone ?? "—"}
          </Text>
          <Text className="mt-1 text-sm text-neutral-700">
            Email: {contact.email ?? "—"}
          </Text>
          <Text className="mt-1 text-sm text-neutral-700">
            Company: {contact.company ?? "—"}
          </Text>
          <Text className="mt-1 text-sm text-neutral-700">
            Tags: {(contact.tags ?? []).join(", ") || "—"}
          </Text>
          <Text className="mt-1 text-sm text-neutral-700">
            Pinned: {contact.pinned ? "Yes" : "No"}
          </Text>
          <Text className="mt-1 text-sm text-neutral-700">
            Fresh: {contact.isFresh ? "Yes" : "No"}
          </Text>
        </View>

        <View className="mt-4 rounded-2xl border border-neutral-200 p-4">
          <Text className="text-sm font-medium">Notes</Text>
          <View className="mt-3 h-24 rounded-xl bg-neutral-100 p-3">
            <Text className="text-neutral-500 text-sm">Add a quick note…</Text>
          </View>
          <View className="mt-3 h-10 rounded-xl bg-neutral-200 items-center justify-center">
            <Text className="text-sm text-neutral-700">Save Note</Text>
          </View>
        </View>

        <View className="py-6 mt-4 rounded-2xl bg-neutral-900 items-center justify-center">
          <Text className="text-white text-sm">
            Quick Actions (SMS / Call / FaceTime)
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
