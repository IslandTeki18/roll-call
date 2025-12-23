import { tablesDB } from "@/features/shared/lib/appwrite";
import * as Contacts from "expo-contacts";
import { Platform } from "react-native";
import { ID, Query } from "react-native-appwrite";

const DATABASE_ID = process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID!;
const PROFILE_CONTACTS_COLLECTION_ID =
  process.env.EXPO_PUBLIC_APPWRITE_PROFILE_CONTACTS_TABLE_ID!;

export interface ProfileContact {
  $id: string;
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
  firstEngagementAt: string; // NEW: Tracks when first engagement happened
  cadenceDays: number | null;
}

export const generateDedupeSignature = (
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

export const loadContacts = async (
  userId: string
): Promise<ProfileContact[]> => {
  const response = await tablesDB.listRows({
    databaseId: DATABASE_ID,
    tableId: PROFILE_CONTACTS_COLLECTION_ID,
    queries: [Query.equal("userId", userId), Query.limit(1000)],
  });
  return response.rows as unknown as ProfileContact[];
};

export const getContactById = async (
  contactId: string
): Promise<ProfileContact | null> => {
  try {
    const row = await tablesDB.getRow({
      databaseId: DATABASE_ID,
      tableId: PROFILE_CONTACTS_COLLECTION_ID,
      rowId: contactId,
    });
    return row as unknown as ProfileContact;
  } catch (error) {
    console.error("Failed to get contact by ID:", error);
    return null;
  }
};

export const getDeviceContactCount = async (): Promise<number> => {
  const { status } = await Contacts.requestPermissionsAsync();
  if (status !== "granted") return 0;

  const { data } = await Contacts.getContactsAsync({
    fields: [Contacts.Fields.ID],
  });

  if (!data) return 0;
  return data.length;
};

export const importDeviceContacts = async (userId: string): Promise<number> => {
  const fields = [
    Contacts.Fields.FirstName,
    Contacts.Fields.LastName,
    Contacts.Fields.PhoneNumbers,
    Contacts.Fields.Emails,
  ];

  if (Platform.OS === "ios") {
    fields.push(Contacts.Fields.JobTitle);
  }

  const { data } = await Contacts.getContactsAsync({ fields });

  const existingResponse = await tablesDB.listRows({
    databaseId: DATABASE_ID,
    tableId: PROFILE_CONTACTS_COLLECTION_ID,
    queries: [Query.equal("userId", userId), Query.limit(1000)],
  });

  const existingSignatures = new Set(
    existingResponse.rows.map((doc: any) => doc.dedupeSignature)
  );

  const timestamp = new Date().toISOString();
  let imported = 0;

  for (const contact of data) {
    const firstName = contact.firstName?.trim() || "";
    const lastName = contact.lastName?.trim() || "";
    const displayName = `${firstName} ${lastName}`.trim() || "Unknown";

    const phoneNumbers = (contact.phoneNumbers || [])
      .map((p) => p.number?.trim() || "")
      .filter(Boolean);
    const emails = (contact.emails || [])
      .map((e) => e.email?.trim() || "")
      .filter(Boolean);

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

    const profileContact = {
      userId,
      sourceType: "device",
      firstName,
      lastName,
      displayName,
      phoneNumbers: phoneNumbers.join(","),
      emails: emails.join(","),
      organization: contact.company?.trim() || "",
      jobTitle: contact.jobTitle?.trim() || "",
      notes: Platform.OS === "ios" ? contact.note?.trim() || "" : "",
      dedupeSignature,
      firstImportedAt: timestamp,
      lastImportedAt: timestamp,
      firstSeenAt: timestamp,
      firstEngagementAt: "",
      cadenceDays: null,
    };

    await tablesDB.createRow({
      databaseId: DATABASE_ID,
      tableId: PROFILE_CONTACTS_COLLECTION_ID,
      rowId: ID.unique(),
      data: profileContact,
    });

    existingSignatures.add(dedupeSignature);
    imported++;
  }

  return imported;
};

export const updateContactCadence = async (
  contactId: string,
  cadenceDays: number | null
): Promise<void> => {
  try {
    await tablesDB.updateRow({
      databaseId: DATABASE_ID,
      tableId: PROFILE_CONTACTS_COLLECTION_ID,
      rowId: contactId,
      data: { cadenceDays },
    });
  } catch (error) {
    console.error("Failed to update contact cadence:", error);
  }
};

export const markContactEngaged = async (contactId: string): Promise<void> => {
  try {
    const timestamp = new Date().toISOString();
    await tablesDB.updateRow({
      databaseId: DATABASE_ID,
      tableId: PROFILE_CONTACTS_COLLECTION_ID,
      rowId: contactId,
      data: { firstEngagementAt: timestamp },
    });
  } catch (error) {
    console.error("Failed to mark contact as engaged:", error);
  }
};


export const isContactNew = (contact: ProfileContact): boolean => {
  // If already engaged, not new
  if (contact.firstEngagementAt && contact.firstEngagementAt.length > 0) {
    return false;
  }

  // Check if within 14-day window from firstSeenAt
  const daysSinceFirstSeen =
    (Date.now() - new Date(contact.firstSeenAt).getTime()) /
    (1000 * 60 * 60 * 24);

  return daysSinceFirstSeen < 14;
};
