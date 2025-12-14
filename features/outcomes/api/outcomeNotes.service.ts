// import { tablesDB } from "../lib/appwrite";
import { tablesDB } from "@/features/shared/lib/appwrite";
import { ID, Query } from "react-native-appwrite";

const DATABASE_ID = process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID!;
const OUTCOME_NOTES_TABLE_ID =
  process.env.EXPO_PUBLIC_APPWRITE_OUTCOME_NOTES_TABLE_ID!;

/**
 * Sentiment options for outcome recording
 */
export type OutcomeSentiment = "positive" | "neutral" | "negative" | "mixed";

/**
 * Processing status for AI analysis
 */
export type ProcessingStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed";

/**
 * OutcomeNote represents a user's reflection after an engagement
 * Links to engagement events, contacts, and AI analysis results
 */
export interface OutcomeNote {
  $id: string;
  userId: string;

  // User input
  rawText: string; // Free-form reflection (140 char limit enforced in UI)
  userSentiment: OutcomeSentiment; // User-selected sentiment

  // Context linking
  contactIds: string; // Comma-separated contact IDs this outcome is about
  linkedCardId: string; // The deck card that triggered this outcome
  linkedEngagementEventId: string; // The engagement event (sms_sent, call_made, etc.)

  // AI processing
  aiAnalysisId: string; // Links to AIAnalysisLogs.$id after processing
  processingStatus: ProcessingStatus;
  processingError: string; // Error message if processing failed

  // AI results (denormalized for quick access)
  aiSummary: string;
  aiNextSteps: string; // Pipe-separated list
  aiEntities: string; // Comma-separated list
  aiSentiment: OutcomeSentiment;

  // Metadata
  recordedAt: string; // ISO timestamp when user saved outcome
  processedAt: string; // ISO timestamp when AI completed analysis
  createdAt: string;
  updatedAt: string;
}

/**
 * Input for creating a new outcome note
 */
export interface CreateOutcomeNoteInput {
  userId: string;
  rawText: string;
  userSentiment: OutcomeSentiment;
  contactIds: string[];
  linkedCardId?: string;
  linkedEngagementEventId?: string;
}

/**
 * Input for updating outcome with AI results
 */
export interface UpdateOutcomeWithAIInput {
  aiAnalysisId: string;
  aiSummary: string;
  aiNextSteps: string[];
  aiEntities: string[];
  aiSentiment: OutcomeSentiment;
}

/**
 * Create a new outcome note
 * Sets processingStatus to "pending" by default
 */
export const createOutcomeNote = async (
  input: CreateOutcomeNoteInput
): Promise<OutcomeNote> => {
  const timestamp = new Date().toISOString();
  const rowId = ID.unique();

  const data = {
    userId: input.userId,
    rawText: input.rawText.trim(),
    userSentiment: input.userSentiment,
    contactIds: input.contactIds.join(","),
    linkedCardId: input.linkedCardId || "",
    linkedEngagementEventId: input.linkedEngagementEventId || "",
    aiAnalysisId: "",
    processingStatus: "pending" as ProcessingStatus,
    processingError: "",
    aiSummary: "",
    aiNextSteps: "",
    aiEntities: "",
    aiSentiment: "neutral" as OutcomeSentiment,
    recordedAt: timestamp,
    processedAt: "",
  };

  const response = await tablesDB.createRow({
    databaseId: DATABASE_ID,
    tableId: OUTCOME_NOTES_TABLE_ID,
    rowId,
    data,
  });

  return response as unknown as OutcomeNote;
};

/**
 * Update outcome note with AI analysis results
 * Sets processingStatus to "completed" and updates denormalized AI fields
 */
export const updateOutcomeWithAI = async (
  outcomeId: string,
  aiResults: UpdateOutcomeWithAIInput
): Promise<OutcomeNote> => {
  const timestamp = new Date().toISOString();

  const data = {
    aiAnalysisId: aiResults.aiAnalysisId,
    processingStatus: "completed" as ProcessingStatus,
    aiSummary: aiResults.aiSummary,
    aiNextSteps: aiResults.aiNextSteps.join("|"),
    aiEntities: aiResults.aiEntities.join(","),
    aiSentiment: aiResults.aiSentiment,
    processedAt: timestamp,
  };

  const response = await tablesDB.updateRow({
    databaseId: DATABASE_ID,
    tableId: OUTCOME_NOTES_TABLE_ID,
    rowId: outcomeId,
    data,
  });

  return response as unknown as OutcomeNote;
};

/**
 * Mark outcome processing as failed
 */
export const markOutcomeAsFailed = async (
  outcomeId: string,
  errorMessage: string
): Promise<OutcomeNote> => {

  const data = {
    processingStatus: "failed" as ProcessingStatus,
    processingError: errorMessage,
  };

  const response = await tablesDB.updateRow({
    databaseId: DATABASE_ID,
    tableId: OUTCOME_NOTES_TABLE_ID,
    rowId: outcomeId,
    data,
  });

  return response as unknown as OutcomeNote;
};

/**
 * Mark outcome as processing (when AI call starts)
 */
export const markOutcomeAsProcessing = async (
  outcomeId: string
): Promise<OutcomeNote> => {

  const data = {
    processingStatus: "processing" as ProcessingStatus,
  };

  const response = await tablesDB.updateRow({
    databaseId: DATABASE_ID,
    tableId: OUTCOME_NOTES_TABLE_ID,
    rowId: outcomeId,
    data,
  });

  return response as unknown as OutcomeNote;
};

/**
 * Get outcome note by ID
 */
export const getOutcomeNote = async (
  outcomeId: string
): Promise<OutcomeNote> => {
  const response = await tablesDB.getRow({
    databaseId: DATABASE_ID,
    tableId: OUTCOME_NOTES_TABLE_ID,
    rowId: outcomeId,
  });

  return response as unknown as OutcomeNote;
};

/**
 * Get all outcome notes for a user
 */
export const getOutcomeNotesByUser = async (
  userId: string,
  limit: number = 100
): Promise<OutcomeNote[]> => {
  const response = await tablesDB.listRows({
    databaseId: DATABASE_ID,
    tableId: OUTCOME_NOTES_TABLE_ID,
    queries: [
      Query.equal("userId", userId),
      Query.orderDesc("recordedAt"),
      Query.limit(limit),
    ],
  });

  return response.rows as unknown as OutcomeNote[];
};

/**
 * Get outcome notes for a specific contact
 */
export const getOutcomeNotesByContact = async (
  userId: string,
  contactId: string,
  limit: number = 50
): Promise<OutcomeNote[]> => {
  const response = await tablesDB.listRows({
    databaseId: DATABASE_ID,
    tableId: OUTCOME_NOTES_TABLE_ID,
    queries: [
      Query.equal("userId", userId),
      Query.contains("contactIds", contactId),
      Query.orderDesc("recordedAt"),
      Query.limit(limit),
    ],
  });

  return response.rows as unknown as OutcomeNote[];
};

/**
 * Get outcome notes by processing status
 * Useful for finding pending outcomes to process
 */
export const getOutcomeNotesByStatus = async (
  userId: string,
  status: ProcessingStatus,
  limit: number = 100
): Promise<OutcomeNote[]> => {
  const response = await tablesDB.listRows({
    databaseId: DATABASE_ID,
    tableId: OUTCOME_NOTES_TABLE_ID,
    queries: [
      Query.equal("userId", userId),
      Query.equal("processingStatus", status),
      Query.orderDesc("recordedAt"),
      Query.limit(limit),
    ],
  });

  return response.rows as unknown as OutcomeNote[];
};

/**
 * Get outcome notes by date range
 */
export const getOutcomeNotesByDateRange = async (
  userId: string,
  startDate: string,
  endDate: string,
  limit: number = 100
): Promise<OutcomeNote[]> => {
  const response = await tablesDB.listRows({
    databaseId: DATABASE_ID,
    tableId: OUTCOME_NOTES_TABLE_ID,
    queries: [
      Query.equal("userId", userId),
      Query.greaterThanEqual("recordedAt", startDate),
      Query.lessThanEqual("recordedAt", endDate),
      Query.orderDesc("recordedAt"),
      Query.limit(limit),
    ],
  });

  return response.rows as unknown as OutcomeNote[];
};

/**
 * Get outcome note linked to a specific engagement event
 */
export const getOutcomeNoteByEngagementEvent = async (
  userId: string,
  engagementEventId: string
): Promise<OutcomeNote | null> => {
  const response = await tablesDB.listRows({
    databaseId: DATABASE_ID,
    tableId: OUTCOME_NOTES_TABLE_ID,
    queries: [
      Query.equal("userId", userId),
      Query.equal("linkedEngagementEventId", engagementEventId),
      Query.limit(1),
    ],
  });

  return response.rows.length > 0
    ? (response.rows[0] as unknown as OutcomeNote)
    : null;
};

/**
 * Get outcome note linked to a specific card
 */
export const getOutcomeNotesByCard = async (
  userId: string,
  cardId: string,
  limit: number = 10
): Promise<OutcomeNote[]> => {
  const response = await tablesDB.listRows({
    databaseId: DATABASE_ID,
    tableId: OUTCOME_NOTES_TABLE_ID,
    queries: [
      Query.equal("userId", userId),
      Query.equal("linkedCardId", cardId),
      Query.orderDesc("recordedAt"),
      Query.limit(limit),
    ],
  });

  return response.rows as unknown as OutcomeNote[];
};

/**
 * Delete an outcome note
 */
export const deleteOutcomeNote = async (outcomeId: string): Promise<void> => {
  await tablesDB.deleteRow({
    databaseId: DATABASE_ID,
    tableId: OUTCOME_NOTES_TABLE_ID,
    rowId: outcomeId,
  });
};

/**
 * Get outcome notes with AI analysis completed
 * Useful for displaying summaries and insights
 */
export const getProcessedOutcomeNotes = async (
  userId: string,
  limit: number = 50
): Promise<OutcomeNote[]> => {
  const response = await tablesDB.listRows({
    databaseId: DATABASE_ID,
    tableId: OUTCOME_NOTES_TABLE_ID,
    queries: [
      Query.equal("userId", userId),
      Query.equal("processingStatus", "completed"),
      Query.orderDesc("processedAt"),
      Query.limit(limit),
    ],
  });

  return response.rows as unknown as OutcomeNote[];
};

/**
 * Get count of pending outcomes for user
 * Useful for background processing triggers
 */
export const getPendingOutcomeCount = async (
  userId: string
): Promise<number> => {
  const response = await tablesDB.listRows({
    databaseId: DATABASE_ID,
    tableId: OUTCOME_NOTES_TABLE_ID,
    queries: [
      Query.equal("userId", userId),
      Query.equal("processingStatus", "pending"),
      Query.limit(1),
    ],
  });

  return response.total || 0;
};
