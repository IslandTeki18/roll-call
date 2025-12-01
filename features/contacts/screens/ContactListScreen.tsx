import { useUser } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Alert, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ContactCard from "../../../features/contacts/components/ContactCard";
import { Lock, Smartphone, Mail, MessageSquare } from "lucide-react-native";
import { usePremiumGate } from "@/features/auth/hooks/usePremiumGate";

import {
  ProfileContact,
  getDeviceContactCount,
  importDeviceContacts,
  loadContacts,
} from "../api/contacts.service";

export default function ContactListScreen() {
  const { user } = useUser();
  const router = useRouter();
  const { isPremium, requirePremium } = usePremiumGate();
  const [contacts, setContacts] = useState<ProfileContact[]>([]);
  const [importing, setImporting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deviceContactCount, setDeviceContactCount] = useState(0);

  useEffect(() => {
    (async () => {
      const count = await getDeviceContactCount();
      setDeviceContactCount(count);
    })();
  }, []);

  useEffect(() => {
    fetchContacts();
  }, [user]);

  const fetchContacts = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const data = await loadContacts(user.id);
      setContacts(data);
    } catch (error) {
      console.error("Failed to load contacts:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleImportContacts = async () => {
    if (!user) return;

    setImporting(true);

    try {
      const imported = await importDeviceContacts(user.id);
      Alert.alert("Import Complete", `Imported ${imported} new contacts`);
      await fetchContacts();
    } catch (error) {
      console.error("Import failed:", error);
      Alert.alert(
        "Import Failed",
        "Could not import contacts. Please try again."
      );
    } finally {
      setImporting(false);
    }
  };

  const handleExternalImport = (source: "google" | "outlook" | "slack") => {
    const sourceLabels = {
      google: "Google Contacts",
      outlook: "Outlook Contacts",
      slack: "Slack Contacts",
    };
    requirePremium(`${sourceLabels[source]} import`);
  };

  const allContactsImported =
    contacts.length >= deviceContactCount && deviceContactCount > 0;

  return (
    <SafeAreaView className="flex-1">
      <ScrollView className="h-screen">
        <View className="px-4 py-6">
          <Text className="text-2xl font-bold mb-4">Contacts</Text>

          {/* Device Contacts Import */}
          {!allContactsImported && (
            <TouchableOpacity
              onPress={handleImportContacts}
              disabled={importing}
              className={`p-4 rounded-lg mb-3 flex-row items-center justify-center gap-2 ${
                importing ? "bg-gray-400" : "bg-blue-600"
              }`}
            >
              <Smartphone size={20} color="white" />
              <Text className="text-white text-center font-semibold">
                {importing ? "Importing..." : "Import Device Contacts"}
              </Text>
            </TouchableOpacity>
          )}

          {/* External Source Imports - Premium Only */}
          <View className="mb-4">
            <Text className="text-xs font-semibold text-gray-500 uppercase mb-2">
              External Sources
            </Text>
            <View className="flex-row gap-2">
              <TouchableOpacity
                onPress={() =>
                  isPremium
                    ? Alert.alert(
                        "Coming Soon",
                        "Google Contacts import coming soon"
                      )
                    : handleExternalImport("google")
                }
                className={`flex-1 p-3 rounded-lg border flex-row items-center justify-center gap-2 ${
                  isPremium
                    ? "border-gray-200 bg-white"
                    : "border-dashed border-gray-300 bg-gray-50"
                }`}
              >
                <Mail size={18} color={isPremium ? "#EA4335" : "#9CA3AF"} />
                <Text
                  className={`text-sm font-medium ${
                    isPremium ? "text-gray-700" : "text-gray-400"
                  }`}
                >
                  Google
                </Text>
                {!isPremium && <Lock size={12} color="#9CA3AF" />}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() =>
                  isPremium
                    ? Alert.alert(
                        "Coming Soon",
                        "Outlook Contacts import coming soon"
                      )
                    : handleExternalImport("outlook")
                }
                className={`flex-1 p-3 rounded-lg border flex-row items-center justify-center gap-2 ${
                  isPremium
                    ? "border-gray-200 bg-white"
                    : "border-dashed border-gray-300 bg-gray-50"
                }`}
              >
                <Mail size={18} color={isPremium ? "#0078D4" : "#9CA3AF"} />
                <Text
                  className={`text-sm font-medium ${
                    isPremium ? "text-gray-700" : "text-gray-400"
                  }`}
                >
                  Outlook
                </Text>
                {!isPremium && <Lock size={12} color="#9CA3AF" />}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() =>
                  isPremium
                    ? Alert.alert(
                        "Coming Soon",
                        "Slack Contacts import coming soon"
                      )
                    : handleExternalImport("slack")
                }
                className={`flex-1 p-3 rounded-lg border flex-row items-center justify-center gap-2 ${
                  isPremium
                    ? "border-gray-200 bg-white"
                    : "border-dashed border-gray-300 bg-gray-50"
                }`}
              >
                <MessageSquare
                  size={18}
                  color={isPremium ? "#4A154B" : "#9CA3AF"}
                />
                <Text
                  className={`text-sm font-medium ${
                    isPremium ? "text-gray-700" : "text-gray-400"
                  }`}
                >
                  Slack
                </Text>
                {!isPremium && <Lock size={12} color="#9CA3AF" />}
              </TouchableOpacity>
            </View>
          </View>

          {loading ? (
            <Text className="text-gray-600">Loading...</Text>
          ) : contacts.length === 0 ? (
            <Text className="text-gray-600">No contacts yet</Text>
          ) : (
            <View className="gap-3">
              {contacts.map((contact) => (
                <ContactCard
                  key={contact.$id}
                  displayName={contact.displayName}
                  organization={contact.organization}
                  phoneNumbers={contact.phoneNumbers}
                  emails={contact.emails}
                  onPress={() => {
                    router.push({
                      pathname: "/(tabs)/contacts/details",
                      params: { id: contact.$id },
                    });
                  }}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
