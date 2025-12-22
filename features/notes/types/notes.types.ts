export type NoteProcessingStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed";

export interface Note {
  $id: string;
  userId: string;

  // User input
  rawText: string;
  isPinned: boolean;

  // Multi-contact association
  contactIds: string; // comma-separated

  // Tags (user-created, reusable)
  tags: string; // comma-separated

  // AI processing
  aiAnalysis: string;
  processingStatus: NoteProcessingStatus;
  processingError: string;

  // AI results
  aiSummary: string;
  aiNextSteps: string; // pipe-separated
  aiEntities: string; // comma-separated (legacy AI extraction)

  // Structured entities (deterministic + AI hybrid)
  structuredEntities?: string; // JSON-serialized StructuredEntities

  // Timestamps (Appwrite system fields)
  $createdAt: string;
  $updatedAt: string;
  processedAt: string;
}

export interface CreateNoteInput {
  userId: string;
  rawText: string;
  contactIds?: string[];
  tags?: string[];
  isPinned?: boolean;
}

export interface UpdateNoteInput {
  rawText?: string;
  contactIds?: string[];
  tags?: string[];
  isPinned?: boolean;
}

export interface UpdateNoteWithAIInput {
  aiAnalysisId: string;
  aiSummary: string;
  aiNextSteps: string[];
  aiEntities: string[];
  structuredEntities?: string; // JSON-serialized StructuredEntities
}
