import { markContactEngaged } from "@/features/contacts/api/contacts.service";
import { invalidateContactRHS } from "@/features/deck/api/rhs.cache";
import { ID, Query } from "react-native-appwrite";
import { databases, tablesDB } from "../../shared/lib/appwrite";

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

export interface CadenceAlignment {
  isOverdue: boolean;
  daysOverdue: number;
  isEarly: boolean;
  daysEarly: number;
  isOnTrack: boolean;
  cadenceDays: number | null;
  daysSinceLastContact: number | null;
}

export const createEngagementEvent = async (
  userId: string,
  type: EngagementEventType,
  contactIds: string[],
  linkedCardId?: string,
  metadata?: Record<string, unknown>
): Promise<EngagementEvent> => {
  const timestamp = new Date().toISOString();
  const data = {
    userId,
    type,
    contactIds: contactIds.join(","),
    linkedCardId: linkedCardId || "",
    timestamp,
    metadata: metadata ? JSON.stringify(metadata) : "",
  };

  const event = await tablesDB.createRow({
    databaseId: DATABASE_ID,
    tableId: ENGAGEMENT_EVENTS_TABLE_ID,
    rowId: ID.unique(),
    data,
  });

  const meaningfulTypes: EngagementEventType[] = [
    "sms_sent",
    "call_made",
    "email_sent",
    "facetime_made",
    "slack_sent",
  ];

  if (meaningfulTypes.includes(type)) {
    await Promise.all(
      contactIds.map((contactId) => markContactEngaged(contactId))
    ).catch((error) => {
      console.error("Failed to mark contacts as engaged:", error);
    });

    // Invalidate RHS cache for these contacts since they have new engagements
    contactIds.forEach((contactId) => {
      invalidateContactRHS(userId, contactId);
    });
  }

  return event as unknown as EngagementEvent;
};

export const getEventsByContact = async (
  userId: string,
  contactId: string,
  limit: number = 100
): Promise<EngagementEvent[]> => {
  // const response = await databases.listDocuments(
  //   DATABASE_ID,
  //   ENGAGEMENT_EVENTS_TABLE_ID,
  //   [
  //     Query.equal("userId", userId),
  //     Query.contains("contactIds", contactId),
  //     Query.orderDesc("timestamp"),
  //     Query.limit(limit),
  //   ]
  // );
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
  // const response = await databases.listDocuments(
  //   DATABASE_ID,
  //   ENGAGEMENT_EVENTS_TABLE_ID,
  //   [
  //     Query.equal("userId", userId),
  //     Query.greaterThanEqual("timestamp", startDate),
  //     Query.lessThanEqual("timestamp", endDate),
  //     Query.orderDesc("timestamp"),
  //     Query.limit(limit),
  //   ]
  // );
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

export const getCadenceAlignment = async (
  userId: string,
  contactId: string,
  cadenceDays: number | null
): Promise<CadenceAlignment> => {
  const lastEvent = await getLastEventForContact(userId, contactId);

  if (!cadenceDays || cadenceDays <= 0) {
    return {
      isOverdue: false,
      daysOverdue: 0,
      isEarly: false,
      daysEarly: 0,
      isOnTrack: true,
      cadenceDays: null,
      daysSinceLastContact: lastEvent
        ? Math.floor(
            (Date.now() - new Date(lastEvent.timestamp).getTime()) /
              (1000 * 60 * 60 * 24)
          )
        : null,
    };
  }

  if (!lastEvent) {
    return {
      isOverdue: true,
      daysOverdue: cadenceDays,
      isEarly: false,
      daysEarly: 0,
      isOnTrack: false,
      cadenceDays,
      daysSinceLastContact: null,
    };
  }

  const daysSinceLastContact = Math.floor(
    (Date.now() - new Date(lastEvent.timestamp).getTime()) /
      (1000 * 60 * 60 * 24)
  );

  const overdueThreshold = cadenceDays;
  const earlyThreshold = cadenceDays * 0.5;

  const isOverdue = daysSinceLastContact > overdueThreshold;
  const isEarly = daysSinceLastContact < earlyThreshold;
  const isOnTrack = !isOverdue && !isEarly;

  return {
    isOverdue,
    daysOverdue: isOverdue ? daysSinceLastContact - overdueThreshold : 0,
    isEarly,
    daysEarly: isEarly ? Math.floor(earlyThreshold - daysSinceLastContact) : 0,
    isOnTrack,
    cadenceDays,
    daysSinceLastContact,
  };
};

export const getContactsOverdueByCadence = async (
  userId: string,
  contacts: { $id: string; cadenceDays: number | null }[]
): Promise<{ contactId: string; alignment: CadenceAlignment }[]> => {
  const results = await Promise.all(
    contacts
      .filter((c) => c.cadenceDays && c.cadenceDays > 0)
      .map(async (contact) => ({
        contactId: contact.$id,
        alignment: await getCadenceAlignment(
          userId,
          contact.$id,
          contact.cadenceDays
        ),
      }))
  );

  return results.filter((r) => r.alignment.isOverdue);
};
