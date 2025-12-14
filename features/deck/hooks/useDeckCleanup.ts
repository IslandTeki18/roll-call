import { useEffect, useRef } from "react";
import { AppState, AppStateStatus } from "react-native";
import { useUserProfile } from "@/features/auth/hooks/useUserProfile";
import { archiveOldDecks } from "../api/deckHistory.service";

/**
 * Hook that automatically archives old decks when app becomes active
 * Ensures cleanup happens even if user doesn't open deck screen
 *
 */
export function useDeckCleanup() {
  const { profile } = useUserProfile();
  const appState = useRef(AppState.currentState);
  const lastCleanupDate = useRef<string | null>(null);

  useEffect(() => {
    if (!profile) return;

    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      // When app comes to foreground, check if cleanup needed
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === "active"
      ) {
        const todayDate = new Date().toISOString().split("T")[0];

        // Only run cleanup once per day
        if (lastCleanupDate.current !== todayDate) {
          console.log("App foregrounded - checking for old decks to archive");

          try {
            const result = await archiveOldDecks(
              profile.$id,
              profile.isPremiumUser
            );

            if (result.archivedDates.length > 0) {
              console.log(
                `Background cleanup archived ${result.archivedDates.length} deck(s)`
              );
            }

            lastCleanupDate.current = todayDate;
          } catch (error) {
            console.error("Background cleanup failed:", error);
          }
        }
      }

      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange
    );

    // Run cleanup on mount if needed
    const todayDate = new Date().toISOString().split("T")[0];
    if (lastCleanupDate.current !== todayDate) {
      archiveOldDecks(profile.$id, profile.isPremiumUser)
        .then((result) => {
          if (result.archivedDates.length > 0) {
            console.log(
              `Initial cleanup archived ${result.archivedDates.length} deck(s)`
            );
          }
          lastCleanupDate.current = todayDate;
        })
        .catch((error) => {
          console.error("Initial cleanup failed:", error);
        });
    }

    return () => {
      subscription.remove();
    };
  }, [profile]);
}
