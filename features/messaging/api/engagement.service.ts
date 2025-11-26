import { tablesDB } from "../../shared/lib/appwrite";
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

// === Mutations ===

export const createEngagementEvent = async (
  userId: string,
  type: EngagementEventType,
  contactIds: string[],
  linkedCardId?: string,
  metadata?: Record<string, unknown>
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

// === Queries ===

export const getEventsByContact = async (
  userId: string,
  contactId: string,
  limit: number = 100
): Promise<EngagementEvent[]> => {
  const response = await tablesDB.listRows({
    databaseId: DATABASE_ID,
    tableId: ENGAGEMENT_EVENTS_TABLE_ID,
    queries: [
      Query.equal("userId", userId),
      Query.contains("contactIds", contactId),
      Query.orderDesc("timestamp"),
      Query.limit(limit),
    ],
  });

  return response.rows as unknown as EngagementEvent[];
};

export const getEventsByDateRange = async (
  userId: string,
  startDate: string,
  endDate: string,
  limit: number = 500
): Promise<EngagementEvent[]> => {
  const response = await tablesDB.listRows({
    databaseId: DATABASE_ID,
    tableId: ENGAGEMENT_EVENTS_TABLE_ID,
    queries: [
      Query.equal("userId", userId),
      Query.greaterThanEqual("timestamp", startDate),
      Query.lessThanEqual("timestamp", endDate),
      Query.orderDesc("timestamp"),
      Query.limit(limit),
    ],
  });

  return response.rows as unknown as EngagementEvent[];
};

export const getEventsByType = async (
  userId: string,
  eventType: EngagementEventType,
  limit: number = 100
): Promise<EngagementEvent[]> => {
  const response = await tablesDB.listRows({
    databaseId: DATABASE_ID,
    tableId: ENGAGEMENT_EVENTS_TABLE_ID,
    queries: [
      Query.equal("userId", userId),
      Query.equal("type", eventType),
      Query.orderDesc("timestamp"),
      Query.limit(limit),
    ],
  });

  return response.rows as unknown as EngagementEvent[];
};

export const getEventsByContactAndType = async (
  userId: string,
  contactId: string,
  eventType: EngagementEventType,
  limit: number = 100
): Promise<EngagementEvent[]> => {
  const response = await tablesDB.listRows({
    databaseId: DATABASE_ID,
    tableId: ENGAGEMENT_EVENTS_TABLE_ID,
    queries: [
      Query.equal("userId", userId),
      Query.contains("contactIds", contactId),
      Query.equal("type", eventType),
      Query.orderDesc("timestamp"),
      Query.limit(limit),
    ],
  });

  return response.rows as unknown as EngagementEvent[];
};

export const getEventsByContactAndDateRange = async (
  userId: string,
  contactId: string,
  startDate: string,
  endDate: string,
  limit: number = 100
): Promise<EngagementEvent[]> => {
  const response = await tablesDB.listRows({
    databaseId: DATABASE_ID,
    tableId: ENGAGEMENT_EVENTS_TABLE_ID,
    queries: [
      Query.equal("userId", userId),
      Query.contains("contactIds", contactId),
      Query.greaterThanEqual("timestamp", startDate),
      Query.lessThanEqual("timestamp", endDate),
      Query.orderDesc("timestamp"),
      Query.limit(limit),
    ],
  });

  return response.rows as unknown as EngagementEvent[];
};

export const getLastEventForContact = async (
  userId: string,
  contactId: string
): Promise<EngagementEvent | null> => {
  const response = await tablesDB.listRows({
    databaseId: DATABASE_ID,
    tableId: ENGAGEMENT_EVENTS_TABLE_ID,
    queries: [
      Query.equal("userId", userId),
      Query.contains("contactIds", contactId),
      Query.orderDesc("timestamp"),
      Query.limit(1),
    ],
  });

  return response.rows.length > 0
    ? (response.rows[0] as unknown as EngagementEvent)
    : null;
};

export const getRecentEvents = async (
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
