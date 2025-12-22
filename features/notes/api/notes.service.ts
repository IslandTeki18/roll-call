import { tablesDB } from "@/features/shared/lib/appwrite";
import { ID, Query, Permission, Role } from "react-native-appwrite";
import {
  Note,
  NoteProcessingStatus,
  CreateNoteInput,
  UpdateNoteInput,
  UpdateNoteWithAIInput,
} from "../types/notes.types";

const DATABASE_ID = process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID!;
const NOTES_TABLE_ID = process.env.EXPO_PUBLIC_APPWRITE_NOTES_TABLE_ID!;

export const createNote = async (input: CreateNoteInput): Promise<Note> => {
  const data = {
    userId: input.userId,
    rawText: input.rawText.trim(),
    isPinned: input.isPinned ?? false,
    contactIds: input.contactIds?.join(",") || "",
    tags: input.tags?.join(",") || "",
    aiAnalysis: "",
    processingStatus: "pending" as NoteProcessingStatus,
    processingError: "",
    aiSummary: "",
    aiNextSteps: "",
    aiEntities: "",
    processedAt: "",
  };

  try {
    const response = await tablesDB.createRow({
      databaseId: DATABASE_ID,
      tableId: NOTES_TABLE_ID,
      rowId: ID.unique(),
      data: data,
      permissions: [
        Permission.read(Role.any()),
        Permission.update(Role.any()),
        Permission.delete(Role.any()),
      ],
    });

    return response as unknown as Note;
  } catch (error) {
    console.error("Error creating note:", error);
    throw error;
  }
};

export const updateNote = async (
  noteId: string,
  input: UpdateNoteInput
): Promise<Note> => {
  try {
    const data: Record<string, unknown> = {};

    if (input.rawText !== undefined) {
      data.rawText = input.rawText.trim();
      // Reset AI processing when raw text changes
      data.processingStatus = "pending";
      data.aiSummary = "";
      data.aiNextSteps = "";
      data.aiEntities = "";
      data.aiAnalysis = "";
      data.processedAt = "";
    }

    if (input.contactIds !== undefined) {
      data.contactIds = input.contactIds.join(",");
    }

    if (input.tags !== undefined) {
      data.tags = input.tags.join(",");
    }

    if (input.isPinned !== undefined) {
      data.isPinned = input.isPinned;
    }

    const response = await tablesDB.updateRow({
      databaseId: DATABASE_ID,
      tableId: NOTES_TABLE_ID,
      rowId: noteId,
      data: data,
    });

    return response as unknown as Note;
  } catch (error) {
    console.error("Error updating note:", error);
    throw error;
  }
};

export const updateNoteWithAI = async (
  noteId: string,
  aiResults: UpdateNoteWithAIInput
): Promise<Note> => {
  const timestamp = new Date().toISOString();

  const data = {
    aiAnalysis: aiResults.aiAnalysisId,
    processingStatus: "completed" as NoteProcessingStatus,
    aiSummary: aiResults.aiSummary,
    aiNextSteps: aiResults.aiNextSteps.join("|"),
    aiEntities: aiResults.aiEntities.join(","),
    processedAt: timestamp,
  };

  const response = await tablesDB.updateRow({
    databaseId: DATABASE_ID,
    tableId: NOTES_TABLE_ID,
    rowId: noteId,
    data: data,
  });

  return response as unknown as Note;
};

export const markNoteAsProcessing = async (noteId: string): Promise<Note> => {
  const response = await tablesDB.updateRow({
    databaseId: DATABASE_ID,
    tableId: NOTES_TABLE_ID,
    rowId: noteId,
    data: {
      processingStatus: "processing" as NoteProcessingStatus,
    },
  });

  return response as unknown as Note;
};

export const markNoteAsFailed = async (
  noteId: string,
  errorMessage: string
): Promise<Note> => {
  const response = await tablesDB.updateRow({
    databaseId: DATABASE_ID,
    tableId: NOTES_TABLE_ID,
    rowId: noteId,
    data: {
      processingStatus: "failed" as NoteProcessingStatus,
      processingError: errorMessage,
    },
  });

  return response as unknown as Note;
};

export const getNote = async (noteId: string): Promise<Note> => {
  const response = await tablesDB.getRow({
    databaseId: DATABASE_ID,
    tableId: NOTES_TABLE_ID,
    rowId: noteId,
  });

  return response as unknown as Note;
};

export const getNotesByUser = async (
  userId: string,
  limit: number = 100
): Promise<Note[]> => {
  const response = await tablesDB.listRows({
    databaseId: DATABASE_ID,
    tableId: NOTES_TABLE_ID,
    queries: [
      Query.equal("userId", userId),
      Query.orderDesc("$updatedAt"),
      Query.limit(limit),
    ],
  });

  return response.rows as unknown as Note[];
};

export const getPinnedNotes = async (
  userId: string,
  limit: number = 50
): Promise<Note[]> => {
  const response = await tablesDB.listRows({
    databaseId: DATABASE_ID,
    tableId: NOTES_TABLE_ID,
    queries: [
      Query.equal("userId", userId),
      Query.equal("isPinned", true),
      Query.orderDesc("$updatedAt"),
      Query.limit(limit),
    ],
  });

  return response.rows as unknown as Note[];
};

export const getNotesByContact = async (
  userId: string,
  contactId: string,
  limit: number = 50
): Promise<Note[]> => {
  const response = await tablesDB.listRows({
    databaseId: DATABASE_ID,
    tableId: NOTES_TABLE_ID,
    queries: [
      Query.equal("userId", userId),
      Query.contains("contactIds", contactId),
      Query.orderDesc("$updatedAt"),
      Query.limit(limit),
    ],
  });

  return response.rows as unknown as Note[];
};

export const getNotesByTag = async (
  userId: string,
  tag: string,
  limit: number = 50
): Promise<Note[]> => {
  const response = await tablesDB.listRows({
    databaseId: DATABASE_ID,
    tableId: NOTES_TABLE_ID,
    queries: [
      Query.equal("userId", userId),
      Query.contains("tags", tag),
      Query.orderDesc("$updatedAt"),
      Query.limit(limit),
    ],
  });

  return response.rows as unknown as Note[];
};

export const searchNotes = async (
  userId: string,
  searchText: string,
  limit: number = 50
): Promise<Note[]> => {
  const response = await tablesDB.listRows({
    databaseId: DATABASE_ID,
    tableId: NOTES_TABLE_ID,
    queries: [
      Query.equal("userId", userId),
      Query.search("rawText", searchText),
      Query.orderDesc("$updatedAt"),
      Query.limit(limit),
    ],
  });

  return response.rows as unknown as Note[];
};

export const deleteNote = async (noteId: string): Promise<void> => {
  await tablesDB.deleteRow({
    databaseId: DATABASE_ID,
    tableId: NOTES_TABLE_ID,
    rowId: noteId,
  });
};

export const toggleNotePin = async (noteId: string): Promise<Note> => {
  const note = await getNote(noteId);
  return updateNote(noteId, { isPinned: !note.isPinned });
};

export const getUserTags = async (userId: string): Promise<string[]> => {
  // Reduced from 500 to 100 - most users won't have more than 100 notes, and this is just for tag suggestions
  const notes = await getNotesByUser(userId, 100);
  const tagSet = new Set<string>();

  notes.forEach((note) => {
    if (note.tags) {
      note.tags.split(",").forEach((tag) => {
        const trimmed = tag.trim();
        if (trimmed) tagSet.add(trimmed);
      });
    }
  });

  return Array.from(tagSet).sort();
};

export const getPendingNotes = async (
  userId: string,
  limit: number = 50
): Promise<Note[]> => {
  const response = await tablesDB.listRows({
    databaseId: DATABASE_ID,
    tableId: NOTES_TABLE_ID,
    queries: [
      Query.equal("userId", userId),
      Query.equal("processingStatus", "pending"),
      Query.orderDesc("$createdAt"),
      Query.limit(limit),
    ],
  });

  return response.rows as unknown as Note[];
};
