import { tablesDB } from "@/features/shared/lib/appwrite";
import { ID, Query } from "react-native-appwrite";

const DATABASE_ID = process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID!;
const USER_PROFILES_TABLE_ID =
  process.env.EXPO_PUBLIC_APPWRITE_USER_PROFILES_TABLE_ID!;

export interface UserProfile {
  $id: string;
  clerkUserId: string;
  email: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  displayName: string;
  isPremiumUser: boolean;
  $createdAt: string;
  $updatedAt: string;
}

export async function getOrCreateUserProfile(
  clerkUserId: string,
  email: string,
  phone?: string,
  firstName?: string,
  lastName?: string
): Promise<UserProfile> {
  try {
    const response = await tablesDB.listRows({
      databaseId: DATABASE_ID,
      tableId: USER_PROFILES_TABLE_ID,
      queries: [Query.equal("clerkUserId", clerkUserId)],
    });

    if (response.rows.length > 0) {
      return response.rows[0] as unknown as UserProfile;
    }

    const displayName =
      [firstName, lastName].filter(Boolean).join(" ").trim() ||
      email.split("@")[0];

    const newProfile = await tablesDB.createRow({
      databaseId: DATABASE_ID,
      tableId: USER_PROFILES_TABLE_ID,
      rowId: ID.unique(),
      data: {
        clerkUserId,
        email,
        phone: phone || "",
        firstName: firstName || "",
        lastName: lastName || "",
        displayName,
        isPremiumUser: false,
      },
    });

    return newProfile as unknown as UserProfile;
  } catch (error) {
    console.error("Failed to get/create user profile:", error);
    throw error;
  }
}
