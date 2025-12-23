import { Redirect } from "expo-router";

export default function LaunchScreen() {
  // Default redirect to auth - Clerk will handle the actual routing
  return <Redirect href="/(auth)/sign-in" />;
}
