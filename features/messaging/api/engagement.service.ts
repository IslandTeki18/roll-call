import { tablesDB } from "../lib/appwrite";
import { ID, Query } from "react-native-appwrite";

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
  metadata?: Record<string, any>
): Promise<EngagementEvent> => {
  const timestamp = new Date().toISOString();

  const event = await tablesDB.createRow({
    databaseId: DATABASE_ID,
    tableId: ENGAGEMENT_EVENTS_TABLE_ID,
    rowId: ID.unique(),
    data: {
      userId,
      type,
      contactIds: contactIds.join(","),
      timestamp,
      metadata: metadata ? JSON.stringify(metadata) : "",
      linkedCardId: linkedCardId || "",
      createdAt: timestamp,
    },
  });

  return event as unknown as EngagementEvent;
};

export const getEngagementEventsForContact = async (
  userId: string,
  contactId: string
): Promise<EngagementEvent[]> => {
  const response = await tablesDB.listRows({
    databaseId: DATABASE_ID,
    tableId: ENGAGEMENT_EVENTS_TABLE_ID,
    queries: [
      Query.equal("userId", userId),
      Query.contains("contactIds", contactId),
    ],
  });

  return response.rows as unknown as EngagementEvent[];
};

export const getRecentEngagementEvents = async (
  userId: string,
  limit: number = 100
): Promise<EngagementEvent[]> => {
  const response = await tablesDB.listRows({
    databaseId: DATABASE_ID,
    tableId: ENGAGEMENT_EVENTS_TABLE_ID,
    queries: [
      Query.equal("userId", userId),
      Query.orderDesc("timestamp"),
      Query.limit(limit),
    ],
  });

  return response.rows as unknown as EngagementEvent[];
};
