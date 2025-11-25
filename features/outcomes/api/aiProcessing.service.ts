import {
  getOutcomeNote,
  markOutcomeAsProcessing,
  markOutcomeAsFailed,
  updateOutcomeWithAI,
  OutcomeSentiment,
} from "./outcomeNotes.service";

const AI_ENGINE_ENDPOINT = process.env.EXPO_PUBLIC_AI_ENGINE_ENDPOINT!;

/**
 * Response from AI engine function
 */
interface AIEngineResponse {
  execution_id: string;
  summary: string;
  next_steps: string[];
  entities: string[];
  sentiment: OutcomeSentiment;
  linked_contacts: string[];
  raw_text: string;
  processed_at: string;
  user_id: string;
}

/**
 * Process an outcome note through the AI engine
 *
 * Flow:
 * 1. Mark outcome as "processing"
 * 2. Call AI engine function with raw text and contact IDs
 * 3. Update outcome with AI results and mark as "completed"
 * 4. If error, mark as "failed" with error message
 *
 * @param outcomeId - ID of the outcome note to process
 * @returns Updated outcome note with AI results
 */
export const processOutcomeWithAI = async (
  outcomeId: string
): Promise<void> => {
  try {
    // Get the outcome note
    const outcome = await getOutcomeNote(outcomeId);

    // Mark as processing
    await markOutcomeAsProcessing(outcomeId);

    // Prepare payload for AI engine
    const contactIdsArray = outcome.contactIds
      .split(",")
      .filter((id) => id.trim());

    const payload = {
      raw_text: outcome.rawText,
      user_id: outcome.userId,
      contact_ids: contactIdsArray,
    };

    // Call AI engine
    const response = await fetch(AI_ENGINE_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AI engine failed: ${response.status} - ${errorText}`);
    }

    const aiResult: AIEngineResponse = await response.json();

    // Update outcome with AI results
    await updateOutcomeWithAI(outcomeId, {
      aiAnalysisId: aiResult.execution_id,
      aiSummary: aiResult.summary,
      aiNextSteps: aiResult.next_steps,
      aiEntities: aiResult.entities,
      aiSentiment: aiResult.sentiment,
    });
  } catch (error) {
    // Mark as failed with error message
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    await markOutcomeAsFailed(outcomeId, errorMessage);
    throw error;
  }
};

/**
 * Process outcome with loading state tracking
 * Useful for UI components that need to show progress
 *
 * @param outcomeId - ID of the outcome note to process
 * @param onProgress - Callback for progress updates
 * @returns Updated outcome note with AI results
 */
export const processOutcomeWithProgress = async (
  outcomeId: string,
  onProgress?: (status: "processing" | "completed" | "failed") => void
): Promise<void> => {
  try {
    onProgress?.("processing");
    await processOutcomeWithAI(outcomeId);
    onProgress?.("completed");
  } catch (error) {
    onProgress?.("failed");
    throw error;
  }
};

/**
 * Batch process multiple outcome notes
 * Useful for background processing of pending outcomes
 *
 * @param outcomeIds - Array of outcome note IDs to process
 * @returns Array of results with success/failure status
 */
export const batchProcessOutcomes = async (
  outcomeIds: string[]
): Promise<
  Array<{
    outcomeId: string;
    success: boolean;
    error?: string;
  }>
> => {
  const results = await Promise.allSettled(
    outcomeIds.map((id) => processOutcomeWithAI(id))
  );

  return results.map((result, index) => ({
    outcomeId: outcomeIds[index],
    success: result.status === "fulfilled",
    error:
      result.status === "rejected"
        ? result.reason?.message || "Unknown error"
        : undefined,
  }));
};

/**
 * Retry failed outcome processing
 * Useful for manual retry after fixing issues
 *
 * @param outcomeId - ID of the failed outcome to retry
 * @returns Updated outcome note with AI results
 */
export const retryFailedOutcome = async (outcomeId: string): Promise<void> => {
  const outcome = await getOutcomeNote(outcomeId);

  if (outcome.processingStatus !== "failed") {
    throw new Error(
      `Cannot retry outcome with status: ${outcome.processingStatus}`
    );
  }

  await processOutcomeWithAI(outcomeId);
};
