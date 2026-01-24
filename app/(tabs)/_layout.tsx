import { Redirect, Tabs } from "expo-router";
import { useUserProfile } from "../../features/auth/hooks/useUserProfile";
import { View, Text } from "react-native";
import { useAuth } from "@clerk/clerk-expo";
import {
  FileTextIcon,
  Home,
  User,
} from "lucide-react-native";
import { useDeckCleanup } from "@/features/deck/hooks/useDeckCleanup";
import { CustomTabBar } from "@/features/shared/components/CustomTabBar";

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
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <CustomTabBar {...props} />}
    >
      <Tabs.Screen
        name="notes"
        options={{
          title: "Notes",
          tabBarIcon: ({ color }) => <FileTextIcon size={28} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => <User size={28} color={color} />,
        }}
      />
      {/* Hidden routes - accessible via navigation but not shown in tabs */}
      <Tabs.Screen
        name="contacts"
        options={{
          href: null, // Hides from tab bar
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => <Home size={28} color={color} />,
          headerShown: false,
        }}
      />
    </Tabs>
  );
}
