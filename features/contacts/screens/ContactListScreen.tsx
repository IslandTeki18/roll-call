import { Text, View, ScrollView, TouchableOpacity, Alert } from "react-native";
import React, { useState, useEffect } from "react";
import { useUser } from "@clerk/clerk-expo";
import ContactCard from "../../../features/contacts/components/ContactCard";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  ProfileContact,
  loadContacts,
  getDeviceContactCount,
  importDeviceContacts,
} from "../../../services/contacts.service";

export default function ContactListScreen() {
  const { user } = useUser();
  const router = useRouter();
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

  const allContactsImported =
    contacts.length >= deviceContactCount && deviceContactCount > 0;

  return (
    <SafeAreaView className="flex-1">
      <ScrollView className="h-screen">
        <View className="px-4 py-6">
          <Text className="text-2xl font-bold mb-4">Contacts</Text>

          {!allContactsImported && (
            <TouchableOpacity
              onPress={handleImportContacts}
              disabled={importing}
              className={`p-4 rounded-lg mb-4 ${
                importing ? "bg-gray-400" : "bg-blue-600"
              }`}
            >
              <Text className="text-white text-center font-semibold">
                {importing ? "Importing..." : "Import Contacts"}
              </Text>
            </TouchableOpacity>
          )}

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
