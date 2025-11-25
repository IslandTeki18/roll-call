import { useUser } from "@clerk/clerk-expo";
import { useEffect } from "react";
import Purchases from "react-native-purchases";
import { Platform } from "react-native";

const REVENUECAT_API_KEY_IOS = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY!;
const REVENUECAT_API_KEY_ANDROID =
  process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY!;

export function useRevenueCat() {
  const { user } = useUser();

  useEffect(() => {
    if (!user) return;

    const setup = async () => {
      Purchases.configure({
        apiKey:
          Platform.OS === "ios"
            ? REVENUECAT_API_KEY_IOS
            : REVENUECAT_API_KEY_ANDROID,
        appUserID: user.id, // Clerk user ID
      });
    };

    setup();
  }, [user]);
}
