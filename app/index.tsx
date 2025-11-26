import { Redirect } from "expo-router";
import { useUser } from "@clerk/clerk-expo";

export default function LaunchScreen() {
  const { isSignedIn, isLoaded } = useUser();

  if (!isLoaded) {
    return null;
  }

  if (isSignedIn) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/(auth)/sign-in" />;
}
