import { useUserProfile } from "@/features/auth/hooks/useUserProfile";
import { useCallback, useState } from "react";
import { processOutcomeWithProgress } from "../api/aiProcessing.service";
import {
  createOutcomeNote,
  getOutcomeNotesByContact,
  getOutcomeNotesByUser,
  OutcomeNote,
  OutcomeSentiment,
} from "../api/outcomeNotes.service";

interface OutcomeSheetConfig {
  contactIds: string[];
  contactNames: string[];
  linkedCardId?: string;
  linkedEngagementEventId?: string;
  engagementType?: string;
}

export function useOutcome() {
  const { profile } = useUserProfile(); // Changed from useUser
  const [outcomeSheetVisible, setOutcomeSheetVisible] = useState(false);
  const [outcomeConfig, setOutcomeConfig] = useState<OutcomeSheetConfig | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const showOutcomeSheet = useCallback((config: OutcomeSheetConfig) => {
    setOutcomeConfig(config);
    setOutcomeSheetVisible(true);
  }, []);

  const hideOutcomeSheet = useCallback(() => {
    setOutcomeSheetVisible(false);
    setOutcomeConfig(null);
  }, []);

  const createOutcome = useCallback(
    async (
      rawText: string,
      sentiment: OutcomeSentiment,
      contactIds: string[],
      linkedCardId?: string,
      linkedEngagementEventId?: string,
      processWithAI: boolean = true
    ): Promise<OutcomeNote | null> => {
      if (!profile) {
        // Changed from user
        setError("User not authenticated");
        return null;
      }

      try {
        setLoading(true);
        setError(null);

        const outcome = await createOutcomeNote({
          userId: profile.$id, // Changed from user.id
          rawText: rawText.trim(),
          userSentiment: sentiment,
          contactIds,
          linkedCardId,
          linkedEngagementEventId,
        });

        if (processWithAI) {
          processOutcomeWithProgress(outcome.$id).catch((err) => {
            console.error("AI processing failed:", err);
            setError("AI processing failed, but outcome was saved");
          });
        }

        return outcome;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to create outcome";
        setError(errorMessage);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [profile] // Changed dependency
  );

  const loadContactOutcomes = useCallback(
    async (contactId: string, limit: number = 50): Promise<OutcomeNote[]> => {
      if (!profile) {
        // Changed from user
        setError("User not authenticated");
        return [];
      }

      try {
        setLoading(true);
        setError(null);
        const outcomes = await getOutcomeNotesByContact(
          profile.$id, // Changed from user.id
          contactId,
          limit
        );
        return outcomes;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to load outcomes";
        setError(errorMessage);
        return [];
      } finally {
        setLoading(false);
      }
    },
    [profile] // Changed dependency
  );

  const loadUserOutcomes = useCallback(
    async (limit: number = 100): Promise<OutcomeNote[]> => {
      if (!profile) {
        // Changed from user
        setError("User not authenticated");
        return [];
      }

      try {
        setLoading(true);
        setError(null);
        const outcomes = await getOutcomeNotesByUser(profile.$id, limit); // Changed from user.id
        return outcomes;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to load outcomes";
        setError(errorMessage);
        return [];
      } finally {
        setLoading(false);
      }
    },
    [profile] // Changed dependency
  );

  return {
    outcomeSheetVisible,
    outcomeConfig,
    showOutcomeSheet,
    hideOutcomeSheet,
    createOutcome,
    loadContactOutcomes,
    loadUserOutcomes,
    loading,
    error,
  };
}
