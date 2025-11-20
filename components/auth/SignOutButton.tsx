import { useClerk } from "@clerk/clerk-expo";
import * as Linking from "expo-linking";
import { Text, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";

export const SignOutButton = () => {
  // Use `useClerk()` to access the `signOut()` function
  const { signOut } = useClerk();
  const router = useRouter();
  const handleSignOut = async () => {
    try {
      await signOut();
      // Redirect to your desired page
      router.replace("/sign-in")
    } catch (err) {
      // See https://clerk.com/docs/custom-flows/error-handling
      // for more info on error handling
      console.error(JSON.stringify(err, null, 2));
    }
  };
  return (
    <TouchableOpacity onPress={handleSignOut} className="px-4 py-2 bg-red-600 rounded-xl active:opacity-80">
      <Text className="text-white font-semibold text-center">Sign out</Text>
    </TouchableOpacity>
  );
};
