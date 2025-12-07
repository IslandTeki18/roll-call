import { databases } from "@/features/shared/lib/appwrite";

const DATABASE_ID = process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID!;
const DECK_CARDS_TABLE_ID =
  process.env.EXPO_PUBLIC_APPWRITE_DECK_CARDS_TABLE_ID!;

export const markCardDrafted = async (documentId: string): Promise<void> => {
  const timestamp = new Date().toISOString();

  await databases.updateDocument(DATABASE_ID, DECK_CARDS_TABLE_ID, documentId, {
    draftedAt: timestamp,
  });
};

export const markCardSent = async (
  documentId: string,
  engagementEventId: string
): Promise<void> => {
  const timestamp = new Date().toISOString();

  await databases.updateDocument(DATABASE_ID, DECK_CARDS_TABLE_ID, documentId, {
    sentAt: timestamp,
    linkedEngagementEventId: engagementEventId,
  });
};

export const markCardCompleted = async (
  documentId: string,
  outcomeId?: string
): Promise<void> => {
  const timestamp = new Date().toISOString();

  await databases.updateDocument(DATABASE_ID, DECK_CARDS_TABLE_ID, documentId, {
    completedAt: timestamp,
    status: "completed",
    linkedOutcomeId: outcomeId || "",
  });
};

export const markCardSkipped = async (documentId: string): Promise<void> => {
  const timestamp = new Date().toISOString();

  await databases.updateDocument(DATABASE_ID, DECK_CARDS_TABLE_ID, documentId, {
    completedAt: timestamp,
    status: "skipped",
  });
};
