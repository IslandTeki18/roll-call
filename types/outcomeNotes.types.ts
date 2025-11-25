export interface OutcomeNote {
  $id: string;
  userId: string;

  // User input
  rawText: string;
  userSentiment: "positive" | "neutral" | "negative" | "mixed";

  // Context
  contactIds: string; // comma-separated
  linkedCardId: string;
  linkedEngagementEventId: string;

  // AI processing
  aiAnalysisId: string;
  processingStatus: "pending" | "processing" | "completed" | "failed";
  processingError: string;

  // AI results (denormalized)
  aiSummary: string;
  aiNextSteps: string; // pipe-separated
  aiEntities: string; // comma-separated
  aiSentiment: "positive" | "neutral" | "negative" | "mixed";

  // Timestamps
  recordedAt: string;
  processedAt: string;
  createdAt: string;
  updatedAt: string;
}
