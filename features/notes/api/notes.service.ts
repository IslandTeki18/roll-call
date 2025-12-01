import { databases } from "@/features/shared/lib/appwrite";
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

  const response = await databases.createDocument(
    DATABASE_ID,
    NOTES_TABLE_ID,
    ID.unique(),
    data,
    [
      Permission.read(Role.any()),
      Permission.update(Role.any()),
      Permission.delete(Role.any()),
    ]
  );

  return response as unknown as Note;
};

export const updateNote = async (
  noteId: string,
  input: UpdateNoteInput
): Promise<Note> => {
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

  const response = await databases.updateDocument(
    DATABASE_ID,
    NOTES_TABLE_ID,
    noteId,
    data
  );

  return response as unknown as Note;
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

  const response = await databases.updateDocument(
    DATABASE_ID,
    NOTES_TABLE_ID,
    noteId,
    data
  );

  return response as unknown as Note;
};

export const markNoteAsProcessing = async (noteId: string): Promise<Note> => {
  const response = await databases.updateDocument(
    DATABASE_ID,
    NOTES_TABLE_ID,
    noteId,
    {
      processingStatus: "processing" as NoteProcessingStatus,
    }
  );

  return response as unknown as Note;
};

export const markNoteAsFailed = async (
  noteId: string,
  errorMessage: string
): Promise<Note> => {
  const response = await databases.updateDocument(
    DATABASE_ID,
    NOTES_TABLE_ID,
    noteId,
    {
      processingStatus: "failed" as NoteProcessingStatus,
      processingError: errorMessage,
    }
  );

  return response as unknown as Note;
};

export const getNote = async (noteId: string): Promise<Note> => {
  const response = await databases.getDocument(
    DATABASE_ID,
    NOTES_TABLE_ID,
    noteId
  );

  return response as unknown as Note;
};

export const getNotesByUser = async (
  userId: string,
  limit: number = 100
): Promise<Note[]> => {
  const response = await databases.listDocuments(DATABASE_ID, NOTES_TABLE_ID, [
    Query.equal("userId", userId),
    Query.orderDesc("$updatedAt"),
    Query.limit(limit),
  ]);

  return response.documents as unknown as Note[];
};

export const getPinnedNotes = async (
  userId: string,
  limit: number = 50
): Promise<Note[]> => {
  const response = await databases.listDocuments(DATABASE_ID, NOTES_TABLE_ID, [
    Query.equal("userId", userId),
    Query.equal("isPinned", true),
    Query.orderDesc("$updatedAt"),
    Query.limit(limit),
  ]);

  return response.documents as unknown as Note[];
};

export const getNotesByContact = async (
  userId: string,
  contactId: string,
  limit: number = 50
): Promise<Note[]> => {
  const response = await databases.listDocuments(DATABASE_ID, NOTES_TABLE_ID, [
    Query.equal("userId", userId),
    Query.contains("contactIds", contactId),
    Query.orderDesc("$updatedAt"),
    Query.limit(limit),
  ]);

  return response.documents as unknown as Note[];
};

export const getNotesByTag = async (
  userId: string,
  tag: string,
  limit: number = 50
): Promise<Note[]> => {
  const response = await databases.listDocuments(DATABASE_ID, NOTES_TABLE_ID, [
    Query.equal("userId", userId),
    Query.contains("tags", tag),
    Query.orderDesc("$updatedAt"),
    Query.limit(limit),
  ]);

  return response.documents as unknown as Note[];
};

export const searchNotes = async (
  userId: string,
  searchText: string,
  limit: number = 50
): Promise<Note[]> => {
  const response = await databases.listDocuments(DATABASE_ID, NOTES_TABLE_ID, [
    Query.equal("userId", userId),
    Query.contains("rawText", searchText),
    Query.orderDesc("$updatedAt"),
    Query.limit(limit),
  ]);

  return response.documents as unknown as Note[];
};

export const deleteNote = async (noteId: string): Promise<void> => {
  await databases.deleteDocument(DATABASE_ID, NOTES_TABLE_ID, noteId);
};

export const toggleNotePin = async (noteId: string): Promise<Note> => {
  const note = await getNote(noteId);
  return updateNote(noteId, { isPinned: !note.isPinned });
};

export const getUserTags = async (userId: string): Promise<string[]> => {
  const notes = await getNotesByUser(userId, 500);
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
  const response = await databases.listDocuments(DATABASE_ID, NOTES_TABLE_ID, [
    Query.equal("userId", userId),
    Query.equal("processingStatus", "pending"),
    Query.orderDesc("$createdAt"),
    Query.limit(limit),
  ]);

  return response.documents as unknown as Note[];
};
