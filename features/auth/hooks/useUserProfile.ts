import { useEffect, useState } from "react";
import { useUser } from "@clerk/clerk-expo";
import {
  getOrCreateUserProfile,
  UserProfile,
} from "../api/userProfile.service";
import {
  cachePremiumStatus,
  getCachedPremiumStatus,
} from "@/features/auth/api/premiumCache.service";

export function useUserProfile() {
  const { user, isLoaded } = useUser();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!isLoaded || !user) {
      setLoading(false);
      return;
    }

    (async () => {
      try {
        setLoading(true);
        const cached = await getCachedPremiumStatus();
        if (cached !== null) {
          setProfile((prev) =>
            prev ? { ...prev, isPremiumUser: cached } : null
          );
        }

        const userProfile = await getOrCreateUserProfile(
          user.id,
          user.primaryEmailAddress?.emailAddress || "",
          user.primaryPhoneNumber?.phoneNumber,
          user.firstName || undefined,
          user.lastName || undefined
        );

        await cachePremiumStatus(userProfile?.isPremiumUser);
        setProfile(userProfile);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    })();
  }, [user, isLoaded]);

  return { profile, loading, error };
}
