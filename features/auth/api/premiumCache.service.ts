import AsyncStorage from "@react-native-async-storage/async-storage";

const PREMIUM_CACHE_KEY = "isPremiumUser";

export const cachePremiumStatus = async (isPremium: boolean): Promise<void> => {
  try {
    await AsyncStorage.setItem(PREMIUM_CACHE_KEY, JSON.stringify(isPremium));
  } catch (error) {
    console.error("Failed to cache premium status:", error);
  }
};

export const getCachedPremiumStatus = async (): Promise<boolean | null> => {
  try {
    const cached = await AsyncStorage.getItem(PREMIUM_CACHE_KEY);
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    console.error("Failed to get cached premium status:", error);
    return null;
  }
};

export const clearPremiumCache = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(PREMIUM_CACHE_KEY);
  } catch (error) {
    console.error("Failed to clear premium cache:", error);
  }
};
