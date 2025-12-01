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
  aiAnalysisId: string;
  processingStatus: NoteProcessingStatus;
  processingError: string;

  // AI results
  aiSummary: string;
  aiNextSteps: string; // pipe-separated
  aiEntities: string; // comma-separated

  // Timestamps
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
}
