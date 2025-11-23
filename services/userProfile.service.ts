import { databases } from "../lib/appwrite";
import { ID } from "react-native-appwrite";

const DATABASE_ID = process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID!;
const USER_PROFILES_COLLECTION_ID =
  process.env.EXPO_PUBLIC_APPWRITE_USER_PROFILES_COLLECTION_ID!;

export interface UserProfile {
  id: string;
  clerkUserId: string;
  email: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  displayName: string;
  createdAt: string;
  updatedAt: string;
}

export async function getOrCreateUserProfile(
  clerkUserId: string,
  email: string,
  phone?: string,
  firstName?: string,
  lastName?: string
): Promise<UserProfile> {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      USER_PROFILES_COLLECTION_ID,
      [`clerkUserId=${clerkUserId}`]
    );

    if (response.documents.length > 0) {
      return response.documents[0] as unknown as UserProfile;
    }

    const timestamp = new Date().toISOString();
    const displayName =
      [firstName, lastName].filter(Boolean).join(" ").trim() ||
      email.split("@")[0];

    const newProfile = await databases.createDocument(
      DATABASE_ID,
      USER_PROFILES_COLLECTION_ID,
      ID.unique(),
      {
        clerkUserId,
        email,
        phone: phone || "",
        firstName: firstName || "",
        lastName: lastName || "",
        displayName,
        createdAt: timestamp,
        updatedAt: timestamp,
      }
    );

    return newProfile as unknown as UserProfile;
  } catch (error) {
    console.error("Failed to get/create user profile:", error);
    throw error;
  }
}
