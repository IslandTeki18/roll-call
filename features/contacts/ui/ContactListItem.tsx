import { View, Text, Pressable, Image } from "react-native";
import { Link } from "expo-router";
import { Contact } from "../types/contact.types";
export default function ContactListItem({
  contact,
}: {
  contact: Contact;
}) {
  const initials = `${contact.givenName?.[0] ?? ""}${
    contact.familyName?.[0] ?? ""
  }`.toUpperCase();
  return (
    <Link
      href={{
        pathname: "/(tabs)/(contacts)/details/[id]",
        params: { id: contact.id },
      }}
      className="px-4 py-3 active:opacity-80"
    >
      <View className="flex-row items-center">
        {contact.avatarUrl ? (
          <Image
            source={{ uri: contact.avatarUrl }}
            className="h-10 w-10 rounded-full"
          />
        ) : (
          <View className="h-10 w-10 items-center justify-center rounded-full bg-neutral-200">
            <Text className="font-semibold">{initials || "?"}</Text>
          </View>
        )}
        <View className="ml-3 flex-1">
          <Text className="text-base font-medium">
            {contact.givenName} {contact.familyName}
          </Text>
          <Text className="text-xs text-neutral-500">
            {contact.company ?? contact.email ?? contact.phone ?? "No details"}
          </Text>
        </View>
        {contact.isFresh ? (
          <Text className="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-[10px] text-green-700">
            NEW
          </Text>
        ) : null}
        {contact.pinned ? (
          <Text className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] text-amber-700">
            PIN
          </Text>
        ) : null}
      </View>
    </Link>
  );
}
