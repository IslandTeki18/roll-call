import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  Linking,
  Platform,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { MOCK_CONTACTS } from "../mock/contacts";
import { useState } from "react";

export default function ContactDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const contact = MOCK_CONTACTS.find((c) => c.id === id);
  const [note, setNote] = useState("");

  if (!contact) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <Text className="text-lg font-semibold text-neutral-900">
          Contact not found
        </Text>
        <Pressable
          onPress={() => router.back()}
          className="mt-4 rounded-xl bg-neutral-900 px-6 py-3"
        >
          <Text className="text-sm font-semibold text-white">Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const initials = `${contact.givenName?.[0] ?? ""}${
    contact.familyName?.[0] ?? ""
  }`.toUpperCase();

  // Quick action handlers
  const handleCall = () => {
    if (!contact.phone) {
      Alert.alert(
        "No Phone Number",
        "This contact doesn't have a phone number."
      );
      return;
    }
    const phoneUrl = `tel:${contact.phone}`;
    Linking.openURL(phoneUrl);
  };

  const handleMessage = () => {
    if (!contact.phone) {
      Alert.alert(
        "No Phone Number",
        "This contact doesn't have a phone number."
      );
      return;
    }
    const smsUrl =
      Platform.OS === "ios" ? `sms:${contact.phone}` : `sms:${contact.phone}`;
    Linking.openURL(smsUrl);
  };

  const handleEmail = () => {
    if (!contact.email) {
      Alert.alert("No Email", "This contact doesn't have an email address.");
      return;
    }
    const emailUrl = `mailto:${contact.email}`;
    Linking.openURL(emailUrl);
  };

  const handleFaceTime = () => {
    if (!contact.phone && !contact.email) {
      Alert.alert("No Contact Info", "Need phone or email for FaceTime.");
      return;
    }
    const target = contact.phone || contact.email;
    const faceTimeUrl = `facetime:${target}`;
    Linking.openURL(faceTimeUrl);
  };

  const handleTogglePin = () => {
    // TODO: Hook up to actual pin toggle logic
    Alert.alert(
      contact.pinned ? "Unpin Contact" : "Pin Contact",
      contact.pinned
        ? "Remove from pinned contacts?"
        : "Pin this contact to the top of your list?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Confirm", onPress: () => console.log("Toggle pin") },
      ]
    );
  };

  const handleSaveNote = () => {
    if (!note.trim()) {
      Alert.alert("Empty Note", "Please enter a note before saving.");
      return;
    }
    // TODO: Hook up to actual note saving logic
    Alert.alert("Note Saved", "Your note has been saved successfully.");
    setNote("");
  };

  return (
    <View className="flex-1 bg-white">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Header with Avatar */}
        <View className="items-center border-b border-neutral-100 bg-neutral-50 px-4 pb-6 pt-16">
          {contact.avatarUrl ? (
            <Image
              source={{ uri: contact.avatarUrl }}
              className="h-24 w-24 rounded-full"
            />
          ) : (
            <View className="h-24 w-24 items-center justify-center rounded-full bg-neutral-200">
              <Text className="text-3xl font-bold text-neutral-700">
                {initials || "?"}
              </Text>
            </View>
          )}

          <Text className="mt-4 text-2xl font-bold text-neutral-900">
            {contact.givenName} {contact.familyName}
          </Text>

          {contact.company && (
            <Text className="mt-1 text-sm text-neutral-600">
              {contact.company}
            </Text>
          )}

          {/* Badges */}
          <View className="mt-3 flex-row gap-2">
            {contact.isFresh && (
              <View className="rounded-full bg-green-100 px-3 py-1">
                <Text className="text-xs font-semibold text-green-700">
                  NEW
                </Text>
              </View>
            )}
            {contact.pinned && (
              <View className="rounded-full bg-amber-100 px-3 py-1">
                <Text className="text-xs font-semibold text-amber-700">
                  📌 PINNED
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Quick Actions */}
        <View className="px-4 pt-4">
          <Text className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Quick Actions
          </Text>
          <View className="flex-row gap-3">
            {/* Message */}
            <Pressable
              onPress={handleMessage}
              disabled={!contact.phone}
              className={`flex-1 items-center rounded-2xl border py-4 ${
                contact.phone
                  ? "border-neutral-200 bg-white active:bg-neutral-50"
                  : "border-neutral-100 bg-neutral-50"
              }`}
            >
              <Text className="mb-1 text-2xl">💬</Text>
              <Text
                className={`text-xs font-medium ${
                  contact.phone ? "text-neutral-900" : "text-neutral-400"
                }`}
              >
                Message
              </Text>
            </Pressable>

            {/* Call */}
            <Pressable
              onPress={handleCall}
              disabled={!contact.phone}
              className={`flex-1 items-center rounded-2xl border py-4 ${
                contact.phone
                  ? "border-neutral-200 bg-white active:bg-neutral-50"
                  : "border-neutral-100 bg-neutral-50"
              }`}
            >
              <Text className="mb-1 text-2xl">📞</Text>
              <Text
                className={`text-xs font-medium ${
                  contact.phone ? "text-neutral-900" : "text-neutral-400"
                }`}
              >
                Call
              </Text>
            </Pressable>

            {/* Email */}
            <Pressable
              onPress={handleEmail}
              disabled={!contact.email}
              className={`flex-1 items-center rounded-2xl border py-4 ${
                contact.email
                  ? "border-neutral-200 bg-white active:bg-neutral-50"
                  : "border-neutral-100 bg-neutral-50"
              }`}
            >
              <Text className="mb-1 text-2xl">✉️</Text>
              <Text
                className={`text-xs font-medium ${
                  contact.email ? "text-neutral-900" : "text-neutral-400"
                }`}
              >
                Email
              </Text>
            </Pressable>

            {/* FaceTime (iOS only) */}
            {Platform.OS === "ios" && (
              <Pressable
                onPress={handleFaceTime}
                disabled={!contact.phone && !contact.email}
                className={`flex-1 items-center rounded-2xl border py-4 ${
                  contact.phone || contact.email
                    ? "border-neutral-200 bg-white active:bg-neutral-50"
                    : "border-neutral-100 bg-neutral-50"
                }`}
              >
                <Text className="mb-1 text-2xl">📹</Text>
                <Text
                  className={`text-xs font-medium ${
                    contact.phone || contact.email
                      ? "text-neutral-900"
                      : "text-neutral-400"
                  }`}
                >
                  FaceTime
                </Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* Contact Details */}
        <View className="mt-6 px-4">
          <Text className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Contact Information
          </Text>
          <View className="rounded-2xl border border-neutral-200 bg-white">
            {contact.phone && (
              <View className="border-b border-neutral-100 px-4 py-3">
                <Text className="text-xs text-neutral-500">Phone</Text>
                <Text className="mt-1 text-base text-neutral-900">
                  {contact.phone}
                </Text>
              </View>
            )}
            {contact.email && (
              <View className="border-b border-neutral-100 px-4 py-3">
                <Text className="text-xs text-neutral-500">Email</Text>
                <Text className="mt-1 text-base text-neutral-900">
                  {contact.email}
                </Text>
              </View>
            )}
            {contact.company && (
              <View className="border-b border-neutral-100 px-4 py-3">
                <Text className="text-xs text-neutral-500">Company</Text>
                <Text className="mt-1 text-base text-neutral-900">
                  {contact.company}
                </Text>
              </View>
            )}
            {contact.tags && contact.tags.length > 0 && (
              <View className="px-4 py-3">
                <Text className="text-xs text-neutral-500">Tags</Text>
                <View className="mt-2 flex-row flex-wrap gap-2">
                  {contact.tags.map((tag, index) => (
                    <View
                      key={index}
                      className="rounded-full bg-neutral-100 px-3 py-1"
                    >
                      <Text className="text-xs text-neutral-700">{tag}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Notes Section */}
        <View className="mt-6 px-4">
          <Text className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Add Note
          </Text>
          <View className="rounded-2xl border border-neutral-200 bg-white p-4">
            <View className="min-h-[100px] rounded-xl bg-neutral-50 p-3">
              <Text className="text-sm text-neutral-500">
                {note || "Add a quick note about this contact..."}
              </Text>
            </View>
            <Pressable
              onPress={handleSaveNote}
              className="mt-3 rounded-xl bg-neutral-900 py-3 active:opacity-80"
            >
              <Text className="text-center text-sm font-semibold text-white">
                Save Note
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Additional Actions */}
        <View className="mt-6 px-4 pb-8">
          <Pressable
            onPress={handleTogglePin}
            className="rounded-2xl border border-neutral-200 bg-white px-4 py-3 active:bg-neutral-50"
          >
            <Text className="text-center text-sm font-medium text-neutral-900">
              {contact.pinned ? "📌 Unpin Contact" : "📌 Pin to Top"}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
