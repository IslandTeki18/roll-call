import { ID, Query } from "react-native-appwrite";
import { databases } from "../../shared/lib/appwrite";

const DATABASE_ID = process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID!;
const ENGAGEMENT_EVENTS_TABLE_ID =
  process.env.EXPO_PUBLIC_APPWRITE_ENGAGEMENT_EVENTS_TABLE_ID!;

export type EngagementEventType =
  | "sms_sent"
  | "call_made"
  | "email_sent"
  | "facetime_made"
  | "slack_sent"
  | "note_added"
  | "card_dismissed"
  | "card_snoozed";

export interface EngagementEvent {
  $id: string;
  type: EngagementEventType;
  contactIds: string;
  timestamp: string;
  metadata: string;
  linkedCardId: string;
  userId: string;
  createdAt: string;
}

export const createEngagementEvent = async (
  userId: string,
  type: EngagementEventType,
  contactIds: string[],
  linkedCardId?: string,
  metadata?: Record<string, unknown>
): Promise<EngagementEvent> => {
  const timestamp = new Date().toISOString();

  const event = await databases.createDocument({
    databaseId: DATABASE_ID,
    collectionId: ENGAGEMENT_EVENTS_TABLE_ID,
    documentId: ID.unique(),
    data: {
      userId,
      type,
      contactIds,
      linkedCardId: linkedCardId || "",
      timestamp,
      metadata: metadata ? JSON.stringify(metadata) : "",
    },
  });

  return event as unknown as EngagementEvent;
};

export const getEventsByContact = async (
  userId: string,
  contactId: string,
  limit: number = 100
): Promise<EngagementEvent[]> => {
  const response = await databases.listDocuments(
    DATABASE_ID,
    ENGAGEMENT_EVENTS_TABLE_ID,
    [
      Query.equal("userId", userId),
      Query.contains("contactIds", contactId),
      Query.orderDesc("timestamp"),
      Query.limit(limit),
    ]
  );

  return response.documents as unknown as EngagementEvent[];
};

export const getEventsByDateRange = async (
  userId: string,
  startDate: string,
  endDate: string,
  limit: number = 500
): Promise<EngagementEvent[]> => {
  const response = await databases.listDocuments({
    databaseId: DATABASE_ID,
    collectionId: ENGAGEMENT_EVENTS_TABLE_ID,
    queries: [
      Query.equal("userId", userId),
      Query.greaterThanEqual("timestamp", startDate),
      Query.lessThanEqual("timestamp", endDate),
      Query.orderDesc("timestamp"),
      Query.limit(limit),
    ],
  });

  return response.documents as unknown as EngagementEvent[];
};

export const getEventsByType = async (
  userId: string,
  eventType: EngagementEventType,
  limit: number = 100
): Promise<EngagementEvent[]> => {
  const response = await databases.listDocuments({
    databaseId: DATABASE_ID,
    collectionId: ENGAGEMENT_EVENTS_TABLE_ID,
    queries: [
      Query.equal("userId", userId),
      Query.equal("type", eventType),
      Query.orderDesc("timestamp"),
      Query.limit(limit),
    ],
  });

  return response.documents as unknown as EngagementEvent[];
};

export const getEventsByContactAndType = async (
  userId: string,
  contactId: string,
  eventType: EngagementEventType,
  limit: number = 100
): Promise<EngagementEvent[]> => {
  const response = await databases.listDocuments({
    databaseId: DATABASE_ID,
    collectionId: ENGAGEMENT_EVENTS_TABLE_ID,
    queries: [
      Query.equal("userId", userId),
      Query.contains("contactIds", contactId),
      Query.equal("type", eventType),
      Query.orderDesc("timestamp"),
      Query.limit(limit),
    ],
  });

  return response.documents as unknown as EngagementEvent[];
};

export const getEventsByContactAndDateRange = async (
  userId: string,
  contactId: string,
  startDate: string,
  endDate: string,
  limit: number = 100
): Promise<EngagementEvent[]> => {
  const response = await databases.listDocuments({
    databaseId: DATABASE_ID,
    collectionId: ENGAGEMENT_EVENTS_TABLE_ID,
    queries: [
      Query.equal("userId", userId),
      Query.contains("contactIds", contactId),
      Query.greaterThanEqual("timestamp", startDate),
      Query.lessThanEqual("timestamp", endDate),
      Query.orderDesc("timestamp"),
      Query.limit(limit),
    ],
  });

  return response.documents as unknown as EngagementEvent[];
};

export const getLastEventForContact = async (
  userId: string,
  contactId: string
): Promise<EngagementEvent | null> => {
  const response = await databases.listDocuments({
    databaseId: DATABASE_ID,
    collectionId: ENGAGEMENT_EVENTS_TABLE_ID,
    queries: [
      Query.equal("userId", userId),
      Query.contains("contactIds", contactId),
      Query.orderDesc("timestamp"),
      Query.limit(1),
    ],
  });

  return response.documents.length > 0
    ? (response.documents[0] as unknown as EngagementEvent)
    : null;
};

export const getRecentEvents = async (
  userId: string,
  limit: number = 100
): Promise<EngagementEvent[]> => {
  const response = await databases.listDocuments({
    databaseId: DATABASE_ID,
    collectionId: ENGAGEMENT_EVENTS_TABLE_ID,
    queries: [
      Query.equal("userId", userId),
      Query.orderDesc("timestamp"),
      Query.limit(limit),
    ],
  });

  return response.documents as unknown as EngagementEvent[];
};
