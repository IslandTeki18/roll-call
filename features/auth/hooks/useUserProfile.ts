import { useEffect, useState, useCallback } from "react";
import { useUser } from "@clerk/clerk-expo";
import {
  getOrCreateUserProfile,
  UserProfile,
} from "../api/userProfile.service";
import {
  cachePremiumStatus,
  getCachedPremiumStatus,
} from "@/features/auth/api/premiumCache.service";

const REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export function useUserProfile() {
  const { user, isLoaded } = useUser();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchProfile = useCallback(
    async (showLoading = true) => {
      if (!user) return;

      try {
        if (showLoading) setLoading(true);

        const userProfile = await getOrCreateUserProfile(
          user.id,
          user.primaryEmailAddress?.emailAddress || "",
          user.primaryPhoneNumber?.phoneNumber,
          user.firstName || undefined,
          user.lastName || undefined
        );

        await cachePremiumStatus(userProfile?.isPremiumUser);
        setProfile(userProfile);
        setError(null);
      } catch (err) {
        setError(err as Error);
      } finally {
        if (showLoading) setLoading(false);
      }
    },
    [user]
  );

  const refreshPremiumStatus = useCallback(async () => {
    await fetchProfile(false);
  }, [fetchProfile]);

  useEffect(() => {
    if (!isLoaded || !user) {
      setLoading(false);
      return;
    }

    (async () => {
      const cached = await getCachedPremiumStatus();
      if (cached !== null) {
        setProfile((prev) =>
          prev ? { ...prev, isPremiumUser: cached } : null
        );
      }
      await fetchProfile();
    })();
  }, [user, isLoaded, fetchProfile]);

  // Periodic refresh
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      refreshPremiumStatus();
    }, REFRESH_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [user, refreshPremiumStatus]);

  return { profile, loading, error, refreshPremiumStatus };
}
