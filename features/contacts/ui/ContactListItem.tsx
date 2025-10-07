import { View, Text, Image, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Contact } from "../types/contact.types";

export default function ContactListItem({ contact }: { contact: Contact }) {
  const router = useRouter();

  const initials = `${contact.givenName?.[0] ?? ""}${
    contact.familyName?.[0] ?? ""
  }`.toUpperCase();

  const handlePress = () => {
    router.push({
      pathname: "/(tabs)/(contacts)/details/[id]",
      params: { id: contact.id },
    });
  };

  // Format the subtitle with priority: company > email > phone
  const subtitle =
    contact.company || contact.email || contact.phone || "No details";

  return (
    <Pressable onPress={handlePress} className="px-4 py-3 active:bg-neutral-50">
      {({ pressed }) => (
        <View
          className={`flex-row items-center ${pressed ? "opacity-70" : ""}`}
        >
          {/* Avatar */}
          {contact.avatarUrl ? (
            <Image
              source={{ uri: contact.avatarUrl }}
              className="h-12 w-12 rounded-full"
            />
          ) : (
            <View className="h-12 w-12 items-center justify-center rounded-full bg-neutral-200">
              <Text className="text-base font-semibold text-neutral-700">
                {initials || "?"}
              </Text>
            </View>
          )}

          {/* Content */}
          <View className="ml-3 flex-1">
            <View className="flex-row items-center">
              <Text
                className="text-base font-semibold text-neutral-900"
                numberOfLines={1}
              >
                {contact.givenName} {contact.familyName}
              </Text>
            </View>
            <Text className="mt-0.5 text-sm text-neutral-500" numberOfLines={1}>
              {subtitle}
            </Text>
          </View>

          {/* Badges */}
          <View className="ml-2 flex-row gap-1">
            {contact.isFresh && (
              <View className="rounded-full bg-green-100 px-2.5 py-1">
                <Text className="text-[10px] font-semibold text-green-700">
                  NEW
                </Text>
              </View>
            )}
            {contact.pinned && (
              <View className="rounded-full bg-amber-100 px-2.5 py-1">
                <Text className="text-[10px] font-semibold text-amber-700">
                  📌
                </Text>
              </View>
            )}
          </View>
        </View>
      )}
    </Pressable>
  );
}
