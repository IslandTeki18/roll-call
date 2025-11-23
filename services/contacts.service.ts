import { tablesDB } from "../lib/appwrite";
import { ID, Query } from "react-native-appwrite";
import * as Contacts from "expo-contacts";

const DATABASE_ID = process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID!;
const PROFILE_CONTACTS_TABLE_ID =
  process.env.EXPO_PUBLIC_APPWRITE_PROFILE_CONTACTS_TABLE_ID!;

export interface ProfileContact {
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
    tableId: PROFILE_CONTACTS_TABLE_ID,
    queries: [Query.equal("userId", userId), Query.limit(1000)],
  });
  return response.rows as unknown as ProfileContact[];
};

export const getDeviceContactCount = async (): Promise<number> => {
  const { status } = await Contacts.requestPermissionsAsync();
  if (status !== "granted") return 0;

  const { data } = await Contacts.getContactsAsync({
    fields: [
      Contacts.Fields.FirstName,
      Contacts.Fields.LastName,
      Contacts.Fields.PhoneNumbers,
      Contacts.Fields.Emails,
    ],
  });

  return data.length;
};

export const importDeviceContacts = async (userId: string): Promise<number> => {
  const { data } = await Contacts.getContactsAsync({
    fields: [
      Contacts.Fields.FirstName,
      Contacts.Fields.LastName,
      Contacts.Fields.PhoneNumbers,
      Contacts.Fields.Emails,
      Contacts.Fields.Company,
      Contacts.Fields.JobTitle,
      Contacts.Fields.Note,
    ],
  });

  const existingResponse = await tablesDB.listRows({
    databaseId: DATABASE_ID,
    tableId: PROFILE_CONTACTS_TABLE_ID,
    queries: [Query.equal("userId", userId), Query.limit(5000)],
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

    const profileContact: Omit<ProfileContact, "id"> = {
      userId,
      sourceType: "device",
      firstName,
      lastName,
      displayName,
      phoneNumbers: phoneNumbers.join(","),
      emails: emails.join(","),
      organization: contact.company?.trim() || "",
      jobTitle: contact.jobTitle?.trim() || "",
      notes: contact.note?.trim() || "",
      dedupeSignature,
      firstImportedAt: timestamp,
      lastImportedAt: timestamp,
      firstSeenAt: timestamp,
    };

    await tablesDB.createRow({
      databaseId: DATABASE_ID,
      tableId: PROFILE_CONTACTS_TABLE_ID,
      rowId: ID.unique(),
      data: profileContact,
    });

    existingSignatures.add(dedupeSignature);
    imported++;
  }

  return imported;
};
