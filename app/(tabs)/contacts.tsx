import { Text, View, ScrollView, TouchableOpacity, Alert } from "react-native";
import React, { useState, useEffect } from "react";
import * as Contacts from "expo-contacts";
import { useUser } from "@clerk/clerk-expo";
import { databases } from "../../lib/appwrite";
import { ID, Query } from "react-native-appwrite";
import ContactCard from "../../components/contacts/ContactCard";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

export const DATABASE_ID = process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID!;
export const PROFILE_CONTACTS_COLLECTION_ID =
  process.env.EXPO_PUBLIC_APPWRITE_PROFILE_CONTACTS_TABLE_ID!;

interface ProfileContact {
  id: string;
  userId: string;
  sourceType: "device" | "google" | "outlook" | "slack";
  firstName: string;
  lastName: string;
  displayName: string;
  phoneNumbers: string;
  emails: string;
  organization: string;
  jobTitle: string;
  notes: string;
  dedupeSignature: string;
  firstImportedAt: string;
  lastImportedAt: string;
  firstSeenAt: string;
}

export default function ContactsScreen() {
  const { user } = useUser();
  const router = useRouter();
  const [contacts, setContacts] = useState<ProfileContact[]>([]);
  const [importing, setImporting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deviceContactCount, setDeviceContactCount] = useState(0);

  useEffect(() => {
    (async () => {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status === "granted") {
        const { data } = await Contacts.getContactsAsync({
          fields: [
            Contacts.Fields.FirstName,
            Contacts.Fields.LastName,
            Contacts.Fields.PhoneNumbers,
            Contacts.Fields.Emails,
          ],
        });

        setDeviceContactCount(data.length);

        if (data.length > 0) {
          const contact = data[0];
          console.log("First Contact", contact);
        }
      }
    })();
  }, []);

  useEffect(() => {
    loadContacts();
  }, [user]);

  const loadContacts = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const response = await databases.listDocuments({
        databaseId: DATABASE_ID,
        collectionId: PROFILE_CONTACTS_COLLECTION_ID,
        queries: [Query.equal("userId", user.id), Query.limit(1000)],
      });
      setContacts(response.documents as unknown as ProfileContact[]);
    } catch (error) {
      console.error("Failed to load contacts:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateDedupeSignature = (
    firstName: string,
    lastName: string,
    primaryPhone: string,
    primaryEmail: string
  ): string => {
    const parts = [
      firstName.toLowerCase().trim(),
      lastName.toLowerCase().trim(),
      primaryPhone.replace(/\D/g, ""),
      primaryEmail.toLowerCase().trim(),
    ].filter(Boolean);
    return parts.join("|");
  };

  const importContacts = async () => {
    if (!user) return;

    setImporting(true);

    try {
      const { data } = await Contacts.getContactsAsync({
        fields: [
          Contacts.Fields.FirstName,
          Contacts.Fields.LastName,
          Contacts.Fields.PhoneNumbers,
          Contacts.Fields.Emails,
        ],
      });

      const existingResponse = await databases.listDocuments(
        DATABASE_ID,
        PROFILE_CONTACTS_COLLECTION_ID,
        [Query.equal("userId", user.id), Query.limit(5000)]
      );

      const existingSignatures = new Set(
        existingResponse.documents.map((doc: any) => doc.dedupeSignature)
      );

      const timestamp = new Date().toISOString();
      let imported = 0;

      for (const contact of data) {
        const firstName = contact.firstName || "";
        const lastName = contact.lastName || "";
        const displayName = `${firstName} ${lastName}`.trim() || "Unknown";

        const phoneNumbers = (contact.phoneNumbers || []).map(
          (p) => p.number || ""
        );
        const emails = (contact.emails || []).map((e) => e.email || "");

        const primaryPhone = phoneNumbers[0] || "";
        const primaryEmail = emails[0] || "";

        const dedupeSignature = generateDedupeSignature(
          firstName,
          lastName,
          primaryPhone,
          primaryEmail
        );

        if (!dedupeSignature || existingSignatures.has(dedupeSignature)) {
          continue;
        }

        const profileContact: Omit<ProfileContact, "id"> = {
          userId: user.id,
          sourceType: "device",
          firstName,
          lastName,
          displayName,
          phoneNumbers: phoneNumbers.join(","),
          emails: emails.join(","),
          organization: contact.company || "",
          jobTitle: contact.jobTitle || "",
          notes: contact.note || "",
          dedupeSignature,
          firstImportedAt: timestamp,
          lastImportedAt: timestamp,
          firstSeenAt: timestamp,
        };

        await databases.createDocument(
          DATABASE_ID,
          PROFILE_CONTACTS_COLLECTION_ID,
          ID.unique(),
          profileContact
        );

        existingSignatures.add(dedupeSignature);
        imported++;
      }

      Alert.alert("Import Complete", `Imported ${imported} new contacts`);
      await loadContacts();
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
              onPress={importContacts}
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
              {contacts.map((contact, idx) => (
                <ContactCard
                  key={`contact-${idx}`}
                  displayName={contact.displayName}
                  organization={contact.organization}
                  phoneNumbers={contact.phoneNumbers}
                  emails={contact.emails}
                  onPress={() =>
                    console.log("Pressed contact:", contact.displayName)
                  }
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
