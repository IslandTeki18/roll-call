import { tablesDB } from "../lib/appwrite";
import { Query } from "react-native-appwrite";
import { EngagementEvent, EngagementEventType } from "./engagement.service";

const DATABASE_ID = process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID!;
const ENGAGEMENT_EVENTS_TABLE_ID =
  process.env.EXPO_PUBLIC_APPWRITE_ENGAGEMENT_EVENTS_TABLE_ID!;

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
