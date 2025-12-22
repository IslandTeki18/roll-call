import {
  getNote,
  markNoteAsProcessing,
  markNoteAsFailed,
  updateNoteWithAI,
} from "./notes.service";

const AI_ENGINE_ENDPOINT = process.env.EXPO_PUBLIC_AI_ENGINE_ENDPOINT!;

interface AIEngineResponse {
  execution_id: string;
  summary: string;
  next_steps: string[];
  entities: string[];
  sentiment: string;
  linked_contacts: string[];
  raw_text: string;
  processed_at: string;
  user_id: string;
}

export const processNoteWithAI = async (noteId: string): Promise<void> => {
  try {
    const note = await getNote(noteId);
    await markNoteAsProcessing(noteId);

    const contactIdsArray = note.contactIds
      .split(",")
      .filter((id) => id.trim());

    const payload = {
      raw_text: note.rawText,
      user_id: note.userId,
      contact_ids: contactIdsArray,
    };

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

    await updateNoteWithAI(noteId, {
      aiAnalysisId: aiResult.execution_id,
      aiSummary: aiResult.summary,
      aiNextSteps: aiResult.next_steps,
      aiEntities: aiResult.entities,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    await markNoteAsFailed(noteId, errorMessage);
    throw error;
  }
};

export const processNoteWithProgress = async (
  noteId: string,
  onProgress?: (status: "processing" | "completed" | "failed") => void
): Promise<void> => {
  try {
    onProgress?.("processing");
    await processNoteWithAI(noteId);
    onProgress?.("completed");
  } catch (error) {
    onProgress?.("failed");
    throw error;
  }
};

export const batchProcessNotes = async (
  noteIds: string[]
): Promise<{ noteId: string; success: boolean; error?: string }[]> => {
  const results = await Promise.allSettled(
    noteIds.map((id) => processNoteWithAI(id))
  );

  return results.map((result, index) => ({
    noteId: noteIds[index],
    success: result.status === "fulfilled",
    error:
      result.status === "rejected"
        ? result.reason?.message || "Unknown error"
        : undefined,
  }));
};

export const retryFailedNote = async (noteId: string): Promise<void> => {
  const note = await getNote(noteId);

  if (note.processingStatus !== "failed") {
    throw new Error(`Cannot retry note with status: ${note.processingStatus}`);
  }

  await processNoteWithAI(noteId);
};
