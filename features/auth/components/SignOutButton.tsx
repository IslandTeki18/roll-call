import { useClerk } from "@clerk/clerk-expo";
import * as SecureStore from "expo-secure-store";
import { useRouter } from "expo-router";
import { Text, TouchableOpacity } from "react-native";
import { clearPremiumCache } from "@/features/auth/api/premiumCache.service";

export const SignOutButton = () => {
  const { signOut } = useClerk();
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      await signOut();

      await SecureStore.deleteItemAsync("clerk-session");
      await SecureStore.deleteItemAsync("clerk-token");
      await clearPremiumCache();

      router.replace("/sign-in");
    } catch (err) {
      console.error(JSON.stringify(err, null, 2));
    }
  };

  return (
    <TouchableOpacity
      onPress={handleSignOut}
      className="px-4 py-2 bg-red-600 rounded-xl active:opacity-80"
    >
      <Text className="text-white font-semibold text-center">Sign out</Text>
    </TouchableOpacity>
  );
};
