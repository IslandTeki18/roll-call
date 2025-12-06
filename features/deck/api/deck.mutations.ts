import { databases } from "@/features/shared/lib/appwrite";
import { ID } from "react-native-appwrite";

const DATABASE_ID = process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID!;
const DECK_CARDS_TABLE_ID =
  process.env.EXPO_PUBLIC_APPWRITE_DECK_CARDS_TABLE_ID!;

export interface DeckCardRecord {
  $id: string;
  cardId: string;
  userId: string;
  contactId: string;
  date: string;
  drafted_at: string;
  sent_at: string;
  completed_at: string;
  status: "pending" | "drafted" | "sent" | "completed" | "skipped";
  engagementEventId: string;
  outcomeId: string;
}

export const markCardDrafted = async (
  userId: string,
  cardId: string,
  contactId: string,
  date: string
): Promise<DeckCardRecord> => {
  const timestamp = new Date().toISOString();

  const data = {
    cardId,
    userId,
    contactId,
    date,
    drafted_at: timestamp,
    sent_at: "",
    completed_at: "",
    status: "drafted",
    engagementEventId: "",
    outcomeId: "",
  };

  const response = await databases.createDocument(
    DATABASE_ID,
    DECK_CARDS_TABLE_ID,
    ID.unique(),
    data
  );

  return response as unknown as DeckCardRecord;
};

export const markCardSent = async (
  cardId: string,
  engagementEventId: string
): Promise<DeckCardRecord> => {
  const timestamp = new Date().toISOString();

  // Find existing card record
  const { documents } = await databases.listDocuments(
    DATABASE_ID,
    DECK_CARDS_TABLE_ID,
    [`cardId=${cardId}`]
  );

  if (documents.length === 0) {
    throw new Error(`Card record not found: ${cardId}`);
  }

  const response = await databases.updateDocument(
    DATABASE_ID,
    DECK_CARDS_TABLE_ID,
    documents[0].$id,
    {
      sent_at: timestamp,
      status: "sent",
      engagementEventId,
    }
  );

  return response as unknown as DeckCardRecord;
};

export const markCardCompleted = async (
  cardId: string,
  outcomeId?: string
): Promise<DeckCardRecord> => {
  const timestamp = new Date().toISOString();

  // Find existing card record
  const { documents } = await databases.listDocuments(
    DATABASE_ID,
    DECK_CARDS_TABLE_ID,
    [`cardId=${cardId}`]
  );

  if (documents.length === 0) {
    throw new Error(`Card record not found: ${cardId}`);
  }

  const response = await databases.updateDocument(
    DATABASE_ID,
    DECK_CARDS_TABLE_ID,
    documents[0].$id,
    {
      completed_at: timestamp,
      status: "completed",
      outcomeId: outcomeId || "",
    }
  );

  return response as unknown as DeckCardRecord;
};

export const markCardSkipped = async (
  cardId: string
): Promise<DeckCardRecord> => {
  const timestamp = new Date().toISOString();

  // Find existing card record
  const { documents } = await databases.listDocuments(
    DATABASE_ID,
    DECK_CARDS_TABLE_ID,
    [`cardId=${cardId}`]
  );

  if (documents.length === 0) {
    throw new Error(`Card record not found: ${cardId}`);
  }

  const response = await databases.updateDocument(
    DATABASE_ID,
    DECK_CARDS_TABLE_ID,
    documents[0].$id,
    {
      completed_at: timestamp,
      status: "skipped",
    }
  );

  return response as unknown as DeckCardRecord;
};
