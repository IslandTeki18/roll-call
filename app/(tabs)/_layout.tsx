import { Redirect, Tabs } from "expo-router";
import { useUserProfile } from "../../features/auth/hooks/useUserProfile";
import { View, Text } from "react-native";
import { useAuth } from "@clerk/clerk-expo";
import {
  HomeIcon,
  UsersIcon,
  FileTextIcon,
  SettingsIcon,
  Contact,
} from "lucide-react-native";

export default function TabsLayout() {
  const { isSignedIn } = useAuth();
  const { profile, loading, error } = useUserProfile();

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
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen
        name="deck"
        options={{
          title: "Deck",
          tabBarIcon: ({ color }) => <Contact size={28} color={color} />,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="contacts"
        options={{
          title: "Contacts",
          tabBarIcon: ({ color }) => <UsersIcon size={28} color={color} />,
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => <HomeIcon size={28} color={color} />,
        }}
      />
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
          title: "Settings",
          tabBarIcon: ({ color }) => <SettingsIcon size={28} color={color} />,
        }}
      />
    </Tabs>
  );
}
