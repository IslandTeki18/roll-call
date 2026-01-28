import { useDeckCleanup } from "@/features/deck/hooks/useDeckCleanup";
import { CustomTabBar } from "@/features/shared/components/CustomTabBar";
import { useAuth } from "@clerk/clerk-expo";
import { Redirect, Stack } from "expo-router";
import { Text, View } from "react-native";
import { useUserProfile } from "../../features/auth/hooks/useUserProfile";

export default function TabsLayout() {
  const { isSignedIn } = useAuth();
  const { loading, error } = useUserProfile();
  useDeckCleanup();

  if (!isSignedIn) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center">
        <Text>Loading profile...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 justify-center items-center">
        <Text className="text-red-600">Failed to load profile</Text>
      </View>
    );
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false, animation: "none" }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="notes" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="contacts" />
      </Stack>
      <CustomTabBar />
    </>
  );
}
