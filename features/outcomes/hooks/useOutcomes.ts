import { useUser } from "@clerk/clerk-expo";
import { useCallback, useState } from "react";
import { processOutcomeWithProgress } from "../api/aiProcessing.service";
import {
  createOutcomeNote,
  getOutcomeNotesByContact,
  getOutcomeNotesByUser,
  OutcomeNote,
  OutcomeSentiment,
} from "../api/outcomeNotes.service";

/**
 * Hook for managing outcome notes and outcome sheet interaction
 *
 * Usage:
 * ```tsx
 * const {
 *   showOutcomeSheet,
 *   hideOutcomeSheet,
 *   outcomeSheetVisible,
 *   createOutcome
 * } = useOutcome();
 *
 * // After sending a message
 * showOutcomeSheet({
 *   contactIds: ['123'],
 *   contactNames: ['John Doe'],
 *   engagementEventId: engagementEvent.$id
 * });
 * ```
 */

interface OutcomeSheetConfig {
  contactIds: string[];
  contactNames: string[];
  linkedCardId?: string;
  linkedEngagementEventId?: string;
  engagementType?: string;
}

export function useOutcome() {
  const { user } = useUser();
  const [outcomeSheetVisible, setOutcomeSheetVisible] = useState(false);
  const [outcomeConfig, setOutcomeConfig] = useState<OutcomeSheetConfig | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Show outcome sheet with configuration
   */
  const showOutcomeSheet = useCallback((config: OutcomeSheetConfig) => {
    setOutcomeConfig(config);
    setOutcomeSheetVisible(true);
  }, []);

  /**
   * Hide outcome sheet and reset config
   */
  const hideOutcomeSheet = useCallback(() => {
    setOutcomeSheetVisible(false);
    setOutcomeConfig(null);
  }, []);

  /**
   * Create outcome note and process with AI
   * Lower-level API for custom implementations
   */
  const createOutcome = useCallback(
    async (
      rawText: string,
      sentiment: OutcomeSentiment,
      contactIds: string[],
      linkedCardId?: string,
      linkedEngagementEventId?: string,
      processWithAI: boolean = true
    ): Promise<OutcomeNote | null> => {
      if (!user) {
        setError("User not authenticated");
        return null;
      }

      try {
        setLoading(true);
        setError(null);

        const outcome = await createOutcomeNote({
          userId: user.id,
          rawText: rawText.trim(),
          userSentiment: sentiment,
          contactIds,
          linkedCardId,
          linkedEngagementEventId,
        });

        if (processWithAI) {
          // Process in background without blocking
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
    [user]
  );

  /**
   * Load outcomes for a specific contact
   */
  const loadContactOutcomes = useCallback(
    async (contactId: string, limit: number = 50): Promise<OutcomeNote[]> => {
      if (!user) {
        setError("User not authenticated");
        return [];
      }

      try {
        setLoading(true);
        setError(null);
        const outcomes = await getOutcomeNotesByContact(
          user.id,
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
    [user]
  );

  /**
   * Load all outcomes for current user
   */
  const loadUserOutcomes = useCallback(
    async (limit: number = 100): Promise<OutcomeNote[]> => {
      if (!user) {
        setError("User not authenticated");
        return [];
      }

      try {
        setLoading(true);
        setError(null);
        const outcomes = await getOutcomeNotesByUser(user.id, limit);
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
    [user]
  );

  return {
    // Outcome sheet state
    outcomeSheetVisible,
    outcomeConfig,
    showOutcomeSheet,
    hideOutcomeSheet,

    // Direct outcome creation
    createOutcome,

    // Data loading
    loadContactOutcomes,
    loadUserOutcomes,

    // State
    loading,
    error,
  };
}
