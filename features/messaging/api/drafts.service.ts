import { getNotesByContact } from "@/features/notes/api/notes.service";

const OPENAI_FUNCTION_ENDPOINT =
  process.env.EXPO_PUBLIC_OPENAI_FUNCTION_ENDPOINT!;

export interface DraftRequest {
  userId: string;
  contactId: string;
  context?: string;
}

export interface DraftResponse {
  draft: string;
}

/**
 * Builds enriched context from notes for draft generation
 * Includes AI summaries, next steps, and recent conversation topics
 */
const buildNotesContext = async (
  userId: string,
  contactId: string
): Promise<string> => {
  try {
    const notes = await getNotesByContact(userId, contactId, 5);

    if (notes.length === 0) {
      return "";
    }

    const contextParts: string[] = [];

    // Add AI summaries from processed notes
    const summaries = notes
      .filter((n) => n.processingStatus === "completed" && n.aiSummary)
      .map((n) => n.aiSummary)
      .slice(0, 3);

    if (summaries.length > 0) {
      contextParts.push(`Recent conversations: ${summaries.join(". ")}`);
    }

    // Add next steps from most recent note
    const latestNote = notes[0];
    if (latestNote.aiNextSteps && latestNote.processingStatus === "completed") {
      const nextSteps = latestNote.aiNextSteps.split("|").slice(0, 2);
      if (nextSteps.length > 0) {
        contextParts.push(`Follow-up items: ${nextSteps.join(", ")}`);
      }
    }

    // Add topics/entities from notes
    const allEntities = notes
      .filter((n) => n.aiEntities && n.processingStatus === "completed")
      .flatMap((n) => n.aiEntities.split(",").map((e) => e.trim()))
      .filter(Boolean);

    if (allEntities.length > 0) {
      // Get unique entities, limit to top 5
      const uniqueEntities = [...new Set(allEntities)].slice(0, 5);
      contextParts.push(`Previous topics: ${uniqueEntities.join(", ")}`);
    }

    // If no AI-processed notes, fall back to raw text snippets
    if (contextParts.length === 0) {
      const rawSnippets = notes
        .map((n) => n.rawText.substring(0, 100))
        .slice(0, 2);
      if (rawSnippets.length > 0) {
        contextParts.push(`Recent notes: ${rawSnippets.join(". ")}`);
      }
    }

    return contextParts.join(". ");
  } catch (error) {
    console.error("Failed to build notes context:", error);
    return "";
  }
};

export const generateDraft = async (
  userId: string,
  contactId: string,
  context?: string
): Promise<string> => {
  // Build enriched context from notes
  const notesContext = await buildNotesContext(userId, contactId);

  // Combine provided context with notes context
  const enrichedContext = [context, notesContext].filter(Boolean).join(". ");

  const payload: DraftRequest = {
    userId,
    contactId,
    context: enrichedContext || undefined,
  };

  const response = await fetch(OPENAI_FUNCTION_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Draft generation failed: ${response.statusText}`);
  }

  const data: DraftResponse = await response.json();
  return data.draft;
};
