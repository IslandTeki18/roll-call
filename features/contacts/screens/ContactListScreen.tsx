import { usePremiumGate } from "@/features/auth/hooks/usePremiumGate";
import { useUserProfile } from "@/features/auth/hooks/useUserProfile";
import { useRouter } from "expo-router";
import {
  Lock,
  Mail,
  MessageSquare,
  Smartphone,
  Search,
  X,
} from "lucide-react-native";
import React, { useEffect, useState, useMemo } from "react";
import {
  Alert,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ContactCard from "../../../features/contacts/components/ContactCard";

import {
  ProfileContact,
  getDeviceContactCount,
  importDeviceContacts,
  loadContacts,
} from "../api/contacts.service";

export default function ContactListScreen() {
  const { profile } = useUserProfile();
  const router = useRouter();
  const { isPremium, requirePremium } = usePremiumGate();
  const [contacts, setContacts] = useState<ProfileContact[]>([]);
  const [importing, setImporting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deviceContactCount, setDeviceContactCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredContacts = useMemo(() => {
    let filtered = contacts;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = contacts.filter(
        (c) =>
          c.displayName.toLowerCase().includes(query) ||
          c.organization?.toLowerCase().includes(query) ||
          c.emails?.toLowerCase().includes(query) ||
          c.phoneNumbers?.toLowerCase().includes(query)
      );
    }

    return filtered.sort((a, b) => a.displayName.localeCompare(b.displayName));
  }, [contacts, searchQuery]);

  useEffect(() => {
    (async () => {
      const count = await getDeviceContactCount();
      setDeviceContactCount(count);
    })();
  }, []);

  useEffect(() => {
    fetchContacts();
  }, [profile]);

  const fetchContacts = async () => {
    if (!profile) return;

    try {
      setLoading(true);
      const data = await loadContacts(profile.$id);
      setContacts(data);
    } catch (error) {
      console.error("Failed to load contacts:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleImportContacts = async () => {
    if (!profile) return;

    setImporting(true);

    try {
      const imported = await importDeviceContacts(profile.$id);
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
    <SafeAreaView className="flex-1 bg-gray-800">
      <ScrollView className="h-screen">
        <View className="px-4 py-6">
          <Text className="text-2xl font-bold mb-4 text-white">Contacts</Text>

          <View className="flex-row items-center bg-gray-900 rounded-xl px-4 py-3 border border-gray-700 mb-4">
            <Search size={18} color="#9CA3AF" />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search contacts..."
              placeholderTextColor="#6B7280"
              className="flex-1 ml-2 text-base text-white"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <X size={18} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>

          {!allContactsImported && !loading && (
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

          <View className="mb-4">
            <Text className="text-xs font-semibold text-gray-400 uppercase mb-2">
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
                    ? "border-gray-700 bg-gray-900"
                    : "border-dashed border-gray-700 bg-gray-800"
                }`}
              >
                <Mail size={18} color={isPremium ? "#EA4335" : "#6B7280"} />
                <Text
                  className={`text-sm font-medium ${
                    isPremium ? "text-gray-300" : "text-gray-500"
                  }`}
                >
                  Google
                </Text>
                {!isPremium && <Lock size={12} color="#6B7280" />}
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
                    ? "border-gray-700 bg-gray-900"
                    : "border-dashed border-gray-700 bg-gray-800"
                }`}
              >
                <Mail size={18} color={isPremium ? "#0078D4" : "#6B7280"} />
                <Text
                  className={`text-sm font-medium ${
                    isPremium ? "text-gray-300" : "text-gray-500"
                  }`}
                >
                  Outlook
                </Text>
                {!isPremium && <Lock size={12} color="#6B7280" />}
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
                    ? "border-gray-700 bg-gray-900"
                    : "border-dashed border-gray-700 bg-gray-800"
                }`}
              >
                <MessageSquare
                  size={18}
                  color={isPremium ? "#4A154B" : "#6B7280"}
                />
                <Text
                  className={`text-sm font-medium ${
                    isPremium ? "text-gray-300" : "text-gray-500"
                  }`}
                >
                  Slack
                </Text>
                {!isPremium && <Lock size={12} color="#6B7280" />}
              </TouchableOpacity>
            </View>
          </View>

          {loading ? (
            <Text className="text-gray-400">Loading...</Text>
          ) : filteredContacts.length === 0 ? (
            <Text className="text-gray-400">
              {searchQuery ? "No contacts found" : "No contacts yet"}
            </Text>
          ) : (
            <View className="gap-3">
              {/* NEW: Pass full contact object instead of individual props */}
              {filteredContacts.map((contact) => (
                <ContactCard
                  key={contact.$id}
                  contact={contact}
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
