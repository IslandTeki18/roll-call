import { Stack } from "expo-router";

export default function AuthLayout() {
  // Auth check moved to individual screens to avoid hook issues
  return <Stack screenOptions={{ headerShown: false }} />;
}
