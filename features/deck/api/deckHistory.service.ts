import { tablesDB } from "@/features/shared/lib/appwrite";
import { ID, Query } from "react-native-appwrite";
import { DeckHistoryRecord, ArchiveResult } from "../types/deck.types";

const DATABASE_ID = process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID!;
const DECK_CARDS_TABLE_ID =
  process.env.EXPO_PUBLIC_APPWRITE_DECK_CARDS_TABLE_ID!;
const DECK_HISTORY_TABLE_ID =
  process.env.EXPO_PUBLIC_APPWRITE_DECK_HISTORY_TABLE_ID!;
const ENGAGEMENT_EVENTS_TABLE_ID =
  process.env.EXPO_PUBLIC_APPWRITE_ENGAGEMENT_EVENTS_TABLE_ID!;
const OUTCOME_NOTES_TABLE_ID =
  process.env.EXPO_PUBLIC_APPWRITE_OUTCOME_NOTES_TABLE_ID!;


/**
 * Archives a deck session and deletes the associated deck cards
 * Should be called when transitioning to a new day
 */
export const archiveDeckSession = async (
  userId: string,
  date: string,
  isPremiumUser: boolean
): Promise<ArchiveResult> => {
  try {
    // 1. Get all deck cards for the specified date
    const deckCardsResponse = await tablesDB.listRows({
        databaseId: DATABASE_ID,
        tableId: DECK_CARDS_TABLE_ID,
        queries: [
          Query.equal("userId", userId),
          Query.equal("date", date),
          Query.limit(500),
        ],
    })

    const deckCards = deckCardsResponse.rows;

    if (deckCards.length === 0) {
      return { archived: false, cardsDeleted: 0, error: "No deck found" };
    }

    // 2. Calculate metrics from deck cards
    const totalCards = deckCards.length;
    const completedCards = deckCards.filter(
      (c: any) => c.status === "completed"
    ).length;
    const skippedCards = deckCards.filter(
      (c: any) => c.status === "skipped"
    ).length;
    const snoozedCards = deckCards.filter(
      (c: any) => c.status === "snoozed"
    ).length;

    const freshContactsShown = deckCards.filter((c: any) => c.isFresh).length;

    // Sum RHS scores for average
    const totalRhs = deckCards.reduce(
      (sum: number, card: any) => sum + (card.rhsScore || 0),
      0
    );
    const avgRhsScore = totalCards > 0 ? totalRhs / totalCards : 0;

    // Calculate completion rate
    const completionRate =
      totalCards > 0 ? (completedCards / totalCards) * 100 : 0;

    // Get time metrics
    const draftedCards = deckCards
      .filter((c: any) => c.draftedAt)
      .map((c: any) => new Date(c.draftedAt).getTime())
      .sort();
    const completedCardsTime = deckCards
      .filter((c: any) => c.completedAt)
      .map((c: any) => new Date(c.completedAt).getTime())
      .sort();

    const firstCardOpenedAt = draftedCards.length
      ? new Date(draftedCards[0]).toISOString()
      : "";
    const lastCardCompletedAt = completedCardsTime.length
      ? new Date(
          completedCardsTime[completedCardsTime.length - 1]
        ).toISOString()
      : "";

    // Get deck generation time from first card
    const deckGeneratedAt = deckCards[0].$createdAt;

    // 3. Get engagement events for this deck session
    const cardIds = deckCards.map((c: any) => c.$id);
    const engagementEventsResponse = await tablesDB.listRows({
        databaseId: DATABASE_ID,
        tableId: ENGAGEMENT_EVENTS_TABLE_ID,
        queries: [
          Query.equal("userId", userId),
          Query.contains("linkedCardId", cardIds),
          Query.limit(500),
        ],
    })
    const engagementEvents = engagementEventsResponse;

    // Count engagement types
    const smsCount = engagementEvents.rows.filter(
      (e: any) => e.type === "sms_sent"
    ).length;
    const callCount = engagementEvents.rows.filter(
      (e: any) => e.type === "call_made"
    ).length;
    const emailCount = engagementEvents.rows.filter(
      (e: any) => e.type === "email_sent"
    ).length;
    const facetimeCount = engagementEvents.rows.filter(
      (e: any) => e.type === "facetime_made"
    ).length;
    const slackCount = engagementEvents.rows.filter(
      (e: any) => e.type === "slack_sent"
    ).length;

    // Count fresh contacts engaged (cards that were fresh AND had engagement)
    const engagedCardIds = engagementEvents.rows
      .map((e: any) => e.linkedCardId)
      .filter(Boolean);
    const freshContactsEngaged = deckCards.filter(
      (c: any) => c.isFresh && engagedCardIds.includes(c.$id)
    ).length;

    // 4. Get outcome notes for this deck session
    const outcomeNotesResponse = await tablesDB.listRows({
        databaseId: DATABASE_ID,
        tableId: OUTCOME_NOTES_TABLE_ID,
        queries: [
          Query.equal("userId", userId),
          Query.greaterThanEqual("recordedAt", `${date}T00:00:00.000Z`),
          Query.lessThanEqual("recordedAt", `${date}T23:59:59.999Z`),
          Query.limit(100),
        ],
    })
    const outcomeNotes = outcomeNotesResponse;

    const outcomesRecorded = outcomeNotes.rows.length;
    const positiveOutcomes = outcomeNotes.rows.filter(
      (o: any) => o.userSentiment === "positive"
    ).length;
    const neutralOutcomes = outcomeNotes.rows.filter(
      (o: any) => o.userSentiment === "neutral"
    ).length;
    const negativeOutcomes = outcomeNotes.rows.filter(
      (o: any) => o.userSentiment === "negative"
    ).length;

    // 5. Create history record
    const historyRecord = await tablesDB.createRow({
        databaseId: DATABASE_ID,
        tableId: DECK_HISTORY_TABLE_ID,
        rowId: ID.unique(),
        data: {
          userId,
          date,
          maxCards: isPremiumUser ? 10 : 5,
          totalCards,
          completedCards,
          skippedCards,
          snoozedCards,
          smsCount,
          callCount,
          emailCount,
          facetimeCount,
          slackCount,
          freshContactsShown,
          freshContactsEngaged,
          outcomesRecorded,
          positiveOutcomes,
          neutralOutcomes,
          negativeOutcomes,
          firstCardOpenedAt,
          lastCardCompletedAt,
          deckGeneratedAt,
          archivedAt: new Date().toISOString(),
          isPremiumUser,
          completionRate: Math.round(completionRate),
          avgRhsScore: Math.round(avgRhsScore),
        },
    })

    // 6. Delete deck cards (now that they're archived)
    const deletePromises = deckCards.map((card: any) =>
        tablesDB.deleteRow({
            databaseId: DATABASE_ID,
            tableId: DECK_CARDS_TABLE_ID,
            rowId: card.$id,
        })
    );
    await Promise.all(deletePromises);

    return {
      archived: true,
      historyRecordId: historyRecord.$id,
      cardsDeleted: deckCards.length,
    };
  } catch (error) {
    console.error("Failed to archive deck session:", error);
    return {
      archived: false,
      cardsDeleted: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

/**
 * Archives all old deck sessions for a user (anything before today)
 * Should be called on app startup or before building new deck
 */
export const archiveOldDecks = async (
  userId: string,
  isPremiumUser: boolean
): Promise<{ archivedDates: string[]; errors: string[] }> => {
  try {
    const todayDate = new Date().toISOString().split("T")[0];

    // Get all deck cards before today
    const oldDecksResponse = await tablesDB.listRows({
        databaseId: DATABASE_ID,
        tableId: DECK_CARDS_TABLE_ID,
        queries: [
          Query.equal("userId", userId),
          Query.lessThan("date", todayDate),
          Query.limit(500),
        ],
    })

    if (oldDecksResponse.total === 0) {
      return { archivedDates: [], errors: [] };
    }

    // Group by date
    const decksByDate = new Map<string, any[]>();
    oldDecksResponse.rows.forEach((card: any) => {
      const date = card.date;
      if (!decksByDate.has(date)) {
        decksByDate.set(date, []);
      }
      decksByDate.get(date)!.push(card);
    });

    const archivedDates: string[] = [];
    const errors: string[] = [];

    // Archive each date's deck
    for (const [date, cards] of decksByDate) {
      const result = await archiveDeckSession(userId, date, isPremiumUser);
      if (result.archived) {
        archivedDates.push(date);
      } else if (result.error) {
        errors.push(`${date}: ${result.error}`);
      }
    }

    return { archivedDates, errors };
  } catch (error) {
    console.error("Failed to archive old decks:", error);
    return {
      archivedDates: [],
      errors: [error instanceof Error ? error.message : "Unknown error"],
    };
  }
};

/**
 * Gets deck history for a user
 */
export const getDeckHistory = async (
  userId: string,
  limit: number = 30
): Promise<DeckHistoryRecord[]> => {
    const response = await tablesDB.listRows({
    databaseId: DATABASE_ID,
    tableId: DECK_HISTORY_TABLE_ID,
    queries: [
      Query.equal("userId", userId),
      Query.orderDesc("date"),
      Query.limit(limit),
    ],
  });

  return response.rows as unknown as DeckHistoryRecord[];
};

/**
 * Gets specific day's history
 */
export const getDeckHistoryForDate = async (
  userId: string,
  date: string
): Promise<DeckHistoryRecord | null> => {
    const response = await tablesDB.listRows({
    databaseId: DATABASE_ID,
    tableId: DECK_HISTORY_TABLE_ID,
    queries: [
      Query.equal("userId", userId),
      Query.equal("date", date),
      Query.limit(1),
    ],
  });

  return response.rows.length > 0
    ? (response.rows[0] as unknown as DeckHistoryRecord)
    : null;
};

/**
 * Gets history for a date range
 */
export const getDeckHistoryRange = async (
  userId: string,
  startDate: string,
  endDate: string
): Promise<DeckHistoryRecord[]> => {
    const response = await tablesDB.listRows({
    databaseId: DATABASE_ID,
    tableId: DECK_HISTORY_TABLE_ID,
    queries: [
      Query.equal("userId", userId),
      Query.greaterThanEqual("date", startDate),
      Query.lessThanEqual("date", endDate),
      Query.orderDesc("date"),
      Query.limit(100),
    ],
  });

  return response.rows as unknown as DeckHistoryRecord[];
};

/**
 * Calculates streak from history
 */
export const calculateStreak = async (userId: string): Promise<number> => {
  const history = await getDeckHistory(userId, 100);

  if (history.length === 0) return 0;

  let streak = 0;
  const today = new Date().toISOString().split("T")[0];
  let currentDate = new Date(today);

  // Check each consecutive day backwards
  for (let i = 0; i < history.length; i++) {
    const expectedDate = currentDate.toISOString().split("T")[0];
    const record = history.find((h) => h.date === expectedDate);

    if (!record || record.completedCards === 0) {
      // Streak broken if no deck or no completions
      break;
    }

    streak++;
    currentDate.setDate(currentDate.getDate() - 1);
  }

  return streak;
};

/**
 * Gets completion rate over last N days
 */
export const getAverageCompletionRate = async (
  userId: string,
  days: number = 7
): Promise<number> => {
  const endDate = new Date().toISOString().split("T")[0];
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const startDateStr = startDate.toISOString().split("T")[0];

  const history = await getDeckHistoryRange(userId, startDateStr, endDate);

  if (history.length === 0) return 0;

  const totalRate = history.reduce((sum, h) => sum + h.completionRate, 0);
  return Math.round(totalRate / history.length);
};

/**
 * Gets fresh contact conversion metrics
 */
export const getFreshContactMetrics = async (
  userId: string,
  days: number = 7
): Promise<{
  totalShown: number;
  totalEngaged: number;
  conversionRate: number;
}> => {
  const endDate = new Date().toISOString().split("T")[0];
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const startDateStr = startDate.toISOString().split("T")[0];

  const history = await getDeckHistoryRange(userId, startDateStr, endDate);

  const totalShown = history.reduce((sum, h) => sum + h.freshContactsShown, 0);
  const totalEngaged = history.reduce(
    (sum, h) => sum + h.freshContactsEngaged,
    0
  );
  const conversionRate =
    totalShown > 0 ? Math.round((totalEngaged / totalShown) * 100) : 0;

  return { totalShown, totalEngaged, conversionRate };
};
