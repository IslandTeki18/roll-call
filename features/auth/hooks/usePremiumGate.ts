import { useRouter } from "expo-router";
import { useCallback } from "react";
import { Alert } from "react-native";
import { useUserProfile } from "./useUserProfile";

export function usePremiumGate() {
  const { profile, refreshPremiumStatus } = useUserProfile();
  const isPremium = profile?.isPremiumUser ?? false;
  const router = useRouter();

  const requirePremium = useCallback(
    (feature: string, onUpgrade?: () => void): boolean => {
      if (isPremium) return true;

      Alert.alert(
        "Premium Feature",
        `${feature} is available with Premium. Unlock 10-card deck, email/Slack sends, and Reports.`,
        [
          {
            text: "Not Now",
            style: "cancel",
            onPress: () => {
              router.push("/");
            },
          },
          {
            text: "Upgrade",
            onPress: onUpgrade,
          },
        ]
      );
      return false;
    },
    [isPremium]
  );

  return {
    isPremium,
    requirePremium,
    refreshPremiumStatus,
  };
}
